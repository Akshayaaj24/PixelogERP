// One MongoDB connection, reused across requests. On Vercel each function instance
// keeps it in a global, so warm requests don't reconnect.
import mongoose from 'mongoose';
import { config } from './core.js';
import { createAdminIfMissing } from './routes/people.js';

mongoose.set('strictQuery', true);
let pending = globalThis.__studioflowDb || null;

export async function connectDB() {
  if (mongoose.connection.readyState === 1) return;
  if (!pending) {
    pending = mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 10_000, maxPoolSize: 5 })
      .then(async () => { await createAdminIfMissing(); });
    globalThis.__studioflowDb = pending;
  }
  try { await pending; } catch (e) { pending = null; globalThis.__studioflowDb = null; throw e; }
}
