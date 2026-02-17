const { Sequelize } = require('sequelize');
require('dotenv').config();
const dbConfig = require('./src/config/database');
const env = process.env.NODE_ENV || 'development';
const config = dbConfig[env];

const sequelize = new Sequelize(config.database, config.username, config.password, {
    host: config.host,
    dialect: 'mysql',
    logging: console.log
});

async function clean() {
    try {
        console.log('--- Starting Targeted Database Cleanup ---');

        // 1. Disable constraints
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');

        const tablesToDrop = [
            'leads',
            'lead_jobs',
            'subcategories',
            'categories',
            'lead_exports',
            'lead_requests'
        ];

        for (const table of tablesToDrop) {
            console.log(`Dropping table: ${table}...`);
            await sequelize.query(`DROP TABLE IF EXISTS ${table}`);
        }

        // 2. Re-enable constraints
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');

        console.log('--- Cleanup Finished Successfully ---');
        process.exit(0);
    } catch (err) {
        console.error('CRITICAL ERROR during cleanup:', err.message);
        process.exit(1);
    }
}

clean();
