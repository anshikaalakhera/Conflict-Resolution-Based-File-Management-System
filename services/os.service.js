import pool from '../config/db.js';
import { osKernel } from './osKernel.js';
import { readStoredFile } from './storage.service.js';

const VALID_OPERATIONS = new Set([
    'UPLOAD',
    'DOWNLOAD',
    'EDIT',
    'DELETE',
    'MOVE',
    'SHARE'
]);

const mapProcessState = (state) => {
    switch (state) {
        case 'COMPLETED':
            return 'TERMINATED';
        case 'FAILED':
        case 'ABORTED':
            return 'KILLED';
        case 'NEW':
        case 'READY':
        case 'RUNNING':
        case 'WAITING':
            return state;
        default:
            throw new Error(`Unsupported OS process state: ${state}`);
    }
};

export const executeFileOperation = async (operation) => {
    if (!operation) {
        throw new Error('Operation not found');
    }

    const operationId = Number(operation.operation_id);

    if (!Number.isInteger(operationId) || operationId <= 0) {
        throw new Error('Invalid operation ID');
    }

    const connection = await pool.getConnection();
    let submittedProcess = null;

    try {
        await connection.beginTransaction();

        // Read the latest database status, preventing duplicate submissions.
        const [rows] = await connection.query(
            `SELECT *
             FROM OPERATIONS
             WHERE operation_id = ?
             FOR UPDATE`,
            [operationId]
        );

        const current = rows[0];

        if (!current) {
            throw new Error('Operation not found');
        }

        if (current.status === 'COMPLETED') {
            await connection.commit();

            return {
                success: true,
                status: 'COMPLETED',
                message: 'This operation has already completed'
            };
        }

        if (['FAILED', 'ABORTED'].includes(current.status)) {
            throw new Error(
                `Cannot execute an operation with status ${current.status}`
            );
        }

        if (['QUEUED', 'EXECUTING'].includes(current.status)) {
            const [existingProcesses] = await connection.query(
                `SELECT *
                 FROM PROCESSES
                 WHERE operation_id = ?
                 ORDER BY process_id DESC
                 LIMIT 1`,
                [operationId]
            );

            await connection.commit();

            return {
                success: true,
                status: current.status,
                message: existingProcesses.length
                    ? 'Operation has already been submitted'
                    : 'Operation is already marked as submitted; no duplicate was created',
                operationId,
                process: existingProcesses[0] ?? null
            };
        }

        if (current.status !== 'PENDING') {
            throw new Error(
                `Cannot submit operation with status ${current.status}`
            );
        }

        const operationType = String(
            current.operation_type || ''
        ).toUpperCase();

        if (!VALID_OPERATIONS.has(operationType)) {
            throw new Error('Unsupported operation type');
        }

        let details = current.details;

        if (typeof details === 'string') {
            try {
                details = JSON.parse(details);
            } catch {
                throw new Error('Operation details contain invalid JSON');
            }
        }

        const priority = Number(current.priority ?? 1);

        if (!Number.isInteger(priority) || priority < 1 || priority > 10) {
            throw new Error('Operation priority must be an integer from 1 to 10');
        }
if (!['DOWNLOAD', 'MOVE'].includes(operationType)) {
    throw new Error(
        `Execution is not implemented for ${operationType} yet.`
    );
}

if (operationType === 'MOVE') {
    const destinationFolderId = Number(details?.destination_folder_id);

    if (
        !Number.isInteger(destinationFolderId) ||
        destinationFolderId <= 0
    ) {
        throw new Error(
            'MOVE requires details.destination_folder_id to be a positive integer'
        );
    }
}
        // Submit to the existing OS scheduler.
        submittedProcess = osKernel.submitOperation({
            name: `Operation-${operationId}`,
            userId: current.user_id,
            fileId: current.file_id ?? null,
            operation: operationType,
            priority,
            ...(details?.burstTime !== undefined
                ? { burstTime: Number(details.burstTime) }
                : {})
        });

        const processData = submittedProcess.toJSON();
        const dbState = mapProcessState(processData.state);
        const pidAlias = `OS-${operationId}-${processData.id}`;

        const burstTime = Number(
            processData.burstTime ??
            submittedProcess.burstTime ??
            10
        );

        if (!Number.isFinite(burstTime) || burstTime < 0) {
            throw new Error('Invalid process CPU burst time');
        }

        // Save the OS process using the database's own process_id.
        const [insertResult] = await connection.query(
            `INSERT INTO PROCESSES
                (operation_id, pid_alias, state, priority,
                 cpu_burst_time, memory_allocated_kb)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                operationId,
                pidAlias,
                dbState,
                priority,
                burstTime,
                1024
            ]
        );

        await connection.query(
            `UPDATE OPERATIONS
             SET status = 'QUEUED'
             WHERE operation_id = ?`,
            [operationId]
        );

        await connection.commit();

        return {
            success: true,
            status: 'QUEUED',
            message: 'Operation queued and process saved to the database',
            operationId,
            databaseProcessId: insertResult.insertId,
            osProcessId: processData.id,
            process: processData,
            scheduler: osKernel.snapshot().algorithm
        };
    } catch (error) {
        await connection.rollback();

        // Avoid leaving a failed submission runnable in memory.
        if (submittedProcess) {
            try {
                osKernel.fail(
                    submittedProcess.id,
                    'Database persistence failed'
                );
            } catch {
                // Preserve the original database/integration error.
            }
        }

        throw error;
    } finally {
        connection.release();
    }
};

let dispatchInProgress = false;

export const dispatchNextProcess = async () => {
    if (dispatchInProgress) {
        return {
            success: true,
            status: 'IDLE',
            message: 'A dispatch request is already in progress'
        };
    }

    dispatchInProgress = true;

    let connection;
    let dispatchedProcess = null;
    let databaseProcessId = null;
    let operationId = null;
    let transactionOpen = false;

    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();
        transactionOpen = true;

        const snapshot = osKernel.snapshot();
        const nextOsProcessId = snapshot.readyQueue[0];

        if (nextOsProcessId === undefined) {
            await connection.commit();
            transactionOpen = false;

            return {
                success: true,
                status: 'IDLE',
                message: 'No process is ready to be dispatched'
            };
        }

        const candidate = snapshot.processes.find(
            (process) => process.id === nextOsProcessId
        );

        const match = candidate
            ? /^Operation-(\d+)$/.exec(candidate.name)
            : null;

        if (!match) {
            throw new Error('Cannot identify the queued operation');
        }

        operationId = Number(match[1]);

        const pidAlias = `OS-${operationId}-${candidate.id}`;

        const [processRows] = await connection.query(
            `SELECT process_id, state
             FROM PROCESSES
             WHERE operation_id = ? AND pid_alias = ?
             FOR UPDATE`,
            [operationId, pidAlias]
        );

        if (
            !processRows.length ||
            processRows[0].state !== 'READY'
        ) {
            throw new Error(
                'No matching READY database process was found'
            );
        }

        databaseProcessId = processRows[0].process_id;

const [operationRows] = await connection.query(
    `SELECT operation_id, user_id, file_id,
            operation_type, status, details
     FROM OPERATIONS
     WHERE operation_id = ?
     FOR UPDATE`,
    [operationId]
);

        const operation = operationRows[0];

        if (!operation || operation.status !== 'QUEUED') {
            throw new Error('Operation is not QUEUED');
        }


if (!['DOWNLOAD', 'MOVE'].includes(operation.operation_type)) {
    const message =
        `Execution is not implemented for ${operation.operation_type} yet`;

    // Remove this process from the ready queue by dispatching and failing it.
    dispatchedProcess = osKernel.dispatch();

    if (
        !dispatchedProcess ||
        dispatchedProcess.id !== candidate.id
    ) {
        throw new Error('Could not dispatch the unsupported process safely');
    }

    osKernel.fail(dispatchedProcess.id, message);

    const [processUpdate] = await connection.query(
        `UPDATE PROCESSES
         SET state = 'KILLED',
             finished_at = CURRENT_TIMESTAMP
         WHERE process_id = ? AND state = 'READY'`,
        [databaseProcessId]
    );

    const [operationUpdate] = await connection.query(
        `UPDATE OPERATIONS
         SET status = 'FAILED',
             completed_at = CURRENT_TIMESTAMP
         WHERE operation_id = ? AND status = 'QUEUED'`,
        [operationId]
    );

    if (
        processUpdate.affectedRows !== 1 ||
        operationUpdate.affectedRows !== 1
    ) {
        throw new Error('Could not persist the rejected operation state');
    }

    await connection.commit();
    transactionOpen = false;

    return {
        success: false,
        status: 'FAILED',
        operationId,
        databaseProcessId,
        osProcessId: dispatchedProcess.id,
        message
    };
}

if (operation.operation_type === 'MOVE') {
    if (operation.file_id == null) {
        throw new Error('MOVE requires a file_id');
    }

    let details = operation.details;

    if (typeof details === 'string') {
        details = JSON.parse(details);
    }

    const destinationFolderId = Number(
        details?.destination_folder_id
    );

    if (
        !Number.isInteger(destinationFolderId) ||
        destinationFolderId <= 0
    ) {
        throw new Error(
            'MOVE requires a valid destination_folder_id'
        );
    }

    // Lock and validate the file.
    const [fileRows] = await connection.query(
        `SELECT file_id, file_name, owner_id, folder_id, status
         FROM FILES
         WHERE file_id = ?
         FOR UPDATE`,
        [operation.file_id]
    );

    if (!fileRows.length) {
        throw new Error('The file associated with MOVE was not found');
    }

    const file = fileRows[0];

    if (Number(file.owner_id) !== Number(operation.user_id)) {
        throw new Error('Only the file owner can move this file');
    }

    if (file.status !== 'ACTIVE') {
        throw new Error('Only ACTIVE files can be moved');
    }

    // Validate that the destination folder belongs to the same owner.
    const [folderRows] = await connection.query(
        `SELECT folder_id, owner_id
         FROM FOLDERS
         WHERE folder_id = ?
         FOR UPDATE`,
        [destinationFolderId]
    );

    if (!folderRows.length) {
        throw new Error('Destination folder was not found');
    }

    if (
        Number(folderRows[0].owner_id) !== Number(file.owner_id)
    ) {
        throw new Error(
            'Destination folder must belong to the file owner'
        );
    }

    // Dispatch the process selected by the existing scheduler.
    dispatchedProcess = osKernel.dispatch();

    if (
        !dispatchedProcess ||
        dispatchedProcess.id !== candidate.id
    ) {
        throw new Error(
            'The scheduler could not dispatch the expected MOVE process'
        );
    }

    const [processStart] = await connection.query(
        `UPDATE PROCESSES
         SET state = 'RUNNING',
             started_at = COALESCE(started_at, CURRENT_TIMESTAMP)
         WHERE process_id = ? AND state = 'READY'`,
        [databaseProcessId]
    );

    const [operationStart] = await connection.query(
        `UPDATE OPERATIONS
         SET status = 'EXECUTING'
         WHERE operation_id = ? AND status = 'QUEUED'`,
        [operationId]
    );

    if (
        processStart.affectedRows !== 1 ||
        operationStart.affectedRows !== 1
    ) {
        throw new Error('Could not start the MOVE operation safely');
    }

    await connection.commit();
    transactionOpen = false;

    // Apply the move and record completion transactionally.
    await connection.beginTransaction();
    transactionOpen = true;

    const [fileUpdate] = await connection.query(
        `UPDATE FILES
         SET folder_id = ?
         WHERE file_id = ?
           AND owner_id = ?
           AND status = 'ACTIVE'`,
        [
            destinationFolderId,
            operation.file_id,
            operation.user_id
        ]
    );

    if (fileUpdate.affectedRows !== 1) {
        throw new Error('Could not update the file destination');
    }

    osKernel.clock.advance(dispatchedProcess.burstTime);

    const completedProcess = osKernel.complete(
        dispatchedProcess.id
    );

    const [processFinish] = await connection.query(
        `UPDATE PROCESSES
         SET state = 'TERMINATED',
             finished_at = CURRENT_TIMESTAMP
         WHERE process_id = ? AND state = 'RUNNING'`,
        [databaseProcessId]
    );

    const [operationFinish] = await connection.query(
        `UPDATE OPERATIONS
         SET status = 'COMPLETED',
             completed_at = CURRENT_TIMESTAMP
         WHERE operation_id = ? AND status = 'EXECUTING'`,
        [operationId]
    );

    if (
        processFinish.affectedRows !== 1 ||
        operationFinish.affectedRows !== 1
    ) {
        throw new Error('Could not persist MOVE completion');
    }

    await connection.commit();
    transactionOpen = false;

    return {
        success: true,
        status: 'COMPLETED',
        operationId,
        databaseProcessId,
        osProcessId: dispatchedProcess.id,
        fileId: file.file_id,
        fileName: file.file_name,
        previousFolderId: file.folder_id,
        destinationFolderId,
        process: completedProcess
    };
}

        if (operation.file_id == null) {
            throw new Error('DOWNLOAD requires a file_id');
        }

        const [fileRows] = await connection.query(
            `SELECT file_id, file_name, file_path
             FROM FILES
             WHERE file_id = ?`,
            [operation.file_id]
        );

        if (!fileRows.length) {
            throw new Error('The file associated with this operation was not found');
        }

        const file = fileRows[0];

        // Dispatch the exact process that was checked above.
        dispatchedProcess = osKernel.dispatch();

        if (
            !dispatchedProcess ||
            dispatchedProcess.id !== candidate.id
        ) {
            throw new Error('The scheduler could not dispatch the expected process');
        }

        await connection.query(
            `UPDATE PROCESSES
             SET state = 'RUNNING',
                 started_at = COALESCE(started_at, CURRENT_TIMESTAMP)
             WHERE process_id = ? AND state = 'READY'`,
            [databaseProcessId]
        );

        await connection.query(
            `UPDATE OPERATIONS
             SET status = 'EXECUTING'
             WHERE operation_id = ? AND status = 'QUEUED'`,
            [operationId]
        );

        await connection.commit();
        transactionOpen = false;

        // Execute the supported operation against the stored file.
        const fileData = await readStoredFile(file.file_path);

        if (!Buffer.isBuffer(fileData)) {
            throw new Error('Stored file could not be read');
        }

        osKernel.clock.advance(dispatchedProcess.burstTime);

        const completedProcess = osKernel.complete(
            dispatchedProcess.id
        );

        await connection.beginTransaction();
        transactionOpen = true;

        const [processUpdate] = await connection.query(
            `UPDATE PROCESSES
             SET state = 'TERMINATED',
                 finished_at = CURRENT_TIMESTAMP
             WHERE process_id = ? AND state = 'RUNNING'`,
            [databaseProcessId]
        );

        const [operationUpdate] = await connection.query(
            `UPDATE OPERATIONS
             SET status = 'COMPLETED',
                 completed_at = CURRENT_TIMESTAMP
             WHERE operation_id = ? AND status = 'EXECUTING'`,
            [operationId]
        );

        if (
            processUpdate.affectedRows !== 1 ||
            operationUpdate.affectedRows !== 1
        ) {
            throw new Error('Could not persist the completed operation state');
        }

        await connection.commit();
        transactionOpen = false;

        return {
            success: true,
            status: 'COMPLETED',
            operationId,
            databaseProcessId,
            osProcessId: dispatchedProcess.id,
            fileName: file.file_name,
            bytesRead: fileData.length,
            process: completedProcess
        };
    } catch (error) {
        if (connection && transactionOpen) {
            try {
                await connection.rollback();
            } catch {
                // Preserve the original error.
            }
            transactionOpen = false;
        }

        if (dispatchedProcess) {
            try {
                osKernel.fail(
                    dispatchedProcess.id,
                    error.message || 'Operation execution failed'
                );
            } catch (kernelError) {
                console.error('OS process failure handling failed:', kernelError);
            }

            if (connection) {
                try {
                    await connection.beginTransaction();

                    if (databaseProcessId !== null) {
                        await connection.query(
                            `UPDATE PROCESSES
                             SET state = 'KILLED',
                                 finished_at = CURRENT_TIMESTAMP
                             WHERE process_id = ?
                               AND state IN ('READY', 'RUNNING')`,
                            [databaseProcessId]
                        );
                    }

                    if (operationId !== null) {
                        await connection.query(
                            `UPDATE OPERATIONS
                             SET status = 'FAILED',
                                 completed_at = CURRENT_TIMESTAMP
                             WHERE operation_id = ?
                               AND status IN ('QUEUED', 'EXECUTING')`,
                            [operationId]
                        );
                    }

                    await connection.commit();
                } catch (reconciliationError) {
                    try {
                        await connection.rollback();
                    } catch {
                        // Preserve the original error.
                    }

                    console.error(
                        'Could not reconcile failed operation:',
                        reconciliationError
                    );
                }
            }
        }

        throw error;
    } finally {
        if (connection) connection.release();
        dispatchInProgress = false;
    }
};
