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
    getOpenConflicts,
    shareFile,
    revokeFileShare,
    getFilePermissions
} from '../services/file.service.js';

import {
    saveFile,
    readStoredFile,
    deleteStoredFile
} from '../services/storage.service.js';

import { createOperation } from '../services/operation.service.js';
import { canAccessFile } from '../middleware/auth.js';

export const getFiles = async (c) => {
    try {
        const user = c.get('user');
        const userId = user ? user.user_id : null;
        const role = user ? user.role : null;
        const files = await getAllFiles(userId, role);
        return c.json({ message: 'Files retrieved successfully', files });
    } catch (error) {
        console.error('Error retrieving files:', error);
        return c.json({ message: 'Failed to retrieve files', error: error.message }, 500);
    }
};

export const getFile = async (c) => {
    try {
        const id = Number(c.req.param('id'));
        if (isNaN(id)) return c.json({ message: 'Invalid file ID' }, 400);

        const user = c.get('user');
        if (user) {
            const allowed = await canAccessFile(user.user_id, id, 'READ');
            if (!allowed) {
                return c.json({ message: 'Access denied: you do not have permission to view this file' }, 403);
            }
        }

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
        const user = c.get('user');
        if (user) {
            body.owner_id = user.user_id;
        }
        const file = await createNewFile(body);
        return c.json({ message: 'File created successfully', file }, 201);
    } catch (error) {
        console.error('Error creating file:', error);
        return c.json({ message: 'Failed to create file', error: error.message }, 500);
    }
};

