import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Pencil, Plus, Phone, Mail, AtSign } from 'lucide-react'
import { useAuth } from '../context/Auth'
import useFetch from '../lib/useFetch'
import { del, put } from '../lib/api'
import { fmtDate, fmtTime, rupees, thisMonth } from '../lib/constants'
import ClientForm from '../components/ClientForm'
import ReelForm from '../components/ReelForm'
import TaskForm from '../components/TaskForm'
import { StageBadge, TaskBadge } from '../components/StatusBadge'
import { Avatar, Badge, Button, Card, Empty, ErrorBox, Input, Loading, Tabs } from '../components/ui'

function Info({ label, value }) {
  return <div><p className="text-xs text-slate-500">{label}</p><p className="mt-0.5 text-sm text-slate-900">{value || '—'}</p></div>
}

export default function ClientProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const { data, loading, error, reload } = useFetch(`/clients/${id}`)
  const users = useFetch('/users')
  const [tab, setTab] = useState('overview')
  const [modal, setModal] = useState(null) // 'edit' | {reel} | {task}
  const [pay, setPay] = useState({ month: thisMonth(), amount: '' })

  if (loading && !data) return <Loading />
  if (error) return <ErrorBox text={error} />
  const { client, reels, tasks, payments } = data
  const month = thisMonth()
  const reelsThisMonth = reels.filter((r) => r.postDate?.slice(0, 7) === month)

  const savePayment = async (status) => {
    await put('/payments', { client: id, month: pay.month, amount: Number(pay.amount || client.monthlyPackage), status })
    reload()
  }
  const removeClient = async () => {
    if (!window.confirm(`Delete ${client.name}? This also deletes their reels and payments.`)) return
    await del(`/clients/${id}`); navigate('/clients')
  }

  const TABS = [
    { key: 'overview', label: 'Overview' },
    { key: 'reels', label: `Reels (${reels.length})` },
    { key: 'tasks', label: `Tasks (${tasks.filter((t) => t.status !== 'done').length})` },
    ...(isAdmin ? [{ key: 'payments', label: 'Payments' }] : []),
  ]

  return (
    <div className="space-y-6">
      <Link to="/clients" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"><ArrowLeft size={15} /> Clients</Link>

      <div className="flex flex-wrap items-center gap-4">
        <Avatar name={client.name} size="h-14 w-14 text-lg" />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold text-slate-900">{client.name}</h1>
          <p className="text-sm text-slate-500">{[client.category, client.manager?.name && `Manager: ${client.manager.name}`].filter(Boolean).join(' · ')}</p>
        </div>
        {isAdmin && <Button variant="outline" onClick={() => setModal('edit')}><Pencil size={15} /> Edit</Button>}
      </div>

      <Tabs tabs={TABS} value={tab} onChange={setTab} />

      {tab === 'overview' && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card title="Details" className="lg:col-span-2">
            <div className="grid gap-5 p-5 sm:grid-cols-2">
              <Info label="Contact person" value={client.contactPerson} />
              <Info label="Status" value={<Badge>{client.status}</Badge>} />
              <Info label="Phone" value={client.phone && <a href={`tel:${client.phone}`} className="inline-flex items-center gap-1 text-brand"><Phone size={13} />{client.phone}</a>} />
              <Info label="Email" value={client.email && <span className="inline-flex items-center gap-1"><Mail size={13} />{client.email}</span>} />
              <Info label="Instagram" value={client.instagram && <span className="inline-flex items-center gap-1"><AtSign size={13} />{client.instagram.replace('@', '')}</span>} />
              <Info label="Start date" value={fmtDate(client.startDate)} />
              {isAdmin && <Info label="Monthly package" value={rupees(client.monthlyPackage)} />}
              <Info label="Content language" value={client.language} />
              <div className="sm:col-span-2"><Info label="Services" value={
                <span className="mt-1 flex flex-wrap gap-1.5">{client.services?.length ? client.services.map((s) => <Badge key={s}>{s}</Badge>) : '—'}</span>} /></div>
              <div className="sm:col-span-2"><Info label="Brand notes" value={<span className="whitespace-pre-line">{client.brandNotes}</span>} /></div>
            </div>
          </Card>
          <Card title="This Month">
            <div className="space-y-4 p-5">
              <div className="flex justify-between text-sm"><span className="text-slate-500">Reels planned</span><span className="font-semibold">{reelsThisMonth.length}{client.reelsPerMonth ? ` / ${client.reelsPerMonth}` : ''}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-500">Posted</span><span className="font-semibold">{reelsThisMonth.filter((r) => r.stage === 'posted').length}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-500">Waiting approval</span><span className="font-semibold">{reelsThisMonth.filter((r) => ['sent_to_owner', 'sent_to_client'].includes(r.stage)).length}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-500">Open tasks</span><span className="font-semibold">{tasks.filter((t) => t.status !== 'done').length}</span></div>
              {isAdmin && (() => { const p = payments.find((x) => x.month === month); return (
                <div className="flex justify-between text-sm"><span className="text-slate-500">Payment</span>
                  <Badge cls={p?.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-amber-50 text-amber-700'}>{p?.status ?? 'pending'}</Badge></div>
              ) })()}
            </div>
          </Card>
        </div>
      )}

      {tab === 'reels' && (
        <Card title="Reels" action={isAdmin && <Button onClick={() => setModal({ reel: null })}><Plus size={15} /> New Reel</Button>}>
          {!reels.length ? <Empty /> : (
            <ul className="divide-y divide-slate-100">
              {reels.map((r) => (
                <li key={r._id}>
                  <button onClick={() => setModal({ reel: r })} className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-slate-50">
                    <span className="w-24 shrink-0 text-xs text-slate-500">{fmtDate(r.postDate)} {fmtTime(r.postTime)}</span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-900">{r.title}</span>
                    <StageBadge stage={r.stage} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {tab === 'tasks' && (
        <Card title="Tasks" action={isAdmin && <Button onClick={() => setModal({ task: null })}><Plus size={15} /> New Task</Button>}>
          {!tasks.length ? <Empty /> : (
            <ul className="divide-y divide-slate-100">
              {tasks.map((t) => (
                <li key={t._id}>
                  <button onClick={() => setModal({ task: t })} className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-slate-50">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-slate-900">{t.title}</span>
                      <span className="block text-xs text-slate-500">{t.category} · {t.assignedTo?.name ?? '—'} · Due {fmtDate(t.dueDate)}</span>
                    </span>
                    <TaskBadge status={t.status} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {tab === 'payments' && isAdmin && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card title="Update Payment">
            <div className="space-y-3 p-5">
              <Input type="month" value={pay.month} onChange={(e) => setPay({ ...pay, month: e.target.value })} />
              <Input type="number" placeholder={`Amount (default ${rupees(client.monthlyPackage)})`} value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} />
              <div className="flex gap-2">
                <Button className="flex-1" onClick={() => savePayment('paid')}>Mark Paid</Button>
                <Button variant="outline" className="flex-1" onClick={() => savePayment('pending')}>Pending</Button>
              </div>
            </div>
          </Card>
          <Card title="History" className="lg:col-span-2">
            {!payments.length ? <Empty text="No payments recorded." /> : (
              <ul className="divide-y divide-slate-100">
                {payments.map((p) => (
                  <li key={p._id} className="flex items-center gap-3 px-5 py-3 text-sm">
                    <span className="w-28 font-medium text-slate-900">{new Date(p.month + '-01').toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</span>
                    <span className="flex-1">{rupees(p.amount)}</span>
                    <span className="hidden text-xs text-slate-500 sm:block">{p.paidDate ? `Paid ${fmtDate(p.paidDate)}` : ''}</span>
                    <Badge cls={p.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-amber-50 text-amber-700'}>{p.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}

      {isAdmin && tab === 'overview' && (
        <div className="pt-2"><Button variant="danger" onClick={removeClient}>Delete client</Button></div>
      )}

      {modal === 'edit' && <ClientForm client={client} users={users.data ?? []} onClose={() => setModal(null)} onSaved={() => { setModal(null); reload() }} />}
      {modal?.reel !== undefined && modal !== 'edit' && (
        <ReelForm reel={modal.reel} defaultClient={id} clients={[client]} users={users.data ?? []} onClose={() => setModal(null)} onSaved={() => { setModal(null); reload() }} />
      )}
      {modal?.task !== undefined && modal !== 'edit' && (
        <TaskForm task={modal.task} defaultClient={id} clients={[client]} users={users.data ?? []} onClose={() => setModal(null)} onSaved={() => { setModal(null); reload() }} />
      )}
    </div>
  )
}
