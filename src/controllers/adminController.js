const { FormSubmission, FormTemplate, FormSignature, FormAttachment, Employee, User, FormAuditTrail, Department, FileMetadata, sequelize } = require('../models');
const { Op } = require('sequelize');
const formCtrl = require('./formSubmissionController');

/**
 * Get all form submissions with filtering
 */
exports.getAllSubmissions = async (req, res) => {
    try {
        const { status, type, department_id, search, page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        const where = {};
        if (status) where.status = status;

        const include = [
            {
                model: FormTemplate,
                as: 'Template',
                where: type ? { type } : {}
            },
            {
                model: Employee,
                as: 'Employee',
                required: false, // LEFT JOIN to include submissions without employees (Onboarding)
                where: search ? {
                    [Op.or]: [
                        { full_name: { [Op.like]: `%${search}%` } },
                        { code: { [Op.like]: `%${search}%` } }
                    ]
                } : {},
                include: department_id ? [{ model: Department, as: 'Department', where: { id: department_id } }] : []
            },
            {
                model: FormAttachment,
                as: 'Attachments',
                required: false,
                include: [{
                    model: FileMetadata,
                    as: 'FileMetadata',
                    required: false
                }]
            }
        ];

        const { count, rows } = await FormSubmission.findAndCountAll({
            where,
            include,
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['created_at', 'DESC']]
        });

        res.json({
            success: true,
            total: count,
            pages: Math.ceil(count / limit),
            submissions: rows
        });
    } catch (error) {
        console.error('Admin getAllSubmissions error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * Get single submission detail for admin
 */
exports.getSubmissionDetail = async (req, res) => {
    try {
        const { id } = req.params;

        const submission = await FormSubmission.findByPk(id, {
            include: [
                { model: FormTemplate, as: 'Template' },
                {
                    model: Employee,
                    as: 'Employee',
                    include: [{ model: Department, as: 'Department' }]
                },
                {
                    model: FormSignature,
                    as: 'Signatures',
                    include: [{ model: User, as: 'Signer', attributes: ['full_name', 'username'] }]
                },
                {
                    model: FormAttachment,
                    as: 'Attachments',
                    include: [{
                        model: FileMetadata,
                        as: 'FileMetadata',
                        required: false // LEFT JOIN so attachments without files still show
                    }]
                }
            ]
        });

        if (!submission) {
            return res.status(404).json({ success: false, error: 'Submission not found' });
        }

        res.json({
            success: true,
            submission
        });
    } catch (error) {
        console.error('Admin getSubmissionDetail error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * Reassign approver for a pending signature
 */
exports.reassignApprover = async (req, res) => {
    try {
        const { submission_id, signature_id, new_signer_id } = req.body;

        const signature = await FormSignature.findByPk(signature_id);
        if (!signature || signature.status !== 'pending') {
            return res.status(400).json({ error: 'Signature not found or not pending' });
        }

        await signature.update({ signer_id: new_signer_id });

        // Log action
        await FormAuditTrail.create({
            submission_id,
            user_id: req.user.id,
            action: 'reassigned',
            changes: { signature_id, new_signer_id },
            ip_address: req.ip
        });

        res.json({ success: true, message: 'Approver reassigned successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * Admin direct action (Approve/Reject with global power)
 */
exports.adminAction = async (req, res) => {
    try {
        const { id } = req.params;
        const { action, reason } = req.body;

        const submission = await FormSubmission.findByPk(id);
        if (!submission) return res.status(404).json({ error: 'Submission not found' });

        if (action === 'approve') {
            await submission.update({ status: 'approved', reviewer_notes: reason, reviewed_at: new Date() });

            // [NEW] Resolve all pending signatures as "System Override"
            await FormSignature.update({
                status: 'signed',
                signed_at: new Date(),
                signer_id: req.user.id,
                comments: 'System Action: Administrative Override'
            }, {
                where: {
                    submission_id: id,
                    status: 'pending'
                }
            });

            // Trigger auto-provisioning if Join Form
            const template = await FormTemplate.findByPk(submission.template_id);
            if (template.type === 'join') {
                // 1. Create Employee record only
                await formCtrl.createEmployeeFromJoinForm(submission);

                // [NOTE] User account is NOT created/updated here. 
                // Admin must go to Employee Details to provision access.
            }
        } else if (action === 'reject') {
            await submission.update({ status: 'rejected', reviewer_notes: reason, reviewed_at: new Date() });
        }

        // Log action
        await FormAuditTrail.create({
            submission_id: id,
            user_id: req.user.id,
            action,
            notes: reason,
            ip_address: req.ip
        });

        res.json({ success: true, message: `Form ${action}ed successfully` });
    } catch (error) {
        console.error('--- ADMIN ACTION ERROR STACK ---');
        console.error(error);
        console.error('--------------------------------');
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * Get system configuration (Leave types, etc.)
 */
exports.getSystemConfig = async (req, res) => {
    try {
        const templates = await FormTemplate.findAll({ where: { is_active: true } });
        res.json({ success: true, templates });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
/**
 * Get tactical alerts for the Command Center
 */
exports.getDashboardTactical = async (req, res) => {
    try {
        const pendingCount = await FormSubmission.count({ where: { status: 'pending' } });
        const returnedCount = await FormSubmission.count({ where: { status: 'returned_for_edit' } });

        // Get recent 3 pending submissions for quick view
        const recentPending = await FormSubmission.findAll({
            where: { status: 'pending' },
            include: [{ model: FormTemplate, as: 'Template', attributes: ['name'] }],
            limit: 3,
            order: [['created_at', 'DESC']]
        });

        res.json({
            success: true,
            alerts: {
                pending: pendingCount,
                returned: returnedCount,
                recent: recentPending
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
