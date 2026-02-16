const { Lead, Category, Subcategory, LeadExport, sequelize } = require('../../models');
const path = require('path');
const fs = require('fs');
const { Parser } = require('json2csv');

const exportService = {
    /**
     * Export leads based on filters
     */
    async exportLeads(userId, { categoryId, subcategoryId, onlyNonExported }) {
        const where = {};
        if (categoryId) where.category_id = categoryId;
        if (subcategoryId) where.subcategory_id = subcategoryId;
        if (onlyNonExported) where.exported_count = 0;

        const leads = await Lead.findAll({
            where,
            include: [
                { model: Category, as: 'Category', attributes: ['name'] },
                { model: Subcategory, as: 'Subcategory', attributes: ['name'] }
            ]
        });

        if (leads.length === 0) {
            throw new Error('No leads found for export');
        }

        // Transform data for CSV
        const data = leads.map(l => ({
            BusinessName: l.business_name,
            Category: l.Category?.name || 'General',
            Subcategory: l.Subcategory?.name || 'General',
            Phone: l.phone || 'N/A',
            Email: l.email || 'N/A',
            Website: l.website || 'N/A',
            Address: l.address || 'N/A',
            City: l.city || 'N/A',
            Rating: l.rating || 0,
            Confidence: l.classification_confidence + '%',
            GoogleURL: l.google_url
        }));

        const json2csvParser = new Parser();
        const csv = json2csvParser.parse(data);

        // Path logic
        const fileName = `export_${Date.now()}.csv`;
        const exportDir = path.join(__dirname, '../../../../uploads/exports');
        if (!fs.existsSync(exportDir)) {
            fs.mkdirSync(exportDir, { recursive: true });
        }
        const filePath = path.join(exportDir, fileName);
        fs.writeFileSync(filePath, csv);

        // Transaction for DB updates
        return await sequelize.transaction(async (t) => {
            // Record the export
            const exportRecord = await LeadExport.create({
                category_id: categoryId || null,
                subcategory_id: subcategoryId || null,
                exported_by: userId,
                exported_count: leads.length,
                file_path: `/uploads/exports/${fileName}`
            }, { transaction: t });

            // Update leads metadata
            await Lead.update(
                {
                    exported_count: sequelize.literal('exported_count + 1'),
                    last_exported_at: new Date()
                },
                { where, transaction: t }
            );

            return {
                exportRecord,
                downloadUrl: `/uploads/exports/${fileName}`,
                count: leads.length
            };
        });
    }
};

module.exports = exportService;
