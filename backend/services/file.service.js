import pool from '../config/db.js';

export const getAllFiles = async () => {
    const [rows] = await pool.query(`
        SELECT
            file_id,
            file_name,
            folder_id,
            owner_id,
            file_size_bytes,
            file_path,
            mime_type,
            status,
            created_at,
            updated_at
        FROM FILES
        ORDER BY created_at DESC
    `);

    return rows;
};

export const getFileById = async (id) => {
    const [rows] = await pool.query(
        `SELECT
            file_id,
            file_name,
            folder_id,
            owner_id,
            file_size_bytes,
            file_path,
            mime_type,
            status,
            created_at,
            updated_at
         FROM FILES
         WHERE file_id = ?`,
        [id]
    );

    return rows[0] || null;
};

export const createNewFile = async (data) => {
    const {
        file_name,
        folder_id,
        owner_id,
        file_size_bytes,
        file_path,
        mime_type
    } = data;

    const [result] = await pool.query(
        `INSERT INTO FILES
        (
            file_name,
            folder_id,
            owner_id,
            file_size_bytes,
            file_path,
            mime_type
        )
        VALUES (?, ?, ?, ?, ?, ?)`,
        [
            file_name,
            folder_id || null,
            owner_id,
            file_size_bytes,
            file_path,
            mime_type
        ]
    );

    return getFileById(result.insertId);
};

export const updateExistingFile = async (id, data) => {
    const existingFile = await getFileById(id);

    if (!existingFile) {
        return null;
    }

    const updates = [];
    const values = [];

    if (data.file_name !== undefined) {
        updates.push('file_name = ?');
        values.push(data.file_name);
    }

    if (data.folder_id !== undefined) {
        updates.push('folder_id = ?');
        values.push((data.folder_id === null || data.folder_id === '' || data.folder_id === 'root') ? null : Number(data.folder_id));
    }

    if (data.status !== undefined) {
        updates.push('status = ?');
        values.push(data.status);
    }

    if (updates.length > 0) {
        values.push(id);
        await pool.query(
            `UPDATE FILES SET ${updates.join(', ')} WHERE file_id = ?`,
            values
        );
    }

    return getFileById(id);
};

export const deleteFileById = async (id) => {
    const [result] = await pool.query(
        `DELETE FROM FILES WHERE file_id = ?`,
        [id]
    );

    return {
        deleted: result.affectedRows > 0,
        id
    };
};

export const createUploadedFileRecord = async ({
    fileName,
    folderId = null,
    ownerId = 1,
    fileSize,
    filePath,
    mimeType
}) => {
    const [result] = await pool.query(
        `INSERT INTO FILES
        (
            file_name,
            folder_id,
            owner_id,
            file_size_bytes,
            file_path,
            mime_type
        )
        VALUES (?, ?, ?, ?, ?, ?)`,
        [
            fileName,
            folderId || null,
            ownerId,
            fileSize,
            filePath,
            mimeType
        ]
    );

    return getFileById(result.insertId);
};

export const getFileVersions = async (fileId) => {
    const file = await getFileById(fileId);
    if (!file) return null;

    const [rows] = await pool.query(
        `SELECT
            o.operation_id,
            o.user_id,
            u.username AS author_name,
            o.operation_type,
            o.status,
            o.priority,
            o.details,
            o.created_at,
            o.completed_at
         FROM OPERATIONS o
         JOIN USERS u ON o.user_id = u.user_id
         WHERE o.file_id = ?
         ORDER BY o.created_at ASC`,
        [fileId]
    );

    const versions = rows.map((r, index) => {
        let parsedDetails = {};
        if (r.details) {
            try {
                parsedDetails = typeof r.details === 'string' ? JSON.parse(r.details) : r.details;
            } catch {
                parsedDetails = { raw: String(r.details) };
            }
        }
        return {
            version_number: index + 1,
            operation_id: r.operation_id,
            author_id: r.user_id,
            author_name: r.author_name,
            operation_type: r.operation_type,
            status: r.status,
            created_at: r.created_at,
            completed_at: r.completed_at,
            details: parsedDetails
        };
    });

    return {
        file,
        total_versions: versions.length,
        versions
    };
};

export const getFileConflicts = async (fileId) => {
    const file = await getFileById(fileId);
    if (!file) return null;

    const [locks] = await pool.query(
        `SELECT
            fl.lock_id,
            fl.file_id,
            fl.process_id,
            fl.lock_type,
            fl.lock_status,
            fl.requested_at,
            fl.acquired_at,
            p.pid_alias,
            p.state AS process_state,
            o.operation_id,
            o.operation_type,
            o.status AS operation_status,
            o.details AS operation_details,
            u.user_id,
            u.username
         FROM FILE_LOCKS fl
         JOIN PROCESSES p ON fl.process_id = p.process_id
         JOIN OPERATIONS o ON p.operation_id = o.operation_id
         JOIN USERS u ON o.user_id = u.user_id
         WHERE fl.file_id = ? AND fl.lock_status IN ('ACQUIRED', 'WAITING')
         ORDER BY fl.requested_at ASC`,
        [fileId]
    );

    const activeHolder = locks.find(l => l.lock_status === 'ACQUIRED') || null;
    const conflictingWaiters = locks.filter(l => l.lock_status === 'WAITING');
    const hasConflict = Boolean(activeHolder && conflictingWaiters.length > 0);

    return {
        file_id: file.file_id,
        file_name: file.file_name,
        hasConflict,
        activeHolder: activeHolder ? {
            lock_id: activeHolder.lock_id,
            process_id: activeHolder.process_id,
            pid_alias: activeHolder.pid_alias,
            user_id: activeHolder.user_id,
            username: activeHolder.username,
            operation_type: activeHolder.operation_type,
            acquired_at: activeHolder.acquired_at,
            details: activeHolder.operation_details
        } : null,
        conflictingWaiters: conflictingWaiters.map(w => ({
            lock_id: w.lock_id,
            process_id: w.process_id,
            pid_alias: w.pid_alias,
            user_id: w.user_id,
            username: w.username,
            operation_type: w.operation_type,
            requested_at: w.requested_at,
            details: w.operation_details
        })),
        message: hasConflict
            ? `Concurrent write conflict detected on "${file.file_name}": ${activeHolder.username} holds exclusive lock while ${conflictingWaiters.map(w => w.username).join(', ')} is waiting to apply changes.`
            : 'No active concurrency conflicts detected on this file.'
    };
};