export const updateFile = async (c) => {
    try {
        const id = Number(c.req.param('id'));
        if (isNaN(id)) return c.json({ message: 'Invalid file ID' }, 400);

        const user = c.get('user');
        if (user) {
            const allowed = await canAccessFile(user.user_id, id, 'WRITE');
            if (!allowed) {
                return c.json({ message: 'Access denied: write permission required' }, 403);
            }
        }

        const body = await c.req.json();
        const effectiveUserId = user ? user.user_id : (body.user_id || body.owner_id || 1);

        // If this is a content update with version tracking
        if (body.file_path && body.base_version_number !== undefined) {
            const result = await updateFileContent(id, {
                file_path: body.file_path,
                file_size_bytes: body.file_size_bytes,
                mime_type: body.mime_type,
                base_version_number: body.base_version_number,
                user_id: effectiveUserId,
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

        const user = c.get('user');
        const ownerId = user ? user.user_id : Number(body.owner_id || body.userId || 1);
        const folderId = (body.folder_id != null && body.folder_id !== '' && body.folder_id !== 'root')
            ? Number(body.folder_id) : null;

        // Check if this is an update to an existing file (re-upload)
        const existingFileId = body.file_id ? Number(body.file_id) : null;
        if (existingFileId && user) {
            const allowed = await canAccessFile(user.user_id, existingFileId, 'WRITE');
            if (!allowed) {
                return c.json({ message: 'Access denied: write permission required' }, 403);
            }
        }

        storedFile = await saveFile(file);
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
        const id = Number(c.req.param('id'));
        if (isNaN(id)) return c.json({ message: 'Invalid file ID' }, 400);

        const file = await getFileById(id);
        if (!file) return c.json({ message: 'File not found' }, 404);

        const user = c.get('user');
        if (user && user.role !== 'ADMIN' && file.owner_id !== user.user_id) {
            return c.json({ message: 'Access denied: only owner or administrator can delete this file' }, 403);
        }

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
                user_id: user ? user.user_id : file.owner_id,
                file_id: null,
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
        const id = Number(c.req.param('id'));
        if (isNaN(id)) return c.json({ message: 'Invalid file ID' }, 400);

        const user = c.get('user');
        if (user) {
            const allowed = await canAccessFile(user.user_id, id, 'READ');
            if (!allowed) {
                return c.json({ message: 'Access denied: read permission required' }, 403);
            }
        }

        const versionParam = c.req.query('version');
        const file = await getFileById(id);
        if (!file) return c.json({ message: 'File not found' }, 404);

        let filePath = file.file_path;
        let fileName = file.file_name;
        let mimeType = file.mime_type;

        // If a specific version is requested, serve that version's file
        if (versionParam) {
            const version = await getFileVersion(id, Number(versionParam));
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
        if (isNaN(id)) return c.json({ message: 'Invalid file ID' }, 400);

        const user = c.get('user');
        if (user) {
            const allowed = await canAccessFile(user.user_id, id, 'READ');
            if (!allowed) {
                return c.json({ message: 'Access denied: read permission required' }, 403);
            }
        }

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
        if (isNaN(fileId) || isNaN(versionNumber)) return c.json({ message: 'Invalid ID or version' }, 400);

        const user = c.get('user');
        if (user) {
            const allowed = await canAccessFile(user.user_id, fileId, 'READ');
            if (!allowed) {
                return c.json({ message: 'Access denied: read permission required' }, 403);
            }
        }

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
        if (isNaN(fileId) || isNaN(versionNumber)) return c.json({ message: 'Invalid ID or version' }, 400);

        const user = c.get('user');
        if (user) {
            const allowed = await canAccessFile(user.user_id, fileId, 'WRITE');
            if (!allowed) {
                return c.json({ message: 'Access denied: write permission required to restore' }, 403);
            }
        }

        const body = await c.req.json().catch(() => ({}));
        const userId = user ? user.user_id : (body.user_id || 1);
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
        if (isNaN(id)) return c.json({ message: 'Invalid file ID' }, 400);

        const user = c.get('user');
        if (user) {
            const allowed = await canAccessFile(user.user_id, id, 'READ');
            if (!allowed) {
                return c.json({ message: 'Access denied: read permission required' }, 403);
            }
        }

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
        if (isNaN(id)) return c.json({ message: 'Invalid file ID' }, 400);

        const user = c.get('user');
        if (user) {
            const allowed = await canAccessFile(user.user_id, id, 'WRITE');
            if (!allowed) {
                return c.json({ message: 'Access denied: write permission required to resolve conflict' }, 403);
            }
        }

        const body = await c.req.json();
        const strategy = body.strategy || 'KEEP_CURRENT';
        const resolvedByUserId = user ? user.user_id : Number(body.user_id || 1);
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

// ---------------------------------------------------------------------------
// File Sharing Handlers
// ---------------------------------------------------------------------------

export const shareFileHandler = async (c) => {
    try {
        const fileId = Number(c.req.param('id'));
        if (isNaN(fileId)) return c.json({ message: 'Invalid file ID' }, 400);

        const user = c.get('user');
        if (!user) return c.json({ message: 'Authentication required' }, 401);

        const body = await c.req.json();
        const result = await shareFile(fileId, user.user_id, body);
        return c.json({ message: 'File shared successfully', ...result }, 200);
    } catch (error) {
        console.error('Error sharing file:', error);
        const status = error.message.includes('not found') ? 404 :
                       error.message.includes('administrator') ? 403 : 400;
        return c.json({ message: error.message }, status);
    }
};

export const revokeShareHandler = async (c) => {
    try {
        const fileId = Number(c.req.param('id'));
        const targetUserId = Number(c.req.param('targetUserId'));
        if (isNaN(fileId) || isNaN(targetUserId)) return c.json({ message: 'Invalid IDs' }, 400);

        const user = c.get('user');
        if (!user) return c.json({ message: 'Authentication required' }, 401);

        const result = await revokeFileShare(fileId, user.user_id, targetUserId);
        return c.json({ message: 'Share permission revoked successfully', ...result }, 200);
    } catch (error) {
        console.error('Error revoking file share:', error);
        const status = error.message.includes('not found') ? 404 :
                       error.message.includes('administrator') ? 403 : 400;
        return c.json({ message: error.message }, status);
    }
};

export const getFilePermissionsHandler = async (c) => {
    try {
        const fileId = Number(c.req.param('id'));
        if (isNaN(fileId)) return c.json({ message: 'Invalid file ID' }, 400);

        const user = c.get('user');
        if (user) {
            const allowed = await canAccessFile(user.user_id, fileId, 'READ');
            if (!allowed) return c.json({ message: 'Access denied' }, 403);
        }

        const permissions = await getFilePermissions(fileId);
        return c.json({ permissions });
    } catch (error) {
        console.error('Error fetching file permissions:', error);
        return c.json({ message: 'Failed to retrieve permissions', error: error.message }, 500);
    }
};
