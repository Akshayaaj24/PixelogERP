import { useState } from 'react'
import { X, ChevronDown } from 'lucide-react'
import { resizeImage } from '../lib/image'

export function Button({ variant = 'primary', className = '', ...p }) {
  const v = {
    primary: 'bg-brand text-white hover:bg-brand/90',
    dark: 'bg-slate-900 text-slate-50 hover:bg-slate-800',
    outline: 'border border-slate-200 bg-surface text-slate-700 hover:bg-slate-50',
    ghost: 'text-slate-600 hover:bg-slate-100',
    danger: 'border border-red-200 bg-surface text-red-600 hover:bg-red-50',
  }[variant]
  return <button className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium disabled:opacity-50 ${v} ${className}`} {...p} />
}

const inputCls = 'w-full rounded-lg border border-slate-200 bg-surface px-3 py-2 text-sm outline-none focus:border-brand disabled:bg-slate-50'
export const Input = (p) => <input className={inputCls} {...p} />
export const Textarea = (p) => <textarea rows={3} className={inputCls} {...p} />
export const Select = ({ children, ...p }) => <select className={inputCls} {...p}>{children}</select>

export function Field({ label, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      {children}
    </label>
  )
}

export function Modal({ title, onClose, children, footer, wide }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className={`relative flex max-h-[92vh] w-full flex-col rounded-t-2xl bg-surface sm:rounded-2xl ${wide ? 'sm:max-w-2xl' : 'sm:max-w-lg'}`}>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h3 className="font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-slate-100" aria-label="Close"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3">{footer}</div>}
      </div>
    </div>
  )
}

export function Card({ title, action, children, className = '' }) {
  return (
    <section className={`rounded-xl border border-slate-200 bg-surface ${className}`}>
      {title && (
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
          <h2 className="font-semibold text-slate-900">{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  )
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="flex max-w-full overflow-x-auto rounded-lg border border-slate-200 bg-surface p-1">
      {tabs.map((t) => {
        const key = t.key ?? t
        return (
          <button key={key} onClick={() => onChange(key)} className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm ${value === key ? 'bg-slate-900 text-slate-50' : 'text-slate-600 hover:bg-slate-100'}`}>
            {t.label ?? t}
          </button>
        )
      })}
    </div>
  )
}

export function Badge({ cls = 'bg-slate-100 text-slate-600', children }) {
  return <span className={`inline-block whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ${cls}`}>{children}</span>
}

export const Empty = ({ text = 'Nothing here yet.' }) => <p className="px-5 py-10 text-center text-sm text-slate-400">{text}</p>
export const Loading = () => <p className="px-5 py-10 text-center text-sm text-slate-400">Loading…</p>
export const ErrorBox = ({ text }) => text ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{text}</p> : null

// Same name → same soft colour, so people and clients are easy to spot
const PASTELS = ['bg-violet-100 text-violet-700', 'bg-pink-100 text-pink-700', 'bg-sky-100 text-sky-700', 'bg-amber-100 text-amber-700', 'bg-teal-100 text-teal-700', 'bg-green-100 text-green-700', 'bg-orange-100 text-orange-700', 'bg-blue-100 text-blue-700']
const pastel = (n = '') => PASTELS[[...n].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7) % PASTELS.length]

export function Avatar({ name = '?', photo, size = 'h-9 w-9' }) {
  if (photo) return <img src={photo} alt="" className={`shrink-0 rounded-full object-cover ${size}`} />
  return <div className={`flex shrink-0 items-center justify-center rounded-full text-sm font-semibold ${pastel(name)} ${size}`}>{name?.[0]?.toUpperCase() ?? '?'}</div>
}

// Client logo (square) with first-letter fallback
export function ClientLogo({ client, size = 'h-10 w-10' }) {
  if (client?.logo) return <img src={client.logo} alt="" className={`shrink-0 rounded-lg border border-slate-200 bg-[#fff] object-contain p-0.5 ${size}`} />
  const n = client?.businessName || client?.name || '?'
  return <div className={`flex shrink-0 items-center justify-center rounded-lg text-sm font-semibold ${pastel(n)} ${size}`}>{n[0].toUpperCase()}</div>
}

export function Toggle({ checked, onChange, label, disabled }) {
  return (
    <button type="button" disabled={disabled} onClick={() => onChange(!checked)} className="inline-flex items-center gap-2 disabled:opacity-50" role="switch" aria-checked={checked}>
      <span className={`relative h-6 w-11 rounded-full ${checked ? 'bg-green-500' : 'bg-slate-300'}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-[#fff] shadow ${checked ? 'left-5.5' : 'left-0.5'}`} />
      </span>
      {label && <span className="text-sm text-slate-700">{label}</span>}
    </button>
  )
}

// Pick an image → resized data URL
export function ImagePicker({ value, onChange, onError, round, label = 'Upload' }) {
  const pick = async (e) => {
    const f = e.target.files?.[0]; e.target.value = ''
    if (!f) return
    try { onChange(await resizeImage(f)) } catch (err) { onError?.(err.message) }
  }
  return (
    <div className="flex items-center gap-3">
      {value
        ? <img src={value} alt="" className={`h-16 w-16 border border-slate-200 bg-surface object-contain ${round ? 'rounded-full object-cover' : 'rounded-lg p-1'}`} />
        : <div className={`flex h-16 w-16 items-center justify-center border border-dashed border-slate-300 text-xs text-slate-400 ${round ? 'rounded-full' : 'rounded-lg'}`}>None</div>}
      <label className="cursor-pointer rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
        {label}<input type="file" accept="image/*" className="hidden" onChange={pick} />
      </label>
      {value && <button type="button" onClick={() => onChange('')} className="text-sm text-red-600">Remove</button>}
    </div>
  )
}

// Dropdown with checkboxes (multiple choice)
export function MultiSelect({ options, value = [], onChange, placeholder = 'Select…' }) {
  const [open, setOpen] = useState(false)
  const toggle = (o) => onChange(value.includes(o) ? value.filter((x) => x !== o) : [...value, o])
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(!open)} className="flex min-h-[38px] w-full flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-surface px-2 py-1.5 text-left text-sm">
        {value.length ? value.map((v) => <span key={v} className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-700">{v}</span>) : <span className="px-1 text-slate-400">{placeholder}</span>}
        <ChevronDown size={16} className="ml-auto text-slate-400" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 mt-1 w-full rounded-lg border border-slate-200 bg-surface py-1 shadow-lg">
            {options.map((o) => (
              <label key={o} className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50">
                <input type="checkbox" checked={value.includes(o)} onChange={() => toggle(o)} className="h-4 w-4 accent-brand" /> {o}
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// Number card with a soft coloured icon
const TONES = {
  blue: 'bg-blue-50 text-blue-600', violet: 'bg-violet-50 text-violet-600', amber: 'bg-amber-50 text-amber-600',
  red: 'bg-red-50 text-red-600', green: 'bg-green-50 text-green-600', pink: 'bg-pink-50 text-pink-600', teal: 'bg-teal-50 text-teal-600', slate: 'bg-slate-100 text-slate-500',
}
export function StatCard({ label, value, icon: Icon, tone = 'slate', valueCls = 'text-slate-900' }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-surface p-5">
      <div className="min-w-0">
        <p className="text-sm text-slate-500">{label}</p>
        <p className={`mt-2 text-2xl font-semibold sm:text-3xl ${valueCls}`}>{value ?? '–'}</p>
      </div>
      {Icon && <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${TONES[tone]}`}><Icon size={20} /></span>}
    </div>
  )
}
