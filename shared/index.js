// Shared, framework-free workflow logic used by both the API (server) and the React client.
// Dates are plain 'YYYY-MM-DD' strings so that deadlines never shift across time zones.

/* ---------------- Dates ---------------- */
export const pad = (n) => String(n).padStart(2, '0');
export const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseD = (s) => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); };
export const todayS = () => iso(new Date());
export const addDays = (s, n) => { const d = parseD(s); d.setDate(d.getDate() + n); return iso(d); };
export const addMonths = (s, n) => { const d = parseD(s); d.setDate(1); d.setMonth(d.getMonth() + n); return iso(d); };
export const diffDays = (a, b) => Math.round((parseD(a) - parseD(b)) / 864e5);
export const curMonth = () => todayS().slice(0, 7);
export const weekStart = (s) => addDays(s, -((parseD(s).getDay() + 6) % 7));

/* ---------------- Constants ---------------- */
export const SCRIPT_ST = ['Pending', 'In Progress', 'Submitted', 'Under Review', 'Revision Required', 'Approved'];
export const SHOOT_ST = ['Upcoming', 'Scheduled', 'In Progress', 'Completed', 'Cancelled', 'Rescheduled'];
export const EDIT_ST = ['Pending', 'Assigned', 'Editing', 'Internal Review', 'Revision Required', 'Approved', 'Completed'];
export const POST_ST = ['Draft', 'Scheduled', 'Pending', 'Published', 'Failed'];
export const STATUSES = { script: SCRIPT_ST, shoot: SHOOT_ST, edit: EDIT_ST, post: POST_ST };
export const STAGE_KEYS = ['script', 'shoot', 'edit', 'post'];
export const PLATFORMS = ['Instagram', 'Facebook', 'YouTube', 'LinkedIn', 'Other'];
export const JOB_ROLES = ['Script Writer', 'Videographer', 'Camera Operator', 'Video Editor', 'Social Media Manager', 'Account Manager'];
export const STAGES = ['Script Writing', 'Script Approval', 'Video Shooting', 'Video Editing', 'Video Review', 'Social Media Posting'];
export const STAGE_DONE = ['Scripts written', 'Scripts approved', 'Videos shot', 'Videos edited', 'Videos approved', 'Videos published'];
export const STAGE_KEY = { script: 'Script Writing', shoot: 'Video Shooting', edit: 'Video Editing', post: 'Social Media Posting' };
export const STAGE_LBL = { script: 'Script', shoot: 'Shoot', edit: 'Edit', post: 'Post' };
export const ASSIGNEE = { script: 'writer', edit: 'editor', post: 'smm' };
export const DONE_ST = { script: ['Approved'], shoot: ['Completed'], edit: ['Approved', 'Completed'], post: ['Published'] };
export const SLOTS = ['09:00', '11:30', '14:00', '16:30'];
export const CATEGORIES = ['Restaurant & Food', 'Fitness', 'Healthcare', 'Real Estate', 'Education', 'Retail & E-commerce', 'Beauty & Wellness', 'FMCG', 'Automotive', 'Jewellery', 'Other'];
export const NOTIFICATION_TYPES = ['New Task Assignment', 'Upcoming Deadline', 'Overdue Task', 'Script Approval', 'Revision Request', 'Shoot Reminder', 'Editing Reminder', 'Posting Reminder'];
export const EVENT_COLORS = {
  'Script Writing': '#6366F1', 'Script Approval': '#8B5CF6', 'Video Shooting': '#F59E0B', 'Video Editing': '#0EA5E9',
  'Video Review': '#EC4899', 'Social Media Posting': '#10B981', 'General Task': '#64748B', Meeting: '#14B8A6', Published: '#059669',
};
export const STATUS_TONE = {
  Pending: 'gray', Draft: 'gray', Upcoming: 'gray', 'Not Started': 'gray', 'In Progress': 'blue', Editing: 'blue', Assigned: 'blue',
  Scheduled: 'blue', Submitted: 'violet', 'Under Review': 'violet', 'Internal Review': 'violet', 'Revision Required': 'orange',
  Approved: 'teal', Completed: 'green', Published: 'green', Cancelled: 'red', Failed: 'red', Rescheduled: 'amber', Overdue: 'red',
  Active: 'green', Paused: 'amber', Archived: 'gray', 'On Leave': 'amber', Inactive: 'gray',
  'On track': 'green', 'On time': 'green', 'Script Writing': 'gray', 'Script Approval': 'violet', 'Video Shooting': 'amber', 'Video Editing': 'blue', 'Video Review': 'violet', 'Social Media Posting': 'teal',
};
export const VIDEO_IDEAS = {
  'Restaurant & Food': ['Chef’s Special: Behind the Pass', '60-Second Biryani Story', 'Weekend Brunch Reel', 'Kitchen Tour with the Head Chef', 'Customer Taste Test', 'Festive Menu Launch', 'The Spice Blending Ritual', 'Plating Masterclass', 'Street-to-Table Story', 'Monsoon Specials Teaser'],
  Fitness: ['5-Minute Core Burn', 'Member Transformation Story', 'Trainer Tips: The Perfect Squat', 'Gym Tour Walkthrough', 'Myth vs Fact: Cardio', 'HIIT Challenge Reel', 'Nutrition Basics with Coach', 'Early Morning Batch Vibes', 'Mobility Routine for Desk Workers', 'New Equipment Launch'],
  Healthcare: ['Painless Root Canal, Explained', 'Meet Our Lead Dentist', 'Smile Makeover: Before & After', 'Kids Dental Care Tips', 'Clinic Hygiene Walkthrough', 'Teeth Whitening Myths', 'Patient Testimonial', 'Invisible Aligners 101'],
  'Real Estate': ['Luxury 3BHK Walkthrough', 'Site Progress Update', 'Neighbourhood Guide: OMR', 'Amenities Showcase', 'Home Loan Basics', 'Client Handover Moment', 'Drone View: Project Launch', 'Interior Design Ideas', 'Investor FAQ', 'Sunset at the Rooftop'],
  Education: ['A Day at Our Campus', 'Parent Testimonial', 'Phonics Made Fun', 'Annual Day Highlights', 'Meet the Teachers', 'Admissions Open Teaser', 'STEM Lab Tour', 'Art Corner Showcase'],
  'Retail & E-commerce': ['Unboxing: Flagship Phone', 'Top 5 Gadgets Under ₹5000', 'Smart Home Setup Guide', 'Festive Sale Teaser', 'Laptop Buying Guide', 'Store Walkthrough', 'Customer Review Reel', 'Earbuds Face-off', 'Gaming Setup Tour', 'Exchange Offer Explainer'],
  'Beauty & Wellness': ['Signature Spa Ritual', 'Bridal Glow Package', 'Therapist Tips: Stress Relief', 'Ayurvedic Massage Explained', 'Client Relaxation Diaries', 'Evening Skin Care Routine', 'Couple Spa Experience', 'Wellness Weekend Teaser'],
  FMCG: ['Farm to Pack Journey', 'Organic Recipe Reel', 'Why Cold-Pressed Oil?', 'Product Launch: Millet Mix', 'Meet Our Farmers', 'Healthy Snack Ideas', 'Packaging Sustainability', 'Customer Kitchen Stories'],
  Other: ['Brand Story', 'Behind the Scenes', 'Customer Testimonial', 'Product Spotlight', 'Team Introduction', 'FAQ Reel', 'Offer Announcement', 'Event Highlights'],
};

