import { Router } from 'express'
import Work from '../models/Work.js'
import Client from '../models/Client.js'
import { managerOnly } from '../middleware/auth.js'
import { log } from '../utils/log.js'
import { autofillPeople, currentAssignee, involving, stagesFor, stepState, STAGE_LABEL, PERSON_KEYS } from '../utils/work.js'

const r = Router()
const PEOPLE = PERSON_KEYS.map((k) => `people.${k}`).join(' ')
const pop = (q) => q.populate('client', 'name businessName logo instagram brandNotes language').populate(PEOPLE, 'name photo designation')
const same = (a, b) => a && b && String(a._id ?? a) === String(b._id ?? b)
const label = (w) => `"${w.title}" (${w.client?.name ?? 'client'})`

// What a member is allowed to see/edit
const withState = (w, req) => {
  const o = w.toObject ? w.toObject() : w
  if (!req.canManage) o.myState = stepState(o, req.user._id)
  return o
}

r.get('/', async (req, res) => {
  const { from, to, client, type, person, status } = req.query
  const q = {}
  if (from || to) q.date = { ...(from && { $gte: new Date(from) }), ...(to && { $lte: new Date(to) }) }
  if (client) q.client = client
  if (type) q.type = type
  if (status) q.status = status
  const who = req.canManage ? person : req.user._id // members only see their own work
  if (who) Object.assign(q, involving(who))
  const list = await pop(Work.find(q)).sort({ date: 1, time: 1 })
  res.json(list.map((w) => withState(w, req)))
})

r.get('/:id', async (req, res) => {
  const w = await pop(Work.findById(req.params.id))
  if (!w) return res.status(404).json({ message: 'Not found' })
  if (!req.canManage && !stepState(w, req.user._id)) return res.status(403).json({ message: 'Not your work' })
  res.json(withState(w, req))
})

// Create (manager/admin). People are auto-filled from the client's team.
r.post('/', managerOnly, async (req, res) => {
  const client = await Client.findById(req.body.client)
  if (!client) return res.status(400).json({ message: 'Select a client' })
  const type = req.body.type || 'reel'
  const people = autofillPeople(type, client.team?.toObject?.() ?? client.team ?? {}, clean(req.body.people))
  const w = await Work.create({ ...req.body, type, people, stage: req.body.stage || stagesFor(type)[0], status: req.body.status || 'start', createdBy: req.user._id })
  await w.populate('client', 'name')
  log(req.user, `assigned ${w.type} ${label(w)}`, [currentAssignee(w)])
  res.status(201).json(withState(await pop(Work.findById(w._id)), req))
})

// Edit. Manager: everything. Member: script / caption / hashtags on their own work.
r.put('/:id', async (req, res) => {
  const w = await Work.findById(req.params.id).populate('client', 'name')
  if (!w) return res.status(404).json({ message: 'Not found' })
  let body = req.body
  if (!req.canManage) {
    if (!stepState(w, req.user._id)) return res.status(403).json({ message: 'Not your work' })
    body = Object.fromEntries(Object.entries(body).filter(([k]) => ['script', 'caption', 'hashtags'].includes(k)))
  } else {
    if (body.people) body.people = clean(body.people)
    if (body.type && !stagesFor(body.type).includes(body.stage ?? w.stage)) body.stage = stagesFor(body.type)[0]
  }
  const before = String(currentAssignee(w) ?? '')
  Object.assign(w, body)
  if (w.status === 'done' && !w.doneAt) w.doneAt = new Date()
  if (w.status !== 'done') w.doneAt = undefined
  await w.save()
  if (req.canManage && String(currentAssignee(w) ?? '') !== before) log(req.user, `assigned ${label(w)} – ${STAGE_LABEL[w.stage]}`, [currentAssignee(w)])
  res.json(withState(await pop(Work.findById(w._id)), req))
})

// Status buttons
//  member : start → processing → (submit) waiting
//  manager: approve, changes (back to processing with a note), next (next reel stage), done, reopen
r.post('/:id/action', async (req, res) => {
  const w = await Work.findById(req.params.id).populate('client', 'name')
  if (!w) return res.status(404).json({ message: 'Not found' })
  const { action, note } = req.body
  const mineNow = same(currentAssignee(w), req.user._id)
  const stages = stagesFor(w.type)
  const isLast = w.stage === stages.at(-1)
  const deny = (m) => res.status(400).json({ message: m })

  if (action === 'start' || action === 'submit') {
    if (!mineNow && !req.canManage) return res.status(403).json({ message: 'This step is not assigned to you' })
    if (action === 'start') {
      if (w.status !== 'start') return deny('Already started')
      w.status = 'processing'
    } else {
      if (!['start', 'processing'].includes(w.status)) return deny('Already submitted')
      w.status = 'waiting'; w.submittedAt = new Date(); w.changeNote = ''
      log(req.user, `submitted ${label(w)} – ${STAGE_LABEL[w.stage]} for approval`)
    }
  } else {
    if (!req.canManage) return res.status(403).json({ message: 'Only the manager can do this' })
    if (action === 'approve') {
      if (w.status !== 'waiting') return deny('Nothing to approve')
      w.status = 'approved'
      log(req.user, `approved ${label(w)} – ${STAGE_LABEL[w.stage]}`, [currentAssignee(w)])
    } else if (action === 'changes') {
      if (!note?.trim()) return deny('Write what needs to change')
      w.status = 'processing'; w.changeNote = note.trim()
      log(req.user, `asked for changes on ${label(w)}: ${note.trim()}`, [currentAssignee(w)])
    } else if (action === 'next') {
      if (isLast) return deny('This is the last stage')
      w.stage = stages[stages.indexOf(w.stage) + 1]; w.status = 'start'; w.changeNote = ''
      log(req.user, `moved ${label(w)} to ${STAGE_LABEL[w.stage]}`, [currentAssignee(w)])
    } else if (action === 'done') {
      w.stage = stages.at(-1); w.status = 'done'; w.doneAt = new Date()
      log(req.user, `marked ${label(w)} as done ✓`, PERSON_KEYS.map((k) => w.people?.[k]))
    } else if (action === 'reopen') {
      w.status = 'approved'; w.doneAt = undefined
    } else return deny('Unknown action')
  }
  await w.save()
  res.json(withState(await pop(Work.findById(w._id)), req))
})

r.delete('/:id', managerOnly, async (req, res) => {
  await Work.findByIdAndDelete(req.params.id)
  res.json({ ok: true })
})

// "" → null so a person can be un-assigned
function clean(people = {}) {
  return Object.fromEntries(PERSON_KEYS.filter((k) => k in people).map((k) => [k, people[k] || null]))
}

export default r
