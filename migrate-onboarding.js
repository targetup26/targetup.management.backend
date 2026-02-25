const db = require('./src/models');

async function migrate() {
    try {
        await db.sequelize.authenticate();
        console.log('Connected.');

        // Add the column if it doesnt exist
        await db.sequelize.query(
            "ALTER TABLE Employees ADD COLUMN onboarding_status VARCHAR(255) NOT NULL DEFAULT 'COMPLETED'"
        ).catch(e => {
            if (e.message.includes('Duplicate column')) {
                console.log('Column already exists, skipping ALTER.');
            } else {
                throw e;
            }
        });

        // Set all existing employees to COMPLETED
        const [, meta] = await db.sequelize.query(
            "UPDATE Employees SET onboarding_status = 'COMPLETED' WHERE onboarding_status IS NULL OR onboarding_status = ''"
        );
        console.log('Employees updated:', meta.affectedRows);
        console.log('Migration done!');
    } catch (err) {
        console.error('Migration error:', err.message);
    } finally {
        await db.sequelize.close();
    }
}

migrate();
