import { useNavigate, useParams } from 'react-router-dom';
import { STAGES, EVENT_COLORS, stageIdx, stageName, videoStatus, videoOverdue, deriveEvents, todayS, curMonth } from '@PixelogERP/shared';
import { api } from '../api.js';
import { useAction, useUi, useWorkspace, } from '../lib/store.jsx';
import { DataTable, useTableState, PageHeader, Card, Badge, Btn, Kebab, Progress, Person, Avatar, ClientMark, Empty, Icon, Confirm, Due, fmt, fmtY, fmtRel, monthLabel, pct } from '../components/ui.jsx';
import { ClientModal, PackageModal } from '../components/modals.jsx';
import { VideoCell } from '../components/workflow.jsx';

export function VideoTable({ id, videos, noClient }) {
  const ws = useWorkspace();
  const { openVideo } = useUi();
  const months = [...new Set(ws.packages.map((p) => p.month))].sort();
  return (
    <DataTable id={id} rows={videos} ph="Search videos…" defaults={{ sort: 'post' }}
      search={(v) => [v.code, v.title, ws.clientsById[v.clientId]?.name, ws.staffName(v.script.writer), ws.staffName(v.edit.editor)].join(' ')}
      filters={[
        ...(noClient ? [] : [{ key: 'client', label: 'Client', options: ws.clientOpts(), get: (v) => v.clientId }]),
        { key: 'stage', label: 'Stage', options: [...STAGES, 'Published'], get: (v) => stageName(stageIdx(v)) },
        { key: 'status', label: 'Status', options: ['Not Started', 'In Progress', 'Overdue', 'Completed'], get: (v) => videoStatus(v) },
        { key: 'month', label: 'Month', options: months.map((m) => [m, monthLabel(m)]), get: (v) => ws.packages.find((p) => p.id === v.packageId)?.month },
      ]}
      onRow={(v) => openVideo(v.id)}
      cols={[
        { key: 'code', label: 'Video', render: (v) => <VideoCell v={v} />, sort: (v) => v.code },
        { key: 'team', label: 'Team', render: (v) => <div className="avs">{[...new Set([v.script.writer, ...v.shoot.team, v.edit.editor, v.post.smm].filter(Boolean))].map((s) => <Avatar key={s} person={ws.staffById[s]} size={26} />)}</div> },
        { key: 'script', label: 'Script', render: (v) => <span className="sm"><Due date={v.script.deadline} done={v.script.status === 'Approved'} /></span>, sort: (v) => v.script.deadline },
        { key: 'shoot', label: 'Shoot', render: (v) => <span className="sm">{fmt(v.shoot.date)} <span className="muted">{v.shoot.time}</span></span>, sort: (v) => v.shoot.date },
        { key: 'edit', label: 'Edit', render: (v) => <span className="sm">{fmt(v.edit.deadline)}</span>, sort: (v) => v.edit.deadline },
        { key: 'post', label: 'Posting', render: (v) => <span className="sm">{fmt(v.post.date)}</span>, sort: (v) => v.post.date },
        { key: 'stage', label: 'Current stage', render: (v) => <div style={{ minWidth: 120 }}><Badge s={stageName(stageIdx(v))} /><div style={{ marginTop: 6 }}><Progress value={(stageIdx(v) / 6) * 100} color={stageIdx(v) === 6 ? '#10B981' : undefined} /></div></div>, sort: (v) => stageIdx(v) },
        { key: 'overall', label: 'Overall', render: (v) => <Badge s={videoStatus(v)} />, sort: (v) => videoStatus(v) },
      ]} />
  );
}

