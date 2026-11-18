// Calendar (month / week / day / client-wise / staff-wise / timeline) and the staff work schedule.
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { STAGES, EVENT_COLORS, deriveEvents, scheduleConflicts, workload, involved, todayS, addDays, addMonths, weekStart, parseD, diffDays } from '@studioflow/shared';
import { api } from '../api.js';
import { useAction, useUi, useWorkspace } from '../lib/store.jsx';
import { PageHeader, Card, Badge, Btn, Avatar, ClientMark, Empty, Icon, fmt, fmtY, fmtL, wkday, monthLabel } from '../components/ui.jsx';
import { TaskModal, EventModal } from '../components/modals.jsx';

const byTime = (a, b) => ((a.time || '00') < (b.time || '00') ? -1 : 1);
const CATS = Object.keys(EVENT_COLORS).filter((k) => k !== 'Published');

function useEventHandlers() {
  const ws = useWorkspace();
  const { openVideo, openModal } = useUi();
  const run = useAction();
  const open = (e) => (e.videoId ? openVideo(e.videoId) : e.taskId ? openModal(<TaskModal id={e.taskId} />) : openModal(<EventModal id={e.eventId} />));
  // Drag & drop rescheduling (admins only)
  const move = (key, date) => {
    if (!key) return;
    const [type, id, kind] = key.split('|');
    if (type === 'v') run(() => api.patch(`/videos/${id}/move`, { kind, date }), `Moved to ${fmt(date)}`).catch(() => {});
    if (type === 't') run(() => api.patch(`/tasks/${id}/move`, { date }), `Moved to ${fmt(date)}`).catch(() => {});
    if (type === 'e') run(() => api.patch(`/events/${id}`, { date }), `Moved to ${fmt(date)}`).catch(() => {});
  };
  return { open, move, canDrag: (e) => ws.isAdmin && e.drag && e.key && !e.done };
}
function Chip({ e, long, h }) {
  const od = !e.done && e.date < todayS() && !!e.status;
  const drag = h.canDrag(e);
  return (
    <div className={`ev ${od ? 'od' : ''} ${e.done ? 'dn' : ''}`} style={{ '--c': EVENT_COLORS[e.cat] || '#64748B' }} title={`${e.cat}: ${e.label}${e.status ? ` — ${e.status}` : ''}`}
      draggable={drag} onDragStart={drag ? (ev) => { ev.dataTransfer.setData('text/plain', e.key); ev.currentTarget.classList.add('dragging'); } : undefined}
      onDragEnd={(ev) => ev.currentTarget.classList.remove('dragging')}
      onClick={(ev) => { ev.stopPropagation(); h.open(e); }} role="button" tabIndex={0} onKeyDown={(ev) => ev.key === 'Enter' && h.open(e)}>
      {e.time && <b>{e.time} </b>}{e.clientCode && <b>{e.clientCode} </b>}{long ? e.label : e.label.replace(/^[^·]+· /, '')}
    </div>
  );
}
const dropProps = (date, h, enabled) => (enabled ? {
  onDragOver: (ev) => { ev.preventDefault(); ev.currentTarget.classList.add('drop-hl'); },
  onDragLeave: (ev) => ev.currentTarget.classList.remove('drop-hl'),
  onDrop: (ev) => { ev.preventDefault(); ev.currentTarget.classList.remove('drop-hl'); h.move(ev.dataTransfer.getData('text/plain'), date); },
} : {});

