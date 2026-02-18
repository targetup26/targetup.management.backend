const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class ChatRoom extends Model {
        static associate(models) {
            ChatRoom.belongsTo(models.Department, { foreignKey: 'department_id', as: 'Department' });
            ChatRoom.belongsTo(models.User, { foreignKey: 'owner_id', as: 'Owner' });
            ChatRoom.hasMany(models.ChatRoomMember, { foreignKey: 'room_id', as: 'Members' });
            ChatRoom.hasMany(models.ChatMessage, { foreignKey: 'room_id', as: 'Messages' });
        }
    }

    ChatRoom.init({
        room_type: {
            type: DataTypes.ENUM('department', 'group', 'dm'),
            allowNull: false
        },
        name: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        department_id: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        owner_id: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        is_read_only: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        }
    }, {
        sequelize,
        modelName: 'ChatRoom',
        tableName: 'chat_rooms',
        underscored: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });

    return ChatRoom;
};
