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
                status: 'pending',
                submitted_at: new Date()
            });

            // ── Create FormAttachment records for any file fields ──
            // File fields store the FileMetadata ID as their value (a number)
            // We detect them: either by template schema (type === 'file') or
            // by checking known common file field names as a fallback.
            try {
                const template = await FormTemplate.findByPk(template_id, { attributes: ['schema'] });
                const schema = template?.schema
                    ? (typeof template.schema === 'string' ? JSON.parse(template.schema) : template.schema)
                    : null;

                // Collect field names that are of type 'file' from template schema
                const fileFieldNames = new Set();
                if (schema?.sections) {
                    schema.sections.forEach(section => {
                        (section.fields || []).forEach(field => {
                            if (field.type === 'file') fileFieldNames.add(field.name);
                        });
                    });
                }

                // Fallback: common known file field names
                ['personal_photo', 'id_card_scan', 'cv_upload', 'passport_scan',
                 'medical_certificate', 'signature', 'attachment'].forEach(n => fileFieldNames.add(n));

                // Create FormAttachment for each file field that has a numeric ID
                const attachmentPromises = [];
                for (const [fieldName, value] of Object.entries(form_data)) {
                    if (fileFieldNames.has(fieldName) && value && !isNaN(parseInt(value))) {
                        attachmentPromises.push(
                            FormAttachment.create({
                                submission_id: submission.id,
                                file_metadata_id: parseInt(value),
                                field_name: fieldName,
                                attachment_type: fieldName,
                                uploaded_by: req.user.id,
                                uploaded_at: new Date()
                            })
                        );
                    }
                }

                if (attachmentPromises.length > 0) {
                    await Promise.all(attachmentPromises);
                }
            } catch (attachErr) {
                // Don't fail the whole submission for attachment linking errors
                console.warn('[submitForm] FormAttachment linking warning:', attachErr.message);
            }

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
     * Get submission data for printing (admin or submitter)
     */
    getPrintSubmission: async (req, res) => {
        try {
            const { id } = req.params;
            const submission = await FormSubmission.findOne({
                where: { id },
                include: [
                    { model: FormTemplate, as: 'Template' },
                    { model: User, as: 'Submitter', attributes: ['full_name', 'username'] },
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
            console.error('[FormSubmissionController] getPrintSubmission error:', error);
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

            // Employee code is auto-generated by model's beforeValidate hook (TUP-YYYY-XXXX).
            // Use any code from formData if provided.
            const providedCode = formData.employee_code || formData.staff_id || formData.code || undefined;

            const sanitizeId = (id) => {
                if (!id) return null;
                const parsed = parseInt(id);
                if (isNaN(parsed) || (typeof id === 'string' && id.includes('opt_'))) return null;
                return parsed;
            };

            const employeeData = {
                ...(providedCode ? { code: providedCode } : {}),
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
