const { Role, Permission, RolePermission, AuditLog } = require('../models');

// Get all roles with their permissions
exports.getAllRoles = async (req, res) => {
    try {
        const roles = await Role.findAll({
            include: [{
                model: Permission,
                as: 'Permissions',
                through: { attributes: [] }
            }],
            order: [['name', 'ASC']]
        });
        res.json(roles);
    } catch (error) {
        console.error('Error fetching roles:', error);
        res.status(500).json({ error: 'Failed to fetch roles' });
    }
};

// Create new role
exports.createRole = async (req, res) => {
    try {
        const { name, description } = req.body;

        // Validate
        if (!name) {
            return res.status(400).json({ error: 'Role name is required' });
        }

        // Create role
        const role = await Role.create({
            name: name.toUpperCase(),
            description
        });

        // Audit log
        await AuditLog.create({
            entity_type: 'ROLE',
            entity_id: role.id,
            action: 'CREATE_ROLE',
            old_value: null,
            new_value: JSON.stringify(role),
            ip_address: req.ip || req.connection.remoteAddress,
            user_agent: req.get('user-agent'),
            changes_json: JSON.stringify({ name, description }),
            performed_by: req.user.id
        });

        res.status(201).json(role);
    } catch (error) {
        console.error('Error creating role:', error);
        res.status(500).json({ error: 'Failed to create role' });
    }
};

// Update role
exports.updateRole = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;

        const role = await Role.findByPk(id);
        if (!role) {
            return res.status(404).json({ error: 'Role not found' });
        }

        const oldValue = role.toJSON();

        // Update
        if (name) role.name = name.toUpperCase();
        if (description !== undefined) role.description = description;
        await role.save();

        // Audit log
        await AuditLog.create({
            entity_type: 'ROLE',
            entity_id: role.id,
            action: 'UPDATE_ROLE',
            old_value: JSON.stringify(oldValue),
            new_value: JSON.stringify(role),
            ip_address: req.ip || req.connection.remoteAddress,
            user_agent: req.get('user-agent'),
            changes_json: JSON.stringify({ name, description }),
            performed_by: req.user.id
        });

        res.json(role);
    } catch (error) {
        console.error('Error updating role:', error);
        res.status(500).json({ error: 'Failed to update role' });
    }
};

// Delete role
exports.deleteRole = async (req, res) => {
    try {
        const { id } = req.params;

        const role = await Role.findByPk(id);
        if (!role) {
            return res.status(404).json({ error: 'Role not found' });
        }

        // CRITICAL: Prevent deletion of last ADMIN role
        if (role.name === 'ADMIN') {
            const adminCount = await Role.count({ where: { name: 'ADMIN' } });
            if (adminCount <= 1) {
                return res.status(403).json({
                    error: 'Cannot delete the last ADMIN role'
                });
            }
        }

        const oldValue = role.toJSON();
        await role.destroy();

        // Audit log
        await AuditLog.create({
            entity_type: 'ROLE',
            entity_id: id,
            action: 'DELETE_ROLE',
            old_value: JSON.stringify(oldValue),
            new_value: null,
            ip_address: req.ip || req.connection.remoteAddress,
            user_agent: req.get('user-agent'),
            changes_json: JSON.stringify({ deleted_role: role.name }),
            performed_by: req.user.id
        });

        res.json({ message: 'Role deleted successfully' });
    } catch (error) {
        console.error('Error deleting role:', error);
        res.status(500).json({ error: 'Failed to delete role' });
    }
};

// Sync role permissions (replace all)
exports.syncRolePermissions = async (req, res) => {
    try {
        const { id } = req.params;
        const { permission_ids } = req.body;

        const role = await Role.findByPk(id, {
            include: [{
                model: Permission,
                as: 'Permissions',
                through: { attributes: [] }
            }]
        });

        if (!role) {
            return res.status(404).json({ error: 'Role not found' });
        }

        // CRITICAL: Prevent removing admin.access from own role
        if (req.user.roles.includes(role.name)) {
            const newPermissions = await Permission.findAll({
                where: { id: permission_ids }
            });
            const hasAdminAccess = newPermissions.some(p => p.key === 'admin.access');

            if (!hasAdminAccess && role.Permissions.some(p => p.key === 'admin.access')) {
                return res.status(403).json({
                    error: 'Cannot remove admin.access from your own role'
                });
            }
        }

        const oldPermissions = role.Permissions.map(p => p.key);

        // Sync permissions
        await role.setPermissions(permission_ids);

        // Reload to get new permissions
        await role.reload({
            include: [{
                model: Permission,
                as: 'Permissions',
                through: { attributes: [] }
            }]
        });

        const newPermissions = role.Permissions.map(p => p.key);

        // Audit log
        await AuditLog.create({
            entity_type: 'ROLE',
            entity_id: role.id,
            action: 'UPDATE_ROLE_PERMISSIONS',
            old_value: JSON.stringify(oldPermissions),
            new_value: JSON.stringify(newPermissions),
            ip_address: req.ip || req.connection.remoteAddress,
            user_agent: req.get('user-agent'),
            changes_json: JSON.stringify({
                role: role.name,
                added: newPermissions.filter(p => !oldPermissions.includes(p)),
                removed: oldPermissions.filter(p => !newPermissions.includes(p))
            }),
            performed_by: req.user.id
        });

        res.json(role);
    } catch (error) {
        console.error('Error syncing permissions:', error);
        res.status(500).json({ error: 'Failed to sync permissions' });
    }
};
