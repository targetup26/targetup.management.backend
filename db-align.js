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

async function align() {
    try {
        console.log('--- Starting Manual Schema Alignment ---');

        // Disable checks
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');

        const tables = ['Departments', 'job_roles', 'Employees', 'categories', 'subcategories'];

        for (const table of tables) {
            console.log(`Aligning table: ${table}...`);
            try {
                // Check if table exists
                const [exists] = await sequelize.query(`SHOW TABLES LIKE '${table}'`);
                if (exists.length > 0) {
                    await sequelize.query(`ALTER TABLE ${table} MODIFY COLUMN is_active TINYINT(1) DEFAULT 1`);
                    console.log(`✓ ${table}.is_active aligned`);
                }
            } catch (e) {
                console.log(`Skipping ${table}: ${e.message}`);
            }
        }

        // Re-enable checks
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');

        console.log('--- Alignment Finished ---');
        process.exit(0);
    } catch (err) {
        console.error('CRITICAL ERROR during alignment:', err.message);
        process.exit(1);
    }
}

align();
