import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, Clock, Users, CalendarDays, Hourglass } from 'lucide-react'
import { useAuth } from '../context/Auth'
import useFetch from '../lib/useFetch'
import { fmtDate, fmtTime, clientName } from '../lib/constants'
import { StatusBadge, TypeTag } from '../components/StatusBadge'
import WorkForm from '../components/WorkForm'
import MyWork from './MyWork'
import { Avatar, Card, ClientLogo, Empty, ErrorBox, Loading, PageHeader, StatCard, Tabs } from '../components/ui'

const PERIODS = [{ key: 'today', label: 'Today' }, { key: 'week', label: 'This Week' }, { key: 'month', label: 'This Month' }]
export const greet = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening' }

function WorkRow({ w, onOpen, showDate }) {
  return (
    <li>
      <button onClick={() => onOpen(w)} className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-slate-50">
        <ClientLogo client={w.client} size="h-8 w-8" />
        <span className="min-w-0 flex-1">
          <span className={`block truncate text-sm font-medium ${w.status === 'done' ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{w.title}</span>
          <span className="block truncate text-xs text-slate-500">{clientName(w.client)} · <TypeTag work={w} /> · {w.people?.[w.stage]?.name ?? 'Not assigned'}{showDate ? ` · ${fmtDate(w.date)}` : ''}{w.time ? ` ${fmtTime(w.time)}` : ''}</span>
        </span>
        <StatusBadge status={w.status} short />
      </button>
    </li>
  )
}

export default function Dashboard() {
  const { canManage } = useAuth()
  return canManage ? <ManagerDashboard /> : <MyWork />
}

function ManagerDashboard() {
  const { user, isAdmin } = useAuth()
  const [period, setPeriod] = useState('today')
  const [open, setOpen] = useState(null)
  const { data, loading, error, reload } = useFetch(`/dashboard?period=${period}`)
  const team = useFetch('/users?stats=1')
  const clients = useFetch('/clients?status=active')
  const label = PERIODS.find((p) => p.key === period).label
  const members = (team.data ?? []).filter((m) => m.role === 'member' && m.active)
  const refresh = () => { reload(); team.reload() }

  return (
    <div className="space-y-6">
      <PageHeader title={`${greet()}, ${user.name.split(' ')[0]}`} subtitle={isAdmin ? "Here's everything happening at PIXELOG." : "Here's today's work across the team."}>
        <Tabs tabs={PERIODS} value={period} onChange={setPeriod} />
      </PageHeader>
      <ErrorBox text={error} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {(data?.stats ?? [{}, {}, {}, {}]).map((s, i) => {
          const look = { clients: [Users, 'violet'], period: [CalendarDays, 'blue'], waiting: [Hourglass, 'amber'], overdue: [AlertTriangle, 'red'] }[s.key] ?? []
          return <StatCard key={i} label={s.key === 'period' ? `Work ${label}` : s.label || '…'} value={s.value} icon={look[0]} tone={look[1]}
            valueCls={s.alert ? (s.key === 'overdue' ? 'text-red-600' : 'text-amber-600') : 'text-slate-900'} />
        })}
      </div>

      {data?.alerts?.length > 0 && (
        <div className="space-y-2">
          {data.alerts.map((a, i) => (
            <div key={i} className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm ${a.type === 'bond' ? 'bg-violet-50 text-violet-800' : 'bg-amber-50 text-amber-800'}`}>
              {a.type === 'bond' ? <Clock size={16} /> : <AlertTriangle size={16} />} {a.text}
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card title={`Work – ${label}`} className="min-w-0 xl:col-span-2" action={<Link to="/calendar" className="text-sm text-brand">Calendar</Link>}>
          {loading && !data ? <Loading /> : !data?.work.length ? <Empty text="No work for this period." /> : (
            <ul className="divide-y divide-slate-100">{data.work.map((w) => <WorkRow key={w._id} w={w} onOpen={setOpen} showDate={period !== 'today'} />)}</ul>
          )}
        </Card>
        <div className="space-y-6">
          <Card title={`Waiting for approval (${data?.waiting.length ?? 0})`}>
            {!data?.waiting.length ? <Empty text="Nothing to approve 👍" /> : <ul className="divide-y divide-slate-100">{data.waiting.map((w) => <WorkRow key={w._id} w={w} onOpen={setOpen} showDate />)}</ul>}
          </Card>
          {data?.overdue.length > 0 && (
            <Card title={`Overdue (${data.overdue.length})`}>
              <ul className="divide-y divide-slate-100">{data.overdue.map((w) => <WorkRow key={w._id} w={w} onOpen={setOpen} showDate />)}</ul>
            </Card>
          )}
        </div>
      </div>

      {/* Workload: who is busy / free */}
      <Card title="Team Workload" action={<Link to="/team" className="text-sm text-brand">Team</Link>}>
        {!members.length ? <Empty text="No team members yet." /> : (
          <div className="grid gap-px bg-slate-100 sm:grid-cols-2 lg:grid-cols-3">
            {members.map((m) => (
              <div key={m._id} className="flex items-center gap-3 bg-surface px-5 py-4">
                <Avatar name={m.name} photo={m.photo} size="h-10 w-10" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900">{m.name}</p>
                  <p className="truncate text-xs text-slate-500">{m.designation}</p>
                </div>
                <div className="text-right text-xs leading-5">
                  {m.stats.open === 0 && m.stats.waiting === 0
                    ? <span className="rounded-full bg-green-100 px-2.5 py-0.5 font-medium text-green-700">● Free</span>
                    : <>
                        <p><b className="text-slate-900">{m.stats.today}</b> <span className="text-slate-500">today</span> · <b className="text-slate-900">{m.stats.open}</b> <span className="text-slate-500">open</span></p>
                        {m.stats.overdue > 0 && <p className="font-medium text-red-600">{m.stats.overdue} overdue</p>}
                        {m.stats.waiting > 0 && <p className="text-amber-700">{m.stats.waiting} waiting</p>}
                      </>}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {open && <WorkForm work={open} clients={clients.data ?? []} users={members} onClose={() => { setOpen(null); refresh() }} onSaved={(w, keep) => { refresh(); if (!keep) setOpen(null) }} />}
    </div>
  )
}

