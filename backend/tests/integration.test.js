import test from 'node:test';
import assert from 'node:assert/strict';
import pool from '../config/db.js';

const BASE_URL = 'http://localhost:3000/api';

test('Integration: Health check', async () => {
    const res = await fetch(`${BASE_URL}/health`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'UP');
});

test('Integration: Static frontend serving on port 3000', async () => {
    const res = await fetch('http://localhost:3000/');
    assert.equal(res.status, 200);
    const contentType = res.headers.get('content-type') || '';
    assert.ok(contentType.includes('text/html'));
    const html = await res.text();
    assert.ok(html.includes('ConflictCore'));
    assert.ok(html.includes('File explorer'));
});

test('Integration: Authentication - Registration & Password Hashing', async () => {
    const unique = Date.now();
    const testUsername = `user_${unique}`;
    const testEmail = `user_${unique}@test.io`;
    const testPassword = 'SecretPassword123!';

    // Register user
    const regRes = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username: testUsername,
            email: testEmail,
            password: testPassword
        })
    });

    assert.equal(regRes.status, 201);
    const regData = await regRes.json();
    assert.equal(regData.user.username, testUsername);
    assert.ok(regData.token);

    // Verify in MySQL that password is saved as a genuine bcrypt hash
    const [dbRows] = await pool.query(
        'SELECT user_id, username, password_hash, role, status FROM USERS WHERE user_id = ?',
        [regData.user.user_id]
    );
    assert.equal(dbRows.length, 1);
    assert.ok(dbRows[0].password_hash.startsWith('$2'));
    assert.notEqual(dbRows[0].password_hash, testPassword);

    // Test Login with valid credentials
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username: testUsername,
            password: testPassword
        })
    });
    assert.equal(loginRes.status, 200);
    const loginData = await loginRes.json();
    assert.equal(loginData.user.username, testUsername);
    assert.ok(loginData.token);

    // Test Login with wrong password
    const badLoginRes = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username: testUsername,
            password: 'WrongPassword'
        })
    });
    assert.equal(badLoginRes.status, 401);

    // Clean up test user
    await pool.query('DELETE FROM USERS WHERE user_id = ?', [regData.user.user_id]);
});

test('Integration: Authentication - Seed Demo User Login', async () => {
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username: 'admin_super',
            password: 'admin123'
        })
    });
    assert.equal(loginRes.status, 200);
    const data = await loginRes.json();
    assert.equal(data.user.username, 'admin_super');
    assert.equal(data.user.role, 'ADMIN');
    assert.ok(data.token);
});

test('Integration: Folder Hierarchy & CRUD with Cycle Prevention', async () => {
    const stamp = Date.now();
    const parentName = `Folder_Parent_${stamp}`;
    const childName = `Folder_Child_${stamp}`;

    // 1. Create root folder
    const createParentRes = await fetch(`${BASE_URL}/folders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            folder_name: parentName,
            parent_folder_id: null,
            owner_id: 1
        })
    });
    assert.equal(createParentRes.status, 201);
    const parentData = await createParentRes.json();
    const parentId = parentData.folder.folder_id;
    assert.equal(parentData.folder.folder_name, parentName);
    assert.equal(parentData.folder.parent_folder_id, null);

    // 2. Create nested child folder
    const createChildRes = await fetch(`${BASE_URL}/folders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            folder_name: childName,
            parent_folder_id: parentId,
            owner_id: 1
        })
    });
    assert.equal(createChildRes.status, 201);
    const childData = await createChildRes.json();
    const childId = childData.folder.folder_id;
    assert.equal(childData.folder.parent_folder_id, parentId);

    // 3. Inspect parent folder details and subfolders
    const getParentRes = await fetch(`${BASE_URL}/folders/${parentId}`);
    assert.equal(getParentRes.status, 200);
    const parentDetails = await getParentRes.json();
    assert.equal(parentDetails.folder.folder_id, parentId);
    assert.ok(parentDetails.subfolders.some(sf => sf.folder_id === childId));

    // 4. Test cycle prevention (attempt to set parent's parent to child)
    const cycleRes = await fetch(`${BASE_URL}/folders/${parentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            parent_folder_id: childId
        })
    });
    assert.equal(cycleRes.status, 400);
    const cycleErr = await cycleRes.json();
    assert.ok(cycleErr.message.includes('cycle'));

    // 5. Rename child folder
    const renameRes = await fetch(`${BASE_URL}/folders/${childId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            folder_name: `${childName}_Renamed`
        })
    });
    assert.equal(renameRes.status, 200);
    const renamed = await renameRes.json();
    assert.equal(renamed.folder.folder_name, `${childName}_Renamed`);

    // 6. Delete child folder
    const delChildRes = await fetch(`${BASE_URL}/folders/${childId}`, { method: 'DELETE' });
    assert.equal(delChildRes.status, 200);

    // 7. Delete parent folder
    const delParentRes = await fetch(`${BASE_URL}/folders/${parentId}`, { method: 'DELETE' });
    assert.equal(delParentRes.status, 200);
});

