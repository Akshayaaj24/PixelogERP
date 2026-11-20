import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { STATUS_TONE, EVENT_COLORS, parseD, diffDays, todayS } from '@PixelogERP/shared';
import { useUi } from '../lib/store.jsx';

/* ---------------- Formatting ---------------- */
export const fmt = (s) => (s ? parseD(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—');
export const fmtY = (s) => (s ? parseD(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
export const fmtL = (s) => (s ? parseD(s).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '—');
export const monthLabel = (m) => parseD(`${m}-01`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
export const wkday = (s) => parseD(s).toLocaleDateString('en-GB', { weekday: 'short' });
export function fmtRel(s) {
  if (!s) return '—';
  const d = diffDays(s, todayS());
  if (d === 0) return 'Today'; if (d === 1) return 'Tomorrow'; if (d === -1) return 'Yesterday';
  if (d > 0 && d < 7) return `${wkday(s)}, ${fmt(s)}`;
  return fmt(s);
}
export function ago(t) {
  const s = (Date.now() - new Date(t).getTime()) / 1000;
  if (s < 60) return 'just now'; if (s < 3600) return `${Math.floor(s / 60)}m ago`; if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
export const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
export const greet = () => { const h = new Date().getHours(); return h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening'; };

/* ---------------- Icons ---------------- */
const P = {
  grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
  briefcase: <><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2M2 13h20" /></>,
  layers: <><path d="m12 2 10 5-10 5L2 7z" /><path d="m2 17 10 5 10-5M2 12l10 5 10-5" /></>,
  pen: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></>,
  camera: <><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></>,
  film: <><rect x="2" y="2" width="20" height="20" rx="2.5" /><path d="M7 2v20M17 2v20M2 12h20M2 7h5M2 17h5M17 17h5M17 7h5" /></>,
  share: <><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" /></>,
  users: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" /></>,
  clock: <><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></>,
  calendar: <><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>,
  chart: <path d="M18 20V10M12 20V4M6 20v-6" />,
  settings: <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" />,
  search: <><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></>,
  bell: <><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></>,
  menu: <path d="M3 12h18M3 6h18M3 18h18" />, plus: <path d="M12 5v14M5 12h14" />, x: <path d="M18 6 6 18M6 6l12 12" />,
  left: <path d="m15 18-6-6 6-6" />, right: <path d="m9 18 6-6-6-6" />,
  more: <><circle cx="12" cy="5" r="1.2" /><circle cx="12" cy="12" r="1.2" /><circle cx="12" cy="19" r="1.2" /></>,
  check: <path d="M20 6 9 17l-5-5" />,
  alert: <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01" />,
  upload: <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />,
  download: <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />,
  logout: <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />,
  eye: <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>,
  trash: <path d="M3 6h18M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />,
  archive: <path d="M21 8v13H3V8M1 3h22v5H1zM10 12h4" />,
  file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></>,
  link: <><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" /><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" /></>,
  list: <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />,
  user: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>,
  collapse: <path d="M11 17l-5-5 5-5M18 17l-5-5 5-5" />, expand: <path d="m13 17 5-5-5-5M6 17l5-5-5-5" />,
  copy: <><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></>,
  target: <><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></>,
  checkc: <><path d="M22 11.1V12a10 10 0 1 1-5.9-9.1" /><path d="M22 4 12 14l-3-3" /></>,
  hourglass: <path d="M5 22h14M5 2h14M17 22v-4.2a2 2 0 0 0-.6-1.4L12 12l-4.4 4.4a2 2 0 0 0-.6 1.4V22M7 2v4.2a2 2 0 0 0 .6 1.4L12 12l4.4-4.4a2 2 0 0 0 .6-1.4V2" />,
  send: <><path d="m22 2-7 20-4-9-9-4z" /><path d="M22 2 11 13" /></>,
  moon: <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />,
  sun: <><circle cx="12" cy="12" r="5" /><path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" /></>,
  pin: <><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></>,
  zap: <path d="M13 2 3 14h9l-1 8 10-12h-9z" />,
  shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
};
export const Icon = ({ n, className = '' }) => <svg className={`i ${className}`} viewBox="0 0 24 24" aria-hidden="true">{P[n]}</svg>;

/* ---------------- Atoms ---------------- */
export const Badge = ({ s }) => <span className={`badge b-${STATUS_TONE[s] || 'gray'}`}>{s}</span>;
const hue = (str) => [...String(str)].reduce((a, c) => a + c.charCodeAt(0) * 47, 0) % 360;
export function Avatar({ person, size = 28 }) {
  const st = { width: size, height: size, fontSize: size * 0.37 };
  if (!person) return <span className="av" style={st}>?</span>;
  if (person.photo) return <img className="av" src={person.photo} alt="" title={person.name} style={st} />;
  const h = hue(person.id);
  return <span className="av" title={person.name} style={{ ...st, background: `hsl(${h} 70% 92%)`, color: `hsl(${h} 50% 32%)` }}>{person.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}</span>;
}
export function ClientMark({ c, size = 34 }) {
  if (!c) return null;
  const h = hue(c.id + c.code);
  return <span className="cav" style={{ width: size, height: size, background: `hsl(${h} 60% 93%)`, color: `hsl(${h} 55% 30%)` }}>{c.code}</span>;
}
export const Person = ({ person, size = 26 }) => (person ? <span className="row g8"><Avatar person={person} size={size} /><span>{person.name}</span></span> : <span className="muted">Unassigned</span>);
export const Progress = ({ value, color }) => <div className="prog"><i style={{ width: `${Math.min(100, value)}%`, ...(color ? { background: color } : {}) }} /></div>;
export const Dot = ({ cat, color }) => <span className="dot" style={{ background: color || EVENT_COLORS[cat] }} />;
export const Empty = ({ children }) => <div className="empty-s">{children}</div>;
export function Due({ date, done }) {
  const od = !done && date < todayS();
  return <span className={od ? 'tag-od' : ''}>{fmtRel(date)}{od ? ' · overdue' : ''}</span>;
}
export function Card({ title, extra, children, className = '' }) {
  return (
    <div className={`card ${className}`}>
      {title && <div className="card-h"><h3>{title}</h3><span className="sp" />{extra}</div>}
      <div className="card-b">{children}</div>
    </div>
  );
}
export const Kpi = ({ label, value, icon, tone, sub, onClick }) => (
  <div className="kpi card" onClick={onClick} style={onClick ? { cursor: 'pointer' } : undefined} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined}>
    <div className={`kpi-ic t-${tone}`}><Icon n={icon} /></div>
    <div><div className="kpi-l">{label}</div><div className="kpi-v">{value}</div>{sub ? <div className="kpi-s">{sub}</div> : null}</div>
  </div>
);
export const PageHeader = ({ title, sub, actions, crumb }) => (
  <div className="ph"><div>{crumb}<h1>{title}</h1>{sub && <p>{sub}</p>}</div><div className="ph-act">{actions}</div></div>
);
export const Btn = ({ icon, children, kind = '', size = '', ...rest }) => <button type="button" className={`btn ${kind} ${size}`} {...rest}>{icon && <Icon n={icon} />}{children}</button>;
export const Loading = () => <div className="empty-s">Loading…</div>;

/* ---------------- Popover & menus ---------------- */
export function Popover({ anchor, onClose, children, className = '', width }) {
  const ref = useRef(null);
  const [pos, setPos] = useState({ left: -9999, top: 0 });
  useLayoutEffect(() => {
    if (!anchor || !ref.current) return;
    const r = anchor.getBoundingClientRect(); const p = ref.current;
    let top = r.bottom + 6;
    if (top + p.offsetHeight > window.innerHeight - 10) top = Math.max(10, r.top - p.offsetHeight - 6);
    setPos({ left: Math.min(window.innerWidth - p.offsetWidth - 10, Math.max(10, r.right - p.offsetWidth)), top });
  }, [anchor]);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target) && !anchor.contains(e.target)) onClose(); };
    const k = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('mousedown', h); document.addEventListener('keydown', k); window.addEventListener('resize', onClose);
    return () => { document.removeEventListener('mousedown', h); document.removeEventListener('keydown', k); window.removeEventListener('resize', onClose); };
  }, [anchor, onClose]);
  return <div ref={ref} className={`pop ${className}`} style={{ ...pos, ...(width ? { width } : {}) }}>{children}</div>;
}
/** "More actions" menu. items: [{ label, icon, onClick, danger }] */
export function Kebab({ items }) {
  const [anchor, setAnchor] = useState(null);
  return (
    <>
      <button type="button" className="icon-btn sm ghost" aria-label="More actions" onClick={(e) => { e.stopPropagation(); setAnchor(anchor ? null : e.currentTarget); }}><Icon n="more" /></button>
      {anchor && (
        <Popover anchor={anchor} onClose={() => setAnchor(null)}>
          {items.filter(Boolean).map((it) => (
            <button key={it.label} type="button" className={`mi ${it.danger ? 'dng' : ''}`} onClick={(e) => { e.stopPropagation(); setAnchor(null); it.onClick(); }}><Icon n={it.icon || 'right'} />{it.label}</button>
          ))}
        </Popover>
      )}
    </>
  );
}

/* ---------------- Modal & forms ---------------- */
export function Modal({ title, wide, children, footer, onClose }) {
  const { closeModal } = useUi();
  const close = onClose || closeModal;
  useEffect(() => { const k = (e) => e.key === 'Escape' && close(); document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k); }, [close]);
  return (
    <div className="m-bg" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="m-h"><h3>{title}</h3><button type="button" className="icon-btn sm ghost" onClick={close} aria-label="Close"><Icon n="x" /></button></div>
        <div className="m-b">{children}</div>
        <div className="m-f">{footer || <Btn onClick={close}>Close</Btn>}</div>
      </div>
    </div>
  );
}

