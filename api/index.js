// Vercel serverless entry: every /api/* request is routed here (see vercel.json).
// The Express app is created once per function instance and reuses one MongoDB connection.
import { createApp } from '../server/src/app.js';
import { connectDB } from '../server/src/db.js';

const app = createApp();

export default async function handler(req, res) {
  try {
    await connectDB();
  } catch (e) {
    console.error('MongoDB connection failed:', e.message);
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Can’t reach the database. Check MONGODB_URI and that Atlas Network Access allows 0.0.0.0/0.' }));
    return;
  }
  app(req, res);
}
