// The four stage modules (scripts, shoots, editing, posting) and staff pages.
import { useNavigate, useParams } from 'react-router-dom';
import { STATUSES, STAGE_KEY, STAGE_LBL, PLATFORMS, JOB_ROLES, EVENT_COLORS, tasksOf, isOverdue, shootClash, scheduleConflicts, workload, stageActions, todayS, addDays } from '@studioflow/shared';
import { api } from '../api.js';
import { useAction, useUi, useWorkspace } from '../lib/store.jsx';
import { DataTable, useTableState, PageHeader, Card, Badge, Btn, Kebab, Progress, Person, Avatar, ClientMark, Empty, Icon, Kpi, Due, fmt, fmtY, fmtRel, wkday, pct } from '../components/ui.jsx';
import { Bars, Legend } from '../components/charts.jsx';
import { ActionButtons, StageEditModal, TaskRow, VideoCell, useStageAction } from '../components/workflow.jsx';
import { StaffModal, TaskModal } from '../components/modals.jsx';
import { ConflictList } from './Dashboard.jsx';

const PF = { Instagram: ['IG', '#E1306C'], Facebook: ['FB', '#1877F2'], YouTube: ['YT', '#FF0000'], LinkedIn: ['IN', '#0A66C2'], Other: ['+', '#64748B'] };
export const PlatformMark = ({ p }) => <span className="pf" title={p} style={{ background: PF[p]?.[1] }}>{PF[p]?.[0]}</span>;

const CFG = {
  script: { title: 'Script Writing', sub: 'Assign scripts to writers, track progress, review and approve.', who: (v) => [v.script.writer], role: 'Script Writer' },
  shoot: { title: 'Shooting Schedule', sub: 'Schedule shoots, assign camera teams, locations and time slots.', who: (v) => v.shoot.team, role: 'Videographer' },
  edit: { title: 'Video Editing', sub: 'Assign edits to editors, manage revisions and approve final videos.', who: (v) => [v.edit.editor], role: 'Video Editor' },
  post: { title: 'Social Media Posting', sub: 'Schedule publishing, write captions, choose platforms and keep live links.', who: (v) => [v.post.smm], role: 'Social Media Manager' },
};

