const { Category, Subcategory } = require('../../models');

const categoryRepository = {
    async findBySlug(slug) {
        return await Category.findOne({ where: { slug } });
    },

    async create(data, transaction) {
        return await Category.create(data, { transaction });
    },

    async incrementLeadCount(id, amount = 1, transaction) {
        const category = await Category.findByPk(id);
        if (category) {
            return await category.increment('lead_count', { by: amount, transaction });
        }
    },

    async findAllWithStats() {
        const { Subcategory, LeadExport, Lead } = require('../../models');
        const { sequelize } = require('../../models');

        return await Category.findAll({
            attributes: [
                'id', 'name', 'slug', 'lead_count', 'created_at', 'updated_at',
                [sequelize.literal('(SELECT COUNT(*) FROM subcategories WHERE subcategories.category_id = Category.id)'), 'subcategory_count'],
                [sequelize.literal('(SELECT SUM(exported_count) FROM lead_exports WHERE lead_exports.category_id = Category.id)'), 'total_exports'],
                [sequelize.literal('(SELECT MAX(exported_at) FROM lead_exports WHERE lead_exports.category_id = Category.id)'), 'last_exported_at']
            ],
            order: [['name', 'ASC']]
        });
    },

    async findById(id) {
        const { sequelize } = require('../../models');
        return await Category.findByPk(id, {
            attributes: [
                'id', 'name', 'slug', 'lead_count', 'created_at', 'updated_at',
                [sequelize.literal('(SELECT COUNT(*) FROM subcategories WHERE subcategories.category_id = Category.id)'), 'subcategory_count'],
                [sequelize.literal('(SELECT SUM(exported_count) FROM lead_exports WHERE lead_exports.category_id = Category.id)'), 'total_exports'],
                [sequelize.literal('(SELECT MAX(exported_at) FROM lead_exports WHERE lead_exports.category_id = Category.id)'), 'last_exported_at']
            ]
        });
    }
};

module.exports = categoryRepository;
