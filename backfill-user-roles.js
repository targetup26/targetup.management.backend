/**
 * Backfill user_roles Table
 * 
 * Finds all users that have a `role` string set in the `users` table
 * but no corresponding entry in the `user_roles` join table.
 * Creates the missing entries.
 *
 * Safe to run multiple times.
 * Run: node backfill-user-roles.js
 */
require('dotenv').config();
const { User, Role, UserRole } = require('./src/models');

async function backfill() {
    const users = await User.findAll({ attributes: ['id', 'username', 'role'] });
    const roles = await Role.findAll();
    const roleMap = {};
    roles.forEach(r => { roleMap[r.name] = r.id; });

    console.log(`Found ${users.length} users, ${roles.length} roles in DB`);
    console.log('Available roles:', Object.keys(roleMap).join(', '));

    let fixed = 0;
    let skipped = 0;
    let noRole = 0;

    for (const user of users) {
        // Check if user already has an entry in user_roles
        const existing = await UserRole.findOne({ where: { user_id: user.id } });

        if (existing) {
            skipped++;
            continue;
        }

        // Find the matching role
        const roleId = roleMap[user.role];
        if (!roleId) {
            console.warn(`⚠️  User ${user.username} (id=${user.id}) has role='${user.role}' but no matching role in roles table!`);
            noRole++;
            continue;
        }

        await UserRole.create({ user_id: user.id, role_id: roleId });
        console.log(`✅  ${user.username} → assigned role '${user.role}' (role_id=${roleId})`);
        fixed++;
    }

    console.log(`\n── Summary ──`);
    console.log(`  Fixed:   ${fixed}`);
    console.log(`  Skipped: ${skipped} (already had user_roles)`);
    console.log(`  No role: ${noRole} (role name not in roles table)`);
    console.log(`  Total:   ${users.length}`);

    process.exit(0);
}

backfill().catch(err => {
    console.error('Backfill failed:', err);
    process.exit(1);
});
