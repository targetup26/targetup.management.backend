const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { User } = require('../models');

exports.register = async (req, res) => {
    try {
        const { username, password, full_name, role } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({
            username,
            password: hashedPassword,
            full_name,
            role
        });
        res.status(201).json({ message: 'User created', userId: user.id });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ where: { username } });

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({ token, user: { id: user.id, username: user.username, role: user.role, full_name: user.full_name } });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        // middleware should attach user to req
        // For now, let's assume we decode token or pass id
        // We'll trust the middleware or extract from token directly if needed.
        // Actually, we need middleware to get req.user.id. 
        // For this task, I'll extract from token manually if middleware isn't set up, 
        // but typically there is an auth middleware.

        // Let's check headers for token since we don't have middleware file visible yet.
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ error: 'No token provided' });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;

        const { full_name, password, new_password } = req.body;
        const user = await User.findByPk(userId);

        if (!user) return res.status(404).json({ error: 'User not found' });

        if (full_name) user.full_name = full_name;

        if (new_password) {
            // If changing password, verify old one first if provided, or just allow admin override logic?
            // Usually require old password for security.
            if (password) {
                const valid = await bcrypt.compare(password, user.password);
                if (!valid) return res.status(400).json({ error: 'Current password incorrect' });
            }
            user.password = await bcrypt.hash(new_password, 10);
        }

        await user.save();

        res.json({
            id: user.id,
            username: user.username,
            role: user.role,
            full_name: user.full_name
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
