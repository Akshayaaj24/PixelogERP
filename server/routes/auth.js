import { Router } from 'express'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import { protect } from '../middleware/auth.js'

const r = Router()
const sign = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' })
const safe = (u) => ({ _id: u._id, name: u.name, email: u.email, role: u.role, designation: u.designation, phone: u.phone })

r.post('/login', async (req, res) => {
  const { email, password } = req.body
  const user = await User.findOne({ email: String(email || '').toLowerCase() }).select('+password')
  if (!user || !(await user.checkPassword(password || ''))) return res.status(400).json({ message: 'Wrong email or password' })
  if (!user.active) return res.status(403).json({ message: 'Your account is disabled' })
  res.json({ token: sign(user._id), user: safe(user) })
})

r.get('/me', protect, (req, res) => res.json(safe(req.user)))

r.put('/me', protect, async (req, res) => {
  const { name, phone } = req.body
  if (name) req.user.name = name
  if (phone !== undefined) req.user.phone = phone
  await req.user.save()
  res.json(safe(req.user))
})

r.put('/me/password', protect, async (req, res) => {
  const { current, next } = req.body
  const user = await User.findById(req.user._id).select('+password')
  if (!(await user.checkPassword(current || ''))) return res.status(400).json({ message: 'Current password is wrong' })
  if (!next || next.length < 6) return res.status(400).json({ message: 'New password must be at least 6 characters' })
  user.password = next
  await user.save()
  res.json({ message: 'Password changed' })
})

export default r
