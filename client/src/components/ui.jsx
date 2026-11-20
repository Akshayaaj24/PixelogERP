import { X } from 'lucide-react'

export function Button({ variant = 'primary', className = '', ...p }) {
  const v = {
    primary: 'bg-brand text-white hover:bg-blue-700',
    dark: 'bg-slate-900 text-white hover:bg-slate-800',
    outline: 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
    ghost: 'text-slate-600 hover:bg-slate-100',
    danger: 'border border-red-200 bg-white text-red-600 hover:bg-red-50',
  }[variant]
  return <button className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium disabled:opacity-50 ${v} ${className}`} {...p} />
}

const inputCls = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand disabled:bg-slate-50'
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
      <div className={`relative flex max-h-[92vh] w-full flex-col rounded-t-2xl bg-white sm:rounded-2xl ${wide ? 'sm:max-w-2xl' : 'sm:max-w-lg'}`}>
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
    <section className={`rounded-xl border border-slate-200 bg-white ${className}`}>
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
    <div className="flex max-w-full overflow-x-auto rounded-lg border border-slate-200 bg-white p-1">
      {tabs.map((t) => {
        const key = t.key ?? t
        return (
          <button key={key} onClick={() => onChange(key)} className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm ${value === key ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
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

export function Avatar({ name = '?', size = 'h-9 w-9' }) {
  return <div className={`flex shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700 ${size}`}>{name[0]?.toUpperCase()}</div>
}
