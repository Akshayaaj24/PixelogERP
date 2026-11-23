import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { post } from '../lib/api'
import { thisMonth, clientName } from '../lib/constants'
import { Button, ErrorBox, Field, Input, Modal, Select } from './ui'

const nextMonth = () => { const [y, m] = thisMonth().split('-').map(Number); return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}` }

// AI suggests a month of reels → admin edits → adds them to the calendar
export default function PlanMonth({ clients = [], users = [], defaultClient, onClose, onDone }) {
  const [clientId, setClientId] = useState(defaultClient || '')
  const [month, setMonth] = useState(nextMonth())
  const [count, setCount] = useState('')
  const [writer, setWriter] = useState('')
  const [editor, setEditor] = useState('')
  const [time, setTime] = useState('18:00')
  const [plan, setPlan] = useState(null)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const client = clients.find((c) => c._id === clientId)

  const suggest = async () => {
    if (!clientId) return setError('Select a client')
    setBusy('ai'); setError('')
    try {
      const { reels } = await post('/ai/plan', { clientId, month, count: count || client?.reelsPerMonth || 8 })
      setPlan(reels.map((r) => ({ ...r, keep: true })))
    } catch (e) { setError(e.message) } finally { setBusy('') }
  }
  const update = (i, k, v) => setPlan(plan.map((r, j) => (j === i ? { ...r, [k]: v } : r)))
  const chosen = plan?.filter((r) => r.keep && r.title.trim()) ?? []

  const addAll = async () => {
    setBusy('save'); setError('')
    try {
      for (const r of chosen) {
        await post('/works', { client: clientId, type: 'reel', title: r.title, idea: r.idea, date: r.date, time, people: { script: writer, editing: editor } })
      }
      onDone(chosen.length)
    } catch (e) { setError(e.message); setBusy('') }
  }

  return (
    <Modal title="✨ Plan a month of reels" onClose={onClose} wide
      footer={plan
        ? <><Button variant="outline" onClick={() => setPlan(null)}>Back</Button><Button onClick={addAll} disabled={!chosen.length || busy}>{busy === 'save' ? 'Adding…' : `Add ${chosen.length} reels to calendar`}</Button></>
        : <><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={suggest} disabled={busy}><Sparkles size={15} /> {busy === 'ai' ? 'Planning… (about 20s)' : 'Suggest reels'}</Button></>}>
      {!plan ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Client" className="sm:col-span-3">
            <Select value={clientId} onChange={(e) => setClientId(e.target.value)}>
              <option value="">Select client</option>
              {clients.map((c) => <option key={c._id} value={c._id}>{clientName(c)}</option>)}
            </Select>
          </Field>
          <Field label="Month"><Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} /></Field>
          <Field label="How many reels"><Input type="number" min="1" max="31" placeholder={String(client?.reelsPerMonth || 8)} value={count} onChange={(e) => setCount(e.target.value)} /></Field>
          <Field label="Post time"><Input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></Field>
          <Field label="Script writer" className="sm:col-span-1">
            <Select value={writer} onChange={(e) => setWriter(e.target.value)}><option value="">Client's team</option>{users.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}</Select>
          </Field>
          <Field label="Video editor" className="sm:col-span-2">
            <Select value={editor} onChange={(e) => setEditor(e.target.value)}><option value="">Client's team</option>{users.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}</Select>
          </Field>
          <p className="text-xs text-slate-500 sm:col-span-3">
            AI uses the client's <b>brand notes</b> and <b>content language</b> and festivals in that month. People are filled from the client's team unless you choose here. You can edit everything before adding.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {plan.map((r, i) => (
            <li key={i} className={`rounded-lg border p-3 ${r.keep ? 'border-slate-200' : 'border-slate-100 opacity-50'}`}>
              <div className="flex items-start gap-3">
                <input type="checkbox" checked={r.keep} onChange={(e) => update(i, 'keep', e.target.checked)} className="mt-2.5 h-4 w-4 accent-brand" />
                <div className="grid flex-1 gap-2 sm:grid-cols-[140px_1fr]">
                  <Input type="date" value={r.date} onChange={(e) => update(i, 'date', e.target.value)} />
                  <Input value={r.title} onChange={(e) => update(i, 'title', e.target.value)} />
                  <textarea value={r.idea} onChange={(e) => update(i, 'idea', e.target.value)} rows={2}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 outline-none focus:border-brand sm:col-span-2" />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4"><ErrorBox text={error} /></div>
    </Modal>
  )
}
