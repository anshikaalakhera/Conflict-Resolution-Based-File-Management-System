import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure .env is resolved and loaded from the correct directory
const backendEnvPath = path.resolve(__dirname, '../.env');
const rootEnvPath = path.resolve(__dirname, '../../.env');

if (fs.existsSync(backendEnvPath)) {
    dotenv.config({ path: backendEnvPath });
} else if (fs.existsSync(rootEnvPath)) {
    dotenv.config({ path: rootEnvPath });
} else {
    dotenv.config();
}

// Diagnostics for placeholder credentials
if (process.env.DB_USER === 'your_db_username') {
    console.error('\n[ConflictCore DB Config Error] Placeholder credentials detected in .env (DB_USER=your_db_username).');
    console.error('Please configure your local MySQL credentials in backend/.env or .env (e.g. DB_USER=root, DB_NAME=conflictcore_test_db).\n');
}

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '',
    database: process.env.DB_NAME || 'conflictcore_test_db',
    port: Number(process.env.DB_PORT || 3306),
    waitForConnections: process.env.DB_WAIT_FOR_CONNECTIONS !== 'false',
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
    queueLimit: Number(process.env.DB_QUEUE_LIMIT || 0)
});

export default pool;