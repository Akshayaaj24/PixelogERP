// Config, errors, auth middleware and small services shared by all routes.
import 'dotenv/config';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { User, Client, Notification, Activity, Setting, Video } from './models/index.js';

export const config = {
  port: +process.env.PORT || 5000,
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/PixelogERP',
  jwtSecret: process.env.JWT_SECRET || 'dev-only-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientOrigin: (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(','),
  isProd: process.env.NODE_ENV === 'production',
};
if (config.isProd && config.jwtSecret === 'dev-only-secret-change-me') {
  throw new Error('JWT_SECRET must be set in production');
}

/* ---------- Errors ---------- */
export class HttpError extends Error {
  constructor(status, message, details) { super(message); this.status = status; this.details = details; }
}
export const fail = (status, message, details) => { throw new HttpError(status, message, details); };
export const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export function errorHandler(err, _req, res, _next) {
  if (err instanceof z.ZodError) {
    return res.status(400).json({ error: 'Some fields are invalid', fields: Object.fromEntries(err.errors.map((e) => [e.path.join('.'), e.message])) });
  }
  if (err?.name === 'CastError') return res.status(404).json({ error: 'Not found' });
  if (err?.code === 11000) return res.status(409).json({ error: `That ${Object.keys(err.keyValue || {})[0] || 'value'} is already in use` });
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status >= 500 && !err.expose ? 'Something went wrong on the server' : err.message, ...(err.details ? { details: err.details } : {}) });
}

/* ---------- Auth ---------- */
export const signToken = (user) => jwt.sign({ sub: user.id, role: user.role }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });

export const requireAuth = ah(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) fail(401, 'Sign in to continue');
  let payload;
  try { payload = jwt.verify(token, config.jwtSecret); } catch { fail(401, 'Your session has expired. Sign in again.'); }
  const user = await User.findById(payload.sub);
  if (!user || user.status === 'Inactive') fail(401, 'This account is not active');
  req.user = user;
  req.actor = { id: user.role === 'admin' ? 'admin' : user.id, userId: user.id, name: user.name, role: user.role };
  next();
});
export const requireAdmin = (req, _res, next) => (req.user?.role === 'admin' ? next() : next(new HttpError(403, 'Only admins can do this')));
export const isAdmin = (req) => req.user?.role === 'admin';
/** The user as the shared workflow functions expect it */
export const wfUser = (req) => ({ id: req.user.id, role: req.user.role });

/* ---------- Access scoping for staff ---------- */
export async function managedClientIds(userId) {
  return (await Client.find({ manager: userId }, '_id')).map((c) => String(c._id));
}
/** Mongo filter for the videos a user may see */
export async function videoScope(req) {
  if (isAdmin(req)) return {};
  const id = req.user.id;
  const managed = await managedClientIds(id);
  return { $or: [{ 'script.writer': id }, { 'shoot.team': id }, { 'edit.editor': id }, { 'post.smm': id }, { clientId: { $in: managed } }] };
}
/** Client ids a staff member works with: explicit, managed, or through assigned videos */
export async function staffClientIds(userId) {
  const user = await User.findById(userId);
  const ids = new Set(user?.clients || []);
  (await managedClientIds(userId)).forEach((c) => ids.add(c));
  const vids = await Video.find({ $or: [{ 'script.writer': userId }, { 'shoot.team': userId }, { 'edit.editor': userId }, { 'post.smm': userId }] }, 'clientId');
  vids.forEach((v) => ids.add(v.clientId));
  return [...ids];
}

/* ---------- Settings, notifications, activity ---------- */
export async function getSettings() {
  return (await Setting.findOne()) || Setting.create({});
}
export async function notify(list) {
  if (!list?.length) return;
  const s = await getSettings();
  const docs = list.filter((n) => n.to && s.notifications.get(n.type) !== false);
  if (docs.length) await Notification.insertMany(docs);
}
export const activity = (text, req, videoId) => Activity.create({ text, videoId, by: req?.actor?.name });

/* ---------- Validation helpers ---------- */
export const zDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a valid date');
export const zMonth = z.string().regex(/^\d{4}-\d{2}$/, 'Use a valid month');
export const zPhone = z.string().regex(/^[+\d\s()-]{8,20}$/, 'Enter a valid phone number');
export const zUrl = z.string().trim().regex(/^https?:\/\/\S+\.\S+/, 'Enter a valid link starting with https://');
export const zId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
export const zOptId = z.union([zId, z.literal('')]).optional().default('');
