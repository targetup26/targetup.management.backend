const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class UserPresence extends Model {
        static associate(models) {
            UserPresence.belongsTo(models.User, { foreignKey: 'user_id', as: 'User' });
        }
    }

    UserPresence.init({
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            unique: true,
            field: 'user_id'
        },
        status: {
            type: DataTypes.ENUM('available', 'busy', 'meeting', 'offline'),
            defaultValue: 'offline'
        },
        custom_text: {
            type: DataTypes.STRING(100),
            allowNull: true,
            field: 'custom_text'
        },
        expires_at: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'expires_at'
        }
    }, {
        sequelize,
        modelName: 'UserPresence',
        tableName: 'user_presences',
        underscored: false,
        timestamps: true
    });

    return UserPresence;
};
