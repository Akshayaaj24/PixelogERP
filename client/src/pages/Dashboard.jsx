import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  STAGES, STAGE_DONE, EVENT_COLORS, stageIdx, stageName, videoOverdue, isOverdue, workload, scheduleConflicts, deriveEvents, myStage, involved,
  todayS, addDays, curMonth, parseD,
} from '@studioflow/shared';
import { api } from '../api.js';
import { useUi, useWorkspace } from '../lib/store.jsx';
import { Kpi, Card, PageHeader, Progress, Badge, Btn, Empty, Avatar, ClientMark, Icon, monthLabel, fmt, fmtL, wkday, ago, pct, greet } from '../components/ui.jsx';
import { LineChart, Legend } from '../components/charts.jsx';
import { TaskRow, ActionButtons, useStageAction } from '../components/workflow.jsx';
import { ClientModal, PackageModal, TaskModal, EventModal } from '../components/modals.jsx';

export function perfSeries(vids) {
  const ds = vids.map((v) => v.post.date).sort(); if (!ds.length) return null;
  const start = addDays(ds[0], -1); const end = ds[ds.length - 1]; const T = todayS();
  const lab = []; const plan = []; const act = []; let p = 0; let a = 0;
  for (let d = start; d <= end; d = addDays(d, 1)) {
    p += vids.filter((v) => v.post.date === d).length;
    a += vids.filter((v) => v.post.status === 'Published' && v.post.date === d).length;
    lab.push(fmt(d)); plan.push(p); act.push(d <= T ? a : null);
  }
  return { lab, plan, act };
}
export function ConflictList({ max = 10 }) {
  const { activeVideos, staffName } = useWorkspace();
  const { openVideo } = useUi();
  const cf = scheduleConflicts(activeVideos).filter((c) => c.date >= todayS());
  if (!cf.length) return <Empty>No schedule conflicts</Empty>;
  const code = (id) => activeVideos.find((v) => v.id === id)?.code;
  return <>{cf.slice(0, max).map((c) => (
    <div key={c.date + c.time + c.staffId} className="note-box bad">
      <div className="row g8 b"><Icon n="alert" /> {staffName(c.staffId)} is double-booked</div>
      <div className="sm" style={{ marginTop: 4 }}>{fmtL(c.date)} at {c.time} — {c.videoIds.map((id, i) => <span key={id}>{i ? ' & ' : ''}<a href="#" onClick={(e) => { e.preventDefault(); openVideo(id); }}>{code(id)}</a></span>)}</div>
    </div>))}{cf.length > max && <div className="muted sm">+{cf.length - max} more</div>}</>;
}

export default function Dashboard() {
  const ws = useWorkspace();
  return ws.isAdmin ? <AdminDashboard /> : <StaffDashboard />;
}

