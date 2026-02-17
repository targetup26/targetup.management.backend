const { Permission, Role, RolePermission } = require('../src/models');

const salesPermissions = [
    { key: 'sales.access', description: 'Access the Sales Portal gateway', category: 'sales' },
    { key: 'sales.extract', description: 'Launch new lead extraction jobs', category: 'sales' },
    { key: 'sales.view_all', description: 'View all leads across the organization', category: 'sales' },
    { key: 'sales.export', description: 'Export leads data to CSV/XLSX', category: 'sales' },
    { key: 'sales.manage_config', description: 'Manage global sales and Apify configurations', category: 'sales' }
];

async function seedSalesPermissions() {
    console.log('🚀 Seeding Sales Permissions...');

    try {
        for (const p of salesPermissions) {
            await Permission.findOrCreate({
                where: { key: p.key },
                defaults: p
            });
        }

        console.log('✅ Sales Permissions seeded successfully.');

        // Auto-assign all sales permissions to SUPER_ADMIN role if it exists
        const adminRole = await Role.findOne({ where: { name: 'SUPER_ADMIN' } });
        if (adminRole) {
            const allSalesPerms = await Permission.findAll({ where: { category: 'sales' } });
            for (const perm of allSalesPerms) {
                await RolePermission.findOrCreate({
                    where: { role_id: adminRole.id, permission_id: perm.id }
                });
            }
            console.log('🛡️ Sales Permissions linked to SUPER_ADMIN.');
        }

    } catch (error) {
        console.error('❌ Seeding failed:', error);
    } finally {
        process.exit();
    }
}

seedSalesPermissions();