/* ---------------- Video workflow ---------------- */
// Index into STAGES of the stage the video is currently in (6 = published).
export function stageIdx(v) {
  if (v.post.status === 'Published') return 6;
  if (['Approved', 'Completed'].includes(v.edit.status)) return 5;
  if (['Internal Review', 'Revision Required'].includes(v.edit.status)) return 4;
  if (v.shoot.status === 'Completed') return 3;
  if (v.script.status === 'Approved') return 2;
  if (['Submitted', 'Under Review'].includes(v.script.status)) return 1;
  return 0;
}
export const stageName = (i) => (i >= 6 ? 'Published' : STAGES[i]);

export function stageReady(v, stage) {
  if (stage === 'script') return true;
  if (stage === 'shoot') return v.script.status === 'Approved';
  if (stage === 'edit') return v.shoot.status === 'Completed';
  return ['Approved', 'Completed'].includes(v.edit.status) || v.post.status === 'Published';
}

export const involved = (v, uid) => v.script.writer === uid || (v.shoot.team || []).includes(uid) || v.edit.editor === uid || v.post.smm === uid;
export const myStage = (v, stage, uid) => (stage === 'shoot' ? (v.shoot.team || []).includes(uid) : v[stage][ASSIGNEE[stage]] === uid);
export const stageAssignees = (v, stage) => (stage === 'shoot' ? [...(v.shoot.team || [])] : [v[stage][ASSIGNEE[stage]]].filter(Boolean));
export const stageDue = (v, stage) => ({ script: v.script.deadline, shoot: v.shoot.date, edit: v.edit.deadline, post: v.post.date }[stage]);

