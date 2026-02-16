const { GlobalSetting } = require('../models');

// Get all settings
exports.getAllSettings = async (req, res) => {
    try {
        const settings = await GlobalSetting.findAll({
            order: [['category', 'ASC'], ['setting_key', 'ASC']]
        });
        res.json(settings);
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
};

// Get single setting by key
exports.getSetting = async (req, res) => {
    try {
        const { key } = req.params;
        const setting = await GlobalSetting.findOne({
            where: { setting_key: key }
        });

        if (!setting) {
            return res.status(404).json({ error: 'Setting not found' });
        }

        res.json(setting);
    } catch (error) {
        console.error('Error fetching setting:', error);
        res.status(500).json({ error: 'Failed to fetch setting' });
    }
};

// Update or create setting
exports.updateSetting = async (req, res) => {
    try {
        const { key } = req.params;
        const { setting_value, category, description } = req.body;
        const userId = req.user.id;

        const [setting, created] = await GlobalSetting.findOrCreate({
            where: { setting_key: key },
            defaults: {
                setting_value,
                category: category || 'system',
                description,
                updated_by: userId
            }
        });

        if (!created) {
            setting.setting_value = setting_value;
            if (category) setting.category = category;
            if (description) setting.description = description;
            setting.updated_by = userId;
            await setting.save();
        }

        res.json({
            message: created ? 'Setting created' : 'Setting updated',
            setting
        });
    } catch (error) {
        console.error('Error updating setting:', error);
        res.status(500).json({ error: 'Failed to update setting' });
    }
};

// Delete setting
exports.deleteSetting = async (req, res) => {
    try {
        const { key } = req.params;
        const deleted = await GlobalSetting.destroy({
            where: { setting_key: key }
        });

        if (!deleted) {
            return res.status(404).json({ error: 'Setting not found' });
        }

        res.json({ message: 'Setting deleted successfully' });
    } catch (error) {
        console.error('Error deleting setting:', error);
        res.status(500).json({ error: 'Failed to delete setting' });
    }
};
