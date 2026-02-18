const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class User extends Model {
        static associate(models) {
            User.belongsTo(models.Employee, {
                foreignKey: 'employee_id',
                as: 'Employee'
            });
            User.belongsToMany(models.Role, {
                through: 'UserRole',
                as: 'Roles',
                foreignKey: 'user_id'
            });
            User.hasOne(models.UserPresence, { foreignKey: 'user_id', as: 'Presence' });
            User.hasOne(models.UserProfile, { foreignKey: 'user_id', as: 'Profile' });
            User.hasMany(models.ChatRoom, { foreignKey: 'owner_id', as: 'OwnedRooms' });
            User.hasMany(models.ChatRoomMember, { foreignKey: 'user_id', as: 'Memberships' });
            User.hasMany(models.ChatMessage, { foreignKey: 'sender_id', as: 'Messages' });
        }
    }

    User.init({
        username: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        },
        password: {
            type: DataTypes.STRING,
            allowNull: false
        },
        role: {
            type: DataTypes.STRING, // Temporarily STRING to allow sync
            defaultValue: 'HR_VIEWER'
        },
        full_name: DataTypes.STRING
    }, {
        sequelize,
        modelName: 'User',
    });
    return User;
};
