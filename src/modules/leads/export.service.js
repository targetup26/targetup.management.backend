const { Lead, LeadExport, User, Category, Subcategory } = require('../../models');
const { Op } = require('sequelize');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const exportService = {
    /**
     * Export leads to CSV
     * @param {number} userId - ID of the user requesting export
     * @param {Object} filters - Export filters
     */
    exportLeads: async (userId, filters) => {
        // 1. Build Query
        const where = {};
        if (filters.categoryId) where.category_id = filters.categoryId;
        if (filters.subcategoryId) where.subcategory_id = filters.subcategoryId;

        // If "onlyNonExported" is true, we might need a way to track if a lead was exported.
        // For now, ignoring complex "exported" tracking on individual leads unless a specific column exists.

        // 2. Fetch Leads
        const leads = await Lead.findAll({
            where,
            include: [
                { model: Category, as: 'Category', attributes: ['name'] },
                { model: Subcategory, as: 'Subcategory', attributes: ['name'] }
            ],
            raw: true,
            nest: true
        });

        if (!leads.length) {
            throw new Error('No leads found for export');
        }

        // 3. Generate CSV Content
        const headers = ['Business Name', 'Phone', 'Address', 'City', 'State', 'Category', 'Subcategory', 'Website', 'Rating'];
        const csvRows = leads.map(lead => [
            `"${lead.business_name || ''}"`,
            `"${lead.phone_number || ''}"`,
            `"${lead.address || ''}"`,
            `"${lead.city || ''}"`,
            `"${lead.state || ''}"`,
            `"${lead.Category?.name || ''}"`,
            `"${lead.Subcategory?.name || ''}"`,
            `"${lead.website || ''}"`,
            `"${lead.rating || ''}"`
        ]);

        const csvContent = [headers.join(','), ...csvRows.map(r => r.join(','))].join('\n');

        // 4. Save File
        const filename = `leads_export_${Date.now()}_${uuidv4().substring(0, 8)}.csv`;
        const exportDir = path.join(process.cwd(), 'public', 'exports');

        if (!fs.existsSync(exportDir)) {
            fs.mkdirSync(exportDir, { recursive: true });
        }

        const filePath = path.join(exportDir, filename);
        fs.writeFileSync(filePath, csvContent);

        // 5. Log Export History
        await LeadExport.create({
            user_id: userId,
            category_id: filters.categoryId || null,
            subcategory_id: filters.subcategoryId || null,
            file_path: `/exports/${filename}`,
            exported_count: leads.length,
            status: 'COMPLETED'
        });

        // 6. Return Download URL
        return {
            count: leads.length,
            downloadUrl: `/exports/${filename}`
        };
    }
};

module.exports = exportService;
