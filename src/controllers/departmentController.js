const { Department, JobRole } = require('../models');

exports.getAll = async (req, res) => {
    try {
        const data = await Department.findAll({
            include: [{ model: JobRole, attributes: ['id', 'name'] }]
        });
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.create = async (req, res) => {
    try {
        const data = await Department.create(req.body);
        res.status(201).json(data);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.update = async (req, res) => {
    try {
        const [updated] = await Department.update(req.body, {
            where: { id: req.params.id }
        });
        if (updated) {
            const updatedDept = await Department.findByPk(req.params.id);
            res.json(updatedDept);
        } else {
            res.status(404).json({ error: 'Department not found' });
        }
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.delete = async (req, res) => {
    try {
        const deleted = await Department.destroy({
            where: { id: req.params.id }
        });
        if (deleted) {
            res.status(204).send();
        } else {
            res.status(404).json({ error: 'Department not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