export function MonthView({ evs, date, onDay }) {
  const ws = useWorkspace(); const h = useEventHandlers();
  const d = parseD(date); const first = new Date(d.getFullYear(), d.getMonth(), 1); const off = (first.getDay() + 6) % 7;
  const start = addDays(`${date.slice(0, 7)}-01`, -off); const T = todayS();
  const by = {}; evs.forEach((e) => (by[e.date] = by[e.date] || []).push(e));
  const cf = new Set(ws.isAdmin ? scheduleConflicts(ws.activeVideos).map((c) => c.date) : []);
  const cells = [];
  for (let i = 0; i < 42; i++) {
    const ds = addDays(start, i); const oth = parseD(ds).getMonth() !== d.getMonth();
    if (i === 35 && oth) break;
    const list = (by[ds] || []).sort(byTime);
    cells.push(
      <div key={ds} className={`cal-cell ${oth ? 'oth' : ''} ${ds === T ? 'today' : ''}`} {...dropProps(ds, h, ws.isAdmin)}>
        <div className="cal-dn"><span role="button" tabIndex={0} onClick={() => onDay(ds)}>{parseD(ds).getDate()}</span>{cf.has(ds) && <span className="cf" title="Schedule conflict"><Icon n="alert" /></span>}</div>
        {list.slice(0, 3).map((e, j) => <Chip key={e.key || j} e={e} h={h} />)}
        {list.length > 3 && <button type="button" className="more" onClick={() => onDay(ds)}>+{list.length - 3} more</button>}
      </div>,
    );
  }
  return <div className="cal-m"><div className="cal-hd">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((x) => <div key={x}>{x}</div>)}</div><div className="cal-grid">{cells}</div></div>;
}
export function WeekView({ evs, date, onDay }) {
  const ws = useWorkspace(); const h = useEventHandlers(); const ws0 = weekStart(date); const T = todayS();
  return (
    <div className="cal-w">{[...Array(7)].map((_, i) => { const ds = addDays(ws0, i); const list = evs.filter((e) => e.date === ds).sort(byTime); return (
      <div key={ds} className="cal-wc" {...dropProps(ds, h, ws.isAdmin)}>
        <div className={`cal-wh ${ds === T ? 'today' : ''}`} onClick={() => onDay(ds)} style={{ cursor: 'pointer' }}><div className="muted xs">{wkday(ds)}</div><div className="d">{parseD(ds).getDate()}</div></div>
        <div className="cal-wb">{list.length ? list.map((e, j) => <Chip key={e.key || j} e={e} long h={h} />) : <div className="muted xs" style={{ textAlign: 'center', padding: 10 }}>—</div>}</div>
      </div>); })}</div>
  );
}
export function DayView({ evs, date }) {
  const ws = useWorkspace(); const h = useEventHandlers();
  const list = evs.filter((e) => e.date === date).sort(byTime);
  const cf = ws.isAdmin ? scheduleConflicts(ws.activeVideos).filter((c) => c.date === date) : [];
  return (
    <>
      {cf.map((c) => <div key={c.time + c.staffId} className="note-box bad"><Icon n="alert" /> <b>{ws.staffName(c.staffId)}</b> is double-booked at {c.time}</div>)}
      <div className="card dayl">{list.length ? list.map((e, j) => (
        <div key={e.key || j} className="it" onClick={() => h.open(e)}>
          <div className="tm">{e.time || 'All day'}</div>
          <div className="row g12" style={{ minWidth: 0 }}><span className="dot" style={{ background: EVENT_COLORS[e.cat] }} /><div style={{ minWidth: 0 }}><div className="b" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.label}</div><div className="muted sm">{[e.cat, ws.clientsById[e.clientId]?.name, e.staff.slice(0, 3).map(ws.staffName).join(', ')].filter(Boolean).join(' · ')}</div></div></div>
          <div>{e.status && <Badge s={!e.done && e.date < todayS() ? 'Overdue' : e.status} />}</div>
        </div>)) : <Empty>Nothing scheduled on this day</Empty>}</div>
    </>
  );
}
function ClientWise({ evs, date }) {
  const ws = useWorkspace(); const h = useEventHandlers(); const m = date.slice(0, 7);
  const g = {}; evs.filter((e) => e.date.slice(0, 7) === m && e.clientId).forEach((e) => (g[e.clientId] = g[e.clientId] || []).push(e));
  const ids = Object.keys(g).filter((id) => ws.clientsById[id]).sort((a, b) => (ws.clientsById[a].name < ws.clientsById[b].name ? -1 : 1));
  if (!ids.length) return <Card><Empty>No client work scheduled this month</Empty></Card>;
  return <div className="grid k2">{ids.map((id) => { const c = ws.clientsById[id]; const l = g[id].sort((a, b) => (a.date + (a.time || '') < b.date + (b.time || '') ? -1 : 1)); return (
    <Card key={id} title={<span className="row g8"><ClientMark c={c} size={28} />{c.name}</span>} extra={<span className="muted sm">{l.length} items</span>}>
      {l.slice(0, 12).map((e, j) => <div key={e.key || j} className="row g8" style={{ padding: '6px 0', borderBottom: '1px solid var(--line2)', cursor: 'pointer' }} onClick={() => h.open(e)}><span className="sm muted" style={{ width: 62 }}>{fmt(e.date)}</span><span className="dot" style={{ background: EVENT_COLORS[e.cat] }} /><span className="sm" style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.label}</span>{e.status && <Badge s={!e.done && e.date < todayS() ? 'Overdue' : e.status} />}</div>)}
      {l.length > 12 && <div className="muted sm" style={{ marginTop: 8 }}>+{l.length - 12} more this month</div>}
    </Card>); })}</div>;
}
function StaffWise({ evs, date, staffFilter, onPick }) {
  const ws = useWorkspace(); const h = useEventHandlers(); const w0 = weekStart(date); const days = [...Array(7)].map((_, i) => addDays(w0, i)); const T = todayS();
  return (
    <div className="card"><div className="tbl-wrap"><table className="sw-t"><thead><tr><th>Staff</th>{days.map((d) => <th key={d} style={d === T ? { color: 'var(--pri)' } : undefined}>{wkday(d)} {parseD(d).getDate()}</th>)}</tr></thead>
      <tbody>{ws.staff.filter((s) => s.status !== 'Inactive' && (!staffFilter || s.id === staffFilter)).map((s) => (
        <tr key={s.id}><td><div className="cellm" style={{ cursor: 'pointer' }} onClick={() => onPick(s.id)}><Avatar person={s} size={28} /><div><div className="t">{s.name}</div><div className="s">{s.jobRole}</div></div></div></td>
          {days.map((d) => { const l = evs.filter((e) => e.date === d && e.staff.includes(s.id)).sort(byTime); return <td key={d} style={{ verticalAlign: 'top' }} {...dropProps(d, h, ws.isAdmin)}><div className="sw-c">{l.slice(0, 3).map((e, j) => <Chip key={e.key || j} e={e} h={h} />)}{l.length > 3 && <span className="muted xs">+{l.length - 3}</span>}</div></td>; })}</tr>))}</tbody></table></div></div>
  );
}
function Timeline({ date, client, staff }) {
  const ws = useWorkspace(); const { openVideo } = useUi();
  const m = date.slice(0, 7); const start = `${m}-01`; const n = new Date(+m.slice(0, 4), +m.slice(5, 7), 0).getDate(); const end = addDays(start, n - 1); const T = todayS();
  let vids = ws.activeVideos.filter((v) => v.post.date >= start && addDays(v.script.deadline, -3) <= end);
  if (client) vids = vids.filter((v) => v.clientId === client);
  if (staff) vids = vids.filter((v) => involved(v, staff));
  const pos = (d) => Math.max(0, Math.min(100, (diffDays(d, start) / n) * 100));
  const Seg = ({ a, b, c, t }) => { const l = pos(a); const r = pos(addDays(b, 1)); return r > l ? <div className="gt-seg" style={{ left: `${l}%`, width: `${r - l}%`, background: c }} title={`${t}: ${fmt(a)} – ${fmt(b)}`} /> : null; };
  const g = {}; vids.forEach((v) => (g[v.clientId] = g[v.clientId] || []).push(v));
  return (
    <div className="card gantt"><div className="gt">
      <div className="gt-h"><div style={{ padding: '8px 12px' }}>Video</div><div className="gt-days" style={{ gridTemplateColumns: `repeat(${n},1fr)` }}>{[...Array(n)].map((_, i) => { const d = addDays(start, i); const wd = parseD(d).getDay(); return <div key={d} className={wd === 0 || wd === 6 ? 'we' : ''} style={d === T ? { color: 'var(--bad)', fontWeight: 700 } : undefined}>{i + 1}</div>; })}</div></div>
      {Object.keys(g).map((cid) => (
        <div key={cid}><div className="gt-g">{ws.clientsById[cid]?.name}</div>
          {g[cid].sort((a, b) => (a.script.deadline < b.script.deadline ? -1 : 1)).map((v) => (
            <div key={v.id} className="gt-r"><div className="nm" onClick={() => openVideo(v.id)} title={v.title}><span className="muted xs">{v.code.slice(-6)}</span> {v.title}</div>
              <div className="gt-track">
                {T.slice(0, 7) === m && <div className="gt-today" style={{ left: `${pos(T) + 50 / n}%` }} />}
                <Seg a={addDays(v.script.deadline, -3)} b={v.script.deadline} c={EVENT_COLORS['Script Writing']} t="Script writing" />
                <Seg a={addDays(v.script.deadline, 1)} b={addDays(v.shoot.date, -1)} c={EVENT_COLORS['Script Approval']} t="Approval" />
                <Seg a={v.shoot.date} b={v.shoot.date} c={EVENT_COLORS['Video Shooting']} t="Shoot" />
                <Seg a={addDays(v.shoot.date, 1)} b={v.edit.deadline} c={EVENT_COLORS['Video Editing']} t="Editing" />
                <Seg a={addDays(v.edit.deadline, 1)} b={addDays(v.post.date, -1)} c={EVENT_COLORS['Video Review']} t="Review" />
                <Seg a={v.post.date} b={v.post.date} c={v.post.status === 'Published' ? '#059669' : EVENT_COLORS['Social Media Posting']} t="Posting" />
              </div></div>))}
        </div>))}
      {!vids.length && <Empty>No videos in this month</Empty>}
    </div></div>
  );
}

