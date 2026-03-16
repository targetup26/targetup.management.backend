/**
 * Production Database Migration
 * Adds columns that exist in Sequelize models but not in the production DB.
 * Safe to run multiple times (uses IF NOT EXISTS).
 *
 * Run on the SERVER:
 *   node migrate-production.js
 */
require('dotenv').config();
const { sequelize } = require('./src/models');

const migrations = [
    // ── file_metadata new columns ──────────────────────────────────────
    { sql: `ALTER TABLE file_metadata ADD COLUMN is_folder TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Folders flag'`, label: 'file_metadata.is_folder' },
    { sql: `ALTER TABLE file_metadata ADD COLUMN folder_id INT NULL COMMENT 'Parent folder ID'`, label: 'file_metadata.folder_id' },
    { sql: `ALTER TABLE file_metadata ADD COLUMN tags JSON NULL COMMENT 'Tags'`, label: 'file_metadata.tags' },
    { sql: `ALTER TABLE file_metadata ADD COLUMN onboarding_token VARCHAR(255) NULL COMMENT 'Onboarding token'`, label: 'file_metadata.onboarding_token' },

    // ── lead_activities table ──────────────────────────────────────────
    { sql: `CREATE TABLE IF NOT EXISTS lead_activities (
        id               INT AUTO_INCREMENT PRIMARY KEY,
        lead_id          INT NOT NULL,
        user_id          INT NOT NULL,
        type             ENUM('CALL','EMAIL','MEETING','NOTE','STATUS_CHANGE') DEFAULT 'NOTE',
        outcome          ENUM('ANSWERED','NO_ANSWER','BUSY','INTERESTED','NOT_INTERESTED','FOLLOW_UP','CONVERTED') NULL,
        notes            TEXT NULL,
        next_follow_up   DATETIME NULL,
        duration_minutes INT NULL,
        created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at       DATETIME NULL,
        INDEX idx_la_lead (lead_id),
        INDEX idx_la_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`, label: 'CREATE lead_activities' },

    // ── form_submissions: submitted_at ─────────────────────────────────
    { sql: `ALTER TABLE form_submissions ADD COLUMN submitted_at DATETIME NULL COMMENT 'When form was submitted'`, label: 'form_submissions.submitted_at' },

    // ── share_tokens table ─────────────────────────────────────────────
    { sql: `CREATE TABLE IF NOT EXISTS share_tokens (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        token           VARCHAR(64) NOT NULL UNIQUE,
        file_id         INT NOT NULL,
        created_by      INT NULL,
        expires_at      DATETIME NULL,
        max_downloads   INT NULL,
        download_count  INT NOT NULL DEFAULT 0,
        is_active       TINYINT(1) NOT NULL DEFAULT 1,
        label           VARCHAR(255) NULL,
        created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_st_token (token),
        INDEX idx_st_file (file_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`, label: 'CREATE share_tokens' },
];

async function migrate() {
    for (const { sql, label } of migrations) {
        try {
            await sequelize.query(sql);
            console.log(`✅  ${label}`);
        } catch (err) {
            // Duplicate column = already exists → skip
            if (err.message.includes('Duplicate column') || err.message.includes('already exists')) {
                console.log(`⏭️  ${label} — already exists, skipped`);
            } else {
                console.error(`❌  ${label}: ${err.message}`);
            }
        }
    }

    console.log('\n✅ Migration complete.');
    await sequelize.close();
}

migrate();
