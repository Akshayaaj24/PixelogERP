import { Router } from 'express'
import Reel, { STAGES } from '../models/Reel.js'
import { adminOnly } from '../middleware/auth.js'
import { log } from '../utils/log.js'

const r = Router()
const LABEL = { idea: 'Idea', script: 'Script', shoot: 'Shoot', editing: 'Editing', sent_to_owner: 'Sent to Owner', sent_to_client: 'Sent to Client', approved: 'Approved', posted: 'Posted' }
// Employees can move a reel up to "Sent to Owner". Owner/admin does the rest.
const EMPLOYEE_STAGES = STAGES.slice(0, STAGES.indexOf('sent_to_owner') + 1)
const EMPLOYEE_FIELDS = ['stage', 'script', 'caption', 'hashtags', 'notes']
const pop = (q) => q.populate('client', 'name').populate('scriptWriter editor', 'name')

const isMine = (reel, user) => [reel.scriptWriter, reel.editor].some((id) => id && String(id._id ?? id) === String(user._id))

r.get('/', async (req, res) => {
  const { from, to, client, stage, person } = req.query
  const q = {}
  if (from || to) q.postDate = { ...(from && { $gte: new Date(from) }), ...(to && { $lte: new Date(to) }) }
  if (client) q.client = client
  if (stage) q.stage = stage
  const who = req.isAdmin ? person : req.user._id // employees only see their reels
  if (who) q.$or = [{ scriptWriter: who }, { editor: who }]
  res.json(await pop(Reel.find(q)).sort({ postDate: 1, postTime: 1 }))
})

r.post('/', adminOnly, async (req, res) => {
  const reel = await Reel.create({ ...req.body, createdBy: req.user._id })
  await reel.populate('client', 'name')
  log(req.user, `planned reel "${reel.title}" for ${reel.client.name}`, [reel.scriptWriter, reel.editor])
  res.status(201).json(await pop(Reel.findById(reel._id)))
})

r.put('/:id', async (req, res) => {
  const reel = await Reel.findById(req.params.id).populate('client', 'name')
  if (!reel) return res.status(404).json({ message: 'Reel not found' })

  let body = req.body
  if (!req.isAdmin) {
    if (!isMine(reel, req.user)) return res.status(403).json({ message: 'Not your reel' })
    body = Object.fromEntries(Object.entries(body).filter(([k]) => EMPLOYEE_FIELDS.includes(k)))
    if (body.stage && !EMPLOYEE_STAGES.includes(body.stage)) return res.status(403).json({ message: 'Only the owner can move it to this stage' })
  }

  const oldStage = reel.stage
  Object.assign(reel, body)
  await reel.save()

  if (body.stage && body.stage !== oldStage) {
    // Tell the next person + admins
    const next = body.stage === 'shoot' || body.stage === 'editing' ? reel.editor : body.stage === 'script' ? reel.scriptWriter : null
    log(req.user, `moved "${reel.title}" (${reel.client.name}) to ${LABEL[body.stage]}`, [next, reel.scriptWriter, reel.editor])
  }
  res.json(await pop(Reel.findById(reel._id)))
})

r.delete('/:id', adminOnly, async (req, res) => {
  await Reel.findByIdAndDelete(req.params.id)
  res.json({ ok: true })
})

export default r