export function StagePage({ stage }) {
  const ws = useWorkspace();
  const nav = useNavigate();
  const { openVideo, openModal } = useUi();
  const act = useStageAction();
  const cfg = CFG[stage]; const id = `stage-${stage}`;
  const [st, up] = useTableState(id);
  const vids = ws.activeVideos; const T = todayS();
  const P = (v) => ws.staffById;
  const specific = {
    script: [
      { key: 'w', label: 'Writer', render: (v) => <Person person={ws.staffById[v.script.writer]} />, sort: (v) => ws.staffName(v.script.writer) },
      { key: 'd', label: 'Deadline', render: (v) => <Due date={v.script.deadline} done={v.script.status === 'Approved'} />, sort: (v) => v.script.deadline },
    ],
    shoot: [
      { key: 'd', label: 'Date & time', render: (v) => <span className="sm"><b>{fmtRel(v.shoot.date)}</b> <span className="muted">{v.shoot.time}</span></span>, sort: (v) => v.shoot.date + v.shoot.time },
      { key: 'loc', label: 'Location', render: (v) => <span className="sm" style={{ display: 'block', maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.shoot.location}</span> },
      { key: 't', label: 'Team', render: (v) => <><div className="avs">{v.shoot.team.map((s) => <Avatar key={s} person={ws.staffById[s]} size={26} />)}</div>{!['Completed', 'Cancelled'].includes(v.shoot.status) && shootClash(vids, v.shoot.date, v.shoot.time, v.shoot.team, v.id).length > 0 && <div className="tag-od sm">conflict</div>}</> },
    ],
    edit: [
      { key: 'e', label: 'Editor', render: (v) => <Person person={ws.staffById[v.edit.editor]} />, sort: (v) => ws.staffName(v.edit.editor) },
      { key: 'd', label: 'Deadline', render: (v) => <Due date={v.edit.deadline} done={['Approved', 'Completed'].includes(v.edit.status)} />, sort: (v) => v.edit.deadline },
    ],
    post: [
      { key: 'm', label: 'Manager', render: (v) => <Person person={ws.staffById[v.post.smm]} />, sort: (v) => ws.staffName(v.post.smm) },
      { key: 'd', label: 'Publish', render: (v) => <span className="sm"><Due date={v.post.date} done={v.post.status === 'Published'} /> <span className="muted">{v.post.time}</span></span>, sort: (v) => v.post.date + v.post.time },
      { key: 'p', label: 'Platforms', render: (v) => <div className="row g4">{v.post.platforms.map((p) => <PlatformMark key={p} p={p} />)}</div> },
      { key: 'l', label: 'Live link', render: (v) => (v.post.link ? <a href={v.post.link} target="_blank" rel="noopener noreferrer" className="chip" onClick={(e) => e.stopPropagation()}><Icon n="link" />View</a> : <span className="muted sm">—</span>) },
    ],
  }[stage];
  const week = vids.filter((v) => v.shoot.date >= T && v.shoot.date <= addDays(T, 6) && v.shoot.status !== 'Cancelled').sort((a, b) => (a.shoot.date + a.shoot.time < b.shoot.date + b.shoot.time ? -1 : 1));
  const cf = scheduleConflicts(vids).filter((c) => c.date >= T);
  return (
    <>
      <PageHeader title={cfg.title} sub={cfg.sub} actions={<Btn icon="calendar" onClick={() => nav(`/calendar?stage=${encodeURIComponent(STAGE_KEY[stage])}`)}>Calendar view</Btn>} />
      <div className="minis">{STATUSES[stage].map((s) => (
        <button type="button" key={s} className={`mini ${st.f.status === s ? 'on' : ''}`} onClick={() => up({ f: { ...st.f, status: st.f.status === s ? '' : s }, page: 1 })}>
          <Badge s={s} /><div className="v" style={{ marginTop: 4 }}>{vids.filter((v) => v[stage].status === s).length}</div>
        </button>))}</div>
      {stage === 'shoot' && (
        <div className="grid c21 mb">
          <Card title="Next 7 days">{week.length ? <div className="minis" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', margin: 0 }}>{week.slice(0, 8).map((v) => (
            <button type="button" key={v.id} className="mini" onClick={() => openVideo(v.id)}>
              <div className="row g8"><b className="sm">{wkday(v.shoot.date)} {fmt(v.shoot.date)}</b><span className="sp" /><span className="sm muted">{v.shoot.time}</span></div>
              <div className="sm b" style={{ margin: '4px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.title}</div>
              <div className="row g8"><span className="avs">{v.shoot.team.map((s) => <Avatar key={s} person={ws.staffById[s]} size={22} />)}</span><span className="sp" /><Badge s={v.shoot.status} /></div>
            </button>))}</div> : <Empty>No shoots in the next 7 days</Empty>}</Card>
          <Card title={`Schedule conflicts (${cf.length})`}><ConflictList max={3} /></Card>
        </div>
      )}
      {stage === 'post' && (
        <div className="minis">{PLATFORMS.map((p) => (
          <div key={p} className="mini" style={{ cursor: 'default' }}>
            <div className="row g8"><PlatformMark p={p} /><span className="muted sm">{p}</span></div>
            <div className="v">{vids.filter((v) => v.post.status === 'Published' && v.post.platforms.includes(p)).length}</div>
            <div className="muted xs">published · {vids.filter((v) => v.post.status === 'Scheduled' && v.post.platforms.includes(p)).length} scheduled</div>
          </div>))}</div>
      )}
      <DataTable id={id} rows={vids} ph="Search by video, client or person…" defaults={{ sort: 'd' }} onRow={(v) => openVideo(v.id)}
        search={(v) => [v.code, v.title, ws.clientsById[v.clientId]?.name, ...cfg.who(v).map(ws.staffName)].join(' ')}
        filters={[
          { key: 'status', label: 'Status', options: STATUSES[stage], get: (v) => v[stage].status },
          { key: 'client', label: 'Client', options: ws.clientOpts(), get: (v) => v.clientId },
          { key: 'who', label: 'Assignee', options: stage === 'shoot' ? [...ws.staffOpts('Videographer'), ...ws.staffOpts('Camera Operator')] : ws.staffOpts(cfg.role), get: (v) => cfg.who(v) },
          { key: 'od', label: 'Timing', options: [['od', 'Overdue only'], ['ok', 'Not overdue']], get: (v) => (isOverdue(tasksOf(v).find((t) => t.stage === stage)) ? 'od' : 'ok') },
        ]}
        cols={[
          { key: 'code', label: 'Video', render: (v) => <VideoCell v={v} />, sort: (v) => v.code },
          ...specific,
          { key: 'status', label: 'Status', render: (v) => <Badge s={v[stage].status} />, sort: (v) => STATUSES[stage].indexOf(v[stage].status) },
          { key: 'a', label: '', render: (v) => (
            <div className="acts" onClick={(e) => e.stopPropagation()}>
              <ActionButtons v={v} stage={stage} only="primary" />
              <Kebab items={[
                { label: 'Open video', icon: 'eye', onClick: () => openVideo(v.id) },
                ws.isAdmin && { label: `Edit ${STAGE_LBL[stage].toLowerCase()} details`, icon: 'pen', onClick: () => openModal(<StageEditModal v={v} stage={stage} />) },
                ...stageActions(v, stage, ws.wfUser).filter((a) => a.tone !== 'primary').map((a) => ({ label: a.label, icon: a.tone === 'danger' ? 'x' : 'check', danger: a.tone === 'danger', onClick: () => act(v, stage, a) })),
              ]} />
            </div>) },
        ]} />
    </>
  );
}

