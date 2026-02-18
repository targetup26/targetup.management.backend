const { Employee } = require('../models');

/**
 * Onboarding Guard Middleware
 * Ensures employee has completed onboarding
 */
module.exports = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        if (!req.user.employee_id) {
            return res.status(403).json({
                error: 'Employee profile not linked',
                onboarding_required: true
            });
        }

        const employee = await Employee.findByPk(req.user.employee_id);

        if (!employee) {
            return res.status(403).json({
                error: 'Employee profile not found',
                onboarding_required: true
            });
        }

        if (employee.onboarding_status !== 'COMPLETED') {
            return res.status(403).json({
                error: 'Onboarding not completed',
                onboarding_required: true,
                onboarding_status: employee.onboarding_status
            });
        }

        req.employee = employee;
        next();
    } catch (error) {
        console.error('Onboarding guard error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
