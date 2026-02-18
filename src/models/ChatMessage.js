const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class ChatMessage extends Model {
        static associate(models) {
            ChatMessage.belongsTo(models.ChatRoom, { foreignKey: 'room_id', as: 'Room' });
            ChatMessage.belongsTo(models.User, { foreignKey: 'sender_id', as: 'Sender' });
            ChatMessage.hasMany(models.ChatMessageAttachment, { foreignKey: 'message_id', as: 'Attachments' });
        }
    }

    ChatMessage.init({
        room_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        sender_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        message_type: {
            type: DataTypes.ENUM('text', 'file', 'system'),
            defaultValue: 'text'
        },
        content: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        is_edited: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        is_deleted: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        }
    }, {
        sequelize,
        modelName: 'ChatMessage',
        tableName: 'chat_messages',
        underscored: true
    });

    return ChatMessage;
};
