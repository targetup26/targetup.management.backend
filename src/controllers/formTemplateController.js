const { FormTemplate, FormFieldOption, User } = require('../models');
const { Op } = require('sequelize');

/**
 * Get all active form templates
 */
exports.getTemplates = async (req, res) => {
    try {
        const templates = await FormTemplate.findAll({
            include: [
                { model: User, as: 'Creator' }
            ],
            order: [['created_at', 'DESC']]
        });

        res.json({ success: true, templates });
    } catch (error) {
        console.error('Error fetching templates:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * Get single template with full schema and options
 */
exports.getTemplate = async (req, res) => {
    try {
        const { id } = req.params;

        const template = await FormTemplate.findByPk(id, {
            include: [
                { model: FormFieldOption, as: 'FieldOptions', where: { is_active: true }, required: false }
            ]
        });

        if (!template) {
            return res.status(404).json({ success: false, error: 'Template not found' });
        }

        res.json({ success: true, template });
    } catch (error) {
        console.error('Error fetching template:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * Get field options for a specific field
 */
exports.getFieldOptions = async (req, res) => {
    try {
        const { id, field } = req.params;

        const options = await FormFieldOption.findAll({
            where: {
                template_id: id,
                field_name: field,
                is_active: true
            },
            order: [['display_order', 'ASC']]
        });

        res.json({ success: true, options });
    } catch (error) {
        console.error('Error fetching field options:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * Create new template (Admin only)
 */
exports.createTemplate = async (req, res) => {
    try {
        const { name, type, schema, field_options } = req.body;
        const userId = req.user.id;

        // Create template
        const template = await FormTemplate.create({
            name,
            type,
            schema,
            created_by: userId
        });

        // Create field options if provided
        if (field_options && Array.isArray(field_options)) {
            const optionsToCreate = field_options.map(opt => ({
                template_id: template.id,
                field_name: opt.field_name,
                option_value: opt.option_value,
                display_order: opt.display_order || 0
            }));
            await FormFieldOption.bulkCreate(optionsToCreate);
        }

        res.json({ success: true, template });
    } catch (error) {
        console.error('Error creating template:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * Update template (Admin only)
 */
exports.updateTemplate = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, schema, is_active } = req.body;

        const template = await FormTemplate.findByPk(id);
        if (!template) {
            return res.status(404).json({ success: false, error: 'Template not found' });
        }

        // Increment version on schema change
        if (schema && JSON.stringify(schema) !== JSON.stringify(template.schema)) {
            template.version += 1;
        }

        await template.update({ name, schema, is_active });

        res.json({ success: true, template });
    } catch (error) {
        console.error('Error updating template:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * Get ALL templates (Active & Inactive) - For Admin Panel
 */
exports.getAllTemplates = async (req, res) => {
    try {
        const templates = await FormTemplate.findAll({
            include: [
                { model: User, as: 'Creator' }
            ],
            order: [['created_at', 'DESC']]
        });

        res.json({ success: true, templates });
    } catch (error) {
        console.error('Error fetching all templates:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

module.exports = exports;
