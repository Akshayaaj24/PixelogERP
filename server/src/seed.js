// Fills the database with a realistic sample agency. Run: npm run seed
// WARNING: wipes existing data. Pass --keep to abort if data exists.
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { todayS, addDays, curMonth, diffDays, clientCode, NOTIFICATION_TYPES } from '@studioflow/shared';
import { config } from './core.js';
import { User, Client, Package, Video, Task, TaskLog, Event, Notification, Activity, Setting } from './models/index.js';
import { generatePackage } from './routes/clients.js';

function rng(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

await mongoose.connect(config.mongoUri);
if (process.argv.includes('--keep') && (await Client.exists({}))) { console.log('Data exists — skipping seed.'); process.exit(0); }
await Promise.all([User, Client, Package, Video, Task, TaskLog, Event, Notification, Activity, Setting].map((m) => m.deleteMany({})));

const R = rng(20261116); const pick = (a) => a[Math.floor(R() * a.length)];
const T = todayS();
await Setting.create({ agency: 'pixelog', gaps: { shoot: 3, edit: 4, post: 3 }, notifications: Object.fromEntries(NOTIFICATION_TYPES.map((t) => [t, true])) });

const adminHash = await bcrypt.hash('admin12345', 10);
const staffHash = await bcrypt.hash('staff12345', 10);
await User.create({ name: 'Admin', email: 'admin@pixelog.in', role: 'admin', jobRole: 'Administrator', joined: addDays(T, -900), passwordHash: adminHash });
const people = [['Priya Raman', 'Account Manager'], ['Arjun Mehta', 'Script Writer'], ['Kavya Nair', 'Script Writer'], ['Rahul Verma', 'Videographer'], ['Divya Iyer', 'Camera Operator'], ['Karthik Subramanian', 'Videographer'], ['Sneha Pillai', 'Video Editor'], ['Vikram Das', 'Video Editor'], ['Ananya Rao', 'Video Editor'], ['Meera Krishnan', 'Social Media Manager'], ['Rohan Kapoor', 'Social Media Manager'], ['Lakshmi Menon', 'Account Manager'], ['Naveen Kumar', 'Camera Operator']];
const S = {};
for (const [i, [name, jobRole]] of people.entries()) {
  const u = await User.create({ name, jobRole, role: 'staff', email: `${name.split(' ')[0].toLowerCase()}@pixelog.in`, phone: `+91 9${String(840123456 + i * 7310917).slice(0, 9)}`, joined: addDays(T, -(140 + i * 53)), passwordHash: staffHash });
  S[name.split(' ')[0]] = u.id;
}
const CL = [
  ['Spice Route Kitchens', 'Spice Route Hospitality Pvt Ltd', 'Rajesh Iyer', 'Restaurant & Food', '12 Khader Nawaz Khan Rd, Nungambakkam, Chennai', 8, 'Priya', ['Arjun', 'Rahul', 'Divya', 'Sneha', 'Meera']],
  ['UrbanFit Gym', 'UrbanFit Wellness LLP', 'Sanjay Menon', 'Fitness', '45 OMR, Thoraipakkam, Chennai', 6, 'Priya', ['Kavya', 'Karthik', 'Naveen', 'Vikram', 'Rohan']],
  ['Aura Dental Care', 'Aura Healthcare Pvt Ltd', 'Dr. Nisha Varma', 'Healthcare', '8 TTK Road, Alwarpet, Chennai', 4, 'Lakshmi', ['Arjun', 'Rahul', 'Naveen', 'Ananya', 'Meera']],
  ['Nova Realty', 'Nova Realty Developers', 'Arvind Krishnan', 'Real Estate', '220 Anna Salai, Teynampet, Chennai', 10, 'Lakshmi', ['Kavya', 'Karthik', 'Divya', 'Sneha', 'Rohan']],
  ['BloomKids Academy', 'Bloom Education Trust', 'Revathi Sundar', 'Education', '3 Velachery Main Rd, Velachery, Chennai', 4, 'Priya', ['Arjun', 'Rahul', 'Naveen', 'Ananya', 'Meera']],
  ['TechNest Electronics', 'TechNest Retail Pvt Ltd', 'Imran Sheikh', 'Retail & E-commerce', 'Phoenix Marketcity, Velachery, Chennai', 8, 'Lakshmi', ['Kavya', 'Karthik', 'Divya', 'Vikram', 'Rohan']],
  ['Lotus Wellness Spa', 'Lotus Wellness Pvt Ltd', 'Deepa Raghavan', 'Beauty & Wellness', '17 ECR, Neelankarai, Chennai', 6, 'Priya', ['Arjun', 'Rahul', 'Divya', 'Ananya', 'Meera']],
  ['GreenLeaf Organics', 'GreenLeaf Foods', 'Mohan Das', 'FMCG', 'Plot 9, Ambattur Industrial Estate, Chennai', 4, 'Lakshmi', ['Kavya', 'Karthik', 'Naveen', 'Vikram', 'Rohan'], 'Paused'],
];
const codes = [];
for (const [i, [name, company, contact, category, address, count, mgr, tm, status]] of CL.entries()) {
  const code = clientCode(name, codes); codes.push(code);
  const team = { writer: S[tm[0]], videographer: S[tm[1]], camera: S[tm[2]], editor: S[tm[3]], smm: S[tm[4]] };
  const c = await Client.create({ code, name, company, contact, category, address, count, team, status: status || 'Active', manager: S[mgr], pkgName: `Monthly ${count} Videos Package`, start: addDays(T, -(60 + i * 37)), phone: `+91 9${String(791034561 + i * 3901731).slice(0, 9)}`, email: `hello@${name.toLowerCase().replace(/[^a-z]/g, '').slice(0, 14)}.in` });
  if (c.status === 'Active') await generatePackage(c, { month: curMonth(), name: c.pkgName, target: count, start: addDays(T, -16 + (i % 3)), span: 18, team });
}

// Move each video along its workflow according to where today falls in its schedule
const levels = (v) => {
  const lt = (d) => d < T;
  if (lt(v.post.date)) return R() < 0.86 ? 11 : 10;
  if (lt(v.edit.deadline)) return pick([8, 9, 10, 10, 10]);
  if (lt(v.shoot.date)) return pick([6, 7, 7, 8]);
  if (lt(v.script.deadline)) return pick([5, 5, 5, 3, 4]);
  if (v.script.deadline === T) return pick([1, 2, 2]);
  return diffDays(v.script.deadline, T) < 4 ? pick([0, 1, 1, 2]) : pick([0, 0, 1]);
};
const late = () => (R() < 0.18 ? 1 + Math.floor(R() * 2) : -Math.floor(R() * 2));
const notes = [];
for (const v of await Video.find()) {
  const l = levels(v);
  v.script.status = l < 5 ? ['Pending', 'In Progress', 'Submitted', 'Under Review', 'Revision Required'][l] : 'Approved';
  v.shoot.status = l < 5 ? 'Upcoming' : l === 5 ? 'Scheduled' : 'Completed';
  v.edit.status = l < 6 ? 'Pending' : ['Assigned', 'Editing', 'Internal Review', 'Revision Required', 'Approved', 'Completed'][l - 6];
  v.post.status = l < 10 ? 'Draft' : l === 10 ? 'Scheduled' : 'Published';
  if (l >= 5) v.script.doneAt = addDays(v.script.deadline, late());
  if (l >= 6) { v.shoot.doneAt = v.shoot.date; }
  if (l >= 10) {
    v.edit.doneAt = addDays(v.edit.deadline, late());
    const c = await Client.findById(v.clientId);
    v.post.caption = `${v.title} ✨ Tap the link in bio to know more about ${c.name}.`;
    v.post.hashtags = `#${c.name.replace(/[^A-Za-z]/g, '')} #Chennai #reels`;
    v.post.platforms = pick([['Instagram', 'Facebook'], ['Instagram', 'YouTube'], ['Instagram', 'Facebook', 'LinkedIn']]);
  }
  if (l === 11) { v.post.doneAt = v.post.date; v.post.link = `https://www.instagram.com/reel/${Math.random().toString(36).slice(2, 13)}`; }
  if (l === 4) v.notes.push({ by: 'admin', byName: 'Admin', stage: 'script', kind: 'feedback', text: 'The hook is too slow — open with the result in the first 3 seconds and trim the intro by half.', at: new Date(Date.now() - 5 * 3600e3) });
  if (l === 9) v.notes.push({ by: 'admin', byName: 'Admin', stage: 'edit', kind: 'feedback', text: 'Colour grade looks flat on the close-ups. Add captions for the voice-over and end with the brand logo card.', at: new Date(Date.now() - 6 * 3600e3) });
  if (l === 2 || l === 3) notes.push({ to: 'admin', type: 'Script Approval', text: `A script was submitted for “${v.title}”`, videoId: v.id });
  if (l === 8) notes.push({ to: 'admin', type: 'Script Approval', text: `“${v.title}” was submitted for video review`, videoId: v.id });
  if (l === 6) notes.push({ to: v.edit.editor, type: 'New Task Assignment', text: `Shoot done — edit “${v.title}” by ${v.edit.deadline}`, videoId: v.id });
  v.log.unshift({ by: 'System', text: 'Progress imported from production tracker', at: new Date() });
  await v.save();
}
// One deliberate double-booking so conflict detection has something to show
const fut = await Video.find({ 'shoot.status': { $in: ['Scheduled', 'Upcoming'] }, 'shoot.date': { $gt: T } }).sort({ 'shoot.date': 1 });
if (fut.length > 3) {
  const a = fut[0]; const b = fut.find((x) => x.clientId !== a.clientId) || fut[1];
  b.shoot.date = a.shoot.date; b.shoot.time = a.shoot.time; b.shoot.team = [a.shoot.team[0], b.shoot.team[1]].filter(Boolean);
  await b.save();
}

const tk = (title, who, due, recur, clientId = '', status = 'Pending') => Task.create({ title, assignee: S[who], due, recur, clientId, status });
const c1 = (await Client.findOne({ name: 'Spice Route Kitchens' })).id; const c4 = (await Client.findOne({ name: 'Nova Realty' })).id;
await tk('Weekly client check-in call — Spice Route', 'Priya', addDays(T, 1), 'Weekly', c1);
await tk('Share monthly report with Nova Realty', 'Lakshmi', addDays(T, 2), 'Once', c4);
await tk('Update content calendar & engagement log', 'Meera', T, 'Daily');
await tk('Reply to comments & DMs (all clients)', 'Rohan', T, 'Daily');
await tk('Camera & lens maintenance check', 'Rahul', addDays(T, 3), 'Weekly');
await tk('Archive last month’s raw footage', 'Vikram', addDays(T, -1), 'Once', '', 'In Progress');
await Event.create({ title: 'Quarterly strategy review — Nova Realty', category: 'Meeting', date: addDays(T, 2), time: '15:00', clientId: c4, staff: [S.Lakshmi, S.Kavya] });
await Event.create({ title: 'Team production stand-up', category: 'Meeting', date: T, time: '10:00', staff: Object.values(S) });
await Notification.insertMany(notes);
await Activity.create({ text: 'Sample workspace created', by: 'System' });

console.log(`Seeded ${await Client.countDocuments()} clients, ${await Video.countDocuments()} videos, ${people.length} staff.
  Admin:  admin@pixelog.in / admin12345
  Staff:  <firstname>@pixelog.in / staff12345  (e.g. sneha@pixelog.in)`);
await mongoose.disconnect();
