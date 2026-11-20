import { Router } from 'express'
import Client from '../models/Client.js'
import Reel from '../models/Reel.js'
import Task from '../models/Task.js'
import User from '../models/User.js'
import Payment from '../models/Payment.js'
import { currentMonth, monthRange } from '../utils/time.js'

const r = Router() // admin only

r.get('/', async (req, res) => {
  const month = req.query.month || currentMonth()
  const { start, end } = monthRange(month)
  const now = new Date()

  const [clients, users, reels, tasks, payments] = await Promise.all([
    Client.find({ status: { $ne: 'ended' } }).sort({ name: 1 }).lean(),
    User.find({ active: true }).sort({ name: 1 }).lean(),
    Reel.find({ postDate: { $gte: start, $lt: end } }).lean(),
    Task.find({ $or: [{ dueDate: { $gte: start, $lt: end } }, { completedAt: { $gte: start, $lt: end } }] }).lean(),
    Payment.find({ month }).lean(),
  ])
  const same = (a, b) => a && b && String(a) === String(b)
  const waiting = ['sent_to_owner', 'sent_to_client']

  const clientRows = clients.map((c) => {
    const cr = reels.filter((x) => same(x.client, c._id))
    const pay = payments.find((p) => same(p.client, c._id))
    return {
      _id: c._id,
      name: c.name,
      planned: cr.length,
      target: c.reelsPerMonth,
      posted: cr.filter((x) => x.stage === 'posted').length,
      waiting: cr.filter((x) => waiting.includes(x.stage)).length,
      pending: cr.filter((x) => !['posted', 'approved', ...waiting].includes(x.stage)).length,
      tasksDone: tasks.filter((t) => same(t.client, c._id) && t.status === 'done').length,
      payment: pay?.status ?? 'pending',
      amount: pay?.amount ?? c.monthlyPackage,
    }
  })

  const teamRows = users.map((u) => {
    const ut = tasks.filter((t) => same(t.assignedTo, u._id))
    return {
      _id: u._id,
      name: u.name,
      designation: u.designation,
      assigned: ut.length,
      done: ut.filter((t) => t.status === 'done').length,
      pending: ut.filter((t) => t.status !== 'done').length,
      overdue: ut.filter((t) => t.status !== 'done' && t.dueDate && t.dueDate < now).length,
      reels: reels.filter((x) => same(x.editor, u._id) || same(x.scriptWriter, u._id)).length,
    }
  })

  res.json({
    month,
    company: {
      activeClients: clients.filter((c) => c.status === 'active').length,
      reelsPlanned: reels.length,
      reelsPosted: reels.filter((x) => x.stage === 'posted').length,
      tasksDone: tasks.filter((t) => t.status === 'done').length,
      tasksPending: tasks.filter((t) => t.status !== 'done').length,
      revenuePaid: clientRows.filter((c) => c.payment === 'paid').reduce((s, c) => s + (c.amount || 0), 0),
      revenuePending: clientRows.filter((c) => c.payment !== 'paid').reduce((s, c) => s + (c.amount || 0), 0),
    },
    clients: clientRows,
    team: teamRows,
  })
})

export default r