// Tasks derived from a video: one per stage.
export function tasksOf(v) {
  const sr = v.script.status === 'Approved';
  const sh = v.shoot.status === 'Completed';
  const ea = ['Approved', 'Completed'].includes(v.edit.status) || v.post.status === 'Published';
  const base = { videoId: v.id, code: v.code, clientId: v.clientId };
  return [
    { ...base, id: `${v.id}:script`, stage: 'script', type: 'Script Writing', title: `Write script — ${v.title}`, who: v.script.writer ? [v.script.writer] : [], due: v.script.deadline, status: v.script.status, done: sr, ready: true, doneAt: v.script.doneAt },
    { ...base, id: `${v.id}:shoot`, stage: 'shoot', type: 'Video Shooting', title: `Shoot — ${v.title}`, who: v.shoot.team || [], due: v.shoot.date, time: v.shoot.time, status: v.shoot.status, done: ['Completed', 'Cancelled'].includes(v.shoot.status), ready: sr, doneAt: v.shoot.doneAt },
    { ...base, id: `${v.id}:edit`, stage: 'edit', type: 'Video Editing', title: `Edit — ${v.title}`, who: v.edit.editor ? [v.edit.editor] : [], due: v.edit.deadline, status: v.edit.status, done: ea, ready: sh, doneAt: v.edit.doneAt },
    { ...base, id: `${v.id}:post`, stage: 'post', type: 'Social Media Posting', title: `Publish — ${v.title}`, who: v.post.smm ? [v.post.smm] : [], due: v.post.date, time: v.post.time, status: v.post.status, done: v.post.status === 'Published', ready: ea, doneAt: v.post.doneAt },
  ];
}
export const generalTask = (t) => ({ id: `t:${t.id}`, taskId: t.id, custom: true, type: 'General Task', title: t.title, who: [t.assignee], due: t.due, status: t.status, done: t.status === 'Completed', ready: true, clientId: t.clientId, recur: t.recur });
export const isOverdue = (t, today = todayS()) => !t.done && t.due < today;
export const videoOverdue = (v, today = todayS()) => tasksOf(v).some((t) => isOverdue(t, today));
export function videoStatus(v, today = todayS()) {
  if (v.post.status === 'Published') return 'Completed';
  if (videoOverdue(v, today)) return 'Overdue';
  if (v.script.status === 'Pending') return 'Not Started';
  return 'In Progress';
}

/**
 * Actions a user may take on one stage of a video.
 * Each action: { label, status?, tone: 'primary'|'ghost'|'warn'|'danger', form?: 'submit'|'revise'|'publish'|'schedule' }
 * `form` means the UI must collect extra input before calling the transition endpoint.
 */
export function stageActions(v, stage, user) {
  const admin = user.role === 'admin';
  const st = v[stage].status;
  const out = [];
  if (!admin && !myStage(v, stage, user.id)) return out;
  const ready = stageReady(v, stage);
  if (!ready && !admin) return out;
  const a = (label, status, tone = 'ghost', form) => out.push({ label, status, tone, form });
  if (stage === 'script') {
    if (st === 'Pending') a('Start writing', 'In Progress');
    if (['In Progress', 'Revision Required'].includes(st) || (st === 'Pending' && !admin)) a('Submit script', 'Submitted', 'primary', 'submit');
    if (admin && st === 'Submitted') a('Start review', 'Under Review');
    if (admin && ['Submitted', 'Under Review'].includes(st)) { a('Approve script', 'Approved', 'primary'); a('Request revision', 'Revision Required', 'warn', 'revise'); }
  }
  if (stage === 'shoot') {
    if (admin && st === 'Upcoming') a('Schedule shoot', 'Scheduled', 'primary', 'schedule');
    if (['Scheduled', 'Rescheduled'].includes(st) && ready) a('Start shoot', 'In Progress', admin ? 'ghost' : 'primary');
    if (st === 'In Progress') a('Mark completed', 'Completed', 'primary');
    if (admin && ['Scheduled', 'Rescheduled', 'In Progress'].includes(st)) a('Reschedule', 'Rescheduled', 'ghost', 'schedule');
    if (admin && !['Completed', 'Cancelled'].includes(st)) a('Cancel shoot', 'Cancelled', 'danger');
    if (admin && st === 'Cancelled') a('Reinstate shoot', 'Scheduled');
  }
  if (stage === 'edit') {
    if (['Pending', 'Assigned', 'Revision Required'].includes(st) && ready) a('Start editing', 'Editing', admin ? 'ghost' : 'primary');
    if (st === 'Editing') a('Submit for review', 'Internal Review', 'primary', 'submit');
    if (admin && st === 'Internal Review') { a('Approve video', 'Approved', 'primary'); a('Request revision', 'Revision Required', 'warn', 'revise'); }
  }
  if (stage === 'post') {
    if (['Draft', 'Pending', 'Failed'].includes(st) && ready) a('Schedule post', 'Scheduled', 'primary', 'schedule');
    if (st === 'Scheduled') { a('Mark published', 'Published', 'primary', 'publish'); a('Mark failed', 'Failed', 'danger'); }
  }
  return out;
}
export const canTransition = (v, stage, status, user) => stageActions(v, stage, user).some((x) => x.status === status);

