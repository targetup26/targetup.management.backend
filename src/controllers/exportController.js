const exportService = require('../modules/leads/export.service');

const exportController = {
    /**
     * Export leads to CSV
     */
    exportLeads: async (req, res) => {
        try {
            const { categoryId, subcategoryId, onlyNonExported } = req.body;
            const result = await exportService.exportLeads(req.user.id, {
                categoryId,
                subcategoryId,
                onlyNonExported
            });

            res.json({
                success: true,
                message: `${result.count} leads exported successfully`,
                downloadUrl: result.downloadUrl
            });
        } catch (error) {
            console.error('[ExportController] exportLeads error:', error);
            res.status(error.message === 'No leads found for export' ? 404 : 500)
                .json({ success: false, error: error.message });
        }
    },

    /**
     * Get export history
     */
    getExportHistory: async (req, res) => {
        try {
            const { LeadExport, Category, Subcategory, User } = require('../models');
            const history = await LeadExport.findAll({
                include: [
                    { model: Category, as: 'Category', attributes: ['name'] },
                    { model: Subcategory, as: 'Subcategory', attributes: ['name'] },
                    { model: User, as: 'Exporter', attributes: ['full_name'] }
                ],
                order: [['created_at', 'DESC']]
            });

            res.json({ success: true, data: history });
        } catch (error) {
            console.error('[ExportController] getExportHistory error:', error);
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    }
};

module.exports = exportController;
