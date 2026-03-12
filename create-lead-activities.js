/**
 * Run this ONCE to create the lead_activities table.
 * Usage: node create-lead-activities.js
 */
require('dotenv').config();
const { sequelize } = require('./src/models');

async function createTable() {
    try {
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS \`lead_activities\` (
                \`id\`               INT AUTO_INCREMENT PRIMARY KEY,
                \`lead_id\`          INT NOT NULL,
                \`user_id\`          INT NOT NULL,
                \`type\`             ENUM('CALL','EMAIL','MEETING','NOTE','STATUS_CHANGE') DEFAULT 'NOTE',
                \`outcome\`          ENUM('ANSWERED','NO_ANSWER','BUSY','INTERESTED','NOT_INTERESTED','FOLLOW_UP','CONVERTED') NULL,
                \`notes\`            TEXT NULL,
                \`next_follow_up\`   DATETIME NULL,
                \`duration_minutes\` INT NULL,
                \`created_at\`       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                \`updated_at\`       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                \`deleted_at\`       DATETIME NULL,
                INDEX \`lead_activities_lead_id\`  (\`lead_id\`),
                INDEX \`lead_activities_user_id\`  (\`user_id\`),
                CONSTRAINT \`fk_la_lead\` FOREIGN KEY (\`lead_id\`) REFERENCES \`leads\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT \`fk_la_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log('✅ lead_activities table created (or already existed).');
    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await sequelize.close();
    }
}

createTable();
