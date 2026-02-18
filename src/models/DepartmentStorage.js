module.exports = (sequelize, DataTypes) => {
    const DepartmentStorage = sequelize.define('DepartmentStorage', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        department_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'departments',
                key: 'id'
            }
        },
        server_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'storage_servers',
                key: 'id'
            }
        },
        quota_mb: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 10000
        },
        used_mb: {
            type: DataTypes.DECIMAL(10, 2),
            defaultValue: 0
        }
    }, {
        tableName: 'department_storage',
        timestamps: true
    });

    DepartmentStorage.associate = (models) => {
        DepartmentStorage.belongsTo(models.Department, { foreignKey: 'department_id', as: 'Department' });
        DepartmentStorage.belongsTo(models.StorageServer, { foreignKey: 'server_id', as: 'StorageServer' });
    };

    return DepartmentStorage;
};
