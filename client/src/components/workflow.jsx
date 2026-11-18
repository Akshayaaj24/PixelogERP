// Video workflow UI: action buttons, the forms behind them, the video drawer and task rows.
import { useState } from 'react';
import {
  STAGES, STAGE_KEY, STAGE_LBL, STATUSES, PLATFORMS, SLOTS, EVENT_COLORS, stageIdx, stageName, stageActions, stageReady, myStage,
  videoStatus, isOverdue, shootClash,
} from '@studioflow/shared';
import { api } from '../api.js';
import { useAction, useUi, useWorkspace } from '../lib/store.jsx';
import {
  Icon, Badge, Avatar, ClientMark, Person, Btn, Due, Empty, Kebab, ModalForm, Field, Select, TextArea, Checks, Toggle, Confirm, fmt, fmtY, fmtL, fmtRel, ago,
} from './ui.jsx';

const STAGE_ICON = { script: 'pen', shoot: 'camera', edit: 'film', post: 'share' };

/* ---------------- Running an action ---------------- */
export function useStageAction() {
  const run = useAction();
  const { openModal } = useUi();
  return (v, stage, a) => {
    const transition = (extra = {}) => run(() => api.post(`/videos/${v.id}/transition`, { stage, status: a.status, ...extra }), `${STAGE_LBL[stage]} → ${a.status}`);
    if (a.form === 'revise') return openModal(<ReviseModal v={v} stage={stage} onSend={(note) => transition({ note })} />);
    if (a.form === 'submit') return openModal(<SubmitModal v={v} stage={stage} onSend={transition} />);
    if (a.form === 'publish') return openModal(<PublishModal v={v} onSend={(link) => transition({ details: postDetails(v, { link }) })} />);
    if (a.form === 'schedule') return openModal(<StageEditModal v={v} stage={stage} scheduleStatus={a.status} />);
    if (a.status === 'Cancelled') return openModal(<Confirm title="Cancel shoot" text={`Cancel the shoot for “${v.title}”? The team will be notified.`} label="Cancel shoot" onConfirm={() => transition()} />);
    return transition().catch(() => {});
  };
}
const postDetails = (v, extra) => ({ smm: v.post.smm, date: v.post.date, time: v.post.time, platforms: v.post.platforms, caption: v.post.caption || '', hashtags: v.post.hashtags || '', link: v.post.link || '', ...extra });

export function ActionButtons({ v, stage, only, sm = true }) {
  const { wfUser } = useWorkspace();
  const act = useStageAction();
  let actions = stageActions(v, stage, wfUser);
  if (only === 'primary') actions = actions.filter((a) => a.tone === 'primary').slice(0, 1);
  if (typeof only === 'number') actions = actions.slice(0, only);
  return actions.map((a) => (
    <button key={a.label} type="button" className={`btn ${sm ? 'sm' : ''} ${a.tone === 'primary' ? 'primary' : a.tone === 'warn' ? 'warn' : a.tone === 'danger' ? 'dangerg' : ''}`}
      onClick={(e) => { e.stopPropagation(); act(v, stage, a); }}>{a.label}</button>
  ));
}

/* ---------------- Action forms ---------------- */
function ReviseModal({ v, stage, onSend }) {
  const { staffName } = useWorkspace();
  return (
    <ModalForm title={`Request revision — ${STAGE_LBL[stage].toLowerCase()}`} submit="Send revision request" initial={{ note: '' }} onSubmit={(f) => onSend(f.note)}>
      <p className="muted" style={{ marginTop: 0 }}>{v.title} · {staffName(stage === 'script' ? v.script.writer : v.edit.editor)} will be notified.</p>
      <TextArea name="note" label="What needs to change?" req ph="Be specific: what to change, and why" />
    </ModalForm>
  );
}
function SubmitModal({ v, stage, onSend }) {
  const what = stage === 'script' ? 'script' : 'edited video';
  return (
    <ModalForm title={stage === 'script' ? 'Submit script for approval' : 'Submit video for review'} submit="Submit for approval" initial={{ note: '' }} onSubmit={(f) => onSend({ note: f.note || undefined })}>
      <p className="muted" style={{ marginTop: 0 }}>{v.title} · {v.code}</p>
      <div className="note-box info sm">Send the {what} on WhatsApp first, then submit here so the admin can approve it or ask for changes.</div>
      <TextArea name="note" label="Note for the reviewer (optional)" ph="e.g. Sent to the review group at 4:30 pm" />
    </ModalForm>
  );
}
function PublishModal({ v, onSend }) {
  return (
    <ModalForm title="Mark as published" submit="Mark published" initial={{ link: v.post.link || '' }} onSubmit={(f) => onSend(f.link)}>
      <p className="muted" style={{ marginTop: 0 }}>{v.title} · {v.post.platforms.join(', ')}</p>
      <Field name="link" label="Published post link" req v="url" full ph="https://www.instagram.com/reel/…" />
    </ModalForm>
  );
}

