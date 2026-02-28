const { BreakLog, AttendanceEntry, Employee, Shift } = require('../models');
const { Op } = require('sequelize');

exports.startBreak = async (req, res) => {
    try {
        const employee_id = req.employee?.id || req.user?.employee_id;

        if (!employee_id) {
            return res.status(403).json({ error: 'Your user account is not linked to an employee record.' });
        }

        const today = new Date().toISOString().split('T')[0];

        // 1. Check if employee is checked in today
        const attendance = await AttendanceEntry.findOne({
            where: { employee_id, date: today, is_active: true }
        });

        if (!attendance) {
            return res.status(400).json({ error: 'You must check in before taking a break.' });
        }

        // 2. Check if already on break
        const activeBreak = await BreakLog.findOne({
            where: {
                employee_id,
                date: today,
                end_time: null
            }
        });

        if (activeBreak) {
            return res.status(400).json({ error: 'You are already on a break.' });
        }

        // 3. Start break
        const newBreak = await BreakLog.create({
            employee_id,
            date: today,
            start_time: new Date()
        });

        // Update attendance status
        await attendance.update({ status: 'ON_BREAK' });

        res.status(201).json({
            message: 'Break started',
            break: newBreak
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.endBreak = async (req, res) => {
    try {
        const employee_id = req.employee?.id || req.user?.employee_id;

        if (!employee_id) {
            return res.status(403).json({ error: 'Your user account is not linked to an employee record.' });
        }

        const today = new Date().toISOString().split('T')[0];

        // 1. Find the active break
        const activeBreak = await BreakLog.findOne({
            where: {
                employee_id,
                date: today,
                end_time: null
            }
        });

        if (!activeBreak) {
            return res.status(400).json({ error: 'No active break found.' });
        }

        const endTime = new Date();
        const startTime = new Date(activeBreak.start_time);
        const durationMinutes = Math.round((endTime - startTime) / (1000 * 60));

        // 2. End break
        await activeBreak.update({
            end_time: endTime,
            duration: durationMinutes
        });

        // 3. Update attendance status back to PRESENT
        await AttendanceEntry.update(
            { status: 'PRESENT' },
            { where: { employee_id, date: today, is_active: true } }
        );

        res.json({
            message: 'Break ended',
            break: activeBreak,
            duration: durationMinutes
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getActiveBreaks = async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const breaks = await BreakLog.findAll({
            where: { date: today, end_time: null },
            include: [{
                model: Employee,
                attributes: ['full_name', 'code'],
                include: [{ model: Shift, as: 'Shift' }]
            }]
        });
        res.json(breaks);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getBreaksHistory = async (req, res) => {
    try {
        const { start_date, end_date, employee_id } = req.query;

        const where = {};

        // Date Filtering
        if (start_date && end_date) {
            where.date = { [Op.between]: [start_date, end_date] };
        } else if (start_date) {
            where.date = start_date;
        } else {
            // Default to today
            where.date = new Date().toISOString().split('T')[0];
        }

        // Employee Filtering
        if (employee_id && employee_id !== 'all') {
            where.employee_id = employee_id;
        }

        const breaks = await BreakLog.findAll({
            where,
            include: [{
                model: Employee,
                attributes: ['full_name', 'code'],
                include: [{ model: Shift, as: 'Shift' }]
            }],
            order: [['date', 'DESC'], ['start_time', 'DESC']]
        });
        res.json(breaks);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
