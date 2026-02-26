const { StorageServer, DepartmentStorage, FileMetadata, Employee, Department, User, AuditLog, OnboardingToken } = require('../models');
const storageAgentClient = require('../services/storageAgentClient');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const { Op } = require('sequelize');

// Select server for department
async function selectServerForDepartment(department_id) {
    // Check if department has assigned server
    const deptStorage = await DepartmentStorage.findOne({
        where: { department_id },
        include: [{
            model: StorageServer,
            as: 'StorageServer',
            where: { is_active: true }
        }]
    });

    if (deptStorage) {
        return deptStorage.StorageServer;
    }

    // Select server with most available space
    const server = await StorageServer.findOne({
        where: { is_active: true },
        order: [[StorageServer.sequelize.literal('(total_capacity_gb - used_capacity_gb)'), 'DESC']]
    });

    if (!server) {
        throw new Error('No active storage servers available');
    }

    return server;
}

// Check if user can access file
function canAccessFile(user, file) {
    // ADMIN can access all
    if (user.permissions.includes('storage.view.all') ||
        user.permissions.includes('admin.access') ||
        user.roles?.includes('ADMIN') ||
        user.roles?.includes('SUPER_ADMIN')) {
        return true;
    }

    // Self access check
    if (user.permissions.includes('storage.view.self')) {
        return file.uploaded_by === user.id || (file.employee_id && file.employee_id === user.employee_id);
    }

    return false;
}

// Generate unique filename
function generateUniqueFilename(originalName) {
    const ext = path.extname(originalName);
    const basename = path.basename(originalName, ext);
    return `${basename}_${uuidv4()}${ext}`;
}

// Upload file
exports.uploadFile = async (req, res) => {
    try {
        let { department_id, employee_id } = req.body;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        if (!employee_id && req.user && req.user.employee_id) {
            employee_id = req.user.employee_id;
        }

        const onboardingToken = req.headers['x-onboarding-token'] || req.body.onboarding_token;
        let tokenRecord = null;
        if (onboardingToken) {
            tokenRecord = await OnboardingToken.findOne({
                where: {
                    token: onboardingToken,
                    is_used: false,
                    expires_at: { [Op.gt]: new Date() }
                }
            });
        }

        let employee = null;
        if (employee_id) {
            employee = await Employee.findByPk(employee_id, {
                include: [{ model: Department, as: 'Department' }]
            });
        } else if (tokenRecord) {
            // Virtual employee for onboarding
            const firstDept = await Department.findOne();
            employee = {
                full_name: 'ONBOARDING_CANDIDATE',
                Department: firstDept || { name: 'ONBOARDING' },
                department_id: firstDept ? firstDept.id : null,
                isMock: true
            };
            department_id = employee.department_id;
        }


        // Admin Fallback: If no employee record found but user is ADMIN
        if (!employee && req.user && (req.user.role === 'ADMIN' || req.user.roles?.includes('ADMIN'))) {
            const firstDept = await Department.findOne();
            if (firstDept) {
                // Mock an employee-like structure for the upload process
                employee = {
                    full_name: req.user.full_name || req.user.username,
                    Department: firstDept,
                    department_id: firstDept.id,
                    isMock: true
                };
                department_id = firstDept.id;
            }
        }

        if (!employee) {
            console.error('[Upload] No employee context found. req.user:', req.user);
            return res.status(400).json({
                error: 'Employee context required for upload. Please logout and login again.'
            });
        }

        // Ensure department_id is set
        if (!department_id) department_id = employee.department_id;

        // If employee is a mock (Admin fallback), pass null as employee_id to the database
        const dbEmployeeId = employee.isMock ? null : employee_id;

        return await proceedWithUpload(req, res, file, dbEmployeeId, department_id, employee);
    } catch (error) {
        console.error('Upload Process Error:', error);
        res.status(500).json({ error: error.message });
    }
};

