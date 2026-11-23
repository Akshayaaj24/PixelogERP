import { Router } from 'express'
import Client from '../models/Client.js'
import Work from '../models/Work.js'
import User, { roleOf } from '../models/User.js'
import { managerOnly } from '../middleware/auth.js'
import { involving, stepState, PERSON_KEYS, STATUS_LABEL, STAGE_LABEL } from '../utils/work.js'
import { claude, textOf, brandContext, AGENCY, WRITER_MODEL, ASSISTANT_MODEL } from '../utils/claude.js'
import { dayStart, currentMonth, monthRange } from '../utils/time.js'

const r = Router()

// ─────────────────────────────────────────────────────────────
// 1. Writing helpers: ideas / script / caption / hashtags
//    POST /api/ai/reel  { clientId, field, title, idea, script, caption }
//    (members: only for clients they have work for)
// ─────────────────────────────────────────────────────────────
const TASKS = {
  ideas: (b) => `Suggest 3 different Reel ideas${b.title ? ` for a reel titled "${b.title}"` : ''}. For each: a short title and 1–2 lines on what is shown. Number them 1–3. No intro text.`,
  script: (b) => `Write a Reel script${b.title ? ` for "${b.title}"` : ''}.${b.idea ? `\nIdea: ${b.idea}` : ''}${b.script ? `\nImprove this draft instead of starting over:\n${b.script}` : ''}
Format exactly:
HOOK (0–3s): …
SCENES:
1. [shot] – [on-screen text / voice]
…
ENDING + CTA: …
Keep it shootable by a small team with a phone. No intro text.`,
  caption: (b) => `Write one Instagram caption for this ${b.type === 'poster' ? 'poster post' : 'Reel'}${b.title ? ` "${b.title}"` : ''}.${b.idea ? `\nIdea: ${b.idea}` : ''}${b.script ? `\nScript:\n${b.script}` : ''}
2–4 short lines, 1–3 fitting emojis, end with a clear call to action. No hashtags. Output only the caption.`,
  hashtags: (b) => `Give 12–15 Instagram hashtags for this ${b.type === 'poster' ? 'poster post' : 'Reel'}${b.title ? ` "${b.title}"` : ''}.${b.caption ? `\nCaption: ${b.caption}` : ''}
Mix: a few broad, mostly niche and local (Tamil Nadu / the client's town if known). Output only the hashtags on one line, separated by spaces.`,
}

r.post('/reel', async (req, res) => {
  const { clientId, field } = req.body
  if (!TASKS[field]) return res.status(400).json({ message: 'Unknown AI action' })
  const c = await Client.findById(clientId)
  if (!c) return res.status(400).json({ message: 'Select a client first' })
  if (!req.canManage && !(await Work.exists({ client: c._id, ...involving(req.user._id) }))) return res.status(403).json({ message: 'Not your client' })

  const msg = await claude().messages.create({
    model: WRITER_MODEL,
    max_tokens: 1200,
    system: `${AGENCY}\n\n${brandContext(c)}`,
    messages: [{ role: 'user', content: TASKS[field](req.body) }],
  })
  res.json({ text: textOf(msg) })
})

// ─────────────────────────────────────────────────────────────
// 2. Plan a month of reels for one client (admin)
//    POST /api/ai/plan { clientId, month: "2026-12", count }
// ─────────────────────────────────────────────────────────────
const PLAN_SCHEMA = {
  type: 'object',
  properties: {
    reels: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          day: { type: 'integer', description: 'Day of the month to post' },
          title: { type: 'string' },
          idea: { type: 'string', description: 'One or two lines on what the reel shows' },
        },
        required: ['day', 'title', 'idea'],
        additionalProperties: false,
      },
    },
  },
  required: ['reels'],
  additionalProperties: false,
}

