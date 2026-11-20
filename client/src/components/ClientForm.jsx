import { useState } from 'react'
import { post, put } from '../lib/api'
import { SERVICES, toInputDate } from '../lib/constants'
import { Button, ErrorBox, Field, Input, Modal, Select, Textarea } from './ui'

const EMPTY = { name: '', contactPerson: '', phone: '', email: '', category: '', instagram: '', services: [], monthlyPackage: 0, reelsPerMonth: 0, status: 'active', language: 'English', brandNotes: '', startDate: new Date() }

export default function ClientForm({ client, users = [], onClose, onSaved }) {
  const [f, setF] = useState({ ...EMPTY, ...client, manager: client?.manager?._id ?? client?.manager ?? '' })
  const [error, setError] = useState('')
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const toggle = (s) => setF({ ...f, services: f.services.includes(s) ? f.services.filter((x) => x !== s) : [...f.services, s] })

  const save = async () => {
    if (!f.name.trim()) return setError('Client name is required')
    try {
      const body = { ...f, manager: f.manager || undefined, monthlyPackage: Number(f.monthlyPackage) || 0, reelsPerMonth: Number(f.reelsPerMonth) || 0 }
      const saved = client?._id ? await put(`/clients/${client._id}`, body) : await post('/clients', body)
      onSaved(saved)
    } catch (e) { setError(e.message) }
  }

  return (
    <Modal title={client?._id ? 'Edit Client' : 'Add Client'} onClose={onClose} wide
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={save}>Save</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Client / Business name *"><Input value={f.name} onChange={set('name')} /></Field>
        <Field label="Business category"><Input placeholder="Jewellery, Restaurant…" value={f.category} onChange={set('category')} /></Field>
        <Field label="Contact person"><Input value={f.contactPerson} onChange={set('contactPerson')} /></Field>
        <Field label="Phone"><Input value={f.phone} onChange={set('phone')} /></Field>
        <Field label="Email"><Input type="email" value={f.email} onChange={set('email')} /></Field>
        <Field label="Instagram handle"><Input placeholder="@handle" value={f.instagram} onChange={set('instagram')} /></Field>
        <Field label="Monthly package (₹)"><Input type="number" value={f.monthlyPackage} onChange={set('monthlyPackage')} /></Field>
        <Field label="Reels per month"><Input type="number" value={f.reelsPerMonth} onChange={set('reelsPerMonth')} /></Field>
        <Field label="Account manager">
          <Select value={f.manager} onChange={set('manager')}>
            <option value="">—</option>
            {users.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
          </Select>
        </Field>
        <Field label="Start date"><Input type="date" value={toInputDate(f.startDate)} onChange={set('startDate')} /></Field>
        <Field label="Status">
          <Select value={f.status} onChange={set('status')}>
            <option value="active">Active</option><option value="paused">Paused</option><option value="ended">Ended</option>
          </Select>
        </Field>
        <Field label="Content language">
          <Select value={f.language} onChange={set('language')}>
            <option>English</option><option>Tamil</option><option>Tanglish</option>
          </Select>
        </Field>
        <div className="sm:col-span-2">
          <span className="mb-1 block text-xs font-medium text-slate-600">Services</span>
          <div className="flex flex-wrap gap-2">
            {SERVICES.map((s) => (
              <button type="button" key={s} onClick={() => toggle(s)}
                className={`rounded-lg border px-3 py-1.5 text-sm ${f.services.includes(s) ? 'border-brand bg-blue-50 text-brand' : 'border-slate-200 text-slate-600'}`}>{s}</button>
            ))}
          </div>
        </div>
        <Field label="Brand notes (tone, offers, festivals — used by AI later)" className="sm:col-span-2">
          <Textarea value={f.brandNotes} onChange={set('brandNotes')} placeholder="e.g. Premium bridal jewellery. Elegant tone. Push wedding season & Akshaya Tritiya." />
        </Field>
      </div>
      <div className="mt-4"><ErrorBox text={error} /></div>
    </Modal>
  )
}
