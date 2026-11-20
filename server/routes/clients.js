import { Router } from 'express'
import Client from '../models/Client.js'
import Reel from '../models/Reel.js'
import Task from '../models/Task.js'
import Payment from '../models/Payment.js'
import { adminOnly } from '../middleware/auth.js'
import { log } from '../utils/log.js'

const r = Router()
// Employees don't see money
const hideMoney = (c) => { const o = c.toObject ? c.toObject() : c; delete o.monthlyPackage; return o }

r.get('/', async (req, res) => {
  const q = {}
  if (req.query.status) q.status = req.query.status
  const clients = await Client.find(q).populate('manager', 'name').sort({ name: 1 })
  res.json(req.isAdmin ? clients : clients.map(hideMoney))
})

r.get('/:id', async (req, res) => {
  const client = await Client.findById(req.params.id).populate('manager', 'name')
  if (!client) return res.status(404).json({ message: 'Client not found' })
  const [reels, tasks, payments] = await Promise.all([
    Reel.find({ client: client._id }).populate('scriptWriter editor', 'name').sort({ postDate: -1 }),
    Task.find({ client: client._id }).populate('assignedTo', 'name').sort({ dueDate: 1 }),
    req.isAdmin ? Payment.find({ client: client._id }).sort({ month: -1 }) : [],
  ])
  res.json({ client: req.isAdmin ? client : hideMoney(client), reels, tasks, payments })
})

r.post('/', adminOnly, async (req, res) => {
  const c = await Client.create(req.body)
  log(req.user, `added new client ${c.name}`)
  res.status(201).json(c)
})

r.put('/:id', adminOnly, async (req, res) => {
  const c = await Client.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after', runValidators: true })
  res.json(c)
})

r.delete('/:id', adminOnly, async (req, res) => {
  await Promise.all([
    Client.findByIdAndDelete(req.params.id),
    Reel.deleteMany({ client: req.params.id }),
    Task.updateMany({ client: req.params.id }, { $unset: { client: 1 } }),
    Payment.deleteMany({ client: req.params.id }),
  ])
  res.json({ ok: true })
})

export default r
