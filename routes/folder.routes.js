import { Hono } from 'hono';
import pool from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';

const folderRoutes = new Hono();

// Enforce authentication on all folder endpoints
folderRoutes.use('*', requireAuth);

// GET /api/folders - List folders accessible to the authenticated user
folderRoutes.get('/', async (c) => {
    try {
        const user = c.get('user');
        const isAdmin = user.role === 'ADMIN';

        let query = `
            SELECT
                f.folder_id,
                f.folder_name,
                f.parent_folder_id,
                f.owner_id,
                f.created_at,
                f.updated_at,
                u.username AS owner_name
            FROM FOLDERS f
            JOIN USERS u ON f.owner_id = u.user_id
        `;
        const params = [];

        if (!isAdmin) {
            query += ` WHERE f.owner_id = ? `;
            params.push(user.user_id);
        }

        query += ` ORDER BY f.folder_name ASC `;

        const [folders] = await pool.query(query, params);

        return c.json({
            message: 'Folders retrieved successfully',
            folders
        });
    } catch (error) {
        console.error('Error retrieving folders:', error);
        return c.json({
            message: 'Failed to retrieve folders',
            error: error.message
        }, 500);
    }
});

// GET /api/folders/:id - Get specific folder details, its subfolders and accessible files
folderRoutes.get('/:id', async (c) => {
    try {
        const id = Number(c.req.param('id'));
        if (isNaN(id)) {
            return c.json({ message: 'Invalid folder ID' }, 400);
        }

        const user = c.get('user');
        const isAdmin = user.role === 'ADMIN';

        const [folders] = await pool.query(`
            SELECT
                f.folder_id,
                f.folder_name,
                f.parent_folder_id,
                f.owner_id,
                f.created_at,
                f.updated_at,
                u.username AS owner_name
            FROM FOLDERS f
            JOIN USERS u ON f.owner_id = u.user_id
            WHERE f.folder_id = ?
        `, [id]);

        if (!folders || folders.length === 0) {
            return c.json({ message: 'Folder not found' }, 404);
        }

        const folder = folders[0];

        // Access check: only owner or administrator may view folder contents
        if (!isAdmin && folder.owner_id !== user.user_id) {
            return c.json({ message: 'Access denied: you do not have permission to access this folder' }, 403);
        }

        // Fetch subfolders accessible to user
        let subfolderQuery = `
            SELECT
                f.folder_id,
                f.folder_name,
                f.parent_folder_id,
                f.owner_id,
                f.created_at,
                f.updated_at,
                u.username AS owner_name
            FROM FOLDERS f
            JOIN USERS u ON f.owner_id = u.user_id
            WHERE f.parent_folder_id = ?
        `;
        const subfolderParams = [id];
        if (!isAdmin) {
            subfolderQuery += ` AND f.owner_id = ? `;
            subfolderParams.push(user.user_id);
        }
        subfolderQuery += ` ORDER BY f.folder_name ASC `;
        const [subfolders] = await pool.query(subfolderQuery, subfolderParams);

        // Fetch files inside this folder accessible to user
        let filesQuery;
        let filesParams;

        if (isAdmin) {
            filesQuery = `
                SELECT
                    file_id, file_name, folder_id, owner_id,
                    file_size_bytes, file_path, mime_type, status,
                    created_at, updated_at
                FROM FILES
                WHERE folder_id = ?
                ORDER BY created_at DESC
            `;
            filesParams = [id];
        } else {
            filesQuery = `
                SELECT
                    f.file_id, f.file_name, f.folder_id, f.owner_id,
                    f.file_size_bytes, f.file_path, f.mime_type, f.status,
                    f.created_at, f.updated_at
                FROM FILES f
                LEFT JOIN FILE_PERMISSIONS fp
                       ON fp.file_id = f.file_id
                      AND fp.user_id = ?
                      AND (fp.expires_at IS NULL OR fp.expires_at > NOW())
                WHERE f.folder_id = ?
                  AND (f.owner_id = ? OR fp.user_id = ?)
                ORDER BY f.created_at DESC
            `;
            filesParams = [user.user_id, id, user.user_id, user.user_id];
        }

        const [files] = await pool.query(filesQuery, filesParams);

        return c.json({
            message: 'Folder details retrieved successfully',
            folder,
            subfolders,
            files
        });
    } catch (error) {
        console.error('Error retrieving folder details:', error);
        return c.json({
            message: 'Failed to retrieve folder details',
            error: error.message
        }, 500);
    }
});

