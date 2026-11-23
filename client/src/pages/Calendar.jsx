import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Plus, Sparkles, ExternalLink } from 'lucide-react'
import { useAuth } from '../context/Auth'
import useFetch from '../lib/useFetch'
import { TYPES, STATUSES, statusOf, typeOf, STAGE_LABEL, stepState, toInputDate, todayStr, fmtTime, clientName, isOverdue } from '../lib/constants'
import WorkForm from '../components/WorkForm'
import PlanMonth from '../components/PlanMonth'
import { StatusBadge, TypeTag } from '../components/StatusBadge'
import { Avatar, Button, Card, ClientLogo, Empty, ErrorBox, Loading, PageHeader, Select, Tabs } from '../components/ui'

const WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const idOf = (x) => String(x?._id ?? x ?? '')

// Done (or my part done) → struck out
const isDone = (w, uid, canManage) => (canManage ? w.status === 'done' : (w.myState ?? stepState(w, uid)) === 'done')

export default function Calendar() {
  const { user, canManage } = useAuth()
  const [params] = useSearchParams()
  const [view, setView] = useState(() => (window.innerWidth < 768 ? 'list' : 'calendar'))
  const [month, setMonth] = useState(() => { const d = new Date(); d.setDate(1); return d })
  const [clientId, setClientId] = useState(params.get('client') ?? '')
  const [type, setType] = useState('')
  const [editing, setEditing] = useState(null)
  const [planning, setPlanning] = useState(false)

  const from = toInputDate(month)
  const to = toInputDate(new Date(month.getFullYear(), month.getMonth() + 1, 0))
  const { data, loading, error, reload } = useFetch(`/works?from=${from}&to=${to}T23:59:59&type=${type}`)
  const clientsRes = useFetch(canManage ? '/clients?status=active' : null)
  const usersRes = useFetch(canManage ? '/users' : null)
  const all = useMemo(() => data ?? [], [data])
  const members = (usersRes.data ?? []).filter((u) => u.role === 'member' && u.active)

  // Clients list: managers get all active clients; members get clients from their own work
  const clients = useMemo(() => {
    if (canManage) return clientsRes.data ?? []
    const m = new Map(); all.forEach((w) => w.client && m.set(w.client._id, w.client)); return [...m.values()]
  }, [canManage, clientsRes.data, all])

  const items = clientId ? all.filter((w) => idOf(w.client) === clientId) : all
  const selected = clients.find((c) => c._id === clientId)
  const doneCount = items.filter((w) => isDone(w, user._id, canManage)).length
  const overdue = items.filter((w) => !isDone(w, user._id, canManage) && isOverdue(w.date)).length

  const days = useMemo(() => {
    const start = new Date(month); start.setDate(1 - ((month.getDay() + 6) % 7))
    return Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d })
  }, [month])
  const byDay = useMemo(() => { const g = {}; items.forEach((w) => (g[toInputDate(w.date)] ??= []).push(w)); return g }, [items])

  // Side panel: each person's numbers for this client (or all)
  const team = useMemo(() => {
    const tomorrow = toInputDate(new Date(Date.now() + 864e5))
    const map = new Map()
    for (const w of items) {
      for (const k of ['script', 'shoot', 'editing', 'work']) {
        const p = w.people?.[k]; if (!p?._id) continue
        const row = map.get(p._id) ?? { person: p, done: 0, pending: 0, tomorrow: [] }
        const s = stepState(w, p._id)
        if (s === 'done') row.done++; else row.pending++
        if (toInputDate(w.date) === tomorrow && s !== 'done') row.tomorrow.push(w)
        map.set(p._id, row)
      }
    }
    return [...map.values()].sort((a, b) => b.pending - a.pending)
  }, [items])

  const shift = (n) => setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1))
  const open = (w) => setEditing(w)
  const saved = (w, keepOpen) => { reload(); if (!keepOpen) setEditing(null) }

  const teamPanel = (grid) => (
<Card title={selected ? `Team · ${clientName(selected)}` : 'Team this month'}>
              {!team.length ? <Empty text="Nobody assigned yet." /> : (
                <ul className={grid ? "grid gap-px bg-slate-100 sm:grid-cols-2 lg:grid-cols-3" : "divide-y divide-slate-100"}>
                  {team.map((t) => (
                    <li key={t.person._id} className="bg-surface px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={t.person.name} photo={t.person.photo} size="h-8 w-8" />
                        <div className="min-w-0"><p className="truncate text-sm font-medium text-slate-900">{t.person.name}</p><p className="truncate text-xs text-slate-500">{t.person.designation}</p></div>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
                        <span className="text-green-700">✅ Completed: {t.done}</span>
                        <span className="text-amber-700">⏳ Pending: {t.pending}</span>
                      </div>
                      <div className="mt-1.5 text-xs text-slate-600">
                        📅 Tomorrow: {t.tomorrow.length ? t.tomorrow.map((w) => <button key={w._id} onClick={() => open(w)} className="mt-0.5 block w-full truncate text-left hover:text-brand">{typeOf(w.type).icon} {w.title} – <b>{statusOf(w.status).short ?? statusOf(w.status).label}</b>{w.type === 'reel' ? ` (${STAGE_LABEL[w.stage]})` : ''}</button>) : <span className="text-slate-400">No work</span>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
  )

  // Pastel chip by work type · coloured dot = status · done = faded + struck out
  const Chip = ({ w }) => {
    const done = isDone(w, user._id, canManage)
    const t = typeOf(w.type), st = statusOf(w.status)
    return (
      <button onClick={(e) => { e.stopPropagation(); open(w) }} title={`${clientName(w.client)} – ${w.title} (${st.label})`}
        className={`flex w-full items-center gap-1 truncate rounded-md border-l-[3px] px-1.5 py-0.5 text-left text-[11px] font-medium ${done ? 'border-slate-300 bg-slate-100 text-slate-400 line-through' : t.chip}`}>
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${done ? 'bg-slate-300' : st.dot}`} />
        <span className="truncate"><span className="sm:hidden">{t.icon}</span><span className="hidden sm:inline">{clientId ? w.title : clientName(w.client)}</span></span>
      </button>
    )
  }

  return (
    <div>
      <PageHeader title="Calendar" subtitle={canManage ? 'Plan, assign and track all client work' : 'Your work this month'}>
        {canManage && <Button variant="outline" onClick={() => setPlanning(true)}><Sparkles size={16} className="text-brand" /> Plan month</Button>}
        {canManage && <Button onClick={() => setEditing({ new: true })}><Plus size={16} /> New work</Button>}
      </PageHeader>

      <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
        {/* Client list */}
        <aside className="hidden w-56 shrink-0 xl:block">
          <Card>
            <ul className="p-1.5">
              {[{ _id: '', name: 'All clients' }, ...clients].map((c) => {
                const cw = c._id ? all.filter((w) => idOf(w.client) === c._id) : all
                return (
                  <li key={c._id}>
                    <button onClick={() => setClientId(c._id)} className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm ${clientId === c._id ? 'bg-slate-900 text-slate-50' : 'hover:bg-slate-50'}`}>
                      {c._id ? <ClientLogo client={c} size="h-7 w-7" /> : <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-xs">All</span>}
                      <span className="min-w-0 flex-1 truncate">{c._id ? clientName(c) : c.name}</span>
                      <span className={`text-xs ${clientId === c._id ? 'text-slate-300' : 'text-slate-400'}`}>{cw.filter((w) => isDone(w, user._id, canManage)).length}/{cw.length}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </Card>
        </aside>

        <div className="min-w-0 flex-1 space-y-4">
          {/* Controls */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-full sm:w-52 xl:hidden">
              <Select value={clientId} onChange={(e) => setClientId(e.target.value)}><option value="">All clients</option>{clients.map((c) => <option key={c._id} value={c._id}>{clientName(c)}</option>)}</Select>
            </div>
            <div className="flex items-center rounded-lg border border-slate-200 bg-surface">
              <button onClick={() => shift(-1)} className="p-2 hover:bg-slate-50" aria-label="Previous month"><ChevronLeft size={16} /></button>
              <span className="w-32 text-center text-sm font-medium">{month.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</span>
              <button onClick={() => shift(1)} className="p-2 hover:bg-slate-50" aria-label="Next month"><ChevronRight size={16} /></button>
            </div>
            <div className="w-36"><Select value={type} onChange={(e) => setType(e.target.value)}><option value="">All types</option>{TYPES.map((t) => <option key={t.key} value={t.key}>{t.icon} {t.label}</option>)}</Select></div>
            <div className="ml-auto"><Tabs tabs={[{ key: 'calendar', label: 'Calendar' }, { key: 'list', label: 'List' }]} value={view} onChange={setView} /></div>
          </div>

          {/* Selected client + counts */}
          <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-surface px-5 py-4">
            {selected ? (
              <div className="flex min-w-0 items-center gap-3">
                <ClientLogo client={selected} size="h-11 w-11" />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-900">{clientName(selected)}</p>
                  {selected.instagram && <a href={selected.instagram} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-brand">Instagram <ExternalLink size={11} /></a>}
                </div>
              </div>
            ) : <p className="font-semibold text-slate-900">{canManage ? 'All clients' : 'My work'}</p>}
            <div className="ml-auto flex gap-2 text-center">
              <div className="rounded-lg bg-slate-100 px-3 py-1.5"><p className="text-xl font-semibold text-slate-900">{items.length}</p><p className="text-xs text-slate-500">Total</p></div>
              <div className="rounded-lg bg-green-50 px-3 py-1.5"><p className="text-xl font-semibold text-green-700">{doneCount}</p><p className="text-xs text-green-700/80">Completed</p></div>
              <div className="rounded-lg bg-amber-50 px-3 py-1.5"><p className="text-xl font-semibold text-amber-700">{items.length - doneCount}</p><p className="text-xs text-amber-700/80">Pending</p></div>
              {overdue > 0 && <div className="rounded-lg bg-red-50 px-3 py-1.5"><p className="text-xl font-semibold text-red-600">{overdue}</p><p className="text-xs text-red-600/80">Overdue</p></div>}
            </div>
          </div>
          <ErrorBox text={error} />

          {loading && !data ? <Card><Loading /></Card> : view === 'calendar' ? (
            <Card className="overflow-hidden">
              <div className="grid grid-cols-7 border-b border-slate-100 text-center text-xs font-medium text-slate-500">{WEEK.map((d) => <div key={d} className="py-2">{d}</div>)}</div>
              <div className="grid grid-cols-7">
                {days.map((d) => {
                  const key = toInputDate(d)
                  const list = byDay[key] ?? []
                  const inMonth = d.getMonth() === month.getMonth()
                  const allDone = list.length > 0 && list.every((w) => isDone(w, user._id, canManage))
                  const isToday = key === todayStr()
                  return (
                    <div key={key} onClick={() => canManage && inMonth && setEditing({ new: true, date: d })}
                      className={`min-h-16 border-b border-r border-slate-100 p-1 sm:min-h-24 sm:p-1.5 ${!inMonth ? 'bg-slate-50/60' : isToday ? 'bg-blue-50' : d.getDay() === 0 ? 'bg-slate-50/50' : ''} ${canManage && inMonth ? 'cursor-pointer hover:bg-slate-50' : ''}`}>
                      <div className={`mb-1 text-xs ${isToday ? 'inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand font-semibold text-white' : !inMonth ? 'text-slate-300' : allDone ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{d.getDate()}</div>
                      <div className="space-y-1">{list.slice(0, 4).map((w) => <Chip key={w._id} w={w} />)}{list.length > 4 && <p className="px-1 text-[11px] text-slate-400">+{list.length - 4} more</p>}</div>
                    </div>
                  )
                })}
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-slate-100 px-4 py-2.5 text-xs text-slate-500">
                {TYPES.map((t) => <span key={t.key} className="flex items-center gap-1.5"><span className={`h-2.5 w-2.5 rounded-sm ${t.dot}`} />{t.label}</span>)}
                <span className="mx-1 hidden h-3 w-px bg-slate-200 sm:block" />
                {STATUSES.map((x) => <span key={x.key} className="flex items-center gap-1.5"><span className={`h-1.5 w-1.5 rounded-full ${x.dot}`} />{x.short ?? x.label}</span>)}
              </div>
            </Card>
          ) : (
            <Card>
              {!items.length ? <Empty text="No work this month." /> : Object.entries(byDay).sort(([a], [b]) => a.localeCompare(b)).map(([date, list]) => (
                <div key={date}>
                  <div className={`border-b border-slate-100 bg-slate-50 px-5 py-2 text-xs font-semibold ${list.every((w) => isDone(w, user._id, canManage)) ? 'text-slate-400 line-through' : 'text-slate-600'}`}>
                    {new Date(date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </div>
                  <ul className="divide-y divide-slate-100">
                    {list.map((w) => {
                      const done = isDone(w, user._id, canManage)
                      return (
                        <li key={w._id}>
                          <button onClick={() => open(w)} className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-slate-50">
                            <span className={`h-9 w-1 shrink-0 rounded-full ${done ? 'bg-slate-200' : typeOf(w.type).dot}`} />
                            <ClientLogo client={w.client} size="h-8 w-8" />
                            <span className="min-w-0 flex-1">
                              <span className={`block truncate text-sm font-medium ${done ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{w.title}</span>
                              <span className="block truncate text-xs text-slate-500">{clientName(w.client)} · <TypeTag work={w} />{w.time ? ` · ${fmtTime(w.time)}` : ''} · {w.people?.[w.stage]?.name ?? '—'}</span>
                            </span>
                            <StatusBadge status={w.status} short />
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))}
            </Card>
          )}
          {canManage && <div className="2xl:hidden">{teamPanel(true)}</div>}
        </div>

        {/* Team side panel (wide screens) */}
        {canManage && <aside className="hidden w-64 shrink-0 2xl:block">{teamPanel(false)}</aside>}
      </div>

      {planning && <PlanMonth clients={clients} users={members} defaultClient={clientId} onClose={() => setPlanning(false)} onDone={() => { setPlanning(false); reload() }} />}
      {editing && (
        <WorkForm work={editing.new ? null : editing} defaults={{ client: clientId, date: editing.date, type: type || 'reel' }}
          clients={clients} users={members} onClose={() => { setEditing(null); reload() }} onSaved={saved} />
      )}
    </div>
  )
}
