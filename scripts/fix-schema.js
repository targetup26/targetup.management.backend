const { sequelize } = require('../src/models');

async function fixSchema() {
    try {
        console.log('🔧 Fixing schema...');

        // Add column if it doesn't exist
        try {
            await sequelize.query("ALTER TABLE employees ADD COLUMN job_role_id INT NULL;");
            console.log('✅ Added job_role_id column.');
        } catch (err) {
            if (err.parent && err.parent.code === 'ER_DUP_FIELDNAME') {
                console.log('ℹ️  Column job_role_id already exists.');
            } else {
                throw err;
            }
        }

        // Add FK
        // Note: Adding FK might fail if there are existing records with invalid job_role_id (which is NULL for new column so it's fine)
        // or if jobroles table doesn't exist (it does)
        try {
            await sequelize.query("ALTER TABLE employees ADD CONSTRAINT fk_employees_job_role FOREIGN KEY (job_role_id) REFERENCES jobroles(id) ON DELETE SET NULL ON UPDATE CASCADE;");
            console.log('✅ Added FK constraint.');
        } catch (err) {
            if (err.parent && err.parent.code === 'ER_DUP_KEY' || err.message.includes('Duplicate key')) {
                console.log('ℹ️  FK constraint already exists.');
            } else {
                console.error('⚠️  Failed to add FK (might already exist or other issue):', err.message);
            }
        }

    } catch (error) {
        console.error('❌ Schema fix failed:', error);
    } finally {
        process.exit();
    }
}

fixSchema();
