const db = require('./src/models');

async function fixUser() {
    try {
        await db.sequelize.authenticate();
        console.log('DB Connected.');

        const user = await db.User.findByPk(5);
        if (user) {
            console.log('User 5 found:', user.toJSON());

            if (!user.employee_id) {
                // Find an employee to link
                const employee = await db.Employee.findOne();
                if (employee) {
                    console.log('Linking to employee:', employee.id);
                    user.employee_id = employee.id;
                    await user.save();
                    console.log('User updated successfully.');
                } else {
                    console.log('No employee found in DB. Creating one...');
                    const newEmp = await db.Employee.create({
                        full_name: user.full_name || 'Test Employee',
                        email: user.username,
                        status: 'ACTIVE',
                        onboarding_status: 'COMPLETED'
                    });
                    user.employee_id = newEmp.id;
                    await user.save();
                    console.log('Created and linked new employee:', newEmp.id);
                }
            } else {
                console.log('User already has employee_id:', user.employee_id);
                // Ensure the employee is marked as COMPLETED onboarding
                const employee = await db.Employee.findByPk(user.employee_id);
                if (employee && employee.onboarding_status !== 'COMPLETED') {
                    employee.onboarding_status = 'COMPLETED';
                    await employee.save();
                    console.log('Employee onboarding status set to COMPLETED.');
                }
            }
        } else {
            console.log('User 5 not found in DB.');
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await db.sequelize.close();
    }
}

fixUser();
