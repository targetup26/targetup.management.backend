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

            // Admin bypass (check primary role and roles array)
            const isAdmin = req.user.role === 'ADMIN' ||
                req.user.role === 'SUPER_ADMIN' ||
                req.user.roles?.includes('ADMIN') ||
                req.user.roles?.includes('SUPER_ADMIN');

            if (isAdmin) {
                return next();
            }

            // Check flattened permissions from req.user (already loaded by auth middleware)
            const hasPermission = req.user.permissions && req.user.permissions.includes(permissionName);

            if (!hasPermission) {
                return res.status(403).json({
                    error: 'Permission denied',
                    required_permission: permissionName,
                    message: `Checking for permission: ${permissionName}`
                });
            }

            next();
        } catch (error) {
            console.error('Permission middleware error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    };
};
