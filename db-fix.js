const { Sequelize } = require('sequelize');
require('dotenv').config();
const path = require('path');

// Dynamically load config to ensure we use the correct credentials
const dbConfig = require('./src/config/database');
const env = process.env.NODE_ENV || 'development';
const config = dbConfig[env];

const sequelize = new Sequelize(config.database, config.username, config.password, {
    host: config.host,
    dialect: 'mysql',
    logging: console.log
});

async function fix() {
    try {
        console.log('--- Starting Manual Schema Fix ---');

        // 1. Check if tables exist first to avoid errors on fresh DB
        const [tables] = await sequelize.query("SHOW TABLES LIKE 'subcategories'");
        if (tables.length === 0) {
            console.log('Table subcategories does not exist yet. Skipping manual alter.');
        } else {
            console.log('Altering subcategories table...');
            // Disable FK checks to allow modifications
            await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');

            // Explicitly modify columns to allow NULL before Sequelize adds the constraint
            await sequelize.query('ALTER TABLE subcategories MODIFY COLUMN category_id INT NULL');
            console.log('✓ subcategories.category_id is now NULLable');
        }

        const [leadTables] = await sequelize.query("SHOW TABLES LIKE 'leads'");
        if (leadTables.length > 0) {
            console.log('Altering leads table...');
            await sequelize.query('ALTER TABLE leads MODIFY COLUMN category_id INT NULL');
            await sequelize.query('ALTER TABLE leads MODIFY COLUMN subcategory_id INT NULL');
            console.log('✓ leads columns are now NULLable');
        }

        // 2. Re-enable FK checks
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');

        console.log('--- Schema Fix Completed ---');
        process.exit(0);
    } catch (err) {
        console.error('CRITICAL ERROR during schema fix:', err.message);
        process.exit(1);
    }
}

fix();
