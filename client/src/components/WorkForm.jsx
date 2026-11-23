import { useState } from 'react'
import { Sparkles, Copy, ExternalLink, Play, Send, Check, RotateCcw, ArrowRight, AlertTriangle } from 'lucide-react'
import { useAuth } from '../context/Auth'
import { del, post, put } from '../lib/api'
import { TYPES, STATUSES, stagesFor, STAGE_LABEL, PERSON_LABEL, WORK_PERSON_LABEL, toInputDate, fmtFull, fmtTime, stepState, clientName } from '../lib/constants'
import { StatusBadge, TypeTag } from './StatusBadge'
import { Avatar, Button, ClientLogo, ErrorBox, Field, Input, Modal, Select, Textarea } from './ui'

function AiButton({ label, busy, onClick }) {
  return (
    <button type="button" onClick={onClick} disabled={busy} className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium text-brand hover:bg-blue-50 disabled:opacity-60">
      <Sparkles size={13} /> {busy ? 'Writing…' : label}
    </button>
  )
}
function Label({ text, ai, copy }) {
  return (
    <span className="mb-1 flex items-center justify-between">
      <span className="text-xs font-medium text-slate-600">{text}</span>
      <span className="flex items-center gap-1">
        {copy && <button type="button" onClick={() => navigator.clipboard?.writeText(copy)} className="rounded-md p-1 text-slate-400 hover:bg-slate-100" title="Copy"><Copy size={13} /></button>}
        {ai}
      </span>
    </span>
  )
}
const personLabel = (type, stage) => (type === 'reel' ? PERSON_LABEL[stage] : WORK_PERSON_LABEL[type])
const idOf = (x) => x?._id ?? x ?? ''

