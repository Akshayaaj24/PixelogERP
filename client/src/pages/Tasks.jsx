import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useAuth } from '../context/Auth'
import useFetch from '../lib/useFetch'
import { put } from '../lib/api'
import { TASK_STATUS, fmtDate, isOverdue } from '../lib/constants'
import TaskForm from '../components/TaskForm'
import { Badge, Button, Card, Empty, ErrorBox, Loading, PageHeader, Select, Tabs } from '../components/ui'

const PRIORITY = { high: 'bg-red-50 text-red-700', medium: 'bg-slate-100 text-slate-600', low: 'bg-slate-50 text-slate-400' }

export default function Tasks() {
  const { isAdmin } = useAuth()
  const VIEWS = [
    ...(isAdmin ? [{ key: 'all', label: 'All Open' }] : []),
    { key: 'my', label: 'My Tasks' }, { key: 'today', label: 'Today' }, { key: 'upcoming', label: 'Upcoming' },
    { key: 'overdue', label: 'Overdue' }, { key: 'done', label: 'Completed' },
  ]
  const [view, setView] = useState(isAdmin ? 'all' : 'my')
  const [person, setPerson] = useState('')
  const [editing, setEditing] = useState(null)
  const { data, setData, loading, error, reload } = useFetch(`/tasks?view=${view}&person=${person}`)
  const clients = useFetch('/clients?status=active')
  const users = useFetch('/users')

  const setStatus = async (t, status) => {
    const updated = await put(`/tasks/${t._id}`, { status })
    setData(data.map((x) => (x._id === t._id ? updated : x)))
  }

  return (
    <div>
      <PageHeader title="Tasks" subtitle="Websites, ads, shoots, revisions and everything else">
        {isAdmin && <Button onClick={() => setEditing({ new: true })}><Plus size={16} /> New Task</Button>}
      </PageHeader>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Tabs tabs={VIEWS} value={view} onChange={setView} />
        {isAdmin && view !== 'my' && (
          <div className="w-40"><Select value={person} onChange={(e) => setPerson(e.target.value)}><option value="">Everyone</option>{(users.data ?? []).map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}</Select></div>
        )}
      </div>
      <ErrorBox text={error} />

      <Card>
        {loading && !data ? <Loading /> : !data?.length ? <Empty text="No tasks here." /> : (
          <ul className="divide-y divide-slate-100">
            {data.map((t) => (
              <li key={t._id} className="flex flex-wrap items-center gap-3 px-5 py-3 sm:flex-nowrap">
                <input type="checkbox" checked={t.status === 'done'} onChange={() => setStatus(t, t.status === 'done' ? 'todo' : 'done')} className="h-4 w-4 shrink-0 accent-slate-900" aria-label="Mark done" />
                <button onClick={() => setEditing(t)} className="w-[calc(100%-2.5rem)] min-w-0 text-left sm:w-auto sm:flex-1">
                  <p className={`truncate text-sm font-medium ${t.status === 'done' ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{t.title}</p>
                  <p className="truncate text-xs text-slate-500">
                    {[t.client?.name, t.category, t.assignedTo?.name].filter(Boolean).join(' · ')}
                    {t.comments?.length ? ` · 💬 ${t.comments.length}` : ''}
                  </p>
                </button>
                <div className="flex items-center gap-2 pl-7 sm:pl-0">
                  {t.priority !== 'medium' && <Badge cls={PRIORITY[t.priority]}>{t.priority}</Badge>}
                  <span className={`w-16 text-right text-xs ${isOverdue(t.dueDate, t.status === 'done') ? 'font-medium text-red-600' : 'text-slate-500'}`}>{fmtDate(t.dueDate)}</span>
                  <select value={t.status} onChange={(e) => setStatus(t, e.target.value)}
                    className={`rounded-md border-0 px-2 py-1 text-xs font-medium outline-none ${TASK_STATUS.find((s) => s.key === t.status)?.cls}`}>
                    {TASK_STATUS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                  </select>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {editing && (
        <TaskForm task={editing.new ? null : editing} clients={clients.data ?? []} users={users.data ?? []}
          onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload() }} />
      )}
    </div>
  )
}
