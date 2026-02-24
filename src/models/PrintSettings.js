const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class PrintSettings extends Model {
        static associate(models) {
            // No associations needed for singleton settings
        }
    }

    PrintSettings.init({
        company_name: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: 'TARGETUP CORPORATION'
        },
        company_logo_url: {
            type: DataTypes.STRING,
            allowNull: true
        },
        header_subtitle: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: 'HUMAN RESOURCE MANAGEMENT'
        },
        footer_text: {
            type: DataTypes.TEXT,
            allowNull: true
        }
    }, {
        sequelize,
        modelName: 'PrintSettings',
        tableName: 'print_settings',
        underscored: false,
        timestamps: true
    });

    return PrintSettings;
};
