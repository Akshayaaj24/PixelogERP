import { useSearchParams } from 'react-router-dom';
import { STAGES, POST_ST, PLATFORMS, EVENT_COLORS, stageIdx, stageName, videoOverdue, videoStatus, isOverdue, workload, curMonth, todayS, diffDays } from '@PixelogERP/shared';
import { useUi, useWorkspace } from '../lib/store.jsx';
import { DataTable, PageHeader, Card, Badge, Btn, Kpi, Progress, Person, Avatar, ClientMark, Empty, fmtY, monthLabel, pct } from '../components/ui.jsx';
import { Bars, Donut, LineChart, Legend } from '../components/charts.jsx';
import { VideoCell } from '../components/workflow.jsx';
import { PlatformMark } from './Production.jsx';
import { perfSeries } from './Dashboard.jsx';

const TABS = [['Overview', 'Overview'], ['Clients', 'Monthly client reports'], ['Staff', 'Staff performance'], ['Production', 'Production & pending work'], ['Publishing', 'Publishing performance'], ['Overdue', 'Overdue tasks']];

function clientRows(ws) {
  return ws.curPackages.map((p) => {
    const vs = ws.videos.filter((v) => v.packageId === p.id); const n = (i) => vs.filter((v) => stageIdx(v) > i).length;
    return { id: p.id, c: ws.clientsById[p.clientId], p, target: p.target, scripts: n(1), shot: n(2), edited: n(4), published: n(5), od: vs.filter((v) => videoOverdue(v)).length, util: pct(n(5), p.target), notStarted: vs.filter((v) => v.script.status === 'Pending').length };
  });
}
function toCsv(rows) { return rows.map((r) => r.map((x) => `"${String(x ?? '').replace(/"/g, '""')}"`).join(',')).join('\n'); }
function csvFor(tab, ws) {
  if (tab === 'Clients') return toCsv([['Client', 'Package', 'Target', 'Scripts approved', 'Shot', 'Edited', 'Published', 'Overdue', 'Utilisation %'], ...clientRows(ws).map((r) => [r.c.name, r.p.name, r.target, r.scripts, r.shot, r.edited, r.published, r.od, r.util])]);
  if (tab === 'Staff') return toCsv([['Employee', 'Role', 'Assigned', 'Completed', 'Active', 'Overdue', 'On-time %'], ...workload(ws.staff, ws.allTasks).map((w) => [w.staff.name, w.staff.jobRole, w.total, w.done, w.active, w.overdue, w.onTimeRate])]);
  if (tab === 'Overdue') return toCsv([['Task', 'Video', 'Assigned to', 'Due', 'Status'], ...ws.allTasks.filter((t) => isOverdue(t)).map((t) => [t.title, t.code || '', t.who.map(ws.staffName).join('; '), t.due, t.status])]);
  return toCsv([['Video ID', 'Title', 'Client', 'Script writer', 'Videographer', 'Editor', 'Social media manager', 'Script deadline', 'Shooting date', 'Editing deadline', 'Posting date', 'Current stage', 'Overall status'],
    ...ws.activeVideos.map((v) => [v.code, v.title, ws.clientsById[v.clientId]?.name, ws.staffName(v.script.writer), ws.staffName(v.shoot.team[0]), ws.staffName(v.edit.editor), ws.staffName(v.post.smm), v.script.deadline, v.shoot.date, v.edit.deadline, v.post.date, stageName(stageIdx(v)), videoStatus(v)])]);
}

export default function Reports() {
  const ws = useWorkspace();
  const [sp, setSp] = useSearchParams();
  const tab = sp.get('tab') || 'Overview';
  const download = () => {
    const url = URL.createObjectURL(new Blob([csvFor(tab, ws)], { type: 'text/csv' }));
    Object.assign(document.createElement('a'), { href: url, download: `PixelogERP-${tab.toLowerCase()}-${todayS()}.csv` }).click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };
  return (
    <>
      <PageHeader title="Reports & Analytics" sub={`Performance for ${monthLabel(curMonth())}`} actions={<Btn icon="download" onClick={download}>Download CSV</Btn>} />
      <div className="pill-tabs" role="tablist">{TABS.map(([k, l]) => <button type="button" key={k} className={tab === k ? 'on' : ''} onClick={() => setSp({ tab: k })}>{l}</button>)}</div>
      {tab === 'Overview' && <Overview />}{tab === 'Clients' && <ClientsReport />}{tab === 'Staff' && <StaffReport />}
      {tab === 'Production' && <Production />}{tab === 'Publishing' && <Publishing />}{tab === 'Overdue' && <Overdue />}
    </>
  );
}

