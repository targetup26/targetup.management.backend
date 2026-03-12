const { Lead, LeadActivity, User, Category, Subcategory } = require('../models');

// GET /api/leads/:leadId — full lead details
exports.getLeadDetail = async (req, res) => {
    try {
        const { leadId } = req.params;
        const lead = await Lead.findByPk(leadId, {
            include: [
                { model: Category,    as: 'Category',    attributes: ['id', 'name'] },
                { model: Subcategory, as: 'Subcategory', attributes: ['id', 'name'] }
            ]
        });
        if (!lead) return res.status(404).json({ error: 'Lead not found' });
        res.json({ success: true, data: lead });
    } catch (err) {
        console.error('getLeadDetail error:', err);
        res.status(500).json({ error: err.message });
    }
};

// GET /api/leads/:leadId/activities — all activities for a lead
exports.getActivities = async (req, res) => {
    try {
        const { leadId } = req.params;
        const activities = await LeadActivity.findAll({
            where: { lead_id: leadId },
            include: [
                { model: User, as: 'User', attributes: ['id', 'full_name', 'username'] }
            ],
            order: [['created_at', 'DESC']]
        });
        res.json({ success: true, data: activities });
    } catch (err) {
        console.error('getActivities error:', err);
        res.status(500).json({ error: err.message });
    }
};

// POST /api/leads/:leadId/activities — add a new activity (note, call, etc.)
exports.addActivity = async (req, res) => {
    try {
        const { leadId } = req.params;
        const { type, outcome, notes, next_follow_up, duration_minutes } = req.body;

        const lead = await Lead.findByPk(leadId);
        if (!lead) return res.status(404).json({ error: 'Lead not found' });

        if (!notes && !outcome) {
            return res.status(400).json({ error: 'notes or outcome is required' });
        }

        const activity = await LeadActivity.create({
            lead_id: leadId,
            user_id: req.user.id,
            type: type || 'NOTE',
            outcome: outcome || null,
            notes: notes || null,
            next_follow_up: next_follow_up || null,
            duration_minutes: duration_minutes || null
        });

        // Reload with user info
        const full = await LeadActivity.findByPk(activity.id, {
            include: [{ model: User, as: 'User', attributes: ['id', 'full_name', 'username'] }]
        });

        res.status(201).json({ success: true, data: full });
    } catch (err) {
        console.error('addActivity error:', err);
        res.status(500).json({ error: err.message });
    }
};

// DELETE /api/leads/:leadId/activities/:activityId
exports.deleteActivity = async (req, res) => {
    try {
        const { activityId } = req.params;
        const activity = await LeadActivity.findByPk(activityId);
        if (!activity) return res.status(404).json({ error: 'Activity not found' });

        // Only creator or admin can delete
        const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN';
        if (activity.user_id !== req.user.id && !isAdmin) {
            return res.status(403).json({ error: 'Access denied' });
        }

        await activity.destroy();
        res.json({ success: true });
    } catch (err) {
        console.error('deleteActivity error:', err);
        res.status(500).json({ error: err.message });
    }
};

// PATCH /api/leads/:leadId/status — update lead status
exports.updateLeadStatus = async (req, res) => {
    try {
        const { leadId } = req.params;
        const { status } = req.body;

        const validStatuses = ['NEW', 'CONTACTED', 'INTERESTED', 'CONVERTED', 'REJECTED'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status', valid: validStatuses });
        }

        const lead = await Lead.findByPk(leadId);
        if (!lead) return res.status(404).json({ error: 'Lead not found' });

        const oldStatus = lead.status;
        lead.status = status;
        await lead.save();

        // Log the status change as an activity
        await LeadActivity.create({
            lead_id: leadId,
            user_id: req.user.id,
            type: 'STATUS_CHANGE',
            notes: `Status changed from ${oldStatus} to ${status}`
        });

        res.json({ success: true, data: lead });
    } catch (err) {
        console.error('updateLeadStatus error:', err);
        res.status(500).json({ error: err.message });
    }
};