r.post('/plan', managerOnly, async (req, res) => {
  const c = await Client.findById(req.body.clientId)
  if (!c) return res.status(400).json({ message: 'Select a client first' })
  const month = req.body.month || currentMonth()
  const count = Math.min(Math.max(Number(req.body.count) || c.reelsPerMonth || 8, 1), 31)
  const { start, end } = monthRange(month)
  const days = Math.round((end - start) / 864e5)
  const existing = await Work.find({ client: c._id, type: 'reel', date: { $gte: start, $lt: end } }).select('title').lean()

  const msg = await claude().messages.create({
    model: WRITER_MODEL,
    max_tokens: 4000,
    system: `${AGENCY}\n\n${brandContext(c)}`,
    messages: [{
      role: 'user',
      content: `Plan ${count} Instagram Reels for ${month} (${days} days in the month).
Spread them evenly across the month. Use festivals, seasons and occasions in Tamil Nadu that fall in this month where they fit the business. Mix formats (product showcase, behind the scenes, customer story, tips, offers only if the brand notes mention them).
${existing.length ? `Already planned this month, don't repeat: ${existing.map((x) => x.title).join('; ')}` : ''}
Titles in ${c.language || 'English'}; keep each title under 8 words.`,
    }],
    output_config: { format: { type: 'json_schema', schema: PLAN_SCHEMA } },
  })

  let reels = []
  try { reels = JSON.parse(textOf(msg)).reels ?? [] } catch { return res.status(502).json({ message: 'AI returned an unexpected answer, please try again' }) }
  const [y, m] = month.split('-').map(Number)
  res.json({
    month,
    reels: reels
      .filter((x) => x.day >= 1 && x.day <= days)
      .sort((a, b) => a.day - b.day)
      .map((x) => ({ ...x, date: `${y}-${String(m).padStart(2, '0')}-${String(x.day).padStart(2, '0')}` })),
  })
})

// ─────────────────────────────────────────────────────────────
// 3. Ask AI — answers questions from real ERP data.
//    Claude only READS through these tools, with the logged-in
//    user's permissions. It cannot change anything.
//    POST /api/ai/ask { messages: [{ role, content }] }
// ─────────────────────────────────────────────────────────────
const fmt = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short' }) : null)
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

async function findUserId(name) {
  if (!name) return undefined
  const u = await User.findOne({ name: new RegExp(escape(name), 'i') }).select('_id')
  return u?._id ?? null
}

const TOOLS = [
  {
    name: 'list_work',
    description: 'List calendar work items (reels, posters, website, ads, other) with client, date, current stage, status and people. Reels go Script → Shoot → Editing. Statuses: start, processing, waiting (= waiting for approval), approved, done.',
    input_schema: {
      type: 'object',
      properties: {
        from: { type: 'string', description: 'Start date YYYY-MM-DD (inclusive)' },
        to: { type: 'string', description: 'End date YYYY-MM-DD (inclusive)' },
        statuses: { type: 'array', items: { type: 'string', enum: ['start', 'processing', 'waiting', 'approved', 'done'] } },
        not_done: { type: 'boolean', description: 'Only work that is not done' },
        overdue: { type: 'boolean', description: 'Only work past its date and not done' },
        type: { type: 'string', enum: ['reel', 'poster', 'website', 'ads', 'other'] },
        client: { type: 'string', description: 'Client or business name (partial match)' },
        person: { type: 'string', description: 'Team member name' },
      },
    },
  },
  {
    name: 'list_clients',
    description: 'Manager/admin only. Clients with business name, services, status, reels and posters per month, website status.',
    input_schema: { type: 'object', properties: { status: { type: 'string', enum: ['active', 'inactive', 'all'] } } },
  },
  {
    name: 'team_workload',
    description: 'Manager/admin only. Each team member with open work now, due today, overdue and waiting for approval.',
    input_schema: { type: 'object', properties: {} },
  },
]

async function runTool(name, input, req) {
  if (name === 'list_work') {
    const and = []
    const q = {}
    if (input.from || input.to) q.date = { ...(input.from && { $gte: new Date(input.from) }), ...(input.to && { $lte: new Date(`${input.to}T23:59:59Z`) }) }
    if (input.statuses?.length) q.status = { $in: input.statuses }
    if (input.not_done || input.overdue) q.status = { $ne: 'done' }
    if (input.overdue) q.date = { ...(q.date || {}), $lt: dayStart(0) }
    if (input.type) q.type = input.type
    if (input.client) {
      const re = new RegExp(escape(input.client), 'i')
      const ids = await Client.find({ $or: [{ name: re }, { businessName: re }] }).distinct('_id')
      if (!ids.length) return { error: `No client matching "${input.client}"` }
      q.client = { $in: ids }
    }
    const pid = !req.canManage ? req.user._id : await findUserId(input.person)
    if (pid === null) return { error: `No team member matching "${input.person}"` }
    if (pid) and.push(involving(pid))
    const list = await Work.find(and.length ? { ...q, $and: and } : q).populate('client', 'name businessName').populate(PERSON_KEYS.map((k) => `people.${k}`).join(' '), 'name').sort({ date: 1 }).limit(80).lean()
    return list.map((w) => ({
      client: w.client?.businessName || w.client?.name, type: w.type, title: w.title, date: fmt(w.date), time: w.time,
      stage: STAGE_LABEL[w.stage], status: STATUS_LABEL[w.status], doing_now: w.people?.[w.stage]?.name,
      ...(w.type === 'reel' && { writer: w.people?.script?.name, shoot: w.people?.shoot?.name, editor: w.people?.editing?.name }),
      ...(!req.canManage && { my_part: stepState(w, req.user._id) }),
      ...(w.changeNote && w.status !== 'done' && { changes_requested: w.changeNote }),
    }))
  }
  if (name === 'list_clients') {
    if (!req.canManage) return { error: 'Only the manager or admin can list clients' }
    const q = input.status && input.status !== 'all' ? { status: input.status } : {}
    const list = await Client.find(q).sort({ name: 1 }).lean()
    return list.map((c) => ({ name: c.name, business: c.businessName, services: c.services, status: c.status, reelsPerMonth: c.reelsPerMonth, postersPerMonth: c.postersPerMonth, website: c.websiteStatus, ...(req.isAdmin && { monthlyPackage: c.monthlyPackage }) }))
  }
  if (name === 'team_workload') {
    if (!req.canManage) return { error: 'Only the manager or admin can see team workload' }
    const today = dayStart(0), tomorrow = dayStart(1)
    const users = (await User.find({ active: true }).lean()).filter((u) => roleOf(u) === 'member')
    return Promise.all(users.map(async (u) => {
      const current = { $or: PERSON_KEYS.map((k) => ({ stage: k, [`people.${k}`]: u._id })) }
      const open = { ...current, status: { $in: ['start', 'processing'] } }
      return {
        name: u.name, designation: u.designation,
        openNow: await Work.countDocuments(open),
        dueToday: await Work.countDocuments({ ...open, date: { $gte: today, $lt: tomorrow } }),
        overdue: await Work.countDocuments({ ...open, date: { $lt: today } }),
        waitingApproval: await Work.countDocuments({ ...current, status: 'waiting' }),
      }
    }))
  }
  return { error: 'Unknown tool' }
}

r.post('/ask', async (req, res) => {
  const history = (Array.isArray(req.body.messages) ? req.body.messages : [])
    .filter((m) => ['user', 'assistant'].includes(m.role) && typeof m.content === 'string' && m.content.trim())
    .slice(-12)
  if (!history.length || history.at(-1).role !== 'user') return res.status(400).json({ message: 'Ask a question' })

  const today = new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const isoToday = new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10)
  const system = `You are the assistant inside PIXELOG ERP, the internal system of a small digital marketing agency in Tamil Nadu.
Today is ${today} (${isoToday}), Indian time.
You are talking to ${req.user.name} (${req.isAdmin ? 'admin — can see the whole company, including money' : req.canManage ? 'manager — runs the daily work, cannot see package amounts or payments' : `team member (${req.user.designation || 'member'}) — tools only return their own work`}).
Answer only from tool results — never guess numbers or names. If something isn't in the data, say so.
You can only read data; you cannot create, change or post anything. If asked to, explain where in the ERP they can do it (Calendar, Clients, Team).
Keep answers short and scannable: a one-line summary, then a short list. Use dates like "Mon, 24 Nov". Reply in the language the user writes in (English, Tamil or Tanglish).`

  const messages = history.map((m) => ({ role: m.role, content: m.content }))
  const ai = claude()
  for (let step = 0; step < 6; step++) {
    const msg = await ai.messages.create({ model: ASSISTANT_MODEL, max_tokens: 1500, system, tools: TOOLS, messages })
    if (msg.stop_reason !== 'tool_use') return res.json({ answer: textOf(msg) || 'Sorry, I could not find an answer.' })

    messages.push({ role: 'assistant', content: msg.content })
    const results = []
    for (const block of msg.content.filter((b) => b.type === 'tool_use')) {
      let out
      try { out = await runTool(block.name, block.input ?? {}, req) } catch (e) { out = { error: e.message } }
      results.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(out) })
    }
    messages.push({ role: 'user', content: results })
  }
  res.json({ answer: 'That needed too many steps — please ask a narrower question.' })
})

export default r
