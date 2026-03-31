const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class ActivitySession extends Model {
        static associate(models) {
            ActivitySession.belongsTo(models.Employee, {
                foreignKey: 'employee_id',
                as: 'Employee'
            });
        }
    }

    ActivitySession.init({
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        employee_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        attendance_entry_id: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        check_in_ip: {
            type: DataTypes.STRING(100),
            allowNull: true
        },
        check_out_ip: {
            type: DataTypes.STRING(100),
            allowNull: true
        },
        check_in_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        },
        check_out_at: {
            type: DataTypes.DATE,
            allowNull: true
        },
        total_active_seconds: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        total_idle_seconds: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        last_active_app: {
            type: DataTypes.STRING(255),
            defaultValue: 'Unknown'
        },
        last_window_title: {
            type: DataTypes.STRING(500),
            defaultValue: 'N/A'
        },
        status: {
            type: DataTypes.ENUM('working', 'idle', 'offline'),
            defaultValue: 'offline'
        },
        last_seen_at: {
            type: DataTypes.DATE,
            allowNull: true
        }
    }, {
        sequelize,
        modelName: 'ActivitySession',
        tableName: 'activity_sessions',
        underscored: false
    });

    return ActivitySession;
};
