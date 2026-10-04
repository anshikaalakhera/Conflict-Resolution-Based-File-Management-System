import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';
import testRoutes from './routes/test.routes.js';
import fileRoutes from './routes/file.routes.js';
import { initializeStorage } from './services/storage.service.js';

const app = new Hono();

app.use('*', cors());

app.get('/', (c) => {
    return c.text('Backend is working!');
});

app.route('/api/test', testRoutes);
app.route('/api/files', fileRoutes);

const port = 3000;

await initializeStorage(); 

console.log(`Server running on http://localhost:${port}`);

serve({
    fetch: app.fetch,
    port
});