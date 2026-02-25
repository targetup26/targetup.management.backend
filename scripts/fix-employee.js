const db = require('./src/models');

async function fixUser() {
    try {
        await db.sequelize.authenticate();

        // Find the user who is logging into the desktop app (role EMPLOYEE)
        const users = await db.User.findAll({ where: { role: 'EMPLOYEE' } });
        console.log(`Found ${users.length} EMPLOYEE user(s)`);

        for (const user of users) {
            console.log(`\nUser: ${user.username} | id: ${user.id} | employee_id: ${user.employee_id}`);

            let employee;

            if (!user.employee_id) {
                // Try to find an employee by matching full_name
                employee = await db.Employee.findOne({
                    where: { full_name: user.full_name }
                });

                if (!employee) {
                    // Just grab the first available employee
                    employee = await db.Employee.findOne();
                }

                if (employee) {
                    user.employee_id = employee.id;
                    await user.save();
                    console.log(`  -> Linked to employee ${employee.id} (${employee.full_name})`);
                } else {
                    console.log(`  -> No employees in DB to link!`);
                    continue;
                }
            } else {
                employee = await db.Employee.findByPk(user.employee_id);
                if (!employee) {
                    console.log(`  -> Linked employee ${user.employee_id} not found! Fixing...`);
                    const fallback = await db.Employee.findOne();
                    if (fallback) {
                        user.employee_id = fallback.id;
                        await user.save();
                        employee = fallback;
                        console.log(`  -> Relinked to employee ${employee.id}`);
                    }
                }
            }

            if (employee && employee.onboarding_status !== 'COMPLETED') {
                console.log(`  -> Employee onboarding_status is '${employee.onboarding_status}' — fixing...`);
                employee.onboarding_status = 'COMPLETED';
                await employee.save();
                console.log(`  -> onboarding_status set to COMPLETED`);
            } else if (employee) {
                console.log(`  -> Employee onboarding_status: ${employee.onboarding_status} ✓`);
            }
        }

        console.log('\nDone!');
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await db.sequelize.close();
    }
}

fixUser();
