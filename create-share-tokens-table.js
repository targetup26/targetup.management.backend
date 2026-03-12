const { sequelize } = require('./src/models');

async function createShareTokensTable() {
    try {
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS share_tokens (
                id INT AUTO_INCREMENT PRIMARY KEY,
                token VARCHAR(64) NOT NULL UNIQUE,
                file_id INT NOT NULL,
                created_by INT NULL,
                expires_at DATETIME NULL,
                max_downloads INT NULL,
                download_count INT NOT NULL DEFAULT 0,
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                label VARCHAR(255) NULL,
                createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (file_id) REFERENCES file_metadata(id) ON DELETE CASCADE,
                FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log('✅ share_tokens table created successfully.');
    } catch (err) {
        console.error('❌ Error creating table:', err.message);
    } finally {
        process.exit(0);
    }
}

createShareTokensTable();
