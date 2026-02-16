const { Permission, AuditLog } = require('../models');

// Get all permissions
exports.getAllPermissions = async (req, res) => {
    try {
        const permissions = await Permission.findAll({
            order: [['category', 'ASC'], ['key', 'ASC']]
        });
        res.json(permissions);
    } catch (error) {
        console.error('Error fetching permissions:', error);
        res.status(500).json({ error: 'Failed to fetch permissions' });
    }
};

// Create new permission
exports.createPermission = async (req, res) => {
    try {
        const { key, description, category, is_sensitive } = req.body;

        // Validate
        if (!key) {
            return res.status(400).json({ error: 'Permission key is required' });
        }

        if (!category) {
            return res.status(400).json({ error: 'Category is required' });
        }

        // Validate format
        if (!/^[a-z]+\.[a-z\-\.]+$/i.test(key)) {
            return res.status(400).json({
                error: 'Invalid permission key format. Use: resource.action'
            });
        }

        // Create permission
        const permission = await Permission.create({
            key,
            description,
            category,
            is_sensitive: is_sensitive || false
        });

        // Audit log
        await AuditLog.create({
            entity_type: 'PERMISSION',
            entity_id: permission.id,
            action: 'CREATE_PERMISSION',
            old_value: null,
            new_value: JSON.stringify(permission),
            ip_address: req.ip || req.connection.remoteAddress,
            user_agent: req.get('user-agent'),
            changes_json: JSON.stringify({ key, category }),
            performed_by: req.user.id
        });

        res.status(201).json(permission);
    } catch (error) {
        console.error('Error creating permission:', error);
        res.status(500).json({ error: 'Failed to create permission' });
    }
};

// Update permission
exports.updatePermission = async (req, res) => {
    try {
        const { id } = req.params;
        const { description, category, is_sensitive } = req.body;

        const permission = await Permission.findByPk(id);
        if (!permission) {
            return res.status(404).json({ error: 'Permission not found' });
        }

        const oldValue = permission.toJSON();

        // Update (key cannot be changed)
        if (description !== undefined) permission.description = description;
        if (category) permission.category = category;
        if (is_sensitive !== undefined) permission.is_sensitive = is_sensitive;

        await permission.save();

        // Audit log
        await AuditLog.create({
            entity_type: 'PERMISSION',
            entity_id: permission.id,
            action: 'UPDATE_PERMISSION',
            old_value: JSON.stringify(oldValue),
            new_value: JSON.stringify(permission),
            ip_address: req.ip || req.connection.remoteAddress,
            user_agent: req.get('user-agent'),
            changes_json: JSON.stringify({ description, category, is_sensitive }),
            performed_by: req.user.id
        });

        res.json(permission);
    } catch (error) {
        console.error('Error updating permission:', error);
        res.status(500).json({ error: 'Failed to update permission' });
    }
};

// Delete permission
exports.deletePermission = async (req, res) => {
    try {
        const { id } = req.params;

        const permission = await Permission.findByPk(id);
        if (!permission) {
            return res.status(404).json({ error: 'Permission not found' });
        }

        const oldValue = permission.toJSON();
        await permission.destroy();

        // Audit log
        await AuditLog.create({
            entity_type: 'PERMISSION',
            entity_id: id,
            action: 'DELETE_PERMISSION',
            old_value: JSON.stringify(oldValue),
            new_value: null,
            ip_address: req.ip || req.connection.remoteAddress,
            user_agent: req.get('user-agent'),
            changes_json: JSON.stringify({ deleted_permission: permission.key }),
            performed_by: req.user.id
        });

        res.json({ message: 'Permission deleted successfully' });
    } catch (error) {
        console.error('Error deleting permission:', error);
        res.status(500).json({ error: 'Failed to delete permission' });
    }
};
