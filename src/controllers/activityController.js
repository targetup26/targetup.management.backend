const { Op } = require('sequelize');
const db = require('../models');
const ActivitySession = db.ActivitySession;
const Employee = db.Employee;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getClientIP(req) {
    return (
        req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
        req.socket?.remoteAddress ||
        'unknown'
    );
}

/**
 * Get or create the open session for an employee.
 * Enforces single-session-per-employee by updating existing open session.
 */
async function getOrCreateSession(employeeId, req) {
    let session = await ActivitySession.findOne({
        where: { employee_id: employeeId, check_out_at: null }
    });

    if (!session) {
        session = await ActivitySession.create({
            employee_id: employeeId,
            check_in_at: new Date(),
            check_in_ip: getClientIP(req),
            status: 'working',
            last_seen_at: new Date(),
            total_active_seconds: 0,
            total_idle_seconds: 0
        });
    }
    return session;
}

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * POST /api/activity/snapshot
 * Receive a 30-second activity snapshot from the Desktop App.
 * employee_id is always taken from the JWT token — never from the body.
 */
exports.snapshot = async (req, res) => {
    try {
        const employeeId = req.user?.employee_id || req.user?.id;
        if (!employeeId) return res.status(400).json({ error: 'Employee context missing from token' });

        const {
            status = 'working',
            activeSeconds = 0,
            idleSeconds = 0,
            currentApp = 'Unknown',
            windowTitle = 'N/A'
        } = req.body;

        const session = await getOrCreateSession(employeeId, req);

        await session.update({
            total_active_seconds: session.total_active_seconds + Math.max(0, parseInt(activeSeconds) || 0),
            total_idle_seconds:   session.total_idle_seconds   + Math.max(0, parseInt(idleSeconds)   || 0),
            status:               ['working', 'idle', 'offline'].includes(status) ? status : 'working',
            last_active_app:      currentApp  || 'Unknown',
            last_window_title:    windowTitle || 'N/A',
            last_seen_at:         new Date()
        });

        // Emit real-time update to admin room via socket.io
        const io = req.app.get('io');
        if (io) {
            io.to('admin-activity').emit('activity_update', {
                employee_id:          employeeId,
                status:               session.status,
                total_active_seconds: session.total_active_seconds,
                total_idle_seconds:   session.total_idle_seconds,
                last_active_app:      session.last_active_app,
                last_window_title:    session.last_window_title,
                last_seen_at:         session.last_seen_at
            });
        }

        res.json({ success: true, session_id: session.id });
    } catch (err) {
        console.error('[Activity] snapshot error:', err);
        res.status(500).json({ error: 'Failed to record snapshot' });
    }
};

/**
 * POST /api/activity/checkout
 * Finalize the session on graceful checkout.
 */
exports.checkout = async (req, res) => {
    try {
        const employeeId = req.user?.employee_id || req.user?.id;
        if (!employeeId) return res.status(400).json({ error: 'Employee context missing from token' });

        const { activeSeconds = 0, idleSeconds = 0, currentApp, windowTitle } = req.body;

        const session = await ActivitySession.findOne({
            where: { employee_id: employeeId, check_out_at: null }
        });

        if (!session) return res.json({ success: true, message: 'No open session found' });

        await session.update({
            check_out_at:         new Date(),
            check_out_ip:         getClientIP(req),
            status:               'offline',
            total_active_seconds: session.total_active_seconds + Math.max(0, parseInt(activeSeconds) || 0),
            total_idle_seconds:   session.total_idle_seconds   + Math.max(0, parseInt(idleSeconds)   || 0),
            last_active_app:      currentApp  || session.last_active_app,
            last_window_title:    windowTitle || session.last_window_title,
            last_seen_at:         new Date()
        });

        res.json({ success: true, session_id: session.id });
    } catch (err) {
        console.error('[Activity] checkout error:', err);
        res.status(500).json({ error: 'Failed to finalize session' });
    }
};

/**
 * POST /api/activity/flush-queue
 * Receive batched offline snapshots queued while the client was disconnected.
 */
