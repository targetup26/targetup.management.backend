const { AuditLog, User } = require('../models');
const { Op } = require('sequelize');

exports.getLogs = async (req, res) => {
    try {
        const { entity_type, action, from, to, limit = 50, offset = 0 } = req.query;

        const where = {};

        if (entity_type) where.entity_type = entity_type;
        if (action) where.action = action;

        if (from && to) {
            where.createdAt = {
                [Op.between]: [new Date(from), new Date(to)]
            };
        }

        const logs = await AuditLog.findAndCountAll({
            where,
            include: [{
                model: User,
                attributes: ['full_name', 'username']
            }],
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['createdAt', 'DESC']]
        });

        res.json({
            logs: logs.rows,
            total: logs.count,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
    } catch (error) {
        console.error('getLogs error:', error);
        res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
};

exports.getLogStats = async (req, res) => {
    try {
        const stats = await AuditLog.findAll({
            attributes: [
                'action',
                [AuditLog.sequelize.fn('COUNT', AuditLog.sequelize.col('id')), 'count']
            ],
            group: ['action'],
            order: [[AuditLog.sequelize.literal('count'), 'DESC']],
            limit: 5
        });
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch log statistics' });
    }
};
