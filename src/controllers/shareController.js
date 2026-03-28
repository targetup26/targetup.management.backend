const { ShareToken, FileMetadata, StorageServer, User } = require('../models');
const storageAgentClient = require('../services/storageAgentClient');
const crypto = require('crypto');
const path = require('path');

// Helper: check if token is still valid
function isTokenValid(shareToken) {
    if (!shareToken.is_active) return { valid: false, reason: 'Link has been deactivated.' };
    if (shareToken.expires_at && new Date() > new Date(shareToken.expires_at)) {
        return { valid: false, reason: 'This share link has expired.' };
    }
    if (shareToken.max_downloads && shareToken.download_count >= shareToken.max_downloads) {
        return { valid: false, reason: 'Download limit reached for this link.' };
    }
    return { valid: true };
}

// POST /api/storage/share/:fileId - Generate a share link (file or folder)
exports.generateShareLink = async (req, res) => {
    try {
        const { fileId } = req.params;
        const { expires_in_days, max_downloads, label } = req.body;

        const file = await FileMetadata.findByPk(fileId);
        if (!file || file.is_deleted) {
            return res.status(404).json({ error: 'Item not found' });
        }

        let expires_at = null;
        if (expires_in_days) {
            expires_at = new Date();
            expires_at.setDate(expires_at.getDate() + parseInt(expires_in_days));
        }

        const shareToken = await ShareToken.create({
            token: crypto.randomUUID().replace(/-/g, ''),
            file_id: fileId,
            created_by: req.user?.id || null,
            expires_at,
            max_downloads: file.is_folder ? null : (max_downloads || null),
            label: label || file.original_name
        });

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        // Folders go to /share-folder/:token, files go to /share/:token
        const shareUrl = file.is_folder
            ? `${frontendUrl}/share-folder/${shareToken.token}`
            : `${frontendUrl}/share/${shareToken.token}`;

        res.json({
            success: true,
            token: shareToken.token,
            share_url: shareUrl,
            is_folder: file.is_folder,
            expires_at,
            label: shareToken.label
        });
    } catch (error) {
        console.error('Generate share link error:', error);
        res.status(500).json({ error: error.message });
    }
};

// GET /api/share/:token/info - Get file info for share page (no download, just metadata)
exports.getShareInfo = async (req, res) => {
    try {
        const { token } = req.params;

        const shareToken = await ShareToken.findOne({
            where: { token },
            include: [
                {
                    model: FileMetadata,
                    as: 'File',
                    include: [{ model: StorageServer, as: 'StorageServer' }]
                },
                { model: User, as: 'Creator', attributes: ['id', 'full_name', 'username'] }
            ]
        });

        if (!shareToken) return res.status(404).json({ error: 'Share link not found.' });

        const { valid, reason } = isTokenValid(shareToken);
        if (!valid) return res.status(410).json({ error: reason });

        const file = shareToken.File;
        res.json({
            filename: file.original_name,
            file_size: file.file_size,
            mime_type: file.mime_type,
            uploaded_at: file.createdAt,
            shared_by: shareToken.Creator?.full_name || shareToken.Creator?.username || 'System',
            label: shareToken.label,
            expires_at: shareToken.expires_at,
            downloads_remaining: shareToken.max_downloads
                ? shareToken.max_downloads - shareToken.download_count
                : null
        });
    } catch (error) {
        console.error('Share info error:', error);
        res.status(500).json({ error: error.message });
    }
};

// GET /api/share/:token/download - Actually download the file via share link
exports.downloadViaShareLink = async (req, res) => {
    try {
        const { token } = req.params;

        const shareToken = await ShareToken.findOne({
            where: { token },
            include: [{
                model: FileMetadata,
                as: 'File',
                include: [{ model: StorageServer, as: 'StorageServer' }]
            }]
        });

        if (!shareToken) return res.status(404).json({ error: 'Share link not found.' });

        const { valid, reason } = isTokenValid(shareToken);
        if (!valid) return res.status(410).json({ error: reason });

        const file = shareToken.File;

        // Increment download counter
        await shareToken.increment('download_count');

        let fileStream;
        if (file.server_id === null) {
            const fs = require('fs');
            const fullPath = path.join(process.cwd(), file.file_path);
            if (!fs.existsSync(fullPath)) return res.status(404).json({ error: 'File not found on server.' });
            fileStream = fs.createReadStream(fullPath);
        } else {
            try {
                fileStream = await storageAgentClient.downloadFile(file.StorageServer, file.file_path);
            } catch (agentErr) {
                if (agentErr.message?.includes('404')) {
                    return res.status(404).json({ error: 'File not found on storage server.' });
                }
                throw agentErr;
            }
        }

        res.setHeader('Content-Type', file.mime_type || 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.original_name)}"`);
        fileStream.pipe(res);
    } catch (error) {
        console.error('Share download error:', error);
        if (!res.headersSent) res.status(500).json({ error: error.message });
    }
};

