import Activity from '../models/Activity.js'

export function log(user, text, notify = []) {
  const ids = [...new Set(notify.filter(Boolean).map(String))].filter((id) => id !== String(user?._id))
  return Activity.create({ user: user?._id, text, notify: ids }).catch(() => {})
}
