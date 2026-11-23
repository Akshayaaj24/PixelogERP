// ── Work items ──────────────────────────────────────
// chip = soft pastel used on the calendar (same in both themes, adjusts automatically in dark)
export const TYPES = [
  { key: 'reel', label: 'Reel', icon: '🎬', chip: 'bg-violet-100 text-violet-800 border-violet-400', dot: 'bg-violet-400' },
  { key: 'poster', label: 'Poster', icon: '🖼️', chip: 'bg-pink-100 text-pink-800 border-pink-400', dot: 'bg-pink-400' },
  { key: 'website', label: 'Website', icon: '🌐', chip: 'bg-sky-100 text-sky-800 border-sky-400', dot: 'bg-sky-400' },
  { key: 'ads', label: 'Ads', icon: '📢', chip: 'bg-amber-100 text-amber-800 border-amber-400', dot: 'bg-amber-400' },
  { key: 'other', label: 'Other', icon: '📝', chip: 'bg-teal-100 text-teal-800 border-teal-400', dot: 'bg-teal-400' },
]
export const typeOf = (k) => TYPES.find((t) => t.key === k) ?? TYPES[4]

export const STATUSES = [
  { key: 'start', label: 'Start', cls: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' },
  { key: 'processing', label: 'Processing', cls: 'bg-blue-50 text-blue-700', dot: 'bg-blue-500' },
  { key: 'waiting', label: 'Waiting for Approval', short: 'Waiting', cls: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
  { key: 'approved', label: 'Approved', cls: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  { key: 'done', label: 'Done', cls: 'bg-green-100 text-green-800', dot: 'bg-green-500' },
]
export const statusOf = (k) => STATUSES.find((s) => s.key === k) ?? STATUSES[0]

export const stagesFor = (type) => (type === 'reel' ? ['script', 'shoot', 'editing'] : ['work'])
export const STAGE_LABEL = { script: 'Script', shoot: 'Shoot', editing: 'Editing', work: 'Work' }
// Who does each step (label shown on forms)
export const PERSON_LABEL = { script: 'Script writer', shoot: 'Videographer', editing: 'Video editor', work: 'Assigned to' }
export const WORK_PERSON_LABEL = { poster: 'Designer', website: 'Developer', ads: 'Ads person', other: 'Assigned to' }

// Client team slots (manager assigns once; new work is auto-filled)
export const TEAM_SLOTS = [
  { key: 'script', label: 'Script writer' },
  { key: 'shoot', label: 'Videographer' },
  { key: 'editing', label: 'Video editor' },
  { key: 'poster', label: 'Poster designer' },
  { key: 'website', label: 'Web developer' },
  { key: 'ads', label: 'Ads' },
]

export const SERVICES = ['Digital Marketing', 'Meta Ads', 'Google Ads', 'Website', 'Video Production', 'Software']
export const WEBSITE_STATUS = { none: '—', in_progress: 'In progress', live: 'Live' }

const same = (a, b) => a && b && String(a._id ?? a) === String(b._id ?? b)
// For one person: 'done' | 'active' (their turn) | 'upcoming' (waiting for others) | null
export function stepState(w, uid) {
  const stages = stagesFor(w.type)
  const mine = stages.filter((s) => same(w.people?.[s], uid))
  if (!mine.length) return null
  if (w.status === 'done') return 'done'
  const cur = stages.indexOf(w.stage)
  const states = mine.map((s) => { const i = stages.indexOf(s); return i < cur ? 'done' : i > cur ? 'upcoming' : w.status === 'approved' ? 'done' : 'active' })
  return states.includes('active') ? 'active' : states.includes('upcoming') ? 'upcoming' : 'done'
}
export const currentPerson = (w) => w.people?.[w.stage]

// ── Formatting ──────────────────────────────────────
export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—')
export const fmtFull = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—')
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
export const todayStr = () => toInputDate(new Date())
export const isOverdue = (d, done) => !done && d && toInputDate(d) < todayStr()
export const thisMonth = () => todayStr().slice(0, 7)
export const clientName = (c) => c?.businessName || c?.name || '—'
