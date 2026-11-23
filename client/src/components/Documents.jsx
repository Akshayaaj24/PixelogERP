import { useState } from 'react'
import { FileText, Trash2, Upload } from 'lucide-react'
import useFetch from '../lib/useFetch'
import { del, post } from '../lib/api'
import { fileToBase64 } from '../lib/image'
import { fmtFull } from '../lib/constants'
import { ErrorBox, Select } from './ui'

const KINDS = { agreement: 'Agreement', aadhaar: 'Aadhaar', certificate: 'Certificate', other: 'Other' }
const kb = (n) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`)

// Admin only — agreement, Aadhaar, certificates
export default function Documents({ userId }) {
  const { data, setData, error: loadError } = useFetch(`/users/${userId}/documents`)
  const [kind, setKind] = useState('agreement')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const upload = async (e) => {
    const file = e.target.files?.[0]; e.target.value = ''
    if (!file) return
    if (file.size > 3 * 1024 * 1024) return setError('File is bigger than 3 MB. Please compress it.')
    setBusy(true); setError('')
    try {
      const doc = await post(`/users/${userId}/documents`, { kind, name: file.name, mime: file.type, data: await fileToBase64(file) })
      setData([doc, ...(data ?? [])])
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  const open = async (d) => {
    const base = (import.meta.env.VITE_API_URL || '') + '/api'
    const res = await fetch(`${base}/users/${userId}/documents/${d._id}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
    if (!res.ok) return setError('Could not open file')
    const url = URL.createObjectURL(await res.blob())
    const a = document.createElement('a'); a.href = url; a.target = '_blank'; a.rel = 'noreferrer'; a.click()
    setTimeout(() => URL.revokeObjectURL(url), 60000)
  }
  const remove = async (d) => {
    if (!window.confirm(`Delete ${d.name}?`)) return
    await del(`/users/${userId}/documents/${d._id}`); setData(data.filter((x) => x._id !== d._id))
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="w-40"><Select value={kind} onChange={(e) => setKind(e.target.value)}>{Object.entries(KINDS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></div>
        <label className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-medium text-slate-50 hover:bg-slate-800 ${busy ? 'opacity-50' : ''}`}>
          <Upload size={15} /> {busy ? 'Uploading…' : 'Upload PDF / image'}
          <input type="file" accept="application/pdf,image/png,image/jpeg,image/webp" className="hidden" onChange={upload} disabled={busy} />
        </label>
        <span className="text-xs text-slate-400">Max 3 MB · only Admin can see these</span>
      </div>
      <ErrorBox text={error || loadError} />
      <ul className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200">
        {!data?.length && <li className="px-4 py-6 text-center text-sm text-slate-400">No documents yet.</li>}
        {data?.map((d) => (
          <li key={d._id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
            <FileText size={18} className="shrink-0 text-slate-400" />
            <button onClick={() => open(d)} className="min-w-0 flex-1 text-left">
              <span className="block truncate font-medium text-slate-900 hover:text-brand">{d.name}</span>
              <span className="text-xs text-slate-500">{KINDS[d.kind]} · {kb(d.size)} · {fmtFull(d.createdAt)}</span>
            </button>
            <button onClick={() => remove(d)} className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label="Delete"><Trash2 size={15} /></button>
          </li>
        ))}
      </ul>
    </div>
  )
}