function Overview() {
  const ws = useWorkspace();
  const vids = ws.curVideos; const ts = ws.allTasks; const done = ts.filter((t) => t.done);
  const target = ws.curPackages.reduce((a, p) => a + p.target, 0); const pub = vids.filter((v) => v.post.status === 'Published').length;
  const st = [0, 0, 0, 0, 0, 0, 0]; vids.forEach((v) => st[stageIdx(v)]++);
  const ps = perfSeries(vids); const cr = clientRows(ws);
  return (
    <>
      <div className="grid k4 mb">
        <Kpi label="Videos planned" value={target} icon="target" tone="indigo" />
        <Kpi label="Published" value={pub} icon="checkc" tone="green" sub={`${pct(pub, target)}% of packages used`} />
        <Kpi label="Task completion" value={`${pct(done.length, ts.length)}%`} icon="zap" tone="sky" sub={`${done.length} of ${ts.length} tasks`} />
        <Kpi label="On-time delivery" value={`${pct(done.filter((t) => !t.doneAt || t.doneAt <= t.due).length, done.length)}%`} icon="clock" tone="amber" sub={`${ts.filter((t) => isOverdue(t)).length} tasks overdue`} />
      </div>
      <div className="grid c12 mb">
        <Card title="Videos by current stage"><Donut items={[...STAGES, 'Published'].map((s, i) => ({ label: s, value: st[i], color: i === 6 ? '#059669' : EVENT_COLORS[s] }))} label={vids.length} sub="videos" /></Card>
        <Card title="Production by client"><Bars data={cr.map((r) => ({ label: r.c.name, pub: r.published, prog: r.target - r.published - r.notStarted, ns: r.notStarted }))} series={[{ key: 'pub', label: 'Published', color: '#10B981' }, { key: 'prog', label: 'In production', color: '#818CF8' }, { key: 'ns', label: 'Not started', color: '#CBD5E1' }]} /></Card>
      </div>
      <div className="grid c21">
        <Card title="Publishing trend">{ps ? <LineChart labels={ps.lab} series={[{ label: 'Planned', color: '#A5B4FC', vals: ps.plan, dash: true }, { label: 'Published', color: '#10B981', vals: ps.act, area: true }]} /> : <Empty>No data yet</Empty>}</Card>
        <Card title="Task completion"><Donut items={[{ label: 'Completed', value: done.length, color: '#10B981' }, { label: 'In progress', value: ts.filter((t) => !t.done && t.ready && !isOverdue(t)).length, color: '#818CF8' }, { label: 'Waiting', value: ts.filter((t) => !t.done && !t.ready && !isOverdue(t)).length, color: '#CBD5E1' }, { label: 'Overdue', value: ts.filter((t) => isOverdue(t)).length, color: '#F87171' }]} label={`${pct(done.length, ts.length)}%`} sub="complete" /></Card>
      </div>
    </>
  );
}
function ClientsReport() {
  const ws = useWorkspace(); const r = clientRows(ws);
  return (
    <>
      <Card title="Monthly package utilisation" className="mb">
        {r.map((x) => <div key={x.id} className="hb"><div className="l"><ClientMark c={x.c} size={24} /><span>{x.c.name}</span></div><div className="bar"><i style={{ width: `${x.util}%`, background: '#10B981' }} /><i style={{ width: `${pct(x.edited - x.published, x.target)}%`, background: '#818CF8' }} /><i style={{ width: `${pct(x.shot - x.edited, x.target)}%`, background: '#C7D2FE' }} /></div><div className="n">{x.util}%</div></div>)}
        <Legend series={[{ label: 'Published', color: '#10B981' }, { label: 'Edited, awaiting post', color: '#818CF8' }, { label: 'Shot, in edit', color: '#C7D2FE' }]} />
      </Card>
      <DataTable id="rep-clients" rows={r} search={(x) => x.c.name} defaults={{ sort: 'util', dir: -1 }}
        cols={[
          { key: 'c', label: 'Client', render: (x) => <div className="cellm"><ClientMark c={x.c} size={28} /><span className="t">{x.c.name}</span></div>, sort: (x) => x.c.name },
          { key: 'p', label: 'Package', render: (x) => <span className="sm">{x.p.name}</span> },
          { key: 't', label: 'Target', render: (x) => x.target, sort: (x) => x.target },
          { key: 's', label: 'Scripts approved', render: (x) => x.scripts }, { key: 'sh', label: 'Shot', render: (x) => x.shot }, { key: 'e', label: 'Edited', render: (x) => x.edited },
          { key: 'pb', label: 'Published', render: (x) => <b>{x.published}</b>, sort: (x) => x.published },
          { key: 'od', label: 'Overdue', render: (x) => (x.od ? <span className="tag-od">{x.od}</span> : '0'), sort: (x) => x.od },
          { key: 'util', label: 'Utilisation', render: (x) => <div className="row g8" style={{ minWidth: 110 }}><Progress value={x.util} color="#10B981" /><span className="sm">{x.util}%</span></div>, sort: (x) => x.util },
        ]} />
    </>
  );
}
function StaffReport() {
  const ws = useWorkspace(); const wl = workload(ws.staff, ws.allTasks).filter((w) => w.total).map((w) => ({ ...w, id: w.staff.id }));
  return (
    <>
      <Card title="Completed vs overdue by person" className="mb"><Bars data={wl.map((w) => ({ label: w.staff.name.split(' ')[0], done: w.done, active: w.active - w.overdue, od: w.overdue }))} series={[{ key: 'done', label: 'Completed', color: '#10B981' }, { key: 'active', label: 'Active', color: '#818CF8' }, { key: 'od', label: 'Overdue', color: '#F87171' }]} h={250} /></Card>
      <DataTable id="rep-staff" rows={wl} search={(w) => `${w.staff.name} ${w.staff.jobRole}`} defaults={{ sort: 'done', dir: -1 }}
        filters={[{ key: 'role', label: 'Role', options: [...new Set(wl.map((w) => w.staff.jobRole))], get: (w) => w.staff.jobRole }]}
        cols={[
          { key: 'n', label: 'Employee', render: (w) => <div className="cellm"><Avatar person={w.staff} size={28} /><span className="t">{w.staff.name}</span></div>, sort: (w) => w.staff.name },
          { key: 'r', label: 'Role', render: (w) => <span className="sm">{w.staff.jobRole}</span> },
          { key: 't', label: 'Assigned', render: (w) => w.total, sort: (w) => w.total },
          { key: 'done', label: 'Completed', render: (w) => <b>{w.done}</b>, sort: (w) => w.done },
          { key: 'a', label: 'Active', render: (w) => w.active, sort: (w) => w.active }, { key: 'w', label: 'Waiting', render: (w) => w.waiting },
          { key: 'od', label: 'Overdue', render: (w) => (w.overdue ? <span className="tag-od">{w.overdue}</span> : '0'), sort: (w) => w.overdue },
          { key: 'ot', label: 'On-time rate', render: (w) => <div className="row g8" style={{ minWidth: 110 }}><Progress value={w.onTimeRate} color={w.onTimeRate >= 80 ? '#10B981' : w.onTimeRate >= 60 ? '#F59E0B' : '#F87171'} /><span className="sm">{w.done ? `${w.onTimeRate}%` : '—'}</span></div>, sort: (w) => w.onTimeRate },
        ]} />
    </>
  );
}
function TaskTable({ id, rows, empty }) {
  const ws = useWorkspace(); const { openVideo } = useUi();
  return (
    <DataTable id={id} rows={rows} empty={empty} search={(t) => `${t.title} ${t.who.map(ws.staffName).join(' ')}`} defaults={{ sort: 'due' }} onRow={(t) => t.videoId && openVideo(t.videoId)}
      filters={[{ key: 'type', label: 'Stage', options: [...STAGES.filter((s) => !/Approval|Review/.test(s)), 'General Task'], get: (t) => t.type }, { key: 'who', label: 'Staff', options: ws.staffOpts(), get: (t) => t.who }]}
      cols={[
        { key: 't', label: 'Task', render: (t) => <div className="cellm"><span className="dot" style={{ background: EVENT_COLORS[t.type] }} /><div><div className="t">{t.title}</div><div className="s">{t.code || t.type}{t.clientId && ws.clientsById[t.clientId] ? ` · ${ws.clientsById[t.clientId].name}` : ''}</div></div></div>, sort: (t) => t.title },
        { key: 'who', label: 'Assigned to', render: (t) => (t.who.length ? t.who.map((s) => <div key={s}><Person person={ws.staffById[s]} size={22} /></div>) : '—'), sort: (t) => ws.staffName(t.who[0]) },
        { key: 'due', label: 'Due', render: (t) => fmtY(t.due), sort: (t) => t.due },
        { key: 'late', label: 'Days late', render: (t) => (isOverdue(t) ? <span className="tag-od">{diffDays(todayS(), t.due)}d</span> : '—'), sort: (t) => t.due },
        { key: 's', label: 'Status', render: (t) => <><Badge s={t.status} />{!t.ready && !t.done && <span className="muted xs"> blocked</span>}</>, sort: (t) => t.status },
      ]} />
  );
}
function Production() {
  const ws = useWorkspace(); const ts = ws.allTasks;
  const stg = ['Script Writing', 'Video Shooting', 'Video Editing', 'Social Media Posting'].map((t) => ({ label: t.replace('Social Media ', ''), done: ts.filter((x) => x.type === t && x.done).length, active: ts.filter((x) => x.type === t && !x.done && x.ready).length, wait: ts.filter((x) => x.type === t && !x.done && !x.ready).length }));
  const pend = ts.filter((t) => !t.done && t.ready);
  return (
    <>
      <div className="grid k2 mb">
        <Card title="Task completion by stage"><Bars data={stg} series={[{ key: 'done', label: 'Completed', color: '#10B981' }, { key: 'active', label: 'In progress', color: '#818CF8' }, { key: 'wait', label: 'Waiting', color: '#CBD5E1' }]} /></Card>
        <Card title="Video production funnel"><div className="fun">{STAGES.map((s, i) => { const n = ws.curVideos.filter((v) => stageIdx(v) > i).length; const tot = ws.curVideos.length; return <div key={s} className="fun-r"><span>{s}</span><Progress value={pct(n, tot)} color={EVENT_COLORS[s]} /><span className="n">{n}/{tot}</span></div>; })}</div></Card>
      </div>
      <h2 style={{ fontSize: 17, margin: '8px 0 12px' }}>Pending work ({pend.length} tasks ready to be worked on)</h2>
      <TaskTable id="rep-pending" rows={pend} />
    </>
  );
}
function Publishing() {
  const ws = useWorkspace(); const { openVideo } = useUi(); const vids = ws.activeVideos; const pub = vids.filter((v) => v.post.status === 'Published');
  const onTime = pub.filter((v) => !v.post.doneAt || v.post.doneAt <= v.post.date).length;
  return (
    <>
      <div className="grid k4 mb">
        <Kpi label="Published" value={pub.length} icon="checkc" tone="green" /><Kpi label="Scheduled" value={vids.filter((v) => v.post.status === 'Scheduled').length} icon="send" tone="indigo" />
        <Kpi label="Failed" value={vids.filter((v) => v.post.status === 'Failed').length} icon="alert" tone="red" /><Kpi label="Published on schedule" value={`${pct(onTime, pub.length)}%`} icon="clock" tone="teal" />
      </div>
      <div className="grid c21 mb">
        <Card title="Posts by platform"><Bars stacked={false} data={PLATFORMS.map((p) => ({ label: p, pub: pub.filter((v) => v.post.platforms.includes(p)).length, sch: vids.filter((v) => v.post.status === 'Scheduled' && v.post.platforms.includes(p)).length }))} series={[{ key: 'pub', label: 'Published', color: '#10B981' }, { key: 'sch', label: 'Scheduled', color: '#818CF8' }]} /></Card>
        <Card title="Publishing status"><Donut items={POST_ST.map((s, i) => ({ label: s, value: vids.filter((v) => v.post.status === s).length, color: ['#CBD5E1', '#818CF8', '#F59E0B', '#10B981', '#F87171'][i] }))} label={vids.length} sub="posts" /></Card>
      </div>
      <DataTable id="rep-pub" rows={vids.filter((v) => ['Published', 'Scheduled', 'Failed'].includes(v.post.status))} search={(v) => `${v.title} ${v.code}`} defaults={{ sort: 'd', dir: -1 }} onRow={(v) => openVideo(v.id)}
        filters={[{ key: 's', label: 'Status', options: ['Published', 'Scheduled', 'Failed'], get: (v) => v.post.status }, { key: 'p', label: 'Platform', options: PLATFORMS, get: (v) => v.post.platforms }]}
        cols={[
          { key: 'v', label: 'Video', render: (v) => <VideoCell v={v} />, sort: (v) => v.code },
          { key: 'd', label: 'Date', render: (v) => `${fmtY(v.post.date)} ${v.post.time}`, sort: (v) => v.post.date },
          { key: 'p', label: 'Platforms', render: (v) => <div className="row g4">{v.post.platforms.map((p) => <PlatformMark key={p} p={p} />)}</div> },
          { key: 'm', label: 'Manager', render: (v) => <Person person={ws.staffById[v.post.smm]} size={22} /> },
          { key: 's', label: 'Status', render: (v) => <Badge s={v.post.status} />, sort: (v) => v.post.status },
          { key: 'l', label: 'Link', render: (v) => (v.post.link ? <a href={v.post.link} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>Open</a> : '—') },
        ]} />
    </>
  );
}
function Overdue() {
  const ws = useWorkspace(); const od = ws.allTasks.filter((t) => isOverdue(t));
  return <TaskTable id="rep-od" rows={od} empty="No overdue tasks" />;
}
