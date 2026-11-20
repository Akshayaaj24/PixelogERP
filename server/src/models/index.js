import mongoose from 'mongoose';
import {
  SCRIPT_ST, SHOOT_ST, EDIT_ST, POST_ST, PLATFORMS, JOB_ROLES, CATEGORIES, NOTIFICATION_TYPES, STAGES,
} from '@PixelogERP/shared';

const { Schema, model } = mongoose;

// References to other documents are stored as id strings. This keeps the
// shared workflow code (which runs in the browser too) free of ObjectId handling.
const Ref = { type: String, default: '' };
const DateStr = { type: String, match: /^\d{4}-\d{2}-\d{2}$/ };

const json = {
  virtuals: true,
  versionKey: false,
  transform(_doc, ret) { ret.id = String(ret._id); delete ret._id; delete ret.passwordHash; return ret; },
};
const opts = { timestamps: true, toJSON: json, toObject: json };

/* ---------- Users (admins and staff) ---------- */
const userSchema = new Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['admin', 'staff'], default: 'staff' },
  jobRole: { type: String, enum: [...JOB_ROLES, 'Administrator'], default: 'Script Writer' },
  phone: String,
  photo: String, // small data URL (resized on the client)
  joined: DateStr,
  status: { type: String, enum: ['Active', 'On Leave', 'Inactive'], default: 'Active' },
  clients: [Ref], // explicitly assigned clients
}, opts);
export const User = model('User', userSchema);

/* ---------- Clients ---------- */
const team = { writer: Ref, videographer: Ref, camera: Ref, editor: Ref, smm: Ref };
const clientSchema = new Schema({
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true, trim: true },
  company: { type: String, required: true },
  contact: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true, lowercase: true },
  category: { type: String, enum: CATEGORIES },
  address: String,
  manager: Ref,
  pkgName: String,
  count: { type: Number, min: 1, max: 60 },
  start: DateStr,
  status: { type: String, enum: ['Active', 'Paused', 'Archived'], default: 'Active' },
  team,
  notes: String,
}, opts);
export const Client = model('Client', clientSchema);

/* ---------- Monthly content packages ---------- */
const packageSchema = new Schema({
  clientId: { ...Ref, required: true, index: true },
  month: { type: String, required: true, match: /^\d{4}-\d{2}$/, index: true },
  name: { type: String, required: true },
  target: { type: Number, required: true, min: 0 },
  team,
}, opts);
export const Package = model('Package', packageSchema);

/* ---------- Videos: one independent workflow each ---------- */
const videoSchema = new Schema({
  code: { type: String, required: true, unique: true }, // VID-YYMM-CLI-NN
  title: { type: String, required: true },
  clientId: { ...Ref, required: true, index: true },
  packageId: { ...Ref, required: true, index: true },
  script: { writer: Ref, deadline: DateStr, status: { type: String, enum: SCRIPT_ST, default: 'Pending' }, doneAt: String },
  shoot: { team: [String], date: DateStr, time: String, location: String, instructions: String, status: { type: String, enum: SHOOT_ST, default: 'Upcoming' }, doneAt: String },
  edit: { editor: Ref, deadline: DateStr, status: { type: String, enum: EDIT_ST, default: 'Pending' }, doneAt: String },
  post: { smm: Ref, date: DateStr, time: String, platforms: [{ type: String, enum: PLATFORMS }], caption: String, hashtags: String, link: String, status: { type: String, enum: POST_ST, default: 'Draft' }, doneAt: String },
  notes: [{ by: String, byName: String, stage: String, kind: { type: String, enum: ['note', 'feedback'] }, text: String, at: Date }],
  log: [{ by: String, text: String, at: Date }],
}, opts);
videoSchema.index({ 'script.writer': 1 });
videoSchema.index({ 'shoot.team': 1 });
videoSchema.index({ 'edit.editor': 1 });
videoSchema.index({ 'post.smm': 1 });
videoSchema.index({ 'shoot.date': 1, 'shoot.time': 1 });
export const Video = model('Video', videoSchema);

/* ---------- General (non-video) tasks ---------- */
const taskSchema = new Schema({
  title: { type: String, required: true },
  assignee: { ...Ref, required: true, index: true },
  clientId: Ref,
  due: { ...DateStr, required: true },
  recur: { type: String, enum: ['Once', 'Daily', 'Weekly'], default: 'Once' },
  status: { type: String, enum: ['Pending', 'In Progress', 'Completed'], default: 'Pending' },
  notes: String,
}, opts);
export const Task = model('Task', taskSchema);

// History of completed general tasks (recurring tasks roll forward, so their completions are logged here)
export const TaskLog = model('TaskLog', new Schema({ title: String, who: { type: String, index: true }, due: String, date: String }, opts));

/* ---------- Calendar events ---------- */
export const Event = model('Event', new Schema({
  title: { type: String, required: true },
  category: { type: String, enum: [...STAGES, 'Meeting'], default: 'Meeting' },
  date: { ...DateStr, required: true },
  time: String,
  clientId: Ref,
  staff: [String],
  notes: String,
}, opts));

/* ---------- Notifications & activity ---------- */
export const Notification = model('Notification', new Schema({
  to: { type: String, required: true, index: true }, // user id, or 'admin' for every admin
  type: { type: String, enum: [...NOTIFICATION_TYPES, 'Update'] },
  text: String,
  videoId: String,
  read: { type: Boolean, default: false },
}, opts));

export const Activity = model('Activity', new Schema({ text: String, videoId: String, by: String }, opts));

/* ---------- Agency settings (single document) ---------- */
export const Setting = model('Setting', new Schema({
  agency: { type: String, default: 'Your Agency' },
  gaps: { shoot: { type: Number, default: 3 }, edit: { type: Number, default: 4 }, post: { type: Number, default: 3 } },
  notifications: { type: Map, of: Boolean, default: {} },
}, opts));

/* ---------- Sign-in attempts (rate limiting that works across serverless instances) ---------- */
const attemptSchema = new Schema({ key: { type: String, unique: true }, count: Number, expiresAt: Date });
attemptSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const LoginAttempt = model('LoginAttempt', attemptSchema);
