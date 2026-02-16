const axios = require('axios');

/**
 * Storage Agent Client
 * Communicates with external storage service
 */
class StorageAgentClient {
    constructor() {
        this.baseURL = process.env.STORAGE_AGENT_URL || 'http://localhost:3001';
    }

    async uploadFile(fileData) {
        try {
            const response = await axios.post(`${this.baseURL}/upload`, fileData);
            return response.data;
        } catch (error) {
            console.error('[StorageAgentClient] Upload error:', error.message);
            throw new Error('Failed to upload file to storage agent');
        }
    }

    async deleteFile(fileId) {
        try {
            const response = await axios.delete(`${this.baseURL}/files/${fileId}`);
            return response.data;
        } catch (error) {
            console.error('[StorageAgentClient] Delete error:', error.message);
            throw new Error('Failed to delete file from storage agent');
        }
    }

    async getFileMetadata(fileId) {
        try {
            const response = await axios.get(`${this.baseURL}/files/${fileId}/metadata`);
            return response.data;
        } catch (error) {
            console.error('[StorageAgentClient] Metadata error:', error.message);
            throw new Error('Failed to get file metadata');
        }
    }

    async getServerHealth() {
        try {
            const response = await axios.get(`${this.baseURL}/health`);
            return response.data;
        } catch (error) {
            console.error('[StorageAgentClient] Health check error:', error.message);
            return { status: 'unavailable', error: error.message };
        }
    }
}

module.exports = new StorageAgentClient();
