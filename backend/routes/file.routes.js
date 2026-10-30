import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth.js';

import {
    getFiles,
    getFile,
    createFile,
    updateFile,
    deleteFile,
    uploadFile,
    downloadFile,
    getFileVersionsHandler,
    getFileVersionHandler,
    restoreFileVersionHandler,
    getFileConflictsHandler,
    resolveFileConflictHandler,
    getOpenConflictsHandler,
    shareFileHandler,
    revokeShareHandler,
    getFilePermissionsHandler
} from '../controllers/file.controller.js';

const fileRoutes = new Hono();

// Protect all file endpoints with authentication
fileRoutes.use('*', requireAuth);

// List & search (filtered by user / admin)
fileRoutes.get('/', getFiles);

// Conflicts (global open list)
fileRoutes.get('/conflicts', getOpenConflictsHandler);

// File permissions and sharing
fileRoutes.get('/:id/permissions', getFilePermissionsHandler);
fileRoutes.post('/:id/share', shareFileHandler);
fileRoutes.delete('/:id/share/:targetUserId', revokeShareHandler);

// File-specific endpoints
fileRoutes.get('/:id/download', downloadFile);
fileRoutes.get('/:id/versions', getFileVersionsHandler);
fileRoutes.get('/:id/versions/:version', getFileVersionHandler);
fileRoutes.get('/:id/conflicts', getFileConflictsHandler);
fileRoutes.get('/:id', getFile);

// Create & upload
fileRoutes.post('/', createFile);
fileRoutes.post('/upload', uploadFile);

// Conflict resolution
fileRoutes.post('/:id/resolve-conflict', resolveFileConflictHandler);

// Version restore
fileRoutes.post('/:id/versions/:version/restore', restoreFileVersionHandler);

// Update & delete
fileRoutes.put('/:id', updateFile);
fileRoutes.delete('/:id', deleteFile);

export default fileRoutes;
