const { Subcategory } = require('../../models');

const subcategoryRepository = {
    async findBySlug(categoryId, slug) {
        return await Subcategory.findOne({
            where: { category_id: categoryId, slug }
        });
    },

    async create(data, transaction) {
        return await Subcategory.create(data, { transaction });
    },

    async incrementLeadCount(id, amount = 1, transaction) {
        const subcategory = await Subcategory.findByPk(id);
        if (subcategory) {
            return await subcategory.increment('lead_count', { by: amount, transaction });
        }
    }
};

module.exports = subcategoryRepository;
