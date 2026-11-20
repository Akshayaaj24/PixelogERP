export const STAGES = [
  { key: 'idea', label: 'Idea', cls: 'bg-slate-100 text-slate-600' },
  { key: 'script', label: 'Script', cls: 'bg-violet-50 text-violet-700' },
  { key: 'shoot', label: 'Shoot', cls: 'bg-sky-50 text-sky-700' },
  { key: 'editing', label: 'Editing', cls: 'bg-amber-50 text-amber-700' },
  { key: 'sent_to_owner', label: 'Sent to Owner', cls: 'bg-orange-50 text-orange-700' },
  { key: 'sent_to_client', label: 'Sent to Client', cls: 'bg-pink-50 text-pink-700' },
  { key: 'approved', label: 'Approved', cls: 'bg-emerald-50 text-emerald-700' },
  { key: 'posted', label: 'Posted', cls: 'bg-green-100 text-green-800' },
]
// Employees can move a reel only up to "Sent to Owner"
export const EMPLOYEE_STAGES = STAGES.slice(0, 5).map((s) => s.key)

export const TASK_STATUS = [
  { key: 'todo', label: 'To Do', cls: 'bg-slate-100 text-slate-600' },
  { key: 'in_progress', label: 'In Progress', cls: 'bg-blue-50 text-blue-700' },
  { key: 'review', label: 'Review', cls: 'bg-orange-50 text-orange-700' },
  { key: 'revision', label: 'Revision', cls: 'bg-pink-50 text-pink-700' },
  { key: 'on_hold', label: 'On Hold', cls: 'bg-slate-100 text-slate-500' },
  { key: 'done', label: 'Done', cls: 'bg-green-100 text-green-800' },
]

export const TASK_CATEGORIES = ['Script Writing', 'Video Shooting', 'Video Editing', 'Instagram Ads', 'Website Development', 'Client Revisions', 'General']
export const SERVICES = ['Instagram Reels', 'Instagram Ads', 'Video Production', 'Script Writing', 'Video Editing', 'Website Development']

export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—')
export const fmtTime = (t) => {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}
export const rupees = (n) => '₹' + Number(n || 0).toLocaleString('en-IN')
// Local date as YYYY-MM-DD (no UTC shift for India +5:30)
export const toInputDate = (d) => {
  if (!d) return ''
  const x = new Date(d)
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
}
export const isOverdue = (d, done) => !done && d && new Date(d) < new Date(new Date().setHours(0, 0, 0, 0))
export const thisMonth = () => toInputDate(new Date()).slice(0, 7)
