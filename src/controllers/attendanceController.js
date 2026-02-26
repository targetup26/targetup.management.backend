const { AttendanceEntry, Employee, JobRole, Department, Shift, User, AuditLog, Device } = require('../models');
const { Op } = require('sequelize');

exports.getEntries = async (req, res) => {
    try {
        const { from, to, department_id, job_role_id, shift_id, status, source, has_violations, employee_id } = req.query;
        const where = { is_active: true };

        if (from && to) {
            where.date = { [Op.between]: [from, to] };
        }

        if (status) where.status = status;
        if (source) where.source = source;
        if (has_violations === 'true') {
            where[Op.or] = [
                { violation_points: { [Op.gt]: 0 } },
                { status: 'LATE' },
                { status: 'ABSENT' }
            ];
        }

        const include = [
            {
                model: Employee,
                include: [
                    { model: Department, attributes: ['name'] },
                    { model: JobRole, attributes: ['name'] },
                    { model: Shift, attributes: ['name', 'start_time', 'end_time'] }
                ]
            }
        ];

        if (department_id || job_role_id || shift_id) {
            const empWhere = {};
            if (department_id) empWhere.department_id = department_id;
            if (job_role_id) empWhere.job_role_id = job_role_id;
            if (shift_id) empWhere.shift_id = shift_id;
            include[0].where = empWhere;
        }

        const data = await AttendanceEntry.findAll({
            where,
            include,
            order: [['date', 'DESC'], ['clock_in', 'DESC']]
        });
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.addManualEntry = async (req, res) => {
    try {
        const { employee_id, date, clock_in, clock_out, status, notes } = req.body;

        // Create Entry
        const device_ip = (req.ip || req.connection.remoteAddress || '').replace('::ffff:', '');

        const entry = await AttendanceEntry.create({
            employee_id,
            date,
            clock_in: clock_in || null,
            clock_out: clock_out || null,
            status: status || 'PRESENT',
            source: 'MANUAL',
            device_ip: device_ip,
            device_name: 'Web Portal',
            manual_override: true,
            override_reason: notes || 'Manual Entry by HR'
        });

        // TODO: Calculate Violations based on Shift (Separated Service recommended)

        // Log Audit
        await AuditLog.create({
            entity_type: 'ATTENDANCE',
            entity_id: entry.id,
            action: 'CREATE',
            new_value: entry.toJSON(),
            performed_by: req.user ? req.user.id : null // req.user from JWT
        });

        res.status(201).json(entry);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.updateEntry = async (req, res) => {
    try {
        const { id } = req.params;
        const { employee_id, date, clock_in, clock_out, status, notes } = req.body;

        const entry = await AttendanceEntry.findByPk(id);
        if (!entry) return res.status(404).json({ error: 'Entry not found' });

        const oldValue = entry.toJSON();

        // Update Entry
        await entry.update({
            employee_id,
            date,
            clock_in: clock_in || null,
            clock_out: clock_out || null,
            status: status || 'PRESENT',
            manual_override: true,
            override_reason: notes || 'Edited by HR'
        });

        // Log Audit
        await AuditLog.create({
            entity_type: 'ATTENDANCE',
            entity_id: entry.id,
            action: 'UPDATE',
            old_value: oldValue,
            new_value: entry.toJSON(),
            performed_by: req.user ? req.user.id : null
        });

        res.status(200).json(entry);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.deviceLog = async (req, res) => {
    try {
        const { employee_code, timestamp, mac_address } = req.body;
        const device_ip = (req.ip || req.connection.remoteAddress).replace('::ffff:', '');
        const now = new Date();

        // Step 1: Find authorized device by IP and/or MAC
        const whereClause = {
            is_active: true,
            [Op.or]: []
        };

        if (device_ip) {
            whereClause[Op.or].push({ ip_address: { [Op.like]: `%${device_ip}%` } });
        }
        if (mac_address) {
            whereClause[Op.or].push({ mac_address: mac_address.toUpperCase() });
        }

        const authorizedDevice = await Device.findOne({ where: whereClause });

        if (!authorizedDevice) {
            console.log(`Unauthorized device - IP: ${device_ip}, MAC: ${mac_address || 'N/A'}`);
            return res.status(403).json({ error: 'This device is not authorized for attendance recording.' });
        }

        // Step 2: Update last_seen_at for the device
        await authorizedDevice.update({ last_seen_at: now });

        // Step 3: Determine employee
        let employee;

        if (authorizedDevice.employee_id) {
            // Device is bound to an employee - use that employee
            employee = await Employee.findByPk(authorizedDevice.employee_id);
            if (!employee) {
                return res.status(404).json({ error: 'Bound employee not found' });
            }
        } else if (employee_code) {
            // Device not bound, but employee_code provided (legacy flow)
            employee = await Employee.findOne({ where: { code: employee_code } });
            if (!employee) {
                return res.status(404).json({ error: 'Employee not found' });
            }
        } else {
            // Device not bound and no employee_code provided
            return res.status(400).json({ error: 'Device not bound to employee and no employee_code provided' });
        }

        const date = timestamp ? new Date(timestamp).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

        // Step 4: Check for existing entry today (prevent duplicates)
        let entry = await AttendanceEntry.findOne({
            where: { employee_id: employee.id, date, is_active: true }
        });

        if (entry) {
            // Entry exists - only update clock_out if timestamp is later
            if (timestamp && new Date(timestamp) > new Date(entry.clock_in)) {
                entry.clock_out = timestamp;
                await entry.save();
            }

            // Real-time Update
            if (req.io) {
                req.io.emit('attendance_update', {
                    type: 'UPDATE',
                    data: entry
                });
            }

            return res.status(200).json({ message: 'Attendance updated', entry });
        } else {
            // Create new check-in entry
            entry = await AttendanceEntry.create({
                employee_id: employee.id,
                date,
                clock_in: timestamp || now,
                status: 'PRESENT', // To be refined by Rule Engine
                source: 'DEVICE',
                device_ip,
                device_name: authorizedDevice.name,
                device_clock_in: timestamp || now
            });

            // Real-time Update
            if (req.io) {
                req.io.emit('attendance_update', {
                    type: 'CREATE',
                    data: entry
                });
            }

            return res.status(201).json({ message: 'Attendance created', entry });
        }
    } catch (error) {
        console.error('deviceLog error:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.getDashboardData = async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];

        // 1. Get counts for today
        const totalEmployees = await Employee.count({ where: { is_active: true } });

        const presentToday = await AttendanceEntry.count({
            where: { date: today, status: 'PRESENT', is_active: true }
        });

        const lateToday = await AttendanceEntry.count({
            where: { date: today, status: 'LATE', is_active: true }
        });

        const absentToday = Math.max(0, totalEmployees - (presentToday + lateToday));

        // 2. Get recent activity (last 10 logs)
        const recentActivity = await AttendanceEntry.findAll({
            limit: 10,
            order: [['createdAt', 'DESC']],
            include: [
                {
                    model: Employee,
                    attributes: ['full_name'],
                    include: [{ model: Department, attributes: ['name'] }]
                }
            ],
            where: { is_active: true }
        });

        // 3. Get Device Status
        const totalDevices = await Device.count({ where: { is_active: true } });
        const onlineDevices = await Device.count({
            where: {
                is_active: true,
                last_seen_at: {
                    [Op.gt]: new Date(Date.now() - 10 * 60 * 1000) // Online if seen in last 10 mins
                }
            }
        });

        res.json({
            stats: {
                totalEmployees,
                presentToday,
                lateToday,
                absentToday,
                totalDevices,
                onlineDevices
            },
            recentActivity
        });
    } catch (error) {
        console.error('getDashboardData error:', error);
        res.status(500).json({ error: error.message });
    }
};

// Desktop App Methods
exports.desktopCheckIn = async (req, res) => {
    try {
        const { employee_id } = req.body;
        const empId = employee_id || (req.employee ? req.employee.id : null);

        if (!empId) {
            return res.status(400).json({ error: 'Employee ID is required. Please ensure your profile is linked.' });
        }

        const today = new Date().toISOString().split('T')[0];

        // Check if already checked in
        const existing = await AttendanceEntry.findOne({
            where: {
                employee_id: empId,
                date: today,
                is_active: true
            }
        });

        if (existing && existing.clock_in) {
            return res.status(400).json({ error: 'Already checked in today' });
        }

        const entry = await AttendanceEntry.create({
            employee_id: empId,
            date: today,
            clock_in: new Date(),
            status: 'PRESENT',
            source: 'DESKTOP'
        });

        res.json({ success: true, entry });
    } catch (error) {
        console.error('desktopCheckIn error:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.desktopCheckOut = async (req, res) => {
    try {
        const { employee_id } = req.body;
        const empId = employee_id || (req.employee ? req.employee.id : null);

        if (!empId) {
            return res.status(400).json({ error: 'Employee ID is required.' });
        }

        const today = new Date().toISOString().split('T')[0];

        const entry = await AttendanceEntry.findOne({
            where: {
                employee_id: empId,
                date: today,
                is_active: true
            }
        });

        if (!entry) {
            return res.status(404).json({ error: 'No active attendance entry found' });
        }

        if (entry.clock_out) {
            return res.status(400).json({ error: 'Already checked out' });
        }

        entry.clock_out = new Date();
        await entry.save();

        res.json({ success: true, entry });
    } catch (error) {
        console.error('desktopCheckOut error:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.getAttendanceStatus = async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];

        const { employee_id } = req.query; // Desktop status uses GET
        const empId = employee_id || (req.employee ? req.employee.id : null);

        if (!empId) {
            return res.status(400).json({ error: 'Employee ID is required.' });
        }

        const entry = await AttendanceEntry.findOne({
            where: {
                employee_id: empId,
                date: today,
                is_active: true
            }
        });

        res.json({
            is_checked_in: !!entry?.clock_in,
            is_checked_out: !!entry?.clock_out,
            clock_in: entry?.clock_in,
            clock_out: entry?.clock_out,
            status: entry?.status || 'ABSENT'
        });
    } catch (error) {
        console.error('getAttendanceStatus error:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.desktopHeartbeat = async (req, res) => {
    try {
        const { device_info, employee_id } = req.body;
        const empId = employee_id || (req.employee ? req.employee.id : null);

        const today = new Date().toISOString().split('T')[0];

        // Update last seen for employee's device
        if (device_info?.mac_address) {
            await Device.update(
                {
                    last_seen_at: new Date(),
                    employee_id: empId // Refresh mapping if needed
                },
                { where: { mac_address: device_info.mac_address } }
            );
        }

        // Get current attendance status
        const entry = await AttendanceEntry.findOne({
            where: {
                employee_id: empId,
                date: today,
                is_active: true
            }
        });

        res.json({
            success: true,
            is_checked_in: !!entry?.clock_in,
            is_checked_out: !!entry?.clock_out
        });
    } catch (error) {
        console.error('desktopHeartbeat error:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.getHistory = exports.getEntries;

