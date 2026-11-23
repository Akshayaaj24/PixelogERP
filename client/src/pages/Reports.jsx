import { useState } from 'react'
import { Download, Printer, CheckCircle2, Hourglass, AlertTriangle, Timer, Film, IndianRupee, Wallet, Users } from 'lucide-react'
import useFetch from '../lib/useFetch'
import { rupees, thisMonth, fmtDate, typeOf, WEBSITE_STATUS } from '../lib/constants'
import { StatusBadge } from '../components/StatusBadge'
import { Avatar, Badge, Button, Card, ClientLogo, Empty, ErrorBox, Input, Loading, PageHeader, StatCard } from '../components/ui'

function downloadCSV(name, rows) {
  const csv = rows.map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' }))
  a.download = name; a.click()
}
const Stat = ({ label, value, cls = 'text-slate-900', icon, tone }) => <StatCard label={label} value={value} valueCls={cls} icon={icon} tone={tone} />
const frac = (x, target) => `${x?.done ?? 0} / ${target || x?.planned || 0}`
const th = 'px-3 py-3 text-center font-medium'

export default function Reports() {
  const [month, setMonth] = useState(thisMonth())
  const { data, loading, error } = useFetch(`/reports?month=${month}`)
  const monthName = new Date(month + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
  const isMember = data?.role === 'member'
  const isAdmin = data?.role === 'admin'

  const exportCSV = () => {
    if (isMember) return downloadCSV(`my-report-${month}.csv`, [['Date', 'Client', 'Type', 'Work', 'My part'], ...data.items.map((w) => [fmtDate(w.date), w.client, typeOf(w.type).label, w.title, w.myState])])
    downloadCSV(`pixelog-report-${month}.csv`, [
      ['Client', 'Reels done', 'Reels target', 'Posters done', 'Posters target', 'Website', 'Website updates', 'Ads done', 'Pending', 'Overdue', ...(isAdmin ? ['Amount', 'Payment'] : [])],
      ...data.clients.map((c) => [c.businessName || c.name, c.reel.done, c.reel.target || c.reel.planned, c.poster.done, c.poster.target || c.poster.planned, WEBSITE_STATUS[c.website.status], c.website.done, c.ads.done, c.pending, c.overdue, ...(isAdmin ? [c.amount, c.payment] : [])]),
      [],
      ['Team member', 'Designation', 'Assigned', 'Completed', 'Pending', 'Overdue', 'On time %'],
      ...data.team.map((t) => [t.name, t.designation, t.assigned, t.done, t.pending, t.overdue, t.onTime ?? '']),
    ])
  }

  return (
    <div>
      <PageHeader title={isMember ? 'My Report' : 'Reports'} subtitle={monthName}>
        <div className="w-40 print:hidden"><Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} /></div>
        <Button variant="outline" className="print:hidden" onClick={exportCSV} disabled={!data}><Download size={15} /> Excel</Button>
        <Button variant="outline" className="print:hidden" onClick={() => window.print()}><Printer size={15} /> PDF</Button>
      </PageHeader>
      <ErrorBox text={error} />
      {loading && !data ? <Loading /> : !data ? null : isMember ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat label="Completed" value={data.me.done} cls="text-green-700" icon={CheckCircle2} tone="green" />
            <Stat label="Pending" value={data.me.pending} cls="text-amber-600" icon={Hourglass} tone="amber" />
            <Stat label="Overdue" value={data.me.overdue} cls={data.me.overdue ? 'text-red-600' : 'text-slate-900'} icon={AlertTriangle} tone="red" />
            <Stat label="On time" value={data.me.onTime === null ? '—' : `${data.me.onTime}%`} icon={Timer} tone="blue" />
          </div>
          <Card title="My work this month">
            {!data.items.length ? <Empty /> : (
              <ul className="divide-y divide-slate-100">
                {data.items.map((w) => (
                  <li key={w._id} className="flex items-center gap-3 px-5 py-3 text-sm">
                    <span className="w-16 text-xs text-slate-500">{fmtDate(w.date)}</span>
                    <span className={`min-w-0 flex-1 truncate ${w.myState === 'done' ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{typeOf(w.type).icon} {w.title} <span className="text-slate-400">· {w.client}</span></span>
                    {w.myState === 'done' ? <Badge cls="bg-green-100 text-green-800">Done</Badge> : <StatusBadge status={w.status} short />}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat label="Work completed" value={`${data.company.done} / ${data.company.planned}`} icon={CheckCircle2} tone="green" />
            <Stat label="Reels · Posters done" value={`${data.company.reelsDone} · ${data.company.postersDone}`} icon={Film} tone="violet" />
            {isAdmin ? <Stat label="Received" value={rupees(data.company.revenuePaid)} cls="text-green-700" icon={IndianRupee} tone="teal" /> : <Stat label="Active clients" value={data.company.activeClients} icon={Users} tone="violet" />}
            {isAdmin ? <Stat label="Pending payments" value={rupees(data.company.revenuePending)} cls={data.company.revenuePending ? 'text-amber-600' : 'text-slate-900'} icon={Wallet} tone="amber" /> : <Stat label="Overdue" value={data.company.overdue} cls={data.company.overdue ? 'text-red-600' : 'text-slate-900'} icon={AlertTriangle} tone="red" />}
          </div>

          <Card title="Clients">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead><tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-3 font-medium">Client</th><th className={th}>🎬 Reels</th><th className={th}>🖼️ Posters</th><th className={th}>🌐 Website</th><th className={th}>📢 Ads</th>
                  <th className={th}>Pending</th><th className={th}>Overdue</th>{isAdmin && <th className="px-5 py-3 text-right font-medium">Payment</th>}
                </tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {data.clients.map((c) => (
                    <tr key={c._id}>
                      <td className="px-5 py-3"><span className="flex items-center gap-2.5"><ClientLogo client={c} size="h-7 w-7" /><span className="font-medium text-slate-900">{c.businessName || c.name}</span></span></td>
                      <td className="px-3 py-3 text-center">{frac(c.reel, c.reel.target)}</td>
                      <td className="px-3 py-3 text-center">{frac(c.poster, c.poster.target)}</td>
                      <td className="px-3 py-3 text-center text-xs">{WEBSITE_STATUS[c.website.status]}{c.website.planned ? ` · ${c.website.done}/${c.website.planned}` : ''}</td>
                      <td className="px-3 py-3 text-center">{c.ads.planned ? frac(c.ads) : '—'}</td>
                      <td className="px-3 py-3 text-center">{c.pending}</td>
                      <td className={`px-3 py-3 text-center ${c.overdue ? 'font-medium text-red-600' : 'text-slate-400'}`}>{c.overdue}</td>
                      {isAdmin && <td className="px-5 py-3 text-right"><span className="mr-2 text-slate-500">{rupees(c.amount)}</span><Badge cls={c.payment === 'paid' ? 'bg-green-100 text-green-800' : 'bg-amber-50 text-amber-700'}>{c.payment}</Badge></td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card title="Team">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-sm">
                <thead><tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-3 font-medium">Member</th><th className={th}>Assigned</th><th className={th}>Completed</th><th className={th}>Pending</th><th className={th}>Overdue</th><th className={th}>On time</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {data.team.map((t) => (
                    <tr key={t._id}>
                      <td className="px-5 py-3"><span className="flex items-center gap-2.5"><Avatar name={t.name} photo={t.photo} size="h-7 w-7" /><span><span className="font-medium text-slate-900">{t.name}</span> <span className="text-xs text-slate-500">{t.designation}</span></span></span></td>
                      <td className="px-3 py-3 text-center">{t.assigned}</td>
                      <td className="px-3 py-3 text-center text-green-700">{t.done}</td>
                      <td className="px-3 py-3 text-center">{t.pending}</td>
                      <td className={`px-3 py-3 text-center ${t.overdue ? 'font-medium text-red-600' : 'text-slate-400'}`}>{t.overdue}</td>
                      <td className="px-3 py-3 text-center">{t.onTime === null ? '—' : `${t.onTime}%`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