export default function Clients() {
  const ws = useWorkspace();
  const nav = useNavigate();
  const run = useAction();
  const { openModal } = useUi();
  const [st, up] = useTableState('clients');
  const count = (s) => ws.clients.filter((c) => c.status === s).length;
  return (
    <>
      <PageHeader title="Clients" sub="Client accounts, monthly packages and production progress." actions={<Btn kind="primary" icon="plus" onClick={() => openModal(<ClientModal onCreated={(c) => nav(`/clients/${c.id}`)} />)}>Add new client</Btn>} />
      <div className="minis">
        {['Active', 'Paused', 'Archived'].map((s) => <button type="button" key={s} className={`mini ${st.f.status === s ? 'on' : ''}`} onClick={() => up({ f: { ...st.f, status: st.f.status === s ? '' : s }, page: 1 })}><div className="muted sm">{s}</div><div className="v">{count(s)}</div></button>)}
        <button type="button" className="mini" onClick={() => up({ f: { ...st.f, status: '' } })}><div className="muted sm">All clients</div><div className="v">{ws.clients.length}</div></button>
      </div>
      <DataTable id="clients" rows={ws.clients} ph="Search clients, contacts, email…" onRow={(c) => nav(`/clients/${c.id}`)}
        search={(c) => [c.name, c.company, c.contact, c.email, c.phone, c.category].join(' ')}
        filters={[
          { key: 'status', label: 'Status', options: ['Active', 'Paused', 'Archived'], get: (c) => c.status },
          { key: 'category', label: 'Category', options: [...new Set(ws.clients.map((c) => c.category))], get: (c) => c.category },
          { key: 'manager', label: 'Manager', options: ws.staffOpts('Account Manager'), get: (c) => c.manager },
        ]}
        cols={[
          { key: 'name', label: 'Client', render: (c) => <div className="cellm"><ClientMark c={c} size={36} /><div style={{ minWidth: 0 }}><div className="t">{c.name}</div><div className="s">{c.company}</div></div></div>, sort: (c) => c.name.toLowerCase() },
          { key: 'contact', label: 'Contact', render: (c) => <div className="sm"><div>{c.contact}</div><div className="muted">{c.phone}</div></div>, sort: (c) => c.contact },
          { key: 'category', label: 'Category', render: (c) => <span className="chip">{c.category}</span>, sort: (c) => c.category },
          { key: 'manager', label: 'Account manager', render: (c) => <Person person={ws.staffById[c.manager]} size={24} />, sort: (c) => ws.staffName(c.manager) },
          { key: 'month', label: 'This month', render: (c) => { const vs = ws.curVideos.filter((v) => v.clientId === c.id); const p = vs.filter((v) => v.post.status === 'Published').length; return vs.length ? <div className="row g8" style={{ minWidth: 140 }}><Progress value={pct(p, vs.length)} /><span className="sm"><b>{p}</b>/{vs.length}</span></div> : <span className="muted sm">No package</span>; } },
          { key: 'status', label: 'Status', render: (c) => <Badge s={c.status} />, sort: (c) => c.status },
          { key: 'a', label: '', width: '50px', render: (c) => <div onClick={(e) => e.stopPropagation()}><Kebab items={[
            { label: 'View profile', icon: 'eye', onClick: () => nav(`/clients/${c.id}`) },
            { label: 'Edit client', icon: 'pen', onClick: () => openModal(<ClientModal client={c} />) },
            { label: 'New monthly package', icon: 'layers', onClick: () => openModal(<PackageModal clientId={c.id} />) },
            c.status === 'Archived' ? { label: 'Restore client', icon: 'check', onClick: () => run(() => api.patch(`/clients/${c.id}`, { status: 'Active' }), 'Client restored') }
              : { label: 'Archive client', icon: 'archive', onClick: () => openModal(<Confirm title="Archive client" text={`Archive ${c.name}? Their videos are hidden from dashboards and calendars until restored.`} label="Archive" onConfirm={() => run(() => api.patch(`/clients/${c.id}`, { status: 'Archived' }), 'Client archived')} />) },
            { label: 'Delete client', icon: 'trash', danger: true, onClick: () => openModal(<Confirm title="Delete client" text={`Permanently delete ${c.name} and all of its videos and packages? This can’t be undone. Archive instead if you may need them later.`} label="Delete permanently" onConfirm={() => run(() => api.del(`/clients/${c.id}`), 'Client deleted')} />) },
          ]} /></div> },
        ]} />
    </>
  );
}

