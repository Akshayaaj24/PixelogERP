import { Router } from 'express'
import Client from '../models/Client.js'
import Work from '../models/Work.js'
import User from '../models/User.js'
import { dayStart, weekStart, monthRange } from '../utils/time.js'
import { involving, stepState, PERSON_KEYS } from '../utils/work.js'

const r = Router()
const PEOPLE = PERSON_KEYS.map((k) => `people.${k}`).join(' ')
const pop = (q) => q.populate('client', 'name businessName logo instagram').populate(PEOPLE, 'name photo')

function range(period) {
  if (period === 'week') { const start = weekStart(); return { start, end: new Date(start.getTime() + 7 * 864e5) } }
  if (period === 'month') return monthRange()
  return { start: dayStart(0), end: dayStart(1) }
}

r.get('/', async (req, res) => {
  const today = dayStart(0), tomorrow = dayStart(1), dayAfter = dayStart(2)

  // ── Member: "My Work" ─────────────────────────────
  if (!req.canManage) {
    const { start: mStart, end: mEnd } = monthRange()
    const mine = await pop(Work.find({ $and: [involving(req.user._id), { $or: [{ status: { $ne: 'done' } }, { doneAt: { $gte: dayStart(-7) } }, { date: { $gte: mStart, $lt: mEnd } }] }] })).sort({ date: 1, time: 1 })
    const items = mine.map((w) => ({ ...w.toObject(), myState: stepState(w, req.user._id) }))
    const inMonth = items.filter((w) => w.date >= mStart && w.date < mEnd)
    return res.json({
      role: 'member',
      items,
      counts: {
        today: items.filter((w) => w.myState === 'active' && w.date >= today && w.date < tomorrow).length,
        overdue: items.filter((w) => w.myState === 'active' && w.date < today).length,
        waiting: items.filter((w) => w.myState === 'active' && w.status === 'waiting').length,
        doneMonth: inMonth.filter((w) => w.myState === 'done').length,
        pendingMonth: inMonth.filter((w) => w.myState !== 'done').length,
      },
    })
  }

  // ── Admin / Manager ───────────────────────────────
  const { start, end } = range(req.query.period)
  const notDone = { status: { $ne: 'done' } }
  const [activeClients, inPeriod, waiting, overdue, work, postingTomorrow, bondEnding] = await Promise.all([
    Client.countDocuments({ status: 'active' }),
    Work.countDocuments({ date: { $gte: start, $lt: end } }),
    pop(Work.find({ status: 'waiting' })).sort({ submittedAt: 1 }).limit(20),
    pop(Work.find({ ...notDone, date: { $lt: today } })).sort({ date: 1 }).limit(20),
    pop(Work.find({ date: { $gte: start, $lt: end } })).sort({ date: 1, time: 1 }).limit(60),
    // Posting reminder: goes out tomorrow but not approved yet
    pop(Work.find({ date: { $gte: tomorrow, $lt: dayAfter }, status: { $in: ['start', 'processing', 'waiting'] } })).limit(20),
    req.isAdmin ? User.find({ active: true, bondEndDate: { $gte: today, $lt: new Date(today.getTime() + 30 * 864e5) } }).select('name bondEndDate').lean() : [],
  ])

  res.json({
    role: req.role,
    stats: [
      { key: 'clients', label: 'Active Clients', value: activeClients },
      { key: 'period', label: 'Work in Period', value: inPeriod },
      { key: 'waiting', label: 'Waiting Approval', value: waiting.length, alert: waiting.length > 0 },
      { key: 'overdue', label: 'Overdue', value: overdue.length, alert: overdue.length > 0 },
    ],
    work,
    waiting,
    overdue,
    alerts: [
      ...postingTomorrow.map((w) => ({ type: 'posting', text: `Posts tomorrow, not approved yet: ${w.title} (${w.client?.name})`, workId: w._id })),
      ...bondEnding.map((u) => ({ type: 'bond', text: `${u.name}'s bond ends on ${new Date(u.bondEndDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` })),
    ],
  })
})

export default r
