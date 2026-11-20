import { Router } from 'express'
import Task from '../models/Task.js'
import { adminOnly } from '../middleware/auth.js'
import { log } from '../utils/log.js'
import { dayStart as istDay } from '../utils/time.js'

const r = Router()
const pop = (q) => q.populate('client', 'name').populate('assignedTo', 'name').populate('comments.user', 'name')
const dayStart = () => istDay(0)
const dayEnd = () => new Date(istDay(1).getTime() - 1)

r.get('/', async (req, res) => {
  const { view = 'all', client, person, category } = req.query
  const q = {}
  if (!req.isAdmin || view === 'my') q.assignedTo = req.user._id
  else if (person) q.assignedTo = person
  if (client) q.client = client
  if (category) q.category = category

  if (view === 'today') Object.assign(q, { status: { $ne: 'done' }, dueDate: { $gte: dayStart(), $lte: dayEnd() } })
  if (view === 'upcoming') Object.assign(q, { status: { $ne: 'done' }, dueDate: { $gt: dayEnd() } })
  if (view === 'overdue') Object.assign(q, { status: { $ne: 'done' }, dueDate: { $lt: dayStart() } })
  if (view === 'done') q.status = 'done'
  if (view === 'all' || view === 'my') q.status = q.status ?? { $ne: 'done' }

  res.json(await pop(Task.find(q)).sort({ dueDate: 1 }))
})

r.post('/', adminOnly, async (req, res) => {
  const t = await Task.create({ ...req.body, createdBy: req.user._id })
  log(req.user, `assigned task "${t.title}"`, [t.assignedTo])
  res.status(201).json(await pop(Task.findById(t._id)))
})

r.put('/:id', async (req, res) => {
  const t = await Task.findById(req.params.id)
  if (!t) return res.status(404).json({ message: 'Task not found' })
  let body = req.body
  if (!req.isAdmin) {
    if (String(t.assignedTo) !== String(req.user._id)) return res.status(403).json({ message: 'Not your task' })
    body = { status: body.status } // employees only change status
  }
  const oldStatus = t.status
  Object.assign(t, body)
  if (t.status === 'done' && oldStatus !== 'done') t.completedAt = new Date()
  if (t.status !== 'done') t.completedAt = undefined
  await t.save()
  if (body.status && body.status !== oldStatus) log(req.user, `marked "${t.title}" as ${body.status.replace('_', ' ')}`, [t.assignedTo])
  res.json(await pop(Task.findById(t._id)))
})

r.post('/:id/comments', async (req, res) => {
  const t = await Task.findById(req.params.id)
  if (!t) return res.status(404).json({ message: 'Task not found' })
  if (!req.isAdmin && String(t.assignedTo) !== String(req.user._id)) return res.status(403).json({ message: 'Not your task' })
  if (!req.body.text?.trim()) return res.status(400).json({ message: 'Comment is empty' })
  t.comments.push({ user: req.user._id, text: req.body.text.trim() })
  await t.save()
  log(req.user, `commented on "${t.title}"`, [t.assignedTo])
  res.json(await pop(Task.findById(t._id)))
})

r.delete('/:id', adminOnly, async (req, res) => {
  await Task.findByIdAndDelete(req.params.id)
  res.json({ ok: true })
})

export default r