// POST /api/folders - Create a new folder
folderRoutes.post('/', async (c) => {
    try {
        const body = await c.req.json();
        const user = c.get('user');
        const folderName = typeof body.folder_name === 'string' ? body.folder_name.trim() : '';
        const parentFolderId = (body.parent_folder_id != null && body.parent_folder_id !== '') ? Number(body.parent_folder_id) : null;

        // Owner ID is strictly derived from the authenticated session
        const ownerId = user.user_id;
        const isAdmin = user.role === 'ADMIN';

        if (!folderName) {
            return c.json({
                message: 'folder_name is required and must not be empty'
            }, 400);
        }

        // Validate parent_folder_id if provided
        if (parentFolderId != null) {
            const [parent] = await pool.query(
                'SELECT folder_id, owner_id FROM FOLDERS WHERE folder_id = ?',
                [parentFolderId]
            );
            if (!parent || parent.length === 0) {
                return c.json({
                    message: `Parent folder #${parentFolderId} does not exist`
                }, 400);
            }

            // User must own the parent folder or be admin
            if (!isAdmin && parent[0].owner_id !== user.user_id) {
                return c.json({
                    message: 'Access denied: cannot create subfolders inside another user\'s folder'
                }, 403);
            }
        }

        const [result] = await pool.query(
            `INSERT INTO FOLDERS (folder_name, parent_folder_id, owner_id)
             VALUES (?, ?, ?)`,
            [folderName, parentFolderId, ownerId]
        );

        const [created] = await pool.query(
            `SELECT f.folder_id, f.folder_name, f.parent_folder_id, f.owner_id,
                    f.created_at, f.updated_at, u.username AS owner_name
             FROM FOLDERS f
             JOIN USERS u ON f.owner_id = u.user_id
             WHERE f.folder_id = ?`,
            [result.insertId]
        );

        return c.json({
            message: 'Folder created successfully',
            folder: created[0]
        }, 201);
    } catch (error) {
        console.error('Error creating folder:', error);
        return c.json({
            message: 'Failed to create folder',
            error: error.message
        }, 500);
    }
});

