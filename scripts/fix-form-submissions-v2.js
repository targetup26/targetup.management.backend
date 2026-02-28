const db = require('../src/models');

async function fixFormSubmissionsSchema() {
    try {
        const queryInterface = db.sequelize.getQueryInterface();
        const tableInfo = await queryInterface.describeTable('form_submissions');

        if (!tableInfo.submitted_by) {
            console.log('Adding submitted_by column to form_submissions...');
            await queryInterface.addColumn('form_submissions', 'submitted_by', {
                type: db.Sequelize.INTEGER,
                allowNull: true,
                references: {
                    model: 'users',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL'
            });
            console.log('Column added successfully.');
        } else {
            console.log('submitted_by column already exists.');
        }

        process.exit(0);
    } catch (error) {
        console.error('Failed to fix form_submissions schema:', error);
        process.exit(1);
    }
}

fixFormSubmissionsSchema();