const FormCtx = createContext(null);
const RULES = {
  email: [/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, 'Enter a valid email address'],
  phone: [/^[+\d\s()-]{8,20}$/, 'Enter a valid phone number (8–20 digits)'],
  url: [/^https?:\/\/\S+\.\S+/, 'Enter a valid link starting with https://'],
};
/**
 * A modal containing a form. Fields register their own rules; server field errors (400) and
 * messages (409 etc.) are shown in place. onSubmit(values) may return a promise.
 */
export function ModalForm({ title, wide, initial = {}, submit = 'Save', danger, onSubmit, children, extraFoot }) {
  const { closeModal } = useUi();
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const rules = useRef({});
  const set = (k, v) => { setValues((s) => ({ ...s, [k]: v })); setErrors((e) => ({ ...e, [k]: undefined })); };
  async function handle(e) {
    e.preventDefault();
    const errs = {};
    Object.entries(rules.current).forEach(([k, r]) => {
      const v = values[k]; const str = typeof v === 'string' ? v.trim() : v;
      if (r.req && (str === '' || str == null || (Array.isArray(str) && !str.length))) errs[k] = Array.isArray(str) ? 'Select at least one' : 'This field is required';
      else if (str && r.v && RULES[r.v] && !RULES[r.v][0].test(str)) [, errs[k]] = RULES[r.v];
      else if (str !== '' && str != null && r.min != null && +str < r.min) errs[k] = `Enter at least ${r.min}`;
      else if (str !== '' && str != null && r.max != null && +str > r.max) errs[k] = `Enter at most ${r.max}`;
    });
    setErrors(errs); setError('');
    if (Object.keys(errs).length) return;
    setBusy(true);
    try { const r = await onSubmit(values); if (r !== false) closeModal(); } catch (err) {
      if (err.fields) setErrors(Object.fromEntries(Object.entries(err.fields).map(([k, m]) => [k.split('.').pop(), m])));
      setError(err.message || 'Something went wrong');
    } finally { setBusy(false); }
  }
  return (
    <FormCtx.Provider value={{ values, set, errors, rules }}>
      <div className="m-bg" onMouseDown={(e) => e.target === e.currentTarget && closeModal()}>
        <form className={`modal ${wide ? 'wide' : ''}`} onSubmit={handle} noValidate role="dialog" aria-modal="true" aria-label={title}>
          <div className="m-h"><h3>{title}</h3><button type="button" className="icon-btn sm ghost" onClick={closeModal} aria-label="Close"><Icon n="x" /></button></div>
          <div className="m-b">{typeof children === 'function' ? children(values, set) : children}</div>
          {error && <div className="m-err on">{error}</div>}
          <div className="m-f">{extraFoot}<span className="sp" /><Btn onClick={closeModal}>Cancel</Btn><button className={`btn ${danger ? 'danger' : 'primary'}`} disabled={busy}>{busy ? 'Saving…' : submit}</button></div>
        </form>
      </div>
    </FormCtx.Provider>
  );
}
function useField(name, rule) {
  const ctx = useContext(FormCtx);
  ctx.rules.current[name] = rule;
  useEffect(() => () => { delete ctx.rules.current[name]; }, [name]); // eslint-disable-line react-hooks/exhaustive-deps
  return { value: ctx.values[name] ?? '', set: (v) => ctx.set(name, v), error: ctx.errors[name] };
}
const Label = ({ label, req }) => <span>{label}{req && <i> *</i>}</span>;
export function Field({ name, label, req, type = 'text', v, min, max, ph, full, disabled }) {
  const f = useField(name, { req, v: v || (type === 'email' ? 'email' : undefined), min, max });
  return (
    <label className={`fld ${full ? 'full' : ''}`}>
      <Label label={label} req={req} />
      <input type={type} value={f.value} onChange={(e) => f.set(e.target.value)} placeholder={ph} min={min} max={max} disabled={disabled} className={f.error ? 'inv' : ''} aria-invalid={!!f.error} />
      {f.error && <em className="err">{f.error}</em>}
    </label>
  );
}
export function Select({ name, label, options, req, blank, full, onChange }) {
  const f = useField(name, { req });
  return (
    <label className={`fld ${full ? 'full' : ''}`}>
      <Label label={label} req={req} />
      <select value={f.value} onChange={(e) => { f.set(e.target.value); onChange?.(e.target.value); }} className={f.error ? 'inv' : ''}>
        {blank != null && <option value="">{blank}</option>}
        {options.map((o) => { const [val, lab] = Array.isArray(o) ? o : [o, o]; return <option key={val} value={val}>{lab}</option>; })}
      </select>
      {f.error && <em className="err">{f.error}</em>}
    </label>
  );
}
export function TextArea({ name, label, req, ph }) {
  const f = useField(name, { req });
  return (
    <label className="fld full"><Label label={label} req={req} />
      <textarea value={f.value} onChange={(e) => f.set(e.target.value)} placeholder={ph} className={f.error ? 'inv' : ''} />
      {f.error && <em className="err">{f.error}</em>}
    </label>
  );
}
export function Checks({ name, label, options, req }) {
  const f = useField(name, { req });
  const val = Array.isArray(f.value) ? f.value : [];
  return (
    <div className="fld full"><Label label={label} req={req} />
      <div className="chks">{options.map((o) => { const [v, l] = Array.isArray(o) ? o : [o, o]; return (
        <label key={v}><input type="checkbox" checked={val.includes(v)} onChange={(e) => f.set(e.target.checked ? [...val, v] : val.filter((x) => x !== v))} /> {l}</label>); })}</div>
      {f.error && <em className="err">{f.error}</em>}
    </div>
  );
}
export function Toggle({ name, label }) {
  const f = useField(name, {});
  return <label className="chk"><input type="checkbox" checked={!!f.value} onChange={(e) => f.set(e.target.checked)} /> {label}</label>;
}
export function Confirm({ title, text, label, onConfirm, danger = true }) {
  return <ModalForm title={title} submit={label} danger={danger} onSubmit={onConfirm}><p style={{ margin: 0 }}>{text}</p></ModalForm>;
}