// PUT /api/folders/:id - Rename folder or change parent folder
folderRoutes.put('/:id', async (c) => {
    try {
        const id = Number(c.req.param('id'));
        if (isNaN(id)) {
            return c.json({ message: 'Invalid folder ID' }, 400);
        }

        const [existing] = await pool.query(
            'SELECT folder_id, folder_name, parent_folder_id, owner_id FROM FOLDERS WHERE folder_id = ?',
            [id]
        );

        if (!existing || existing.length === 0) {
            return c.json({ message: 'Folder not found' }, 404);
        }

        const currentFolder = existing[0];
        const user = c.get('user');
        const isAdmin = user.role === 'ADMIN';

        if (!isAdmin && currentFolder.owner_id !== user.user_id) {
            return c.json({ message: 'Access denied: only owner or administrator can edit this folder' }, 403);
        }

        const body = await c.req.json();

        let newName = currentFolder.folder_name;
        if (body.folder_name !== undefined) {
            newName = typeof body.folder_name === 'string' ? body.folder_name.trim() : '';
            if (!newName) {
                return c.json({ message: 'folder_name cannot be empty' }, 400);
            }
        }

        let newParentId = currentFolder.parent_folder_id;
        if (body.parent_folder_id !== undefined) {
            newParentId = (body.parent_folder_id != null && body.parent_folder_id !== '') ? Number(body.parent_folder_id) : null;
        }

        // Prevent setting parent to itself
        if (newParentId === id) {
            return c.json({ message: 'A folder cannot be its own parent' }, 400);
        }

        // Validate target parent folder
        if (newParentId != null) {
            const [targetParent] = await pool.query(
                'SELECT folder_id, owner_id FROM FOLDERS WHERE folder_id = ?',
                [newParentId]
            );
            if (!targetParent || targetParent.length === 0) {
                return c.json({ message: `Target parent folder #${newParentId} does not exist` }, 400);
            }
            if (!isAdmin && targetParent[0].owner_id !== user.user_id) {
                return c.json({ message: 'Access denied: cannot move folder into another user\'s folder' }, 403);
            }

            // Prevent cycles in folder hierarchy
            let cursor = newParentId;
            while (cursor != null) {
                if (cursor === id) {
                    return c.json({ message: 'Cannot move folder into one of its subfolders (cycle detected)' }, 400);
                }
                const [ancestor] = await pool.query(
                    'SELECT parent_folder_id FROM FOLDERS WHERE folder_id = ?',
                    [cursor]
                );
                if (!ancestor || ancestor.length === 0) break;
                cursor = ancestor[0].parent_folder_id;
            }
        }

        await pool.query(
            `UPDATE FOLDERS
             SET folder_name = ?, parent_folder_id = ?
             WHERE folder_id = ?`,
            [newName, newParentId, id]
        );

        const [updated] = await pool.query(
            `SELECT f.folder_id, f.folder_name, f.parent_folder_id, f.owner_id,
                    f.created_at, f.updated_at, u.username AS owner_name
             FROM FOLDERS f
             JOIN USERS u ON f.owner_id = u.user_id
             WHERE f.folder_id = ?`,
            [id]
        );

        return c.json({
            message: 'Folder updated successfully',
            folder: updated[0]
        });
    } catch (error) {
        console.error('Error updating folder:', error);
        return c.json({
            message: 'Failed to update folder',
            error: error.message
        }, 500);
    }
});

// DELETE /api/folders/:id - Delete folder safely
folderRoutes.delete('/:id', async (c) => {
    try {
        const id = Number(c.req.param('id'));
        if (isNaN(id)) {
            return c.json({ message: 'Invalid folder ID' }, 400);
        }

        const [existing] = await pool.query(
            'SELECT folder_id, folder_name, parent_folder_id, owner_id FROM FOLDERS WHERE folder_id = ?',
            [id]
        );

        if (!existing || existing.length === 0) {
            return c.json({ message: 'Folder not found' }, 404);
        }

        const target = existing[0];
        const user = c.get('user');
        const isAdmin = user.role === 'ADMIN';

        if (!isAdmin && target.owner_id !== user.user_id) {
            return c.json({ message: 'Access denied: only owner or administrator can delete this folder' }, 403);
        }

        const newParent = target.parent_folder_id;

        // Safely reassign child folders and files to target's parent folder (or null for root)
        await pool.query(
            'UPDATE FOLDERS SET parent_folder_id = ? WHERE parent_folder_id = ?',
            [newParent, id]
        );
        await pool.query(
            'UPDATE FILES SET folder_id = ? WHERE folder_id = ?',
            [newParent, id]
        );

        // Delete the folder record
        await pool.query('DELETE FROM FOLDERS WHERE folder_id = ?', [id]);

        return c.json({
            message: `Folder "${target.folder_name}" deleted successfully. Child items relocated to parent.`
        });
    } catch (error) {
        console.error('Error deleting folder:', error);
        return c.json({
            message: 'Failed to delete folder',
            error: error.message
        }, 500);
    }
});

export default folderRoutes;
