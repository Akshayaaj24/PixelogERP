import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, ArrowRight, Sparkles } from 'lucide-react'
import { useAuth } from '../context/Auth'
import useFetch from '../lib/useFetch'
import { put } from '../lib/api'
import { EMPLOYEE_STAGES, STAGES, fmtDate, fmtTime, toInputDate } from '../lib/constants'
import ReelForm from '../components/ReelForm'
import PlanMonth from '../components/PlanMonth'
import { StageBadge } from '../components/StatusBadge'
import { Button, Card, Empty, ErrorBox, Loading, PageHeader, Select, Tabs } from '../components/ui'

const VIEWS = [{ key: 'board', label: 'Board' }, { key: 'calendar', label: 'Calendar' }, { key: 'list', label: 'List' }]
const WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const sameDay = (a, b) => toInputDate(a) === toInputDate(b)

function ReelCard({ reel, onOpen, onNext, canNext }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <button onClick={onOpen} className="block w-full text-left">
        <p className="text-xs font-medium text-slate-500">{reel.client?.name}</p>
        <p className="mt-0.5 text-sm font-medium text-slate-900">{reel.title}</p>
        <p className="mt-1.5 text-xs text-slate-500">{fmtDate(reel.postDate)} {fmtTime(reel.postTime)}</p>
        <p className="text-xs text-slate-400">{[reel.scriptWriter?.name, reel.editor?.name].filter(Boolean).join(' → ') || 'Not assigned'}</p>
      </button>
      {canNext && (
        <button onClick={onNext} className="mt-2 flex w-full items-center justify-center gap-1 rounded-md border border-slate-200 py-1 text-xs text-slate-600 hover:bg-slate-50">
          Next stage <ArrowRight size={12} />
        </button>
      )}
    </div>
  )
}