function AdminDashboard() {
  const ws = useWorkspace();
  const nav = useNavigate();
  const { openModal, openVideo } = useUi();
  const act = useStageAction();
  const activity = useQuery({ queryKey: ['activity'], queryFn: () => api.get('/activity?limit=8') });
  const T = todayS(); const vids = ws.curVideos; const target = ws.curPackages.reduce((a, p) => a + p.target, 0);
  const done = vids.filter((v) => v.post.status === 'Published').length;
  const shoots = ws.activeVideos.filter((v) => ['Scheduled', 'Rescheduled'].includes(v.shoot.status) && v.shoot.date >= T).length;
  const posts = ws.activeVideos.filter((v) => v.post.status === 'Scheduled').length;
  const activeProj = ws.curPackages.filter((p) => ws.videos.some((v) => v.packageId === p.id && v.post.status !== 'Published')).length;
  const ps = perfSeries(vids);
  const todays = deriveEvents({ videos: ws.activeVideos, tasks: ws.generalTasks, events: ws.events, clientsById: ws.clientsById }).filter((e) => e.date === T).sort((a, b) => ((a.time || '99') < (b.time || '99') ? -1 : 1));
  const upcoming = ws.allTasks.filter((t) => !t.done && t.ready && t.due >= T && t.due <= addDays(T, 7)).sort((a, b) => (a.due < b.due ? -1 : 1));
  const overdue = ws.allTasks.filter((t) => isOverdue(t));
  const approvals = ws.activeVideos.flatMap((v) => [
    ['Submitted', 'Under Review'].includes(v.script.status) && { v, stage: 'script', label: 'Script', who: v.script.writer },
    v.edit.status === 'Internal Review' && { v, stage: 'edit', label: 'Final video', who: v.edit.editor },
  ].filter(Boolean));
  const wl = workload(ws.staff, ws.allTasks).sort((a, b) => b.active - a.active).slice(0, 8);
  const mx = Math.max(1, ...wl.map((w) => w.active));
  return (
    <>
      <PageHeader title={`Good ${greet()}, ${ws.user.name}`} sub={`Here’s where ${ws.settings.agency}’s ${monthLabel(curMonth())} production stands.`}
        actions={<><Btn icon="plus" onClick={() => openModal(<ClientModal />)}>Add client</Btn><Btn kind="primary" icon="layers" onClick={() => openModal(<PackageModal />)}>New monthly package</Btn></>} />
      <div className="grid k4 mb">
        <Kpi label="Total Clients" value={ws.clients.filter((c) => c.status !== 'Archived').length} icon="briefcase" tone="indigo" sub={`${ws.clients.filter((c) => c.status === 'Active').length} active`} onClick={() => nav('/clients')} />
        <Kpi label="Active Projects" value={activeProj} icon="layers" tone="violet" sub={monthLabel(curMonth())} onClick={() => nav('/planning')} />
        <Kpi label="Total Staff" value={ws.staff.filter((s) => s.status !== 'Inactive').length} icon="users" tone="sky" sub="across 6 roles" onClick={() => nav('/staff')} />
        <Kpi label="Monthly Video Targets" value={target} icon="target" tone="teal" sub={`${ws.curPackages.length} packages`} />
        <Kpi label="Completed Videos" value={done} icon="checkc" tone="green" sub={`${pct(done, target)}% of target`} />
        <Kpi label="Pending Videos" value={target - done} icon="hourglass" tone="amber" sub={`${vids.filter((v) => videoOverdue(v)).length} overdue`} />
        <Kpi label="Upcoming Shoots" value={shoots} icon="camera" tone="pink" sub="approved & scheduled" onClick={() => nav('/shoots')} />
        <Kpi label="Scheduled Posts" value={posts} icon="send" tone="indigo" sub="ready to publish" onClick={() => nav('/posting')} />
      </div>
      <div className="grid c32 mb">
        <Card title="Overall Production Progress" extra={<Btn size="sm" onClick={() => nav('/planning')}>Open planning</Btn>}>
          <div className="row g12 mb" style={{ alignItems: 'baseline' }}><span style={{ fontSize: 30, fontWeight: 700 }}>{pct(done, target)}%</span><span className="muted">of this month’s videos published</span></div>
          <div className="fun">{STAGES.map((s, i) => { const n = vids.filter((v) => stageIdx(v) > i).length; return <div key={s} className="fun-r"><span className="row g8"><span className="dot" style={{ background: EVENT_COLORS[s] }} />{STAGE_DONE[i]}</span><Progress value={pct(n, target)} color={EVENT_COLORS[s]} /><span className="n"><b style={{ color: 'var(--text)' }}>{n}</b> / {target}</span></div>; })}</div>
        </Card>
        <Card title="Monthly Performance Analytics" extra={<span className="muted sm">Planned vs published</span>}>
          {ps ? <LineChart labels={ps.lab} series={[{ label: 'Planned (cumulative)', color: '#A5B4FC', vals: ps.plan, dash: true }, { label: 'Published (cumulative)', color: '#4F46E5', vals: ps.act, area: true }]} /> : <Empty>No packages this month yet</Empty>}
        </Card>
      </div>
      <div className="grid k3 mb">
        <Card title="Today's Schedule" extra={<Btn size="sm" onClick={() => nav('/calendar')}>Calendar</Btn>}>
          {todays.length ? todays.slice(0, 7).map((e) => (
            <div key={e.key || e.label} className="trow" onClick={() => (e.videoId ? openVideo(e.videoId) : e.taskId ? openModal(<TaskModal id={e.taskId} />) : openModal(<EventModal id={e.eventId} />))}>
              <span className="dot" style={{ background: EVENT_COLORS[e.cat] }} /><div className="trow-m"><div className="trow-t">{e.label}</div><div className="trow-s">{e.time || 'All day'} · {e.cat}{e.staff.length ? ` · ${e.staff.slice(0, 2).map(ws.staffName).join(', ')}` : ''}</div></div>{e.status && <Badge s={e.status} />}
            </div>)) : <Empty>Nothing scheduled today</Empty>}
        </Card>
        <Card title="Upcoming Deadlines">
          {overdue.length > 0 && <div className="note-box bad row g8" style={{ cursor: 'pointer' }} onClick={() => nav('/reports?tab=Overdue')}><Icon n="alert" /><span><b>{overdue.length} overdue tasks</b> need attention — open the report</span></div>}
          {upcoming.length ? upcoming.slice(0, 6).map((t) => <TaskRow key={t.id} t={t} actions={false} showWho />) : <Empty>No deadlines in the next 7 days</Empty>}
        </Card>
        <Card title="Pending Approvals" extra={<Badge s={String(approvals.length)} />}>
          {approvals.length ? approvals.slice(0, 6).map((a) => (
            <div key={a.v.id + a.stage} className="trow" onClick={() => openVideo(a.v.id)}>
              <span className="dot" style={{ background: EVENT_COLORS[a.stage === 'script' ? 'Script Approval' : 'Video Review'] }} />
              <div className="trow-m"><div className="trow-t">{a.v.title}</div><div className="trow-s">{a.label} · {ws.staffName(a.who)} · {ws.clientsById[a.v.clientId]?.name}</div></div>
              <div className="trow-r">
                <Btn size="sm" kind="primary" onClick={(e) => { e.stopPropagation(); act(a.v, a.stage, { status: 'Approved' }); }}>Approve</Btn>
                <Btn size="sm" kind="warn" onClick={(e) => { e.stopPropagation(); act(a.v, a.stage, { status: 'Revision Required', form: 'revise' }); }}>Revise</Btn>
              </div>
            </div>)) : <Empty>All caught up — nothing waiting for approval</Empty>}
        </Card>
      </div>
      <div className="grid c32 mb">
        <Card title="Client-wise Production Status" extra={<Btn size="sm" onClick={() => nav('/clients')}>All clients</Btn>}>
          <div className="tbl-wrap"><table><thead><tr><th>Client</th><th style={{ width: '40%' }}>Pipeline</th><th>Published</th><th>Health</th></tr></thead><tbody>
            {ws.curPackages.map((p) => { const c = ws.clientsById[p.clientId]; const vs = ws.videos.filter((v) => v.packageId === p.id); const seg = [0, 0, 0, 0, 0, 0, 0]; vs.forEach((v) => seg[stageIdx(v)]++); const od = vs.filter((v) => videoOverdue(v)).length;
              return <tr key={p.id} className="click" onClick={() => nav(`/clients/${c.id}`)}><td><div className="cellm"><ClientMark c={c} size={30} /><div><div className="t">{c.name}</div><div className="s">{p.name}</div></div></div></td>
                <td><div className="seg">{seg.map((n, i) => (n ? <i key={i} title={`${stageName(i)}: ${n}`} style={{ width: `${pct(n, p.target)}%`, background: i === 6 ? '#10B981' : EVENT_COLORS[STAGES[i]], opacity: i === 6 ? 1 : 0.75 }} /> : null))}</div></td>
                <td><b>{seg[6]}</b><span className="muted">/{p.target}</span></td><td>{od ? <span className="tag-od">{od} overdue</span> : <Badge s="On track" />}</td></tr>; })}
          </tbody></table></div>
          <Legend series={[...STAGES.map((s) => ({ label: s, color: EVENT_COLORS[s] })), { label: 'Published', color: '#10B981' }]} />
        </Card>
        <Card title="Staff Workload Overview" extra={<Btn size="sm" onClick={() => nav('/schedule')}>Schedules</Btn>}>
          {wl.map((w) => <div key={w.staff.id} className="hb" style={{ cursor: 'pointer' }} onClick={() => nav(`/staff/${w.staff.id}`)}><div className="l"><Avatar person={w.staff} size={24} /><span>{w.staff.name.split(' ')[0]}</span></div><div className="bar"><i style={{ width: `${pct(w.active - w.overdue, mx)}%`, background: '#818CF8' }} /><i style={{ width: `${pct(w.overdue, mx)}%`, background: '#F87171' }} /></div><div className="n">{w.active} active</div></div>)}
          <Legend series={[{ label: 'Active on track', color: '#818CF8' }, { label: 'Overdue', color: '#F87171' }]} />
        </Card>
      </div>
      <div className="grid c21">
        <Card title="Recent Activities"><div className="tl">{(activity.data || []).map((a) => <div key={a.id} className="tl-i" style={a.videoId ? { cursor: 'pointer' } : undefined} onClick={() => a.videoId && openVideo(a.videoId)}><div className="tx">{a.text}</div><div className="tm">{ago(a.createdAt)}</div></div>)}{!activity.data?.length && <Empty>No activity yet</Empty>}</div></Card>
        <Card title="Schedule conflicts"><ConflictList max={4} /></Card>
      </div>
    </>
  );
}

