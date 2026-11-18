// Clients and monthly content packages
import { Router } from 'express';
import { z } from 'zod';
import { CATEGORIES, clientCode, planPackageVideos, addDays, todayS, curMonth } from '@studioflow/shared';
import { Client, Package, Video, User } from '../models/index.js';
import { ah, fail, requireAuth, requireAdmin, isAdmin, activity, notify, getSettings, staffClientIds, zDate, zMonth, zPhone, zOptId } from '../core.js';

const escapeRe = (s) => s.replace(/[.*+?^$(){}|[\]\\]/g, '\\$&');
const teamSchema = z.object({ writer: zOptId, videographer: zOptId, camera: zOptId, editor: zOptId, smm: zOptId }).default({});

/** Creates a package and one workflow per video. Shared by the clients and packages routes and the seed script. */
export async function generatePackage(client, { month, name, target, start, span, team }, req) {
  const settings = await getSettings();
  const pkg = await Package.create({ clientId: client.id, month, name, target, team });
  const existing = await Video.find({ $or: [{ code: new RegExp(`^VID-${month.slice(2, 4)}${month.slice(5, 7)}-${client.code}-`) }, { 'shoot.date': { $gte: start, $lte: addDays(start, 60) } }] });
  const plain = existing.map((v) => v.toObject());
  const videos = planPackageVideos({
    client: { ...client.toObject(), id: client.id }, pkg: { ...pkg.toObject(), id: pkg.id }, team, start, span,
    gaps: settings.gaps, existingCodes: plain.map((v) => v.code), existingVideos: plain,
  });
  await Video.insertMany(videos);
  if (req) {
    const what = { writer: 'scripts to write', videographer: 'shoots', camera: 'shoots', editor: 'videos to edit', smm: 'posts to publish' };
    await notify(Object.entries(what).filter(([k]) => team[k]).map(([k, w]) => ({ to: team[k], type: 'New Task Assignment', text: `${target} ${w} assigned for ${client.name} (${month})` })));
    await activity(`${req.actor.name} created “${name}” for ${client.name} — ${target} video workflows generated`, req);
  }
  return pkg;
}

export const clients = Router();
clients.use(requireAuth);

const clientBody = z.object({
  name: z.string().trim().min(2, 'Enter the client name'),
  company: z.string().trim().min(2, 'Enter the company name'),
  contact: z.string().trim().min(2, 'Enter a contact person'),
  phone: zPhone,
  email: z.string().email('Enter a valid email'),
  category: z.enum(CATEGORIES),
  address: z.string().trim().min(3, 'Enter an address'),
  manager: zOptId,
  pkgName: z.string().trim().min(2, 'Describe the package'),
  count: z.coerce.number().int().min(1).max(60),
  start: zDate,
  status: z.enum(['Active', 'Paused', 'Archived']).default('Active'),
  team: teamSchema,
  notes: z.string().optional(),
});

clients.get('/', ah(async (req, res) => {
  if (isAdmin(req)) return res.json(await Client.find().sort({ name: 1 }));
  const ids = await staffClientIds(req.user.id);
  res.json(await Client.find({ _id: { $in: ids } }).sort({ name: 1 }));
}));
clients.get('/:id', ah(async (req, res) => {
  const c = (await Client.findById(req.params.id)) || fail(404, 'Client not found');
  if (!isAdmin(req) && !(await staffClientIds(req.user.id)).includes(c.id)) fail(403, 'You are not assigned to this client');
  res.json(c);
}));
clients.post('/', requireAdmin, ah(async (req, res) => {
  const body = clientBody.extend({ generate: z.boolean().default(true) }).parse(req.body);
  const { generate, ...data } = body;
  if (await Client.exists({ name: new RegExp(`^${escapeRe(data.name)}$`, 'i') })) fail(409, 'A client with this name already exists');
  const codes = (await Client.find({}, 'code')).map((c) => c.code);
  const client = await Client.create({ ...data, code: clientCode(data.name, codes) });
  await notify([{ to: data.manager, type: 'New Task Assignment', text: `You are the account manager for new client ${client.name}` }]);
  await activity(`${req.actor.name} added client ${client.name}`, req);
  if (generate && client.status === 'Active') {
    const start = addDays(data.start > todayS() ? data.start : todayS(), 2);
    await generatePackage(client, { month: curMonth(), name: data.pkgName, target: data.count, start, span: Math.max(data.count, 14), team: data.team }, req);
  }
  res.status(201).json(client);
}));
clients.patch('/:id', requireAdmin, ah(async (req, res) => {
  const data = clientBody.partial().parse(req.body);
  const c = (await Client.findById(req.params.id)) || fail(404, 'Client not found');
  if (data.manager && data.manager !== c.manager) await notify([{ to: data.manager, type: 'New Task Assignment', text: `You are now the account manager for ${data.name || c.name}` }]);
  Object.assign(c, data);
  await c.save();
  await activity(`${req.actor.name} updated client ${c.name}`, req);
  res.json(c);
}));
clients.delete('/:id', requireAdmin, ah(async (req, res) => {
  const c = (await Client.findById(req.params.id)) || fail(404, 'Client not found');
  await Promise.all([Video.deleteMany({ clientId: c.id }), Package.deleteMany({ clientId: c.id }), User.updateMany({}, { $pull: { clients: c.id } })]);
  await c.deleteOne();
  await activity(`${req.actor.name} deleted client ${c.name}`, req);
  res.json({ ok: true });
}));