/* ---------------- Shared table state (so filter chips and tables stay in sync) ---------------- */
const tableStore = new Map();
const listeners = new Set();
const emit = () => listeners.forEach((l) => l());
export function useTableState(id, defaults = {}) {
  if (!tableStore.has(id)) tableStore.set(id, { q: '', sort: defaults.sort || null, dir: defaults.dir || 1, page: 1, f: { ...(defaults.f || {}) } });
  const state = useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => tableStore.get(id));
  const update = (patch) => { tableStore.set(id, { ...tableStore.get(id), ...patch }); emit(); };
  return [state, update];
}

/* ---------------- Data table ---------------- */
export function DataTable({ id, rows, cols, search, filters = [], pageSize = 10, onRow, empty = 'No records match your filters', tools, ph = 'Search…', defaults }) {
  const [st, up] = useTableState(id, defaults);
  let r = rows;
  if (st.q) { const q = st.q.toLowerCase(); r = r.filter((x) => search(x).toLowerCase().includes(q)); }
  filters.forEach((f) => { const val = st.f[f.key]; if (val) r = r.filter((x) => { const g = f.get(x); return Array.isArray(g) ? g.includes(val) : String(g) === val; }); });
  if (st.sort) { const c = cols.find((x) => x.key === st.sort); if (c?.sort) r = [...r].sort((a, b) => { const x = c.sort(a); const y = c.sort(b); return (x > y ? 1 : x < y ? -1 : 0) * st.dir; }); }
  const pages = Math.max(1, Math.ceil(r.length / pageSize));
  const page = Math.min(st.page, pages);
  const pr = r.slice((page - 1) * pageSize, page * pageSize);
  const nums = []; for (let i = 1; i <= pages; i++) { if (i === 1 || i === pages || Math.abs(i - page) <= 1) nums.push(i); else if (nums[nums.length - 1] !== '…') nums.push('…'); }
  return (
    <div className="card">
      <div className="tbl-tools">
        <div className="search-in"><Icon n="search" /><input value={st.q} onChange={(e) => up({ q: e.target.value, page: 1 })} placeholder={ph} aria-label="Search table" /></div>
        {filters.map((f) => (
          <select key={f.key} value={st.f[f.key] || ''} aria-label={f.label} onChange={(e) => up({ f: { ...st.f, [f.key]: e.target.value }, page: 1 })}>
            <option value="">{f.label}: All</option>
            {f.options.map((o) => { const [v, l] = Array.isArray(o) ? o : [o, o]; return <option key={v} value={v}>{l}</option>; })}
          </select>
        ))}
        <span className="sp" />{tools}
      </div>
      <div className="tbl-wrap">
        <table>
          <thead><tr>{cols.map((c) => (
            <th key={c.key} className={c.sort ? 'sortable' : ''} style={c.width ? { width: c.width } : undefined}
              onClick={c.sort ? () => up(st.sort === c.key ? { dir: -st.dir } : { sort: c.key, dir: 1 }) : undefined}
              aria-sort={st.sort === c.key ? (st.dir > 0 ? 'ascending' : 'descending') : undefined}>
              {c.label}{st.sort === c.key ? (st.dir > 0 ? ' ↑' : ' ↓') : ''}
            </th>))}</tr></thead>
          <tbody>
            {pr.length ? pr.map((x) => (
              <tr key={x.id} className={onRow ? 'click' : ''} onClick={onRow ? () => onRow(x) : undefined}>
                {cols.map((c) => <td key={c.key}>{c.render(x)}</td>)}
              </tr>
            )) : <tr><td className="empty" colSpan={cols.length}>{empty}</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="tbl-foot">
        <span>{r.length ? `Showing ${(page - 1) * pageSize + 1}–${Math.min(r.length, page * pageSize)} of ${r.length}` : '0 results'}</span>
        <div className="pager">
          <button type="button" disabled={page <= 1} onClick={() => up({ page: page - 1 })} aria-label="Previous page">‹</button>
          {nums.map((n, i) => (n === '…' ? <button type="button" key={`e${i}`} disabled>…</button> : <button type="button" key={n} className={n === page ? 'on' : ''} onClick={() => up({ page: n })}>{n}</button>))}
          <button type="button" disabled={page >= pages} onClick={() => up({ page: page + 1 })} aria-label="Next page">›</button>
        </div>
      </div>
    </div>
  );
}
/** Stops a click inside a clickable row from also opening the row */
export const Stop = ({ children }) => <div className="acts" onClick={(e) => e.stopPropagation()}>{children}</div>;
