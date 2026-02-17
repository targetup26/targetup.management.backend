const { Sequelize } = require('sequelize');
require('dotenv').config();
const dbConfig = require('./src/config/database');
const env = process.env.NODE_ENV || 'development';
const config = dbConfig[env];

const sequelize = new Sequelize(config.database, config.username, config.password, {
    host: config.host,
    dialect: 'mysql'
});

async function run() {
    try {
        console.log('\n=== INDEXES FOR Departments ===');
        const [indexes] = await sequelize.query('SHOW INDEX FROM Departments');
        console.log(JSON.stringify(indexes, null, 2));

        console.log('\n=== COLUMNS FOR Departments ===');
        const [cols] = await sequelize.query('SHOW COLUMNS FROM Departments');
        console.log(JSON.stringify(cols, null, 2));

        process.exit(0);
    } catch (e) {
        console.error(e.message);
        process.exit(1);
    }
}
run();