// GET /api/share/:token/preview - Serve file inline for browser preview (no download count)
exports.previewViaShareLink = async (req, res) => {
    try {
        const { token } = req.params;

        const shareToken = await ShareToken.findOne({
            where: { token },
            include: [{
                model: FileMetadata,
                as: 'File',
                include: [{ model: StorageServer, as: 'StorageServer' }]
            }]
        });

        if (!shareToken) return res.status(404).json({ error: 'Share link not found.' });

        const { valid, reason } = isTokenValid(shareToken);
        if (!valid) return res.status(410).json({ error: reason });

        const file = shareToken.File;
        let fileStream;

        if (file.server_id === null) {
            const fs = require('fs');
            const fullPath = path.join(process.cwd(), file.file_path);
            if (!fs.existsSync(fullPath)) return res.status(404).json({ error: 'File not found.' });
            fileStream = fs.createReadStream(fullPath);
        } else {
            try {
                fileStream = await storageAgentClient.downloadFile(file.StorageServer, file.file_path);
            } catch (agentErr) {
                if (agentErr.message?.includes('404')) return res.status(404).json({ error: 'File not found on storage server.' });
                throw agentErr;
            }
        }

        // Serve inline (not as attachment)
        res.setHeader('Content-Type', file.mime_type || 'application/octet-stream');
        res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.original_name)}"`);
        res.setHeader('Cache-Control', 'private, max-age=300');
        fileStream.pipe(res);
    } catch (error) {
        console.error('Share preview error:', error);
        if (!res.headersSent) res.status(500).json({ error: error.message });
    }
};

