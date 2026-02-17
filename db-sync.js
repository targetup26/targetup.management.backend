const db = require('./src/models');
require('dotenv').config();

async function sync() {
    try {
        console.log('--- Starting Manual Sequelize Sync ---');
        // Force recreation of the dropped tables if they still don't exist
        // or just use alter: true to see the progress
        await db.sequelize.sync({ alter: true });
        console.log('--- Manual Sync Finished Successfully ---');
        process.exit(0);
    } catch (err) {
        console.error('CRITICAL ERROR during sync:', err);
        process.exit(1);
    }
}

sync();
