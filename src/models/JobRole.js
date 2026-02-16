const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class JobRole extends Model {
        static associate(models) {
            JobRole.belongsTo(models.Department, { foreignKey: 'department_id' });
            JobRole.hasMany(models.Employee, { foreignKey: 'job_role_id' });
        }
    }

    JobRole.init({
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        }
    }, {
        sequelize,
        modelName: 'JobRole',
        paranoid: true
    });
    return JobRole;
};
