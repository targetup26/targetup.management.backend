const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class LeadJob extends Model {
        static associate(models) {
            LeadJob.belongsTo(models.User, { foreignKey: 'user_id' });
            LeadJob.hasMany(models.Lead, { foreignKey: 'lead_job_id' });
        }
    }

    LeadJob.init({
        query: {
            type: DataTypes.JSON, // Stores the search criteria
            allowNull: false
        },
        status: {
            type: DataTypes.STRING, // Was ENUM, changed to STRING to fix data truncation error on startup
            defaultValue: 'PENDING'
        },
        source: {
            type: DataTypes.STRING, // e.g., 'MANUAL', 'SCHEDULED'
            defaultValue: 'MANUAL'
        },
        progress: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        leads_extracted: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        leads_failed: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        error_message: DataTypes.TEXT,
        started_at: DataTypes.DATE,
        completed_at: DataTypes.DATE,
        retry_count: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        }
    }, {
        sequelize,
        modelName: 'LeadJob',
        tableName: 'lead_jobs',
        underscored: true
    });
    return LeadJob;
};
