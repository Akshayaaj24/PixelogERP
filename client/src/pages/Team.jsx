import { useState } from 'react'
import { Plus } from 'lucide-react'
import useFetch from '../lib/useFetch'
import { post, put } from '../lib/api'
import { fmtDate, toInputDate } from '../lib/constants'
import { Avatar, Badge, Button, Card, Empty, ErrorBox, Field, Input, Loading, Modal, PageHeader, Select } from '../components/ui'

const ROLES = ['Script Writer', 'Video Editor', 'Videographer', 'Social Media Manager', 'Website Developer', 'Digital Marketing Executive', 'Founder']

function MemberForm({ member, onClose, onSaved }) {
  const [f, setF] = useState({ name: '', email: '', phone: '', designation: '', role: 'employee', active: true, password: '', joiningDate: new Date(), ...member })
  const [error, setError] = useState('')
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const save = async () => {
    if (!f.name || !f.email) return setError('Name and email are required')
    if (!member && f.password.length < 6) return setError('Password must be at least 6 characters')
    try {
      const body = { ...f, active: f.active === true || f.active === 'true' }
      if (!body.password) delete body.password
      onSaved(member ? await put(`/users/${member._id}`, body) : await post('/users', body))
    } catch (e) { setError(e.message) }
  }
  return (
    <Modal title={member ? 'Edit Member' : 'Add Member'} onClose={onClose}
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={save}>Save</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name *"><Input value={f.name} onChange={set('name')} /></Field>
        <Field label="Email (login) *"><Input type="email" value={f.email} onChange={set('email')} /></Field>
        <Field label="Phone"><Input value={f.phone} onChange={set('phone')} /></Field>
        <Field label="Designation">
          <Input list="roles" value={f.designation} onChange={set('designation')} />
          <datalist id="roles">{ROLES.map((r) => <option key={r} value={r} />)}</datalist>
        </Field>
        <Field label="Access">
          <Select value={f.role} onChange={set('role')}><option value="employee">Employee</option><option value="admin">Admin</option></Select>
        </Field>
        <Field label="Joining date"><Input type="date" value={toInputDate(f.joiningDate)} onChange={set('joiningDate')} /></Field>
        {member && <Field label="Account"><Select value={String(f.active)} onChange={set('active')}><option value="true">Active</option><option value="false">Disabled</option></Select></Field>}
        <Field label={member ? 'Reset password (optional)' : 'Password *'}><Input type="text" value={f.password} onChange={set('password')} /></Field>
      </div>
      <div className="mt-4"><ErrorBox text={error} /></div>
    </Modal>
  )
}

export default function Team() {
  const { data, loading, error, reload } = useFetch('/users?stats=1')
  const [editing, setEditing] = useState(null)

  return (
    <div>
      <PageHeader title="Team" subtitle="Who is working on what">
        <Button onClick={() => setEditing({ new: true })}><Plus size={16} /> Add Member</Button>
      </PageHeader>
      <ErrorBox text={error} />
      <Card>
        {loading && !data ? <Loading /> : !data?.length ? <Empty /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-3 font-medium">Member</th>
                  <th className="px-3 py-3 text-center font-medium">Open tasks</th>
                  <th className="px-3 py-3 text-center font-medium">Open reels</th>
                  <th className="px-3 py-3 text-center font-medium">Overdue</th>
                  <th className="px-3 py-3 text-center font-medium">Completed</th>
                  <th className="px-5 py-3 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((m) => (
                  <tr key={m._id} onClick={() => setEditing(m)} className={`cursor-pointer hover:bg-slate-50 ${m.active ? '' : 'opacity-50'}`}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={m.name} />
                        <div>
                          <p className="font-medium text-slate-900">{m.name} {m.role === 'admin' && <Badge cls="bg-blue-50 text-brand">Admin</Badge>} {!m.active && <Badge>Disabled</Badge>}</p>
                          <p className="text-xs text-slate-500">{m.designation || '—'} · {m.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center font-medium">{m.stats.openTasks}</td>
                    <td className="px-3 py-3 text-center font-medium">{m.stats.openReels}</td>
                    <td className={`px-3 py-3 text-center font-medium ${m.stats.overdue ? 'text-red-600' : 'text-slate-400'}`}>{m.stats.overdue}</td>
                    <td className="px-3 py-3 text-center text-slate-500">{m.stats.doneTasks}</td>
                    <td className="px-5 py-3 text-slate-500">{fmtDate(m.joiningDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {editing && <MemberForm member={editing.new ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload() }} />}
    </div>
  )
}
