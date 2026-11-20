import { STAGES, TASK_STATUS } from '../lib/constants'
import { Badge } from './ui'

export function StageBadge({ stage }) {
  const s = STAGES.find((x) => x.key === stage) ?? STAGES[0]
  return <Badge cls={s.cls}>{s.label}</Badge>
}

export function TaskBadge({ status }) {
  const s = TASK_STATUS.find((x) => x.key === status) ?? TASK_STATUS[0]
  return <Badge cls={s.cls}>{s.label}</Badge>
}
