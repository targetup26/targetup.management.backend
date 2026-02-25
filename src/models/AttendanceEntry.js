const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class AttendanceEntry extends Model {
        static associate(models) {
            AttendanceEntry.belongsTo(models.Employee, { foreignKey: 'employee_id' });
        }
    }

    AttendanceEntry.init({
        date: {
            type: DataTypes.DATEONLY,
            allowNull: false
        },
        clock_in: DataTypes.DATE,
        clock_out: DataTypes.DATE,
        status: {
            type: DataTypes.ENUM('PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'LEAVE'),
            defaultValue: 'ABSENT'
        },
        source: {
            type: DataTypes.STRING, // Temporarily STRING to allow sync
            defaultValue: 'MANUAL'
        },
        device_ip: DataTypes.STRING,
        device_name: DataTypes.STRING,
        device_clock_in: DataTypes.DATE, // Original Device Timestamp (Immutable check-in time)
        manual_override: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        override_reason: DataTypes.TEXT,

        // Violation tracking (Points/Flags)
        late_minutes: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        violation_points: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },

        // Immutable Logic: Never delete, just hide if invalid
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        }
    }, {
        sequelize,
        modelName: 'AttendanceEntry',
        tableName: 'attendanceentries',
        paranoid: false // STRICTLY NO SOFT DELETE - Use is_active
    });
    return AttendanceEntry;
};