export function ClientProfile() {
  const { id } = useParams();
  const ws = useWorkspace();
  const nav = useNavigate();
  const { openModal, openVideo } = useUi();
  const c = ws.clientsById[id];
  if (!c) return <Empty>This client doesn’t exist or was deleted. <a href="/clients">Back to clients</a></Empty>;
  const vids = ws.videos.filter((v) => v.clientId === c.id);
  const pkgs = ws.packages.filter((p) => p.clientId === c.id);
  const T = todayS();
  const evs = deriveEvents({ videos: vids, clientsById: ws.clientsById }).filter((e) => e.date >= T && !e.done).sort((a, b) => (a.date < b.date ? -1 : 1));
  const info = [['Company', c.company], ['Contact person', c.contact], ['Phone', c.phone], ['Email', c.email], ['Business category', c.category], ['Account manager', ws.staffName(c.manager)], ['Client since', fmtY(c.start)], ['Monthly video count', c.count], ['Package', c.pkgName], ['Address', c.address]];
  const roles = { writer: 'Script writer', videographer: 'Videographer', camera: 'Camera operator', editor: 'Video editor', smm: 'Social media' };
  return (
    <>
      <div className="crumb" onClick={() => nav('/clients')}><Icon n="left" /> All clients</div>
      <PageHeader title={<span className="row g12"><ClientMark c={c} size={42} />{c.name}</span>}
        actions={<><Badge s={c.status} /><Btn icon="pen" onClick={() => openModal(<ClientModal client={c} />)}>Edit</Btn><Btn icon="calendar" onClick={() => nav(`/calendar?client=${c.id}`)}>Schedule</Btn><Btn kind="primary" icon="layers" onClick={() => openModal(<PackageModal clientId={c.id} />)}>New monthly package</Btn></>} />
      <div className="grid c12 mb">
        <div className="stack">
          <Card title="Client details"><div className="info-g">{info.map(([k, v]) => <div key={k} style={k === 'Address' ? { gridColumn: '1/-1' } : undefined}><div className="k">{k}</div><div className="v">{v}</div></div>)}</div></Card>
          <Card title="Default production team">{Object.entries(roles).map(([k, l]) => <div key={k} className="row g8" style={{ marginBottom: 9 }}><span className="muted sm" style={{ width: 120 }}>{l}</span><Person person={ws.staffById[c.team?.[k]]} /></div>)}</Card>
          <Card title="Upcoming schedule">{evs.length ? evs.slice(0, 8).map((e) => <div key={e.key || e.label} className="trow" onClick={() => e.videoId && openVideo(e.videoId)}><span className="dot" style={{ background: EVENT_COLORS[e.cat] }} /><div className="trow-m"><div className="trow-t">{e.label}</div><div className="trow-s">{fmtRel(e.date)}{e.time ? ` · ${e.time}` : ''}</div></div></div>) : <Empty>Nothing upcoming</Empty>}</Card>
        </div>
        <div className="stack">
          {pkgs.length ? pkgs.map((p) => { const pv = ws.videos.filter((v) => v.packageId === p.id); return (
            <div key={p.id} className="card pcard"><div className="row g8 mb"><b>{p.name}</b><span className="chip">{monthLabel(p.month)}</span><span className="sp" /><span className="muted sm">{pv.filter((v) => v.post.status === 'Published').length}/{p.target} published</span></div>
              {STAGES.map((s, i) => { const n = pv.filter((v) => stageIdx(v) > i).length; return <div key={s} className="pk-r"><span className="muted">{s}</span><Progress value={pct(n, p.target)} color={EVENT_COLORS[s]} /><span className="sm" style={{ textAlign: 'right' }}>{n}/{p.target}</span></div>; })}
            </div>); }) : <Card title="Monthly packages"><Empty>No packages yet. Create one to generate this client’s video workflows.</Empty></Card>}
        </div>
      </div>
      <VideoTable id={`client-${c.id}`} videos={vids} noClient />
    </>
  );
}

