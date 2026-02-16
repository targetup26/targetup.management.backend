require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const http = require('http');
const { Server } = require("socket.io");
const db = require('./src/models');

const app = express();
const server = http.createServer(app);

// Socket.io Setup
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Attach io to req so controllers can use it
app.use((req, res, next) => {
    req.io = io;
    next();
});

// Middleware
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/', (req, res) => {
    res.json({ message: 'Targetup Attendance API is running', ip: process.env.SERVER_IP });
});

// Import Routes
app.use('/api', require('./src/routes/api'));

// Error Handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send({ status: 'error', message: 'Something went wrong!' });
});

// Socket Connections
io.on('connection', (socket) => {
    console.log('User connected', socket.id);
    socket.on('disconnect', () => {
        console.log('User disconnected', socket.id);
    });
});

// Start Server
const PORT = process.env.PORT || 3001;
const HOST = process.env.SERVER_IP || '0.0.0.0';

db.sequelize.sync({ alter: true })
    .then(() => {
        console.log('Database synced');
        server.listen(PORT, HOST, () => {
            console.log(`Server running on http://${HOST}:${PORT}`);

            // Background Task: Auto-Scan Network every 3 minutes
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
