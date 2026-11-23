import { Router } from 'express'
import Client from '../models/Client.js'
import Work from '../models/Work.js'
import User, { roleOf } from '../models/User.js'
import Payment from '../models/Payment.js'
import { currentMonth, monthRange, dayStart } from '../utils/time.js'
import { stepState, TYPES } from '../utils/work.js'

const r = Router()
const same = (a, b) => a && b && String(a) === String(b)
const onTime = (w) => w.doneAt && new Date(w.doneAt) <= new Date(new Date(w.date).getTime() + 864e5)

function personRow(u, works, today) {
  const mine = works.map((w) => ({ w, s: stepState(w, u._id) })).filter((x) => x.s)
  const done = mine.filter((x) => x.s === 'done')
  const doneItems = done.filter((x) => x.w.status === 'done')
  return {
    _id: u._id, name: u.name, photo: u.photo, designation: u.designation,
    assigned: mine.length,
    done: done.length,
    pending: mine.length - done.length,
    overdue: mine.filter((x) => x.s === 'active' && x.w.date < today).length,
    onTime: doneItems.length ? Math.round((doneItems.filter((x) => onTime(x.w)).length / doneItems.length) * 100) : null,
    byType: Object.fromEntries(TYPES.map((t) => [t, mine.filter((x) => x.w.type === t).length]).filter(([, n]) => n)),
  }
}

// Admin: everything (with money) · Manager: same without money · Member: only their own
r.get('/', async (req, res) => {
  const month = req.query.month || currentMonth()
  const { start, end } = monthRange(month)
  const today = dayStart(0)
  const works = await Work.find({ date: { $gte: start, $lt: end } }).populate('client', 'name').lean()

  if (!req.canManage) {
    const me = personRow(req.user, works, today)
    const items = works.map((w) => ({ ...w, myState: stepState(w, req.user._id) })).filter((w) => w.myState).sort((a, b) => a.date - b.date)
    return res.json({ month, role: 'member', me, items: items.map((w) => ({ _id: w._id, title: w.title, type: w.type, client: w.client?.name, date: w.date, status: w.status, myState: w.myState })) })
  }

  const [clients, users, payments] = await Promise.all([
    Client.find({ status: 'active' }).sort({ name: 1 }).lean(),
    User.find({ active: true }).sort({ name: 1 }).lean(),
    req.isAdmin ? Payment.find({ month }).lean() : [],
  ])

  const clientRows = clients.map((c) => {
    const cw = works.filter((w) => same(w.client?._id, c._id))
    const t = (type) => { const x = cw.filter((w) => w.type === type); return { planned: x.length, done: x.filter((w) => w.status === 'done').length } }
    const row = {
      _id: c._id, name: c.name, businessName: c.businessName, logo: c.logo,
      reel: { ...t('reel'), target: c.reelsPerMonth }, poster: { ...t('poster'), target: c.postersPerMonth },
      website: { ...t('website'), status: c.websiteStatus }, ads: t('ads'), other: t('other'),
      pending: cw.filter((w) => w.status !== 'done').length,
      overdue: cw.filter((w) => w.status !== 'done' && w.date < today).length,
    }
    if (req.isAdmin) {
      const p = payments.find((x) => same(x.client, c._id))
      Object.assign(row, { amount: p?.amount ?? c.monthlyPackage, payment: p?.status ?? 'pending' })
    }
    return row
  })

  const team = users.filter((u) => roleOf(u) === 'member').map((u) => personRow(u, works, today))
  const company = {
    activeClients: clients.length,
    planned: works.length,
    done: works.filter((w) => w.status === 'done').length,
    reelsDone: works.filter((w) => w.type === 'reel' && w.status === 'done').length,
    postersDone: works.filter((w) => w.type === 'poster' && w.status === 'done').length,
    overdue: works.filter((w) => w.status !== 'done' && w.date < today).length,
  }
  if (req.isAdmin) {
    company.revenuePaid = clientRows.filter((c) => c.payment === 'paid').reduce((s, c) => s + (c.amount || 0), 0)
    company.revenuePending = clientRows.filter((c) => c.payment !== 'paid').reduce((s, c) => s + (c.amount || 0), 0)
  }
  res.json({ month, role: req.role, company, clients: clientRows, team })
})

export default r
