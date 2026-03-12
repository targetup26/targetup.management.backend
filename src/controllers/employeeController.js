const { Employee, Department, JobRole, Shift } = require('../models');

const { Op } = require('sequelize');

exports.getAll = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 15;
        const offset = (page - 1) * limit;

        const where = {};

        // Search (Code or Name)
        if (req.query.search) {
            where[Op.or] = [
                { code: { [Op.like]: `%${req.query.search}%` } },
                { full_name: { [Op.like]: `%${req.query.search}%` } }
            ];
        }

        // Filters
        if (req.query.department_id) where.department_id = req.query.department_id;
        if (req.query.job_role_id) where.job_role_id = req.query.job_role_id;
        if (req.query.shift_id) where.shift_id = req.query.shift_id;

        // Status Filter (Frontend sends 'active'/'inactive')
        if (req.query.status) {
            where.is_active = req.query.status === 'active';
        }

        // Date Range Filter (Join Date)
        if (req.query.join_date_start || req.query.join_date_end) {
            where.hire_date = {};
            if (req.query.join_date_start) where.hire_date[Op.gte] = req.query.join_date_start;
            if (req.query.join_date_end) where.hire_date[Op.lte] = req.query.join_date_end;
        }

        const isPaginated = req.query.page !== undefined;

        if (isPaginated) {
            const { count, rows } = await Employee.findAndCountAll({
                where,
                limit,
                offset,
                order: [['createdAt', 'DESC']],
                include: [
                    { model: Department, attributes: ['name'] },
                    { model: JobRole, attributes: ['name'] },
                    { model: Shift, attributes: ['name', 'start_time', 'end_time'] },
                    {
                        model: require('../models').User,
                        attributes: ['id', 'username', 'role']
                    }
                ]
            });

            return res.json({
                data: rows,
                meta: {
                    total: count,
                    page,
                    limit,
                    last_page: Math.ceil(count / limit)
                }
            });
        }

        const data = await Employee.findAll({
            where,
            order: [['createdAt', 'DESC']],
            include: [
                { model: Department, attributes: ['name'] },
                { model: JobRole, attributes: ['name'] },
                { model: Shift, attributes: ['name', 'start_time', 'end_time'] },
                {
                    model: require('../models').User,
                    attributes: ['id', 'username', 'role']
                }
            ]
        });

        res.json(data);
    } catch (error) {
        console.error('Get Employees Error:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.getOne = async (req, res) => {
    try {
        const { Department, JobRole, Shift, FormSubmission, FormTemplate, FormAttachment,
            FileMetadata, BreakLog, AuditLog, User, OnboardingToken } = require('../models');

        const data = await Employee.findByPk(req.params.id, {
            include: [
                Department,
                JobRole,
                Shift,
                User,
                {
                    model: FormSubmission,
                    as: 'Submissions',
                    include: [
                        { model: FormTemplate, as: 'Template' },
                        {
                            model: FormAttachment,
                            as: 'Attachments',
                            include: [{ model: FileMetadata, as: 'FileMetadata' }]
                        }
                    ]
                },
                { model: BreakLog },
                {
                    model: AuditLog,
                    as: 'ActionHistory',
                    include: [{ model: User }]
                },
                {
                    model: FileMetadata,
                    as: 'VaultFiles'
                }
            ]
        });

        if (!data) return res.status(404).json({ error: 'Employee not found' });

        // Find orphaned join form submissions (no employee_id) by in-memory matching
        try {
            const { Op } = require('sequelize');

            // Get all unlinked onboarding submissions
            const allOrphanSubs = await FormSubmission.findAll({
                where: {
                    employee_id: null,
                    onboarding_token: { [Op.ne]: null }
                },
                include: [
                    { model: FormTemplate, as: 'Template' },
                    { model: FormAttachment, as: 'Attachments', include: [{ model: FileMetadata, as: 'FileMetadata' }] }
                ]
            });

            if (allOrphanSubs.length > 0) {
                // Build search values from the employee record (lowercase for case-insensitive matching)
                const empName = (data.full_name || '').toLowerCase().trim();
                const empEmail = (data.email || '').toLowerCase().trim();
                const empNationalId = (data.national_id || '').trim();
                const empPhone = (data.phone || '').trim();

                const matched = allOrphanSubs.filter(sub => {
                    try {
                        const fd = typeof sub.form_data === 'string' ? JSON.parse(sub.form_data) : (sub.form_data || {});
                        const fdStr = JSON.stringify(fd).toLowerCase();

                        if (empName && fdStr.includes(empName)) return true;
                        if (empEmail && fdStr.includes(empEmail)) return true;
                        if (empNationalId && fdStr.includes(empNationalId)) return true;
                        if (empPhone && empPhone.length >= 8 && fdStr.includes(empPhone)) return true;
                    } catch (_) {}
                    return false;
                });

                if (matched.length > 0) {
                    // Silently back-fill employee_id for matched submissions
                    await FormSubmission.update(
                        { employee_id: data.id },
                        { where: { id: matched.map(s => s.id) } }
                    );
                    data.Submissions = [...(data.Submissions || []), ...matched];
                }
            }
        } catch (orphanErr) {
            console.warn('[getOne] Orphan submission lookup failed:', orphanErr.message);
        }

        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.create = async (req, res) => {
    try {
        const data = await Employee.create(req.body);
        res.status(201).json(data);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.update = async (req, res) => {
    try {
        const [updated] = await Employee.update(req.body, {
            where: { id: req.params.id }
        });
        if (updated) {
            const updatedEmp = await Employee.findByPk(req.params.id);
            res.json(updatedEmp);
        } else {
            res.status(404).json({ error: 'Employee not found' });
        }
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Soft Delete
exports.delete = async (req, res) => {
    try {
        const deleted = await Employee.destroy({
            where: { id: req.params.id }
        });
        if (deleted) {
            res.status(204).send();
        } else {
            res.status(404).json({ error: 'Employee not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
