// Video workflows: listing, stage details, status transitions, notes, rescheduling.
// Videos and scripts themselves are shared on WhatsApp — the app only tracks their status.
import { Router } from 'express';
import { z } from 'zod';
import {
  STATUSES, STAGE_LBL, PLATFORMS, canTransition, applyTransition, stageAssignees, shootClash, orderWarning, myStage, involved,
} from '@PixelogERP/shared';
import { Video, Package, Client } from '../models/index.js';
import { ah, fail, requireAuth, requireAdmin, isAdmin, wfUser, videoScope, managedClientIds, notify, activity, zDate, zUrl, zOptId } from '../core.js';

export const videos = Router();
videos.use(requireAuth);

async function load(req) {
  const v = (await Video.findById(req.params.id)) || fail(404, 'Video not found');
  if (!isAdmin(req)) {
    const plain = v.toObject();
    const ok = involved(plain, req.user.id) || (await managedClientIds(req.user.id)).includes(v.clientId);
    if (!ok) fail(403, 'You are not assigned to this video');
  }
  return v;
}
const log = (v, req, text) => v.log.unshift({ by: req.actor.name, text, at: new Date() });
const STAGE_FIELDS = ['script', 'shoot', 'edit', 'post'];
/** Writes the stage objects of a plain (shared-logic) video back onto the mongoose doc */
function writeBack(doc, plain) {
  STAGE_FIELDS.forEach((s) => { const rest = plain[s]; Object.entries(rest).forEach(([k, val]) => doc.set(`${s}.${k}`, val)); });
  doc.notes = plain.notes; doc.log = plain.log;
}

videos.get('/', ah(async (req, res) => {
  const q = await videoScope(req);
  if (req.query.clientId) q.clientId = req.query.clientId;
  if (req.query.month) q.packageId = { $in: (await Package.find({ month: req.query.month }, '_id')).map((p) => String(p._id)) };
  if (!req.query.includeArchived) {
    const archived = (await Client.find({ status: 'Archived' }, '_id')).map((c) => String(c._id));
    if (archived.length) q.clientId = q.clientId ? q.clientId : { $nin: archived };
  }
  res.json(await Video.find(q).sort({ 'post.date': 1 }));
}));
videos.get('/:id', ah(async (req, res) => res.json(await load(req))));

