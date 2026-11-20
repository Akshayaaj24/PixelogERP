import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { useAuth } from '../context/Auth'
import useFetch from '../lib/useFetch'
import { rupees } from '../lib/constants'
import ClientForm from '../components/ClientForm'
import { Avatar, Badge, Button, Card, Empty, ErrorBox, Loading, PageHeader, Tabs } from '../components/ui'

const STATUS_CLS = { active: 'bg-green-100 text-green-800', paused: 'bg-amber-50 text-amber-700', ended: 'bg-slate-100 text-slate-500' }

export default function Clients() {
  const { isAdmin } = useAuth()
  const { data, loading, error, reload } = useFetch('/clients')
  const users = useFetch(isAdmin ? '/users' : null)
  const [status, setStatus] = useState('active')
  const [q, setQ] = useState('')
  const [adding, setAdding] = useState(false)

  const list = useMemo(
    () => (data ?? []).filter((c) => (status === 'all' || c.status === status) && c.name.toLowerCase().includes(q.toLowerCase())),
    [data, status, q]
  )

  return (
    <div>
      <PageHeader title="Clients" subtitle={`${(data ?? []).filter((c) => c.status === 'active').length} active clients`}>
        {isAdmin && <Button onClick={() => setAdding(true)}><Plus size={16} /> Add Client</Button>}
      </PageHeader>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Tabs tabs={[{ key: 'active', label: 'Active' }, { key: 'paused', label: 'Paused' }, { key: 'ended', label: 'Ended' }, { key: 'all', label: 'All' }]} value={status} onChange={setStatus} />
        <div className="relative min-w-48 flex-1 sm:max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search clients" className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-brand" />
        </div>
      </div>
      <ErrorBox text={error} />

      <Card>
        {loading ? <Loading /> : !list.length ? <Empty text="No clients found." /> : (
          <ul className="divide-y divide-slate-100">
            {list.map((c) => (
              <li key={c._id}>
                <Link to={`/clients/${c._id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50">
                  <Avatar name={c.name} size="h-10 w-10" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900">{c.name}</p>
                    <p className="truncate text-sm text-slate-500">{[c.category, c.services?.join(', ')].filter(Boolean).join(' · ')}</p>
                  </div>
                  <div className="hidden text-right text-sm sm:block">
                    {isAdmin && <p className="font-medium text-slate-900">{rupees(c.monthlyPackage)}<span className="text-slate-400">/mo</span></p>}
                    <p className="text-xs text-slate-500">{c.reelsPerMonth ? `${c.reelsPerMonth} reels/mo` : ''}</p>
                  </div>
                  <Badge cls={STATUS_CLS[c.status]}>{c.status}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {adding && <ClientForm users={users.data ?? []} onClose={() => setAdding(false)} onSaved={() => { setAdding(false); reload() }} />}
    </div>
  )
}
