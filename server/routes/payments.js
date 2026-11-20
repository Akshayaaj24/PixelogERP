import { Router } from 'express'
import Payment from '../models/Payment.js'
import Client from '../models/Client.js'
import { currentMonth } from '../utils/time.js'

const r = Router() // admin only (set in server.js)

// List every active client for a month, with its payment row (or a pending default)
r.get('/', async (req, res) => {
  const month = req.query.month || currentMonth()
  const [clients, payments] = await Promise.all([Client.find({ status: 'active' }).sort({ name: 1 }), Payment.find({ month })])
  const byClient = Object.fromEntries(payments.map((p) => [String(p.client), p]))
  res.json(
    clients.map((c) => {
      const p = byClient[String(c._id)]
      return { client: { _id: c._id, name: c.name }, month, amount: p?.amount ?? c.monthlyPackage, status: p?.status ?? 'pending', paidDate: p?.paidDate, note: p?.note ?? '' }
    })
  )
})

// Create or update one client's month
r.put('/', async (req, res) => {
  const { client, month, amount, status, note } = req.body
  const p = await Payment.findOneAndUpdate(
    { client, month },
    { amount, status, note, paidDate: status === 'paid' ? req.body.paidDate || new Date() : null },
    { upsert: true, returnDocument: 'after' }
  )
  res.json(p)
})

export default r
