import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Pencil, Phone, Mail, ExternalLink, CalendarDays, Users } from 'lucide-react'
import { useAuth } from '../context/Auth'
import useFetch from '../lib/useFetch'
import { del, put } from '../lib/api'
import { fmtFull, fmtDate, rupees, thisMonth, clientName, TEAM_SLOTS, WEBSITE_STATUS } from '../lib/constants'
import ClientForm from '../components/ClientForm'
import TeamAssign from '../components/TeamAssign'
import { Avatar, Badge, Button, Card, ClientLogo, Empty, ErrorBox, Input, Loading } from '../components/ui'

function Info({ label, children }) {
  return <div><p className="text-xs text-slate-500">{label}</p><div className="mt-0.5 text-sm text-slate-900">{children || '—'}</div></div>
}
function Stat({ label, done, total, sub }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-surface p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{done}<span className="text-base font-normal text-slate-400"> / {total}</span></p>
      {sub && <p className="text-xs text-slate-500">{sub}</p>}
    </div>
  )
}

export default function ClientProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const [month, setMonth] = useState(thisMonth())
  const { data, loading, error, reload } = useFetch(`/clients/${id}?month=${month}`)
  const users = useFetch('/users')
  const [modal, setModal] = useState(null)
  const [pay, setPay] = useState({ month: thisMonth(), amount: '' })

  if (loading && !data) return <Loading />
  if (error) return <ErrorBox text={error} />
  const { client, summary, payments } = data
  const s = (t) => summary?.[t] ?? { planned: 0, done: 0 }
  const members = (users.data ?? []).filter((u) => u.role === 'member' && u.active)

  const savePayment = async (status) => { await put('/payments', { client: id, month: pay.month, amount: Number(pay.amount || client.monthlyPackage), status }); reload() }
  const removeClient = async () => {
    if (!window.confirm(`Delete ${clientName(client)}? This also deletes their calendar work and payments.`)) return
    await del(`/clients/${id}`); navigate('/clients')
  }

  return (
    <div className="space-y-6">
      <Link to="/clients" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"><ArrowLeft size={15} /> Clients</Link>

      <div className="flex flex-wrap items-center gap-4">
        <ClientLogo client={client} size="h-16 w-16" />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold text-slate-900">{clientName(client)}</h1>
          <p className="text-sm text-slate-500">{client.businessName ? client.name : ''} <Badge cls={client.status === 'active' ? 'bg-green-100 text-green-800' : ''}>{client.status === 'active' ? 'Active' : 'Inactive'}</Badge></p>
        </div>
        <Button variant="outline" onClick={() => navigate(`/calendar?client=${id}`)}><CalendarDays size={15} /> Calendar</Button>
        {isAdmin && <Button variant="outline" onClick={() => setModal('edit')}><Pencil size={15} /> Edit</Button>}
      </div>

      {/* This month */}
      <div>
        <div className="mb-3 flex items-center gap-3"><h2 className="font-semibold text-slate-900">Monthly summary</h2><div className="w-40"><Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} /></div></div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat label="🎬 Reels uploaded" done={s('reel').done} total={client.reelsPerMonth || s('reel').planned} sub={`${s('reel').planned} planned`} />
          <Stat label="🖼️ Posters uploaded" done={s('poster').done} total={client.postersPerMonth || s('poster').planned} sub={`${s('poster').planned} planned`} />
          <div className="rounded-xl border border-slate-200 bg-surface p-4">
            <p className="text-sm text-slate-500">🌐 Website</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{WEBSITE_STATUS[client.websiteStatus]}</p>
            <p className="text-xs text-slate-500">{s('website').done} updates done this month</p>
          </div>
          <Stat label="📢 Ads" done={s('ads').done} total={s('ads').planned} sub="campaigns done / planned" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card title="Details" className="lg:col-span-2">
          <div className="grid gap-5 p-5 sm:grid-cols-2">
            <Info label="Client name">{client.name}</Info>
            <Info label="Business name">{client.businessName}</Info>
            <Info label="Phone">{client.phone && <a href={`tel:${client.phone}`} className="inline-flex items-center gap-1 text-brand"><Phone size={13} />{client.phone}</a>}</Info>
            <Info label="Email">{client.email && <a href={`mailto:${client.email}`} className="inline-flex items-center gap-1 text-brand"><Mail size={13} />{client.email}</a>}</Info>
            <Info label="Instagram">{client.instagram && <a href={client.instagram} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand">Open page <ExternalLink size={12} /></a>}</Info>
            <Info label="Start date">{fmtFull(client.startDate)}</Info>
            <div className="sm:col-span-2"><Info label="Services"><span className="flex flex-wrap gap-1.5">{client.services?.length ? client.services.map((x) => <Badge key={x}>{x}</Badge>) : '—'}</span></Info></div>
            {isAdmin && <Info label="Package">{rupees(client.monthlyPackage)} / month</Info>}
            <Info label="Content language">{client.language}</Info>
            {client.brandNotes && <div className="sm:col-span-2"><Info label="Brand notes"><span className="whitespace-pre-line">{client.brandNotes}</span></Info></div>}
          </div>
        </Card>

        <Card title="Team" action={<Button variant="ghost" onClick={() => setModal('team')}><Users size={15} /> Assign</Button>}>
          <ul className="divide-y divide-slate-100">
            {TEAM_SLOTS.map((slot) => {
              const p = client.team?.[slot.key]
              return (
                <li key={slot.key} className="flex items-center gap-3 px-5 py-2.5">
                  {p ? <Avatar name={p.name} photo={p.photo} size="h-7 w-7" /> : <span className="h-7 w-7 rounded-full border border-dashed border-slate-300" />}
                  <div className="min-w-0 flex-1"><p className="text-xs text-slate-500">{slot.label}</p><p className="truncate text-sm text-slate-900">{p?.name ?? '—'}</p></div>
                </li>
              )
            })}
          </ul>
        </Card>
      </div>

      {isAdmin && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card title="Update Payment">
            <div className="space-y-3 p-5">
              <Input type="month" value={pay.month} onChange={(e) => setPay({ ...pay, month: e.target.value })} />
              <Input type="number" placeholder={`Amount (default ${rupees(client.monthlyPackage)})`} value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} />
              <div className="flex gap-2"><Button className="flex-1" onClick={() => savePayment('paid')}>Mark Paid</Button><Button variant="outline" className="flex-1" onClick={() => savePayment('pending')}>Pending</Button></div>
            </div>
          </Card>
          <Card title="Payment History" className="lg:col-span-2">
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
      {isAdmin && <Button variant="danger" onClick={removeClient}>Delete client</Button>}

      {modal === 'edit' && <ClientForm client={client} onClose={() => setModal(null)} onSaved={() => { setModal(null); reload() }} />}
      {modal === 'team' && <TeamAssign client={client} users={members} onClose={() => setModal(null)} onSaved={() => { setModal(null); reload() }} />}
    </div>
  )
}
