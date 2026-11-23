import { useState } from 'react'
import { Sparkles, Copy } from 'lucide-react'
import { useAuth } from '../context/Auth'
import { del, post, put } from '../lib/api'
import { EMPLOYEE_STAGES, STAGES, toInputDate } from '../lib/constants'
import { Button, ErrorBox, Field, Input, Modal, Select, Textarea } from './ui'

// ✨ buttons — ask Claude to write into a field
function AiButton({ label, busy, onClick }) {
  return (
    <button type="button" onClick={onClick} disabled={busy}
      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium text-brand hover:bg-blue-50 disabled:opacity-60">
      <Sparkles size={13} className={busy ? 'animate-pulse' : ''} /> {busy ? 'Writing…' : label}
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

export default function ReelForm({ reel, clients = [], users = [], defaultDate, defaultClient, onClose, onSaved }) {
  const { isAdmin } = useAuth()
  const [f, setF] = useState({
    client: reel?.client?._id ?? defaultClient ?? '',
    title: reel?.title ?? '',
    postDate: toInputDate(reel?.postDate ?? defaultDate ?? new Date()),
    postTime: reel?.postTime ?? '18:00',
    idea: reel?.idea ?? '', script: reel?.script ?? '', caption: reel?.caption ?? '', hashtags: reel?.hashtags ?? '',
    scriptWriter: reel?.scriptWriter?._id ?? '', editor: reel?.editor?._id ?? '',
    stage: reel?.stage ?? 'idea', notes: reel?.notes ?? '',
  })
  const [error, setError] = useState('')
  const [aiBusy, setAiBusy] = useState('')
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const locked = !isAdmin // employees can't change client, date, people
  const stageOptions = isAdmin ? STAGES : STAGES.filter((s) => EMPLOYEE_STAGES.includes(s.key) || s.key === f.stage)

  // field: ideas → idea box, script, caption, hashtags
  const askAI = async (field) => {
    if (!f.client) return setError('Select a client first — AI uses their brand notes')
    setAiBusy(field); setError('')
    try {
      const { text } = await post('/ai/reel', { clientId: f.client, field, title: f.title, idea: f.idea, script: f.script, caption: f.caption })
      setF((cur) => ({ ...cur, [field === 'ideas' ? 'idea' : field]: text }))
    } catch (e) { setError(e.message) } finally { setAiBusy('') }
  }
  const ai = (field, label) => <AiButton label={label} busy={aiBusy === field} onClick={() => askAI(field)} />

  const save = async () => {
    if (!f.client || !f.title.trim() || !f.postDate) return setError('Client, title and date are required')
    try {
      const body = { ...f, scriptWriter: f.scriptWriter || null, editor: f.editor || null }
      onSaved(reel ? await put(`/reels/${reel._id}`, body) : await post('/reels', body))
    } catch (e) { setError(e.message) }
  }
  const remove = async () => {
    if (!window.confirm('Delete this reel?')) return
    await del(`/reels/${reel._id}`); onSaved(null)
  }

  return (
    <Modal title={reel ? 'Reel' : 'New Reel'} onClose={onClose} wide
      footer={<>
        {isAdmin && reel && <Button variant="danger" className="mr-auto" onClick={remove}>Delete</Button>}
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={save}>Save</Button>
      </>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Client *">
          <Select value={f.client} onChange={set('client')} disabled={locked}>
            <option value="">Select client</option>
            {clients.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
          </Select>
        </Field>
        <Field label="Reel title *"><Input value={f.title} onChange={set('title')} disabled={locked} /></Field>
        <Field label="Post date *"><Input type="date" value={f.postDate} onChange={set('postDate')} disabled={locked} /></Field>
        <Field label="Post time"><Input type="time" value={f.postTime} onChange={set('postTime')} disabled={locked} /></Field>
        <Field label="Script writer">
          <Select value={f.scriptWriter} onChange={set('scriptWriter')} disabled={locked}>
            <option value="">—</option>
            {users.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
          </Select>
        </Field>
        <Field label="Video editor">
          <Select value={f.editor} onChange={set('editor')} disabled={locked}>
            <option value="">—</option>
            {users.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
          </Select>
        </Field>

        <div className="sm:col-span-2">
          <span className="mb-1 block text-xs font-medium text-slate-600">Stage</span>
          <div className="flex flex-wrap gap-1.5">
            {stageOptions.map((s) => (
              <button type="button" key={s.key} onClick={() => setF({ ...f, stage: s.key })}
                className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium ${f.stage === s.key ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                {s.label}
              </button>
            ))}
          </div>
          {!isAdmin && <p className="mt-1.5 text-xs text-slate-400">After you send the video on WhatsApp, set the stage to “Sent to Owner”.</p>}
        </div>

        <label className="block sm:col-span-2"><Label text="Idea" ai={!locked && ai('ideas', 'Ideas')} /><Textarea rows={f.idea.length > 120 ? 5 : 2} value={f.idea} onChange={set('idea')} disabled={locked} /></label>
        <label className="block sm:col-span-2"><Label text="Script" ai={ai('script', f.script ? 'Improve' : 'Write script')} /><Textarea rows={8} value={f.script} onChange={set('script')} /></label>
        <label className="block sm:col-span-2"><Label text="Caption" ai={ai('caption', 'Caption')} copy={f.caption} /><Textarea rows={3} value={f.caption} onChange={set('caption')} /></label>
        <label className="block sm:col-span-2"><Label text="Hashtags" ai={ai('hashtags', 'Hashtags')} copy={f.hashtags} /><Input value={f.hashtags} onChange={set('hashtags')} placeholder="#bridaljewellery #thoothukudi" /></label>
        <Field label="Notes (owner feedback, links…)" className="sm:col-span-2"><Textarea rows={2} value={f.notes} onChange={set('notes')} /></Field>
      </div>
      <div className="mt-4"><ErrorBox text={error} /></div>
    </Modal>
  )
}
