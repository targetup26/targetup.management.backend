const { Device, Employee, AuditLog, AttendanceEntry } = require('../models');
const { exec } = require('child_process');
const dns = require('dns').promises;

exports.getDevices = async (req, res) => {
    try {
        const devices = await Device.findAll({
            include: [{
                model: Employee,
                attributes: ['full_name']
            }]
        });
        res.json(devices);
    } catch (error) {
        console.error('getDevices error:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.addDevice = async (req, res) => {
    try {
        const { name, ip_address, mac_address, employee_id } = req.body;
        const device = await Device.create({ name, ip_address, mac_address, employee_id });

        // Log Audit
        await AuditLog.create({
            entity_type: 'DEVICE',
            entity_id: device.id,
            action: 'CREATE',
            new_value: device.toJSON(),
            performed_by: req.user ? req.user.id : null
        });

        res.status(201).json(device);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.deleteDevice = async (req, res) => {
    try {
        const { id } = req.params;
        const device = await Device.findByPk(id);
        if (!device) return res.status(404).json({ error: 'Device not found' });

        await device.destroy();

        // Log Audit
        await AuditLog.create({
            entity_type: 'DEVICE',
            entity_id: id,
            action: 'DELETE',
            old_value: device.toJSON(),
            performed_by: req.user ? req.user.id : null
        });

        res.status(200).json({ message: 'Device deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.registerDevice = async (req, res) => {
    try {
        const { name, ip_address, mac_address, employee_id, device_fingerprint } = req.body;
        const empId = employee_id ? parseInt(employee_id) : null;

        // Try to find device by MAC or fingerprint
        let device = null;
        if (mac_address) device = await Device.findOne({ where: { mac_address } });

        if (device) {
            // If device is already linked to a DIFFERENT employee — reject with clear message
            if (device.employee_id && empId && device.employee_id !== empId) {
                return res.status(409).json({
                    success: false,
                    error: 'This device is already linked to another account. Please contact your administrator.',
                    device_conflict: true
                });
            }

            // Same employee or unlinked — update normally
            device.name = name || device.name;
            device.ip_address = ip_address || device.ip_address;
            if (empId && !device.employee_id) device.employee_id = empId;
            device.last_seen_at = new Date();
            await device.save();
        } else {
            // Create new device
            device = await Device.create({
                name,
                ip_address,
                mac_address,
                employee_id: empId,
                last_seen_at: new Date()
            });
        }

        res.status(200).json({ success: true, device });
    } catch (error) {
        console.error('registerDevice error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};


exports.updateDevice = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, ip_address, mac_address, employee_id, is_active } = req.body;

        const device = await Device.findByPk(id);
        if (!device) return res.status(404).json({ error: 'Device not found' });

        if (name !== undefined) device.name = name;
        if (ip_address !== undefined) device.ip_address = ip_address;
        if (mac_address !== undefined) device.mac_address = mac_address;
        if (employee_id !== undefined) device.employee_id = employee_id ? parseInt(employee_id) : null;
        if (is_active !== undefined) device.is_active = is_active;

        await device.save();

        res.json({ success: true, device });
    } catch (error) {
        console.error('updateDevice error:', error);
        res.status(500).json({ error: error.message });
    }
};




exports.scanNetwork = async (req, res) => {
    try {
        // [CLOUD OPTIMIZED] 
        // Background scan interval is disabled for cloud (since cron passes no req object)
        if (!req || !req.app || !req.app.io) {
            console.log('Background Scanner: Sweeping skipped (Cloud environment active).');
            return;
        }

        const { User, Employee } = require('../models');
        
        // 1. Fetch all currently active WebSocket connections
        const sockets = await req.app.io.fetchSockets();
        const activeSessions = [];

        // 2. Discover logged-in users in real-time
        for (const socket of sockets) {
            if (socket.user_id) {
                const user = await User.findByPk(socket.user_id, {
                    include: [{ model: Employee, as: 'Employee' }]
                });

                if (user) {
                    const empName = user.Employee ? user.Employee.full_name : user.username;
                    
                    // Format as a pseudo-device for the frontend UI table
                    activeSessions.push({
                        ip_address: socket.handshake.address || 'Remote Cloud',
                        mac_address: `USR-${user.id}-SOCKET`, // Virtual MAC as unique key
                        name: `${empName} (Web Session)`,
                        is_active: true,
                        employee_id: user.Employee ? user.Employee.id : null
                    });
                }
            }
        }

        // 3. Remove duplicate sessions (e.g. same user opens 3 tabs)
        const uniqueSessions = activeSessions.filter((v, i, a) => 
            a.findIndex(t => (t.mac_address === v.mac_address)) === i
        );

        if (res) {
            res.json(uniqueSessions);
        }
    } catch (error) {
        if (res) {
            res.status(500).json({ error: error.message });
        } else {
            console.error('Scan Users Error:', error.message);
        }
    }
};
