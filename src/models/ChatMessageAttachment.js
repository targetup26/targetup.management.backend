const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class ChatMessageAttachment extends Model {
        static associate(models) {
            ChatMessageAttachment.belongsTo(models.ChatMessage, { foreignKey: 'message_id', as: 'Message' });
            ChatMessageAttachment.belongsTo(models.FileMetadata, { foreignKey: 'file_id', as: 'FileMetadata' });
        }
    }

    ChatMessageAttachment.init({
        message_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        file_id: {
            type: DataTypes.INTEGER, // Match DB type (INT)
            allowNull: false
        }
    }, {
        sequelize,
        modelName: 'ChatMessageAttachment',
        tableName: 'chat_message_attachments',
        underscored: true,
        updatedAt: false,
        createdAt: 'created_at'
    });

    return ChatMessageAttachment;
};
