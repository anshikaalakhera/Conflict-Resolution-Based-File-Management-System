import {
    getAllFiles,
    getFileById,
    createNewFile,
    updateExistingFile,
    updateFileContent,
    deleteFileById,
    createUploadedFileRecord,
    getFileVersions,
    getFileVersion,
    restoreFileVersion,
    getFileConflicts,
    resolveFileConflict,
    getOpenConflicts
} from '../services/file.service.js';

import {
    saveFile,
    readStoredFile,
    deleteStoredFile
} from '../services/storage.service.js';

import { createOperation } from '../services/operation.service.js';

export const getFiles = async (c) => {
    try {
        const files = await getAllFiles();
        return c.json({ message: 'Files retrieved successfully', files });
    } catch (error) {
        console.error('Error retrieving files:', error);
        return c.json({ message: 'Failed to retrieve files', error: error.message }, 500);
    }
};

export const getFile = async (c) => {
    try {
        const id = c.req.param('id');
        const file = await getFileById(id);
        if (!file) return c.json({ message: 'File not found' }, 404);
        return c.json({ message: 'File retrieved successfully', file });
    } catch (error) {
        console.error('Error retrieving file:', error);
        return c.json({ message: 'Failed to retrieve file', error: error.message }, 500);
    }
};

export const createFile = async (c) => {
    try {
        const body = await c.req.json();
        const file = await createNewFile(body);
        return c.json({ message: 'File created successfully', file }, 201);
    } catch (error) {
        console.error('Error creating file:', error);
        return c.json({ message: 'Failed to create file', error: error.message }, 500);
    }
};

export const updateFile = async (c) => {
    try {
        const id = c.req.param('id');
        const body = await c.req.json();

        // If this is a content update with version tracking
        if (body.file_path && body.base_version_number !== undefined) {
            const userId = body.user_id || body.owner_id || 1;
            const result = await updateFileContent(Number(id), {
                file_path: body.file_path,
                file_size_bytes: body.file_size_bytes,
                mime_type: body.mime_type,
                base_version_number: body.base_version_number,
                user_id: userId,
                change_summary: body.change_summary
            });

            if (result.conflict) {
                return c.json({
                    message: result.conflict.message,
                    file: result.file,
                    conflict: result.conflict
                }, 409);
            }

            return c.json({
                message: `File updated to version ${result.newVersion}`,
                file: result.file,
                new_version: result.newVersion
            });
        }

        // Metadata-only update (rename, move, status change)
        const file = await updateExistingFile(id, body);
        if (!file) return c.json({ message: 'File not found' }, 404);
        return c.json({ message: 'File updated successfully', file });
    } catch (error) {
        console.error('Error updating file:', error);
        return c.json({ message: 'Failed to update file', error: error.message }, 500);
    }
};

export const uploadFile = async (c) => {
    let storedFile = null;
    try {
        const body = await c.req.parseBody();
        const file = body.file;

        if (!file || typeof file === 'string') {
            return c.json({ message: 'No file provided' }, 400);
        }

        storedFile = await saveFile(file);

        const ownerId = Number(body.owner_id || body.userId || 1);
        const folderId = (body.folder_id != null && body.folder_id !== '' && body.folder_id !== 'root')
            ? Number(body.folder_id) : null;

        // Check if this is an update to an existing file (re-upload)
        const existingFileId = body.file_id ? Number(body.file_id) : null;
        const baseVersion = body.base_version_number ? Number(body.base_version_number) : null;

        const operation = await createOperation({
            user_id: ownerId,
            file_id: existingFileId,
            operation_type: existingFileId ? 'EDIT' : 'UPLOAD',
            priority: 1,
            details: {
                stagedFilePath: storedFile.path,
                originalName: storedFile.originalName,
                fileSize: storedFile.size,
                mimeType: storedFile.type || 'application/octet-stream',
                folderId: folderId,
                base_version_number: baseVersion
            }
        });

        return c.json({
            message: 'File staged successfully; submit the operation to the OS layer to queue it',
            operation
        }, 201);
    } catch (error) {
        if (storedFile?.path) {
            try { await deleteStoredFile(storedFile.path); }
            catch (cleanupError) { console.error('Could not clean up staged upload:', cleanupError); }
        }
        console.error('Error staging upload:', error);
        return c.json({ message: 'Failed to stage upload', error: error.message }, 500);
    }
};

