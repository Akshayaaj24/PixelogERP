import { useState } from 'react'
import { Plus, Phone, Mail } from 'lucide-react'
import { useAuth } from '../context/Auth'
import useFetch from '../lib/useFetch'
import { post, put } from '../lib/api'
import { fmtFull, toInputDate } from '../lib/constants'
import Documents from '../components/Documents'
import { Avatar, Badge, Button, Card, Empty, ErrorBox, Field, ImagePicker, Input, Loading, Modal, PageHeader, Select, Tabs } from '../components/ui'

const ROLES = ['Video Editor', 'Script Writer', 'Videographer', 'Graphic Designer', 'Web Developer', 'Software Developer', 'Social Media Manager', 'Digital Marketing Executive', 'Operations Manager']
const ROLE_LABEL = { admin: 'Admin', manager: 'Manager', member: 'Member' }
const daysLeft = (d) => (d ? Math.ceil((new Date(d) - new Date()) / 864e5) : null)

function BondBadge({ date }) {
  const n = daysLeft(date)
  if (n === null) return null
  if (n < 0) return <Badge cls="bg-slate-100 text-slate-500">Bond ended</Badge>
  if (n <= 30) return <Badge cls="bg-violet-50 text-violet-700">Bond ends in {n} days</Badge>
  return null
}

function MemberForm({ member, onClose, onSaved }) {
  const [tab, setTab] = useState('details')
  const [f, setF] = useState({ name: '', email: '', phone: '', designation: '', role: 'member', active: true, password: '', photo: '', ...member, joiningDate: toInputDate(member?.joiningDate ?? new Date()), bondEndDate: toInputDate(member?.bondEndDate) })
  const [error, setError] = useState('')
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const save = async () => {
    if (!f.name || !f.email) return setError('Name and email are required')
    if (!member && f.password.length < 6) return setError('Password must be at least 6 characters')
    try {
      const body = { ...f, active: f.active === true || f.active === 'true' }
      if (!body.password) delete body.password
      delete body.stats
      onSaved(member ? await put(`/users/${member._id}`, body) : await post('/users', body))
    } catch (e) { setError(e.message) }
  }
  return (
    <Modal title={member ? member.name : 'Add Team Member'} onClose={onClose} wide
      footer={tab === 'details' && <><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={save}>Save</Button></>}>
      {member && <div className="mb-5"><Tabs tabs={[{ key: 'details', label: 'Details' }, { key: 'docs', label: 'Documents' }]} value={tab} onChange={setTab} /></div>}
      {tab === 'docs' ? <Documents userId={member._id} /> : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><span className="mb-1 block text-xs font-medium text-slate-600">Photo</span><ImagePicker round value={f.photo} onChange={(photo) => setF({ ...f, photo })} onError={setError} label="Upload photo" /></div>
            <Field label="Name *"><Input value={f.name} onChange={set('name')} /></Field>
            <Field label="Email (login) *"><Input type="email" value={f.email} onChange={set('email')} /></Field>
            <Field label="Phone"><Input value={f.phone} onChange={set('phone')} /></Field>
            <Field label="Designation">
              <Input list="designations" value={f.designation} onChange={set('designation')} />
              <datalist id="designations">{ROLES.map((r) => <option key={r} value={r} />)}</datalist>
            </Field>
            <Field label="Access">
              <Select value={f.role} onChange={set('role')}><option value="member">Member (editor, writer, developer…)</option><option value="manager">Manager</option><option value="admin">Admin</option></Select>
            </Field>
            <Field label="Date of joining"><Input type="date" value={f.joiningDate} onChange={set('joiningDate')} /></Field>
            <Field label="Bond end date"><Input type="date" value={f.bondEndDate} onChange={set('bondEndDate')} /></Field>
            {member && <Field label="Account"><Select value={String(f.active)} onChange={set('active')}><option value="true">Active</option><option value="false">Disabled (cannot log in)</option></Select></Field>}
            <Field label={member ? 'Reset password (optional)' : 'Password *'}><Input type="text" value={f.password} onChange={set('password')} /></Field>
          </div>
          {!member && <p className="mt-4 text-xs text-slate-500">Upload agreement, Aadhaar and certificates after saving (open the member → Documents).</p>}
          <div className="mt-4"><ErrorBox text={error} /></div>
        </>
      )}
    </Modal>
  )
}

export default function Team() {
  const { isAdmin } = useAuth()
  const { data, loading, error, reload } = useFetch('/users?stats=1')
  const [editing, setEditing] = useState(null)
  const list = (data ?? []).filter((m) => isAdmin || m.active)

  return (
    <div>
      <PageHeader title="Team" subtitle={`${list.filter((m) => m.active).length} people`}>
        {isAdmin && <Button onClick={() => setEditing({ new: true })}><Plus size={16} /> Add Member</Button>}
      </PageHeader>
      <ErrorBox text={error} />
      {loading && !data ? <Card><Loading /></Card> : !list.length ? <Card><Empty /></Card> : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((m) => (
            <Card key={m._id} className={m.active ? '' : 'opacity-60'}>
              <button onClick={() => isAdmin && setEditing(m)} className={`flex w-full items-center gap-4 p-5 text-left ${isAdmin ? 'hover:bg-slate-50' : 'cursor-default'}`}>
                <Avatar name={m.name} photo={m.photo} size="h-14 w-14 text-lg" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-900">{m.name} {m.role !== 'member' && <Badge cls="bg-blue-50 text-brand">{ROLE_LABEL[m.role]}</Badge>}</p>
                  <p className="truncate text-sm text-slate-500">{m.designation || '—'}</p>
                  <div className="mt-1 flex flex-wrap gap-1">{!m.active && <Badge>Disabled</Badge>}{isAdmin && <BondBadge date={m.bondEndDate} />}</div>
                </div>
              </button>
              <div className="space-y-1.5 border-t border-slate-100 px-5 py-3 text-sm">
                {m.phone && <a href={`tel:${m.phone}`} className="flex items-center gap-2 text-slate-600 hover:text-brand"><Phone size={14} /> {m.phone}</a>}
                {m.email && <a href={`mailto:${m.email}`} className="flex items-center gap-2 truncate text-slate-600 hover:text-brand"><Mail size={14} /> {m.email}</a>}
                {isAdmin && <p className="text-xs text-slate-400">Joined {fmtFull(m.joiningDate)}{m.bondEndDate ? ` · Bond till ${fmtFull(m.bondEndDate)}` : ''}</p>}
              </div>
              {m.stats && (
                <div className="grid grid-cols-4 border-t border-slate-100 py-3 text-center">
                  {[['Today', m.stats.today], ['Open', m.stats.open], ['Overdue', m.stats.overdue, m.stats.overdue ? 'text-red-600' : ''], ['Done 30d', m.stats.doneMonth, 'text-green-700']].map(([l, v, c]) => (
                    <div key={l}><p className={`text-sm font-semibold ${c || 'text-slate-900'}`}>{v}</p><p className="text-[11px] text-slate-500">{l}</p></div>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
      {editing && <MemberForm member={editing.new ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload() }} />}
    </div>
  )
}
