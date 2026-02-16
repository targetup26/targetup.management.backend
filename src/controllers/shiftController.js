const { Shift } = require('../models');

exports.getAllShifts = async (req, res) => {
    try {
        const shifts = await Shift.findAll();
        res.json(shifts);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.createShift = async (req, res) => {
    try {
        const shift = await Shift.create(req.body);
        res.status(201).json(shift);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateShift = async (req, res) => {
    try {
        const { id } = req.params;
        const [updated] = await Shift.update(req.body, { where: { id } });
        if (updated) {
            const updatedShift = await Shift.findByPk(id);
            return res.json(updatedShift);
        }
        throw new Error('Shift not found');
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.deleteShift = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await Shift.destroy({ where: { id } });
        if (deleted) {
            return res.json({ message: 'Shift deleted' });
        }
        throw new Error('Shift not found');
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
