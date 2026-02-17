const { User } = require('./src/models');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function reset() {
    try {
        console.log('--- Reseting Admin Password ---');
        const newPassword = 'admin'; // Easy temporary password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        const [updated] = await User.update(
            { password: hashedPassword },
            { where: { username: 'admin' } }
        );

        if (updated) {
            console.log('✓ Admin password reset to: admin');
        } else {
            console.log('✗ Admin user not found.');
        }
        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

reset();