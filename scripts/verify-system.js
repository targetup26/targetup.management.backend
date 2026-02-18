const axios = require('axios');

const API_URL = 'http://26.32.68.132:5050/api';

async function verifySystem() {
    try {
        console.log('🔍 Starting System Verification...');

        // 1. Test Login
        console.log('1️⃣  Testing Login (admin)...');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            username: 'admin',
            password: 'target@2026'
        });

        if (loginRes.data.token) {
            console.log('✅ Login successful. Token received.');
            const token = loginRes.data.token;
            const headers = { Authorization: `Bearer ${token}` };

            // 2. Test Lead History
            console.log('2️⃣  Testing Lead Job History...');
            try {
                const historyRes = await axios.get(`${API_URL}/leads/history`, { headers });
                console.log(`✅ Lead History retrieved. Jobs: ${historyRes.data.length}`);
            } catch (err) {
                console.error('❌ Lead History failed:', err.response ? err.response.data : err.message);
            }

            // 3. Test Storage List (Using internal route or similar if available, or just check settings)
            console.log('3️⃣  Testing Storage Settings...');
            try {
                const settingsRes = await axios.get(`${API_URL}/storage/settings`, { headers });
                console.log('✅ Storage Settings retrieved.');
            } catch (err) {
                // If route doesn't exist, try list files
                console.log('⚠️  Settings route might be restricted. Trying list files...');
                try {
                    const filesRes = await axios.get(`${API_URL}/storage/files`, { headers });
                    console.log(`✅ Files list retrieved. Count: ${filesRes.data.length}`);
                } catch (fileErr) {
                    console.error('❌ Storage check failed:', fileErr.response ? fileErr.response.data : fileErr.message);
                }
            }

        } else {
            console.error('❌ Login failed. No token.');
        }

    } catch (error) {
        console.error('❌ Critical Verification Error:', error.response ? error.response.data : error.message);
    }
}

verifySystem();
