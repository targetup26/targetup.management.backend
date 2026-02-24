const axios = require('axios');
const jwt = require('jsonwebtoken');

/**
 * Storage Agent Client
 * Communicates with the storage-agent microservice.
 * Authentication: JWT Bearer token (same secret as backend).
 */
class StorageAgentClient {

    /**
     * Build base URL from StorageServer model instance
     * StorageServer has: ip_address, port
     */
    _getBaseUrl(server) {
        return `http://${server.ip_address}:${server.port}`;
    }

    /**
     * Generate a short-lived JWT signed with the same secret
     * so the storage agent's authValidator.js will accept it.
     */
    _generateAgentToken() {
        const secret = process.env.JWT_SECRET;
        if (!secret) throw new Error('JWT_SECRET not configured');
        return jwt.sign({ id: 0, role: 'SYSTEM', source: 'backend' }, secret, { expiresIn: '5m' });
    }

    /**
     * Upload a file to the storage agent.
     * @param {Object} server - StorageServer model instance (ip_address, port)
     * @param {string} department - Department folder name
     * @param {string} employee - Employee folder name (full_name)
     * @param {string} filename - Unique filename to store as
     * @param {ReadStream} fileStream - Readable stream of file data
     */
    async uploadFile(server, department, employee, filename, fileStream) {
        try {
            const FormData = require('form-data');
            const formData = new FormData();
            formData.append('file', fileStream, filename);
            formData.append('department', department);
            formData.append('employee', employee);
            formData.append('filename', filename);

            const token = this._generateAgentToken();
            const url = `${this._getBaseUrl(server)}/agent/upload`;

            const response = await axios.post(url, formData, {
                headers: {
                    ...formData.getHeaders(),
                    'Authorization': `Bearer ${token}`
                },
                maxContentLength: Infinity,
                maxBodyLength: Infinity
            });
            return response.data;
        } catch (error) {
            console.error('[StorageAgentClient] Upload error:', error.message);
            throw new Error(`Failed to upload file to storage agent: ${error.message}`);
        }
    }

    /**
     * Download a file from the storage agent as a stream.
     * @param {Object} server - StorageServer model instance
     * @param {string} filepath - Relative filepath stored in DB (e.g. "Engineering\\ONBOARDING_CANDIDATE\\file.jpg")
     * @returns {ReadableStream}
     */
    async downloadFile(server, filepath) {
        try {
            const token = this._generateAgentToken();
            const url = `${this._getBaseUrl(server)}/agent/download`;

            const response = await axios.get(url, {
                params: { filepath },
                headers: { 'Authorization': `Bearer ${token}` },
                responseType: 'stream'
            });
            return response.data; // Readable stream
        } catch (error) {
            console.error('[StorageAgentClient] Download error:', error.message);
            throw new Error(`Failed to download file from storage agent: ${error.message}`);
        }
    }

    /**
     * Delete a file on the storage agent.
     * @param {Object} server - StorageServer model instance
     * @param {string} filepath - Relative filepath stored in DB
     */
    async deleteFile(server, filepath) {
        try {
            const token = this._generateAgentToken();
            const url = `${this._getBaseUrl(server)}/agent/delete`;

            const response = await axios.delete(url, {
                data: { filepath },
                headers: { 'Authorization': `Bearer ${token}` }
            });
            return response.data;
        } catch (error) {
            console.error('[StorageAgentClient] Delete error:', error.message);
            throw new Error(`Failed to delete file from storage agent: ${error.message}`);
        }
    }

    /**
     * Check health of a storage agent server.
     * @param {Object} server - StorageServer model instance
     */
    async checkHealth(server) {
        try {
            const token = this._generateAgentToken();
            const url = `${this._getBaseUrl(server)}/agent/health`;
            const response = await axios.get(url, {
                headers: { 'Authorization': `Bearer ${token}` },
                timeout: 3000
            });
            return { ...response.data, server_id: server.id, server_name: server.name };
        } catch (error) {
            console.error('[StorageAgentClient] Health check error:', error.message);
            return { status: 'unavailable', server_id: server.id, server_name: server.name, error: error.message };
        }
    }
}

module.exports = new StorageAgentClient();
