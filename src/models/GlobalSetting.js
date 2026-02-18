const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class GlobalSetting extends Model {
        static associate(models) {
            GlobalSetting.belongsTo(models.User, { foreignKey: 'updated_by', as: 'Updater' });
        }
    }

    GlobalSetting.init({
        setting_key: {
            type: DataTypes.STRING(100),
            allowNull: false,
            unique: true
        },
        setting_value: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        category: {
            type: DataTypes.ENUM('security', 'attendance', 'system', 'network'),
            allowNull: false,
            defaultValue: 'system'
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        updated_by: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'updated_by'
        }
    }, {
        sequelize,
        modelName: 'GlobalSetting',
        tableName: 'global_settings',
        underscored: false,
        timestamps: true
    });

    return GlobalSetting;
};
