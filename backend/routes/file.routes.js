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
    getFileConflictsHandler,
    resolveFileConflictHandler
} from '../controllers/file.controller.js';

const fileRoutes = new Hono();

fileRoutes.get('/', getFiles);
fileRoutes.get('/:id/download', downloadFile);
fileRoutes.get('/:id/versions', getFileVersionsHandler);
fileRoutes.get('/:id/conflicts', getFileConflictsHandler);
fileRoutes.get('/:id', getFile);

fileRoutes.post('/', createFile);
fileRoutes.post('/upload', uploadFile);
fileRoutes.post('/:id/resolve-conflict', resolveFileConflictHandler);

fileRoutes.put('/:id', updateFile);
fileRoutes.delete('/:id', deleteFile);

export default fileRoutes;