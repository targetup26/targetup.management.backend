const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class UserProfile extends Model {
        static associate(models) {
            UserProfile.belongsTo(models.User, { foreignKey: 'user_id', as: 'User' });
        }
    }

    UserProfile.init({
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            unique: true,
            field: 'user_id'
        },
        bio: {
            type: DataTypes.STRING(200),
            allowNull: true
        },
        avatar_url: {
            type: DataTypes.STRING(255),
            allowNull: true,
            field: 'avatar_url'
        },
        skills: {
            type: DataTypes.JSON,
            allowNull: true
        },
        interests: {
            type: DataTypes.JSON,
            allowNull: true
        },
        privacy_status: {
            type: DataTypes.ENUM('everyone', 'department', 'none'),
            defaultValue: 'everyone',
            field: 'privacy_status'
        },
        privacy_bio: {
            type: DataTypes.ENUM('everyone', 'department', 'none'),
            defaultValue: 'everyone',
            field: 'privacy_bio'
        }
    }, {
        sequelize,
        modelName: 'UserProfile',
        tableName: 'user_profiles',
        underscored: false,
        timestamps: true
    });

    return UserProfile;
};