export const deleteFile = async (c) => {
    try {
        const id = c.req.param('id');
        const file = await getFileById(id);
        if (!file) return c.json({ message: 'File not found' }, 404);

        // Try to delete physical file
        try { await deleteStoredFile(file.file_path); } catch {}

        // Also delete version files (best-effort)
        const versionsData = await getFileVersions(id);
        if (versionsData?.versions) {
            for (const v of versionsData.versions) {
                if (v.file_path && v.file_path !== file.file_path) {
                    try { await deleteStoredFile(v.file_path); } catch {}
                }
            }
        }

        const result = await deleteFileById(id);

        // Record operation
        try {
            await createOperation({
                user_id: file.owner_id,
                file_id: null, // file is deleted
                operation_type: 'DELETE',
                priority: 1,
                details: { deletedFileName: file.file_name, deletedFileId: file.file_id }
            });
        } catch {}

        return c.json({ message: 'File deleted successfully', result });
    } catch (error) {
        console.error('Error deleting file:', error);
        return c.json({ message: 'Failed to delete file', error: error.message }, 500);
    }
};

export const downloadFile = async (c) => {
    try {
        const id = c.req.param('id');
        const versionParam = c.req.query('version');
        const file = await getFileById(id);
        if (!file) return c.json({ message: 'File not found' }, 404);

        let filePath = file.file_path;
        let fileName = file.file_name;
        let mimeType = file.mime_type;

        // If a specific version is requested, serve that version's file
        if (versionParam) {
            const version = await getFileVersion(Number(id), Number(versionParam));
            if (version) {
                filePath = version.file_path;
                mimeType = version.mime_type || mimeType;
                fileName = `v${version.version_number}_${file.file_name}`;
            }
        }

        const fileData = await readStoredFile(filePath);
        return new Response(fileData, {
            headers: {
                'Content-Type': mimeType || 'application/octet-stream',
                'Content-Disposition': `attachment; filename="${fileName}"`
            }
        });
    } catch (error) {
        console.error('Error downloading file:', error);
        return c.json({ message: 'Failed to download file', error: error.message }, 500);
    }
};

export const getFileVersionsHandler = async (c) => {
    try {
        const id = Number(c.req.param('id'));
        const result = await getFileVersions(id);
        if (!result) return c.json({ message: 'File not found' }, 404);
        return c.json({ message: 'File versions retrieved successfully', ...result });
    } catch (error) {
        console.error('Error retrieving file versions:', error);
        return c.json({ message: 'Failed to retrieve file versions', error: error.message }, 500);
    }
};

export const getFileVersionHandler = async (c) => {
    try {
        const fileId = Number(c.req.param('id'));
        const versionNumber = Number(c.req.param('version'));
        const version = await getFileVersion(fileId, versionNumber);
        if (!version) return c.json({ message: 'Version not found' }, 404);
        return c.json({ message: 'Version retrieved', version });
    } catch (error) {
        console.error('Error retrieving version:', error);
        return c.json({ message: 'Failed to retrieve version', error: error.message }, 500);
    }
};

export const restoreFileVersionHandler = async (c) => {
    try {
        const fileId = Number(c.req.param('id'));
        const versionNumber = Number(c.req.param('version'));
        const body = await c.req.json().catch(() => ({}));
        const userId = body.user_id || 1;
        const result = await restoreFileVersion(fileId, versionNumber, userId);
        return c.json({ message: `Restored version ${versionNumber}`, ...result });
    } catch (error) {
        console.error('Error restoring version:', error);
        return c.json({ message: 'Failed to restore version', error: error.message }, 500);
    }
};

export const getFileConflictsHandler = async (c) => {
    try {
        const id = Number(c.req.param('id'));
        const result = await getFileConflicts(id);
        if (!result) return c.json({ message: 'File not found' }, 404);
        return c.json({ message: 'File conflict status retrieved successfully', ...result });
    } catch (error) {
        console.error('Error retrieving file conflicts:', error);
        return c.json({ message: 'Failed to retrieve file conflicts', error: error.message }, 500);
    }
};

export const resolveFileConflictHandler = async (c) => {
    try {
        const id = Number(c.req.param('id'));
        const body = await c.req.json();
        const strategy = body.strategy || 'KEEP_CURRENT';
        const resolvedByUserId = Number(body.user_id || 1);
        const conflictId = body.conflict_id ? Number(body.conflict_id) : null;

        const result = await resolveFileConflict(id, { strategy, resolvedByUserId, conflict_id: conflictId });
        return c.json({ message: result.message, ...result });
    } catch (error) {
        console.error('Error resolving file conflict:', error);
        return c.json({ message: 'Failed to resolve file conflict', error: error.message }, 500);
    }
};

export const getOpenConflictsHandler = async (c) => {
    try {
        const conflicts = await getOpenConflicts();
        return c.json({ message: 'Open conflicts retrieved', conflicts, count: conflicts.length });
    } catch (error) {
        console.error('Error retrieving open conflicts:', error);
        return c.json({ message: 'Failed to retrieve conflicts', error: error.message }, 500);
    }
};
