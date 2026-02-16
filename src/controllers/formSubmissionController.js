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
                    { model: FormTemplate, as: 'Template', attributes: ['title', 'category'] },
                    { model: User, as: 'Approver', attributes: ['full_name'] }
                ],
                order: [['created_at', 'DESC']]
            });

            res.json({ success: true, data: submissions });
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

            res.json({ success: true, data: submission });
        } catch (error) {
            console.error('[FormSubmissionController] submitForm error:', error);
            res.status(500).json({ success: false, error: 'Failed to submit form' });
        }
    }
};

module.exports = formSubmissionController;
