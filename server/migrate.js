// One-time upgrade from v1 (reels + tasks) to v2 (one calendar of work items).
//   npm run migrate
// Safe to run more than once — it skips items already moved.
import 'dotenv/config'
import mongoose from 'mongoose'
import User from './models/User.js'
import Client from './models/Client.js'
import Reel from './models/Reel.js'
import Task from './models/Task.js'
import Work from './models/Work.js'

await mongoose.connect(process.env.MONGO_URI)

// 1. "employee" → "member"
const r1 = await User.updateMany({ role: 'employee' }, { role: 'member' })
console.log(`Users: ${r1.modifiedCount} employee → member`)

// 2. Client status: paused/ended → inactive; old service names → new
const r2 = await Client.updateMany({ status: { $in: ['paused', 'ended'] } }, { status: 'inactive' })
const SERVICE_MAP = { 'Instagram Reels': 'Digital Marketing', 'Instagram Ads': 'Meta Ads', 'Website Development': 'Website', 'Script Writing': 'Video Production', 'Video Editing': 'Video Production' }
for (const c of await Client.find()) {
  const s = [...new Set((c.services || []).map((x) => SERVICE_MAP[x] || x))]
  if (JSON.stringify(s) !== JSON.stringify(c.services)) { c.services = s; await c.save() }
}
console.log(`Clients: ${r2.modifiedCount} set to inactive, services renamed`)

// 3. Reels → work items
const REEL = {
  idea: ['script', 'start'], script: ['script', 'processing'], shoot: ['shoot', 'start'], editing: ['editing', 'processing'],
  sent_to_owner: ['editing', 'waiting'], sent_to_client: ['editing', 'approved'], approved: ['editing', 'approved'], posted: ['editing', 'done'],
}
let reels = 0
for (const r of await Reel.find().lean()) {
  if (await Work.exists({ _id: r._id })) continue
  const [stage, status] = REEL[r.stage] || ['script', 'start']
  await Work.create({
    _id: r._id, client: r.client, type: 'reel', title: r.title, date: r.postDate, time: r.postTime, stage, status,
    people: { script: r.scriptWriter, editing: r.editor }, idea: r.idea, script: r.script, caption: r.caption, hashtags: r.hashtags,
    notes: r.notes, createdBy: r.createdBy, doneAt: status === 'done' ? r.updatedAt : undefined,
  })
  reels++
}

// 4. Tasks with a client → work items (tasks without a client are skipped)
const TYPE = { 'Website Development': 'website', 'Instagram Ads': 'ads' }
const STATUS = { todo: 'start', in_progress: 'processing', review: 'waiting', revision: 'processing', on_hold: 'start', done: 'done' }
let tasks = 0, skipped = 0
for (const t of await Task.find().lean()) {
  if (await Work.exists({ _id: t._id })) continue
  if (!t.client) { skipped++; continue }
  await Work.create({
    _id: t._id, client: t.client, type: TYPE[t.category] || 'other', title: t.title, date: t.dueDate || t.createdAt,
    stage: 'work', status: STATUS[t.status] || 'start', people: { work: t.assignedTo },
    notes: [t.description, ...(t.comments || []).map((c) => `• ${c.text}`)].filter(Boolean).join('\n'),
    createdBy: t.createdBy, doneAt: t.completedAt,
  })
  tasks++
}
console.log(`Calendar: ${reels} reels and ${tasks} tasks moved${skipped ? `, ${skipped} tasks without a client skipped` : ''}`)
console.log('Done ✓  Make one user a manager in Team → edit → Access: Manager')
await mongoose.disconnect()
