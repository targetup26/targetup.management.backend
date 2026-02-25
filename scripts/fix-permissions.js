const db = require('./src/models');

async function fixPermissions() {
    try {
        await db.sequelize.authenticate();

        const role = await db.Role.findOne({ where: { name: 'EMPLOYEE' } });
        if (!role) return console.log('EMPLOYEE role not found!');

        console.log('EMPLOYEE role id:', role.id);

        const needed = [
            { key: 'attendance.checkin', category: 'attendance', description: 'Can check in via desktop app' },
            { key: 'attendance.checkout', category: 'attendance', description: 'Can check out via desktop app' },
            { key: 'attendance.status', category: 'attendance', description: 'Can view own attendance status' },
            { key: 'attendance.heartbeat', category: 'attendance', description: 'Can send desktop heartbeat' },
        ];

        for (const p of needed) {
            // Find or create the permission (using 'key' column)
            let perm = await db.Permission.findOne({ where: { key: p.key } });
            if (!perm) {
                perm = await db.Permission.create({ key: p.key, category: p.category, description: p.description });
                console.log('Created permission:', p.key, '| id:', perm.id);
            } else {
                console.log('Found permission:', p.key, '| id:', perm.id);
            }

            // Check if role already has this permission
            const rows = await db.sequelize.query(
                'SELECT * FROM role_permissions WHERE role_id = ? AND permission_id = ?',
                { replacements: [role.id, perm.id], type: db.sequelize.QueryTypes.SELECT }
            );

            if (!rows || rows.length === 0) {
                await db.sequelize.query(
                    'INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)',
                    { replacements: [role.id, perm.id] }
                );
                console.log('  -> Assigned to EMPLOYEE role ✓');
            } else {
                console.log('  -> Already assigned ✓');
            }
        }
        console.log('\nAll attendance permissions fixed!');
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await db.sequelize.close();
    }
}

fixPermissions();
