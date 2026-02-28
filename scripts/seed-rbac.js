require('dotenv').config();
const { Role, Permission, User, sequelize } = require('../src/models');

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
    { key: 'sales.access', category: 'SALES', description: 'Access Sales Portal' },
    { key: 'sales.extract', category: 'SALES', description: 'Run Lead Extractions' },
    { key: 'sales.view_all', category: 'SALES', description: 'View All Leads' },
    { key: 'sales.export', category: 'SALES', description: 'Export Lead Data' },
    { key: 'sales.manage_config', category: 'SALES', description: 'Manage Sales Config', is_sensitive: true }
];

const roles = [
    {
        name: 'SUPER_ADMIN',
        description: 'Global system access with all permissions enabled.',
        permissionKeys: permissions.map(p => p.key)
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

async function seedRBAC() {
    try {
        await sequelize.sync();
        console.log('--- Seeding Permissions ---');
        const createdPerms = {};
        for (const p of permissions) {
            const [perm] = await Permission.findOrCreate({
                where: { key: p.key },
                defaults: p
            });
            createdPerms[p.key] = perm;
            console.log(`✅ Permission: ${p.key}`);
        }

        console.log('\n--- Seeding Roles ---');
        for (const r of roles) {
            const [role] = await Role.findOrCreate({
                where: { name: r.name },
                defaults: { description: r.description }
            });

            // Sync permissions for this role
            const rolePerms = r.permissionKeys.map(key => createdPerms[key]).filter(Boolean);
            await role.setPermissions(rolePerms);
            console.log(`✅ Role: ${r.name} (${rolePerms.length} permissions)`);
        }

        console.log('\n--- Assigning SUPER_ADMIN to admin user ---');
        const adminUser = await User.findOne({ where: { username: 'admin' } });
        if (adminUser) {
            const superAdminRole = await Role.findOne({ where: { name: 'SUPER_ADMIN' } });
            await adminUser.addRole(superAdminRole);
            console.log('✅ Admin user linked to SUPER_ADMIN role');
        } else {
            console.log('⚠️ Admin user not found. Run seed.js first.');
        }

        console.log('\n--- RBAC SEEDING COMPLETE ---');
        process.exit(0);
    } catch (error) {
        console.error('RBAC Seeding failed:', error);
        process.exit(1);
    }
}

seedRBAC();