/**
 * Applies a status change and its knock-on effects to a plain video object (mutates it).
 * Returns the notifications to send: [{ to: userId|'admin', type, text }].
 */
export function applyTransition(v, stage, status, { actor, note, today = todayS() } = {}) {
  const prev = v[stage].status;
  const notes = [];
  const n = (to, type, text) => { if (to && to !== actor?.id) notes.push({ to, type, text, videoId: v.id }); };
  v[stage].status = status;
  if (DONE_ST[stage].includes(status) && !v[stage].doneAt) v[stage].doneAt = today;
  if (!DONE_ST[stage].includes(status) && !(stage === 'edit' && status === 'Completed')) v[stage].doneAt = undefined;
  const t = v.title;
  switch (`${stage}:${status}`) {
    case 'script:Submitted': n('admin', 'Script Approval', `${actor.name} submitted the script for “${t}”`); break;
    case 'script:Approved':
      n(v.script.writer, 'Script Approval', `Your script for “${t}” was approved`);
      if (v.shoot.status === 'Upcoming') v.shoot.status = 'Scheduled';
      v.shoot.team.forEach((s) => n(s, 'Shoot Reminder', `Shoot scheduled ${v.shoot.date} at ${v.shoot.time} — “${t}”`));
      break;
    case 'script:Revision Required': n(v.script.writer, 'Revision Request', `Revision requested on script “${t}”`); break;
    case 'shoot:Completed':
      if (v.edit.status === 'Pending') v.edit.status = 'Assigned';
      n(v.edit.editor, 'New Task Assignment', `Shoot done — edit “${t}” by ${v.edit.deadline}`);
      n('admin', 'Shoot Reminder', `Shoot completed for “${t}”`);
      break;
    case 'shoot:Cancelled': v.shoot.team.forEach((s) => n(s, 'Shoot Reminder', `Shoot cancelled — “${t}”`)); break;
    case 'edit:Internal Review': n('admin', 'Script Approval', `${actor.name} submitted “${t}” for video review`); break;
    case 'edit:Approved':
      if (v.post.status === 'Draft') v.post.status = 'Pending';
      n(v.edit.editor, 'Script Approval', `Your edit of “${t}” was approved`);
      n(v.post.smm, 'New Task Assignment', `“${t}” is approved — publish on ${v.post.date}`);
      break;
    case 'edit:Revision Required': n(v.edit.editor, 'Revision Request', `Revision requested on video “${t}”`); break;
    case 'post:Published': v.edit.status = 'Completed'; n('admin', 'Posting Reminder', `“${t}” is live on ${v.post.platforms.join(', ')}`); break;
    case 'post:Failed': n('admin', 'Posting Reminder', `Publishing failed for “${t}”`); break;
    case 'post:Scheduled': n('admin', 'Posting Reminder', `“${t}” scheduled for ${v.post.date} ${v.post.time}`); break;
    default:
  }
  if (note) {
    v.notes = v.notes || [];
    v.notes.unshift({ by: actor.id, byName: actor.name, stage, kind: /Revision/.test(status) ? 'feedback' : 'note', text: note, at: new Date().toISOString() });
  }
  v.log = v.log || [];
  v.log.unshift({ by: actor.name, text: `${STAGE_LBL[stage]} status: ${prev} → ${status}${note ? ` — “${note}”` : ''}`, at: new Date().toISOString() });
  return notes;
}

