import { Router } from 'express'
import Activity from '../models/Activity.js'

const r = Router()

// Notifications: admins see everything, employees see what concerns them
r.get('/', async (req, res) => {
  const q = req.isAdmin ? {} : { notify: req.user._id }
  const items = await Activity.find(q).populate('user', 'name').sort({ createdAt: -1 }).limit(30).lean()
  res.json(items.map((a) => ({ ...a, unread: !a.readBy?.some((id) => String(id) === String(req.user._id)) })))
})

r.post('/read', async (req, res) => {
  const q = req.isAdmin ? {} : { notify: req.user._id }
  await Activity.updateMany(q, { $addToSet: { readBy: req.user._id } })
  res.json({ ok: true })
})

export default r
