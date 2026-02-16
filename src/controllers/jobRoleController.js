const { JobRole, Department } = require('../models');

exports.getAll = async (req, res) => {
    try {
        const where = {};
        if (req.query.department_id) {
            where.department_id = req.query.department_id;
        }

        const data = await JobRole.findAll({
            where,
            include: [{ model: Department, attributes: ['id', 'name'] }]
        });
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.create = async (req, res) => {
    try {
        const data = await JobRole.create(req.body);
        res.status(201).json(data);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.update = async (req, res) => {
    try {
        const [updated] = await JobRole.update(req.body, {
            where: { id: req.params.id }
        });
        if (updated) {
            const updatedRole = await JobRole.findByPk(req.params.id);
            res.json(updatedRole);
        } else {
            res.status(404).json({ error: 'JobRole not found' });
        }
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.delete = async (req, res) => {
    try {
        const deleted = await JobRole.destroy({
            where: { id: req.params.id }
        });
        if (deleted) {
            res.status(204).send();
        } else {
            res.status(404).json({ error: 'JobRole not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
