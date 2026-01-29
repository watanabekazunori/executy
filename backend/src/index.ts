import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

import { organizationsRoutes } from './routes/organizations';
import { projectsRoutes } from './routes/projects';
import { tasksRoutes } from './routes/tasks';
import { meetingsRoutes } from './routes/meetings';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://executy-frontend.vercel.app',
    'https://executy-frontend-watanabe-9399s-projects.vercel.app',
  ],
  credentials: true,
}));

// Health check
app.get('/', (c) => c.json({ status: 'ok', message: 'EXECUTY API Server' }));
app.get('/health', (c) => c.json({ status: 'healthy', timestamp: new Date().toISOString() }));

// API Routes
app.route('/api/organizations', organizationsRoutes);
app.route('/api/projects', projectsRoutes);
app.route('/api/tasks', tasksRoutes);
app.route('/api/meetings', meetingsRoutes);

// Error handling
app.onError((err, c) => {
  console.error('Error:', err);
  return c.json({ error: 'Internal Server Error', message: err.message }, 500);
});

app.notFound((c) => {
  return c.json({ error: 'Not Found' }, 404);
});

const port = Number(process.env.PORT) || 3001;
console.log(`🚀 EXECUTY API Server running on port ${port}`);

export default {
  port,
  fetch: app.fetch,
};
