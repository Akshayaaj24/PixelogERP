import { Router } from 'express'
import User, { roleOf } from '../models/User.js'
import Work from '../models/Work.js'
import Document from '../models/Document.js'
import { adminOnly, managerOnly } from '../middleware/auth.js'
import { involving } from '../utils/work.js'
import { dayStart } from '../utils/time.js'

const r = Router()

// What each role sees about team members
function view(u, req) {
  const base = { _id: u._id, name: u.name, photo: u.photo, designation: u.designation, role: roleOf(u), active: u.active }
  if (req.isAdmin) return { ...base, email: u.email, phone: u.phone, joiningDate: u.joiningDate, bondEndDate: u.bondEndDate }
  if (req.canManage) return { ...base, email: u.email, phone: u.phone }
  return base // members: names for display only
}

// Workload numbers for one person (their current steps)
async function stats(u) {
  const today = dayStart(0), tomorrow = dayStart(1)
  const current = { $or: ['script', 'shoot', 'editing', 'work'].map((k) => ({ stage: k, [`people.${k}`]: u._id })) }
  const open = { ...current, status: { $in: ['start', 'processing'] } }
  const [openNow, todayCount, overdue, waiting, doneMonth] = await Promise.all([
    Work.countDocuments(open),
    Work.countDocuments({ ...open, date: { $gte: today, $lt: tomorrow } }),
    Work.countDocuments({ ...open, date: { $lt: today } }),
    Work.countDocuments({ ...current, status: 'waiting' }),
    Work.countDocuments({ ...involving(u._id), status: 'done', doneAt: { $gte: dayStart(-30) } }),
  ])
  return { open: openNow, today: todayCount, overdue, waiting, doneMonth }
}

r.get('/', async (req, res) => {
  const q = req.isAdmin ? {} : { active: true }
  const users = await User.find(q).sort({ name: 1 }).lean()
  if (req.query.stats === '1' && req.canManage) {
    return res.json(await Promise.all(users.map(async (u) => ({ ...view(u, req), stats: roleOf(u) === 'member' ? await stats(u) : null }))))
  }
  res.json(users.map((u) => view(u, req)))
})

r.post('/', adminOnly, async (req, res) => {
  const { name, email, password, role, designation, phone, photo, joiningDate, bondEndDate } = req.body
  if (await User.exists({ email: String(email).toLowerCase() })) return res.status(400).json({ message: 'Email already used' })
  const u = await User.create({ name, email, password: password || 'pixelog123', role, designation, phone, photo, joiningDate, bondEndDate: bondEndDate || undefined })
  res.status(201).json(view(u, req))
})

r.put('/:id', adminOnly, async (req, res) => {
  const u = await User.findById(req.params.id)
  if (!u) return res.status(404).json({ message: 'Not found' })
  for (const k of ['name', 'email', 'role', 'designation', 'phone', 'photo', 'joiningDate', 'active']) if (req.body[k] !== undefined) u[k] = req.body[k]
  if (req.body.bondEndDate !== undefined) u.bondEndDate = req.body.bondEndDate || undefined
  if (req.body.password) u.password = req.body.password
  await u.save()
  res.json(view(u, req))
})

// ── Documents (admin only) ─────────────────────────────
const MAX = 3 * 1024 * 1024 // 3 MB

r.get('/:id/documents', adminOnly, async (req, res) => {
  res.json(await Document.find({ user: req.params.id }).sort({ createdAt: -1 }))
})

r.post('/:id/documents', adminOnly, async (req, res) => {
  const { kind, name, mime, data } = req.body // data = base64
  if (!name || !mime || !data) return res.status(400).json({ message: 'Choose a file' })
  if (!/^(application\/pdf|image\/(png|jpe?g|webp))$/.test(mime)) return res.status(400).json({ message: 'Only PDF or image files' })
  const buf = Buffer.from(data, 'base64')
  if (buf.length > MAX) return res.status(400).json({ message: 'File is bigger than 3 MB' })
  const d = await Document.create({ user: req.params.id, kind, name, mime, size: buf.length, data: buf, uploadedBy: req.user._id })
  res.status(201).json({ _id: d._id, kind: d.kind, name: d.name, mime: d.mime, size: d.size, createdAt: d.createdAt })
})

r.get('/:id/documents/:docId', adminOnly, async (req, res) => {
  const d = await Document.findOne({ _id: req.params.docId, user: req.params.id }).select('+data')
  if (!d) return res.status(404).json({ message: 'Not found' })
  res.set({ 'Content-Type': d.mime, 'Content-Disposition': `inline; filename="${encodeURIComponent(d.name)}"`, 'Cache-Control': 'private, no-store' })
  res.send(d.data)
})

r.delete('/:id/documents/:docId', adminOnly, async (req, res) => {
  await Document.deleteOne({ _id: req.params.docId, user: req.params.id })
  res.json({ ok: true })
})

export default r
