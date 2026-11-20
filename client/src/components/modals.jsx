// Create/edit forms for clients, packages, staff, general tasks and calendar events.
import { useRef } from 'react';
import { CATEGORIES, JOB_ROLES, STAGES, addDays, addMonths, curMonth, todayS } from '@PixelogERP/shared';
import { api } from '../api.js';
import { useAction, useUi, useWorkspace } from '../lib/store.jsx';
import { ModalForm, Field, Select, TextArea, Checks, Toggle, Btn, Icon, Avatar, fmtL } from './ui.jsx';
import { registerTaskModal } from './workflow.jsx';

function TeamFields() {
  const { staffOpts } = useWorkspace();
  return (
    <div className="fg3">
      <Select name="writer" label="Script writer" options={staffOpts('Script Writer')} blank="Unassigned" />
      <Select name="videographer" label="Videographer" options={staffOpts('Videographer')} blank="Unassigned" />
      <Select name="camera" label="Camera operator" options={staffOpts('Camera Operator')} blank="Unassigned" />
      <Select name="editor" label="Video editor" options={staffOpts('Video Editor')} blank="Unassigned" />
      <Select name="smm" label="Social media manager" options={staffOpts('Social Media Manager')} blank="Unassigned" />
    </div>
  );
}
const teamOf = (f) => ({ writer: f.writer || '', videographer: f.videographer || '', camera: f.camera || '', editor: f.editor || '', smm: f.smm || '' });

export function ClientModal({ client, onCreated }) {
  const { staffOpts } = useWorkspace();
  const run = useAction();
  const c = client || { status: 'Active', start: todayS(), count: 8, pkgName: 'Monthly 8 Videos Package', team: {} };
  const initial = { name: c.name || '', company: c.company || '', contact: c.contact || '', phone: c.phone || '', email: c.email || '', category: c.category || '', address: c.address || '', manager: c.manager || '', pkgName: c.pkgName || '', count: c.count || 8, start: c.start || todayS(), status: c.status, ...c.team, generate: true };
  return (
    <ModalForm title={client ? 'Edit client' : 'Add new client'} wide initial={initial} submit={client ? 'Save changes' : 'Add client'}
      onSubmit={async (f) => {
        const body = { name: f.name, company: f.company, contact: f.contact, phone: f.phone, email: f.email, category: f.category, address: f.address, manager: f.manager, pkgName: f.pkgName, count: +f.count, start: f.start, status: f.status, team: teamOf(f) };
        if (client) return run(() => api.patch(`/clients/${client.id}`, body), 'Client updated');
        const r = await run(() => api.post('/clients', { ...body, generate: f.generate }), f.generate ? `Client added · ${f.count} video workflows created` : 'Client added');
        onCreated?.(r);
      }}>
      <div className="fg">
        <Field name="name" label="Client name" req /><Field name="company" label="Company name" req />
        <Field name="contact" label="Contact person" req /><Field name="phone" label="Phone number" type="tel" v="phone" req ph="+91 98765 43210" />
        <Field name="email" label="Email address" type="email" req /><Select name="category" label="Business category" options={CATEGORIES} req blank="Select…" />
        <TextArea name="address" label="Address" req />
        <Select name="manager" label="Assigned account manager" options={staffOpts('Account Manager')} req blank="Select…" />
        <Field name="pkgName" label="Package details" req ph="e.g. Monthly 8 Videos Package" />
        <Field name="count" label="Monthly video count" type="number" min={1} max={60} req /><Field name="start" label="Start date" type="date" req />
        <Select name="status" label="Status" options={['Active', 'Paused', 'Archived']} />
      </div>
      <h4 className="sub">Default production team</h4>
      <TeamFields />
      {!client && <Toggle name="generate" label="Create this month’s package and a workflow for every video" />}
    </ModalForm>
  );
}