export default function Reels() {
  const { isAdmin } = useAuth()
  const [view, setView] = useState(() => (window.innerWidth < 768 ? 'list' : 'board'))
  const [month, setMonth] = useState(() => { const d = new Date(); d.setDate(1); return d })
  const [client, setClient] = useState('')
  const [person, setPerson] = useState('')
  const [editing, setEditing] = useState(null) // reel object, or { new: true, date }
  const [planning, setPlanning] = useState(false)

  const from = toInputDate(month)
  const to = toInputDate(new Date(month.getFullYear(), month.getMonth() + 1, 0))
  const { data, setData, loading, error, reload } = useFetch(`/reels?from=${from}&to=${to}T23:59:59&client=${client}&person=${person}`)
  const clients = useFetch('/clients?status=active')
  const users = useFetch('/users')
  const reels = useMemo(() => data ?? [], [data])

  const shiftMonth = (n) => setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1))
  const nextStage = (r) => STAGES[STAGES.findIndex((s) => s.key === r.stage) + 1]?.key
  const canMove = (r) => { const n = nextStage(r); return n && (isAdmin || EMPLOYEE_STAGES.includes(n)) }
  const moveNext = async (r) => {
    const updated = await put(`/reels/${r._id}`, { stage: nextStage(r) })
    setData(reels.map((x) => (x._id === r._id ? updated : x)))
  }

  // Calendar grid (Mon start)
  const days = useMemo(() => {
    const first = new Date(month)
    const start = new Date(first); start.setDate(1 - ((first.getDay() + 6) % 7))
    return Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d })
  }, [month])

  const byDate = useMemo(() => {
    const g = {}
    reels.forEach((r) => { const k = toInputDate(r.postDate); (g[k] ??= []).push(r) })
    return Object.entries(g).sort(([a], [b]) => a.localeCompare(b))
  }, [reels])

  return (
    <div>
      <PageHeader title="Reels" subtitle={isAdmin ? 'Plan and track every client reel' : 'Your reels this month'}>
        {isAdmin && <Button variant="outline" onClick={() => setPlanning(true)}><Sparkles size={16} className="text-brand" /> Plan month</Button>}
        {isAdmin && <Button onClick={() => setEditing({ new: true })}><Plus size={16} /> New Reel</Button>}
      </PageHeader>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Tabs tabs={VIEWS} value={view} onChange={setView} />
        <div className="flex items-center rounded-lg border border-slate-200 bg-white">
          <button onClick={() => shiftMonth(-1)} className="p-2 hover:bg-slate-50" aria-label="Previous month"><ChevronLeft size={16} /></button>
          <span className="w-32 text-center text-sm font-medium">{month.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</span>
          <button onClick={() => shiftMonth(1)} className="p-2 hover:bg-slate-50" aria-label="Next month"><ChevronRight size={16} /></button>
        </div>
        <div className="w-44"><Select value={client} onChange={(e) => setClient(e.target.value)}><option value="">All clients</option>{(clients.data ?? []).map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}</Select></div>
        {isAdmin && <div className="w-40"><Select value={person} onChange={(e) => setPerson(e.target.value)}><option value="">Everyone</option>{(users.data ?? []).map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}</Select></div>}
      </div>
      <ErrorBox text={error} />

      {loading && !data ? <Card><Loading /></Card> : view === 'board' ? (
        <div className="-mx-4 overflow-x-auto px-4 pb-2 lg:mx-0 lg:px-0">
          <div className="flex gap-3">
            {STAGES.map((s) => {
              const col = reels.filter((r) => r.stage === s.key)
              return (
                <div key={s.key} className="w-64 shrink-0 rounded-xl bg-slate-100/70 p-2">
                  <div className="flex items-center justify-between px-1.5 py-1.5">
                    <StageBadge stage={s.key} />
                    <span className="text-xs text-slate-500">{col.length}</span>
                  </div>
                  <div className="mt-1 space-y-2">
                    {col.map((r) => <ReelCard key={r._id} reel={r} onOpen={() => setEditing(r)} onNext={() => moveNext(r)} canNext={canMove(r)} />)}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : view === 'calendar' ? (
        <Card className="overflow-hidden">
          <div className="grid grid-cols-7 border-b border-slate-100 text-center text-xs font-medium text-slate-500">
            {WEEK.map((d) => <div key={d} className="py-2">{d}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {days.map((d) => {
              const inMonth = d.getMonth() === month.getMonth()
              const list = reels.filter((r) => sameDay(r.postDate, d))
              const today = sameDay(d, new Date())
              return (
                <div key={d.toISOString()} onClick={() => isAdmin && inMonth && !list.length && setEditing({ new: true, date: d })}
                  className={`min-h-16 border-b border-r border-slate-100 p-1 sm:min-h-24 sm:p-1.5 ${inMonth ? '' : 'bg-slate-50/60'} ${isAdmin && inMonth && !list.length ? 'cursor-pointer hover:bg-slate-50' : ''}`}>
                  <div className={`mb-1 text-xs ${today ? 'inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand font-semibold text-white' : inMonth ? 'text-slate-700' : 'text-slate-300'}`}>{d.getDate()}</div>
                  <div className="space-y-1">
                    {list.map((r) => {
                      const s = STAGES.find((x) => x.key === r.stage)
                      return (
                        <button key={r._id} onClick={(e) => { e.stopPropagation(); setEditing(r) }} className={`block w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] font-medium ${s.cls}`} title={`${r.client?.name} – ${r.title}`}>
                          <span className="hidden sm:inline">{r.client?.name}</span><span className="sm:hidden">•</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      ) : (
        <Card>
          {!byDate.length ? <Empty text="No reels this month." /> : byDate.map(([date, list]) => (
            <div key={date}>
              <div className="border-b border-slate-100 bg-slate-50 px-5 py-2 text-xs font-semibold text-slate-600">
                {new Date(date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
              </div>
              <ul className="divide-y divide-slate-100">
                {list.map((r) => (
                  <li key={r._id} className="flex items-center gap-3 px-5 py-3">
                    <button onClick={() => setEditing(r)} className="min-w-0 flex-1 text-left">
                      <p className="truncate text-sm font-medium text-slate-900">{r.title}</p>
                      <p className="truncate text-xs text-slate-500">{r.client?.name} · {fmtTime(r.postTime)} · {r.editor?.name || r.scriptWriter?.name || 'Not assigned'}</p>
                    </button>
                    <StageBadge stage={r.stage} />
                    {canMove(r) && <button onClick={() => moveNext(r)} className="rounded-md border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50" title="Next stage"><ArrowRight size={14} /></button>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </Card>
      )}

      {planning && (
        <PlanMonth clients={clients.data ?? []} users={users.data ?? []} defaultClient={client}
          onClose={() => setPlanning(false)}
          onDone={() => { setPlanning(false); reload() }} />
      )}
      {editing && (
        <ReelForm
          reel={editing.new ? null : editing}
          defaultDate={editing.date}
          defaultClient={client}
          clients={clients.data ?? []}
          users={users.data ?? []}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); reload() }}
        />
      )}
    </div>
  )
}
