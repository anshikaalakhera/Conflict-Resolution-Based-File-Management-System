import { Hono } from 'hono';

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
    getOpenConflictsHandler
} from '../controllers/file.controller.js';

const fileRoutes = new Hono();

// List & search
fileRoutes.get('/', getFiles);

// Conflicts (global list)
fileRoutes.get('/conflicts', getOpenConflictsHandler);

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
