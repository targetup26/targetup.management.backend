const jwt = require('jsonwebtoken');
const { User, Role, Permission } = require('../models');

/**
 * Authentication Middleware
 * Verifies JWT token and attaches user to request
 */
module.exports = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1] || req.query.token;

        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findByPk(decoded.id, {
            include: [{
                model: Role,
                as: 'Roles',
                include: [{
                    model: Permission,
                    as: 'Permissions',
                    through: { attributes: [] }
                }]
            }]
        });

        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        // Flatten roles and permissions for easy access
        const roles = [];
        const permissions = new Set();
        if (user.Roles) {
            user.Roles.forEach(role => {
                roles.push(role.name);
                if (role.Permissions) {
                    role.Permissions.forEach(p => permissions.add(p.key));
                }
            });
        }

        // Convert Sequelize instance to JSON and attach flattened arrays
        const userJSON = user.toJSON();
        userJSON.roles = roles;
        userJSON.permissions = Array.from(permissions);

        // Attach to request
        req.user = userJSON;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Session expired. Please log in again.' });
        }
        console.error('Auth middleware error:', error);
        res.status(401).json({ error: 'Invalid token' });
    }
};