/** Edit a stage's details. With scheduleStatus it also moves the stage to that status (schedule shoot / post). */
export function StageEditModal({ v, stage, scheduleStatus }) {
  const ws = useWorkspace();
  const run = useAction();
  const { isAdmin, staffOpts, activeVideos } = ws;
  const s = v[stage];
  const initial = {
    script: { title: v.title, writer: s.writer, deadline: s.deadline, status: s.status },
    shoot: { videographer: s.team?.[0] || '', camera: s.team?.[1] || '', date: s.date, time: s.time, location: s.location, instructions: s.instructions || '', status: s.status, override: false },
    edit: { editor: s.editor, deadline: s.deadline, status: s.status },
    post: { smm: s.smm, date: s.date, time: s.time, platforms: s.platforms || [], caption: s.caption || '', hashtags: s.hashtags || '', link: s.link || '', status: s.status },
  }[stage];
  const body = (f) => ({
    script: { title: f.title, writer: f.writer, deadline: f.deadline },
    shoot: { team: [f.videographer, f.camera].filter(Boolean), date: f.date, time: f.time, location: f.location, instructions: f.instructions, override: !!f.override },
    edit: { editor: f.editor, deadline: f.deadline },
    post: { smm: f.smm, date: f.date, time: f.time, platforms: f.platforms, caption: f.caption, hashtags: f.hashtags, link: f.link },
  }[stage]);
  const submit = async (f) => {
    if (scheduleStatus) return run(() => api.post(`/videos/${v.id}/transition`, { stage, status: scheduleStatus, details: body(f) }), stage === 'shoot' ? 'Shoot scheduled' : 'Post scheduled');
    await run(() => api.patch(`/videos/${v.id}/stages/${stage}`, body(f)), 'Saved');
    if (isAdmin && f.status && f.status !== s.status) await run(() => api.put(`/videos/${v.id}/stages/${stage}/status`, { status: f.status }), `Status set to ${f.status}`);
  };
  return (
    <ModalForm title={`${scheduleStatus ? (stage === 'shoot' ? 'Schedule shoot' : 'Schedule post') : `Edit ${STAGE_KEY[stage].toLowerCase()}`} — ${v.code}`} wide={stage !== 'script'} initial={initial} submit={scheduleStatus ? 'Schedule' : 'Save'} onSubmit={submit}>
      {(f) => (
        <div className="fg">
          {stage === 'script' && <><Field name="title" label="Video title" req full /><Select name="writer" label="Script writer" options={staffOpts('Script Writer')} req blank="Select…" /><Field name="deadline" label="Writing deadline" type="date" req /></>}
          {stage === 'shoot' && <>
            <Select name="videographer" label="Videographer" options={staffOpts('Videographer')} req blank="Select…" />
            <Select name="camera" label="Camera operator" options={staffOpts('Camera Operator')} blank="None" />
            <Field name="date" label="Shooting date" type="date" req />
            <Select name="time" label="Time slot" options={[...new Set([...SLOTS, s.time].filter(Boolean))].sort()} req />
            <Field name="location" label="Shooting location" req full />
            <TextArea name="instructions" label="Shoot instructions" ph="Shot list, props, wardrobe, talent…" />
            {(() => { const clash = shootClash(activeVideos, f.date, f.time, [f.videographer, f.camera].filter(Boolean), v.id); return clash.length ? <div className="note-box bad full" style={{ margin: 0 }}><Icon n="alert" /> Double-booked: {clash.map((c) => c.code).join(', ')} at {f.time}. Pick another slot, or allow the conflict below.</div> : null; })()}
            <div className="full"><Toggle name="override" label="Save even if a team member is double-booked" /></div>
          </>}
          {stage === 'edit' && <><Select name="editor" label="Video editor" options={staffOpts('Video Editor')} req blank="Select…" /><Field name="deadline" label="Editing deadline" type="date" req /></>}
          {stage === 'post' && <>
            {isAdmin && <Select name="smm" label="Social media manager" options={staffOpts('Social Media Manager')} req blank="Select…" />}
            <Field name="date" label="Publishing date" type="date" req /><Field name="time" label="Publishing time" type="time" req />
            <Checks name="platforms" label="Platforms" options={PLATFORMS} req />
            <TextArea name="caption" label="Caption" req={!!scheduleStatus} ph="Write the post caption…" />
            <Field name="hashtags" label="Hashtags" full ph="#brand #reels" />
            <Field name="link" label="Published post link" v="url" full ph="https://…" />
          </>}
          {isAdmin && !scheduleStatus && <Select name="status" label="Status" options={STATUSES[stage]} />}
        </div>
      )}
    </ModalForm>
  );
}

