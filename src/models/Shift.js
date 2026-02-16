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
            allowNull: false
        },
        end_time: {
            type: DataTypes.TIME,
            allowNull: false
        },
        late_threshold_minutes: {
            type: DataTypes.INTEGER,
            defaultValue: 15
        },
        early_leave_threshold_minutes: {
            type: DataTypes.INTEGER,
            defaultValue: 15
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        }
    }, {
        sequelize,
        modelName: 'Shift',
        paranoid: true
    });
    return Shift;
};
