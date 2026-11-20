import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import mongoose from 'mongoose'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { protect, adminOnly } from './middleware/auth.js'
import auth from './routes/auth.js'
import users from './routes/users.js'
import clients from './routes/clients.js'
import reels from './routes/reels.js'
import tasks from './routes/tasks.js'
import payments from './routes/payments.js'
import dashboard from './routes/dashboard.js'
import reports from './routes/reports.js'
import activities from './routes/activities.js'
import ai from './routes/ai.js'

const app = express()

// One shared MongoDB connection (works locally and on Vercel)
let connecting
export function connectDB() {
  if (mongoose.connection.readyState === 1) return Promise.resolve()
  connecting ??= mongoose.connect(process.env.MONGO_URI).catch((e) => { connecting = null; throw e })
  return connecting
}
app.use(cors({ origin: process.env.CLIENT_URL || true }))
app.use(express.json())
app.get('/api/health', (req, res) => res.json({ ok: true, db: mongoose.connection.readyState === 1 }))
app.use(async (req, res, next) => {
  try { await connectDB(); next() } catch (e) { console.error('MongoDB:', e.message); res.status(503).json({ message: 'Database not reachable' }) }
})

app.use('/api/auth', auth)
app.use('/api/users', protect, users)
app.use('/api/clients', protect, clients)
app.use('/api/reels', protect, reels)
app.use('/api/tasks', protect, tasks)
app.use('/api/payments', protect, adminOnly, payments)
app.use('/api/dashboard', protect, dashboard)
app.use('/api/reports', protect, adminOnly, reports)
app.use('/api/activities', protect, activities)
app.use('/api/ai', protect, ai)

// Optional: serve the built React app from the same server
const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), '../client/dist')
app.use(express.static(dist))
app.get(/^(?!\/api).*/, (req, res, next) => res.sendFile(path.join(dist, 'index.html'), (err) => err && next()))

// Errors → clean JSON message
app.use((err, req, res, next) => {
  console.error(err.message)
  const status = err.name === 'ValidationError' || err.name === 'CastError' ? 400 : 500
  res.status(status).json({ message: status === 400 ? err.message : 'Something went wrong' })
})

// Local: start a normal server. On Vercel the exported app is used instead.
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 5000
  connectDB()
    .then(() => app.listen(PORT, () => console.log(`PIXELOG ERP API on http://localhost:${PORT}`)))
    .catch((e) => { console.error('MongoDB connection failed:', e.message); process.exit(1) })
}

export default app
