import { Router } from 'express'
import User from '../models/User.js'
import Task from '../models/Task.js'
import Reel from '../models/Reel.js'
import { adminOnly } from '../middleware/auth.js'

const r = Router()

// Everyone can list team (needed for "assign to" dropdowns)
r.get('/', async (req, res) => {
  const users = await User.find(req.isAdmin ? {} : { active: true }).sort({ name: 1 }).lean()
  if (req.query.stats !== '1') return res.json(users)

  const now = new Date()
  const withStats = await Promise.all(
    users.map(async (u) => {
      const [openTasks, overdue, doneTasks, openReels] = await Promise.all([
        Task.countDocuments({ assignedTo: u._id, status: { $ne: 'done' } }),
        Task.countDocuments({ assignedTo: u._id, status: { $ne: 'done' }, dueDate: { $lt: now } }),
        Task.countDocuments({ assignedTo: u._id, status: 'done' }),
        Reel.countDocuments({ $or: [{ scriptWriter: u._id }, { editor: u._id }], stage: { $nin: ['approved', 'posted'] } }),
      ])
      return { ...u, stats: { openTasks, overdue, doneTasks, openReels } }
    })
  )
  res.json(withStats)
})

r.post('/', adminOnly, async (req, res) => {
  const { name, email, password, role, designation, phone } = req.body
  if (await User.exists({ email: String(email).toLowerCase() })) return res.status(400).json({ message: 'Email already used' })
  const u = await User.create({ name, email, password: password || 'pixelog123', role, designation, phone })
  res.status(201).json(u)
})

r.put('/:id', adminOnly, async (req, res) => {
  const u = await User.findById(req.params.id)
  if (!u) return res.status(404).json({ message: 'Not found' })
  for (const k of ['name', 'email', 'role', 'designation', 'phone', 'active']) if (req.body[k] !== undefined) u[k] = req.body[k]
  if (req.body.password) u.password = req.body.password // reset password
  await u.save()
  res.json(u)
})

export default r
