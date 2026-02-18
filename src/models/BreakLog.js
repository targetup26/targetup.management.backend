const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class BreakLog extends Model {
        static associate(models) {
            BreakLog.belongsTo(models.Employee, { foreignKey: 'employee_id' });
        }
    }

    BreakLog.init({
        employee_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        date: {
            type: DataTypes.DATEONLY,
            allowNull: false
        },
        start_time: {
            type: DataTypes.DATE,
            allowNull: false
        },
        end_time: {
            type: DataTypes.DATE,
            allowNull: true
        },
        duration: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        note: {
            type: DataTypes.TEXT,
            allowNull: true
        }
    }, {
        sequelize,
        modelName: 'BreakLog',
        tableName: 'break_logs',
        underscored: false,
        timestamps: true
    });

    return BreakLog;
};
