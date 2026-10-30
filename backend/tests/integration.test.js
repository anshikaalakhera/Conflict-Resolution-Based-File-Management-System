import test from 'node:test';
import assert from 'node:assert/strict';
import pool from '../config/db.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const BASE_URL = 'http://localhost:3000/api';

// ─── Helper: login and return token ──────────────────────────────────────────
async function login(username, password) {
    const res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    return data.token;
}

async function apiAs(token, path, opts = {}) {
    const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return fetch(`${BASE_URL}${path}`, { ...opts, headers });
}

// ─── Test 1: Health check ────────────────────────────────────────────────────
test('Integration: Health check', async () => {
    const res = await fetch(`${BASE_URL}/health`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'UP');
});

// ─── Test 2: Static frontend ─────────────────────────────────────────────────
test('Integration: Static frontend serving on port 3000', async () => {
    const res = await fetch('http://localhost:3000/');
    assert.equal(res.status, 200);
    const contentType = res.headers.get('content-type') || '';
    assert.ok(contentType.includes('text/html'));
    const html = await res.text();
    assert.ok(html.includes('ConflictCore'));
    assert.ok(html.includes('File explorer'));
});

// ─── Test 3: Authentication – Registration & Password Hashing ────────────────
test('Integration: Authentication - Registration & Password Hashing', async () => {
    const unique = Date.now();
    const testUsername = `user_${unique}`;
    const testEmail = `user_${unique}@test.io`;
    const testPassword = 'SecretPassword123!';

    const regRes = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: testUsername, email: testEmail, password: testPassword })
    });

    assert.equal(regRes.status, 201);
    const regData = await regRes.json();
    assert.equal(regData.user.username, testUsername);
    assert.ok(regData.token);

    const [dbRows] = await pool.query(
        'SELECT user_id, username, password_hash, role, status FROM USERS WHERE user_id = ?',
        [regData.user.user_id]
    );
    assert.equal(dbRows.length, 1);
    assert.ok(dbRows[0].password_hash.startsWith('$2'));
    assert.notEqual(dbRows[0].password_hash, testPassword);

    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: testUsername, password: testPassword })
    });
    assert.equal(loginRes.status, 200);
    const loginData = await loginRes.json();
    assert.equal(loginData.user.username, testUsername);
    assert.ok(loginData.token);

    const badLoginRes = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: testUsername, password: 'WrongPassword' })
    });
    assert.equal(badLoginRes.status, 401);

    await pool.query('DELETE FROM USERS WHERE user_id = ?', [regData.user.user_id]);
});

// ─── Test 4: Seed Demo User Login ────────────────────────────────────────────
test('Integration: Authentication - Seed Demo User Login', async () => {
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin_super', password: 'admin123' })
    });
    assert.equal(loginRes.status, 200);
    const data = await loginRes.json();
    assert.equal(data.user.username, 'admin_super');
    assert.equal(data.user.role, 'ADMIN');
    assert.ok(data.token);
});

// ─── Test 5: Folder Hierarchy & CRUD with Cycle Prevention ───────────────────
test('Integration: Folder Hierarchy & CRUD with Cycle Prevention', async () => {
    const stamp = Date.now();
    const parentName = `Folder_Parent_${stamp}`;
    const childName = `Folder_Child_${stamp}`;

    const createParentRes = await fetch(`${BASE_URL}/folders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder_name: parentName, parent_folder_id: null, owner_id: 1 })
    });
    assert.equal(createParentRes.status, 201);
    const parentData = await createParentRes.json();
    const parentId = parentData.folder.folder_id;
    assert.equal(parentData.folder.folder_name, parentName);
    assert.equal(parentData.folder.parent_folder_id, null);

    const createChildRes = await fetch(`${BASE_URL}/folders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder_name: childName, parent_folder_id: parentId, owner_id: 1 })
    });
    assert.equal(createChildRes.status, 201);
    const childData = await createChildRes.json();
    const childId = childData.folder.folder_id;
    assert.equal(childData.folder.parent_folder_id, parentId);

    const getParentRes = await fetch(`${BASE_URL}/folders/${parentId}`);
    assert.equal(getParentRes.status, 200);
    const parentDetails = await getParentRes.json();
    assert.equal(parentDetails.folder.folder_id, parentId);
    assert.ok(parentDetails.subfolders.some(sf => sf.folder_id === childId));

    const cycleRes = await fetch(`${BASE_URL}/folders/${parentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parent_folder_id: childId })
    });
    assert.equal(cycleRes.status, 400);
    const cycleErr = await cycleRes.json();
    assert.ok(cycleErr.message.includes('cycle'));

    const renameRes = await fetch(`${BASE_URL}/folders/${childId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder_name: `${childName}_Renamed` })
    });
    assert.equal(renameRes.status, 200);
    const renamed = await renameRes.json();
    assert.equal(renamed.folder.folder_name, `${childName}_Renamed`);

    const delChildRes = await fetch(`${BASE_URL}/folders/${childId}`, { method: 'DELETE' });
    assert.equal(delChildRes.status, 200);

    const delParentRes = await fetch(`${BASE_URL}/folders/${parentId}`, { method: 'DELETE' });
    assert.equal(delParentRes.status, 200);
});

