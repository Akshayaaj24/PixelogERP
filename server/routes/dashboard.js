import { Router } from 'express'
import Client from '../models/Client.js'
import Reel from '../models/Reel.js'
import Task from '../models/Task.js'
import { dayStart, weekStart, monthRange } from '../utils/time.js'

const r = Router()

function range(period) {
  if (period === 'week') { const start = weekStart(); return { start, end: new Date(start.getTime() + 7 * 864e5) } }
  if (period === 'month') return monthRange()
  return { start: dayStart(0), end: dayStart(1) }
}

r.get('/', async (req, res) => {
  const { start, end } = range(req.query.period)
  const now = new Date(); const today = dayStart(0)
  const mineReel = req.isAdmin ? {} : { $or: [{ scriptWriter: req.user._id }, { editor: req.user._id }] }
  const mineTask = req.isAdmin ? {} : { assignedTo: req.user._id }

  const [activeClients, reelsInPeriod, waitingApproval, overdueTasks, overdueReels, reels, tasksDue, deadlines] = await Promise.all([
    Client.countDocuments({ status: 'active' }),
    Reel.countDocuments({ ...mineReel, postDate: { $gte: start, $lt: end } }),
    Reel.countDocuments({ ...mineReel, stage: { $in: ['sent_to_owner', 'sent_to_client'] } }),
    Task.countDocuments({ ...mineTask, status: { $ne: 'done' }, dueDate: { $lt: today } }),
    Reel.countDocuments({ ...mineReel, postDate: { $lt: today }, stage: { $nin: ['posted'] } }),
    Reel.find({ ...mineReel, postDate: { $gte: start, $lt: end } }).populate('client', 'name').populate('scriptWriter editor', 'name').sort({ postDate: 1, postTime: 1 }).limit(30),
    Task.find({ ...mineTask, status: { $ne: 'done' }, dueDate: { $gte: start, $lt: end } }).populate('client', 'name').populate('assignedTo', 'name').sort({ dueDate: 1 }).limit(30),
    Task.find({ ...mineTask, status: { $ne: 'done' }, dueDate: { $lt: new Date(now.getTime() + 7 * 864e5) } }).populate('client', 'name').populate('assignedTo', 'name').sort({ dueDate: 1 }).limit(8),
  ])

  // One combined "work" list: reels to post + tasks due
  const work = [
    ...reels.map((x) => ({ _id: x._id, type: 'reel', date: x.postDate, time: x.postTime, client: x.client?.name, title: x.title, person: x.editor?.name || x.scriptWriter?.name || '—', stage: x.stage })),
    ...tasksDue.map((t) => ({ _id: t._id, type: 'task', date: t.dueDate, time: '', client: t.client?.name || '—', title: t.title, person: t.assignedTo?.name || '—', status: t.status })),
  ].sort((a, b) => new Date(a.date) - new Date(b.date) || (a.time || '99').localeCompare(b.time || '99'))

  res.json({
    stats: [
      { label: 'Active Clients', value: activeClients },
      { label: 'Reels in Period', value: reelsInPeriod },
      { label: 'Waiting Approval', value: waitingApproval },
      { label: 'Overdue', value: overdueTasks + overdueReels, alert: overdueTasks + overdueReels > 0 },
    ],
    work,
    deadlines,
  })
})

export default r
