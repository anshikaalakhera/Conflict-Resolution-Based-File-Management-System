import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { cors } from 'hono/cors';
import authRoutes from './routes/auth.routes.js';
import operationRoutes from './routes/operation.routes.js';
import testRoutes from './routes/test.routes.js';
import fileRoutes from './routes/file.routes.js';
import folderRoutes from './routes/folder.routes.js';
import osRoutes from './routes/os.routes.js';
import { initializeStorage } from './services/storage.service.js';
import { restoreQueuedProcesses } from './services/os.service.js';

const app = new Hono();

app.use('*', cors());

// Health check endpoint
app.get('/api/health', (c) => {
    return c.json({
        status: 'UP',
        timestamp: new Date().toISOString(),
        message: 'ConflictCore Backend API & OS Kernel are operational'
    });
});

// Mount API routes
app.route('/api/auth', authRoutes);
app.route('/api/test', testRoutes);
app.route('/api/files', fileRoutes);
app.route('/api/folders', folderRoutes);
app.route('/api/operations', operationRoutes);
app.route('/api', osRoutes);

// Serve frontend static files
app.use('/*', serveStatic({
    root: './frontend'
}));

const port = 3000;

await initializeStorage();
await restoreQueuedProcesses();

console.log(`Server running on http://localhost:${port}`);

serve({
    fetch: app.fetch,
    port
});