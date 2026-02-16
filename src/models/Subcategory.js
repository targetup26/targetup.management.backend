const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class Subcategory extends Model {
        static associate(models) {
            Subcategory.belongsTo(models.Category, {
                foreignKey: 'category_id',
                onDelete: 'SET NULL',
                onUpdate: 'CASCADE'
            });
            Subcategory.hasMany(models.Lead, { foreignKey: 'subcategory_id' });
        }
    }

    Subcategory.init({
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        category_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'categories',
                key: 'id'
            }
        },
        slug: {
            type: DataTypes.STRING,
            allowNull: false
        },
        lead_count: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        }
    }, {
        sequelize,
        modelName: 'Subcategory',
        tableName: 'subcategories',
        underscored: true
    });
    return Subcategory;
};
