// Long-running server (local development, Render, Railway, a VPS…). On Vercel, /api/index.js is used instead.
import { config } from './core.js';
import { createApp } from './app.js';
import { connectDB } from './db.js';

await connectDB();
console.log('Connected to MongoDB');
createApp().listen(config.port, () => console.log(`StudioFlow API on http://localhost:${config.port}`));
