const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class Device extends Model {
        static associate(models) {
            Device.belongsTo(models.Employee, { foreignKey: 'employee_id' });
        }
    }

    Device.init({
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        ip_address: {
            type: DataTypes.STRING,
            allowNull: false
        },
        mac_address: {
            type: DataTypes.STRING,
            allowNull: true
        },
        hostname: {
            type: DataTypes.STRING,
            allowNull: true
        },
        employee_id: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        last_seen_at: {
            type: DataTypes.DATE,
            allowNull: true
        }
    }, {
        sequelize,
        modelName: 'Device',
        paranoid: true
    });

    return Device;
};
