const { User, ChatRoom, PersonalNote } = require('../models');
const { Op } = require('sequelize');

/**
 * Unified Search across Rooms, Users, and Private Notes
 */
exports.unifiedSearch = async (req, res) => {
    try {
        const userId = req.user.id;
        const { q } = req.query;

        if (!q || q.length < 2) {
            return res.json({ success: true, results: { rooms: [], users: [], notes: [] } });
        }

        // 1. Search Rooms
        // In a real scenario, we would filter by membership, 
        // but for this MVP we'll show rooms that match the name.
        const rooms = await ChatRoom.findAll({
            where: {
                name: { [Op.like]: `%${q}%` },
                is_active: true
            },
            limit: 5
        });

        // 2. Search Users
        const users = await User.findAll({
            where: {
                [Op.or]: [
                    { full_name: { [Op.like]: `%${q}%` } },
                    { username: { [Op.like]: `%${q}%` } }
                ]
            },
            attributes: ['id', 'username', 'full_name', 'role'],
            limit: 5
        });

        // 3. Search Personal Notes (Strict Privacy: Owner only)
        const notes = await PersonalNote.findAll({
            where: {
                user_id: userId,
                content: { [Op.like]: `%${q}%` }
            },
            limit: 5
        });

        res.json({
            success: true,
            results: {
                rooms: rooms.map(r => ({ id: r.id, name: r.name, type: r.room_type })),
                users: users.map(u => ({ id: u.id, name: u.full_name || u.username, type: 'user' })),
                notes: notes.map(n => ({
                    id: n.id,
                    name: n.content.split('\n')[0].replace(/[#*`]/g, '').trim().substring(0, 40) || 'Untitled Note',
                    type: 'note'
                }))
            }
        });
    } catch (error) {
        console.error('Unified Search Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};
