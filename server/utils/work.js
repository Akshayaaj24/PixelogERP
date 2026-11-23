// Shared rules for work items (also mirrored in client/src/lib/work.js)
export const TYPES = ['reel', 'poster', 'website', 'ads', 'other']
export const STATUSES = ['start', 'processing', 'waiting', 'approved', 'done']
export const PERSON_KEYS = ['script', 'shoot', 'editing', 'work']

export const stagesFor = (type) => (type === 'reel' ? ['script', 'shoot', 'editing'] : ['work'])
export const STAGE_LABEL = { script: 'Script', shoot: 'Shoot', editing: 'Editing', work: 'Work' }
export const STATUS_LABEL = { start: 'Start', processing: 'Processing', waiting: 'Waiting for Approval', approved: 'Approved', done: 'Done' }

const same = (a, b) => a && b && String(a._id ?? a) === String(b._id ?? b)

// New work gets people from the client's team
export function autofillPeople(type, team = {}, people = {}) {
  const p = { ...people }
  if (type === 'reel') {
    for (const k of ['script', 'shoot', 'editing']) p[k] = p[k] || team[k] || undefined
  } else {
    const key = { poster: 'poster', website: 'website', ads: 'ads' }[type]
    p.work = p.work || (key && team[key]) || undefined
  }
  return p
}

export const currentAssignee = (w) => w.people?.[w.stage]

// MongoDB filter: work where this person is in any stage
export const involving = (uid) => ({ $or: PERSON_KEYS.map((k) => ({ [`people.${k}`]: uid })) })

// For one person: is their part 'done', 'active' (their turn) or 'upcoming' (waiting for others)?
export function stepState(w, uid) {
  const stages = stagesFor(w.type)
  const mine = stages.filter((s) => same(w.people?.[s], uid))
  if (!mine.length) return null
  if (w.status === 'done') return 'done'
  const cur = stages.indexOf(w.stage)
  const states = mine.map((s) => {
    const i = stages.indexOf(s)
    if (i < cur) return 'done'
    if (i > cur) return 'upcoming'
    return w.status === 'approved' ? 'done' : 'active'
  })
  return states.includes('active') ? 'active' : states.includes('upcoming') ? 'upcoming' : 'done'
}
