const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class Employee extends Model {
        static associate(models) {
            Employee.belongsTo(models.Department, { foreignKey: 'department_id' });
            Employee.belongsTo(models.JobRole, { foreignKey: 'job_role_id' });
            Employee.belongsTo(models.Shift, { foreignKey: 'shift_id' });
            Employee.hasMany(models.AttendanceEntry, { foreignKey: 'employee_id' });
            Employee.hasMany(models.BreakLog, { foreignKey: 'employee_id' });
            Employee.hasMany(models.Device, { foreignKey: 'employee_id' });
            Employee.hasOne(models.User, { foreignKey: 'employee_id' });
            // Missing associations for dossier display
            Employee.hasMany(models.FormSubmission, { foreignKey: 'employee_id', as: 'Submissions' });
            Employee.hasMany(models.FileMetadata, { foreignKey: 'employee_id', as: 'VaultFiles' });
            Employee.hasMany(models.AuditLog, {
                foreignKey: 'entity_id',
                sourceKey: 'id',
                scope: { entity_type: 'EMPLOYEE' },
                as: 'ActionHistory',
                constraints: false
            });
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
            allowNull: false,
            field: 'full_name'
        },
        email: DataTypes.STRING,
        phone: DataTypes.STRING,
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            field: 'is_active'
        },
        onboarding_status: {
            type: DataTypes.STRING,
            defaultValue: 'COMPLETED',
            field: 'onboarding_status'
        }
        // No Salary Fields as per requirement
    }, {
        sequelize,
        modelName: 'Employee',
        paranoid: true,
        underscored: false
    });
    return Employee;
};
