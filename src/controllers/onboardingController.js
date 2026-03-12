const { OnboardingToken, FormTemplate, FormSubmission, FileMetadata, Department, FormAttachment } = require('../models');
const crypto = require('crypto');
const { Op } = require('sequelize');
const path = require('path');
const fs = require('fs');

/**
 * Generate a secure onboarding invite link
 */
exports.invite = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, error: 'Target email vector is required' });
        }

        // Generate secure 32-char token
        const token = crypto.randomBytes(16).toString('hex');

        // Expiry: 7 days
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        await OnboardingToken.create({
            token,
            email,
            expires_at: expiresAt,
            created_by: req.user.id
        });

        // Construct join link (Frontend URL + token)
        const baseUrl = process.env.FRONTEND_URL || `${req.protocol}://${req.get('host').replace(':5000', ':5173')}`;
        const inviteLink = `${baseUrl}/join?token=${token}`;

        res.json({
            success: true,
            token,
            invite_link: inviteLink,
            expires_at: expiresAt
        });

    } catch (error) {
        console.error('[OnboardingController] Invite Error:', error);
        res.status(500).json({ success: false, error: 'Internal system error during invitation sequence.' });
    }
};

/**
 * Fetch form template for a specific token
 */
exports.getTemplateByToken = async (req, res) => {
    try {
        const { token } = req.params;

        const onboardingToken = await OnboardingToken.findOne({
            where: {
                token,
                is_used: false,
                expires_at: { [Op.gt]: new Date() }
            }
        });

        if (!onboardingToken) {
            return res.status(404).json({ success: false, error: 'Invalid or expired onboarding session.' });
        }

        // Default to a 'join' template
        const template = await FormTemplate.findOne({
            where: { type: 'join', is_active: true },
            order: [['version', 'DESC']]
        });

        if (!template) {
            return res.status(404).json({ success: false, error: 'Enrollment manifest template not found.' });
        }

        res.json({ success: true, template });

    } catch (error) {
        console.error('[OnboardingController] GetTemplate Error:', error);
        res.status(500).json({ success: false, error: 'Internal system error during session initialization.' });
    }
};

/**
 * Handle unauthenticated form submission via token
 */
exports.submitOnboarding = async (req, res) => {
    try {
        const { template_id, form_data, onboarding_token } = req.body;

        const token = await OnboardingToken.findOne({
            where: {
                token: onboarding_token,
                is_used: false,
                expires_at: { [Op.gt]: new Date() }
            }
        });

        if (!token) {
            return res.status(403).json({ success: false, error: 'Access Denied: Session token is VOID or EXPIRED.' });
        }

        // Try to find matching employee by email or national_id from form_data
        const { Employee } = require('../models');
        let employee_id = null;
        if (form_data) {
            const parsed = typeof form_data === 'string' ? JSON.parse(form_data) : form_data;
            const emailVal = parsed.email || parsed.personal_email || parsed.work_email;
            const nationalId = parsed.national_id || parsed.national_number;
            if (emailVal || nationalId) {
                const { Op } = require('sequelize');
                const whereClause = {};
                if (emailVal) whereClause.email = emailVal;
                if (nationalId) whereClause.national_id = nationalId;
                const foundEmployee = await Employee.findOne({ where: { [Op.or]: Object.entries(whereClause).map(([k, v]) => ({ [k]: v })) } });
                if (foundEmployee) employee_id = foundEmployee.id;
            }
        }

        // Create submission with employee_id if found
        const submission = await FormSubmission.create({
            template_id,
            form_data,
            onboarding_token,
            employee_id,   // ← links to employee profile
            status: 'pending',
            submitted_at: new Date()
        });

        // Invalidate token
        token.is_used = true;
        token.used_at = new Date();
        await token.save();

        // Link all uploaded files to this submission
        const files = await FileMetadata.findAll({
            where: { onboarding_token: onboarding_token }
        });

        for (const file of files) {
            await FormAttachment.create({
                submission_id: submission.id,
                file_metadata_id: file.id,
                field_name: file.original_name,
                uploaded_at: file.created_at
            });
            // Also link file to employee vault
            if (employee_id) {
                await file.update({ employee_id });
            }
        }

        res.json({ success: true, submission_id: submission.id });

    } catch (error) {
        console.error('[OnboardingController] Submit Error:', error);
        res.status(500).json({ success: false, error: 'Data Transmission Failure: Manifest could not be logged.' });
    }
};

/**
 * Specialized upload for onboarding (X-Onboarding-Token auth)
 */
exports.uploadFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No file vector provided.' });
        }

        const token = req.headers['x-onboarding-token'];

        const onboardingToken = await OnboardingToken.findOne({
            where: {
                token,
                is_used: false,
                expires_at: { [Op.gt]: new Date() }
            }
        });

        if (!onboardingToken) {
            return res.status(403).json({ success: false, error: 'Unauthorized: Valid onboarding token required.' });
        }

        // Find default department for onboarding
        const defaultDept = await Department.findOne({ where: { name: 'HR' } }) || await Department.findOne();

        if (!defaultDept) {
            return res.status(500).json({ success: false, error: 'System configuration error: No departments found.' });
        }

        // Move to final local storage for onboarding docs
        const uploadDir = path.join(process.cwd(), 'uploads', 'onboarding');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const uniqueFilename = `onboard_${Date.now()}_${req.file.originalname}`;
        const finalPath = path.join('uploads', 'onboarding', uniqueFilename);
        const fullDestPath = path.join(process.cwd(), finalPath);

        fs.copyFileSync(req.file.path, fullDestPath);
        fs.unlinkSync(req.file.path);

        const file = await FileMetadata.create({
            filename: uniqueFilename,
            original_name: req.file.originalname,
            mime_type: req.file.mimetype,
            file_size: req.file.size,
            file_path: finalPath,
            department_id: defaultDept.id,
            onboarding_token: token,
            is_sensitive: true,
            storage_type: 'local' // Explicitly local for onboarding stage
        });

        res.status(201).json({ success: true, file });

    } catch (error) {
        console.error('[OnboardingController] Upload Error:', error);
        res.status(500).json({ success: false, error: 'Storage failure during vector transmission.' });
    }
};
