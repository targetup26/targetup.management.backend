const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class ChatRoomMember extends Model {
        static associate(models) {
            ChatRoomMember.belongsTo(models.ChatRoom, { foreignKey: 'room_id', as: 'Room' });
            ChatRoomMember.belongsTo(models.User, { foreignKey: 'user_id', as: 'User' });
        }
    }

    ChatRoomMember.init({
        room_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        role: {
            type: DataTypes.ENUM('owner', 'moderator', 'member'),
            defaultValue: 'member'
        },
        joined_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        },
        last_read_at: {
            type: DataTypes.DATE,
            allowNull: true
        }
    }, {
        sequelize,
        modelName: 'ChatRoomMember',
        tableName: 'chat_room_members',
        underscored: true,
        timestamps: false // Table uses joined_at instead of default timestamps
    });

    return ChatRoomMember;
};