export function PackageModal({ clientId }) {
  const { clientsById, clientOpts, packages } = useWorkspace();
  const run = useAction();
  const c = clientsById[clientId];
  const month = packages.some((p) => p.clientId === clientId && p.month === curMonth()) ? addMonths(todayS(), 1).slice(0, 7) : curMonth();
  const initial = { clientId: clientId || '', month, name: c?.pkgName || '', target: c?.count || 8, start: month === curMonth() ? addDays(todayS(), 2) : `${month}-02`, span: 18, ...(c?.team || {}) };
  return (
    <ModalForm title="Create monthly content package" wide initial={initial} submit="Create package & workflows"
      onSubmit={(f) => run(() => api.post('/packages', { clientId: f.clientId, month: f.month, name: f.name, target: +f.target, start: f.start, span: +f.span, team: teamOf(f) }), `${f.target} video workflows created`)}>
      {(f, set) => (
        <>
          <div className="note-box info sm">Each video gets its own workflow (script, approval, shoot, edit, review, posting) with staggered deadlines and the team below.</div>
          <div className="fg">
            <Select name="clientId" label="Client" options={clientOpts()} req blank="Select client…" onChange={(id) => { const cc = clientsById[id]; if (!cc) return; Object.entries(cc.team || {}).forEach(([k, val]) => set(k, val)); if (!f.name) set('name', cc.pkgName); set('target', cc.count); }} />
            <Field name="month" label="Month" type="month" req /><Field name="name" label="Package name" req ph="Monthly 8 Videos Package" />
            <Field name="target" label="Monthly video target" type="number" min={1} max={60} req />
            <Field name="start" label="First script deadline" type="date" req /><Field name="span" label="Spread scripts across (days)" type="number" min={1} max={31} req />
          </div>
          <h4 className="sub">Production team</h4>
          <TeamFields />
        </>
      )}
    </ModalForm>
  );
}

export function StaffModal({ person }) {
  const { clientOpts } = useWorkspace();
  const run = useAction();
  const { toast } = useUi();
  const s = person || { status: 'Active', joined: todayS(), clients: [], jobRole: '' };
  const initial = { name: s.name || '', email: s.email || '', phone: s.phone || '', jobRole: s.jobRole, joined: s.joined, status: s.status, clients: s.clients || [], photo: s.photo || '', password: '' };
  const fileRef = useRef(null);
  return (
    <ModalForm title={person ? 'Edit employee' : 'Add employee'} wide initial={initial} submit={person ? 'Save changes' : 'Add employee'}
      onSubmit={(f) => {
        const body = { ...f }; if (!body.password) delete body.password;
        return person ? run(() => api.patch(`/staff/${person.id}`, body), 'Employee updated') : run(() => api.post('/staff', body), 'Employee added');
      }}>
      {(f, set) => (
        <>
          <div className="row g12 mb">
            {f.photo ? <img className="av" src={f.photo} alt="" style={{ width: 56, height: 56 }} /> : <Avatar person={person} size={56} />}
            <Btn size="sm" icon="upload" onClick={() => fileRef.current.click()}>Profile photo</Btn>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => {
              const file = e.target.files[0]; if (!file) return;
              if (file.size > 3e6) { toast('Choose an image under 3 MB', 'warn'); return; }
              const img = new Image(); img.onload = () => { const cv = document.createElement('canvas'); const k = Math.min(img.width, img.height); cv.width = cv.height = 160; cv.getContext('2d').drawImage(img, (img.width - k) / 2, (img.height - k) / 2, k, k, 0, 0, 160, 160); set('photo', cv.toDataURL('image/jpeg', 0.82)); URL.revokeObjectURL(img.src); };
              img.src = URL.createObjectURL(file);
            }} />
          </div>
          <div className="fg">
            <Field name="name" label="Employee name" req /><Field name="email" label="Email (used to sign in)" type="email" req />
            <Field name="phone" label="Phone number" v="phone" req /><Select name="jobRole" label="Job role" options={JOB_ROLES} req blank="Select…" />
            <Field name="joined" label="Joining date" type="date" req /><Select name="status" label="Employment status" options={['Active', 'On Leave', 'Inactive']} />
            <Field name="password" label={person ? 'New password (leave blank to keep)' : 'Temporary password'} type="password" req={!person} min={undefined} ph="At least 8 characters" />
            <Checks name="clients" label="Assigned clients" options={clientOpts()} />
          </div>
        </>
      )}
    </ModalForm>
  );
}

