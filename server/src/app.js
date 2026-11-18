import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { config, errorHandler } from './core.js';
import { auth, staff } from './routes/people.js';
import { clients, packages } from './routes/clients.js';
import { videos } from './routes/videos.js';
import { tasks, events, notifications, activityRouter, settings } from './routes/misc.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', true); // behind Vercel / Render / Nginx
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors({ origin: config.clientOrigin }));
  app.use(express.json({ limit: '1mb' }));
  if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) app.use(morgan(config.isProd ? 'combined' : 'dev'));

  app.get('/api/health', (_req, res) => res.json({ ok: true }));
  app.use('/api/auth', auth);
  app.use('/api/staff', staff);
  app.use('/api/clients', clients);
  app.use('/api/packages', packages);
  app.use('/api/videos', videos);
  app.use('/api/tasks', tasks);
  app.use('/api/events', events);
  app.use('/api/notifications', notifications);
  app.use('/api/activity', activityRouter);
  app.use('/api/settings', settings);
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));

  // In production, serve the built React app from the same origin
  const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist');
  if (!process.env.VERCEL && fs.existsSync(dist)) {
    app.use(express.static(dist));
    app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
  }
  app.use(errorHandler);
  return app;
}
