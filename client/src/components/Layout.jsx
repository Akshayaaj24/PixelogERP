import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { reminders, stageIdx, stageName, todayS, EVENT_COLORS } from '@PixelogERP/shared';
import { api } from '../api.js';
import { useAuth, useUi, useWorkspace, queryClient } from '../lib/store.jsx';
import { Icon, Avatar, ClientMark, Popover, Empty, fmtL, ago } from './ui.jsx';
import { VideoDrawer } from './workflow.jsx';

const ADMIN_NAV = [
  ['Overview', [['/', 'Dashboard', 'grid'], ['/clients', 'Clients', 'briefcase'], ['/planning', 'Content Planning', 'layers']]],
  ['Production', [['/scripts', 'Script Writing', 'pen'], ['/shoots', 'Shooting Schedule', 'camera'], ['/editing', 'Video Editing', 'film'], ['/posting', 'Social Media Posting', 'share']]],
  ['Team', [['/staff', 'Staff Management', 'users'], ['/schedule', 'Staff Work Schedule', 'clock'], ['/calendar', 'Calendar', 'calendar']]],
  ['Insights', [['/reports', 'Reports & Analytics', 'chart'], ['/settings', 'Settings', 'settings']]],
];
const STAFF_NAV = [
  ['My workspace', [['/', 'My Dashboard', 'grid'], ['/my-tasks', 'My Tasks', 'list'], ['/calendar', 'My Calendar', 'calendar'], ['/my-clients', 'My Clients', 'briefcase'], ['/history', 'Completed History', 'checkc']]],
  ['Account', [['/settings', 'Profile & Settings', 'settings']]],
];