/* ---------------- Scheduling ---------------- */
export function shootClash(videos, date, time, team, excludeId) {
  return videos.filter((v) => v.id !== excludeId && !['Cancelled', 'Completed'].includes(v.shoot.status)
    && v.shoot.date === date && v.shoot.time === time && v.shoot.team.some((s) => team.includes(s)));
}
export function freeSlot(videos, date, team, i = 0) {
  for (let k = 0; k < SLOTS.length; k++) { const s = SLOTS[(i + k) % SLOTS.length]; if (!shootClash(videos, date, s, team).length) return s; }
  return SLOTS[i % SLOTS.length];
}
export function scheduleConflicts(videos) {
  const m = {};
  videos.forEach((v) => {
    if (['Cancelled', 'Completed'].includes(v.shoot.status)) return;
    v.shoot.team.forEach((s) => { const k = `${v.shoot.date}|${v.shoot.time}|${s}`; (m[k] = m[k] || []).push(v.id); });
  });
  return Object.entries(m).filter(([, a]) => a.length > 1)
    .map(([k, videoIds]) => { const [date, time, staffId] = k.split('|'); return { date, time, staffId, videoIds }; })
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}
export function orderWarning(v) {
  if (v.shoot.date < v.script.deadline) return 'The shoot is now before the script deadline';
  if (v.edit.deadline < v.shoot.date) return 'The edit deadline is now before the shoot';
  if (v.post.date < v.edit.deadline) return 'The posting date is now before the edit deadline';
  return '';
}

/** Plans the videos of a monthly package. Returns plain video objects without ids. */
export function planPackageVideos({ client, pkg, team, start, span, gaps, existingCodes = [], existingVideos = [] }) {
  const prefix = `VID-${pkg.month.slice(2, 4)}${pkg.month.slice(5, 7)}-${client.code}-`;
  let n = existingCodes.filter((c) => c.startsWith(prefix)).map((c) => +c.slice(-2) || 0).reduce((a, b) => Math.max(a, b), 0);
  const ideas = VIDEO_IDEAS[client.category] || VIDEO_IDEAS.Other;
  const target = +pkg.target;
  span = +span || Math.max(target, 18);
  const planned = [];
  for (let i = 0; i < target; i++) {
    n += 1;
    const sd = addDays(start, Math.round((i * span) / target));
    const shootDate = addDays(sd, +gaps.shoot);
    const shootTeam = [team.videographer, team.camera].filter(Boolean);
    const title = ideas[(n - 1) % ideas.length] + (n > ideas.length ? ` — Part ${Math.ceil(n / ideas.length)}` : '');
    const v = {
      code: prefix + pad(n), title, clientId: client.id, packageId: pkg.id,
      script: { writer: team.writer || '', deadline: sd, status: 'Pending' },
      shoot: { team: shootTeam, date: shootDate, time: freeSlot([...existingVideos, ...planned], shootDate, shootTeam, i), location: client.address || 'In-house studio', instructions: '', status: 'Upcoming' },
      edit: { editor: team.editor || '', deadline: addDays(shootDate, +gaps.edit), status: 'Pending' },
      post: { smm: team.smm || '', date: addDays(shootDate, +gaps.edit + +gaps.post), time: '18:30', platforms: ['Instagram', 'Facebook'], caption: '', hashtags: '', link: '', status: 'Draft' },
      notes: [], log: [{ by: 'System', text: `Workflow generated from “${pkg.name}”`, at: new Date().toISOString() }],
    };
    v.id = `tmp${i}`;
    planned.push(v);
  }
  return planned.map(({ id, ...rest }) => rest);
}

export function clientCode(name, existing) {
  let b = name.replace(/[^A-Za-z ]/g, '').split(/\s+/).filter(Boolean).map((w) => w[0]).join('').toUpperCase();
  if (b.length < 3) b = (b + name.replace(/[^A-Za-z]/g, '').toUpperCase().slice(1)).slice(0, 3);
  b = b.slice(0, 3) || 'CLT';
  let c = b; let i = 2;
  while (existing.includes(c)) c = b.slice(0, 2) + i++;
  return c;
}

