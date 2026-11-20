import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Film, CheckSquare } from 'lucide-react'
import { useAuth } from '../context/Auth'
import useFetch from '../lib/useFetch'
import { fmtDate, fmtTime, isOverdue } from '../lib/constants'
import { StageBadge, TaskBadge } from '../components/StatusBadge'
import { Avatar, Card, Empty, ErrorBox, Loading, PageHeader, Tabs } from '../components/ui'

const PERIODS = [{ key: 'today', label: 'Today' }, { key: 'week', label: 'This Week' }, { key: 'month', label: 'This Month' }]
const greet = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening' }

export default function Dashboard() {
  const { user, isAdmin } = useAuth()
  const [period, setPeriod] = useState('today')
  const { data, loading, error } = useFetch(`/dashboard?period=${period}`)
  const team = useFetch(isAdmin ? '/users?stats=1' : null)
  const label = PERIODS.find((p) => p.key === period).label

  return (
    <div className="space-y-6">
      <PageHeader title={`${greet()}, ${user.name.split(' ')[0]}`} subtitle={isAdmin ? "Here's what's happening at PIXELOG." : "Here's your work."}>
        <Tabs tabs={PERIODS} value={period} onChange={setPeriod} />
      </PageHeader>
      <ErrorBox text={error} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {(data?.stats ?? [{}, {}, {}, {}]).map((s, i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">{s.label === 'Reels in Period' ? `Reels ${label}` : s.label || '…'}</p>
            <p className={`mt-2 text-3xl font-semibold ${s.alert ? 'text-red-600' : 'text-slate-900'}`}>{s.value ?? '–'}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card title={`Work – ${label}`} className="min-w-0 xl:col-span-2">
          {loading ? <Loading /> : !data?.work.length ? <Empty text="No work scheduled for this period." /> : (
            <ul className="divide-y divide-slate-100">
              {data.work.map((w) => (
                <li key={w._id} className="flex items-center gap-3 px-5 py-3">
                  <div className="hidden w-20 shrink-0 text-xs text-slate-500 sm:block">
                    {period !== 'today' && <div>{fmtDate(w.date)}</div>}
                    <div>{fmtTime(w.time) || (w.type === 'task' ? 'Due' : '')}</div>
                  </div>
                  <span className="text-slate-400">{w.type === 'reel' ? <Film size={16} /> : <CheckSquare size={16} />}</span>
                  <Link to={w.type === 'reel' ? '/reels' : '/tasks'} className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">{w.title}</p>
                    <p className="truncate text-xs text-slate-500">
                      {w.client} · {w.person}
                      <span className="sm:hidden"> · {period !== 'today' ? fmtDate(w.date) + ' ' : ''}{fmtTime(w.time)}</span>
                    </p>
                  </Link>
                  {w.type === 'reel' ? <StageBadge stage={w.stage} /> : <TaskBadge status={w.status} />}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Upcoming Deadlines" action={<Link to="/tasks" className="text-sm text-brand">View all</Link>}>
          {!data?.deadlines.length ? <Empty text="No deadlines this week." /> : (
            <ul className="divide-y divide-slate-100">
              {data.deadlines.map((d) => (
                <li key={d._id} className="flex items-start justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900">{d.title}</p>
                    <p className="text-xs text-slate-500">{d.assignedTo?.name ?? '—'}{d.client ? ` · ${d.client.name}` : ''}</p>
                  </div>
                  <span className={`whitespace-nowrap text-xs font-medium ${isOverdue(d.dueDate) ? 'text-red-600' : 'text-slate-500'}`}>
                    {isOverdue(d.dueDate) ? 'Overdue' : fmtDate(d.dueDate)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {isAdmin && (
        <Card title="Team Workload" action={<Link to="/team" className="text-sm text-brand">Team</Link>}>
          <div className="grid gap-px bg-slate-100 sm:grid-cols-2 lg:grid-cols-4">
            {(team.data ?? []).filter((m) => m.role !== 'admin' && m.active).map((m) => (
              <div key={m._id} className="flex items-center gap-3 bg-white px-5 py-4">
                <Avatar name={m.name} size="h-10 w-10" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900">{m.name}</p>
                  <p className="text-xs text-slate-500">{m.designation}</p>
                </div>
                <div className="text-right">
                  <p className={`text-lg font-semibold ${m.stats.overdue ? 'text-red-600' : 'text-slate-900'}`}>{m.stats.openTasks + m.stats.openReels}</p>
                  <p className="text-xs text-slate-400">{m.stats.overdue ? `${m.stats.overdue} overdue` : 'open'}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