export default function Layout() {
  const ws = useWorkspace();
  const { logout } = useAuth();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sf_collapsed') === '1');
  const [mobile, setMobile] = useState(false);
  const loc = useLocation();
  useEffect(() => setMobile(false), [loc.pathname]);
  useEffect(() => { localStorage.setItem('sf_collapsed', collapsed ? '1' : '0'); }, [collapsed]);
  useEffect(() => { document.documentElement.dataset.theme = localStorage.getItem('sf_theme') || 'light'; }, []);
  const counts = ws.isAdmin
    ? { '/scripts': ws.activeVideos.filter((v) => ['Submitted', 'Under Review'].includes(v.script.status)).length, '/editing': ws.activeVideos.filter((v) => v.edit.status === 'Internal Review').length }
    : { '/my-tasks': ws.allTasks.filter((t) => t.who.includes(ws.user.id) && !t.done && t.due < todayS()).length };
  return (
    <div className={`shell ${collapsed ? 'collapsed' : ''} ${mobile ? 'mnav' : ''}`}>
      <aside className="sb">
        <div className="sb-h"><div className="logo">S</div><div className="brand"><div className="brand-t">PixelogERP</div><div className="brand-s">{ws.settings.agency}</div></div></div>
        <nav aria-label="Main">
          {(ws.isAdmin ? ADMIN_NAV : STAFF_NAV).map(([g, items]) => (
            <div key={g}><div className="nav-l">{g}</div>
              {items.map(([to, label, icon]) => (
                <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `nav ${isActive ? 'on' : ''}`} title={label}>
                  <Icon n={icon} /><span>{label}</span>{counts[to] ? <em className="cnt">{counts[to]}</em> : null}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="sb-f">
          <button type="button" className="nav sbtog" onClick={() => setCollapsed(!collapsed)}><Icon n={collapsed ? 'expand' : 'collapse'} /><span>Collapse</span></button>
          <button type="button" className="nav" onClick={logout}><Icon n="logout" /><span>Sign out</span></button>
        </div>
      </aside>
      {mobile && <div className="sb-scrim" onClick={() => setMobile(false)} />}
      <div className="main">
        <Topbar onMenu={() => setMobile(true)} />
        <main className="view">{ws.loading ? <Empty>Loading your workspace…</Empty> : ws.error ? <Empty>Couldn’t load data: {ws.error.message}</Empty> : <Outlet />}</main>
      </div>
      <VideoDrawer />
    </div>
  );
}

function Topbar({ onMenu }) {
  const ws = useWorkspace();
  const { logout } = useAuth();
  const nav = useNavigate();
  const { openVideo, openModal } = useUi();
  const [notifAnchor, setNotifAnchor] = useState(null);
  const [profAnchor, setProfAnchor] = useState(null);
  const [tab, setTab] = useState('updates');
  const [qs, setQs] = useState('');
  const notifs = useQuery({ queryKey: ['notifications'], queryFn: () => api.get('/notifications'), refetchInterval: 60_000 });
  const list = notifs.data || [];
  const rem = reminders(ws.allTasks, ws.me);
  const badge = list.filter((n) => !n.read).length + rem.filter((r) => r.overdue || r.due === todayS()).length;
  const theme = document.documentElement.dataset.theme;
  const setTheme = (t) => { document.documentElement.dataset.theme = t; localStorage.setItem('sf_theme', t); setProfAnchor(null); };
  const markAll = async () => { await api.post('/notifications/read-all'); queryClient.invalidateQueries({ queryKey: ['notifications'] }); };
  const openN = async (n) => { setNotifAnchor(null); if (!n.read) { await api.patch(`/notifications/${n.id}/read`); queryClient.invalidateQueries({ queryKey: ['notifications'] }); } if (n.videoId) openVideo(n.videoId); };

  const q = qs.trim().toLowerCase();
  const results = q.length < 2 ? null : {
    clients: ws.clients.filter((c) => `${c.name} ${c.company} ${c.contact}`.toLowerCase().includes(q)).slice(0, 5),
    videos: ws.activeVideos.filter((v) => `${v.code} ${v.title}`.toLowerCase().includes(q)).slice(0, 6),
    staff: ws.isAdmin ? ws.staff.filter((s) => `${s.name} ${s.jobRole} ${s.email}`.toLowerCase().includes(q)).slice(0, 5) : [],
  };
  const go = (fn) => { setQs(''); fn(); };
  const me = ws.isAdmin ? null : ws.staffById[ws.user.id] || ws.user;
  return (
    <header className="tb">
      <button type="button" className="icon-btn mob" onClick={onMenu} aria-label="Open menu"><Icon n="menu" /></button>
      <div className="gsearch"><Icon n="search" />
        <input value={qs} onChange={(e) => setQs(e.target.value)} onKeyDown={(e) => e.key === 'Escape' && setQs('')} placeholder={ws.isAdmin ? 'Search clients, videos, staff…' : 'Search your videos & clients…'} aria-label="Search" />
        {results && (
          <div className="gs-res on">
            {results.clients.length > 0 && <><div className="gs-g">Clients</div>{results.clients.map((c) => <div key={c.id} className="gs-i" onClick={() => go(() => nav(ws.isAdmin ? `/clients/${c.id}` : '/my-clients'))}><ClientMark c={c} size={28} /><div><div className="b">{c.name}</div><div className="muted xs">{c.company}</div></div></div>)}</>}
            {results.videos.length > 0 && <><div className="gs-g">Videos</div>{results.videos.map((v) => <div key={v.id} className="gs-i" onClick={() => go(() => openVideo(v.id))}><span className="dot" style={{ background: EVENT_COLORS[stageName(stageIdx(v))] }} /><div style={{ minWidth: 0 }}><div className="b">{v.title}</div><div className="muted xs">{v.code} · {stageName(stageIdx(v))}</div></div></div>)}</>}
            {results.staff.length > 0 && <><div className="gs-g">Staff</div>{results.staff.map((s) => <div key={s.id} className="gs-i" onClick={() => go(() => nav(`/staff/${s.id}`))}><Avatar person={s} /><div><div className="b">{s.name}</div><div className="muted xs">{s.jobRole}</div></div></div>)}</>}
            {!results.clients.length && !results.videos.length && !results.staff.length && <div className="empty-s">Nothing matches “{qs}”. Try a client name or a video ID like VID-2611.</div>}
          </div>
        )}
      </div>
      <div className="tb-r">
        <span className="tb-date">{fmtL(todayS())}</span>
        <button type="button" className="icon-btn" aria-label={`Notifications (${badge})`} onClick={(e) => setNotifAnchor(notifAnchor ? null : e.currentTarget)}><Icon n="bell" />{badge > 0 && <span className="bb on">{badge > 99 ? '99+' : badge}</span>}</button>
        <button type="button" className="prof" onClick={(e) => setProfAnchor(profAnchor ? null : e.currentTarget)}>
          {ws.isAdmin ? <span className="av" style={{ width: 34, height: 34, background: 'var(--pri)', color: '#fff', fontSize: 13 }}>AD</span> : <Avatar person={me} size={34} />}
          <span>{ws.user.name}<small>{ws.isAdmin ? 'Administrator' : ws.user.jobRole}</small></span>
        </button>
      </div>
      {notifAnchor && (
        <Popover anchor={notifAnchor} onClose={() => setNotifAnchor(null)} className="np">
          <div className="np-h"><h4>Notifications</h4><span className="sp" />{tab === 'updates' && list.some((n) => !n.read) && <button type="button" className="btn sm" onClick={markAll}>Mark all read</button>}</div>
          <div className="np-tabs">
            <button type="button" className={tab === 'updates' ? 'on' : ''} onClick={() => setTab('updates')}>Updates ({list.filter((n) => !n.read).length})</button>
            <button type="button" className={tab === 'rem' ? 'on' : ''} onClick={() => setTab('rem')}>Reminders ({rem.length})</button>
          </div>
          {tab === 'updates'
            ? (list.length ? list.map((n) => <div key={n.id} className={`ni ${n.read ? '' : 'unread'}`} onClick={() => openN(n)}><span className="d" style={{ background: n.read ? 'transparent' : 'var(--pri)' }} /><div style={{ minWidth: 0 }}><div className="xs b muted">{n.type}</div><div className="tx">{n.text}</div><div className="tm">{ago(n.createdAt)}</div></div></div>) : <Empty>No notifications yet</Empty>)
            : (rem.length ? rem.slice(0, 40).map((r, i) => <div key={i} className="ni" onClick={() => { setNotifAnchor(null); if (r.videoId) openVideo(r.videoId); }}><span className="d" style={{ background: r.overdue ? 'var(--bad)' : 'var(--warn)' }} /><div style={{ minWidth: 0 }}><div className="xs b" style={{ color: r.overdue ? 'var(--bad)' : 'var(--warn)' }}>{r.type}</div><div className="tx">{r.text}</div><div className="tm">{r.sub}</div></div></div>) : <Empty>You’re on schedule — no reminders</Empty>)}
        </Popover>
      )}
      {profAnchor && (
        <Popover anchor={profAnchor} onClose={() => setProfAnchor(null)} width={230}>
          <div style={{ padding: '10px 10px 6px' }}><div className="b">{ws.user.name}</div><div className="muted xs">{ws.user.email}</div></div><hr />
          <button type="button" className="mi" onClick={() => { setProfAnchor(null); nav('/settings'); }}><Icon n="settings" />Settings</button>
          <button type="button" className="mi" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}><Icon n={theme === 'dark' ? 'sun' : 'moon'} />{theme === 'dark' ? 'Light' : 'Dark'} mode</button><hr />
          <button type="button" className="mi dng" onClick={logout}><Icon n="logout" />Sign out</button>
        </Popover>
      )}
      {openModal && null}
    </header>
  );
}