test('Integration: File Move to Root (Verifying COALESCE fix)', async () => {
    // 1. Create a temporary folder
    const folderRes = await fetch(`${BASE_URL}/folders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            folder_name: `TempFolder_${Date.now()}`,
            owner_id: 1
        })
    });
    const folderData = await folderRes.json();
    const tempFolderId = folderData.folder.folder_id;

    // 2. Create a test file record in that folder
    const [fileInsert] = await pool.query(
        `INSERT INTO FILES (file_name, folder_id, owner_id, file_size_bytes, file_path, mime_type)
         VALUES ('test_move.txt', ?, 1, 100, 'test_move.txt', 'text/plain')`,
        [tempFolderId]
    );
    const testFileId = fileInsert.insertId;

    // Verify initial folder_id in DB
    const [row1] = await pool.query('SELECT folder_id FROM FILES WHERE file_id = ?', [testFileId]);
    assert.equal(row1[0].folder_id, tempFolderId);

    // 3. Move file to Root (folder_id = null)
    const moveRes = await fetch(`${BASE_URL}/files/${testFileId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder_id: null })
    });
    assert.equal(moveRes.status, 200);

    // 4. Verify in DB that folder_id is truly null
    const [row2] = await pool.query('SELECT folder_id FROM FILES WHERE file_id = ?', [testFileId]);
    assert.equal(row2[0].folder_id, null);

    // Clean up
    await pool.query('DELETE FROM FILES WHERE file_id = ?', [testFileId]);
    await pool.query('DELETE FROM FOLDERS WHERE folder_id = ?', [tempFolderId]);
});

test('Integration: OS Scheduling Algorithm Selection', async () => {
    // Switch to SJF
    const sjfRes = await fetch(`${BASE_URL}/scheduler/algorithm`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ algorithm: 'SJF' })
    });
    assert.equal(sjfRes.status, 200);
    const sjfData = await sjfRes.json();
    assert.equal(sjfData.algorithm, 'SJF');

    // Switch to PRIORITY
    const prioRes = await fetch(`${BASE_URL}/scheduler/algorithm`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ algorithm: 'PRIORITY' })
    });
    assert.equal(prioRes.status, 200);
    const prioData = await prioRes.json();
    assert.equal(prioData.algorithm, 'PRIORITY');

    // Reset to FCFS
    const fcfsRes = await fetch(`${BASE_URL}/scheduler/algorithm`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ algorithm: 'FCFS' })
    });
    assert.equal(fcfsRes.status, 200);
    const fcfsData = await fcfsRes.json();
    assert.equal(fcfsData.algorithm, 'FCFS');
});

test('Integration: Lock Manager & Deadlock Endpoints', async () => {
    const locksRes = await fetch(`${BASE_URL}/locks`);
    assert.equal(locksRes.status, 200);
    const locksData = await locksRes.json();
    assert.ok(Array.isArray(locksData.locks));
    assert.ok(Array.isArray(locksData.waitForEdges));

    const deadlocksRes = await fetch(`${BASE_URL}/deadlocks`);
    assert.equal(deadlocksRes.status, 200);
    const deadlocksData = await deadlocksRes.json();
    assert.ok('activeCycle' in deadlocksData);
    assert.ok(Array.isArray(deadlocksData.history));
});

test('Integration: File Version History Retrieval', async () => {
    const res = await fetch(`${BASE_URL}/files/2/versions`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.file.file_name, 'scheduler_core.c');
    assert.ok(data.total_versions >= 3);
    assert.equal(data.versions[0].version_number, 1);
    assert.equal(data.versions[0].author_name, 'shubham_k');
    assert.equal(data.versions[1].version_number, 2);
    assert.equal(data.versions[1].author_name, 'avni_n');
    assert.equal(data.versions[2].version_number, 3);
    assert.equal(data.versions[2].author_name, 'shubham_k');
});

test('Integration: Concurrent Write Conflict Detection', async () => {
    const res = await fetch(`${BASE_URL}/files/2/conflicts`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.hasConflict, true);
    assert.equal(data.file_id, 2);
    assert.equal(data.file_name, 'scheduler_core.c');
    assert.ok(data.activeHolder);
    assert.equal(data.activeHolder.username, 'avni_n');
    assert.ok(data.conflictingWaiters.length > 0);
    assert.equal(data.conflictingWaiters[0].username, 'shubham_k');
});