/* ---------------- Task row (dashboards, lists) ---------------- */
export function TaskRow({ t, actions = true, showWho = false }) {
  const { clientsById, staffName, videos } = useWorkspace();
  const { openVideo, openModal } = useUi();
  const run = useAction();
  const v = t.videoId ? videos.find((x) => x.id === t.videoId) : null;
  const c = clientsById[v ? v.clientId : t.clientId];
  const od = isOverdue(t);
  const open = () => (v ? openVideo(v.id) : openModal(<TaskModalLazy id={t.taskId} />));
  return (
    <div className={`trow ${od ? 'od' : ''}`} onClick={open} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && open()}>
      <span className="dot" style={{ background: EVENT_COLORS[t.type] }} />
      <div className="trow-m">
        <div className="trow-t">{t.title}</div>
        <div className="trow-s">{[v?.code, c?.name, t.type, t.recur && t.recur !== 'Once' ? t.recur : null, showWho && t.who.length ? t.who.map(staffName).join(', ') : null, !t.ready && !t.done ? 'waiting on previous stage' : null].filter(Boolean).join(' · ')}</div>
      </div>
      <div className="trow-r">
        <Badge s={t.status} />
        <span className={`due ${od ? 'bad' : ''}`}>{fmtRel(t.due)}{t.time ? ` ${t.time}` : ''}</span>
        {actions && v && <ActionButtons v={v} stage={t.stage} only={2} />}
        {actions && t.custom && !t.done && <Btn size="sm" icon="check" onClick={(e) => { e.stopPropagation(); run(() => api.patch(`/tasks/${t.taskId}`, { status: 'Completed' }), 'Task completed').catch(() => {}); }}>Done</Btn>}
      </div>
    </div>
  );
}
// Avoids a circular import with modals.jsx
let TaskModalRef = null;
export const registerTaskModal = (C) => { TaskModalRef = C; };
const TaskModalLazy = (p) => (TaskModalRef ? <TaskModalRef {...p} /> : null);

