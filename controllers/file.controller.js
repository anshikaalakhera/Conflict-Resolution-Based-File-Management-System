import {
    getAllFiles,
    getFileById,
    createNewFile,
    updateExistingFile,
    deleteFileById,
    createUploadedFileRecord
} from '../services/file.service.js';

import {
    saveFile,
    readStoredFile,
    deleteStoredFile
}from '../services/storage.service.js';

export const getFiles = async (c) => {
    try {
        const files = await getAllFiles();

        return c.json({
            message: 'Files retrieved successfully',
            files
        });
    } catch (error) {
        console.error('Error retrieving files:', error);

        return c.json({
            message: 'Failed to retrieve files',
            error: error.message
        }, 500);
    }
};

export const getFile = async (c) => {
    try {
        const id = c.req.param('id');
        const file = await getFileById(id);

        return c.json({
            message: 'File retrieved successfully',
            file
        });
    } catch (error) {
        console.error('Error retrieving file:', error);

        return c.json({
            message: 'Failed to retrieve file',
            error: error.message
        }, 500);
    }
};

export const createFile = async (c) => {
    try {
        const body = await c.req.json();

        const file = await createNewFile(body);

        return c.json({
            message: 'File created successfully',
            file
        }, 201);
    } catch (error) {
        console.error('Error creating file:', error);

        return c.json({
            message: 'Failed to create file',
            error: error.message
        }, 500);
    }
};

export const updateFile = async (c) => {
    try {
        const id = c.req.param('id');
        const body = await c.req.json();

        const file = await updateExistingFile(id, body);

        if (!file) {
            return c.json({
                message: 'File not found'
            }, 404);
        }

        return c.json({
            message: 'File updated successfully',
            file
        });

    } catch (error) {
        console.error('Error updating file:', error);

        return c.json({
            message: 'Failed to update file',
            error: error.message
        }, 500);
    }
};

export const uploadFile = async (c) => {
    try {
        const body = await c.req.parseBody();
        const file = body.file;

        if (!file || typeof file === 'string') {
            return c.json({
                message: 'No file provided'
            }, 400);
        }

        const storedFile = await saveFile(file);

        const ownerId = 1;

        const databaseFile = await createUploadedFileRecord({
            fileName: storedFile.originalName,
            ownerId,
            fileSize: storedFile.size,
            filePath: storedFile.path,
            mimeType: storedFile.type || 'application/octet-stream'
        });

        return c.json({
            message: 'File uploaded successfully',
            file: databaseFile
        }, 201);

    } catch (error) {
        console.error('Error uploading file:', error);

        return c.json({
            message: 'Failed to upload file',
            error: error.message
        }, 500);
    }
};

export const deleteFile = async (c) => {
    try {
        const id = c.req.param('id');

        const file = await getFileById(id);

        if (!file) {
            return c.json({
                message: 'File not found'
            }, 404);
        }

        await deleteStoredFile(file.file_path);

        const result = await deleteFileById(id);

        return c.json({
            message: 'File deleted successfully',
            result
        });

    } catch (error) {
        console.error('Error deleting file:', error);

        return c.json({
            message: 'Failed to delete file',
            error: error.message
        }, 500);
    }
};

export const downloadFile = async (c) => {
    try {
        const id = c.req.param('id');

        const file = await getFileById(id);

        if (!file) {
            return c.json({
                message: 'File not found'
            }, 404);
        }

        const fileData = await readStoredFile(file.file_path);

        return new Response(fileData, {
            headers: {
                'Content-Type': file.mime_type || 'application/octet-stream',
                'Content-Disposition': `attachment; filename="${file.file_name}"`
            }
        });

    } catch (error) {
        console.error('Error downloading file:', error);

        return c.json({
            message: 'Failed to download file',
            error: error.message
        }, 500);
    }
};