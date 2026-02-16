const { GlobalSetting } = require('../models');

exports.getSystemConfig = async (req, res) => {
    try {
        // Fetch dynamic presence config if exists
        const presenceSetting = await GlobalSetting.findOne({ where: { setting_key: 'presence_config' } });
        let dynamicPresence = null;
        if (presenceSetting && presenceSetting.setting_value) {
            try {
                dynamicPresence = JSON.parse(presenceSetting.setting_value);
            } catch (e) {
                console.error('Failed to parse presence_config', e);
            }
        }

        const config = {
            // Chat Thresholds
            chat: {
                messageGroupingThresholdSeconds: 300,
                maxMessageLength: 2000,
                typingTimeoutMs: 3000,
            },

            // Upload Limits
            uploads: {
                maxFileSizeMb: 50,
                allowedExtensions: ['.jpg', '.png', '.gif', '.pdf', '.docx', '.txt'],
            },

            // Feature Flags
            features: {
                enableOptimisticUI: true,
                enableStatusPopover: true,
                enablePrivacySettings: true
            },

            // Presence Configuration (Merged with Database)
            presence: {
                labels: dynamicPresence?.labels || {
                    available: "Online",
                    busy: "Do Not Disturb",
                    meeting: "In Meeting",
                    idle: "Idle",
                    invisible: "Invisible"
                },
                thresholds: dynamicPresence?.thresholds || {
                    idleMinutes: 5
                }
            }
        };

        res.json({ success: true, config });
    } catch (error) {
        console.error('Config Error:', error);
        res.status(500).json({ success: false, error: 'Failed to load system config' });
    }
};

/**
 * Update system configuration (Admin Only)
 */
exports.updatePresenceConfig = async (req, res) => {
    try {
        if (req.user.role !== 'ADMIN') {
            return res.status(403).json({ success: false, error: 'Forbidden' });
        }

        const { labels, thresholds } = req.body;

        const [setting, created] = await GlobalSetting.findOrCreate({
            where: { setting_key: 'presence_config' },
            defaults: {
                setting_key: 'presence_config',
                category: 'system',
                description: 'Presence labels and idle thresholds'
            }
        });

        setting.setting_value = JSON.stringify({ labels, thresholds });
        await setting.save();

        res.json({ success: true, message: 'Presence configuration updated' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