function StaffDashboard() {
  const ws = useWorkspace();
  const nav = useNavigate();
  const { openVideo } = useUi();
  const me = ws.user.id; const T = todayS();
  const ts = ws.allTasks.filter((t) => t.who.includes(me));
  const today = ts.filter((t) => !t.done && t.ready && t.due <= T).sort((a, b) => (a.due < b.due ? -1 : 1));
  const week = ts.filter((t) => !t.done && t.due > T && t.due <= addDays(T, 7)).sort((a, b) => (a.due < b.due ? -1 : 1));
  const overdue = ts.filter((t) => isOverdue(t)); const done = ts.filter((t) => t.done);
  const feedback = ws.activeVideos.filter((v) => involved(v, me)).flatMap((v) => v.notes.filter((n) => n.kind === 'feedback' && myStage(v, n.stage, me)).map((n) => ({ ...n, v }))).sort((a, b) => (a.at < b.at ? 1 : -1));
  const myClients = ws.clients;
  return (
    <>
      <PageHeader title={`Good ${greet()}, ${ws.user.name.split(' ')[0]}`} sub={`${ws.user.jobRole} · Your work for ${fmtL(T)}`}
        actions={<><Btn icon="calendar" onClick={() => nav('/calendar')}>My calendar</Btn><Btn kind="primary" icon="list" onClick={() => nav('/my-tasks')}>All my tasks</Btn></>} />
      <div className="grid k4 mb">
        <Kpi label="Due today" value={ts.filter((t) => !t.done && t.due === T).length} icon="clock" tone="indigo" />
        <Kpi label="Next 7 days" value={week.length} icon="calendar" tone="sky" />
        <Kpi label="Overdue" value={overdue.length} icon="alert" tone="red" sub={overdue.length ? 'needs action' : 'none — nice work'} />
        <Kpi label="Completed" value={done.length} icon="checkc" tone="green" sub={`${pct(done.filter((t) => !t.doneAt || t.doneAt <= t.due).length, done.length)}% on time`} />
      </div>
      <div className="strip"><div className="minis" style={{ gridTemplateColumns: 'repeat(7,minmax(70px,1fr))' }}>
        {[...Array(7)].map((_, i) => { const d = addDays(T, i); const n = ts.filter((t) => !t.done && t.due === d).length; return <button type="button" key={d} className="mini" style={{ textAlign: 'center' }} onClick={() => nav(`/calendar?view=day&date=${d}`)}><div className="muted sm">{wkday(d)}</div><div className="v">{parseD(d).getDate()}</div><div className={`sm ${n ? 'b' : 'muted'}`} style={n ? { color: 'var(--pri)' } : undefined}>{n ? `${n} due` : 'free'}</div></button>; })}
      </div></div>
      <div className="grid c21 mb">
        <Card title="Today & overdue" extra={<Badge s={String(today.length)} />}>{today.length ? today.map((t) => <TaskRow key={t.id} t={t} />) : <Empty>Nothing due today. Your next deadlines are listed below.</Empty>}</Card>
        <Card title="Revision feedback">{feedback.length ? feedback.slice(0, 5).map((n, i) => <div key={i} className="note fb" style={{ cursor: 'pointer' }} onClick={() => openVideo(n.v.id)}><div className="h"><b>{n.byName}</b> · {n.stage} · {ago(n.at)}</div><div className="sm b">{n.v.title}</div><div className="sm">{n.text}</div></div>) : <Empty>No revision requests</Empty>}</Card>
      </div>
      <div className="grid c21">
        <Card title="Upcoming deadlines">{week.length ? week.slice(0, 8).map((t) => <TaskRow key={t.id} t={t} />) : <Empty>No deadlines this week</Empty>}</Card>
        <Card title="My clients">{myClients.length ? myClients.map((c) => <div key={c.id} className="trow" onClick={() => nav('/my-clients')}><div className="cellm"><ClientMark c={c} size={32} /><div><div className="t">{c.name}</div><div className="s">{c.category}</div></div></div><span className="sp" /><span className="muted sm">{ws.activeVideos.filter((v) => v.clientId === c.id && involved(v, me)).length} videos</span></div>) : <Empty>No clients assigned yet</Empty>}</Card>
      </div>
    </>
  );
}
export { ActionButtons };
