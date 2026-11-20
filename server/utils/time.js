// Vercel servers run in UTC (and don't allow setting TZ),
// so "today", "this week" and "this month" are calculated in Indian time here.
const OFF = 330 * 60000 // +5:30

const ist = (d = new Date()) => new Date(d.getTime() + OFF)
const back = (t) => new Date(t.getTime() - OFF)

export function dayStart(addDays = 0, d = new Date()) {
  const t = ist(d); t.setUTCHours(0, 0, 0, 0); t.setUTCDate(t.getUTCDate() + addDays)
  return back(t)
}
export function weekStart() {
  const t = ist(); t.setUTCHours(0, 0, 0, 0); t.setUTCDate(t.getUTCDate() - ((t.getUTCDay() + 6) % 7))
  return back(t)
}
export function monthRange(month = currentMonth()) {
  const [y, m] = month.split('-').map(Number)
  return { start: new Date(Date.UTC(y, m - 1, 1) - OFF), end: new Date(Date.UTC(y, m, 1) - OFF) }
}
export const currentMonth = () => ist().toISOString().slice(0, 7)
