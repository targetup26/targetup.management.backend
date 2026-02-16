const { PrintSettings } = require('../models');

/**
 * Get current print settings
 */
exports.getPrintSettings = async (req, res) => {
    try {
        // Get or create settings (singleton pattern - only one row)
        let settings = await PrintSettings.findOne();

        if (!settings) {
            // Create default settings if none exist
            settings = await PrintSettings.create({
                company_name: 'TARGETUP CORPORATION',
                header_subtitle: 'HUMAN RESOURCE MANAGEMENT',
                footer_text: '© 2026 Targetup Corporation. Official Copy.'
            });
        }

        res.json({
            success: true,
            settings
        });
    } catch (error) {
        console.error('Error fetching print settings:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Update print settings
 */
exports.updatePrintSettings = async (req, res) => {
    try {
        const { company_name, company_logo_url, header_subtitle, footer_text } = req.body;

        // Get or create settings
        let settings = await PrintSettings.findOne();

        if (!settings) {
            settings = await PrintSettings.create({
                company_name,
                company_logo_url,
                header_subtitle,
                footer_text
            });
        } else {
            await settings.update({
                company_name: company_name || settings.company_name,
                company_logo_url: company_logo_url !== undefined ? company_logo_url : settings.company_logo_url,
                header_subtitle: header_subtitle || settings.header_subtitle,
                footer_text: footer_text || settings.footer_text
            });
        }

        res.json({
            success: true,
            settings,
            message: 'Print settings updated successfully'
        });
    } catch (error) {
        console.error('Error updating print settings:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Reset print settings to defaults
 */
exports.resetPrintSettings = async (req, res) => {
    try {
        let settings = await PrintSettings.findOne();

        if (settings) {
            await settings.update({
                company_name: 'TARGETUP CORPORATION',
                company_logo_url: null,
                header_subtitle: 'HUMAN RESOURCE MANAGEMENT',
                footer_text: '© 2026 Targetup Corporation. Official Copy.'
            });
        } else {
            settings = await PrintSettings.create({
                company_name: 'TARGETUP CORPORATION',
                header_subtitle: 'HUMAN RESOURCE MANAGEMENT',
                footer_text: '© 2026 Targetup Corporation. Official Copy.'
            });
        }

        res.json({
            success: true,
            settings,
            message: 'Print settings reset to defaults'
        });
    } catch (error) {
        console.error('Error resetting print settings:', error);
        res.status(500).json({ error: error.message });
    }
};

module.exports = exports;