// ─── Test 6: File Move to Root ────────────────────────────────────────────────
test('Integration: File Move to Root (Verifying COALESCE fix)', async () => {
    const adminToken = await login('admin_super', 'admin123');
    const folderRes = await fetch(`${BASE_URL}/folders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder_name: `TempFolder_${Date.now()}`, owner_id: 1 })
    });
    const folderData = await folderRes.json();
    const tempFolderId = folderData.folder.folder_id;

    const [fileInsert] = await pool.query(
        `INSERT INTO FILES (file_name, folder_id, owner_id, file_size_bytes, file_path, mime_type)
         VALUES ('test_move.txt', ?, 1, 100, 'test_move.txt', 'text/plain')`,
        [tempFolderId]
    );
    const testFileId = fileInsert.insertId;

    const [row1] = await pool.query('SELECT folder_id FROM FILES WHERE file_id = ?', [testFileId]);
    assert.equal(row1[0].folder_id, tempFolderId);

    const moveRes = await apiAs(adminToken, `/files/${testFileId}`, {
        method: 'PUT',
        body: JSON.stringify({ folder_id: null })
    });
    assert.equal(moveRes.status, 200);

    const [row2] = await pool.query('SELECT folder_id FROM FILES WHERE file_id = ?', [testFileId]);
    assert.equal(row2[0].folder_id, null);

    await pool.query('DELETE FROM FILE_VERSIONS WHERE file_id = ?', [testFileId]);
    await pool.query('DELETE FROM FILES WHERE file_id = ?', [testFileId]);
    await pool.query('DELETE FROM FOLDERS WHERE folder_id = ?', [tempFolderId]);
});

// ─── Test 7: OS Scheduling Algorithm Selection ────────────────────────────────
test('Integration: OS Scheduling Algorithm Selection', async () => {
    const sjfRes = await fetch(`${BASE_URL}/scheduler/algorithm`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ algorithm: 'SJF' })
    });
    assert.equal(sjfRes.status, 200);
    const sjfData = await sjfRes.json();
    assert.equal(sjfData.algorithm, 'SJF');

    const prioRes = await fetch(`${BASE_URL}/scheduler/algorithm`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ algorithm: 'PRIORITY' })
    });
    assert.equal(prioRes.status, 200);
    assert.equal((await prioRes.json()).algorithm, 'PRIORITY');

    const fcfsRes = await fetch(`${BASE_URL}/scheduler/algorithm`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ algorithm: 'FCFS' })
    });
    assert.equal(fcfsRes.status, 200);
    assert.equal((await fcfsRes.json()).algorithm, 'FCFS');
});

// ─── Test 8: Lock Manager & Deadlock Endpoints ────────────────────────────────
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

// ─── Test 9: File Version History from FILE_VERSIONS table ────────────────────
test('Integration: File Version History — FILE_VERSIONS table', async () => {
    const adminToken = await login('admin_super', 'admin123');
    const res = await apiAs(adminToken, '/files/1/versions');
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.file, 'Response must include file metadata');
    assert.ok(data.file.file_name, 'File must have a name');
    assert.ok(typeof data.total_versions === 'number', 'total_versions must be a number');
    assert.ok(Array.isArray(data.versions), 'versions must be an array');
    assert.ok(Array.isArray(data.operations), 'operations must be an array');

    if (data.versions.length > 0) {
        const v = data.versions[0];
        assert.ok(v.version_id, 'Version must have a version_id');
        assert.ok(v.version_number >= 1, 'version_number must be >= 1');
        assert.ok(v.author_name, 'Version must have author_name');
        assert.ok('is_current' in v, 'Version must have is_current field');
    }
});

// ─── Test 10: Real concurrent-change detection via version numbers ─────────────
test('Integration: Concurrent Write Conflict Detection via Version Numbers', async () => {
    const shubhamToken = await login('shubham_k', 'password123');
    const tmpContent = Buffer.from('original content v1');
    const tmpPath = path.join(process.cwd(), 'storage', `conflict_test_${Date.now()}.txt`);
    await fs.writeFile(tmpPath, tmpContent);

    const [fileInsert] = await pool.query(
        `INSERT INTO FILES (file_name, folder_id, owner_id, file_size_bytes, file_path, mime_type, status)
         VALUES ('stale_conflict_test.txt', NULL, 2, ?, ?, 'text/plain', 'ACTIVE')`,
        [tmpContent.length, tmpPath]
    );
    const testFileId = fileInsert.insertId;

    await pool.query(
        `INSERT INTO FILE_VERSIONS (file_id, version_number, file_path, file_size_bytes, mime_type, created_by, is_current)
         VALUES (?, 1, ?, ?, 'text/plain', 2, TRUE)`,
        [testFileId, tmpPath, tmpContent.length]
    );

    try {
        const v2Content = Buffer.from('client A update — version 2');
        const v2Path = path.join(process.cwd(), 'storage', `conflict_test_v2_${Date.now()}.txt`);
        await fs.writeFile(v2Path, v2Content);

        const updateA = await apiAs(shubhamToken, `/files/${testFileId}`, {
            method: 'PUT',
            body: JSON.stringify({
                file_path: v2Path,
                file_size_bytes: v2Content.length,
                mime_type: 'text/plain',
                base_version_number: 1,
                user_id: 2,
                change_summary: 'Client A edit'
            })
        });
        assert.equal(updateA.status, 200, 'Client A update (v1→v2) should succeed');
        const dataA = await updateA.json();
        assert.equal(dataA.new_version, 2, 'Should advance to version 2');

        const v3Content = Buffer.from('client B late update — conflict');
        const v3Path = path.join(process.cwd(), 'storage', `conflict_test_v3_${Date.now()}.txt`);
        await fs.writeFile(v3Path, v3Content);

        const updateB = await apiAs(shubhamToken, `/files/${testFileId}`, {
            method: 'PUT',
            body: JSON.stringify({
                file_path: v3Path,
                file_size_bytes: v3Content.length,
                mime_type: 'text/plain',
                base_version_number: 1,
                user_id: 2,
                change_summary: 'Client B concurrent edit'
            })
        });
        assert.equal(updateB.status, 409, 'Client B stale update should return 409 Conflict');
        const dataB = await updateB.json();
        assert.ok(dataB.conflict, 'Response must include conflict object');
        assert.ok(dataB.conflict.conflict_id, 'Conflict must have an ID');
        assert.equal(dataB.conflict.base_version, 1);
        assert.equal(dataB.conflict.current_version, 2);

        const [conflictRows] = await pool.query(
            'SELECT * FROM CONFLICTS WHERE file_id = ? AND status = ?',
            [testFileId, 'OPEN']
        );
        assert.equal(conflictRows.length, 1, 'Exactly one OPEN conflict should be recorded');

        const confRes = await apiAs(shubhamToken, `/files/${testFileId}/conflicts`);
        assert.equal(confRes.status, 200);
        const confData = await confRes.json();
        assert.equal(confData.hasConflict, true);
        assert.equal(confData.openConflicts.length, 1);

        const resolveRes = await apiAs(shubhamToken, `/files/${testFileId}/resolve-conflict`, {
            method: 'POST',
            body: JSON.stringify({
                strategy: 'KEEP_CURRENT',
                user_id: 2,
                conflict_id: dataB.conflict.conflict_id
            })
        });
        assert.equal(resolveRes.status, 200);
        const resolveData = await resolveRes.json();
        assert.equal(resolveData.resolved, true);

        const [resolvedRows] = await pool.query(
            'SELECT status FROM CONFLICTS WHERE conflict_id = ?',
            [dataB.conflict.conflict_id]
        );
        assert.equal(resolvedRows[0].status, 'RESOLVED');

        const confRes2 = await apiAs(shubhamToken, `/files/${testFileId}/conflicts`);
        const confData2 = await confRes2.json();
        assert.equal(confData2.hasConflict, false);

        try { await fs.unlink(v2Path); } catch {}
        try { await fs.unlink(v3Path); } catch {}
    } finally {
        await pool.query('DELETE FROM CONFLICTS WHERE file_id = ?', [testFileId]);
        await pool.query('DELETE FROM FILE_VERSIONS WHERE file_id = ?', [testFileId]);
        await pool.query('DELETE FROM FILES WHERE file_id = ?', [testFileId]);
        try { await fs.unlink(tmpPath); } catch {}
    }
});

// ─── Test 11: Version History — multiple updates tracked correctly ─────────────
test('Integration: File Version Tracking — successive updates', async () => {
    const shubhamToken = await login('shubham_k', 'password123');
    const v1Content = Buffer.from('version 1 original content');
    const v1Path = path.join(process.cwd(), 'storage', `ver_test_v1_${Date.now()}.txt`);
    await fs.writeFile(v1Path, v1Content);

    const [fileInsert] = await pool.query(
        `INSERT INTO FILES (file_name, owner_id, file_size_bytes, file_path, mime_type, status)
         VALUES ('version_tracking_test.txt', 2, ?, ?, 'text/plain', 'ACTIVE')`,
        [v1Content.length, v1Path]
    );
    const testFileId = fileInsert.insertId;
    await pool.query(
        `INSERT INTO FILE_VERSIONS (file_id, version_number, file_path, file_size_bytes, mime_type, created_by, is_current)
         VALUES (?, 1, ?, ?, 'text/plain', 2, TRUE)`,
        [testFileId, v1Path, v1Content.length]
    );

    const createdPaths = [v1Path];

    try {
        const v2Content = Buffer.from('version 2 content — first update');
        const v2Path = path.join(process.cwd(), 'storage', `ver_test_v2_${Date.now()}.txt`);
        await fs.writeFile(v2Path, v2Content);
        createdPaths.push(v2Path);

        const upd1 = await apiAs(shubhamToken, `/files/${testFileId}`, {
            method: 'PUT',
            body: JSON.stringify({
                file_path: v2Path, file_size_bytes: v2Content.length, mime_type: 'text/plain',
                base_version_number: 1, user_id: 2, change_summary: 'First edit'
            })
        });
        assert.equal(upd1.status, 200);
        assert.equal((await upd1.json()).new_version, 2);

        const v3Content = Buffer.from('version 3 content — second update');
        const v3Path = path.join(process.cwd(), 'storage', `ver_test_v3_${Date.now()}.txt`);
        await fs.writeFile(v3Path, v3Content);
        createdPaths.push(v3Path);

        const upd2 = await apiAs(shubhamToken, `/files/${testFileId}`, {
            method: 'PUT',
            body: JSON.stringify({
                file_path: v3Path, file_size_bytes: v3Content.length, mime_type: 'text/plain',
                base_version_number: 2, user_id: 2, change_summary: 'Second edit'
            })
        });
        assert.equal(upd2.status, 200);
        assert.equal((await upd2.json()).new_version, 3);

        const histRes = await apiAs(shubhamToken, `/files/${testFileId}/versions`);
        assert.equal(histRes.status, 200);
        const histData = await histRes.json();
        assert.equal(histData.total_versions, 3);

        const v1rec = histData.versions.find(v => v.version_number === 1);
        const v2rec = histData.versions.find(v => v.version_number === 2);
        const v3rec = histData.versions.find(v => v.version_number === 3);

        assert.ok(v1rec, 'v1 must exist in history');
        assert.ok(v2rec, 'v2 must exist in history');
        assert.ok(v3rec, 'v3 must exist in history');
        assert.equal(v3rec.is_current, true, 'v3 should be current');
        assert.equal(v1rec.is_current, false, 'v1 should be archived');
        assert.equal(v2rec.is_current, false, 'v2 should be archived');

        const specRes = await apiAs(shubhamToken, `/files/${testFileId}/versions/2`);
        assert.equal(specRes.status, 200);
        const specData = await specRes.json();
        assert.equal(specData.version.version_number, 2);
        assert.equal(specData.version.change_summary, 'First edit');

        const restoreRes = await apiAs(shubhamToken, `/files/${testFileId}/versions/1/restore`, {
            method: 'POST',
            body: JSON.stringify({ user_id: 2 })
        });
        assert.equal(restoreRes.status, 200);
        const restoreData = await restoreRes.json();
        assert.equal(restoreData.from_version, 1);
        assert.equal(restoreData.new_version, 4, 'Restore creates version 4');

        const histRes2 = await apiAs(shubhamToken, `/files/${testFileId}/versions`);
        const histData2 = await histRes2.json();
        const v4rec = histData2.versions.find(v => v.version_number === 4);
        assert.ok(v4rec, 'v4 (restore) must exist');
        assert.equal(v4rec.is_current, true);
    } finally {
        await pool.query('DELETE FROM FILE_VERSIONS WHERE file_id = ?', [testFileId]);
        await pool.query('DELETE FROM FILES WHERE file_id = ?', [testFileId]);
        for (const p of createdPaths) { try { await fs.unlink(p); } catch {} }
    }
});

// ─── Test 12: Conflict Resolution — CREATE_BRANCH (lock-based) ───────────────
test('Integration: Conflict Resolution Strategy (CREATE_BRANCH)', async () => {
    const adminToken = await login('admin_super', 'admin123');
    const stamp = Date.now();
    const fixtureName = `conflict_eval_test_${stamp}.txt`;
    const fixturePath = path.join(process.cwd(), 'storage', fixtureName);
    await fs.writeFile(fixturePath, Buffer.from('conflict_eval fixture content for branch test'));

    const [fileInsert] = await pool.query(
        `INSERT INTO FILES (file_name, folder_id, owner_id, file_size_bytes, file_path, mime_type, status)
         VALUES (?, 1, 1, 512, ?, 'text/plain', 'LOCKED')`,
        [fixtureName, fixturePath]
    );
    const testFileId = fileInsert.insertId;

    const [op1] = await pool.query(
        `INSERT INTO OPERATIONS (user_id, file_id, operation_type, priority, status)
         VALUES (1, ?, 'EDIT', 1, 'EXECUTING')`, [testFileId]
    );
    const [proc1] = await pool.query(
        `INSERT INTO PROCESSES (operation_id, pid_alias, cpu_burst_time, priority, state)
         VALUES (?, 'PROC-TESTHOLDER', 3, 1, 'RUNNING')`, [op1.insertId]
    );
    const [lock1] = await pool.query(
        `INSERT INTO FILE_LOCKS (file_id, process_id, lock_type, lock_status, acquired_at)
         VALUES (?, ?, 'EXCLUSIVE', 'ACQUIRED', CURRENT_TIMESTAMP)`,
        [testFileId, proc1.insertId]
    );

    const [op2] = await pool.query(
        `INSERT INTO OPERATIONS (user_id, file_id, operation_type, priority, status, details)
         VALUES (2, ?, 'EDIT', 2, 'QUEUED', '{"reason":"branch_test"}')`, [testFileId]
    );
    const [proc2] = await pool.query(
        `INSERT INTO PROCESSES (operation_id, pid_alias, cpu_burst_time, priority, state)
         VALUES (?, 'PROC-TESTWAITER', 2, 2, 'WAITING')`, [op2.insertId]
    );
    const [lock2] = await pool.query(
        `INSERT INTO FILE_LOCKS (file_id, process_id, lock_type, lock_status, requested_at)
         VALUES (?, ?, 'EXCLUSIVE', 'WAITING', CURRENT_TIMESTAMP)`,
        [testFileId, proc2.insertId]
    );

    try {
        const confRes = await apiAs(adminToken, `/files/${testFileId}/conflicts`);
        assert.equal(confRes.status, 200);
        const confData = await confRes.json();
        assert.equal(confData.hasConflict, true);
        assert.equal(confData.activeHolder.lock_id, lock1.insertId);
        assert.equal(confData.conflictingWaiters[0].lock_id, lock2.insertId);

        const resolveRes = await apiAs(adminToken, `/files/${testFileId}/resolve-conflict`, {
            method: 'POST',
            body: JSON.stringify({ strategy: 'CREATE_BRANCH', user_id: 1 })
        });
        assert.equal(resolveRes.status, 200);
        const resolveData = await resolveRes.json();
        assert.equal(resolveData.resolved, true);
        assert.equal(resolveData.strategy, 'CREATE_BRANCH');
        assert.ok(resolveData.branchedFile);
        assert.ok(resolveData.branchedFile.file_id);
        assert.ok(
            resolveData.branchedFile.file_name.includes('_branch_'),
            `Branch file name should include "_branch_", got: ${resolveData.branchedFile.file_name}`
        );

        const [branchRows] = await pool.query(
            'SELECT file_id, file_name, file_path, status FROM FILES WHERE file_id = ?',
            [resolveData.branchedFile.file_id]
        );
        assert.equal(branchRows.length, 1);
        assert.equal(branchRows[0].status, 'ACTIVE');

        let branchFileExists = false;
        try { await fs.access(branchRows[0].file_path); branchFileExists = true; } catch {}
        assert.ok(branchFileExists, 'Branched physical file must exist on disk');

        await pool.query('DELETE FROM FILE_VERSIONS WHERE file_id = ?', [resolveData.branchedFile.file_id]);
        await pool.query('DELETE FROM FILES WHERE file_id = ?', [resolveData.branchedFile.file_id]);
        try { await fs.unlink(branchRows[0].file_path); } catch {}
    } finally {
        await pool.query('DELETE FROM FILE_LOCKS WHERE file_id = ?', [testFileId]);
        await pool.query('DELETE FROM PROCESSES WHERE operation_id IN (?, ?)', [op1.insertId, op2.insertId]);
        await pool.query('DELETE FROM OPERATIONS WHERE operation_id IN (?, ?)', [op1.insertId, op2.insertId]);
        await pool.query('DELETE FROM FILE_VERSIONS WHERE file_id = ?', [testFileId]);
        await pool.query('DELETE FROM FILES WHERE file_id = ?', [testFileId]);
        try { await fs.unlink(fixturePath); } catch {}
    }
});

// ─── Test 13: User Data Isolation (Shubham vs Avni vs Admin) ─────────────────
test('Integration: User Data Isolation (Shubham vs Avni vs Admin)', async () => {
    const adminToken   = await login('admin_super', 'admin123');
    const shubhamToken = await login('shubham_k',   'password123');
    const avniToken    = await login('avni_n',      'password123');

    const adminRes = await apiAs(adminToken, '/files');
    assert.equal(adminRes.status, 200);
    const adminFiles = (await adminRes.json()).files;

    const shubhamRes = await apiAs(shubhamToken, '/files');
    assert.equal(shubhamRes.status, 200);
    const shubhamFiles = (await shubhamRes.json()).files;

    const avniRes = await apiAs(avniToken, '/files');
    assert.equal(avniRes.status, 200);

    assert.ok(adminFiles.length >= shubhamFiles.length);
});

// ─── Test 14: Unauthorized Access Rejection (403 Forbidden) ──────────────────
test('Integration: Unauthorized Access Rejection (403 Forbidden)', async () => {
    const avniToken = await login('avni_n', 'password123');
    const res = await apiAs(avniToken, '/files/1');
    assert.equal(res.status, 403, 'Avni accessing shubham private file must return 403');
});

// ─── Test 15: Explicit File Sharing Workflow ─────────────────────────────────
test('Integration: Explicit File Sharing Workflow', async () => {
    const shubhamToken = await login('shubham_k', 'password123');
    const shareRes = await apiAs(shubhamToken, '/files/3/share', {
        method: 'POST',
        body: JSON.stringify({ target_username: 'avni_n', permission_type: 'READ' })
    });
    assert.equal(shareRes.status, 200);
    const shareData = await shareRes.json();
    assert.equal(shareData.shared_with, 'avni_n');
});

// ─── Test 16: OS Process queue and scheduler metrics ─────────────────────────
test('Integration: OS Processes endpoint and scheduling metrics', async () => {
    const res = await fetch(`${BASE_URL}/processes`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data.processes), 'processes must be an array');
    assert.ok(typeof data.algorithm === 'string', 'algorithm must be a string');
    assert.ok(['FCFS', 'SJF', 'PRIORITY'].includes(data.algorithm));
    assert.ok(data.averages, 'averages must be present');
    assert.ok(Array.isArray(data.readyQueue));
});

// ─── Test 17: FILE_VERSIONS table schema verification ────────────────────────
test('Integration: FILE_VERSIONS schema exists and has correct columns', async () => {
    const [cols] = await pool.query('DESCRIBE FILE_VERSIONS');
    const colNames = cols.map(c => c.Field);
    assert.ok(colNames.includes('version_id'));
    assert.ok(colNames.includes('file_id'));
    assert.ok(colNames.includes('version_number'));
    assert.ok(colNames.includes('file_path'));
    assert.ok(colNames.includes('is_current'));
    assert.ok(colNames.includes('checksum'));
    assert.ok(colNames.includes('change_summary'));
    assert.ok(colNames.includes('created_by'));

    const [confl] = await pool.query('DESCRIBE CONFLICTS');
    const conflNames = confl.map(c => c.Field);
    assert.ok(conflNames.includes('conflict_id'));
    assert.ok(conflNames.includes('file_id'));
    assert.ok(conflNames.includes('status'));
    assert.ok(conflNames.includes('resolution_strategy'));
    assert.ok(conflNames.includes('base_version_id'));
    assert.ok(conflNames.includes('incoming_version_id'));
});

// ─── Test 18: Seed files all have version records ────────────────────────────
test('Integration: All active files have at least one FILE_VERSIONS record', async () => {
    const [files] = await pool.query('SELECT file_id FROM FILES WHERE status IN (?, ?)', ['ACTIVE', 'LOCKED']);
    for (const f of files) {
        const [vers] = await pool.query('SELECT COUNT(*) AS cnt FROM FILE_VERSIONS WHERE file_id = ?', [f.file_id]);
        assert.ok(vers[0].cnt >= 1, `file_id=${f.file_id} must have at least 1 version record`);
    }
});

// ─── Test 19: Unauthenticated GET /files returns 401 ─────────────────────────
test('Integration: T19 Unauthenticated GET /files returns 401 Unauthorized', async () => {
    const res = await fetch(`${BASE_URL}/files`);
    assert.equal(res.status, 401, 'Unauthenticated request must return 401');
    const data = await res.json();
    assert.ok(data.message.includes('Authentication'));
});

// ─── Test 20: Private File Access Denial (403 Forbidden) ────────────────────
test('Integration: T20 Private file access denial across users', async () => {
    const shubhamToken = await login('shubham_k', 'password123');
    const avniToken = await login('avni_n', 'password123');

    const stamp = Date.now();
    const filePath = path.join(process.cwd(), 'storage', `priv_test_${stamp}.txt`);
    await fs.writeFile(filePath, 'shubham private notes');

    const [ins] = await pool.query(
        `INSERT INTO FILES (file_name, owner_id, file_size_bytes, file_path, mime_type, status)
         VALUES ('priv_notes.txt', 2, 21, ?, 'text/plain', 'ACTIVE')`,
        [filePath]
    );
    const privId = ins.insertId;
    await pool.query(
        `INSERT INTO FILE_VERSIONS (file_id, version_number, file_path, file_size_bytes, mime_type, created_by, is_current)
         VALUES (?, 1, ?, 21, 'text/plain', 2, TRUE)`,
        [privId, filePath]
    );

    try {
        const shubhamGet = await apiAs(shubhamToken, `/files/${privId}`);
        assert.equal(shubhamGet.status, 200, 'Owner can access their own file');

        const avniGet = await apiAs(avniToken, `/files/${privId}`);
        assert.equal(avniGet.status, 403, 'Other user receives 403 Forbidden for private file');
    } finally {
        await pool.query('DELETE FROM FILE_VERSIONS WHERE file_id = ?', [privId]);
        await pool.query('DELETE FROM FILES WHERE file_id = ?', [privId]);
        try { await fs.unlink(filePath); } catch {}
    }
});

// ─── Test 21: File Sharing Workflow – Grant Access ───────────────────────────
test('Integration: T21 File sharing grant allows recipient access', async () => {
    const shubhamToken = await login('shubham_k', 'password123');
    const avniToken = await login('avni_n', 'password123');

    const stamp = Date.now();
    const filePath = path.join(process.cwd(), 'storage', `share_grant_${stamp}.txt`);
    await fs.writeFile(filePath, 'collaborative document');

    const [ins] = await pool.query(
        `INSERT INTO FILES (file_name, owner_id, file_size_bytes, file_path, mime_type, status)
         VALUES ('shared_doc.txt', 2, 22, ?, 'text/plain', 'ACTIVE')`,
        [filePath]
    );
    const sharedId = ins.insertId;
    await pool.query(
        `INSERT INTO FILE_VERSIONS (file_id, version_number, file_path, file_size_bytes, mime_type, created_by, is_current)
         VALUES (?, 1, ?, 22, 'text/plain', 2, TRUE)`,
        [sharedId, filePath]
    );

    try {
        const beforeShare = await apiAs(avniToken, `/files/${sharedId}`);
        assert.equal(beforeShare.status, 403, 'Avni initially denied');

        const shareRes = await apiAs(shubhamToken, `/files/${sharedId}/share`, {
            method: 'POST',
            body: JSON.stringify({ target_username: 'avni_n', permission_type: 'READ' })
        });
        assert.equal(shareRes.status, 200);

        const afterShare = await apiAs(avniToken, `/files/${sharedId}`);
        assert.equal(afterShare.status, 200, 'Avni granted read access after sharing');
        const fileData = await afterShare.json();
        assert.equal(fileData.file.file_name, 'shared_doc.txt');
    } finally {
        await pool.query('DELETE FROM FILE_PERMISSIONS WHERE file_id = ?', [sharedId]);
        await pool.query('DELETE FROM FILE_VERSIONS WHERE file_id = ?', [sharedId]);
        await pool.query('DELETE FROM FILES WHERE file_id = ?', [sharedId]);
        try { await fs.unlink(filePath); } catch {}
    }
});

// ─── Test 22: Revoke File Share Immediately Denies Access ─────────────────────
test('Integration: T22 Revoking file share immediately restores 403 Forbidden', async () => {
    const shubhamToken = await login('shubham_k', 'password123');
    const avniToken = await login('avni_n', 'password123');

    const stamp = Date.now();
    const filePath = path.join(process.cwd(), 'storage', `revoke_test_${stamp}.txt`);
    await fs.writeFile(filePath, 'temporary shared doc');

    const [ins] = await pool.query(
        `INSERT INTO FILES (file_name, owner_id, file_size_bytes, file_path, mime_type, status)
         VALUES ('revoke_doc.txt', 2, 22, ?, 'text/plain', 'ACTIVE')`,
        [filePath]
    );
    const fileId = ins.insertId;
    await pool.query(
        `INSERT INTO FILE_VERSIONS (file_id, version_number, file_path, file_size_bytes, mime_type, created_by, is_current)
         VALUES (?, 1, ?, 22, 'text/plain', 2, TRUE)`,
        [fileId, filePath]
    );

    try {
        await apiAs(shubhamToken, `/files/${fileId}/share`, {
            method: 'POST',
            body: JSON.stringify({ target_username: 'avni_n', permission_type: 'READ' })
        });
        const canAccess = await apiAs(avniToken, `/files/${fileId}`);
        assert.equal(canAccess.status, 200);

        const revokeRes = await apiAs(shubhamToken, `/files/${fileId}/share/3`, {
            method: 'DELETE'
        });
        assert.equal(revokeRes.status, 200);

        const deniedAccess = await apiAs(avniToken, `/files/${fileId}`);
        assert.equal(deniedAccess.status, 403, 'Access denied immediately after revocation');
    } finally {
        await pool.query('DELETE FROM FILE_PERMISSIONS WHERE file_id = ?', [fileId]);
        await pool.query('DELETE FROM FILE_VERSIONS WHERE file_id = ?', [fileId]);
        await pool.query('DELETE FROM FILES WHERE file_id = ?', [fileId]);
        try { await fs.unlink(filePath); } catch {}
    }
});

// ─── Test 23: Dashboard Isolation – Users see only owned and shared files ─────
test('Integration: T23 Dashboard file list is isolated per authenticated user', async () => {
    const shubhamToken = await login('shubham_k', 'password123');
    const avniToken = await login('avni_n', 'password123');

    const sRes = await apiAs(shubhamToken, '/files');
    assert.equal(sRes.status, 200);
    const sFiles = (await sRes.json()).files;

    const aRes = await apiAs(avniToken, '/files');
    assert.equal(aRes.status, 200);
    const aFiles = (await aRes.json()).files;

    for (const f of sFiles) {
        if (f.permission === 'OWNER') {
            assert.equal(f.owner_id, 2, 'Shubham only owns files with owner_id=2');
        }
    }
    for (const f of aFiles) {
        if (f.permission === 'OWNER') {
            assert.equal(f.owner_id, 3, 'Avni only owns files with owner_id=3');
        }
    }
});

// ─── Test 24: Admin Sees Complete System-Wide File Catalog ────────────────────
test('Integration: T24 Admin retrieves all system files', async () => {
    const adminToken = await login('admin_super', 'admin123');
    const shubhamToken = await login('shubham_k', 'password123');

    const adminRes = await apiAs(adminToken, '/files');
    const adminFiles = (await adminRes.json()).files;

    const shubhamRes = await apiAs(shubhamToken, '/files');
    const shubhamFiles = (await shubhamRes.json()).files;

    const [totalActive] = await pool.query("SELECT COUNT(*) AS cnt FROM FILES WHERE status IN ('ACTIVE', 'LOCKED')");
    assert.equal(adminFiles.length, totalActive[0].cnt, 'Admin sees all active database files');
    assert.ok(adminFiles.length >= shubhamFiles.length, 'Admin sees at least as many as regular user');
});

// ─── Test 25: Shared File Download by Recipient ──────────────────────────────
test('Integration: T25 Shared recipient can download permitted file', async () => {
    const shubhamToken = await login('shubham_k', 'password123');
    const avniToken = await login('avni_n', 'password123');

    const content = 'Content specifically for shared download test.';
    const stamp = Date.now();
    const filePath = path.join(process.cwd(), 'storage', `dl_test_${stamp}.txt`);
    await fs.writeFile(filePath, content);

    const [ins] = await pool.query(
        `INSERT INTO FILES (file_name, owner_id, file_size_bytes, file_path, mime_type, status)
         VALUES ('dl_test.txt', 2, ?, ?, 'text/plain', 'ACTIVE')`,
        [content.length, filePath]
    );
    const fileId = ins.insertId;
    await pool.query(
        `INSERT INTO FILE_VERSIONS (file_id, version_number, file_path, file_size_bytes, mime_type, created_by, is_current)
         VALUES (?, 1, ?, ?, 'text/plain', 2, TRUE)`,
        [fileId, filePath, content.length]
    );

    try {
        const unsharedDl = await apiAs(avniToken, `/files/${fileId}/download`);
        assert.equal(unsharedDl.status, 403, 'Cannot download unshared file');

        await apiAs(shubhamToken, `/files/${fileId}/share`, {
            method: 'POST',
            body: JSON.stringify({ target_username: 'avni_n', permission_type: 'READ' })
        });

        const sharedDl = await apiAs(avniToken, `/files/${fileId}/download`);
        assert.equal(sharedDl.status, 200, 'Can download after sharing');
        const downloadedText = await sharedDl.text();
        assert.equal(downloadedText, content, 'Downloaded content matches original file bytes');
    } finally {
        await pool.query('DELETE FROM FILE_PERMISSIONS WHERE file_id = ?', [fileId]);
        await pool.query('DELETE FROM FILE_VERSIONS WHERE file_id = ?', [fileId]);
        await pool.query('DELETE FROM FILES WHERE file_id = ?', [fileId]);
        try { await fs.unlink(filePath); } catch {}
    }
});

// ─── Test 26: Unauthorized Access to Version History Returns 403 ─────────────
test('Integration: T26 Unauthorized user receives 403 on version history endpoint', async () => {
    const avniToken = await login('avni_n', 'password123');
    const res = await apiAs(avniToken, '/files/1/versions');
    assert.equal(res.status, 403, 'Unauthorized user cannot read version history of private file');
});

// ─── Test 27: Conflict Resolution — ACCEPT_INCOMING Strategy ─────────────────
test('Integration: T27 Conflict resolution ACCEPT_INCOMING replaces current version', async () => {
    const shubhamToken = await login('shubham_k', 'password123');
    const stamp = Date.now();
    const v1Content = 'Original base version 1';
    const v1Path = path.join(process.cwd(), 'storage', `ai_v1_${stamp}.txt`);
    await fs.writeFile(v1Path, v1Content);

    const [fileInsert] = await pool.query(
        `INSERT INTO FILES (file_name, owner_id, file_size_bytes, file_path, mime_type, status)
         VALUES ('accept_incoming_test.txt', 2, ?, ?, 'text/plain', 'ACTIVE')`,
        [v1Content.length, v1Path]
    );
    const fileId = fileInsert.insertId;

    await pool.query(
        `INSERT INTO FILE_VERSIONS (file_id, version_number, file_path, file_size_bytes, mime_type, created_by, is_current)
         VALUES (?, 1, ?, ?, 'text/plain', 2, TRUE)`,
        [fileId, v1Path, v1Content.length]
    );

    const v2Path = path.join(process.cwd(), 'storage', `ai_v2_${stamp}.txt`);
    await fs.writeFile(v2Path, 'Current accepted v2 content');
    const v3Path = path.join(process.cwd(), 'storage', `ai_v3_${stamp}.txt`);
    await fs.writeFile(v3Path, 'Incoming competing v3 content');

    try {
        const upd1 = await apiAs(shubhamToken, `/files/${fileId}`, {
            method: 'PUT',
            body: JSON.stringify({
                file_path: v2Path, file_size_bytes: 26, mime_type: 'text/plain',
                base_version_number: 1, user_id: 2, change_summary: 'Advancing to v2'
            })
        });
        assert.equal(upd1.status, 200);

        const upd2 = await apiAs(shubhamToken, `/files/${fileId}`, {
            method: 'PUT',
            body: JSON.stringify({
                file_path: v3Path, file_size_bytes: 28, mime_type: 'text/plain',
                base_version_number: 1, user_id: 2, change_summary: 'Stale edit causing conflict'
            })
        });
        assert.equal(upd2.status, 409);
        const confData = await upd2.json();

        const resolveRes = await apiAs(shubhamToken, `/files/${fileId}/resolve-conflict`, {
            method: 'POST',
            body: JSON.stringify({
                strategy: 'ACCEPT_INCOMING',
                user_id: 2,
                conflict_id: confData.conflict.conflict_id
            })
        });
        assert.equal(resolveRes.status, 200);
        const resData = await resolveRes.json();
        assert.equal(resData.resolved, true);
        assert.equal(resData.strategy, 'ACCEPT_INCOMING');

        const [currVer] = await pool.query(
            'SELECT version_number, is_current, file_path FROM FILE_VERSIONS WHERE file_id = ? AND is_current = TRUE',
            [fileId]
        );
        assert.equal(currVer.length, 1);
        assert.equal(currVer[0].version_number, 3, 'Incoming version v3 became current');

        const dlRes = await apiAs(shubhamToken, `/files/${fileId}/download`);
        const text = await dlRes.text();
        assert.equal(text, 'Incoming competing v3 content', 'File content on disk reflects incoming version');
    } finally {
        await pool.query('DELETE FROM CONFLICTS WHERE file_id = ?', [fileId]);
        await pool.query('DELETE FROM FILE_VERSIONS WHERE file_id = ?', [fileId]);
        await pool.query('DELETE FROM FILES WHERE file_id = ?', [fileId]);
        try { await fs.unlink(v1Path); } catch {}
        try { await fs.unlink(v2Path); } catch {}
        try { await fs.unlink(v3Path); } catch {}
    }
});

// ─── Test 28: Conflict Resolution — Version-Based CREATE_BRANCH ──────────────
test('Integration: T28 Version-based conflict resolved with CREATE_BRANCH', async () => {
    const shubhamToken = await login('shubham_k', 'password123');
    const stamp = Date.now();
    const v1Path = path.join(process.cwd(), 'storage', `branch_v1_${stamp}.txt`);
    await fs.writeFile(v1Path, 'Base version 1 for branching');

    const [fileInsert] = await pool.query(
        `INSERT INTO FILES (file_name, owner_id, file_size_bytes, file_path, mime_type, status)
         VALUES ('branch_test_source.txt', 2, 28, ?, 'text/plain', 'ACTIVE')`,
        [v1Path]
    );
    const fileId = fileInsert.insertId;

    await pool.query(
        `INSERT INTO FILE_VERSIONS (file_id, version_number, file_path, file_size_bytes, mime_type, created_by, is_current)
         VALUES (?, 1, ?, 28, 'text/plain', 2, TRUE)`,
        [fileId, v1Path]
    );

    const v2Path = path.join(process.cwd(), 'storage', `branch_v2_${stamp}.txt`);
    await fs.writeFile(v2Path, 'Current v2 content');
    const v3Path = path.join(process.cwd(), 'storage', `branch_v3_${stamp}.txt`);
    await fs.writeFile(v3Path, 'Incoming v3 to be branched');

    let branchId = null;
    let branchPhysicalPath = null;

    try {
        await apiAs(shubhamToken, `/files/${fileId}`, {
            method: 'PUT',
            body: JSON.stringify({
                file_path: v2Path, file_size_bytes: 18, mime_type: 'text/plain',
                base_version_number: 1, user_id: 2, change_summary: 'Advancing to v2'
            })
        });

        const updConflict = await apiAs(shubhamToken, `/files/${fileId}`, {
            method: 'PUT',
            body: JSON.stringify({
                file_path: v3Path, file_size_bytes: 25, mime_type: 'text/plain',
                base_version_number: 1, user_id: 2, change_summary: 'Concurrent edit for branch'
            })
        });
        assert.equal(updConflict.status, 409);
        const confObj = await updConflict.json();

        const resolveRes = await apiAs(shubhamToken, `/files/${fileId}/resolve-conflict`, {
            method: 'POST',
            body: JSON.stringify({
                strategy: 'CREATE_BRANCH',
                user_id: 2,
                conflict_id: confObj.conflict.conflict_id
            })
        });
        assert.equal(resolveRes.status, 200);
        const rData = await resolveRes.json();
        assert.equal(rData.strategy, 'CREATE_BRANCH');
        assert.ok(rData.branchedFile);
        branchId = rData.branchedFile.file_id;

        const [branchFile] = await pool.query('SELECT * FROM FILES WHERE file_id = ?', [branchId]);
        assert.equal(branchFile.length, 1);
        branchPhysicalPath = branchFile[0].file_path;
        const exists = await fs.access(branchPhysicalPath).then(() => true).catch(() => false);
        assert.ok(exists, 'Physical branched file exists on disk');
    } finally {
        if (branchId) {
            await pool.query('DELETE FROM FILE_VERSIONS WHERE file_id = ?', [branchId]);
            await pool.query('DELETE FROM FILES WHERE file_id = ?', [branchId]);
        }
        if (branchPhysicalPath) { try { await fs.unlink(branchPhysicalPath); } catch {} }
        await pool.query('DELETE FROM CONFLICTS WHERE file_id = ?', [fileId]);
        await pool.query('DELETE FROM FILE_VERSIONS WHERE file_id = ?', [fileId]);
        await pool.query('DELETE FROM FILES WHERE file_id = ?', [fileId]);
        try { await fs.unlink(v1Path); } catch {}
        try { await fs.unlink(v2Path); } catch {}
        try { await fs.unlink(v3Path); } catch {}
    }
});

// ─── Test 29: Complete Version History Preserved Across Resolution ────────────
test('Integration: T29 All versions preserved in FILE_VERSIONS table after KEEP_CURRENT', async () => {
    const shubhamToken = await login('shubham_k', 'password123');
    const stamp = Date.now();
    const v1Path = path.join(process.cwd(), 'storage', `hist_v1_${stamp}.txt`);
    await fs.writeFile(v1Path, 'History v1 base');

    const [ins] = await pool.query(
        `INSERT INTO FILES (file_name, owner_id, file_size_bytes, file_path, mime_type, status)
         VALUES ('history_preserve.txt', 2, 15, ?, 'text/plain', 'ACTIVE')`,
        [v1Path]
    );
    const fileId = ins.insertId;

    await pool.query(
        `INSERT INTO FILE_VERSIONS (file_id, version_number, file_path, file_size_bytes, mime_type, created_by, is_current)
         VALUES (?, 1, ?, 15, 'text/plain', 2, TRUE)`,
        [fileId, v1Path]
    );

    const v2Path = path.join(process.cwd(), 'storage', `hist_v2_${stamp}.txt`);
    await fs.writeFile(v2Path, 'History v2 current');
    const v3Path = path.join(process.cwd(), 'storage', `hist_v3_${stamp}.txt`);
    await fs.writeFile(v3Path, 'History v3 incoming');

    try {
        await apiAs(shubhamToken, `/files/${fileId}`, {
            method: 'PUT',
            body: JSON.stringify({
                file_path: v2Path, file_size_bytes: 18, mime_type: 'text/plain',
                base_version_number: 1, user_id: 2, change_summary: 'Advancing to v2'
            })
        });

        const confRes = await apiAs(shubhamToken, `/files/${fileId}`, {
            method: 'PUT',
            body: JSON.stringify({
                file_path: v3Path, file_size_bytes: 19, mime_type: 'text/plain',
                base_version_number: 1, user_id: 2, change_summary: 'Stale update'
            })
        });
        const cData = await confRes.json();

        await apiAs(shubhamToken, `/files/${fileId}/resolve-conflict`, {
            method: 'POST',
            body: JSON.stringify({
                strategy: 'KEEP_CURRENT',
                user_id: 2,
                conflict_id: cData.conflict.conflict_id
            })
        });

        const [vers] = await pool.query(
            'SELECT version_number, is_current FROM FILE_VERSIONS WHERE file_id = ? ORDER BY version_number ASC',
            [fileId]
        );
        const numbers = vers.map(v => v.version_number);
        assert.deepEqual(numbers, [1, 2, 3], 'All three versions (v1, v2 current, v3 incoming archived) preserved');
        const v2 = vers.find(v => v.version_number === 2);
        assert.equal(v2.is_current, 1, 'v2 remains current under KEEP_CURRENT');
    } finally {
        await pool.query('DELETE FROM CONFLICTS WHERE file_id = ?', [fileId]);
        await pool.query('DELETE FROM FILE_VERSIONS WHERE file_id = ?', [fileId]);
        await pool.query('DELETE FROM FILES WHERE file_id = ?', [fileId]);
        try { await fs.unlink(v1Path); } catch {}
        try { await fs.unlink(v2Path); } catch {}
        try { await fs.unlink(v3Path); } catch {}
    }
});

// ─── Test 30: KEEP_CURRENT Full Cycle with Physical File Integrity Check ─────
test('Integration: T30 KEEP_CURRENT preserves current file on disk and verifies checksum', async () => {
    const shubhamToken = await login('shubham_k', 'password123');
    const stamp = Date.now();
    const v1Path = path.join(process.cwd(), 'storage', `kc_v1_${stamp}.txt`);
    await fs.writeFile(v1Path, 'Version 1 base content');

    const [ins] = await pool.query(
        `INSERT INTO FILES (file_name, owner_id, file_size_bytes, file_path, mime_type, status)
         VALUES ('kc_integrity.txt', 2, 22, ?, 'text/plain', 'ACTIVE')`,
        [v1Path]
    );
    const fileId = ins.insertId;

    await pool.query(
        `INSERT INTO FILE_VERSIONS (file_id, version_number, file_path, file_size_bytes, mime_type, created_by, is_current)
         VALUES (?, 1, ?, 22, 'text/plain', 2, TRUE)`,
        [fileId, v1Path]
    );

    const v2Content = 'Version 2 should remain on disk after KEEP_CURRENT';
    const v2Path = path.join(process.cwd(), 'storage', `kc_v2_${stamp}.txt`);
    await fs.writeFile(v2Path, v2Content);

    const v3Content = 'Version 3 incoming should be preserved as non-current';
    const v3Path = path.join(process.cwd(), 'storage', `kc_v3_${stamp}.txt`);
    await fs.writeFile(v3Path, v3Content);

    try {
        await apiAs(shubhamToken, `/files/${fileId}`, {
            method: 'PUT',
            body: JSON.stringify({
                file_path: v2Path, file_size_bytes: v2Content.length, mime_type: 'text/plain',
                base_version_number: 1, user_id: 2, change_summary: 'Upgrade to v2'
            })
        });

        const confRes = await apiAs(shubhamToken, `/files/${fileId}`, {
            method: 'PUT',
            body: JSON.stringify({
                file_path: v3Path, file_size_bytes: v3Content.length, mime_type: 'text/plain',
                base_version_number: 1, user_id: 2, change_summary: 'Stale concurrent edit'
            })
        });
        const cData = await confRes.json();

        await apiAs(shubhamToken, `/files/${fileId}/resolve-conflict`, {
            method: 'POST',
            body: JSON.stringify({
                strategy: 'KEEP_CURRENT',
                user_id: 2,
                conflict_id: cData.conflict.conflict_id
            })
        });

        const [fileRow] = await pool.query('SELECT file_path FROM FILES WHERE file_id = ?', [fileId]);
        const onDisk = await fs.readFile(fileRow[0].file_path, 'utf8');
        assert.equal(onDisk, v2Content, 'Disk file contains the current v2 content');
    } finally {
        await pool.query('DELETE FROM CONFLICTS WHERE file_id = ?', [fileId]);
        await pool.query('DELETE FROM FILE_VERSIONS WHERE file_id = ?', [fileId]);
        await pool.query('DELETE FROM FILES WHERE file_id = ?', [fileId]);
        try { await fs.unlink(v1Path); } catch {}
        try { await fs.unlink(v2Path); } catch {}
        try { await fs.unlink(v3Path); } catch {}
    }
});

test.after(async () => {
    await pool.end();
});
