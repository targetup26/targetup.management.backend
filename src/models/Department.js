const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class Department extends Model {
        static associate(models) {
            Department.hasMany(models.JobRole, { foreignKey: 'department_id' });
            Department.hasMany(models.Employee, { foreignKey: 'department_id' });
            Department.hasMany(models.ChatRoom, { foreignKey: 'department_id', as: 'ChatRooms' });
            Department.hasOne(models.DepartmentStorage, { foreignKey: 'department_id', as: 'DepartmentStorage' });
        }
    }

    Department.init({
        name: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        }
    }, {
        sequelize,
        modelName: 'Department',
        tableName: 'departments',
        paranoid: true // Enable soft deletes
    });
    return Department;
};