/* ---------------- Calendar & analytics ---------------- */
export function deriveEvents({ videos, tasks = [], events = [], clientsById = {} }) {
  const ev = [];
  videos.forEach((v) => {
    const c = clientsById[v.clientId] || {};
    const b = { videoId: v.id, clientId: v.clientId, clientCode: c.code, title: v.title };
    ev.push({ ...b, key: `v|${v.id}|script`, cat: 'Script Writing', date: v.script.deadline, staff: [v.script.writer], status: v.script.status, done: v.script.status === 'Approved', drag: true, label: `Script · ${v.title}` });
    if (['Submitted', 'Under Review'].includes(v.script.status)) ev.push({ ...b, key: '', cat: 'Script Approval', date: addDays(v.script.deadline, 1), staff: [], status: v.script.status, done: false, label: `Approve script · ${v.title}` });
    if (v.shoot.status !== 'Cancelled') ev.push({ ...b, key: `v|${v.id}|shoot`, cat: 'Video Shooting', date: v.shoot.date, time: v.shoot.time, staff: v.shoot.team, status: v.shoot.status, done: v.shoot.status === 'Completed', drag: true, label: `Shoot · ${v.title}` });
    ev.push({ ...b, key: `v|${v.id}|edit`, cat: 'Video Editing', date: v.edit.deadline, staff: [v.edit.editor], status: v.edit.status, done: ['Approved', 'Completed'].includes(v.edit.status) || v.post.status === 'Published', drag: true, label: `Edit · ${v.title}` });
    if (v.edit.status === 'Internal Review') ev.push({ ...b, key: '', cat: 'Video Review', date: addDays(v.edit.deadline, 1), staff: [], status: 'Internal Review', done: false, label: `Review video · ${v.title}` });
    ev.push({ ...b, key: `v|${v.id}|post`, cat: 'Social Media Posting', date: v.post.date, time: v.post.time, staff: [v.post.smm], status: v.post.status, done: v.post.status === 'Published', drag: true, label: `Post · ${v.title}` });
  });
  tasks.forEach((t) => ev.push({ key: `t|${t.id}`, taskId: t.id, kind: 'task', cat: 'General Task', date: t.due, staff: [t.assignee], clientId: t.clientId, status: t.status, done: t.status === 'Completed', drag: true, label: t.title, title: t.title }));
  events.forEach((e) => ev.push({ key: `e|${e.id}`, eventId: e.id, kind: 'event', cat: e.category, date: e.date, time: e.time, staff: e.staff || [], clientId: e.clientId, status: '', done: false, drag: true, label: e.title, title: e.title }));
  return ev;
}

export function workload(staff, tasks, today = todayS()) {
  return staff.filter((s) => s.status !== 'Inactive').map((s) => {
    const mine = tasks.filter((t) => t.who.includes(s.id));
    const done = mine.filter((t) => t.done);
    const onTime = done.filter((t) => !t.doneAt || t.doneAt <= t.due).length;
    return {
      staff: s, total: mine.length, done: done.length,
      active: mine.filter((t) => !t.done && t.ready).length,
      waiting: mine.filter((t) => !t.done && !t.ready).length,
      overdue: mine.filter((t) => isOverdue(t, today)).length,
      week: mine.filter((t) => !t.done && t.due >= today && t.due <= addDays(today, 6)).length,
      onTimeRate: done.length ? Math.round((onTime / done.length) * 100) : 0,
    };
  });
}

export function reminders(tasks, forId, today = todayS()) {
  const tomorrow = addDays(today, 1);
  const out = [];
  tasks.forEach((t) => {
    if (t.done) return;
    if (forId !== 'admin' && !t.who.includes(forId)) return;
    if (t.due < today) out.push({ type: 'Overdue Task', text: t.title, sub: `Overdue since ${t.due}`, videoId: t.videoId, taskId: t.taskId, due: t.due, overdue: true });
    else if ((t.due === today || t.due === tomorrow) && t.ready) {
      const type = { 'Video Shooting': 'Shoot Reminder', 'Video Editing': 'Editing Reminder', 'Social Media Posting': 'Posting Reminder' }[t.type] || 'Upcoming Deadline';
      out.push({ type, text: t.title, sub: (t.due === today ? 'Due today' : 'Due tomorrow') + (t.time ? ` · ${t.time}` : ''), videoId: t.videoId, taskId: t.taskId, due: t.due });
    }
  });
  return out.sort((a, b) => (b.overdue ? 1 : 0) - (a.overdue ? 1 : 0) || (a.due < b.due ? -1 : 1));
}
