/**
 * Database Migration Script
 * Adds new columns to lead_jobs table for Lead Engine support
 * 
 * Run this script once to update the database schema
 */

const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
    process.env.DB_NAME || 'team_attendance',
    process.env.DB_USER || 'root',
    process.env.DB_PASSWORD || 'root',
    {
        host: process.env.DB_HOST || '127.0.0.1',
        dialect: 'mysql',
        logging: console.log
    }
);

async function migrate() {
    try {
        console.log('🔄 Starting database migration for Lead Engine...\n');

        // Check if columns already exist
        const [columns] = await sequelize.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = '${process.env.DB_NAME || 'team_attendance'}' 
            AND TABLE_NAME = 'lead_jobs'
        `);

        const existingColumns = columns.map(c => c.COLUMN_NAME);

        // Add error_message column
        if (!existingColumns.includes('error_message')) {
            await sequelize.query(`
                ALTER TABLE lead_jobs 
                ADD COLUMN error_message TEXT NULL 
                COMMENT 'Error message if job failed'
            `);
            console.log('✅ Added error_message column');
        } else {
            console.log('⏭️  error_message column already exists');
        }

        // Add retry_count column
        if (!existingColumns.includes('retry_count')) {
            await sequelize.query(`
                ALTER TABLE lead_jobs 
                ADD COLUMN retry_count INT DEFAULT 0 
                COMMENT 'Number of retry attempts'
            `);
            console.log('✅ Added retry_count column');
        } else {
            console.log('⏭️  retry_count column already exists');
        }

        // Add started_at column
        if (!existingColumns.includes('started_at')) {
            await sequelize.query(`
                ALTER TABLE lead_jobs 
                ADD COLUMN started_at DATETIME NULL 
                COMMENT 'Timestamp when job started processing'
            `);
            console.log('✅ Added started_at column');
        } else {
            console.log('⏭️  started_at column already exists');
        }

        // Add completed_at column
        if (!existingColumns.includes('completed_at')) {
            await sequelize.query(`
                ALTER TABLE lead_jobs 
                ADD COLUMN completed_at DATETIME NULL 
                COMMENT 'Timestamp when job completed or failed'
            `);
            console.log('✅ Added completed_at column');
        } else {
            console.log('⏭️  completed_at column already exists');
        }

        console.log('\n✅ Migration completed successfully!');
        console.log('\n📊 Updated lead_jobs table schema:');

        const [updatedColumns] = await sequelize.query(`
            DESCRIBE lead_jobs
        `);

        console.table(updatedColumns);

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    } finally {
        await sequelize.close();
    }
}

// Run migration
migrate();