/* ---------------- Staff management ---------------- */
export function StaffList() {
  const ws = useWorkspace();
  const nav = useNavigate();
  const run = useAction();
  const { openModal } = useUi();
  const [st, up] = useTableState('staff');
  const W = Object.fromEntries(workload(ws.staff, ws.allTasks).map((w) => [w.staff.id, w]));
  const mx = Math.max(1, ...Object.values(W).map((w) => w.active));
  const clientsOf = (s) => [...new Set([...(s.clients || []), ...ws.clients.filter((c) => c.manager === s.id).map((c) => c.id), ...ws.activeVideos.filter((v) => [v.script.writer, ...v.shoot.team, v.edit.editor, v.post.smm].includes(s.id)).map((v) => v.clientId)])].filter((id) => ws.clientsById[id]);
  return (
    <>
      <PageHeader title="Staff Management" sub="Employees, roles, client assignments, workload and productivity."
        actions={<><Btn icon="list" onClick={() => openModal(<TaskModal />)}>Allocate task</Btn><Btn kind="primary" icon="plus" onClick={() => openModal(<StaffModal />)}>Add employee</Btn></>} />
      <div className="minis">{JOB_ROLES.map((r) => <button type="button" key={r} className={`mini ${st.f.role === r ? 'on' : ''}`} onClick={() => up({ f: { ...st.f, role: st.f.role === r ? '' : r }, page: 1 })}><div className="muted sm">{r}</div><div className="v">{ws.staff.filter((s) => s.jobRole === r && s.status !== 'Inactive').length}</div></button>)}</div>
      <DataTable id="staff" rows={ws.staff} ph="Search employees…" onRow={(s) => nav(`/staff/${s.id}`)}
        search={(s) => [s.name, s.email, s.jobRole, s.phone].join(' ')}
        filters={[{ key: 'role', label: 'Role', options: JOB_ROLES, get: (s) => s.jobRole }, { key: 'status', label: 'Status', options: ['Active', 'On Leave', 'Inactive'], get: (s) => s.status }]}
        cols={[
          { key: 'name', label: 'Employee', render: (s) => <div className="cellm"><Avatar person={s} size={36} /><div><div className="t">{s.name}</div><div className="s">{s.email}</div></div></div>, sort: (s) => s.name },
          { key: 'role', label: 'Job role', render: (s) => <span className="chip">{s.jobRole}</span>, sort: (s) => s.jobRole },
          { key: 'clients', label: 'Clients', render: (s) => { const c = clientsOf(s); return <div className="row g4">{c.slice(0, 4).map((id) => <ClientMark key={id} c={ws.clientsById[id]} size={24} />)}{c.length > 4 && <span className="muted xs">+{c.length - 4}</span>}</div>; } },
          { key: 'load', label: 'Workload', render: (s) => <div className="row g8" style={{ minWidth: 130 }}><Progress value={pct(W[s.id]?.active || 0, mx)} color={W[s.id]?.overdue ? '#F87171' : undefined} /><span className="sm">{W[s.id]?.active || 0}</span></div>, sort: (s) => W[s.id]?.active || 0 },
          { key: 'od', label: 'Overdue', render: (s) => (W[s.id]?.overdue ? <span className="tag-od">{W[s.id].overdue}</span> : <span className="muted">0</span>), sort: (s) => W[s.id]?.overdue || 0 },
          { key: 'done', label: 'Completed', render: (s) => <>{W[s.id]?.done || 0} <span className="muted xs">{W[s.id]?.done ? `${W[s.id].onTimeRate}% on time` : ''}</span></>, sort: (s) => W[s.id]?.done || 0 },
          { key: 'status', label: 'Status', render: (s) => <Badge s={s.status} />, sort: (s) => s.status },
          { key: 'a', label: '', render: (s) => <div onClick={(e) => e.stopPropagation()}><Kebab items={[
            { label: 'View profile', icon: 'eye', onClick: () => nav(`/staff/${s.id}`) },
            { label: 'Edit employee', icon: 'pen', onClick: () => openModal(<StaffModal person={s} />) },
            { label: 'Allocate task', icon: 'list', onClick: () => openModal(<TaskModal assignee={s.id} />) },
            { label: 'View schedule', icon: 'calendar', onClick: () => nav(`/schedule?staff=${s.id}`) },
            s.status === 'Inactive' ? { label: 'Reactivate', icon: 'check', onClick: () => run(() => api.patch(`/staff/${s.id}`, { status: 'Active' }), `${s.name} reactivated`) }
              : { label: 'Deactivate', icon: 'archive', danger: true, onClick: () => run(() => api.patch(`/staff/${s.id}`, { status: 'Inactive' }), `${s.name} can no longer sign in`) },
          ]} /></div> },
        ]} />
    </>
  );
}

