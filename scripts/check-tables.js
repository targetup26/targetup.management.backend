const { sequelize } = require('../src/models');

async function checkTables() {
    try {
        const [results] = await sequelize.query("SHOW TABLES");
        console.log('--- DATABASE TABLES ---');
        console.log(results);
        console.log('-----------------------');
    } catch (error) {
        console.error('❌ Failed to fetch tables:', error);
    } finally {
        process.exit();
    }
}

checkTables();