export function TaskModal({ id, assignee }) {
  const { generalTasks, isAdmin, staffOpts, clientOpts, clientsById } = useWorkspace();
  const run = useAction();
  const { openModal } = useUi();
  const t = id ? generalTasks.find((x) => x.id === id) : null;
  if (id && !t) return null;
  const d = t || { title: '', assignee: assignee || '', clientId: '', due: todayS(), recur: 'Once', status: 'Pending', notes: '' };
  if (!isAdmin) {
    return (
      <ModalForm title="Task" initial={{ status: d.status }} onSubmit={(f) => run(() => api.patch(`/tasks/${t.id}`, { status: f.status }), f.status === 'Completed' ? 'Task completed' : 'Task updated')}>
        <h3 style={{ margin: '0 0 6px' }}>{d.title}</h3>
        <div className="muted mb">{d.recur !== 'Once' ? `${d.recur} task · ` : ''}Due {fmtL(d.due)}{d.clientId && clientsById[d.clientId] ? ` · ${clientsById[d.clientId].name}` : ''}</div>
        {d.notes && <div className="note">{d.notes}</div>}
        <div className="fg"><Select name="status" label="Status" options={['Pending', 'In Progress', 'Completed']} /></div>
      </ModalForm>
    );
  }
  return (
    <ModalForm title={t ? 'Edit task' : 'Allocate task'} initial={d}
      extraFoot={t && <Btn kind="dangerg" icon="trash" onClick={() => run(() => api.del(`/tasks/${t.id}`), 'Task deleted').then(() => openModal(null))}>Delete</Btn>}
      onSubmit={(f) => (t ? run(() => api.patch(`/tasks/${t.id}`, f), 'Task updated') : run(() => api.post('/tasks', f), 'Task allocated'))}>
      <div className="fg">
        <Field name="title" label="Task" req full ph="e.g. Prepare weekly analytics summary" />
        <Select name="assignee" label="Assign to" options={staffOpts()} req blank="Select…" />
        <Select name="clientId" label="Client (optional)" options={clientOpts()} blank="None" />
        <Field name="due" label="Due date" type="date" req />
        <Select name="recur" label="Frequency" options={['Once', 'Daily', 'Weekly']} />
        <Select name="status" label="Status" options={['Pending', 'In Progress', 'Completed']} />
        <TextArea name="notes" label="Notes" />
      </div>
    </ModalForm>
  );
}
registerTaskModal(TaskModal);

export function EventModal({ id, date }) {
  const { events, isAdmin, staffOpts, clientOpts, clientsById, staffById } = useWorkspace();
  const run = useAction();
  const { openModal } = useUi();
  const e = id ? events.find((x) => x.id === id) : null;
  const d = e || { title: '', category: 'Meeting', date: date || todayS(), time: '10:00', clientId: '', staff: [], notes: '' };
  if (!isAdmin) {
    return (
      <ModalForm title={d.title} submit="Close" onSubmit={() => {}}>
        <div className="muted mb">{d.category} · {fmtL(d.date)} {d.time}</div>
        {d.clientId && <div className="mb">{clientsById[d.clientId]?.name}</div>}
        <div className="avs mb">{d.staff.map((s) => <Avatar key={s} person={staffById[s]} size={28} />)}</div>
        {d.notes && <div className="note">{d.notes}</div>}
      </ModalForm>
    );
  }
  return (
    <ModalForm title={e ? 'Edit event' : 'New event'} wide initial={d} submit={e ? 'Save event' : 'Create event'}
      extraFoot={e && <Btn kind="dangerg" icon="trash" onClick={() => run(() => api.del(`/events/${e.id}`), 'Event deleted').then(() => openModal(null))}>Delete</Btn>}
      onSubmit={(f) => (e ? run(() => api.patch(`/events/${e.id}`, f), 'Event updated') : run(() => api.post('/events', f), 'Event created'))}>
      <div className="fg">
        <Field name="title" label="Title" req full />
        <Select name="category" label="Category" options={[...STAGES, 'Meeting']} />
        <Select name="clientId" label="Client" options={clientOpts()} blank="None" />
        <Field name="date" label="Date" type="date" req /><Field name="time" label="Time" type="time" req />
        <Checks name="staff" label="Attendees" options={staffOpts()} />
        <TextArea name="notes" label="Notes" />
      </div>
    </ModalForm>
  );
}
export { Icon };
