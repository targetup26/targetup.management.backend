const bcrypt = require('bcryptjs');
const db = require('../models');

const permissions = [
    // System & Admin
    { key: 'admin.access', category: 'SYSTEM', description: 'Access Admin Dashboard' },
    { key: 'admin.settings.manage', category: 'SYSTEM', description: 'Manage Global Settings' },
    { key: 'admin.roles.manage', category: 'SYSTEM', description: 'Manage Roles' },
    { key: 'admin.permissions.manage', category: 'SYSTEM', description: 'Manage Permissions' },
    { key: 'audit.view', category: 'SYSTEM', description: 'View Audit Logs' },

    // User Management
    { key: 'users.view', category: 'USERS', description: 'View User Directory' },
    { key: 'users.create', category: 'USERS', description: 'Create New Users' },
    { key: 'users.edit', category: 'USERS', description: 'Edit User Details' },
    { key: 'users.delete', category: 'USERS', description: 'Delete Users' },

    // Storage
    { key: 'storage.view.self', category: 'STORAGE', description: 'View Own Files' },
    { key: 'storage.upload.self', category: 'STORAGE', description: 'Upload Own Files' },
    { key: 'storage.delete', category: 'STORAGE', description: 'Delete Files' },
    { key: 'storage.manage', category: 'STORAGE', description: 'Manage Storage Health & Settings', is_sensitive: true },

    // Chat
    { key: 'chat.view', category: 'CHAT', description: 'Access Chat' },
    { key: 'chat.write', category: 'CHAT', description: 'Send Messages' },
    { key: 'chat.department.write', category: 'CHAT', description: 'Send Messages in Department Channels' },
    { key: 'chat.announcement.write', category: 'CHAT', description: 'Post Announcements' },
    { key: 'chat.group.create', category: 'CHAT', description: 'Create Group Rooms' },
    { key: 'chat.file.upload', category: 'CHAT', description: 'Upload Files in Chat' },
    { key: 'chat.admin.policy', category: 'CHAT', description: 'Manage Chat Policies & Rooms', is_sensitive: true },
    { key: 'chat.admin.override', category: 'CHAT', description: 'Bypass Chat Restrictions', is_sensitive: true },
    { key: 'chat.admin.moderate', category: 'CHAT', description: 'Moderate Messages (Edit/Delete)', is_sensitive: true },

    // Forms
    { key: 'forms.view.all', category: 'FORMS', description: 'View All Submissions' },
    { key: 'forms.approve', category: 'FORMS', description: 'Approve/Reject Submissions' },
    { key: 'forms.template.manage', category: 'FORMS', description: 'Manage Form Templates', is_sensitive: true },

    // Sales (Lead Engine)
    { key: 'sales.access', category: 'SALES', description: 'Access Sales Portal gateway' },
    { key: 'sales.extract', category: 'SALES', description: 'Launch new lead extraction jobs' },
    { key: 'sales.view_all', category: 'SALES', description: 'View all leads across the organization' },
    { key: 'sales.export', category: 'SALES', description: 'Export leads data to CSV/XLSX' },
    { key: 'sales.manage_config', category: 'SALES', description: 'Manage global sales and Apify configurations', is_sensitive: true }
];

const roles = [
    {
        name: 'SUPER_ADMIN',
        description: 'Global system access with all permissions enabled.'
    },
    {
        name: 'MANAGER',
        description: 'Departmental management and operational oversight.',
        permissionKeys: [
            'admin.access', 'users.view', 'storage.view.self', 'storage.upload.self',
            'chat.view', 'chat.write', 'chat.department.write', 'chat.announcement.write', 'chat.file.upload',
            'forms.view.all', 'forms.approve', 'sales.access', 'sales.view_all'
        ]
    },
    {
        name: 'EMPLOYEE',
        description: 'Standard staff access for attendance and communication.',
        permissionKeys: [
            'users.view', 'storage.view.self', 'storage.upload.self',
            'chat.view', 'chat.write', 'chat.department.write', 'chat.file.upload',
            'sales.access'
        ]
    }
];

async function runAutoSeed() {
    try {
        console.log('[AutoSeed] Checking defaults in database...');

        // 1. Seed Permissions
        const createdPerms = {};
        for (const p of permissions) {
            const [perm] = await db.Permission.findOrCreate({ where: { key: p.key }, defaults: p });
            createdPerms[p.key] = perm;
        }

        // 2. Seed Roles and assign permissions
        for (const r of roles) {
            const [role] = await db.Role.findOrCreate({
                where: { name: r.name },
                defaults: { description: r.description }
            });

            if (r.name === 'SUPER_ADMIN') {
                const allPerms = Object.values(createdPerms);
                await role.setPermissions(allPerms);
            } else if (r.permissionKeys) {
                const rolePerms = r.permissionKeys.map(key => createdPerms[key]).filter(Boolean);
                await role.setPermissions(rolePerms);
            }
        }

        // 3. Admin User
        const adminPass = await bcrypt.hash('target@2026', 10);
        const [admin, created] = await db.User.findOrCreate({
            where: { username: 'admin' },
            defaults: {
                password: adminPass,
                full_name: 'System Administrator',
                role: 'ADMIN',
                is_active: true
            }
        });

        // Ensure Admin User has SUPER_ADMIN role
        const superAdminRole = await db.Role.findOne({ where: { name: 'SUPER_ADMIN' } });
        if (superAdminRole) {
            const userRoles = await admin.getRoles();
            if (!userRoles.find(r => r.name === 'SUPER_ADMIN')) {
                await admin.addRole(superAdminRole);
            }
        }

        console.log('[AutoSeed] Defaults verified and seeded successfully.');
    } catch (err) {
        console.error('[AutoSeed] Error during automatic database seeding:', err);
    }
}

module.exports = runAutoSeed;
