// General tasks, calendar events, notifications, activity feed and settings
import { Router } from 'express';
import { z } from 'zod';
import { STAGES, NOTIFICATION_TYPES, addDays, todayS } from '@PixelogERP/shared';
import { Task, TaskLog, Event, Notification, Activity, Setting } from '../models/index.js';
import { ah, fail, requireAuth, requireAdmin, isAdmin, notify, activity, getSettings, zDate, zOptId } from '../core.js';

/* ---------- General tasks (daily / weekly allocations) ---------- */
export const tasks = Router();
tasks.use(requireAuth);
const taskBody = z.object({
  title: z.string().trim().min(2, 'Describe the task').max(200),
  assignee: z.string().min(1, 'Choose who does it'),
  clientId: zOptId,
  due: zDate,
  recur: z.enum(['Once', 'Daily', 'Weekly']).default('Once'),
  status: z.enum(['Pending', 'In Progress', 'Completed']).default('Pending'),
  notes: z.string().max(2000).optional().default(''),
});
tasks.get('/', ah(async (req, res) => res.json(await Task.find(isAdmin(req) ? {} : { assignee: req.user.id }).sort({ due: 1 }))));
tasks.get('/history', ah(async (req, res) => res.json(await TaskLog.find(isAdmin(req) && req.query.who ? { who: req.query.who } : { who: req.user.id }).sort({ date: -1 }).limit(500))));
tasks.post('/', requireAdmin, ah(async (req, res) => {
  const b = taskBody.parse(req.body);
  const t = await Task.create(b);
  await notify([{ to: b.assignee, type: 'New Task Assignment', text: `${b.recur !== 'Once' ? `${b.recur} task` : 'Task'} assigned: ${b.title} (due ${b.due})` }]);
  await activity(`${req.actor.name} allocated “${b.title}”`, req);
  res.status(201).json(t);
}));
tasks.patch('/:id', ah(async (req, res) => {
  const t = (await Task.findById(req.params.id)) || fail(404, 'Task not found');
  const admin = isAdmin(req);
  if (!admin && t.assignee !== req.user.id) fail(403, 'This task is assigned to someone else');
  // Staff may only change the status of their own tasks
  const b = admin ? taskBody.partial().parse(req.body) : z.object({ status: taskBody.shape.status }).parse(req.body);
  if (admin && b.assignee && b.assignee !== t.assignee) await notify([{ to: b.assignee, type: 'New Task Assignment', text: `Task assigned: ${b.title || t.title}` }]);
  const completing = b.status === 'Completed' && t.status !== 'Completed';
  Object.assign(t, b);
  if (completing) {
    await TaskLog.create({ title: t.title, who: t.assignee, due: t.due, date: todayS() });
    await activity(`${req.actor.name} completed “${t.title}”`, req);
    if (t.recur !== 'Once') {
      // Recurring tasks roll forward to the next occurrence
      t.due = addDays(t.due < todayS() ? todayS() : t.due, t.recur === 'Daily' ? 1 : 7);
      t.status = 'Pending';
    } else {
      await t.deleteOne();
      return res.json({ deleted: true });
    }
  }
  await t.save();
  res.json(t);
}));
tasks.patch('/:id/move', requireAdmin, ah(async (req, res) => {
  const { date } = z.object({ date: zDate }).parse(req.body);
  const t = (await Task.findByIdAndUpdate(req.params.id, { due: date }, { new: true })) || fail(404, 'Task not found');
  await notify([{ to: t.assignee, type: 'Upcoming Deadline', text: `“${t.title}” moved to ${date}` }]);
  res.json(t);
}));
tasks.delete('/:id', requireAdmin, ah(async (req, res) => { await Task.findByIdAndDelete(req.params.id); res.json({ ok: true }); }));

/* ---------- Calendar events ---------- */
export const events = Router();
events.use(requireAuth);
const eventBody = z.object({
  title: z.string().trim().min(2, 'Give the event a title').max(200),
  category: z.enum([...STAGES, 'Meeting']).default('Meeting'),
  date: zDate,
  time: z.string().regex(/^\d{2}:\d{2}$/, 'Use a valid time'),
  clientId: zOptId,
  staff: z.array(z.string()).default([]),
  notes: z.string().max(2000).optional().default(''),
});
events.get('/', ah(async (req, res) => res.json(await Event.find(isAdmin(req) ? {} : { staff: req.user.id }).sort({ date: 1 }))));
events.post('/', requireAdmin, ah(async (req, res) => {
  const b = eventBody.parse(req.body);
  const e = await Event.create(b);
  await notify(b.staff.map((s) => ({ to: s, type: 'Upcoming Deadline', text: `${b.title} — ${b.date} ${b.time}` })));
  await activity(`${req.actor.name} scheduled “${b.title}” on ${b.date}`, req);
  res.status(201).json(e);
}));
events.patch('/:id', requireAdmin, ah(async (req, res) => {
  const b = eventBody.partial().parse(req.body);
  res.json((await Event.findByIdAndUpdate(req.params.id, b, { new: true, runValidators: true })) || fail(404, 'Event not found'));
}));
events.delete('/:id', requireAdmin, ah(async (req, res) => { await Event.findByIdAndDelete(req.params.id); res.json({ ok: true }); }));

/* ---------- Notifications ---------- */
export const notifications = Router();
notifications.use(requireAuth);
const mine = (req) => ({ to: isAdmin(req) ? 'admin' : req.user.id });
notifications.get('/', ah(async (req, res) => res.json(await Notification.find(mine(req)).sort({ createdAt: -1 }).limit(100))));
notifications.post('/read-all', ah(async (req, res) => { await Notification.updateMany({ ...mine(req), read: false }, { read: true }); res.json({ ok: true }); }));
notifications.patch('/:id/read', ah(async (req, res) => { await Notification.updateOne({ _id: req.params.id, ...mine(req) }, { read: true }); res.json({ ok: true }); }));

/* ---------- Activity feed ---------- */
export const activityRouter = Router();
activityRouter.get('/', requireAuth, requireAdmin, ah(async (req, res) => res.json(await Activity.find().sort({ createdAt: -1 }).limit(+req.query.limit || 30))));

/* ---------- Settings ---------- */
export const settings = Router();
settings.use(requireAuth);
settings.get('/', ah(async (_req, res) => res.json(await getSettings())));
settings.put('/', requireAdmin, ah(async (req, res) => {
  const b = z.object({
    agency: z.string().trim().min(2).max(80),
    gaps: z.object({ shoot: z.coerce.number().int().min(0).max(30), edit: z.coerce.number().int().min(0).max(30), post: z.coerce.number().int().min(0).max(30) }),
    notifications: z.record(z.enum(NOTIFICATION_TYPES), z.boolean()),
  }).partial().parse(req.body);
  const s = await getSettings();
  if (b.agency) s.agency = b.agency;
  if (b.gaps) s.gaps = b.gaps;
  if (b.notifications) Object.entries(b.notifications).forEach(([k, val]) => s.notifications.set(k, val));
  await s.save();
  res.json(s);
}));
export { Setting };