export default function WorkForm({ work, clients = [], users = [], defaults = {}, onClose, onSaved }) {
  const { user, canManage } = useAuth()
  const [w, setW] = useState(work) // latest saved version (actions update it)
  const [f, setF] = useState(() => ({
    client: idOf(work?.client) || defaults.client || '',
    type: work?.type ?? defaults.type ?? 'reel',
    title: work?.title ?? '',
    date: toInputDate(work?.date ?? defaults.date ?? new Date()),
    time: work?.time ?? (defaults.type && defaults.type !== 'reel' ? '' : '18:00'),
    stage: work?.stage ?? 'script',
    status: work?.status ?? 'start',
    people: Object.fromEntries(['script', 'shoot', 'editing', 'work'].map((k) => [k, idOf(work?.people?.[k])])),
    idea: work?.idea ?? '', script: work?.script ?? '', caption: work?.caption ?? '', hashtags: work?.hashtags ?? '', notes: work?.notes ?? '',
  }))
  const [error, setError] = useState('')
  const [aiBusy, setAiBusy] = useState('')
  const [busy, setBusy] = useState(false)
  const [changes, setChanges] = useState(null) // note text while asking for changes
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const setPerson = (k) => (e) => setF({ ...f, people: { ...f.people, [k]: e.target.value } })

  const stages = stagesFor(f.type)
  const myState = w ? stepState(w, user._id) : null
  const mineNow = w && idOf(w.people?.[w.stage]) === String(user._id)

  // New work: fill people from the client's team
  const pickClient = (id) => {
    const c = clients.find((x) => x._id === id)
    setF((cur) => ({ ...cur, client: id, people: w ? cur.people : fillFromTeam(cur.type, c?.team) }))
  }
  const pickType = (type) => {
    const c = clients.find((x) => x._id === f.client)
    setF((cur) => ({ ...cur, type, stage: stagesFor(type)[0], time: type === 'reel' ? cur.time || '18:00' : cur.time, people: w ? cur.people : fillFromTeam(type, c?.team) }))
  }

  const askAI = async (field) => {
    if (!f.client) return setError('Select a client first — AI uses their brand notes')
    setAiBusy(field); setError('')
    try {
      const { text } = await post('/ai/reel', { clientId: f.client, field, type: f.type, title: f.title, idea: f.idea, script: f.script, caption: f.caption })
      setF((cur) => ({ ...cur, [field === 'ideas' ? 'idea' : field]: text }))
    } catch (e) { setError(e.message) } finally { setAiBusy('') }
  }
  const ai = (field, label) => <AiButton label={label} busy={aiBusy === field} onClick={() => askAI(field)} />

  const save = async () => {
    setError('')
    if (canManage && (!f.client || !f.title.trim() || !f.date)) return setError('Client, title and date are required')
    setBusy(true)
    try {
      const body = canManage ? f : { script: f.script, caption: f.caption, hashtags: f.hashtags }
      onSaved(w ? await put(`/works/${w._id}`, body) : await post('/works', body))
    } catch (e) { setError(e.message); setBusy(false) }
  }
  const action = async (name, note) => {
    setBusy(true); setError('')
    try {
      // save text first so nothing typed is lost
      if (w && (f.script !== w.script || f.caption !== w.caption || f.hashtags !== w.hashtags)) await put(`/works/${w._id}`, { script: f.script, caption: f.caption, hashtags: f.hashtags })
      const updated = await post(`/works/${w._id}/action`, { action: name, note })
      setW(updated); setF((cur) => ({ ...cur, stage: updated.stage, status: updated.status })); setChanges(null)
      onSaved(updated, true)
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  const remove = async () => {
    if (!window.confirm('Delete this work?')) return
    await del(`/works/${w._id}`); onSaved(null)
  }

  // ── Buttons by role and status ──
  let actions = null
  if (w && canManage) {
    const last = w.stage === stagesFor(w.type).at(-1)
    actions = (
      <div className="flex flex-wrap gap-2">
        {w.status === 'waiting' && <><Button variant="outline" onClick={() => setChanges('')} disabled={busy}><RotateCcw size={15} /> Changes needed</Button><Button onClick={() => action('approve')} disabled={busy}><Check size={15} /> Approve</Button></>}
        {w.status === 'approved' && !last && <Button onClick={() => action('next')} disabled={busy}>Move to {STAGE_LABEL[stagesFor(w.type)[stagesFor(w.type).indexOf(w.stage) + 1]]} <ArrowRight size={15} /></Button>}
        {w.status === 'approved' && last && <Button variant="dark" onClick={() => action('done')} disabled={busy}><Check size={15} /> Mark Done</Button>}
        {['start', 'processing'].includes(w.status) && <span className="self-center text-sm text-slate-500">With {w.people?.[w.stage]?.name ?? 'nobody'} · {STAGE_LABEL[w.stage]}</span>}
        {w.status === 'done' && <Button variant="outline" onClick={() => action('reopen')} disabled={busy}>Reopen</Button>}
      </div>
    )
  } else if (w && mineNow) {
    actions = (
      <div className="flex flex-wrap items-center gap-2">
        {w.status === 'start' && <Button onClick={() => action('start')} disabled={busy}><Play size={15} /> Start</Button>}
        {w.status === 'processing' && <Button onClick={() => action('submit')} disabled={busy}><Send size={15} /> Submit for approval</Button>}
        {w.status === 'waiting' && <span className="text-sm font-medium text-amber-700">⏳ Waiting for manager</span>}
        {w.status === 'approved' && <span className="text-sm font-medium text-emerald-700">✓ Approved</span>}
      </div>
    )
  } else if (w && myState) {
    actions = <span className="text-sm text-slate-500">{myState === 'done' ? '✓ Your part is done' : `Waiting for ${STAGE_LABEL[w.stage]} (${w.people?.[w.stage]?.name ?? '—'})`}</span>
  }

  const writer = canManage || (myState && (f.type !== 'reel' || ['script', 'editing'].some((s) => idOf(w?.people?.[s]) === String(user._id))))

  return (
    <Modal title={w ? w.title : 'New work'} onClose={onClose} wide
      footer={<>
        {canManage && w && <Button variant="danger" className="mr-auto" onClick={remove}>Delete</Button>}
        <Button variant="outline" onClick={onClose}>Close</Button>
        {(canManage || writer) && <Button onClick={save} disabled={busy}>Save</Button>}
      </>}>

      {/* Status + action bar */}
      {w && (
        <div className="mb-5 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <TypeTag work={w} /><StatusBadge status={w.status} />
            {w.type === 'reel' && (
              <span className="ml-auto flex items-center gap-1 text-xs text-slate-400">
                {stagesFor('reel').map((s, i) => <span key={s} className={s === w.stage ? 'font-semibold text-slate-900' : ''}>{i > 0 && '→ '}{STAGE_LABEL[s]}</span>)}
              </span>
            )}
          </div>
          {w.changeNote && w.status !== 'done' && (
            <p className="flex items-start gap-2 rounded-lg bg-pink-50 px-3 py-2 text-sm text-pink-800"><AlertTriangle size={15} className="mt-0.5 shrink-0" /> Changes needed: {w.changeNote}</p>
          )}
          {changes !== null ? (
            <div className="space-y-2">
              <Textarea rows={2} autoFocus placeholder="What should change? e.g. Logo is small, make it bigger" value={changes} onChange={(e) => setChanges(e.target.value)} />
              <div className="flex gap-2"><Button variant="outline" onClick={() => setChanges(null)}>Cancel</Button><Button onClick={() => action('changes', changes)} disabled={busy || !changes.trim()}>Send back</Button></div>
            </div>
          ) : actions}
        </div>
      )}

      {canManage ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Client *">
            <Select value={f.client} onChange={(e) => pickClient(e.target.value)}>
              <option value="">Select client</option>
              {clients.map((c) => <option key={c._id} value={c._id}>{clientName(c)}</option>)}
            </Select>
          </Field>
          <Field label="Type">
            <Select value={f.type} onChange={(e) => pickType(e.target.value)}>{TYPES.map((t) => <option key={t.key} value={t.key}>{t.icon} {t.label}</option>)}</Select>
          </Field>
          <Field label="Title *" className="sm:col-span-2"><Input value={f.title} onChange={set('title')} placeholder={f.type === 'reel' ? 'e.g. Bridal Collection Showcase' : 'e.g. Weekend Offer Poster'} /></Field>
          <Field label={f.type === 'reel' || f.type === 'poster' ? 'Posting date *' : 'Due date *'}><Input type="date" value={f.date} onChange={set('date')} /></Field>
          <Field label="Time"><Input type="time" value={f.time} onChange={set('time')} /></Field>
          {stages.map((s) => (
            <Field key={s} label={personLabel(f.type, s)}>
              <Select value={f.people[s] || ''} onChange={setPerson(s)}>
                <option value="">—</option>
                {users.map((u) => <option key={u._id} value={u._id}>{u.name}{u.designation ? ` · ${u.designation}` : ''}</option>)}
              </Select>
            </Field>
          ))}
          {w && (
            <>
              {f.type === 'reel' && <Field label="Stage"><Select value={f.stage} onChange={set('stage')}>{stages.map((s) => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}</Select></Field>}
              <Field label="Status"><Select value={f.status} onChange={set('status')}>{STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}</Select></Field>
            </>
          )}
          <Field label="Brief / notes for the team" className="sm:col-span-2"><Textarea rows={2} value={f.notes} onChange={set('notes')} /></Field>
        </div>
      ) : (
        // Member: everything they need to do the job, read-only
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <ClientLogo client={w?.client} size="h-12 w-12" />
            <div className="min-w-0">
              <p className="font-semibold text-slate-900">{clientName(w?.client)}</p>
              {w?.client?.instagram && <a href={w.client.instagram} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-brand">Instagram <ExternalLink size={12} /></a>}
            </div>
            <div className="ml-auto text-right text-sm"><p className="font-medium text-slate-900">{fmtFull(w?.date)}</p><p className="text-slate-500">{fmtTime(w?.time)}</p></div>
          </div>
          {w?.notes && <div className="rounded-lg border border-slate-200 p-3 text-sm"><p className="mb-1 text-xs font-medium text-slate-500">Brief</p><p className="whitespace-pre-line text-slate-700">{w.notes}</p></div>}
          {w?.client?.brandNotes && <div className="rounded-lg border border-slate-200 p-3 text-sm"><p className="mb-1 text-xs font-medium text-slate-500">Brand notes</p><p className="whitespace-pre-line text-slate-700">{w.client.brandNotes}</p></div>}
          <div className="flex flex-wrap gap-4 text-sm">
            {stagesFor(w?.type).map((s) => (
              <span key={s} className="flex items-center gap-2"><Avatar name={w.people?.[s]?.name} photo={w.people?.[s]?.photo} size="h-6 w-6" /><span className="text-slate-500">{personLabel(w.type, s)}:</span> {w.people?.[s]?.name ?? '—'}</span>
            ))}
          </div>
        </div>
      )}

      {/* Writing area (reels & posters) */}
      {(f.type === 'reel' || f.type === 'poster') && (canManage || myState) && (
        <div className="mt-5 grid gap-4 border-t border-slate-100 pt-5">
          {canManage && <label className="block"><Label text="Idea" ai={ai('ideas', 'Ideas')} /><Textarea rows={f.idea.length > 120 ? 5 : 2} value={f.idea} onChange={set('idea')} /></label>}
          {!canManage && w?.idea && <div className="text-sm"><p className="mb-1 text-xs font-medium text-slate-600">Idea</p><p className="whitespace-pre-line text-slate-700">{w.idea}</p></div>}
          {f.type === 'reel' && <label className="block"><Label text="Script" ai={writer && ai('script', f.script ? 'Improve' : 'Write script')} /><Textarea rows={7} value={f.script} onChange={set('script')} readOnly={!writer} /></label>}
          <label className="block"><Label text="Caption" ai={writer && ai('caption', 'Caption')} copy={f.caption} /><Textarea rows={3} value={f.caption} onChange={set('caption')} readOnly={!writer} /></label>
          <label className="block"><Label text="Hashtags" ai={writer && ai('hashtags', 'Hashtags')} copy={f.hashtags} /><Input value={f.hashtags} onChange={set('hashtags')} readOnly={!writer} /></label>
        </div>
      )}
      <div className="mt-4"><ErrorBox text={error} /></div>
    </Modal>
  )
}

function fillFromTeam(type, team = {}) {
  const id = (x) => x?._id ?? x ?? ''
  if (type === 'reel') return { script: id(team.script), shoot: id(team.shoot), editing: id(team.editing), work: '' }
  return { script: '', shoot: '', editing: '', work: id(team[{ poster: 'poster', website: 'website', ads: 'ads' }[type]]) }
}
