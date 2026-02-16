const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class Category extends Model {
        static associate(models) {
            Category.hasMany(models.Subcategory, {
                foreignKey: 'category_id',
                onDelete: 'SET NULL',
                onUpdate: 'CASCADE'
            });
            Category.hasMany(models.Lead, { foreignKey: 'category_id' });
            Category.hasMany(models.LeadExport, { foreignKey: 'category_id' });
        }
    }

    Category.init({
        name: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        },
        slug: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        },
        lead_count: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        display_order: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        }
    }, {
        sequelize,
        modelName: 'Category',
        tableName: 'categories',
        underscored: true
    });
    return Category;
};
