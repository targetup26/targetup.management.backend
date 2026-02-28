const db = require('../src/models');

async function fixRoles() {
    try {
        await db.sequelize.authenticate();
        console.log('--- Fixing User Roles ---');

        const users = await db.User.findAll({
            include: [{
                model: db.Role,
                as: 'Roles'
            }]
        });

        const employeeRole = await db.Role.findOne({ where: { name: 'EMPLOYEE' } });
        const adminRole = await db.Role.findOne({ where: { name: 'SUPER_ADMIN' } });
        const managerRole = await db.Role.findOne({ where: { name: 'MANAGER' } });

        if (!employeeRole || !adminRole) {
            console.error('Core roles (EMPLOYEE or SUPER_ADMIN) missing! Run seed-rbac.js first.');
            process.exit(1);
        }

        for (const user of users) {
            if (user.Roles.length === 0) {
                let roleToAssign = null;

                if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
                    roleToAssign = adminRole;
                } else if (user.role === 'MANAGER') {
                    roleToAssign = managerRole;
                } else if (user.role === 'EMPLOYEE' || user.role === 'HR_VIEWER' || !user.role) {
                    roleToAssign = employeeRole; // Default to EMPLOYEE if legacy role is generic or missing
                }

                if (roleToAssign) {
                    console.log(`Linking user ${user.username} to role ${roleToAssign.name}...`);
                    await user.addRole(roleToAssign);
                    console.log(`  ✓ Done`);
                } else {
                    console.log(`No clear role mapping for user ${user.username} (Legacy role: ${user.role})`);
                }
            } else {
                console.log(`User ${user.username} already has RBAC roles: ${user.Roles.map(r => r.name).join(', ')}`);
            }
        }

        console.log('\n--- Role Fix Complete ---');
    } catch (err) {
        console.error('Fix failed:', err.message);
    } finally {
        await db.sequelize.close();
        process.exit(0);
    }
}

fixRoles();
