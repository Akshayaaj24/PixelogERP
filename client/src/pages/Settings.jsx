import { useState } from 'react';
import { NOTIFICATION_TYPES } from '@PixelogERP/shared';
import { api } from '../api.js';
import { useAction, useUi, useWorkspace, useAuth } from '../lib/store.jsx';
import { PageHeader, Card, Badge, Btn, Avatar, Icon, fmtY } from '../components/ui.jsx';

function ThemeToggle() {
  const [t, setT] = useState(document.documentElement.dataset.theme || 'light');
  const set = (x) => { document.documentElement.dataset.theme = x; localStorage.setItem('sf_theme', x); setT(x); };
  return <div className="segc"><button type="button" className={t === 'light' ? 'on' : ''} onClick={() => set('light')}><Icon n="sun" /> Light</button><button type="button" className={t === 'dark' ? 'on' : ''} onClick={() => set('dark')}><Icon n="moon" /> Dark</button></div>;
}
function PasswordForm() {
  const { toast } = useUi(); const [cur, setCur] = useState(''); const [next, setNext] = useState(''); const [err, setErr] = useState('');
  const submit = async (e) => {
    e.preventDefault(); setErr('');
    if (next.length < 8) { setErr('Use at least 8 characters for the new password'); return; }
    try { await api.post('/auth/password', { current: cur, next }); setCur(''); setNext(''); toast('Password changed'); } catch (x) { setErr(x.message); }
  };
  return (
    <form onSubmit={submit}><div className="fg">
      <label className="fld"><span>Current password</span><input type="password" value={cur} onChange={(e) => setCur(e.target.value)} autoComplete="current-password" /></label>
      <label className="fld"><span>New password</span><input type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" /></label>
    </div>{err && <div className="m-err on" style={{ margin: '12px 0 0' }}>{err}</div>}<div style={{ marginTop: 14 }}><button className="btn primary" disabled={!cur || !next}>Change password</button></div></form>
  );
}

export default function Settings() {
  const ws = useWorkspace(); const run = useAction(); const { user } = useAuth();
  const [tab, setTab] = useState('general');
  const s = ws.settings;
  const [agency, setAgency] = useState(s.agency || '');
  const [gaps, setGaps] = useState(s.gaps || { shoot: 3, edit: 4, post: 3 });
  const [notif, setNotif] = useState(() => Object.fromEntries(NOTIFICATION_TYPES.map((n) => [n, s.notifications?.[n] !== false])));
  if (!ws.isAdmin) {
    const me = ws.staffById[user.id] || user;
    return (
      <>
        <PageHeader title="Profile & Settings" />
        <div className="grid k2">
          <Card title="My profile"><div className="row g12 mb"><Avatar person={me} size={56} /><div><div className="b" style={{ fontSize: 16 }}>{user.name}</div><div className="muted">{user.jobRole}</div></div></div>
            <div className="info-g"><div><div className="k">Email</div><div className="v">{user.email}</div></div><div><div className="k">Phone</div><div className="v">{user.phone}</div></div><div><div className="k">Joined</div><div className="v">{fmtY(user.joined)}</div></div><div><div className="k">Status</div><div className="v"><Badge s={user.status} /></div></div></div>
            <p className="muted sm">Ask your administrator to change your profile details.</p></Card>
          <div className="stack"><Card title="Appearance"><ThemeToggle /></Card><Card title="Password"><PasswordForm /></Card></div>
        </div>
      </>
    );
  }
  const save = (body, msg) => run(() => api.put('/settings', body), msg).catch(() => {});
  const tabs = [['general', 'Agency'], ['workflow', 'Workflow defaults'], ['notif', 'Notifications'], ['access', 'Users & access']];
  const perms = [['Manage clients & packages', 1, 0], ['Manage staff', 1, 0], ['Assign tasks & schedules', 1, 0], ['Approve scripts and videos', 1, 0], ['View reports & analytics', 1, 0], ['Manage system settings', 1, 0], ['View assigned tasks & clients', 1, 1], ['Update own task status', 1, 1], ['Submit work & add notes', 1, 1], ['View feedback & revisions', 1, 1], ["View other employees' schedules", 1, 0]];
  return (
    <>
      <PageHeader title="Settings" sub="Agency profile, workflow defaults, notifications and access." />
      <div className="settings-g">
        <div className="card" style={{ padding: 8, alignSelf: 'start' }}>{tabs.map(([k, l]) => <button type="button" key={k} className={`nav ${tab === k ? 'on' : ''}`} onClick={() => setTab(k)}><span>{l}</span></button>)}</div>
        <div className="stack">
          {tab === 'general' && <>
            <Card title="Agency profile"><label className="fld"><span>Agency name</span><input value={agency} onChange={(e) => setAgency(e.target.value)} /></label><div style={{ marginTop: 14 }}><Btn kind="primary" disabled={agency.trim().length < 2} onClick={() => save({ agency }, 'Agency name saved')}>Save changes</Btn></div></Card>
            <Card title="Appearance"><ThemeToggle /></Card>
            <Card title="Your password"><PasswordForm /></Card>
          </>}
          {tab === 'workflow' && <Card title="Default gaps between production stages">
            <p className="muted sm" style={{ marginTop: 0 }}>Used when a monthly package generates its video workflows. Changes apply to new packages.</p>
            <div className="fg3">{[['shoot', 'Script deadline → shoot'], ['edit', 'Shoot → editing deadline'], ['post', 'Editing deadline → posting']].map(([k, l]) => <label key={k} className="fld"><span>{l} (days)</span><input type="number" min={0} max={30} value={gaps[k]} onChange={(e) => setGaps({ ...gaps, [k]: +e.target.value })} /></label>)}</div>
            <div style={{ marginTop: 14 }}><Btn kind="primary" onClick={() => save({ gaps }, 'Workflow defaults saved')}>Save defaults</Btn></div>
          </Card>}
          {tab === 'notif' && <Card title="Notification types">
            <div className="chks" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>{NOTIFICATION_TYPES.map((n) => <label key={n} style={{ border: 0, padding: '4px 0' }}><input type="checkbox" checked={notif[n]} onChange={(e) => setNotif({ ...notif, [n]: e.target.checked })} /> {n}</label>)}</div>
            <div style={{ marginTop: 14 }}><Btn kind="primary" onClick={() => save({ notifications: notif }, 'Notification preferences saved')}>Save preferences</Btn></div>
          </Card>}
          {tab === 'access' && <Card title="Role permissions"><div className="tbl-wrap"><table className="perm"><thead><tr><th>Permission</th><th>Admin</th><th>Staff</th></tr></thead><tbody>{perms.map(([p, a, st]) => <tr key={p}><td>{p}</td><td className={a ? 'yes' : 'no'}>{a ? <Icon n="check" /> : '—'}</td><td className={st ? 'yes' : 'no'}>{st ? <Icon n="check" /> : '—'}</td></tr>)}</tbody></table></div>
            <p className="muted sm">Staff accounts are created under Staff Management. Every API route enforces these rules on the server.</p></Card>}
        </div>
      </div>
    </>
  );
}