export function StaffProfile() {
  const { id } = useParams();
  const ws = useWorkspace();
  const nav = useNavigate();
  const { openModal } = useUi();
  const s = ws.staffById[id];
  if (!s) return <Empty>This employee doesn’t exist.</Empty>;
  const ts = ws.allTasks.filter((t) => t.who.includes(id));
  const w = workload([s], ws.allTasks)[0] || {};
  const byType = ['Script Writing', 'Video Shooting', 'Video Editing', 'Social Media Posting', 'General Task'].map((t) => ({ label: t.replace('Social Media ', ''), done: ts.filter((x) => x.type === t && x.done).length, open: ts.filter((x) => x.type === t && !x.done).length })).filter((x) => x.done + x.open);
  return (
    <>
      <div className="crumb" onClick={() => nav('/staff')}><Icon n="left" /> All staff</div>
      <div className="card mb"><div className="prof-h"><Avatar person={s} size={64} />
        <div><h2>{s.name}</h2><div className="muted">{s.jobRole} · joined {fmtY(s.joined)}</div><div className="row g8 wrap" style={{ marginTop: 8 }}><Badge s={s.status} /><span className="chip">{s.email}</span><span className="chip">{s.phone}</span></div></div>
        <span className="sp" /><div className="row g8 wrap"><Btn icon="calendar" onClick={() => nav(`/schedule?staff=${s.id}`)}>Schedule</Btn><Btn icon="list" onClick={() => openModal(<TaskModal assignee={s.id} />)}>Allocate task</Btn><Btn kind="primary" icon="pen" onClick={() => openModal(<StaffModal person={s} />)}>Edit</Btn></div></div></div>
      <div className="grid k4 mb">
        <Kpi label="Active tasks" value={w.active || 0} icon="zap" tone="indigo" /><Kpi label="Due this week" value={w.week || 0} icon="calendar" tone="sky" />
        <Kpi label="Overdue" value={w.overdue || 0} icon="alert" tone="red" /><Kpi label="Completed" value={w.done || 0} icon="checkc" tone="green" sub={`${w.onTimeRate || 0}% on time`} />
      </div>
      <div className="grid c12">
        <Card title="Tasks by stage">{byType.length ? <Bars data={byType} series={[{ key: 'done', label: 'Completed', color: '#10B981' }, { key: 'open', label: 'Open', color: '#A5B4FC' }]} h={220} /> : <Empty>No tasks yet</Empty>}</Card>
        <Card title="Open & upcoming tasks">{ts.filter((t) => !t.done).sort((a, b) => (a.due < b.due ? -1 : 1)).slice(0, 8).map((t) => <TaskRow key={t.id} t={t} actions={false} />)}{!ts.some((t) => !t.done) && <Empty>No open tasks</Empty>}</Card>
      </div>
    </>
  );
}
export { Legend };
