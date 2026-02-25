const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class Shift extends Model {
        static associate(models) {
            Shift.hasMany(models.Employee, { foreignKey: 'shift_id' });
        }
    }

    Shift.init({
        name: DataTypes.STRING, // e.g., "Morning A", "Night B"
        start_time: {
            type: DataTypes.TIME,
            allowNull: false,
            field: 'start_time'
        },
        end_time: {
            type: DataTypes.TIME,
            allowNull: false,
            field: 'end_time'
        },
        late_threshold_minutes: {
            type: DataTypes.INTEGER,
            defaultValue: 15,
            field: 'late_threshold_minutes'
        },
        early_leave_threshold_minutes: {
            type: DataTypes.INTEGER,
            defaultValue: 15,
            field: 'early_leave_threshold_minutes'
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            field: 'is_active'
        }
    }, {
        sequelize,
        modelName: 'Shift',
        paranoid: true
    });
    return Shift;
};