/* ---------- Stage details (assignments, dates, captions…) ---------- */
const stageBodies = {
  script: z.object({ title: z.string().trim().min(2).max(140), writer: z.string().min(1, 'Select a writer'), deadline: zDate }),
  shoot: z.object({ team: z.array(z.string()).min(1, 'Assign at least a videographer'), date: zDate, time: z.string().regex(/^\d{2}:\d{2}$/), location: z.string().trim().min(2), instructions: z.string().max(2000).optional().default(''), override: z.boolean().optional() }),
  edit: z.object({ editor: z.string().min(1, 'Select an editor'), deadline: zDate }),
  post: z.object({ smm: zOptId, date: zDate, time: z.string().regex(/^\d{2}:\d{2}$/), platforms: z.array(z.enum(PLATFORMS)).min(1, 'Select at least one platform'), caption: z.string().max(2200).optional().default(''), hashtags: z.string().max(500).optional().default(''), link: z.union([zUrl, z.literal('')]).optional().default('') }),
};
async function applyDetails(req, v, stage, body) {
  const admin = isAdmin(req);
  const plain = v.toObject();
  if (!admin && !(stage === 'post' && myStage(plain, 'post', req.user.id))) fail(403, 'Only admins can change these details');
  const b = stageBodies[stage].parse(body);
  const s = v[stage];
  const changes = [];
  const n = [];
  if (stage === 'script') {
    if (v.title !== b.title) { v.title = b.title; changes.push('title'); }
    if (s.writer !== b.writer) { n.push({ to: b.writer, type: 'New Task Assignment', text: `Script assigned: “${v.title}” due ${b.deadline}` }); changes.push('writer'); }
    if (s.deadline !== b.deadline) { n.push({ to: b.writer, type: 'Upcoming Deadline', text: `Script deadline for “${v.title}” is now ${b.deadline}` }); changes.push('deadline'); }
    Object.assign(s, { writer: b.writer, deadline: b.deadline });
  }
  if (stage === 'shoot') {
    const others = (await Video.find({ _id: { $ne: v._id }, 'shoot.date': b.date })).map((x) => x.toObject());
    const clash = shootClash(others, b.date, b.time, b.team, v.id);
    if (clash.length && !b.override) {
      fail(409, `Schedule conflict: a team member is already booked at ${b.time} on ${b.date} (${clash.map((c) => c.code).join(', ')})`, { conflicts: clash.map((c) => ({ id: c.id, code: c.code, title: c.title, team: c.shoot.team })) });
    }
    const moved = s.date !== b.date || s.time !== b.time;
    b.team.filter((t) => !s.team.includes(t)).forEach((t) => n.push({ to: t, type: 'New Task Assignment', text: `Shoot assigned: “${v.title}” ${b.date} ${b.time}` }));
    if (moved) { s.team.filter((t) => b.team.includes(t)).forEach((t) => n.push({ to: t, type: 'Shoot Reminder', text: `Shoot for “${v.title}” moved to ${b.date} ${b.time}` })); changes.push('date/time'); if (s.status === 'Scheduled') s.status = 'Rescheduled'; }
    Object.assign(s, { team: b.team, date: b.date, time: b.time, location: b.location, instructions: b.instructions });
  }
  if (stage === 'edit') {
    if (s.editor !== b.editor) { n.push({ to: b.editor, type: 'New Task Assignment', text: `Edit assigned: “${v.title}” due ${b.deadline}` }); changes.push('editor'); }
    if (s.deadline !== b.deadline) n.push({ to: b.editor, type: 'Editing Reminder', text: `Editing deadline for “${v.title}” is now ${b.deadline}` });
    Object.assign(s, { editor: b.editor, deadline: b.deadline });
  }
  if (stage === 'post') {
    const smm = admin && b.smm ? b.smm : s.smm;
    if (smm !== s.smm) n.push({ to: smm, type: 'New Task Assignment', text: `Post assigned: “${v.title}” on ${b.date}` });
    Object.assign(s, { smm, date: b.date, time: b.time, platforms: b.platforms, caption: b.caption, hashtags: b.hashtags, link: b.link });
  }
  log(v, req, `${STAGE_LBL[stage]} details updated${changes.length ? ` (${changes.join(', ')})` : ''}`);
  return n.filter((x) => x.to && x.to !== req.user.id).map((x) => ({ ...x, videoId: v.id }));
}
videos.patch('/:id/stages/:stage', ah(async (req, res) => {
  const { stage } = req.params;
  if (!stageBodies[stage]) fail(404, 'Unknown stage');
  const v = await load(req);
  const n = await applyDetails(req, v, stage, req.body);
  await v.save();
  await notify(n);
  res.json({ video: v, warning: orderWarning(v.toObject()) });
}));

/* ---------- Status transitions (the workflow engine) ---------- */
videos.post('/:id/transition', ah(async (req, res) => {
  const b = z.object({ stage: z.enum(STAGE_FIELDS), status: z.string(), note: z.string().trim().max(4000).optional(), details: z.record(z.any()).optional() }).parse(req.body);
  if (!STATUSES[b.stage].includes(b.status)) fail(400, 'Unknown status for this stage');
  const v = await load(req);
  if (!canTransition(v.toObject(), b.stage, b.status, wfUser(req))) fail(403, `You can't change this ${STAGE_LBL[b.stage].toLowerCase()} to “${b.status}” right now`);
  if (b.status === 'Revision Required' && !b.note) fail(400, 'Add feedback so the team knows what to change');
  let n = [];
  // Some actions carry a form (schedule shoot / schedule post / publish link)
  if (b.details) n = await applyDetails(req, v, b.stage, b.details);
  if (b.status === 'Published' && !v.post.link) fail(400, 'Add the published post link');
  const plain = v.toObject();
  n = n.concat(applyTransition(plain, b.stage, b.status, { actor: req.actor, note: b.note }));
  writeBack(v, plain);
  await v.save();
  await notify(n);
  await activity(`${req.actor.name} set ${STAGE_LBL[b.stage].toLowerCase()} of ${v.code} to ${b.status}`, req, v.id);
  res.json({ video: v });
}));

