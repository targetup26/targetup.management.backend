const axios = require('axios');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const AGENT_URL = 'http://26.32.68.132:3002';
const secret = process.env.JWT_SECRET;
const token = jwt.sign({ id: 0, role: 'SYSTEM', source: 'backend' }, secret, { expiresIn: '5m' });

async function diag() {
    console.log(`Checking storage agent at ${AGENT_URL}...`);
    try {
        const res = await axios.get(`${AGENT_URL}/agent/health`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log('Health check success:', JSON.stringify(res.data, null, 2));
    } catch (err) {
        console.error('Health check failed!');
        if (err.response) {
            console.error(`Status: ${err.response.status}`);
            console.error('Data:', JSON.stringify(err.response.data, null, 2));
        } else {
            console.error('Error:', err.message);
        }
    }
}

diag();
