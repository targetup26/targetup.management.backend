const { Role, Permission, RolePermission } = require('../models');

/**
 * Permission Middleware Factory
 * Creates middleware to check if user has specific permission
 */
module.exports = (permissionName) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({ error: 'Authentication required' });
            }

            // Admin bypass
            if (req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN') {
                return next();
            }

            // Get user's role
            const role = await Role.findOne({
                where: { name: req.user.role },
                include: [{
                    model: Permission,
                    as: 'Permissions',
                    through: { attributes: [] },
                    where: { name: permissionName },
                    required: false
                }]
            });

            if (!role || !role.Permissions || role.Permissions.length === 0) {
                return res.status(403).json({
                    error: 'Permission denied',
                    required_permission: permissionName
                });
            }

            next();
        } catch (error) {
            console.error('Permission middleware error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    };
};
