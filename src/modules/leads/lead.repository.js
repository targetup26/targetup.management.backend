const { Lead, Category, Subcategory } = require('../../models');

const leadRepository = {
    async create(data, transaction) {
        return await Lead.create(data, { transaction });
    },

    async update(id, data, transaction) {
        return await Lead.update(data, {
            where: { id },
            transaction
        });
    },

    async findByPk(id, include = []) {
        return await Lead.findByPk(id, { include });
    },

    async findByPhoneOrEmail(phone, email) {
        const { Op } = require('sequelize');
        const where = [];
        if (phone) where.push({ phone });
        if (email) where.push({ email });

        if (where.length === 0) return null;

        return await Lead.findOne({
            where: { [Op.or]: where }
        });
    },

    async findAll(where = {}, include = [], limit = 1000, offset = 0) {
        return await Lead.findAll({
            where,
            include,
            limit,
            offset,
            order: [['created_at', 'DESC']]
        });
    }
};

module.exports = leadRepository;
