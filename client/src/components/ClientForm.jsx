import { useState } from 'react'
import { post, put } from '../lib/api'
import { SERVICES, toInputDate } from '../lib/constants'
import { Button, ErrorBox, Field, ImagePicker, Input, Modal, MultiSelect, Select, Textarea, Toggle } from './ui'

const EMPTY = { name: '', businessName: '', logo: '', instagram: '', phone: '', email: '', status: 'active', startDate: new Date(), services: [], monthlyPackage: 0, reelsPerMonth: 0, postersPerMonth: 0, websiteStatus: 'none', language: 'English', brandNotes: '', category: '' }

// Admin only: add / edit a client
export default function ClientForm({ client, onClose, onSaved }) {
  const [f, setF] = useState({ ...EMPTY, ...client, startDate: toInputDate(client?.startDate ?? new Date()) })
  const [error, setError] = useState('')
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  const save = async () => {
    if (!f.name.trim() && !f.businessName.trim()) return setError('Client name or business name is required')
    const instagram = f.instagram.trim() && !/^https?:\/\//.test(f.instagram.trim()) ? `https://instagram.com/${f.instagram.trim().replace(/^@/, '')}` : f.instagram.trim()
    const body = { ...f, name: f.name.trim() || f.businessName.trim(), instagram, monthlyPackage: Number(f.monthlyPackage) || 0, reelsPerMonth: Number(f.reelsPerMonth) || 0, postersPerMonth: Number(f.postersPerMonth) || 0 }
    delete body.team; delete body.month
    try { onSaved(client?._id ? await put(`/clients/${client._id}`, body) : await post('/clients', body)) } catch (e) { setError(e.message) }
  }

  return (
    <Modal title={client?._id ? 'Edit Client' : 'Add Client'} onClose={onClose} wide
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={save}>Save</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><span className="mb-1 block text-xs font-medium text-slate-600">Logo</span><ImagePicker value={f.logo} onChange={(logo) => setF({ ...f, logo })} onError={setError} label="Upload logo" /></div>
        <Field label="Client name *"><Input value={f.name} onChange={set('name')} placeholder="e.g. Shri Sai" /></Field>
        <Field label="Business name"><Input value={f.businessName} onChange={set('businessName')} placeholder="e.g. Shri Sai Bridal Jewels" /></Field>
        <Field label="Instagram link"><Input value={f.instagram} onChange={set('instagram')} placeholder="https://instagram.com/… or @handle" /></Field>
        <Field label="Phone"><Input value={f.phone} onChange={set('phone')} /></Field>
        <Field label="Email"><Input type="email" value={f.email} onChange={set('email')} /></Field>
        <Field label="Start date"><Input type="date" value={f.startDate} onChange={set('startDate')} /></Field>
        <Field label="Services" className="sm:col-span-2"><MultiSelect options={SERVICES} value={f.services} onChange={(services) => setF({ ...f, services })} placeholder="Select services" /></Field>
        <Field label="Package amount (₹ / month)"><Input type="number" value={f.monthlyPackage} onChange={set('monthlyPackage')} /></Field>
        <div><span className="mb-1 block text-xs font-medium text-slate-600">Status</span><div className="py-1.5"><Toggle checked={f.status === 'active'} onChange={(on) => setF({ ...f, status: on ? 'active' : 'inactive' })} label={f.status === 'active' ? 'Active' : 'Inactive'} /></div></div>
        <Field label="Reels per month"><Input type="number" value={f.reelsPerMonth} onChange={set('reelsPerMonth')} /></Field>
        <Field label="Posters per month"><Input type="number" value={f.postersPerMonth} onChange={set('postersPerMonth')} /></Field>
        <Field label="Website">
          <Select value={f.websiteStatus} onChange={set('websiteStatus')}><option value="none">No website</option><option value="in_progress">In progress</option><option value="live">Live</option></Select>
        </Field>
        <Field label="Content language (for AI)">
          <Select value={f.language} onChange={set('language')}><option>English</option><option>Tamil</option><option>Tanglish</option></Select>
        </Field>
        <Field label="Brand notes (tone, products, offers — used by AI)" className="sm:col-span-2"><Textarea value={f.brandNotes} onChange={set('brandNotes')} /></Field>
      </div>
      <div className="mt-4"><ErrorBox text={error} /></div>
    </Modal>
  )
}
