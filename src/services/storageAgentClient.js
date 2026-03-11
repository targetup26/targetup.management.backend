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
            formData.append('filename', filename);

            if (!employee) {
                // New hierarchical path mode: department contains the full rel_path
                formData.append('rel_path', department);
            } else {
                formData.append('department', department);
                formData.append('employee', employee);
            }

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
     * Create a physical directory on the storage agent.
     * @param {Object} server - StorageServer model instance
     * @param {string} relPath - Path relative to STORAGE_PATH (e.g. "Engineering/John Doe/Projects")
     */
    async createFolder(server, relPath) {
        try {
            const token = this._generateAgentToken();
            const url = `${this._getBaseUrl(server)}/agent/create-folder`;
            const response = await axios.post(url, { rel_path: relPath }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            return response.data;
        } catch (error) {
            console.error('[StorageAgentClient] Create folder error:', error.message);
            throw new Error(`Failed to create folder on storage agent: ${error.message}`);
        }
    }

    /**
     * Rename a file or directory on the storage agent.
     * @param {Object} server - StorageServer model instance
     * @param {string} oldPath - Old relative path
     * @param {string} newPath - New relative path
     */
    async renameItem(server, oldPath, newPath) {
        try {
            const token = this._generateAgentToken();
            const url = `${this._getBaseUrl(server)}/agent/rename`;
            const response = await axios.post(url, { old_path: oldPath, new_path: newPath }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            return response.data;
        } catch (error) {
            console.error('[StorageAgentClient] Rename error:', error.message);
            throw new Error(`Failed to rename on storage agent: ${error.message}`);
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
