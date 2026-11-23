import { statusOf, typeOf, STAGE_LABEL } from '../lib/constants'
import { Badge } from './ui'

export function StatusBadge({ status, short }) {
  const s = statusOf(status)
  return <Badge cls={s.cls}>{short ? s.short ?? s.label : s.label}</Badge>
}

// "🎬 Editing" for reels, "🖼️ Poster" for others
export function TypeTag({ work }) {
  const t = typeOf(work.type)
  return <span className="whitespace-nowrap text-xs text-slate-500">{t.icon} {work.type === 'reel' ? STAGE_LABEL[work.stage] : t.label}</span>
}