// Helper to avoid duplication
async function proceedWithUpload(req, res, file, employee_id, department_id, employee) {
    try {
        // Check for existing file (versioning)
        const existingFile = await FileMetadata.findOne({
            where: {
                original_name: file.originalname,
                employee_id,
                is_deleted: false
            },
            order: [['version', 'DESC']]
        });

        const version = existingFile ? existingFile.version + 1 : 1;
        const parent_file_id = existingFile ? existingFile.id : null;

        // Check Department Quota
        const deptStorage = await DepartmentStorage.findOne({
            where: { department_id }
        });

        if (deptStorage) {
            const currentUsage = await FileMetadata.sum('file_size', {
                where: { department_id, is_deleted: false }
            }) || 0;

            const newTotalBytes = currentUsage + file.size;
            const quotaBytes = deptStorage.quota_gb * 1024 * 1024 * 1024;

            if (newTotalBytes > quotaBytes) {
                return res.status(400).json({
                    error: 'Department quota exceeded',
                    details: `Current: ${(currentUsage / 1024 / 1024).toFixed(2)}MB, New: ${(file.size / 1024 / 1024).toFixed(2)}MB, Limit: ${deptStorage.quota_gb}GB`
                });
            }
        }

        // Select server
        const server = await selectServerForDepartment(department_id);

        // Generate unique filename
        const uniqueFilename = generateUniqueFilename(file.originalname);
        let finalFilePath;
        let finalServerId = server.id;

        const isChat = req.body.is_chat === 'true' || req.body.is_chat === true;

        if (isChat) {
            // LOCAL STORAGE FOR CHAT
            const uploadDir = path.join(process.cwd(), 'uploads', 'chat');
            const fs = require('fs');
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }

            finalFilePath = path.join('uploads', 'chat', uniqueFilename);
            const fullDestPath = path.join(process.cwd(), finalFilePath);

            // Move file safely even across drives (C: to H:)
            fs.copyFileSync(file.path, fullDestPath);
            fs.unlinkSync(file.path);
            finalServerId = null; // Mark as local
        } else {
            // REMOTE STORAGE AGENT
            const fs = require('fs');
            const fileStream = fs.createReadStream(file.path);

            try {
                const isSensitive = !!(req.headers['x-onboarding-token'] || req.body.onboarding_token || req.body.is_sensitive === 'true' || req.body.is_sensitive === true);
                const vaultPrefix = isSensitive ? 'DOCS_VAULT\\' : '';

                await storageAgentClient.uploadFile(
                    server,
                    vaultPrefix + employee.Department.name,
                    employee.full_name,
                    uniqueFilename,
                    fileStream
                );

                finalFilePath = `${vaultPrefix}${employee.Department.name}\\${employee.full_name}\\${uniqueFilename}`;

                // Cleanup temp file
                fs.unlink(file.path, (err) => {
                    if (err) console.error('Failed to cleanup temp file:', err);
                });
            } catch (agentErr) {
                // Cleanup temp file even on error
                fs.unlink(file.path, () => { });
                throw agentErr;
            }
        }

        const isSensitive = !!(req.headers['x-onboarding-token'] || req.body.onboarding_token || req.body.is_sensitive === 'true' || req.body.is_sensitive === true);

        // Save metadata to database
        const fileMetadata = await FileMetadata.create({
            filename: uniqueFilename,
            original_name: file.originalname,
            file_path: finalFilePath,
            file_size: file.size,
            mime_type: file.mimetype,
            department_id,
            employee_id: employee_id,
            server_id: finalServerId,
            uploaded_by: req.user ? req.user.id : null,
            onboarding_token: req.headers['x-onboarding-token'] || req.body.onboarding_token || null,
            version,
            parent_file_id,
            is_sensitive: isSensitive
        });

        // Audit log
        if (req.user) {
            await AuditLog.create({
                entity_type: 'FILE',
                entity_id: fileMetadata.id,
                action: 'UPLOAD',
                new_value: JSON.stringify({
                    filename: file.originalname,
                    size: file.size,
                    version
                }),
                performed_by: req.user.id,
                ip_address: req.ip,
                user_agent: req.get('user-agent')
            });
        }
        if (!res.headersSent) {
            res.json({
                success: true,
                file: fileMetadata
            });
        }
    } catch (error) {
        console.error('Upload error:', error);
        if (!res.headersSent) {
            res.status(500).json({
                error: 'Upload failed',
                message: error.message,
                name: error.name,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    }
};

// Download file
exports.downloadFile = async (req, res) => {
    try {
        const { id } = req.params;

        const file = await FileMetadata.findByPk(id, {
            include: [
                { model: StorageServer, as: 'StorageServer' },
                { model: Employee, as: 'Employee' },
                { model: Department, as: 'Department' }
            ]
        });

        if (!file || file.is_deleted) {
            return res.status(404).json({ error: 'File not found' });
        }

        // Permission check
        if (!canAccessFile(req.user, file)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Get file stream from Storage Agent OR Local
        const filepath = file.file_path;
        let fileStream;

        if (file.server_id === null) {
            // LOCAL FILE
            const fullPath = path.join(process.cwd(), filepath);
            const fs = require('fs');
            if (!fs.existsSync(fullPath)) {
                return res.status(404).json({ error: 'Local file not found on disk' });
            }
            fileStream = fs.createReadStream(fullPath);
        } else {
            // REMOTE AGENT FILE
            fileStream = await storageAgentClient.downloadFile(
                file.StorageServer,
                filepath
            );
        }

        // Set Headers
        res.setHeader('Content-Type', file.mime_type);
        if (req.query.download === 'true') {
            res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.original_name)}"`);
        }

        // Pipe the stream directly to the response
        fileStream.pipe(res);

        // Audit log after stream finishes
        fileStream.on('end', async () => {
            await AuditLog.create({
                entity_type: 'FILE',
                entity_id: id,
                action: 'DOWNLOAD',
                old_value: JSON.stringify({ filename: file.original_name }),
                performed_by: req.user.id,
                ip_address: req.ip
            });
        });

        fileStream.on('error', (err) => {
            console.error('Streaming error:', err);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Streaming failed' });
            }
        });
    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({
            error: 'Download failed',
            message: error.message
        });
    }
};

