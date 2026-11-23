import { Router } from 'express'
import mongoose from 'mongoose'
import Client from '../models/Client.js'
import Work from '../models/Work.js'
import Payment from '../models/Payment.js'
import { adminOnly, managerOnly } from '../middleware/auth.js'
import { log } from '../utils/log.js'
import { currentMonth, monthRange } from '../utils/time.js'

const r = Router()
r.use(managerOnly) // members see client details inside their work items only

const TEAM = 'team.script team.shoot team.editing team.poster team.website team.ads'
const hideMoney = (req, c) => { const o = c.toObject ? c.toObject() : c; if (!req.isAdmin) delete o.monthlyPackage; return o }

// { clientId: { reel: {planned, done}, poster: {...}, website: {...}, ... } } for one month
async function monthSummary(month, clientId) {
  const { start, end } = monthRange(month)
  const match = { date: { $gte: start, $lt: end }, ...(clientId && { client: new mongoose.Types.ObjectId(String(clientId)) }) }
  const rows = await Work.aggregate([
    { $match: match },
    { $group: { _id: { client: '$client', type: '$type' }, planned: { $sum: 1 }, done: { $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] } } } },
  ])
  const out = {}
  for (const x of rows) ((out[String(x._id.client)] ??= {})[x._id.type] = { planned: x.planned, done: x.done })
  return out
}

r.get('/', async (req, res) => {
  const q = req.query.status && req.query.status !== 'all' ? { status: req.query.status } : {}
  const [clients, summary] = await Promise.all([Client.find(q).sort({ name: 1 }), monthSummary(req.query.month || currentMonth())])
  res.json(clients.map((c) => ({ ...hideMoney(req, c), month: summary[String(c._id)] ?? {} })))
})

r.get('/:id', async (req, res) => {
  const client = await Client.findById(req.params.id).populate(TEAM, 'name photo designation')
  if (!client) return res.status(404).json({ message: 'Client not found' })
  const month = req.query.month || currentMonth()
  const [summary, payments] = await Promise.all([
    monthSummary(month, client._id),
    req.isAdmin ? Payment.find({ client: client._id }).sort({ month: -1 }) : [],
  ])
  res.json({ client: hideMoney(req, client), month, summary: summary[String(client._id)] ?? {}, payments })
})

r.post('/', adminOnly, async (req, res) => {
  const c = await Client.create(req.body)
  log(req.user, `added new client ${c.name}`)
  res.status(201).json(c)
})

r.put('/:id', adminOnly, async (req, res) => {
  res.json(await Client.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after', runValidators: true }))
})

// Manager assigns team members to a client
r.put('/:id/team', async (req, res) => {
  const team = Object.fromEntries(['script', 'shoot', 'editing', 'poster', 'website', 'ads'].map((k) => [k, req.body[k] || null]))
  const c = await Client.findByIdAndUpdate(req.params.id, { team }, { returnDocument: 'after' }).populate(TEAM, 'name photo designation')
  log(req.user, `updated the team for ${c.name}`)
  res.json(hideMoney(req, c))
})

r.delete('/:id', adminOnly, async (req, res) => {
  await Promise.all([Client.findByIdAndDelete(req.params.id), Work.deleteMany({ client: req.params.id }), Payment.deleteMany({ client: req.params.id })])
  res.json({ ok: true })
})

export default r