// Admin override: set any status directly (from the stage edit form)
videos.put('/:id/stages/:stage/status', requireAdmin, ah(async (req, res) => {
  const { stage } = req.params;
  const { status } = z.object({ status: z.string() }).parse(req.body);
  if (!STATUSES[stage]?.includes(status)) fail(400, 'Unknown status');
  const v = await load(req);
  const plain = v.toObject();
  const n = applyTransition(plain, stage, status, { actor: req.actor });
  writeBack(v, plain);
  await v.save();
  await notify(n);
  res.json({ video: v });
}));

/* ---------- Calendar drag & drop ---------- */
videos.patch('/:id/move', requireAdmin, ah(async (req, res) => {
  const { kind, date } = z.object({ kind: z.enum(STAGE_FIELDS), date: zDate }).parse(req.body);
  const v = await load(req);
  const field = { script: 'deadline', shoot: 'date', edit: 'deadline', post: 'date' }[kind];
  const old = v[kind][field];
  if (old === date) return res.json({ video: v });
  v[kind][field] = date;
  if (kind === 'shoot' && v.shoot.status === 'Scheduled') v.shoot.status = 'Rescheduled';
  log(v, req, `${STAGE_LBL[kind]} date moved ${old} → ${date}`);
  await v.save();
  const plain = v.toObject();
  await notify(stageAssignees(plain, kind).map((s) => ({ to: s, type: 'Upcoming Deadline', text: `${STAGE_LBL[kind]} for “${v.title}” moved to ${date}`, videoId: v.id })));
  await activity(`${req.actor.name} rescheduled ${STAGE_LBL[kind].toLowerCase()} of ${v.code} to ${date}`, req, v.id);
  let warning = orderWarning(plain);
  if (kind === 'shoot') {
    const clash = shootClash((await Video.find({ 'shoot.date': date })).map((x) => x.toObject()), date, v.shoot.time, v.shoot.team, v.id);
    if (clash.length) warning = `Schedule conflict: the team is already booked for ${clash.map((c) => c.code).join(', ')} at ${v.shoot.time}`;
  }
  res.json({ video: v, warning });
}));

/* ---------- Notes & feedback ---------- */
videos.post('/:id/notes', ah(async (req, res) => {
  const b = z.object({ stage: z.enum(STAGE_FIELDS), text: z.string().trim().min(1, 'Write a note').max(4000), feedback: z.boolean().optional() }).parse(req.body);
  const v = await load(req);
  const plain = v.toObject();
  if (!isAdmin(req) && !myStage(plain, b.stage, req.user.id)) fail(403, 'You can only add notes to your own stage');
  const kind = isAdmin(req) && b.feedback ? 'feedback' : 'note';
  v.notes.unshift({ by: req.actor.id, byName: req.actor.name, stage: b.stage, kind, text: b.text, at: new Date() });
  log(v, req, `Added a ${kind} on ${STAGE_LBL[b.stage].toLowerCase()}`);
  await v.save();
  const to = isAdmin(req) ? stageAssignees(plain, b.stage) : ['admin'];
  await notify(to.map((t) => ({ to: t, type: kind === 'feedback' ? 'Revision Request' : 'Update', text: `${req.actor.name} left ${kind === 'feedback' ? 'feedback' : 'a note'} on “${v.title}”`, videoId: v.id })));
  res.status(201).json({ video: v });
}));

/* ---------- Duplicate / delete ---------- */
videos.delete('/:id', requireAdmin, ah(async (req, res) => {
  const v = await load(req);
  await Package.updateOne({ _id: v.packageId }, { $inc: { target: -1 } });
  await v.deleteOne();
  await activity(`${req.actor.name} deleted ${v.code}`, req);
  res.json({ ok: true });
}));

