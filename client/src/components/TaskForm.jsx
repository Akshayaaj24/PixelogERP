import { useState } from 'react'
import { useAuth } from '../context/Auth'
import { del, post, put } from '../lib/api'
import { TASK_CATEGORIES, TASK_STATUS, toInputDate } from '../lib/constants'
import { Avatar, Button, ErrorBox, Field, Input, Modal, Select, Textarea } from './ui'

export default function TaskForm({ task: initial, clients = [], users = [], defaultClient, onClose, onSaved }) {
  const { isAdmin } = useAuth()
  const [task, setTask] = useState(initial)
  const [f, setF] = useState({
    title: initial?.title ?? '', client: initial?.client?._id ?? defaultClient ?? '', category: initial?.category ?? 'General',
    description: initial?.description ?? '', assignedTo: initial?.assignedTo?._id ?? '', priority: initial?.priority ?? 'medium',
    dueDate: toInputDate(initial?.dueDate), status: initial?.status ?? 'todo',
  })
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const locked = !isAdmin

  const save = async () => {
    if (!f.title.trim()) return setError('Task title is required')
    try {
      const body = isAdmin ? { ...f, client: f.client || null, assignedTo: f.assignedTo || null, dueDate: f.dueDate ? `${f.dueDate}T18:00:00` : null } : { status: f.status }
      onSaved(task ? await put(`/tasks/${task._id}`, body) : await post('/tasks', body))
    } catch (e) { setError(e.message) }
  }
  const addComment = async () => {
    if (!comment.trim()) return
    setTask(await post(`/tasks/${task._id}/comments`, { text: comment })); setComment('')
  }
  const remove = async () => {
    if (!window.confirm('Delete this task?')) return
    await del(`/tasks/${task._id}`); onSaved(null)
  }

  return (
    <Modal title={task ? 'Task' : 'New Task'} onClose={onClose} wide
      footer={<>
        {isAdmin && task && <Button variant="danger" className="mr-auto" onClick={remove}>Delete</Button>}
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={save}>Save</Button>
      </>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Task title *" className="sm:col-span-2"><Input value={f.title} onChange={set('title')} disabled={locked} /></Field>
        <Field label="Client">
          <Select value={f.client} onChange={set('client')} disabled={locked}>
            <option value="">— No client —</option>
            {clients.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
          </Select>
        </Field>
        <Field label="Category">
          <Select value={f.category} onChange={set('category')} disabled={locked}>{TASK_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</Select>
        </Field>
        <Field label="Assign to">
          <Select value={f.assignedTo} onChange={set('assignedTo')} disabled={locked}>
            <option value="">—</option>
            {users.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
          </Select>
        </Field>
        <Field label="Due date"><Input type="date" value={f.dueDate} onChange={set('dueDate')} disabled={locked} /></Field>
        <Field label="Priority">
          <Select value={f.priority} onChange={set('priority')} disabled={locked}>
            <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
          </Select>
        </Field>
        <Field label="Status">
          <Select value={f.status} onChange={set('status')}>{TASK_STATUS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}</Select>
        </Field>
        <Field label="Description" className="sm:col-span-2"><Textarea value={f.description} onChange={set('description')} disabled={locked} /></Field>
      </div>
      <div className="mt-4"><ErrorBox text={error} /></div>

      {task && (
        <div className="mt-6 border-t border-slate-100 pt-4">
          <p className="mb-3 text-sm font-semibold text-slate-900">Comments</p>
          <ul className="mb-3 space-y-3">
            {task.comments?.length ? task.comments.map((c) => (
              <li key={c._id} className="flex gap-2.5">
                <Avatar name={c.user?.name} size="h-7 w-7" />
                <div className="text-sm">
                  <span className="font-medium text-slate-900">{c.user?.name}</span>{' '}
                  <span className="text-xs text-slate-400">{new Date(c.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</span>
                  <p className="text-slate-600">{c.text}</p>
                </div>
              </li>
            )) : <li className="text-sm text-slate-400">No comments yet.</li>}
          </ul>
          <div className="flex gap-2">
            <Input value={comment} onChange={(e) => setComment(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addComment()} placeholder="Write a comment…" />
            <Button variant="outline" onClick={addComment}>Send</Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