export function Planning() {
  const ws = useWorkspace();
  const nav = useNavigate();
  const run = useAction();
  const { openModal } = useUi();
  const [, up] = useTableState('tracker');
  const target = ws.curPackages.reduce((a, p) => a + p.target, 0);
  const pub = ws.curVideos.filter((v) => v.post.status === 'Published').length;
  const next = ws.packages.filter((p) => p.month > curMonth()).length;
  return (
    <>
      <PageHeader title="Content Planning" sub={`Monthly content packages for ${monthLabel(curMonth())}. Each package creates one trackable workflow per video.`} actions={<Btn kind="primary" icon="plus" onClick={() => openModal(<PackageModal />)}>Create monthly package</Btn>} />
      <div className="grid k4 mb">
        <div className="kpi card"><div className="kpi-ic t-indigo"><Icon n="layers" /></div><div><div className="kpi-l">Packages this month</div><div className="kpi-v">{ws.curPackages.length}</div><div className="kpi-s">{next ? `${next} planned ahead` : ''}</div></div></div>
        <div className="kpi card"><div className="kpi-ic t-teal"><Icon n="target" /></div><div><div className="kpi-l">Video target</div><div className="kpi-v">{target}</div></div></div>
        <div className="kpi card"><div className="kpi-ic t-green"><Icon n="checkc" /></div><div><div className="kpi-l">Published</div><div className="kpi-v">{pub}</div><div className="kpi-s">{pct(pub, target)}% of packages used</div></div></div>
        <div className="kpi card"><div className="kpi-ic t-red"><Icon n="alert" /></div><div><div className="kpi-l">Videos overdue</div><div className="kpi-v">{ws.curVideos.filter((v) => videoOverdue(v)).length}</div></div></div>
      </div>
      <div className="note-box info row g8"><Icon n="zap" /><span>Approving a script schedules its shoot. Completing a shoot assigns the editor. Approving an edit queues the post, and publishing closes the video. Each step notifies the next person.</span></div>
      <div className="grid k3 mb">
        {ws.curPackages.map((p) => { const c = ws.clientsById[p.clientId]; const pv = ws.videos.filter((v) => v.packageId === p.id); const pb = pv.filter((v) => v.post.status === 'Published').length; const od = pv.filter((v) => videoOverdue(v)).length;
          return (
            <div key={p.id} className="card pcard">
              <div className="row g12 mb"><ClientMark c={c} size={38} /><div style={{ minWidth: 0 }}><div className="b">{c.name}</div><div className="muted sm">{p.name}</div></div><span className="sp" />
                <Kebab items={[
                  { label: 'Open client', icon: 'eye', onClick: () => nav(`/clients/${c.id}`) },
                  { label: 'Add a video', icon: 'plus', onClick: () => run(() => api.post(`/packages/${p.id}/videos`), 'Video added') },
                  { label: 'Delete package', icon: 'trash', danger: true, onClick: () => openModal(<Confirm title="Delete package" text={`Delete “${p.name}” and its ${pv.length} video workflows?`} label="Delete" onConfirm={() => run(() => api.del(`/packages/${p.id}`), 'Package deleted')} />) },
                ]} /></div>
              <div className="row g8 mb"><span style={{ fontSize: 22, fontWeight: 700 }}>{pb}<span className="muted" style={{ fontSize: 14 }}>/{p.target}</span></span><span className="muted sm">published</span><span className="sp" />{od ? <span className="tag-od">{od} overdue</span> : <Badge s="On track" />}</div>
              {STAGES.map((s, i) => { const n = pv.filter((v) => stageIdx(v) > i).length; return <div key={s} className="pk-r"><span className="muted">{s}</span><Progress value={pct(n, p.target)} color={EVENT_COLORS[s]} /><span className="sm" style={{ textAlign: 'right' }}><b>{n}</b>/{p.target}</span></div>; })}
              <Btn size="sm" icon="list" style={{ marginTop: 6 }} onClick={() => { up({ f: { client: c.id }, page: 1 }); document.getElementById('tracker')?.scrollIntoView({ behavior: 'smooth' }); }}>Track {pv.length} videos</Btn>
            </div>); })}
        {!ws.curPackages.length && <Card><Empty>No packages for this month yet. Create one to start production.</Empty></Card>}
      </div>
      <div className="ph" id="tracker" style={{ margin: '28px 0 14px' }}><div><h1 style={{ fontSize: 18 }}>Video tracker</h1><p>Every video from script to publishing, each with its own workflow and status.</p></div></div>
      <VideoTable id="tracker" videos={ws.activeVideos} />
    </>
  );
}