export default function CalendarPage() {
  const ws = useWorkspace(); const { openModal } = useUi();
  const [sp] = useSearchParams();
  const [view, setView] = useState(sp.get('view') || 'month');
  const [date, setDate] = useState(sp.get('date') || todayS());
  const [client, setClient] = useState(sp.get('client') || '');
  const [staff, setStaff] = useState(sp.get('staff') || '');
  const [stage, setStage] = useState(sp.get('stage') || '');
  let evs = deriveEvents({ videos: ws.activeVideos, tasks: ws.generalTasks, events: ws.events, clientsById: ws.clientsById });
  if (!ws.isAdmin) evs = evs.filter((e) => e.staff.includes(ws.user.id));
  if (client) evs = evs.filter((e) => e.clientId === client);
  if (staff && ws.isAdmin) evs = evs.filter((e) => e.staff.includes(staff));
  if (stage) evs = evs.filter((e) => e.cat === stage);
  const step = (d) => setDate(d === 0 ? todayS() : ['week', 'staff'].includes(view) ? addDays(date, 7 * d) : view === 'day' ? addDays(date, d) : addMonths(date, d));
  const title = view === 'week' || view === 'staff' ? `${fmt(weekStart(date))} – ${fmtY(addDays(weekStart(date), 6))}` : view === 'day' ? fmtL(date) : monthLabel(date.slice(0, 7));
  const cf = ws.isAdmin ? scheduleConflicts(ws.activeVideos).filter((c) => c.date >= todayS()) : [];
  const od = evs.filter((e) => !e.done && e.date < todayS() && e.status).length;
  const onDay = (d) => { setDate(d); setView('day'); };
  const views = [['month', 'Month'], ['week', 'Week'], ['day', 'Day'], ['client', 'Client-wise'], ...(ws.isAdmin ? [['staff', 'Staff-wise']] : []), ['timeline', 'Production timeline']];
  return (
    <>
      <PageHeader title={ws.isAdmin ? 'Calendar' : 'My Calendar'} sub={ws.isAdmin ? 'Drag items to reschedule. Conflicts and overdue work are flagged automatically.' : 'Your shoots, deadlines and posting dates.'}
        actions={ws.isAdmin && <Btn kind="primary" icon="plus" onClick={() => openModal(<EventModal date={date} />)}>New event</Btn>} />
      {cf.length > 0 && <div className="note-box bad row g8"><Icon n="alert" /><span><b>{cf.length} schedule conflict{cf.length > 1 ? 's' : ''}</b>: a team member is booked for two shoots at the same time. Look for the warning icon on the calendar.</span></div>}
      <div className="cal-bar">
        <div className="segc" role="tablist">{views.map(([k, l]) => <button type="button" key={k} className={view === k ? 'on' : ''} onClick={() => setView(k)}>{l}</button>)}</div>
        <span className="sp" />
        <select value={client} onChange={(e) => setClient(e.target.value)} aria-label="Filter by client"><option value="">All clients</option>{ws.clientOpts().map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        {ws.isAdmin && <select value={staff} onChange={(e) => setStaff(e.target.value)} aria-label="Filter by staff"><option value="">All staff</option>{ws.staffOpts().map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>}
        <select value={stage} onChange={(e) => setStage(e.target.value)} aria-label="Filter by stage"><option value="">All stages</option>{[...STAGES, 'General Task', 'Meeting'].map((s) => <option key={s}>{s}</option>)}</select>
        {(client || staff || stage) && <Btn size="sm" onClick={() => { setClient(''); setStaff(''); setStage(''); }}>Clear</Btn>}
      </div>
      <div className="cal-bar">
        <button type="button" className="icon-btn sm" onClick={() => step(-1)} aria-label="Previous"><Icon n="left" /></button>
        <Btn size="sm" onClick={() => step(0)}>Today</Btn>
        <button type="button" className="icon-btn sm" onClick={() => step(1)} aria-label="Next"><Icon n="right" /></button>
        <span className="cal-t">{title}</span><span className="sp" />{od > 0 && <span className="tag-od">{od} overdue</span>}
      </div>
      <div className="legend2">{CATS.map((k) => <span key={k}><i style={{ background: EVENT_COLORS[k] }} />{k}</span>)}</div>
      {view === 'month' && <MonthView evs={evs} date={date} onDay={onDay} />}
      {view === 'week' && <WeekView evs={evs} date={date} onDay={onDay} />}
      {view === 'day' && <DayView evs={evs} date={date} />}
      {view === 'client' && <ClientWise evs={evs} date={date} />}
      {view === 'staff' && <StaffWise evs={evs} date={date} staffFilter={staff} onPick={setStaff} />}
      {view === 'timeline' && <Timeline date={date} client={client} staff={staff} />}
    </>
  );
}

export function Schedule() {
  const ws = useWorkspace(); const { openModal } = useUi();
  const [sp] = useSearchParams();
  const [staff, setStaff] = useState(sp.get('staff') || ws.staff[0]?.id || '');
  const [mode, setMode] = useState('week');
  const [date, setDate] = useState(todayS());
  const evs = deriveEvents({ videos: ws.activeVideos, tasks: ws.generalTasks, events: ws.events, clientsById: ws.clientsById }).filter((e) => e.staff.includes(staff));
  const wl = workload(ws.staff, ws.allTasks);
  const step = (d) => setDate(d === 0 ? todayS() : mode === 'month' ? addMonths(date, d) : addDays(date, (mode === 'week' ? 7 : 1) * d));
  return (
    <>
      <PageHeader title="Staff Work Schedule" sub="Daily, weekly and monthly schedules for each team member." />
      <div className="grid c12">
        <Card title="Team this week">{wl.map((w) => (
          <div key={w.staff.id} className="trow" style={w.staff.id === staff ? { borderColor: 'var(--pri)', background: 'var(--pri2)' } : undefined} onClick={() => setStaff(w.staff.id)}>
            <Avatar person={w.staff} size={30} /><div className="trow-m"><div className="trow-t">{w.staff.name}</div><div className="trow-s">{w.staff.jobRole}</div></div>
            <div className="trow-r"><span className="sm">{w.week} due</span>{w.overdue > 0 && <span className="tag-od">{w.overdue} late</span>}</div>
          </div>))}</Card>
        <div>
          <div className="cal-bar">
            <select value={staff} onChange={(e) => setStaff(e.target.value)} aria-label="Team member">{ws.staff.map((x) => <option key={x.id} value={x.id}>{x.name} — {x.jobRole}</option>)}</select>
            <div className="segc">{['day', 'week', 'month'].map((m) => <button type="button" key={m} className={mode === m ? 'on' : ''} onClick={() => setMode(m)}>{m[0].toUpperCase() + m.slice(1)}</button>)}</div>
            <button type="button" className="icon-btn sm" onClick={() => step(-1)} aria-label="Previous"><Icon n="left" /></button><Btn size="sm" onClick={() => step(0)}>Today</Btn><button type="button" className="icon-btn sm" onClick={() => step(1)} aria-label="Next"><Icon n="right" /></button>
            <span className="cal-t">{mode === 'month' ? monthLabel(date.slice(0, 7)) : mode === 'week' ? `${fmt(weekStart(date))} – ${fmtY(addDays(weekStart(date), 6))}` : fmtL(date)}</span>
            <span className="sp" /><Btn icon="plus" onClick={() => openModal(<TaskModal assignee={staff} />)}>Allocate task</Btn>
          </div>
          {mode === 'month' && <MonthView evs={evs} date={date} onDay={(d) => { setDate(d); setMode('day'); }} />}
          {mode === 'week' && <WeekView evs={evs} date={date} onDay={(d) => { setDate(d); setMode('day'); }} />}
          {mode === 'day' && <DayView evs={evs} date={date} />}
        </div>
      </div>
    </>
  );
}
