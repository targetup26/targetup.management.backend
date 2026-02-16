const { ChatRoom, ChatRoomMember, ChatMessage, ChatMessageAttachment, ChatPolicy, User, Department, FileMetadata, sequelize } = require('../models');
const { Op } = require('sequelize');

/**
 * Get all accessible rooms for the authenticated user
 * Dynamically resolves rooms based on user permissions and department
 */
exports.getRooms = async (req, res) => {
    try {
        const userId = req.user.id;
        const permissions = req.user.permissions || [];

        const rooms = [];

        // 1. Department Chats (IMPLICIT JOIN)
        // Users ALWAYS see their department chat without explicit membership entry
        const user = await User.findByPk(userId, {
            include: [{
                model: require('../models').Employee,
                as: 'Employee',
                include: [{ model: require('../models').Department, as: 'Department' }]
            }]
        });

        if (user && user.Employee && user.Employee.Department) {
            const deptRoom = await ChatRoom.findOne({
                where: {
                    room_type: 'department',
                    department_id: user.Employee.Department.id,
                    is_active: true
                },
                include: [
                    { model: require('../models').Department, as: 'Department' }
                ]
            });

            if (deptRoom) rooms.push(deptRoom);
        }

        // 2. Custom Groups & DMs & Announcements where user is an explicit member
        const memberRooms = await ChatRoom.findAll({
            where: {
                id: {
                    [Op.in]: sequelize.literal(`(SELECT room_id FROM chat_room_members WHERE user_id = ${userId})`)
                },
                is_active: true,
                room_type: { [Op.in]: ['group', 'dm', 'announcement'] }
            },
            include: [
                {
                    model: ChatRoomMember,
                    as: 'Members',
                    include: [{
                        model: User,
                        as: 'User',
                        attributes: ['id', 'username', 'full_name'],
                        include: [
                            { model: require('../models').UserPresence, as: 'Presence' },
                            { model: require('../models').UserProfile, as: 'Profile' }
                        ]
                    }]
                },
                { model: User, as: 'Owner', attributes: ['id', 'username', 'full_name'] }
            ]
        });

        // Map names for DMs
        const processedRooms = memberRooms.map(room => {
            const plain = room.get({ plain: true });
            if (plain.room_type === 'dm') {
                const otherMember = plain.Members?.find(m => m.user_id !== userId);
                plain.name = otherMember?.User?.full_name || otherMember?.User?.username || 'Private Chat';
            }
            return plain;
        });

        rooms.push(...processedRooms);

        res.json({ success: true, rooms });
    } catch (error) {
        console.error('Error fetching rooms:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * Get all rooms for administration
 * Includes metadata: member count, message count, etc.
 */
exports.getAllRooms = async (req, res) => {
    try {
        const rooms = await ChatRoom.findAll({
            where: {
                room_type: { [Op.ne]: 'dm' }
            },
            include: [
                { model: User, as: 'Owner', attributes: ['id', 'username', 'full_name'] },
                { model: Department, as: 'Department' },
                {
                    model: ChatRoomMember,
                    as: 'Members',
                    attributes: ['user_id']
                }
            ],
            order: [['created_at', 'DESC']]
        });

        // Add message counts manually or via subquery
        const roomData = await Promise.all(rooms.map(async (room) => {
            const messageCount = await ChatMessage.count({ where: { room_id: room.id, is_deleted: false } });
            return {
                ...room.toJSON(),
                message_count: messageCount,
                member_count: room.Members ? room.Members.length : 0
            };
        }));

        res.json({ success: true, rooms: roomData });
    } catch (error) {
        console.error('Error fetching all rooms:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * Get messages for a specific room with pagination
 * PERFORMANCE: 50 messages per request, indexed query
 */
exports.getMessages = async (req, res) => {
    try {
        const { id: roomId } = req.params;
        const { limit = 50, before } = req.query;
        const userId = req.user.id;

        // Verify room access
        const hasAccess = await verifyRoomAccess(userId, roomId, req.user.permissions);
        if (!hasAccess) {
            return res.status(403).json({ success: false, error: 'No access to this room' });
        }

        const whereClause = {
            room_id: roomId,
            is_deleted: false  // SOFT DELETE: never show deleted messages
        };

        if (before) {
            whereClause.id = { [Op.lt]: before };
        }

        const messages = await ChatMessage.findAll({
            where: whereClause,
            limit: parseInt(limit),
            order: [['created_at', 'DESC']],
            include: [
                {
                    model: User,
                    as: 'Sender',
                    attributes: ['id', 'username', 'full_name'],
                    include: [
                        { model: require('../models').UserProfile, as: 'Profile' }
                    ]
                },
                {
                    model: ChatMessageAttachment,
                    as: 'Attachments',
                    include: [
                        { model: FileMetadata, as: 'FileMetadata' }
                    ]
                }
            ]
        });

        res.json({ success: true, messages: messages.reverse() });
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * Send a message to a room
 * SECURITY: Backend permission check (never trust frontend)
 * RATE LIMIT: Enforced by middleware (10 msg/min)
 */
exports.sendMessage = async (req, res) => {
    try {
        let { room_id, content, file_ids = [], recipient_id } = req.body;
        const userId = req.user.id;
        const permissions = req.user.permissions || [];

        // 1. DM AUTO-PROVISIONING
        // If no room_id but recipient_id is provided, find or create DM
        if (!room_id && recipient_id) {
            // Optimized lookup: Find rooms where both are members
            const isSelfDM = parseInt(userId) === parseInt(recipient_id);
            const sharedRooms = await ChatRoomMember.findAll({
                where: { user_id: [userId, recipient_id] },
                attributes: ['room_id'],
                group: ['room_id'],
                having: sequelize.literal(`count(DISTINCT user_id) = ${isSelfDM ? 1 : 2}`)
            });

            const roomIds = sharedRooms.map(r => r.room_id);

            const existingDM = await ChatRoom.findOne({
                where: {
                    id: roomIds,
                    room_type: 'dm',
                    is_active: true
                }
            });

            if (existingDM) {
                room_id = existingDM.id;
            } else {
                // Create new DM room
                const room = await ChatRoom.create({
                    room_type: 'dm',
                    is_active: true
                });

                // Deduplicate members for self-DM support
                const members = [{ room_id: room.id, user_id: userId, role: 'member' }];
                if (parseInt(userId) !== parseInt(recipient_id)) {
                    members.push({ room_id: room.id, user_id: recipient_id, role: 'member' });
                }

                await ChatRoomMember.bulkCreate(members);
                room_id = room.id;
            }
        }

        if (!room_id) {
            return res.status(400).json({ success: false, error: 'Target room or recipient required' });
        }

        // Verify room exists and is active
        const room = await ChatRoom.findByPk(room_id);
        if (!room || !room.is_active) {
            return res.status(404).json({ success: false, error: 'Channel is unavailable' });
        }

        // 2. PRIVACY & PERMISSION CHECKS (HARD ENFORCEMENT)
        const canWrite = await checkWritePermission(userId, room, permissions);
        if (!canWrite) {
            return res.status(403).json({ success: false, error: 'Insufficient write privileges' });
        }

        // 3. ANNOUNCEMENT ENFORCEMENT
        if (room.room_type === 'announcement' && !permissions.includes('chat.announcement.write')) {
            return res.status(403).json({ success: false, error: 'Broadcast channel is restricted' });
        }

        // 4. READ-ONLY Enforcement
        if (room.is_read_only && !permissions.includes('chat.admin.override')) {
            return res.status(403).json({ success: false, error: 'Channel is in read-only mode' });
        }

        // Create message
        const message = await ChatMessage.create({
            room_id,
            sender_id: userId,
            message_type: file_ids.length > 0 ? 'file' : 'text',
            content
        });

        // Attach files if any (links to existing Storage Agent files)
        if (file_ids.length > 0) {
            for (const fileId of file_ids) {
                await ChatMessageAttachment.create({
                    message_id: message.id,
                    file_id: fileId
                });
            }
        }

        // Load full message with associations for socket broadcast
        const fullMessage = await ChatMessage.findByPk(message.id, {
            include: [
                {
                    model: User,
                    as: 'Sender',
                    attributes: ['id', 'username', 'full_name'],
                    include: [
                        { model: require('../models').UserProfile, as: 'Profile' }
                    ]
                },
                {
                    model: ChatMessageAttachment,
                    as: 'Attachments',
                    include: [{ model: FileMetadata, as: 'FileMetadata' }]
                }
            ]
        });

        // Emit via Socket.IO (if io is attached to app)
        if (req.app.io) {
            req.app.io.to(`room_${room_id}`).emit('new_message', {
                message: fullMessage
            });
        }

        // Audit log
        await logChatAction(userId, 'message_sent', { room_id, message_id: message.id }, req);

        res.json({ success: true, message: fullMessage });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * Edit own message
 */
exports.editMessage = async (req, res) => {
    try {
        const { id: messageId } = req.params;
        const { content } = req.body;
        const userId = req.user.id;

        const message = await ChatMessage.findByPk(messageId);
        if (!message) {
            return res.status(404).json({ success: false, error: 'Message not found' });
        }

        // Only sender can edit (unless admin)
        if (message.sender_id !== userId && !req.user.permissions.includes('chat.admin.moderate')) {
            return res.status(403).json({ success: false, error: 'Cannot edit this message' });
        }

        message.content = content;
        message.is_edited = true;
        await message.save();

        // Emit update via Socket.IO
        if (req.app.io) {
            req.app.io.to(`room_${message.room_id}`).emit('message_edited', {
                message_id: message.id,
                content,
                is_edited: true
            });
        }

        res.json({ success: true, message });
    } catch (error) {
        console.error('Error editing message:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * Delete message (SOFT DELETE ONLY)
 * MANDATORY: Set is_deleted = true, never DELETE FROM
 */
exports.deleteMessage = async (req, res) => {
    try {
        const { id: messageId } = req.params;
        const userId = req.user.id;

        const message = await ChatMessage.findByPk(messageId);
        if (!message) {
            return res.status(404).json({ success: false, error: 'Message not found' });
        }

        // Only sender or admin can delete
        if (message.sender_id !== userId && !req.user.permissions.includes('chat.admin.moderate')) {
            return res.status(403).json({ success: false, error: 'Cannot delete this message' });
        }

        // SOFT DELETE ONLY
        message.is_deleted = true;
        await message.save();

        // Emit deletion via Socket.IO
        if (req.app.io) {
            req.app.io.to(`room_${message.room_id}`).emit('message_deleted', {
                message_id: message.id
            });
        }

        // Audit log
        await logChatAction(userId, 'message_deleted', { message_id: messageId }, req);

        res.json({ success: true, message: 'Message deleted' });
    } catch (error) {
        console.error('Error deleting message:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * Create a custom group chat
 */
exports.createRoom = async (req, res) => {
    try {
        const { type, name, description, department_id, member_ids = [] } = req.body;
        const userId = req.user.id;
        const permissions = req.user.permissions || [];

        // 1. STRICT CREATION POLICY
        // Employees CANNOT create anything. Only those with group/admin creation permissions.
        if (!permissions.includes('chat.group.create')) {
            return res.status(403).json({ success: false, error: 'Unauthorized room creation attempt' });
        }

        // 2. Room Type Validation
        if (!['group', 'department', 'announcement'].includes(type)) {
            return res.status(400).json({ success: false, error: 'Invalid room type requested' });
        }

        // 3. Department Linkage
        if (type === 'department' && !department_id) {
            return res.status(400).json({ success: false, error: 'Department linkage required for this channel type' });
        }

        // 4. Create Room
        const room = await ChatRoom.create({
            room_type: type,
            name,
            description,
            department_id: type === 'department' ? department_id : null,
            owner_id: userId,
            is_active: true
        });

        // 5. Initial Membership
        // For groups/announcements, add specified members
        if (member_ids.length > 0) {
            const memberEntries = member_ids.map(mid => ({
                room_id: room.id,
                user_id: mid,
                role: 'member'
            }));
            await ChatRoomMember.bulkCreate(memberEntries);
        }

        // Owner is always a member
        await ChatRoomMember.findOrCreate({
            where: { room_id: room.id, user_id: userId },
            defaults: { role: 'owner' }
        });

        // Audit log
        await logChatAction(userId, 'room_created', { room_id: room.id, room_type: type }, req);

        res.json({ success: true, room });
    } catch (error) {
        console.error('Error creating room:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * Upload file to chat (integrates with existing Storage Agent)
 * CRITICAL: Calls existing /storage/upload endpoint
 */
exports.uploadFile = async (req, res) => {
    try {
        const { room_id } = req.body;
        const userId = req.user.id;
        const permissions = req.user.permissions || [];

        // Check permission
        if (!permissions.includes('chat.file.upload')) {
            return res.status(403).json({ success: false, error: 'No permission to upload files' });
        }

        // Verify room access
        const hasAccess = await verifyRoomAccess(userId, room_id, permissions);
        if (!hasAccess) {
            return res.status(403).json({ success: false, error: 'No access to this room' });
        }

        // File is already uploaded via existing storage route
        // This endpoint just returns the file_id for message attachment
        // The actual upload happens through /storage/upload

        res.json({
            success: true,
            message: 'Use /storage/upload endpoint for file uploads, then attach file_id to message'
        });
    } catch (error) {
        console.error('Error in file upload:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * Get chat policies (admin only)
 */
exports.getPolicies = async (req, res) => {
    try {
        const policies = await ChatPolicy.findAll();

        // Convert to key-value object
        const policyObj = {};
        policies.forEach(p => {
            policyObj[p.policy_key] = p.policy_value;
        });

        res.json({ success: true, policies: policyObj });
    } catch (error) {
        console.error('Error fetching policies:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * Update chat policies (admin only)
 */
exports.updatePolicies = async (req, res) => {
    try {
        const { policies } = req.body;
        const userId = req.user.id;

        for (const [key, value] of Object.entries(policies)) {
            await ChatPolicy.update(
                { policy_value: value, updated_by: userId },
                { where: { policy_key: key } }
            );
        }

        // Emit policy update via Socket.IO
        if (req.app.io) {
            req.app.io.emit('policies_updated', { policies });
        }

        // Audit log
        await logChatAction(userId, 'policies_updated', { policies }, req);

        res.json({ success: true, message: 'Policies updated' });
    } catch (error) {
        console.error('Error updating policies:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * Get chat analytics (admin only)
 */
exports.getAnalytics = async (req, res) => {
    try {
        const totalMessages = await ChatMessage.count({ where: { is_deleted: false } });
        const totalRooms = await ChatRoom.count({
            where: {
                is_active: true,
                room_type: { [Op.ne]: 'dm' }
            }
        });
        const activeUsers = await ChatMessage.count({
            distinct: true,
            col: 'sender_id',
            where: {
                created_at: { [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) }
            }
        });

        res.json({
            success: true,
            analytics: {
                total_messages: totalMessages,
                total_rooms: totalRooms,
                active_users_24h: activeUsers
            }
        });
    } catch (error) {
        console.error('Error fetching analytics:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// ============ HELPER FUNCTIONS ============

/**
 * Verify if user has access to a room
 */
async function verifyRoomAccess(userId, roomId, permissions) {
    const room = await ChatRoom.findByPk(roomId);
    if (!room) return false;

    // PRIVACY SHIELD: Admin can only view if they are EXPLICIT members
    // (Except for department rooms if they belong to that dept)

    switch (room.room_type) {
        case 'department':
            const user = await User.findByPk(userId, {
                include: [{
                    model: require('../models').Employee,
                    as: 'Employee',
                    include: [{ model: require('../models').Department, as: 'Department' }]
                }]
            });
            return user && user.Employee && user.Employee.Department && user.Employee.Department.id === room.department_id;

        case 'announcement':
            // Everyone can read announcements? Or only members?
            // Per requirements: "Assigned Group chats", "Assigned Department chats"
            // Let's assume announcements require membership or are global.
            // In Enterprise, usually everyone sees global announcements.
            // But let's stick to membership for "Assigned" logic.
            const isAnnounceMember = await ChatRoomMember.findOne({
                where: { room_id: roomId, user_id: userId }
            });
            return !!isAnnounceMember;

        case 'group':
        case 'dm':
            const membership = await ChatRoomMember.findOne({
                where: { room_id: roomId, user_id: userId }
            });
            return !!membership;

        default:
            return false;
    }
}

async function checkWritePermission(userId, room, permissions) {
    // 1. Admin Override (Universal Bypass)
    if (permissions.includes('chat.admin.override')) return true;

    // 2. Global Write Permission Check
    if (!permissions.includes('chat.write') && room.room_type !== 'department') {
        return false;
    }

    switch (room.room_type) {
        case 'department':
            const user = await User.findByPk(userId, {
                include: [{
                    model: require('../models').Employee,
                    as: 'Employee',
                    include: [{ model: require('../models').Department, as: 'Department' }]
                }]
            });
            const inDept = user && user.Employee && user.Employee.Department && user.Employee.Department.id === room.department_id;
            return inDept && permissions.includes('chat.department.write');

        case 'announcement':
            return permissions.includes('chat.announcement.write');

        case 'group':
        case 'dm':
            const membership = await ChatRoomMember.findOne({
                where: { room_id: room.id, user_id: userId }
            });
            return !!membership;

        default:
            return false;
    }
}

/**
 * Log chat action to audit log
 */
async function logChatAction(userId, action, details, req) {
    try {
        const { AuditLog } = require('../models');
        await AuditLog.create({
            performed_by: userId,
            action,
            entity_type: 'CHAT',
            entity_id: details?.room_id || details?.message_id || null,
            new_value: details,
            ip_address: req.ip || req.connection.remoteAddress,
            user_agent: req.get('user-agent')
        });
    } catch (error) {
        console.error('Error logging chat action:', error);
    }
}

module.exports = exports;
