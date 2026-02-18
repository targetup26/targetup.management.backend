module.exports = (sequelize, DataTypes) => {
    const Role = sequelize.define('Role', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true
        }
    }, {
        tableName: 'roles',
        timestamps: true,
        underscored: true
    });

    Role.associate = (models) => {
        Role.belongsToMany(models.Permission, {
            through: 'RolePermission',
            as: 'Permissions',
            foreignKey: 'role_id'
        });
        Role.belongsToMany(models.User, {
            through: 'UserRole',
            as: 'Users',
            foreignKey: 'role_id'
        });
    };

    return Role;
};
