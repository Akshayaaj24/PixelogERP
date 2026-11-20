// Staff-only pages: my tasks, my clients, completed history.
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { EVENT_COLORS, isOverdue, involved, stageIdx, stageName, diffDays } from '@PixelogERP/shared';
import { api } from '../api.js';
import { useAction, useUi, useWorkspace } from '../lib/store.jsx';
import { DataTable, PageHeader, Card, Badge, Btn, ClientMark, Empty, Due, fmtY } from '../components/ui.jsx';
import { ActionButtons } from '../components/workflow.jsx';
import { TaskModal } from '../components/modals.jsx';

const TYPES = ['Script Writing', 'Video Shooting', 'Video Editing', 'Social Media Posting', 'General Task'];

export function MyTasks() {
  const ws = useWorkspace(); const { openVideo, openModal } = useUi(); const run = useAction();
  const [tab, setTab] = useState('Active');
  const ts = ws.allTasks.filter((t) => t.who.includes(ws.user.id));
  const sets = { Active: ts.filter((t) => !t.done && t.ready), Upcoming: ts.filter((t) => !t.done && !t.ready), Overdue: ts.filter((t) => isOverdue(t)), Completed: ts.filter((t) => t.done) };
  const video = (t) => ws.videos.find((v) => v.id === t.videoId);
  return (
    <>
      <PageHeader title="My Tasks" sub="Everything assigned to you. Open a task to update its status or add notes. Share the actual files on WhatsApp." />
      <div className="pill-tabs" role="tablist">{Object.keys(sets).map((k) => <button type="button" key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{k} ({sets[k].length})</button>)}</div>
      <DataTable id={`mytasks-${tab}`} rows={sets[tab]} ph="Search tasks…" defaults={{ sort: 'due' }} empty={tab === 'Overdue' ? 'Nothing overdue' : 'No tasks here'}
        search={(t) => `${t.title} ${t.code || ''} ${ws.clientsById[t.clientId]?.name || ''}`}
        onRow={(t) => (t.videoId ? openVideo(t.videoId) : openModal(<TaskModal id={t.taskId} />))}
        filters={[{ key: 'type', label: 'Stage', options: TYPES, get: (t) => t.type }, { key: 'client', label: 'Client', options: ws.clients.map((c) => [c.id, c.name]), get: (t) => t.clientId }]}
        cols={[
          { key: 'title', label: 'Task', render: (t) => <div className="cellm"><span className="dot" style={{ background: EVENT_COLORS[t.type] }} /><div style={{ minWidth: 0 }}><div className="t">{t.title}</div><div className="s">{t.code || t.type}{ws.clientsById[t.clientId] ? ` · ${ws.clientsById[t.clientId].name}` : ''}</div></div></div>, sort: (t) => t.title },
          { key: 'type', label: 'Stage', render: (t) => <span className="chip">{t.type}</span>, sort: (t) => t.type },
          { key: 'due', label: 'Due', render: (t) => <><Due date={t.due} done={t.done} />{t.time && <span className="muted sm"> {t.time}</span>}</>, sort: (t) => t.due },
          { key: 'status', label: 'Status', render: (t) => <Badge s={t.status} />, sort: (t) => t.status },
          { key: 'a', label: '', render: (t) => <div className="acts" onClick={(e) => e.stopPropagation()}>{t.videoId && video(t) ? <ActionButtons v={video(t)} stage={t.stage} only={2} /> : !t.done && <Btn size="sm" icon="check" onClick={() => run(() => api.patch(`/tasks/${t.taskId}`, { status: 'Completed' }), 'Task completed').catch(() => {})}>Done</Btn>}</div> },
        ]} />
    </>
  );
}

export function MyClients() {
  const ws = useWorkspace(); const { openVideo } = useUi(); const me = ws.user.id;
  return (
    <>
      <PageHeader title="My Clients" sub="Details for the accounts you work on." />
      {ws.clients.length ? <div className="grid k2">{ws.clients.map((c) => { const vs = ws.activeVideos.filter((v) => v.clientId === c.id && involved(v, me)); return (
        <div key={c.id} className="card pcard">
          <div className="row g12 mb"><ClientMark c={c} size={46} /><div><h3 style={{ margin: 0 }}>{c.name}</h3><div className="muted sm">{c.company} · {c.category}</div></div><span className="sp" /><Badge s={c.status} /></div>
          <div className="info-g mb">
            {[['Contact person', c.contact], ['Phone', c.phone], ['Email', c.email], ['Account manager', ws.staffName(c.manager)]].map(([k, v]) => <div key={k}><div className="k">{k}</div><div className="v">{v}</div></div>)}
            <div style={{ gridColumn: '1/-1' }}><div className="k">Address / shoot location</div><div className="v">{c.address}</div></div>
            <div><div className="k">Package</div><div className="v">{c.pkgName}</div></div><div><div className="k">My videos</div><div className="v">{vs.length}</div></div>
          </div>
          {vs.slice(0, 4).map((v) => <div key={v.id} className="trow" onClick={() => openVideo(v.id)}><div className="trow-m"><div className="trow-t">{v.title}</div><div className="trow-s">{v.code}</div></div><Badge s={stageName(stageIdx(v))} /></div>)}
        </div>); })}</div> : <Card><Empty>You don’t have any assigned clients yet.</Empty></Card>}
    </>
  );
}

export function History() {
  const ws = useWorkspace(); const { openVideo } = useUi();
  const log = useQuery({ queryKey: ['taskHistory'], queryFn: () => api.get('/tasks/history') });
  const rows = ws.allTasks.filter((t) => t.who.includes(ws.user.id) && t.done)
    .concat((log.data || []).map((d) => ({ id: d.id, title: d.title, type: 'General Task', due: d.due, doneAt: d.date, status: 'Completed', done: true, who: [ws.user.id] })));
  return (
    <>
      <PageHeader title="Completed Task History" sub="Everything you’ve delivered." />
      <DataTable id="history" rows={rows} search={(t) => `${t.title} ${t.code || ''}`} defaults={{ sort: 'doneAt', dir: -1 }} onRow={(t) => t.videoId && openVideo(t.videoId)}
        filters={[{ key: 'type', label: 'Stage', options: TYPES, get: (t) => t.type }]} empty="No completed tasks yet"
        cols={[
          { key: 'title', label: 'Task', render: (t) => <div className="cellm"><span className="dot" style={{ background: EVENT_COLORS[t.type] }} /><div><div className="t">{t.title}</div><div className="s">{t.code || t.type}</div></div></div>, sort: (t) => t.title },
          { key: 'type', label: 'Stage', render: (t) => t.type, sort: (t) => t.type },
          { key: 'due', label: 'Due', render: (t) => fmtY(t.due), sort: (t) => t.due },
          { key: 'doneAt', label: 'Completed', render: (t) => (t.doneAt ? fmtY(t.doneAt) : '—'), sort: (t) => t.doneAt || '' },
          { key: 'ot', label: 'Timeliness', render: (t) => (!t.doneAt ? <span className="muted">—</span> : t.doneAt <= t.due ? <Badge s="On time" /> : <Badge s={`${diffDays(t.doneAt, t.due)}d late`} />) },
        ]} />
    </>
  );
}
