import { useState } from 'react'
import { Download, Printer } from 'lucide-react'
import useFetch from '../lib/useFetch'
import { rupees, thisMonth } from '../lib/constants'
import { Badge, Button, Card, ErrorBox, Input, Loading, PageHeader } from '../components/ui'

function downloadCSV(name, rows) {
  const csv = rows.map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' }))
  a.download = name
  a.click()
}

export default function Reports() {
  const [month, setMonth] = useState(thisMonth())
  const { data, loading, error } = useFetch(`/reports?month=${month}`)
  const monthName = new Date(month + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })

  const exportCSV = () => downloadCSV(`pixelog-report-${month}.csv`, [
    ['Client', 'Reels planned', 'Target', 'Posted', 'Waiting approval', 'In progress', 'Tasks done', 'Amount', 'Payment'],
    ...data.clients.map((c) => [c.name, c.planned, c.target, c.posted, c.waiting, c.pending, c.tasksDone, c.amount, c.payment]),
    [],
    ['Team member', 'Role', 'Tasks assigned', 'Done', 'Pending', 'Overdue', 'Reels'],
    ...data.team.map((t) => [t.name, t.designation, t.assigned, t.done, t.pending, t.overdue, t.reels]),
  ])

  const c = data?.company
  return (
    <div>
      <PageHeader title="Reports" subtitle={monthName}>
        <div className="w-40 print:hidden"><Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} /></div>
        <Button variant="outline" className="print:hidden" onClick={exportCSV} disabled={!data}><Download size={15} /> Excel (CSV)</Button>
        <Button variant="outline" className="print:hidden" onClick={() => window.print()}><Printer size={15} /> PDF</Button>
      </PageHeader>
      <ErrorBox text={error} />
      {loading && !data ? <Loading /> : data && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              ['Reels posted', `${c.reelsPosted} / ${c.reelsPlanned}`],
              ['Tasks completed', c.tasksDone],
              ['Received', rupees(c.revenuePaid)],
              ['Pending payments', rupees(c.revenuePending), c.revenuePending > 0],
            ].map(([label, value, alert]) => (
              <div key={label} className="rounded-xl border border-slate-200 bg-white p-5">
                <p className="text-sm text-slate-500">{label}</p>
                <p className={`mt-2 text-2xl font-semibold ${alert ? 'text-amber-600' : 'text-slate-900'}`}>{value}</p>
              </div>
            ))}
          </div>

          <Card title="Clients">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead><tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-3 font-medium">Client</th><th className="px-3 py-3 text-center font-medium">Planned</th>
                  <th className="px-3 py-3 text-center font-medium">Posted</th><th className="px-3 py-3 text-center font-medium">Waiting</th>
                  <th className="px-3 py-3 text-center font-medium">In progress</th><th className="px-3 py-3 text-center font-medium">Tasks done</th>
                  <th className="px-5 py-3 text-right font-medium">Payment</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {data.clients.map((r) => (
                    <tr key={r._id}>
                      <td className="px-5 py-3 font-medium text-slate-900">{r.name}</td>
                      <td className="px-3 py-3 text-center">{r.planned}{r.target ? <span className="text-slate-400"> / {r.target}</span> : ''}</td>
                      <td className="px-3 py-3 text-center">{r.posted}</td>
                      <td className="px-3 py-3 text-center">{r.waiting}</td>
                      <td className="px-3 py-3 text-center">{r.pending}</td>
                      <td className="px-3 py-3 text-center">{r.tasksDone}</td>
                      <td className="px-5 py-3 text-right"><span className="mr-2 text-slate-500">{rupees(r.amount)}</span>
                        <Badge cls={r.payment === 'paid' ? 'bg-green-100 text-green-800' : 'bg-amber-50 text-amber-700'}>{r.payment}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card title="Team">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead><tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-3 font-medium">Member</th><th className="px-3 py-3 text-center font-medium">Tasks</th>
                  <th className="px-3 py-3 text-center font-medium">Done</th><th className="px-3 py-3 text-center font-medium">Pending</th>
                  <th className="px-3 py-3 text-center font-medium">Overdue</th><th className="px-3 py-3 text-center font-medium">Reels</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {data.team.map((t) => (
                    <tr key={t._id}>
                      <td className="px-5 py-3"><span className="font-medium text-slate-900">{t.name}</span> <span className="text-xs text-slate-500">{t.designation}</span></td>
                      <td className="px-3 py-3 text-center">{t.assigned}</td>
                      <td className="px-3 py-3 text-center">{t.done}</td>
                      <td className="px-3 py-3 text-center">{t.pending}</td>
                      <td className={`px-3 py-3 text-center ${t.overdue ? 'font-medium text-red-600' : ''}`}>{t.overdue}</td>
                      <td className="px-3 py-3 text-center">{t.reels}</td>
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
