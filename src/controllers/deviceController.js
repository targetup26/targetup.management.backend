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
        const os = require('os');
        const interfaces = os.networkInterfaces();
        let bestInterface = null;

        // Step 1: Find the main active network interface
        // Priority: 
        // 1. Name contains 'Wi-Fi' or 'Wireless' and has IPv4 192.168.x.x
        // 2. IPv4 192.168.x.x
        // 3. IPv4 10.x.x.x
        // 4. Any other non-internal IPv4 (172.x, etc) that is NOT WSL/vEthernet if possible

        for (const name of Object.keys(interfaces)) {
            // Skip WSL/Hyper-V adapters usually named vEthernet
            if (name.toLowerCase().includes('vethernet') || name.toLowerCase().includes('wsl')) continue;

            for (const iface of interfaces[name]) {
                if (iface.family === 'IPv4' && !iface.internal) {
                    const score =
                        (name.toLowerCase().includes('wi-fi') || name.toLowerCase().includes('wireless') ? 10 : 0) +
                        (iface.address.startsWith('192.168.') ? 5 : 0) +
                        (iface.address.startsWith('10.') ? 3 : 0);

                    if (!bestInterface || score > bestInterface.score) {
                        bestInterface = {
                            ...iface,
                            name,
                            score
                        };
                    }
                }
            }
        }

        // Fallback: If no "good" interface found, check unfiltered list (including vEthernet if needed, but unlikely for user)
        if (!bestInterface) {
            for (const name of Object.keys(interfaces)) {
                for (const iface of interfaces[name]) {
                    if (iface.family === 'IPv4' && !iface.internal) {
                        bestInterface = { ...iface, name, score: 0 };
                        break;
                    }
                }
                if (bestInterface) break;
            }
        }

        if (!bestInterface) {
            console.error('No suitable network interface found.');
            if (res) return res.status(500).json({ error: 'No active LAN interface found' });
            return;
        }

        const localIP = bestInterface.address;
        const parts = localIP.split('.');
        const subnet = `${parts[0]}.${parts[1]}.${parts[2]}`;

        console.log(`Scanning network on interface ${bestInterface.name} (${localIP}) Subnet: ${subnet}.0/24`);

        // Step 2: Ping sweep to populate ARP table (ping all IPs in subnet)
        // Using standard CMD with start /b for parallel execution (compatible with all Windows versions)
        const pingCommand = `cmd /c "for /L %i in (1,1,254) do start /b ping -n 1 -w 200 ${subnet}.%i"`;

        exec(pingCommand, (pingError) => {
            if (pingError) {
                console.error('Ping sweep trigger error (non-fatal):', pingError);
            }

            // Give pings a moment to finish and populate ARP table (3 seconds)
            setTimeout(() => {
                // Step 3: Now read ARP table (should have all active devices)
                exec('arp -a', async (arpError, arpStdout) => {
                    if (arpError) {
                        console.error(`arp error: ${arpError}`);
                        if (res) return res.status(500).json({ error: 'Failed to read ARP table' });
                        return;
                    }

                    const lines = arpStdout.split('\n');
                    const devices = [];

                    // Parse ARP output - LOOSE REGEX (Language Independent)
                    // Matches: IP Address [whitespace] MAC Address
                    for (const line of lines) {
                        const match = line.trim().match(/^(\d+\.\d+\.\d+\.\d+)\s+([a-fA-F0-9-]+)/);
                        if (match) {
                            const ip = match[1];
                            const mac = match[2].toUpperCase().replace(/-/g, ':');

                            // Filter out non-real network IPs
                            const isLoopback = ip.startsWith('127.');
                            const isLinkLocal = ip.startsWith('169.254.');
                            const isMulticast = ip.startsWith('224.') || ip.startsWith('239.');
                            const isBroadcast = ip.endsWith('.255') || ip === '255.255.255.255';

                            // Only include real local network IPs (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
                            const isTargetSubnet = ip.startsWith(subnet);

                            // We'll trust the subnet check primarily
                            if (isTargetSubnet && !isLoopback && !isLinkLocal && !isMulticast && !isBroadcast) {
                                let hostname = `Device (${ip})`;
                                try {
                                    const hostnames = await dns.reverse(ip);
                                    if (hostnames && hostnames.length > 0) {
                                        hostname = hostnames[0];
                                    }
                                } catch (e) {
                                    // DNS lookup failed, ignore
                                }

                                devices.push({
                                    ip_address: ip,
                                    mac_address: mac,
                                    name: hostname,
                                    is_active: true
                                });
                            }
                        }
                    }

                    // Step 4: Update 'last_seen_at' for registered devices
                    try {
                        const registeredDevices = await Device.findAll();
                        for (const foundDevice of devices) {
                            // Match by MAC address (most reliable) or IP
                            const match = registeredDevices.find(d =>
                                (d.mac_address && d.mac_address.toLowerCase() === foundDevice.mac_address.toLowerCase()) ||
                                (d.ip_address === foundDevice.ip_address)
                            );

                            if (match) {
                                match.last_seen_at = new Date();
                                if (foundDevice.mac_address && !match.mac_address) {
                                    match.mac_address = foundDevice.mac_address; // Auto-fill MAC if missing
                                }
                                await match.save();

                                // Auto-Attendance Logic: DISABLED as per user request
                                /*
                                if (match.employee_id) {
                                    const today = new Date().toISOString().split('T')[0];
                                    const existingEntry = await AttendanceEntry.findOne({
                                        where: {
                                            employee_id: match.employee_id,
                                            date: today,
                                            is_active: true
                                        }
                                    });

                                    if (!existingEntry) {
                                        // Clock In the employee automatically
                                        await AttendanceEntry.create({
                                            employee_id: match.employee_id,
                                            date: today,
                                            clock_in: new Date(),
                                            status: 'PRESENT',
                                            source: 'DEVICE',
                                            device_ip: foundDevice.ip_address,
                                            device_name: match.name,
                                            device_clock_in: new Date(),
                                            // Additional logic for late arrivals could go here (comparing with shift start)
                                        });
                                        console.log(`Auto-clocked in employee ${match.employee_id} via device ${match.name}`);
                                    }
                                }
                                */
                            }
                        }
                    } catch (dbError) {
                        console.error('Error updating device status:', dbError);
                    }

                    console.log(`Found ${devices.length} devices on network`);

                    if (res) {
                        res.json(devices);
                    }
                });
            }, 3000); // Wait 3s for pings to complete
        });
    } catch (error) {
        if (res) {
            res.status(500).json({ error: error.message });
        } else {
            console.error('Scan Network Error:', error.message);
        }
    }
};
