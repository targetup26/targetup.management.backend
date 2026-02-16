require('dotenv').config();

const env = process.env.NODE_ENV || 'development';
const databaseConfig = require('./database')[env];

module.exports = {
    env,
    port: process.env.PORT || 5050,
    jwtSecret: process.env.JWT_SECRET,
    database: databaseConfig,
    leadEngine: {
        url: process.env.LEAD_ENGINE_URL,
        internalToken: process.env.LEAD_ENGINE_INTERNAL_TOKEN
    },
    redis: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT
    },
    storageAgent: {
        url: process.env.STORAGE_AGENT_URL
    }
};