test('Integration: Conflict Resolution Strategy (CREATE_BRANCH)', async () => {
    // 1. Setup isolated test file and conflicting operations
    const [fileInsert] = await pool.query(
        `INSERT INTO FILES (file_name, folder_id, owner_id, file_size_bytes, file_path, mime_type, status)
         VALUES ('conflict_eval_test.txt', 1, 1, 512, '/test/conflict_eval_test.txt', 'text/plain', 'LOCKED')`
    );
    const testFileId = fileInsert.insertId;

    const [op1] = await pool.query(
        `INSERT INTO OPERATIONS (user_id, file_id, operation_type, priority, status)
         VALUES (1, ?, 'EDIT', 1, 'EXECUTING')`,
        [testFileId]
    );
    const [proc1] = await pool.query(
        `INSERT INTO PROCESSES (operation_id, pid_alias, cpu_burst_time, priority, state)
         VALUES (?, 'PROC-TESTHOLDER', 3, 1, 'RUNNING')`,
        [op1.insertId]
    );
    const [lock1] = await pool.query(
        `INSERT INTO FILE_LOCKS (file_id, process_id, lock_type, lock_status, acquired_at)
         VALUES (?, ?, 'EXCLUSIVE', 'ACQUIRED', CURRENT_TIMESTAMP)`,
        [testFileId, proc1.insertId]
    );

    const [op2] = await pool.query(
        `INSERT INTO OPERATIONS (user_id, file_id, operation_type, priority, status, details)
         VALUES (2, ?, 'EDIT', 2, 'QUEUED', '{"reason":"branch_test"}')`,
        [testFileId]
    );
    const [proc2] = await pool.query(
        `INSERT INTO PROCESSES (operation_id, pid_alias, cpu_burst_time, priority, state)
         VALUES (?, 'PROC-TESTWAITER', 2, 2, 'WAITING')`,
        [op2.insertId]
    );
    const [lock2] = await pool.query(
        `INSERT INTO FILE_LOCKS (file_id, process_id, lock_type, lock_status, requested_at)
         VALUES (?, ?, 'EXCLUSIVE', 'WAITING', CURRENT_TIMESTAMP)`,
        [testFileId, proc2.insertId]
    );

    try {
        // 2. Verify conflict endpoint detects this contest
        const confRes = await fetch(`${BASE_URL}/files/${testFileId}/conflicts`);
        assert.equal(confRes.status, 200);
        const confData = await confRes.json();
        assert.equal(confData.hasConflict, true);
        assert.equal(confData.activeHolder.lock_id, lock1.insertId);
        assert.equal(confData.conflictingWaiters[0].lock_id, lock2.insertId);

        // 3. Resolve using CREATE_BRANCH
        const resolveRes = await fetch(`${BASE_URL}/files/${testFileId}/resolve-conflict`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ strategy: 'CREATE_BRANCH', user_id: 1 })
        });
        assert.equal(resolveRes.status, 200);
        const resolveData = await resolveRes.json();
        assert.equal(resolveData.resolved, true);
        assert.equal(resolveData.strategy, 'CREATE_BRANCH');
        assert.ok(resolveData.branchedFile);
        assert.ok(resolveData.branchedFile.file_id);
        assert.ok(resolveData.branchedFile.file_name.includes('conflict_eval_test_branch'));

        // 4. Verify in MySQL that branched file exists and waiter's lock is released
        const [branchRows] = await pool.query(
            'SELECT file_id, file_name, status FROM FILES WHERE file_id = ?',
            [resolveData.branchedFile.file_id]
        );
        assert.equal(branchRows.length, 1);
        assert.equal(branchRows[0].status, 'ACTIVE');

        const [waiterLockRows] = await pool.query(
            'SELECT lock_status FROM FILE_LOCKS WHERE lock_id = ?',
            [lock2.insertId]
        );
        assert.equal(waiterLockRows[0].lock_status, 'RELEASED');

        // Cleanup the created branch file
        await pool.query('DELETE FROM FILES WHERE file_id = ?', [resolveData.branchedFile.file_id]);
    } finally {
        // Teardown test artifacts
        await pool.query('DELETE FROM FILE_LOCKS WHERE lock_id IN (?, ?)', [lock1.insertId, lock2.insertId]);
        await pool.query('DELETE FROM PROCESSES WHERE process_id IN (?, ?)', [proc1.insertId, proc2.insertId]);
        await pool.query('DELETE FROM OPERATIONS WHERE operation_id IN (?, ?)', [op1.insertId, op2.insertId]);
        await pool.query('DELETE FROM FILES WHERE file_id = ?', [testFileId]);
    }
});

test.after(async () => {
    await pool.end();
});