/* ---------------- Video drawer ---------------- */
export function VideoDrawer() {
  const { drawer, closeVideo, openModal } = useUi();
  const ws = useWorkspace();
  const [tab, setTab] = useState('workflow');
  const v = drawer && ws.videos.find((x) => x.id === drawer);
  if (!drawer) return null;
  if (!v) return null;
  const c = ws.clientsById[v.clientId] || {};
  const si = stageIdx(v);
  const pkg = ws.packages.find((p) => p.id === v.packageId);
  return (
    <>
      <div className="dr-bg" onClick={closeVideo} />
      <aside className="drawer" role="dialog" aria-label="Video details">
        <div className="dr-h">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="muted sm">{[v.code, c.name, pkg?.name].filter(Boolean).join(' · ')}</div>
            <h2>{v.title}</h2>
            <div className="row g8 wrap"><Badge s={stageName(si)} /><Badge s={videoStatus(v)} /><span className="muted sm">Posting {fmtY(v.post.date)}</span></div>
          </div>
          {ws.isAdmin && <Kebab items={[
            { label: 'Edit title & script', icon: 'pen', onClick: () => openModal(<StageEditModal v={v} stage="script" />) },
            { label: 'Delete video', icon: 'trash', danger: true, onClick: () => openModal(<DeleteVideo v={v} onDone={closeVideo} />) },
          ]} />}
          <button type="button" className="icon-btn sm" onClick={closeVideo} aria-label="Close"><Icon n="x" /></button>
        </div>
        <div className="stepper">{STAGES.map((s, i) => <div key={s} className={`step ${i < si ? 'done' : i === si ? 'cur' : ''}`}><span>{i < si ? <Icon n="check" /> : i + 1}</span><small>{s}</small></div>)}</div>
        <div className="tabs" role="tablist">
          {[['workflow', 'Workflow'], ['notes', `Notes & feedback (${v.notes.length})`], ['history', 'History']].map(([k, l]) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>
          ))}
        </div>
        <div className="dr-b">
          {tab === 'workflow' && ['script', 'shoot', 'edit', 'post'].map((s) => <StageCard key={s} v={v} stage={s} />)}
          {tab === 'notes' && <Notes v={v} />}
          {tab === 'history' && <div className="tl">{v.log.map((l, i) => <div key={i} className="tl-i"><div className="tx">{l.text}</div><div className="tm">{l.by} · {ago(l.at)}</div></div>)}</div>}
        </div>
      </aside>
    </>
  );
}
function DeleteVideo({ v, onDone }) {
  const run = useAction();
  return <Confirm title="Delete video" text={`Delete ${v.code} “${v.title}”? The package target drops by one.`} label="Delete" onConfirm={async () => { await run(() => api.del(`/videos/${v.id}`), 'Video deleted'); onDone(); }} />;
}
function StageCard({ v, stage }) {
  const ws = useWorkspace();
  const { openModal } = useUi();
  const { isAdmin, staffById, user, activeVideos } = ws;
  const mine = myStage(v, stage, user.id);
  const s = v[stage]; const st = s.status; const ready = stageReady(v, stage);
  const col = EVENT_COLORS[STAGE_KEY[stage]];
  const canEdit = isAdmin || (stage === 'post' && mine && ready);
  const head = (
    <div className="stc-h">
      <div className="stc-ic" style={{ background: `color-mix(in srgb, ${col} 15%, transparent)`, color: col }}><Icon n={STAGE_ICON[stage]} /></div>
      <h4>{STAGE_KEY[stage]}{mine && !isAdmin && <span className="chip" style={{ marginLeft: 6 }}>You</span>}</h4>
      <Badge s={st} />
      {canEdit && <button type="button" className="icon-btn sm ghost" title="Edit details" aria-label="Edit details" onClick={() => openModal(<StageEditModal v={v} stage={stage} />)}><Icon n="pen" /></button>}
    </div>
  );
  if (!isAdmin && !mine) return <div className="stc lock">{head}<div className="stc-b"><div className="full muted sm">Handled by another team member.</div></div></div>;
  const KV = ({ k, children, full }) => <div className={full ? 'full' : ''}><div className="k">{k}</div><div>{children}</div></div>;
  const clash = stage === 'shoot' && !['Completed', 'Cancelled'].includes(st) ? shootClash(activeVideos, s.date, s.time, s.team, v.id) : [];
  const fb = v.notes.find((n) => n.stage === stage && n.kind === 'feedback');
  return (
    <div className="stc">
      {head}
      <div className="stc-b">
        {stage === 'script' && <><KV k="Script writer"><Person person={staffById[s.writer]} /></KV><KV k="Writing deadline"><Due date={s.deadline} done={st === 'Approved'} /></KV></>}
        {stage === 'shoot' && <>
          <KV k="Shooting team">{s.team.map((id) => <div key={id} style={{ marginBottom: 4 }}><Person person={staffById[id]} size={22} /> <span className="muted xs">{staffById[id]?.jobRole}</span></div>)}</KV>
          <KV k="Date & time slot">{fmtL(s.date)}<br /><b>{s.time}</b></KV>
          <KV k="Location" full><span className="row g4"><Icon n="pin" />{s.location}</span></KV>
          {s.instructions && <KV k="Shoot instructions" full>{s.instructions}</KV>}
          {clash.length > 0 && <div className="full note-box bad" style={{ margin: 0 }}><Icon n="alert" /> Team member double-booked at this slot: {clash.map((x) => x.code).join(', ')}</div>}
        </>}
        {stage === 'edit' && <><KV k="Video editor"><Person person={staffById[s.editor]} /></KV><KV k="Editing deadline"><Due date={s.deadline} done={['Approved', 'Completed'].includes(st)} /></KV></>}
        {stage === 'post' && <>
          <KV k="Social media manager"><Person person={staffById[s.smm]} /></KV><KV k="Publishing">{fmtL(s.date)} · <b>{s.time}</b></KV>
          <KV k="Platforms" full>{s.platforms.join(', ')}</KV>
          {s.caption && <KV k="Caption" full>{s.caption}</KV>}
          {s.hashtags && <KV k="Hashtags" full><span style={{ color: 'var(--pri)' }}>{s.hashtags}</span></KV>}
          {s.link && <KV k="Published link" full><a href={s.link} target="_blank" rel="noopener noreferrer">{s.link}</a></KV>}
        </>}
        {!ready && <div className="full muted sm">Waiting on {{ shoot: 'script approval', edit: 'the shoot', post: 'video approval' }[stage]}</div>}
        {fb && /Revision/.test(st) && <div className="full note-box"><b>Revision feedback</b> — {fb.text}</div>}
      </div>
      <div className="stc-a"><ActionButtons v={v} stage={stage} /></div>
    </div>
  );
}
function Notes({ v }) {
  const { isAdmin, user, staffById } = useWorkspace();
  const run = useAction();
  const stages = ['script', 'shoot', 'edit', 'post'].filter((s) => isAdmin || myStage(v, s, user.id));
  const [text, setText] = useState(''); const [stage, setStage] = useState(stages[0] || 'script'); const [fb, setFb] = useState(false);
  const send = async (e) => { e.preventDefault(); if (!text.trim()) return; await run(() => api.post(`/videos/${v.id}/notes`, { stage, text, feedback: fb }), 'Note added').catch(() => {}); setText(''); setFb(false); };
  return (
    <>
      {stages.length > 0 && (
        <form onSubmit={send} className="card pcard mb">
          <label className="fld full"><span>Add a note</span><textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Share an update, question or feedback…" style={{ minHeight: 70 }} /></label>
          <div className="row g8" style={{ marginTop: 10 }}>
            {stages.length > 1 && <select value={stage} onChange={(e) => setStage(e.target.value)} aria-label="Stage">{stages.map((s) => <option key={s} value={s}>{STAGE_KEY[s]}</option>)}</select>}
            {isAdmin && <label className="chk" style={{ margin: 0 }}><input type="checkbox" checked={fb} onChange={(e) => setFb(e.target.checked)} /> Mark as feedback</label>}
            <span className="sp" /><button className="btn primary sm" disabled={!text.trim()}><Icon n="send" />Post note</button>
          </div>
        </form>
      )}
      {v.notes.length ? v.notes.map((n, i) => (
        <div key={i} className={`note ${n.kind === 'feedback' ? 'fb' : ''}`}>
          <div className="h">{n.by === 'admin' ? <span className="av" style={{ width: 22, height: 22, background: 'var(--pri)', color: '#fff', fontSize: 9 }}>AD</span> : <Avatar person={staffById[n.by]} size={22} />}
            <b style={{ color: 'var(--text)' }}>{n.byName}</b><span className="chip">{STAGE_LBL[n.stage]}</span>{n.kind === 'feedback' && <Badge s="Revision Required" />}<span className="sp" />{ago(n.at)}</div>
          <div style={{ whiteSpace: 'pre-wrap' }}>{n.text}</div>
        </div>
      )) : <Empty>No notes yet</Empty>}
    </>
  );
}
/* ---------------- Video cell used in tables ---------------- */
export function VideoCell({ v }) {
  const { clientsById } = useWorkspace();
  const c = clientsById[v.clientId];
  return <div className="cellm"><ClientMark c={c} size={32} /><div style={{ minWidth: 0 }}><div className="t">{v.title}</div><div className="s">{v.code} · {c?.name}</div></div></div>;
}
