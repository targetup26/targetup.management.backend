module.exports = (sequelize, DataTypes) => {
    const Permission = sequelize.define('Permission', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        key: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        category: {
            type: DataTypes.STRING,
            allowNull: false
        },
        is_sensitive: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        }
    }, {
        tableName: 'permissions',
        timestamps: true,
        underscored: true
    });

    Permission.associate = (models) => {
        Permission.belongsToMany(models.Role, {
            through: 'RolePermission',
            as: 'Roles',
            foreignKey: 'permission_id'
        });
    };

    return Permission;
};
