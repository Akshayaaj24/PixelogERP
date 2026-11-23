import { useState } from 'react'
import { Play, Send, AlertTriangle, CalendarDays, CheckCircle2, Hourglass } from 'lucide-react'
import { useAuth } from '../context/Auth'
import useFetch from '../lib/useFetch'
import { post } from '../lib/api'
import { toInputDate, todayStr, fmtDate, fmtTime, clientName, STAGE_LABEL } from '../lib/constants'
import { StatusBadge, TypeTag } from '../components/StatusBadge'
import WorkForm from '../components/WorkForm'
import { Button, Card, ClientLogo, ErrorBox, Loading, PageHeader, StatCard } from '../components/ui'
import { greet } from './Dashboard'

function Row({ w, onOpen, onAction, busy }) {
  const mineNow = String(w.people?.[w.stage]?._id) === String(w.__me)
  const done = w.myState === 'done'
  return (
    <li className="flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap sm:px-5">
      <button onClick={() => onOpen(w)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <ClientLogo client={w.client} size="h-10 w-10" />
        <span className="min-w-0">
          <span className={`block truncate text-sm font-medium ${done ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{w.title}</span>
          <span className="block truncate text-xs text-slate-500">{clientName(w.client)} · <TypeTag work={w} /> · {fmtDate(w.date)}{w.time ? ` ${fmtTime(w.time)}` : ''}</span>
          {w.changeNote && !done && w.status === 'processing' && <span className="mt-1 flex items-center gap-1 text-xs text-pink-700"><AlertTriangle size={12} /> {w.changeNote}</span>}
        </span>
      </button>
      <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
        {w.myState === 'active' && mineNow && w.status === 'start' && <Button onClick={() => onAction(w, 'start')} disabled={busy}><Play size={15} /> Start</Button>}
        {w.myState === 'active' && mineNow && w.status === 'processing' && <Button onClick={() => onAction(w, 'submit')} disabled={busy}><Send size={15} /> Submit</Button>}
        {w.myState === 'active' && w.status === 'waiting' && <StatusBadge status="waiting" />}
        {w.myState === 'upcoming' && <span className="text-xs text-slate-500">Waiting for {STAGE_LABEL[w.stage]}</span>}
        {done && <StatusBadge status={w.status === 'done' ? 'done' : 'approved'} />}
      </div>
    </li>
  )
}

export default function MyWork() {
  const { user } = useAuth()
  const { data, loading, error, reload } = useFetch('/dashboard')
  const [open, setOpen] = useState(null)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')

  const act = async (w, action) => {
    setBusy(true); setActionError('')
    try { await post(`/works/${w._id}/action`, { action }); reload() } catch (e) { setActionError(e.message) } finally { setBusy(false) }
  }

  const items = (data?.items ?? []).map((w) => ({ ...w, __me: user._id }))
  const today = todayStr(), tomorrow = toInputDate(new Date(Date.now() + 864e5))
  const d = (w) => toInputDate(w.date)
  const active = items.filter((w) => w.myState === 'active')
  const groups = [
    { title: '⚠ Overdue', cls: 'text-red-600', list: active.filter((w) => d(w) < today) },
    { title: 'Today', list: active.filter((w) => d(w) === today) },
    { title: 'Tomorrow', list: active.filter((w) => d(w) === tomorrow) },
    { title: 'Coming up', list: active.filter((w) => d(w) > tomorrow) },
    { title: 'Waiting for others', list: items.filter((w) => w.myState === 'upcoming') },
    { title: 'Done recently', list: items.filter((w) => w.myState === 'done').slice(-8).reverse() },
  ]
  const c = data?.counts

  return (
    <div className="space-y-6">
      <PageHeader title={`${greet()}, ${user.name.split(' ')[0]}`} subtitle={user.designation ? `${user.designation} · your work` : 'Your work'} />
      <ErrorBox text={error || actionError} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Today" value={c?.today} icon={CalendarDays} tone="blue" />
        <StatCard label="Overdue" value={c?.overdue} icon={AlertTriangle} tone="red" valueCls={c?.overdue ? 'text-red-600' : 'text-slate-900'} />
        <StatCard label="Completed this month" value={c?.doneMonth} icon={CheckCircle2} tone="green" valueCls="text-green-700" />
        <StatCard label="Pending this month" value={c?.pendingMonth} icon={Hourglass} tone="amber" valueCls="text-amber-600" />
      </div>

      {loading && !data ? <Card><Loading /></Card> : (
        <div className="space-y-4">
          {groups.filter((g) => g.list.length).map((g) => (
            <Card key={g.title} title={<span className={g.cls}>{g.title} ({g.list.length})</span>}>
              <ul className="divide-y divide-slate-100">{g.list.map((w) => <Row key={w._id} w={w} onOpen={setOpen} onAction={act} busy={busy} />)}</ul>
            </Card>
          ))}
          {!items.length && <Card><p className="px-5 py-10 text-center text-sm text-slate-400">No work assigned to you yet. 🎉</p></Card>}
        </div>
      )}

      {open && <WorkForm work={open} onClose={() => { setOpen(null); reload() }} onSaved={(w, keep) => { reload(); if (!keep) setOpen(null) }} />}
    </div>
  )
}