/* ---------- Packages ---------- */
export const packages = Router();
packages.use(requireAuth);

packages.get('/', ah(async (req, res) => {
  const q = {};
  if (req.query.month) q.month = req.query.month;
  if (req.query.clientId) q.clientId = req.query.clientId;
  if (!isAdmin(req)) q.clientId = { $in: await staffClientIds(req.user.id) };
  res.json(await Package.find(q).sort({ month: -1 }));
}));
packages.post('/', requireAdmin, ah(async (req, res) => {
  const b = z.object({
    clientId: z.string().min(1, 'Select a client'), month: zMonth, name: z.string().trim().min(2, 'Name the package'),
    target: z.coerce.number().int().min(1).max(60), start: zDate, span: z.coerce.number().int().min(1).max(31).default(18), team: teamSchema,
  }).parse(req.body);
  if (!b.team.writer || !b.team.editor || !b.team.smm) fail(400, 'Assign at least a script writer, video editor and social media manager');
  const client = (await Client.findById(b.clientId)) || fail(404, 'Client not found');
  res.status(201).json(await generatePackage(client, b, req));
}));
packages.patch('/:id', requireAdmin, ah(async (req, res) => {
  const b = z.object({ name: z.string().min(2), month: zMonth }).partial().parse(req.body);
  res.json(await Package.findByIdAndUpdate(req.params.id, b, { new: true, runValidators: true }) || fail(404, 'Package not found'));
}));
packages.delete('/:id', requireAdmin, ah(async (req, res) => {
  const p = (await Package.findById(req.params.id)) || fail(404, 'Package not found');
  await Video.deleteMany({ packageId: p.id });
  await p.deleteOne();
  await activity(`${req.actor.name} deleted package “${p.name}”`, req);
  res.json({ ok: true });
}));
// Adds one more video to a package (target + 1)
packages.post('/:id/videos', requireAdmin, ah(async (req, res) => {
  const p = (await Package.findById(req.params.id)) || fail(404, 'Package not found');
  const client = (await Client.findById(p.clientId)) || fail(404, 'Client not found');
  const settings = await getSettings();
  const last = (await Video.find({ packageId: p.id }).sort({ 'script.deadline': -1 }).limit(1))[0];
  const start = addDays(last && last.script.deadline > todayS() ? last.script.deadline : todayS(), 1);
  const existing = (await Video.find({ $or: [{ clientId: client.id }, { 'shoot.date': { $gte: start } }] })).map((v) => v.toObject());
  const [v] = planPackageVideos({ client: { ...client.toObject(), id: client.id }, pkg: { ...p.toObject(), id: p.id, target: 1 }, team: p.team || client.team, start, span: 1, gaps: settings.gaps, existingCodes: existing.map((x) => x.code), existingVideos: existing });
  if (req.body?.title) v.title = String(req.body.title).slice(0, 140);
  const doc = await Video.create(v);
  p.target += 1; await p.save();
  await notify([{ to: v.script.writer, type: 'New Task Assignment', text: `Script assigned: “${v.title}” due ${v.script.deadline}`, videoId: doc.id }]);
  await activity(`${req.actor.name} added ${doc.code} to ${client.name}`, req, doc.id);
  res.status(201).json(doc);
}));