exports.flushQueue = async (req, res) => {
    try {
        const employeeId = req.user?.employee_id || req.user?.id;
        if (!employeeId) return res.status(400).json({ error: 'Employee context missing from token' });

        const { snapshots = [] } = req.body;
        if (!Array.isArray(snapshots) || snapshots.length === 0) {
            return res.json({ success: true, flushed: 0 });
        }

        const session = await getOrCreateSession(employeeId, req);

        let additionalActive = 0;
        let additionalIdle = 0;

        for (const snap of snapshots) {
            additionalActive += Math.max(0, parseInt(snap.activeSeconds) || 0);
            additionalIdle   += Math.max(0, parseInt(snap.idleSeconds)   || 0);
        }

        const lastSnap = snapshots[snapshots.length - 1];
        await session.update({
            total_active_seconds: session.total_active_seconds + additionalActive,
            total_idle_seconds:   session.total_idle_seconds   + additionalIdle,
            last_active_app:      lastSnap.currentApp  || session.last_active_app,
            last_window_title:    lastSnap.windowTitle || session.last_window_title,
            last_seen_at:         new Date()
        });

        res.json({ success: true, flushed: snapshots.length });
    } catch (err) {
        console.error('[Activity] flush-queue error:', err);
        res.status(500).json({ error: 'Failed to flush queue' });
    }
};

/**
 * GET /api/activity/live
 * Returns all employees with their current open activity session.
 * Admin only. Data is also pushed via socket.io in real-time.
 */
exports.getLive = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const sessions = await ActivitySession.findAll({
            where: {
                check_in_at: { [Op.gte]: today }
            },
            include: [{
                model: Employee,
                as: 'Employee',
                attributes: ['id', 'full_name', 'code', 'job_title'],
                required: false  // LEFT JOIN — don't fail if no Employee
            }],
            order: [['last_seen_at', 'DESC']]
        });

        res.json({ sessions });
    } catch (err) {
        console.error('[Activity] getLive error:', err);
        res.status(500).json({ error: 'Failed to fetch live sessions' });
    }
};

/**
 * GET /api/activity/session/:employeeId
 * Get today's session for a specific employee.
 */
exports.getSession = async (req, res) => {
    try {
        const { employeeId } = req.params;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const session = await ActivitySession.findOne({
            where: {
                employee_id: employeeId,
                check_in_at: { [Op.gte]: today }
            },
            order: [['check_in_at', 'DESC']]
        });

        res.json({ session: session || null });
    } catch (err) {
        console.error('[Activity] getSession error:', err);
        res.status(500).json({ error: 'Failed to fetch session' });
    }
};

// ─── Background Cron ──────────────────────────────────────────────────────────

/**
 * Run every 60 seconds in server.js.
 * 
 * 1. Mark employees as 'offline' if no snapshot received for > 90 seconds.
 * 2. Auto-checkout employees if no snapshot received for > 5 minutes (crash/kill).
 */
exports.runAutoOfflineCron = async () => {
    try {
        const now = new Date();
        const ninetySecondsAgo  = new Date(now - 90 * 1000);
        const fiveMinutesAgo    = new Date(now - 5 * 60 * 1000);

        // Mark as offline (no checkout yet, just status change)
        await ActivitySession.update(
            { status: 'offline' },
            {
                where: {
                    check_out_at: null,
                    status: { [Op.in]: ['working', 'idle'] },
                    last_seen_at: { [Op.lt]: ninetySecondsAgo }
                }
            }
        );

        // Auto-checkout sessions silent for > 15 minutes
        const timedOut = await ActivitySession.findAll({
            where: {
                check_out_at: null,
                last_seen_at: { [Op.lt]: new Date(now - 15 * 60 * 1000) }
            }
        });

        for (const session of timedOut) {
            await session.update({
                check_out_at: now,
                status: 'offline'
            });
            console.log(`[Activity Cron] Auto-checkout employee_id=${session.employee_id} (no heartbeat for 15+ min)`);
        }
    } catch (err) {
        console.error('[Activity Cron] Error:', err.message);
    }
};
