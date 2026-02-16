const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class Lead extends Model {
        static associate(models) {
            Lead.belongsTo(models.User, { foreignKey: 'user_id' });
            Lead.belongsTo(models.LeadJob, { foreignKey: 'lead_job_id' });
            Lead.belongsTo(models.Category, {
                foreignKey: 'category_id',
                onDelete: 'SET NULL',
                onUpdate: 'CASCADE'
            });
            Lead.belongsTo(models.Subcategory, {
                foreignKey: 'subcategory_id',
                onDelete: 'SET NULL',
                onUpdate: 'CASCADE'
            });
        }
    }

    Lead.init({
        business_name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        phone: DataTypes.STRING,
        email: DataTypes.STRING,
        website: DataTypes.STRING,
        address: DataTypes.TEXT,
        city: DataTypes.STRING,
        rating: DataTypes.FLOAT,
        review_count: DataTypes.INTEGER,
        google_maps_url: DataTypes.TEXT,
        google_types: DataTypes.JSON, // Array of types

        // Status tracking
        status: {
            type: DataTypes.ENUM('NEW', 'CONTACTED', 'INTERESTED', 'CONVERTED', 'REJECTED'),
            defaultValue: 'NEW'
        },

        // Enrichment
        is_enriched: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        formatted_address: DataTypes.STRING,
        latitude: DataTypes.FLOAT,
        longitude: DataTypes.FLOAT,

        // Classification
        classification_confidence: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        search_keyword: DataTypes.STRING // The keyword used to find this lead
    }, {
        sequelize,
        modelName: 'Lead',
        tableName: 'leads',
        underscored: true
    });
    return Lead;
};
