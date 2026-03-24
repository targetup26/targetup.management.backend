const { User, UserProfile, UserPresence, Employee, Department, JobRole, FileMetadata } = require('../models');

/**
 * Get current user profile and presence
 */
exports.getMyProfile = async (req, res) => {
    try {
        const userId = req.user.id;

        // Ensure profile and presence records exist
        const [profile] = await UserProfile.findOrCreate({
            where: { user_id: userId },
            defaults: { bio: '', privacy_status: 'everyone', privacy_bio: 'everyone' }
        });

        const [presence] = await UserPresence.findOrCreate({
            where: { user_id: userId },
            defaults: { status: 'available' }
        });

        const user = await User.findByPk(userId, {
            attributes: ['id', 'username', 'full_name', 'role'],
            include: [{
                model: Employee,
                as: 'Employee',
                include: [
                    { model: Department, as: 'Department' },
                    { model: JobRole, as: 'JobRole' }
                ]
            }]
        });

        const identity = {
            fullName: user.full_name,
            staffId: user.Employee?.code,
            department: user.Employee?.Department?.name,
            designation: user.Employee?.JobRole?.name,
            hireDate: user.Employee?.hire_date,
            officeLocation: user.Employee?.office_location
        };

        // Validate avatar if present
        if (profile.avatar_url) {
            // Check if file exists and is not deleted
            const fileMeta = await FileMetadata.findByPk(profile.avatar_url);
            if (!fileMeta || fileMeta.is_deleted) {
                profile.avatar_url = null;
                // Optional: persist the cleanup
                // await profile.save(); 
            }
        }

        res.json({
            success: true,
            profile,
            presence,
            user: {
                id: user.id,
                username: user.username,
                full_name: user.full_name,
                role: user.role,
                employee: user.Employee,
                department: user.Employee?.Department,
                job_role: user.Employee?.JobRole,
                identity,
                roles: req.user.roles || [],
                permissions: req.user.permissions || []
            },
            employee: user.Employee,
            identity
        });
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * Get specific user profile and presence for colleague view
 */
exports.getUserProfile = async (req, res) => {
    try {
        const { id: userId } = req.params;

        const user = await User.findByPk(userId, {
            attributes: ['id', 'username', 'full_name', 'role'],
            include: [
                {
                    model: Employee,
                    as: 'Employee',
                    include: [
                        { model: Department, as: 'Department' },
                        { model: JobRole, as: 'JobRole' }
                    ]
                },
                { model: UserProfile, as: 'Profile' },
                { model: UserPresence, as: 'Presence' }
            ]
        });

        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                full_name: user.full_name,
                role: user.role,
                profile: user.Profile,
                presence: user.Presence,
                department: user.Employee?.Department,
                job_role: user.Employee?.JobRole
            }
        });
    } catch (error) {
        console.error('Error fetching colleague profile:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * Update profile bio and metadata
 */
exports.updateProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const { bio, avatar_url, skills, interests } = req.body;

        const profile = await UserProfile.findOne({ where: { user_id: userId } });
        if (!profile) return res.status(404).json({ success: false, error: 'Profile not found' });

        if (bio !== undefined) profile.bio = bio ? bio.substring(0, 200) : '';
        if (avatar_url !== undefined) profile.avatar_url = avatar_url;
        if (skills !== undefined) profile.skills = skills;
        if (interests !== undefined) profile.interests = interests;

        await profile.save();
        res.json({ success: true, profile });
    } catch (error) {
        console.error('❌ Profile Update Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * Update privacy settings
 */
exports.updateSettings = async (req, res) => {
    try {
        const userId = req.user.id;
        const { privacy_status, privacy_bio } = req.body;

        const profile = await UserProfile.findOne({ where: { user_id: userId } });
        if (!profile) return res.status(404).json({ success: false, error: 'Profile not found' });

        if (privacy_status) profile.privacy_status = privacy_status;
        if (privacy_bio) profile.privacy_bio = privacy_bio;

        await profile.save();
        res.json({ success: true, profile });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * Update presence status
 */
exports.updatePresence = async (req, res) => {
    try {
        const userId = req.user.id;
        const { status, custom_text, expires_at } = req.body;

        const presence = await UserPresence.findOne({ where: { user_id: userId } });
        if (!presence) return res.status(404).json({ success: false, error: 'Presence record not found' });

        if (status) presence.status = status;
        if (custom_text !== undefined) presence.custom_text = custom_text;
        if (expires_at !== undefined) presence.expires_at = expires_at;

        await presence.save();

        // Broadcast presence update via socket if available
        if (req.app.io) {
            req.app.io.emit('presence_update', {
                user_id: userId,
                status: presence.status,
                custom_text: presence.custom_text,
                expires_at: presence.expires_at
            });
        }

        res.json({ success: true, presence });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
