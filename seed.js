require('dotenv').config();
const db = require('./src/models');
const bcrypt = require('bcryptjs');

async function seed() {
    try {
        await db.sequelize.sync({ alter: false });
        console.log('Database synced...');

        // 1. Create/Update Admin User
        const password = await bcrypt.hash('target@2026', 10);
        const [admin, created] = await db.User.findOrCreate({
            where: { username: 'admin' },
            defaults: {
                password: password,
                full_name: 'System Administrator',
                role: 'ADMIN'
            }
        });

        if (!created) {
            // Update password if user already exists
            admin.password = password;
            await admin.save();
            console.log('✅ Admin User updated with new password');
        } else {
            console.log('✅ Admin User created');
        }

        // 2. Create Departments
        const [dept, deptCreated] = await db.Department.findOrCreate({
            where: { name: 'Engineering' },
            defaults: { is_active: true }
        });
        console.log('✅ Department: Engineering');

        await db.Department.findOrCreate({ where: { name: 'HR' } });
        await db.Department.findOrCreate({ where: { name: 'Sales' } });

        // 3. Create Job Roles
        const [role, roleCreated] = await db.JobRole.findOrCreate({
            where: { name: 'Full Stack Developer' },
            defaults: { department_id: dept.id, is_active: true }
        });
        console.log('✅ Job Role: Full Stack Developer');

        // 4. Create Shift
        const [shift, shiftCreated] = await db.Shift.findOrCreate({
            where: { name: 'Morning A' },
            defaults: {
                start_time: '09:00:00',
                end_time: '17:00:00',
                late_threshold_minutes: 15,
                early_leave_threshold_minutes: 15
            }
        });
        console.log('✅ Shift: Morning A');

        // 5. Create Employee
        // Check if exists first (including soft-deleted) to avoid duplicate error on unique keys
        let emp = await db.Employee.findOne({
            where: { code: 'EMP001' },
            paranoid: false
        });

        if (!emp) {
            emp = await db.Employee.create({
                code: 'EMP001',
                full_name: 'Ahmed Developer',
                email: 'ahmed@targetup.com',
                department_id: dept.id,
                job_role_id: role.id,
                shift_id: shift.id
            });
            console.log('✅ Employee: Ahmed Developer (EMP001) created');
        } else {
            // Restore if deleted
            if (emp.deletedAt) {
                await emp.restore();
                console.log('✅ Employee: Ahmed Developer (EMP001) restored');
            }
            // Update role if needed
            emp.job_role_id = role.id;
            await emp.save();
            console.log('✅ Employee: Ahmed Developer (EMP001) updated');
        }

        console.log('\n--- SEEDING COMPLETE ---');
        console.log('Login Credentials:');
        console.log('Username: admin');
        console.log('Password: target@2026');
        process.exit(0);

    } catch (error) {
        console.error('Seeding failed:', error);
        process.exit(1);
    }
}

seed();
