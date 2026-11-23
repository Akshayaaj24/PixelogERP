import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, ExternalLink } from 'lucide-react'
import { useAuth } from '../context/Auth'
import useFetch from '../lib/useFetch'
import { put } from '../lib/api'
import { rupees, clientName, WEBSITE_STATUS } from '../lib/constants'
import ClientForm from '../components/ClientForm'
import { Badge, Button, Card, ClientLogo, Empty, ErrorBox, Loading, PageHeader, Tabs, Toggle } from '../components/ui'

const Count = ({ label, x, target }) => (
  <div className="text-center"><p className="text-sm font-semibold text-slate-900">{x?.done ?? 0}<span className="font-normal text-slate-400">/{target || x?.planned || 0}</span></p><p className="text-[11px] text-slate-500">{label}</p></div>
)

export default function Clients() {
  const { isAdmin } = useAuth()
  const { data, setData, loading, error, reload } = useFetch('/clients?status=all')
  const [status, setStatus] = useState('active')
  const [q, setQ] = useState('')
  const [adding, setAdding] = useState(false)

  const list = useMemo(() => (data ?? []).filter((c) => (status === 'all' || (status === 'active' ? c.status === 'active' : c.status !== 'active')) && `${c.name} ${c.businessName}`.toLowerCase().includes(q.toLowerCase())), [data, status, q])
  const toggle = async (c, on) => {
    const updated = await put(`/clients/${c._id}`, { status: on ? 'active' : 'inactive' })
    setData(data.map((x) => (x._id === c._id ? { ...x, status: updated.status } : x)))
  }

  return (
    <div>
      <PageHeader title="Clients" subtitle={`${(data ?? []).filter((c) => c.status === 'active').length} active · this month's work shown as done / target`}>
        {isAdmin && <Button onClick={() => setAdding(true)}><Plus size={16} /> Add Client</Button>}
      </PageHeader>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Tabs tabs={[{ key: 'active', label: 'Active' }, { key: 'inactive', label: 'Inactive' }, { key: 'all', label: 'All' }]} value={status} onChange={setStatus} />
        <div className="relative min-w-48 flex-1 sm:max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search clients" className="w-full rounded-lg border border-slate-200 bg-surface py-2 pl-9 pr-3 text-sm outline-none focus:border-brand" />
        </div>
      </div>
      <ErrorBox text={error} />

      {loading && !data ? <Card><Loading /></Card> : !list.length ? <Card><Empty text="No clients found." /></Card> : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((c) => (
            <Card key={c._id} className="flex flex-col">
              <Link to={`/clients/${c._id}`} className="flex items-center gap-3 p-5 pb-3">
                <ClientLogo client={c} size="h-12 w-12" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-900">{clientName(c)}</p>
                  <p className="truncate text-sm text-slate-500">{c.businessName ? c.name : c.category}</p>
                </div>
              </Link>
              <div className="flex flex-wrap gap-1.5 px-5">{c.services?.map((s) => <Badge key={s}>{s}</Badge>)}</div>
              <div className="mt-4 grid grid-cols-3 border-y border-slate-100 py-3">
                <Count label="Reels" x={c.month?.reel} target={c.reelsPerMonth} />
                <Count label="Posters" x={c.month?.poster} target={c.postersPerMonth} />
                <div className="text-center"><p className="text-sm font-semibold text-slate-900">{WEBSITE_STATUS[c.websiteStatus] ?? '—'}</p><p className="text-[11px] text-slate-500">Website</p></div>
              </div>
              <div className="mt-auto flex items-center gap-3 px-5 py-3 text-sm">
                {c.instagram ? <a href={c.instagram} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand">Instagram <ExternalLink size={12} /></a> : <span className="text-slate-400">No Instagram</span>}
                {isAdmin && <span className="font-medium text-slate-700">{rupees(c.monthlyPackage)}<span className="text-slate-400">/mo</span></span>}
                <span className="ml-auto">{isAdmin ? <Toggle checked={c.status === 'active'} onChange={(on) => toggle(c, on)} /> : <Badge cls={c.status === 'active' ? 'bg-green-100 text-green-800' : ''}>{c.status === 'active' ? 'Active' : 'Inactive'}</Badge>}</span>
              </div>
            </Card>
          ))}
        </div>
      )}
      {adding && <ClientForm onClose={() => setAdding(false)} onSaved={() => { setAdding(false); reload() }} />}
    </div>
  )
}
