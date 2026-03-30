require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const http = require('http');
const path = require('path');
const { Server } = require("socket.io");
const db = require('./src/models');

const app = express();
const server = http.createServer(app);

const jwt = require('jsonwebtoken');

// Socket.io Setup
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Socket middleware for authentication
io.use(async (socket, next) => {
    try {
        const token = socket.handshake.auth.token;
        if (!token) return next(new Error('Authentication error'));

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.user_id = decoded.id;
        next();
    } catch (err) {
        next(new Error('Authentication error'));
    }
});

// Attach io to app so it's accessible via req.app.io in controllers
app.io = io;

// Middleware to attach io to req (keeping for backward compatibility)
app.use((req, res, next) => {
    req.io = io;
    next();
});

// Middleware
app.use(cors());
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    hsts: false
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '50gb' }));
app.use(express.urlencoded({ extended: true, limit: '50gb' }));

// Routes
app.get('/health', (req, res) => {
    res.json({ status: 'UP', timestamp: new Date(), version: '1.0.0' });
});

// Import Routes
app.use('/api', require('./src/routes/api'));

// Optional: API Root Check
app.get('/api-status', (req, res) => {
    res.json({ message: 'Targetup Attendance API is running', ip: process.env.SERVER_IP });
});

// Serve Frontend Static Files (Vite Production Build)
const frontendPath = process.env.FRONTEND_PATH
    ? path.resolve(process.env.FRONTEND_PATH)
    : path.resolve(__dirname, '../frontend/dist');

if (require('fs').existsSync(frontendPath)) {
    console.log(`[Server] Serving frontend from: ${frontendPath}`);
    app.use(express.static(frontendPath));

    // SPA Fallback: Serve index.html for all non-API routes
    app.use((req, res, next) => {
        if (req.path.startsWith('/api')) {
            return next();
        }
        res.sendFile(path.join(frontendPath, 'index.html'));
    });
} else {
    console.warn(`[Server] Frontend build not found at: ${frontendPath}`);
}

// Error Handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send({ status: 'error', message: 'Something went wrong!' });
});

// Socket Connections
io.on('connection', (socket) => {
    console.log('User connected:', socket.id, 'UserID:', socket.user_id);

    // Join Rooms
    socket.on('join_rooms', (roomIds) => {
        if (Array.isArray(roomIds)) {
            roomIds.forEach(id => {
                socket.join(`room_${id}`);
                console.log(`Socket ${socket.id} joined room_${id}`);
            });
        }
    });

    // Typing Indicators
    socket.on('typing_start', (data) => {
        const { room_id, username } = data;
        socket.to(`room_${room_id}`).emit('user_typing', { room_id, username, user_id: socket.user_id });
    });

    socket.on('typing_stop', (data) => {
        const { room_id, username } = data;
        socket.to(`room_${room_id}`).emit('user_stopped_typing', { room_id, username, user_id: socket.user_id });
    });

    // Presence Notifications
    io.emit('user_online', { user_id: socket.user_id });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        io.emit('user_offline', { user_id: socket.user_id });
    });
});

// Start Server
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

db.sequelize.query('SET FOREIGN_KEY_CHECKS = 0')
    .then(() => db.sequelize.sync({ alter: true }))
    .then(() => db.sequelize.query('SET FOREIGN_KEY_CHECKS = 1'))
    .then(() => {
        console.log('Database synced');
        server.listen(PORT, HOST, () => {
            console.log(`Server running on http://${HOST}:${PORT}`);

            // Background Task: Auto-Scan Network every 3 minutes
            // Note: Auto-clock-in logic is disabled in deviceController.js, 
            // but we keep the scan to track online/offline status of devices.
            const deviceController = require('./src/controllers/deviceController');
            const SCAN_INTERVAL = 3 * 60 * 1000; // 3 Minutes

            console.log(`Starting Background Network Scanner (Interval: ${SCAN_INTERVAL}ms)...`);
            setInterval(async () => {
                try {
                    console.log('Running background network scan...');
                    await deviceController.scanNetwork();
                } catch (err) {
                    console.error('Background Scan Error:', err);
                }
            }, SCAN_INTERVAL);
        });
    }).catch((err) => {
        console.error('Failed to sync database:', err);
    });
