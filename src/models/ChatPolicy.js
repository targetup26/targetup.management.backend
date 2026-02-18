const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class ChatPolicy extends Model {
        static associate(models) {
            ChatPolicy.belongsTo(models.User, { foreignKey: 'updated_by', as: 'Updater' });
        }
    }

    ChatPolicy.init({
        policy_key: {
            type: DataTypes.STRING(100),
            allowNull: false,
            unique: true
        },
        policy_value: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        updated_by: {
            type: DataTypes.INTEGER,
            allowNull: true
        }
    }, {
        sequelize,
        modelName: 'ChatPolicy',
        tableName: 'chat_policies',
        underscored: true,
        createdAt: false,
        updatedAt: 'updated_at'
    });

    return ChatPolicy;
};
