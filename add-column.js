// One-time script to add last_seen_at column to Devices table
const { sequelize } = require('./src/models');

async function addColumn() {
    try {
        await sequelize.query(`
            ALTER TABLE Devices 
            ADD COLUMN last_seen_at DATETIME NULL AFTER is_active;
        `);
        console.log('✅ Column last_seen_at added successfully!');
        process.exit(0);
    } catch (error) {
        if (error.message.includes('Duplicate column')) {
            console.log('✅ Column already exists!');
            process.exit(0);
        } else {
            console.error('❌ Error:', error.message);
            process.exit(1);
        }
    }
}

addColumn();