// Delete file
exports.deleteFile = async (req, res) => {
    try {
        const { id } = req.params;

        const file = await FileMetadata.findByPk(id, {
            include: [{ model: StorageServer, as: 'StorageServer' }]
        });

        if (!file || file.is_deleted) {
            return res.status(404).json({ error: 'File not found' });
        }

        // Delete from Storage Agent OR Local
        const filepath = file.file_path;

        if (file.server_id === null) {
            // LOCAL DELETE
            const fullPath = path.join(process.cwd(), filepath);
            const fs = require('fs');
            if (fs.existsSync(fullPath)) {
                fs.unlinkSync(fullPath);
            }
        } else {
            // REMOTE DELETE
            await storageAgentClient.deleteFile(file.StorageServer, filepath);
        }

        // Soft delete in database
        file.is_deleted = true;
        await file.save();

        // Audit log
        await AuditLog.create({
            entity_type: 'FILE',
            entity_id: file.id,
            action: 'DELETE',
            old_value: JSON.stringify({ filename: file.original_name }),
            performed_by: req.user.id,
            ip_address: req.ip
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({
            error: 'Delete failed',
            message: error.message
        });
    }
};

// List files
exports.listFiles = async (req, res) => {
    try {
        const { employee_id, department_id } = req.query;

        const where = { is_deleted: false };

        // Filter by employee if specified
        if (employee_id) {
            where.employee_id = employee_id;
        }

        // Filter by department if specified
        if (department_id) {
            where.department_id = department_id;
        }

        // Apply permission-based filtering
        const isHighLevel = req.user.permissions.includes('storage.view.all') ||
            req.user.permissions.includes('admin.access') ||
            req.user.role === 'ADMIN' ||
            req.user.role === 'SUPER_ADMIN' ||
            req.user.roles?.includes('ADMIN') ||
            req.user.roles?.includes('SUPER_ADMIN');

        if (!isHighLevel) {
            where.is_sensitive = false; // Regular users NEVER see sensitive files in list
            where[Op.or] = [
                { uploaded_by: req.user.id }
            ];
            if (req.user.employee_id) {
                where[Op.or].push({ employee_id: req.user.employee_id });
            }
        }

        const files = await FileMetadata.findAll({
            where,
            order: [['createdAt', 'DESC']]
        });

        res.json(files);
    } catch (error) {
        console.error('List files error:', error);
        res.status(500).json({
            error: 'Failed to list files',
            message: error.message
        });
    }
};

// Get file versions
exports.getFileVersions = async (req, res) => {
    try {
        const { id } = req.params;

        const file = await FileMetadata.findByPk(id);

        if (!file) {
            return res.status(404).json({ error: 'File not found' });
        }

        const versions = await FileMetadata.findAll({
            where: {
                [Op.or]: [
                    { id: file.parent_file_id || file.id },
                    { parent_file_id: file.parent_file_id || file.id }
                ]
            },
            order: [['version', 'DESC']],
            include: [
                { model: User, as: 'Uploader', attributes: ['id', 'username', 'full_name'] }
            ]
        });

        res.json(versions);
    } catch (error) {
        console.error('Get versions error:', error);
        res.status(500).json({
            error: 'Failed to get versions',
            message: error.message
        });
    }
};

// Get server health
exports.getServerHealth = async (req, res) => {
    try {
        const servers = await StorageServer.findAll();

        const healthChecks = await Promise.all(
            servers.map(server => storageAgentClient.checkHealth(server))
        );

        res.json(healthChecks);
    } catch (error) {
        console.error('Health check error:', error);
        res.status(500).json({
            error: 'Health check failed',
            message: error.message
        });
    }
};

// [NEW] Get Storage Settings
exports.getSettings = async (req, res) => {
    try {
        // Fetch all departments with their current storage settings
        const departments = await Department.findAll({
            include: [{
                model: DepartmentStorage,
                as: 'DepartmentStorage',
                include: [{ model: StorageServer, as: 'StorageServer' }]
            }],
            order: [['name', 'ASC']]
        });

        // Fetch all available storage servers
        const servers = await StorageServer.findAll({
            where: { is_active: true },
            order: [['name', 'ASC']]
        });

        res.json({
            departments,
            servers
        });
    } catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({ error: error.message });
    }
};

// [NEW] Update Storage Settings
exports.updateSettings = async (req, res) => {
    try {
        const { department_id, server_id, quota_mb } = req.body;

        if (!department_id || !server_id) {
            return res.status(400).json({ error: 'Department ID and Server ID are required' });
        }

        // Check if server exists
        const server = await StorageServer.findByPk(server_id);
        if (!server) {
            return res.status(404).json({ error: 'Storage Server not found' });
        }

        // Find or create the settings
        const [settings, created] = await DepartmentStorage.findOrCreate({
            where: { department_id },
            defaults: {
                server_id,
                quota_mb: quota_mb || 10000
            }
        });

        if (!created) {
            // Update existing
            settings.server_id = server_id;
            if (quota_mb) settings.quota_mb = quota_mb;
            await settings.save();
        }

        res.json({
            success: true,
            message: 'Storage settings updated successfully',
            settings
        });
    } catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({ error: error.message });
    }
};