export const resolveFileConflict = async (fileId, { strategy = 'KEEP_CURRENT', resolvedByUserId = 1 }) => {
    const file = await getFileById(fileId);
    if (!file) {
        throw new Error('File not found');
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const [locks] = await connection.query(
            `SELECT fl.lock_id, fl.process_id, fl.lock_status, p.operation_id, u.username, u.user_id
             FROM FILE_LOCKS fl
             JOIN PROCESSES p ON fl.process_id = p.process_id
             JOIN OPERATIONS o ON p.operation_id = o.operation_id
             JOIN USERS u ON o.user_id = u.user_id
             WHERE fl.file_id = ? AND fl.lock_status IN ('ACQUIRED', 'WAITING')
             ORDER BY fl.requested_at ASC`,
            [fileId]
        );

        const holder = locks.find(l => l.lock_status === 'ACQUIRED');
        const waiters = locks.filter(l => l.lock_status === 'WAITING');

        if (!holder || waiters.length === 0) {
            await connection.rollback();
            connection.release();
            return {
                resolved: false,
                message: 'No active concurrent conflict found to resolve on this file.'
            };
        }

        let resolutionNote = '';
        let branchedFile = null;

        if (strategy === 'KEEP_CURRENT') {
            for (const waiter of waiters) {
                await connection.query(
                    `UPDATE FILE_LOCKS SET lock_status = 'ABORTED', released_at = CURRENT_TIMESTAMP WHERE lock_id = ?`,
                    [waiter.lock_id]
                );
                await connection.query(
                    `UPDATE PROCESSES SET state = 'TERMINATED', finished_at = CURRENT_TIMESTAMP WHERE process_id = ?`,
                    [waiter.process_id]
                );
                await connection.query(
                    `UPDATE OPERATIONS SET status = 'ABORTED' WHERE operation_id = ?`,
                    [waiter.operation_id]
                );
            }
            resolutionNote = `Kept current changes from ${holder.username}. Aborted competing request(s) from ${waiters.map(w => w.username).join(', ')}.`;

        } else if (strategy === 'ACCEPT_INCOMING') {
            const primaryWaiter = waiters[0];

            await connection.query(
                `UPDATE FILE_LOCKS SET lock_status = 'RELEASED', released_at = CURRENT_TIMESTAMP WHERE lock_id = ?`,
                [holder.lock_id]
            );
            await connection.query(
                `UPDATE FILE_LOCKS SET lock_status = 'ACQUIRED', acquired_at = CURRENT_TIMESTAMP WHERE lock_id = ?`,
                [primaryWaiter.lock_id]
            );
            await connection.query(
                `UPDATE PROCESSES SET state = 'RUNNING', started_at = CURRENT_TIMESTAMP WHERE process_id = ?`,
                [primaryWaiter.process_id]
            );
            await connection.query(
                `UPDATE OPERATIONS SET status = 'EXECUTING' WHERE operation_id = ?`,
                [primaryWaiter.operation_id]
            );

            resolutionNote = `Accepted incoming changes from ${primaryWaiter.username}. Released lock previously held by ${holder.username}.`;

        } else if (strategy === 'CREATE_BRANCH') {
            const primaryWaiter = waiters[0];
            const nameParts = file.file_name.split('.');
            const ext = nameParts.length > 1 ? `.${nameParts.pop()}` : '';
            const baseName = nameParts.join('.');
            const branchName = `${baseName}_branch_${Date.now()}${ext}`;

            const [branchInsert] = await connection.query(
                `INSERT INTO FILES (file_name, folder_id, owner_id, file_size_bytes, file_path, mime_type, status)
                 VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE')`,
                [
                    branchName,
                    file.folder_id,
                    primaryWaiter.user_id || resolvedByUserId,
                    file.file_size_bytes,
                    `${file.file_path}_branch`,
                    file.mime_type
                ]
            );

            const newFileId = branchInsert.insertId;

            await connection.query(
                `UPDATE FILE_LOCKS SET file_id = ?, lock_status = 'RELEASED', released_at = CURRENT_TIMESTAMP WHERE lock_id = ?`,
                [newFileId, primaryWaiter.lock_id]
            );
            await connection.query(
                `UPDATE PROCESSES SET state = 'TERMINATED', finished_at = CURRENT_TIMESTAMP WHERE process_id = ?`,
                [primaryWaiter.process_id]
            );
            await connection.query(
                `UPDATE OPERATIONS SET file_id = ?, status = 'COMPLETED', completed_at = CURRENT_TIMESTAMP WHERE operation_id = ?`,
                [newFileId, primaryWaiter.operation_id]
            );

            branchedFile = {
                file_id: newFileId,
                file_name: branchName
            };
            resolutionNote = `Resolved conflict by branching incoming changes from ${primaryWaiter.username} into new file "${branchName}".`;
        }

        await connection.commit();
        connection.release();

        return {
            resolved: true,
            strategy,
            message: resolutionNote,
            branchedFile
        };
    } catch (err) {
        await connection.rollback();
        connection.release();
        throw err;
    }
};