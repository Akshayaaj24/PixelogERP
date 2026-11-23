import jwt from 'jsonwebtoken'
import User, { roleOf } from '../models/User.js'

export async function protect(req, res, next) {
  const token = req.headers.authorization?.startsWith('Bearer ') && req.headers.authorization.slice(7)
  if (!token) return res.status(401).json({ message: 'Please log in' })
  try {
    const { id } = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(id)
    if (!user || !user.active) return res.status(401).json({ message: 'Account not active' })
    req.user = user
    req.role = roleOf(user) // 'admin' | 'manager' | 'member'
    req.isAdmin = req.role === 'admin'
    req.canManage = req.role === 'admin' || req.role === 'manager'
    next()
  } catch {
    res.status(401).json({ message: 'Session expired, please log in again' })
  }
}

export function adminOnly(req, res, next) {
  if (!req.isAdmin) return res.status(403).json({ message: 'Admin only' })
  next()
}

export function managerOnly(req, res, next) {
  if (!req.canManage) return res.status(403).json({ message: 'Manager or admin only' })
  next()
}
