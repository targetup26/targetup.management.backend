const { PersonalNote } = require('../models');

/**
 * Get all personal notes for the current user
 */
exports.getNotes = async (req, res) => {
    try {
        const userId = req.user.id;
        const notes = await PersonalNote.findAll({
            where: { user_id: userId },
            order: [['is_pinned', 'DESC'], ['updatedAt', 'DESC']]
        });
        res.json({ success: true, notes });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * Create a new personal note
 */
exports.createNote = async (req, res) => {
    try {
        const userId = req.user.id;
        const { content } = req.body;

        if (!content) {
            return res.status(400).json({ success: false, error: 'Note content is required' });
        }

        const note = await PersonalNote.create({
            user_id: userId,
            content
        });

        res.status(201).json({ success: true, note });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * Update an existing note
 */
exports.updateNote = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const { content, is_pinned } = req.body;

        const note = await PersonalNote.findOne({ where: { id, user_id: userId } });
        if (!note) return res.status(404).json({ success: false, error: 'Note not found' });

        if (content !== undefined) note.content = content;
        if (is_pinned !== undefined) note.is_pinned = is_pinned;

        await note.save();
        res.json({ success: true, note });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * Delete a note (Soft delete via paranoid: true)
 */
exports.deleteNote = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const note = await PersonalNote.findOne({ where: { id, user_id: userId } });
        if (!note) return res.status(404).json({ success: false, error: 'Note not found' });

        await note.destroy();
        res.json({ success: true, message: 'Note deleted' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