// GET /api/storage/shares/:fileId - List shares for a file
exports.listFileShares = async (req, res) => {
    try {
        const { fileId } = req.params;
        const shares = await ShareToken.findAll({
            where: { file_id: fileId, is_active: true },
            order: [['createdAt', 'DESC']]
        });
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        res.json(shares.map(s => ({
            ...s.toJSON(),
            share_url: `${frontendUrl}/share/${s.token}`
        })));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// DELETE /api/storage/share/:shareId - Revoke a share link
exports.revokeShareLink = async (req, res) => {
    try {
        const { shareId } = req.params;
        await ShareToken.update({ is_active: false }, { where: { id: shareId } });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ============================================================
// FOLDER SHARE ENDPOINTS
// ============================================================

// Helper: get all files in a folder (non-recursive, direct children)
async function getFolderFiles(folderId) {
    return FileMetadata.findAll({
        where: { folder_id: folderId, is_deleted: false },
        include: [{ model: StorageServer, as: 'StorageServer' }],
        order: [['is_folder', 'DESC'], ['original_name', 'ASC']]
    });
}

// GET /api/share/:token/folder - Get folder info and its direct children
// Helper: recursively verify a folder belongs to the shared root
async function isDescendantOf(folderId, rootId) {
    if (folderId === rootId) return true;
    const folder = await FileMetadata.findByPk(folderId, { attributes: ['id', 'folder_id'] });
    if (!folder || folder.folder_id === null) return false;
    if (folder.folder_id === rootId) return true;
    return isDescendantOf(folder.folder_id, rootId);
}

exports.getFolderContents = async (req, res) => {
    try {
        const { token } = req.params;
        const { subfolder_id } = req.query; // optional: browse into a subfolder

        const shareToken = await ShareToken.findOne({
            where: { token },
            include: [{
                model: FileMetadata,
                as: 'File'
            }, { model: User, as: 'Creator', attributes: ['id', 'full_name', 'username'] }]
        });

        if (!shareToken) return res.status(404).json({ error: 'Share link not found.' });
        const { valid, reason } = isTokenValid(shareToken);
        if (!valid) return res.status(410).json({ error: reason });

        const rootFolder = shareToken.File;
        if (!rootFolder.is_folder) return res.status(400).json({ error: 'This link points to a file, not a folder.' });

        // Determine which folder to list
        let targetFolderId = rootFolder.id;
        let targetFolder = rootFolder;

        if (subfolder_id && parseInt(subfolder_id) !== rootFolder.id) {
            const isValid = await isDescendantOf(parseInt(subfolder_id), rootFolder.id);
            if (!isValid) return res.status(403).json({ error: 'Access denied to this subfolder.' });
            targetFolder = await FileMetadata.findByPk(subfolder_id, { attributes: ['id', 'original_name', 'folder_id'] });
            if (!targetFolder) return res.status(404).json({ error: 'Subfolder not found.' });
            targetFolderId = parseInt(subfolder_id);
        }

        const files = await getFolderFiles(targetFolderId);

        // Build breadcrumb from targetFolder up to root
        const breadcrumb = [];
        let cur = targetFolder;
        while (cur && cur.id !== rootFolder.id) {
            breadcrumb.unshift({ id: cur.id, name: cur.original_name });
            if (!cur.folder_id) break;
            cur = await FileMetadata.findByPk(cur.folder_id, { attributes: ['id', 'original_name', 'folder_id'] });
        }
        breadcrumb.unshift({ id: rootFolder.id, name: shareToken.label || rootFolder.original_name });

        res.json({
            folder: {
                id: rootFolder.id,
                name: shareToken.label || rootFolder.original_name,
                current_id: targetFolderId,
                expires_at: shareToken.expires_at,
                shared_by: shareToken.Creator?.full_name || shareToken.Creator?.username || 'System',
            },
            breadcrumb,
            files: files.map(f => ({
                id: f.id,
                original_name: f.original_name,
                mime_type: f.mime_type,
                file_size: f.file_size,
                is_folder: f.is_folder,
                createdAt: f.createdAt
            }))
        });
    } catch (error) {
        console.error('Folder contents error:', error);
        res.status(500).json({ error: error.message });
    }
};

// GET /api/share/:token/folder/file/:fileId - Download a single file from shared folder (any depth)
exports.downloadFolderFile = async (req, res) => {
    try {
        const { token, fileId } = req.params;
        const shareToken = await ShareToken.findOne({
            where: { token },
            include: [{ model: FileMetadata, as: 'File' }]
        });

        if (!shareToken) return res.status(404).json({ error: 'Share link not found.' });
        const { valid, reason } = isTokenValid(shareToken);
        if (!valid) return res.status(410).json({ error: reason });

        // Verify the file is a descendant of the shared root
        const file = await FileMetadata.findOne({
            where: { id: fileId, is_deleted: false, is_folder: false },
            include: [{ model: StorageServer, as: 'StorageServer' }]
        });
        if (!file) return res.status(404).json({ error: 'File not found.' });

        const isSafe = file.folder_id === shareToken.File.id || await isDescendantOf(file.folder_id, shareToken.File.id);
        if (!isSafe) return res.status(403).json({ error: 'Access denied.' });

        let fileStream;
        if (file.server_id === null) {
            const fs = require('fs');
            const fullPath = path.join(process.cwd(), file.file_path);
            if (!fs.existsSync(fullPath)) return res.status(404).json({ error: 'File not found on server.' });
            fileStream = fs.createReadStream(fullPath);
        } else {
            try {
                fileStream = await storageAgentClient.downloadFile(file.StorageServer, file.file_path);
            } catch (agentErr) {
                if (agentErr.message?.includes('404')) return res.status(404).json({ error: 'File not found on storage server.' });
                throw agentErr;
            }
        }

        res.setHeader('Content-Type', file.mime_type || 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.original_name)}"`);
        fileStream.pipe(res);
    } catch (error) {
        console.error('Folder file download error:', error);
        if (!res.headersSent) res.status(500).json({ error: error.message });
    }
};

// GET /api/share/:token/folder/zip - Download entire folder as ZIP
exports.downloadFolderZip = async (req, res) => {
    try {
        const { token } = req.params;
        const shareToken = await ShareToken.findOne({
            where: { token },
            include: [{ model: FileMetadata, as: 'File' }]
        });

        if (!shareToken) return res.status(404).json({ error: 'Share link not found.' });
        const { valid, reason } = isTokenValid(shareToken);
        if (!valid) return res.status(410).json({ error: reason });

        const folder = shareToken.File;
        if (!folder.is_folder) return res.status(400).json({ error: 'Not a folder.' });

        const files = await getFolderFiles(folder.id);
        const fileOnly = files.filter(f => !f.is_folder);

        const archiver = require('archiver');
        const folderName = shareToken.label || folder.original_name;

        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(folderName)}.zip"`);

        const archive = archiver('zip', { zlib: { level: 5 } });
        archive.on('error', (err) => { if (!res.headersSent) res.status(500).end(); });
        archive.pipe(res);

        for (const file of fileOnly) {
            try {
                let fileStream;
                if (file.server_id === null) {
                    const fs = require('fs');
                    const fullPath = path.join(process.cwd(), file.file_path);
                    if (fs.existsSync(fullPath)) fileStream = fs.createReadStream(fullPath);
                } else {
                    fileStream = await storageAgentClient.downloadFile(file.StorageServer, file.file_path);
                }
                if (fileStream) archive.append(fileStream, { name: file.original_name });
            } catch (_) { /* Skip files that fail */ }
        }

        await archive.finalize();
    } catch (error) {
        console.error('ZIP download error:', error);
        if (!res.headersSent) res.status(500).json({ error: error.message });
    }
};
