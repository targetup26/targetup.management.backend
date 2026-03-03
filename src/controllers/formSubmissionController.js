const { FormSubmission, FormTemplate, FormSignature, FormAttachment, Employee, User, FormAuditTrail, Department, FileMetadata, sequelize } = require('../models');

/**
 * Form Submission Controller
 * Handles employee form submissions
 */
const formSubmissionController = {
    /**
     * Get all form submissions for the current user
     */
    getMySubmissions: async (req, res) => {
        try {
            const submissions = await FormSubmission.findAll({
                where: { submitted_by: req.user.id },
                include: [
                    { model: FormTemplate, as: 'Template', attributes: ['name', 'type'] },
                    { model: User, as: 'Reviewer', attributes: ['full_name'] }
                ],
                order: [['created_at', 'DESC']]
            });

            res.json({ success: true, submissions });
        } catch (error) {
            console.error('[FormSubmissionController] getMySubmissions error:', error);
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    },

    /**
     * Submit a new form
     */
    submitForm: async (req, res) => {
        try {
            const { template_id, form_data } = req.body;

            const submission = await FormSubmission.create({
                template_id,
                submitted_by: req.user.id,
                form_data: JSON.stringify(form_data),
                status: 'pending'
            });

            res.json({ success: true, submission });
        } catch (error) {
            console.error('[FormSubmissionController] submitForm error:', error);
            res.status(500).json({ success: false, error: 'Failed to submit form' });
        }
    },

    /**
     * Get single submission detail for current user
     */
    getSubmissionDetail: async (req, res) => {
        try {
            const { id } = req.params;
            const submission = await FormSubmission.findOne({
                where: {
                    id,
                    submitted_by: req.user.id
                },
                include: [
                    { model: FormTemplate, as: 'Template', attributes: ['name', 'type'] },
                    { model: User, as: 'Reviewer', attributes: ['full_name'] },
                    {
                        model: FormSignature,
                        as: 'Signatures',
                        include: [{ model: User, as: 'Signer', attributes: ['full_name'] }]
                    },
                    {
                        model: FormAttachment,
                        as: 'Attachments',
                        include: [{ model: FileMetadata, as: 'FileMetadata' }]
                    }
                ]
            });

            if (!submission) {
                return res.status(404).json({ success: false, error: 'Submission not found' });
            }

            res.json({ success: true, submission });
        } catch (error) {
            console.error('[FormSubmissionController] getSubmissionDetail error:', error);
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    },

    /**
     * Create an Employee from an approved Join Form
     * Note: This assumes submission is a FormSubmission instance
     */
    createEmployeeFromJoinForm: async (submission) => {
        try {
            const formData = typeof submission.form_data === 'string' ? JSON.parse(submission.form_data) : submission.form_data;

            // Extract core fields, defaulting if missing
            const fullName = formData.full_name || 'Unknown Employee';
            const email = formData.email_address || formData.email || null;
            const phone = formData.mobile || formData.phone || null;

            // [FIX] Generate a unique code if none provided in form, prioritize form data
            const code = formData.employee_code ||
                formData.staff_id ||
                formData.code ||
                `EMP-${Date.now().toString().slice(-4)}${Math.floor(1000 + Math.random() * 9000)}`;

            const sanitizeId = (id) => {
                if (!id) return null;
                const parsed = parseInt(id);
                if (isNaN(parsed) || (typeof id === 'string' && id.includes('opt_'))) return null;
                return parsed;
            };

            const employeeData = {
                code,
                full_name: fullName,
                email,
                phone,
                is_active: true,
                department_id: sanitizeId(formData.department_id),
                job_role_id: sanitizeId(formData.job_role_id),
                shift_id: sanitizeId(formData.shift_id)
            };

            const employee = await Employee.create(employeeData);

            // Connect submission to new employee
            await submission.update({ employee_id: employee.id });

            // [NEW] Link all files in this submission directly to the employee record
            const attachments = await FormAttachment.findAll({
                where: { submission_id: submission.id }
            });

            if (attachments.length > 0) {
                const fileIds = attachments.map(a => a.file_metadata_id);
                await FileMetadata.update(
                    { employee_id: employee.id },
                    { where: { id: fileIds } }
                );
            }

            return employee;
        } catch (error) {
            console.error('[FormSubmissionController] createEmployeeFromJoinForm error:', error);
            throw error; // Let admin controller handle it
        }
    }
};

module.exports = formSubmissionController;
