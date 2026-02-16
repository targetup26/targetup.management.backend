const { Employee, Department, JobRole, Shift } = require('../models');

exports.getAll = async (req, res) => {
    try {
        const where = {};
        if (req.query.department_id) where.department_id = req.query.department_id;
        if (req.query.job_role_id) where.job_role_id = req.query.job_role_id;
        if (req.query.shift_id) where.shift_id = req.query.shift_id;
        if (req.query.is_active) where.is_active = req.query.is_active === 'true';

        const data = await Employee.findAll({
            where,
            include: [
                { model: Department, attributes: ['name'] },
                { model: JobRole, attributes: ['name'] },
                { model: Shift, attributes: ['name', 'start_time', 'end_time'] }
            ]
        });
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getOne = async (req, res) => {
    try {
        const data = await Employee.findByPk(req.params.id, {
            include: [Department, JobRole, Shift]
        });
        if (!data) return res.status(404).json({ error: 'Employee not found' });
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.create = async (req, res) => {
    try {
        const data = await Employee.create(req.body);
        res.status(201).json(data);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.update = async (req, res) => {
    try {
        const [updated] = await Employee.update(req.body, {
            where: { id: req.params.id }
        });
        if (updated) {
            const updatedEmp = await Employee.findByPk(req.params.id);
            res.json(updatedEmp);
        } else {
            res.status(404).json({ error: 'Employee not found' });
        }
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Soft Delete
exports.delete = async (req, res) => {
    try {
        const deleted = await Employee.destroy({
            where: { id: req.params.id }
        });
        if (deleted) {
            res.status(204).send();
        } else {
            res.status(404).json({ error: 'Employee not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
