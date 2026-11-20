// Auth and staff management
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { JOB_ROLES, todayS } from '@PixelogERP/shared';
import { User, LoginAttempt } from '../models/index.js';
import { ah, fail, signToken, requireAuth, requireAdmin, isAdmin, activity, notify, zDate, zPhone, zId, staffClientIds } from '../core.js';

export const auth = Router();
// Sign-in limits are stored in MongoDB so they hold across serverless instances.
const WINDOW_MS = 15 * 60 * 1000;
async function hit(key) {
  const now = new Date();
  const d = await LoginAttempt.findOneAndUpdate({ key, expiresAt: { $gt: now } }, { $inc: { count: 1 } }, { new: true });
  if (d) return d.count;
  await LoginAttempt.findOneAndUpdate({ key }, { $set: { count: 1, expiresAt: new Date(Date.now() + WINDOW_MS) } }, { upsert: true });
  return 1;
}
const clientIp = (req) => String(req.headers['x-real-ip'] || req.ip || '').split(',')[0].trim();

auth.post('/login', ah(async (req, res) => {
  const { email, password } = z.object({ email: z.string().email('Enter a valid email'), password: z.string().min(1, 'Enter your password') }).parse(req.body);
  const [perEmail, perIp] = await Promise.all([hit(`e:${email.toLowerCase()}`), hit(`ip:${clientIp(req)}`)]);
  if (perEmail > 10 || perIp > 40) fail(429, 'Too many sign-in attempts. Try again in 15 minutes.');
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) fail(401, 'Incorrect email or password');
  if (user.status === 'Inactive') fail(403, 'This account has been deactivated. Contact your administrator.');
  await LoginAttempt.deleteOne({ key: `e:${email.toLowerCase()}` });
  res.json({ token: signToken(user), user });
}));
auth.get('/me', requireAuth, (req, res) => res.json({ user: req.user }));
auth.post('/password', requireAuth, ah(async (req, res) => {
  const { current, next } = z.object({ current: z.string(), next: z.string().min(8, 'Use at least 8 characters') }).parse(req.body);
  if (!(await bcrypt.compare(current, req.user.passwordHash))) fail(400, 'Your current password is incorrect');
  req.user.passwordHash = await bcrypt.hash(next, 10);
  await req.user.save();
  res.json({ ok: true });
}));

/* ---------- Staff ---------- */
export const staff = Router();
staff.use(requireAuth);

const staffBody = z.object({
  name: z.string().trim().min(2, 'Enter a name'),
  email: z.string().email('Enter a valid email'),
  phone: zPhone,
  jobRole: z.enum(JOB_ROLES),
  joined: zDate,
  status: z.enum(['Active', 'On Leave', 'Inactive']).default('Active'),
  clients: z.array(zId).default([]),
  photo: z.string().max(200_000, 'Photo is too large').optional().default(''),
  password: z.string().min(8, 'Use at least 8 characters').optional(),
});

// Admins get full records; staff get a directory (names, roles, photos) so they can see who they work with
staff.get('/', ah(async (req, res) => {
  const users = await User.find({ role: 'staff' }).sort({ name: 1 });
  if (isAdmin(req)) return res.json(users);
  res.json(users.map((u) => ({ id: u.id, name: u.name, jobRole: u.jobRole, photo: u.photo, status: u.status })));
}));
staff.get('/me/clients', ah(async (req, res) => res.json(await staffClientIds(req.user.id))));
staff.get('/:id', requireAdmin, ah(async (req, res) => res.json((await User.findById(req.params.id)) || fail(404, 'Employee not found'))));
staff.post('/', requireAdmin, ah(async (req, res) => {
  const b = staffBody.extend({ password: z.string().min(8, 'Use at least 8 characters') }).parse(req.body);
  const { password, ...rest } = b;
  const user = await User.create({ ...rest, role: 'staff', passwordHash: await bcrypt.hash(password, 10) });
  await activity(`${req.actor.name} added ${user.name} as ${user.jobRole}`, req);
  res.status(201).json(user);
}));
staff.patch('/:id', requireAdmin, ah(async (req, res) => {
  const b = staffBody.partial().parse(req.body);
  const user = (await User.findById(req.params.id)) || fail(404, 'Employee not found');
  const added = (b.clients || []).filter((c) => !user.clients.includes(c));
  const { password, ...rest } = b;
  Object.assign(user, rest);
  if (password) user.passwordHash = await bcrypt.hash(password, 10);
  await user.save();
  await notify(added.map(() => ({ to: user.id, type: 'New Task Assignment', text: 'You were assigned to a new client' })));
  await activity(`${req.actor.name} updated employee ${user.name}`, req);
  res.json(user);
}));

export async function createAdminIfMissing() {
  if (await User.exists({ role: 'admin' })) return;
  const email = process.env.ADMIN_EMAIL || 'admin@agency.local';
  const password = process.env.ADMIN_PASSWORD || 'admin12345';
  await User.create({ name: 'Admin', email, role: 'admin', jobRole: 'Administrator', joined: todayS(), passwordHash: await bcrypt.hash(password, 10) });
  console.log(`Created admin account ${email} — change its password after signing in.`);
}
