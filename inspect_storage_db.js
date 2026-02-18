const { sequelize } = require('./src/models');

async function inspect() {
    try {
        console.log('--- department_storage ---');
        const [results1] = await sequelize.query("DESCRIBE department_storage");
        console.log(JSON.stringify(results1, null, 2));

        console.log('--- storage_servers ---');
        const [results2] = await sequelize.query("DESCRIBE storage_servers");
        console.log(JSON.stringify(results2, null, 2));

        process.exit(0);
    } catch (error) {
        console.error('Inspection failed:', error.message);
        process.exit(1);
    }
}

inspect();
