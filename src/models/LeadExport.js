const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class LeadExport extends Model {
        static associate(models) {
            LeadExport.belongsTo(models.User, { foreignKey: 'user_id', as: 'Exporter' });
            LeadExport.belongsTo(models.Category, { foreignKey: 'category_id', as: 'Category' });
            LeadExport.belongsTo(models.Subcategory, { foreignKey: 'subcategory_id', as: 'Subcategory' });
        }
    }

    LeadExport.init({
        format: {
            type: DataTypes.ENUM('CSV', 'EXCEL', 'JSON'),
            allowNull: false
        },
        status: {
            type: DataTypes.ENUM('PENDING', 'COMPLETED', 'FAILED'),
            defaultValue: 'PENDING'
        },
        exported_count: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        file_path: DataTypes.STRING,
        filters: DataTypes.JSON,
        exported_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        }
    }, {
        sequelize,
        modelName: 'LeadExport',
        tableName: 'lead_exports',
        underscored: true
    });
    return LeadExport;
};
