const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class Employee extends Model {
        static associate(models) {
            Employee.belongsTo(models.Department, { foreignKey: 'department_id' });
            Employee.belongsTo(models.JobRole, { foreignKey: 'job_role_id' });
            Employee.belongsTo(models.Shift, { foreignKey: 'shift_id' });
            Employee.hasMany(models.AttendanceEntry, { foreignKey: 'employee_id' });
            Employee.hasMany(models.Device, { foreignKey: 'employee_id' });
            Employee.hasOne(models.User, { foreignKey: 'employee_id' });
        }
    }

    Employee.init({
        code: {
            type: DataTypes.STRING,
            unique: true,
            allowNull: false
        },
        full_name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        email: DataTypes.STRING,
        phone: DataTypes.STRING,
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        }
        // No Salary Fields as per requirement
    }, {
        sequelize,
        modelName: 'Employee',
        paranoid: true
    });
    return Employee;
};
