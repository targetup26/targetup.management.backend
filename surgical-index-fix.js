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

async function fix() {
    try {
        console.log('--- Starting Surgical Index Cleanup ---');

        // Fix Departments
        const [depIndexes] = await sequelize.query('SHOW INDEX FROM Departments');
        for (const idx of depIndexes) {
            if (idx.Key_name !== 'PRIMARY' && (idx.Key_name.includes('name') || idx.Key_name.includes('unique'))) {
                console.log(`Dropping index ${idx.Key_name} from Departments...`);
                try {
                    await sequelize.query(`ALTER TABLE Departments DROP INDEX ${idx.Key_name}`);
                } catch (e) { console.log(`Could not drop ${idx.Key_name}: ${e.message}`); }
            }
        }

        // Fix JobRoles
        const [jrIndexes] = await sequelize.query('SHOW INDEX FROM job_roles');
        for (const idx of jrIndexes) {
            if (idx.Key_name !== 'PRIMARY' && (idx.Key_name.includes('name') || idx.Key_name.includes('unique'))) {
                console.log(`Dropping index ${idx.Key_name} from job_roles...`);
                try {
                    await sequelize.query(`ALTER TABLE job_roles DROP INDEX ${idx.Key_name}`);
                } catch (e) { console.log(`Could not drop ${idx.Key_name}: ${e.message}`); }
            }
        }

        console.log('--- Surgical Index Cleanup Finished ---');
        process.exit(0);
    } catch (err) {
        console.error('CRITICAL ERROR during index cleanup:', err.message);
        process.exit(1);
    }
}

fix();
