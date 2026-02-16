const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class AuditLog extends Model {
        static associate(models) {
            AuditLog.belongsTo(models.User, { foreignKey: 'performed_by' });
        }
    }

    AuditLog.init({
        entity_type: {
            type: DataTypes.STRING, // Changed from ENUM to STRING for flexibility (supports 'DEVICE', 'DEPARTMENT', etc.)
            allowNull: false
        },
        entity_id: {
            type: DataTypes.INTEGER,
            allowNull: true // Changed to allow NULL to support existing records
        },
        action: {
            type: DataTypes.STRING, // Changed from ENUM to STRING (supports 'DELETE', 'LOGIN', etc.)
            allowNull: false
        },
        old_value: DataTypes.JSON,
        new_value: DataTypes.JSON,
        ip_address: DataTypes.STRING
    }, {
        sequelize,
        modelName: 'AuditLog',
        updatedAt: false // Immutable log
    });
    return AuditLog;
};
