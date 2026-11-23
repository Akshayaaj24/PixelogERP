import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Users, CalendarDays, UserCircle, BarChart3, Settings, Bell, Sparkles, Menu, LogOut } from 'lucide-react'
import { useAuth } from '../context/Auth'
import { get, post } from '../lib/api'
import { Avatar } from './ui'
import AskAI from './AskAI'
import Logo from './Logo'
import ThemeToggle from './ThemeToggle'

const NAV = [
  { to: '/', label: 'Dashboard', memberLabel: 'My Work', icon: LayoutDashboard, roles: ['admin', 'manager', 'member'] },
  { to: '/clients', label: 'Clients', icon: Users, roles: ['admin', 'manager'] },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays, roles: ['admin', 'manager', 'member'] },
  { to: '/team', label: 'Team', icon: UserCircle, roles: ['admin', 'manager'] },
  { to: '/reports', label: 'Reports', memberLabel: 'My Report', icon: BarChart3, roles: ['admin', 'manager', 'member'] },
  { to: '/settings', label: 'Settings', icon: Settings, roles: ['admin', 'manager', 'member'] },
]

const ago = (d) => {
  const m = Math.round((Date.now() - new Date(d)) / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  if (m < 1440) return `${Math.round(m / 60)}h ago`
  return `${Math.round(m / 1440)}d ago`
}

function Sidebar({ onNavigate }) {
  const { user, role } = useAuth()
  return (
    <div className="flex h-full flex-col border-r border-white/5 bg-navy text-[#cbd5e1]">
      <div className="px-5 py-4 text-lg text-white"><Logo tile /></div>
      <nav className="flex-1 space-y-1 px-3">
        {NAV.filter((n) => n.roles.includes(role)).map(({ to, label, memberLabel, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === '/'} onClick={onNavigate}
            className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${isActive ? 'bg-brand font-medium text-white shadow-sm' : 'hover:bg-white/5 hover:text-white'}`}>
            <Icon size={18} /> {role === 'member' ? memberLabel ?? label : label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-white/10 px-6 py-4 text-xs text-[#94a3b8]">
        {user?.name} · {{ admin: 'Admin', manager: 'Manager' }[role] ?? (user?.designation || 'Member')}
      </div>
    </div>
  )
}

function Notifications() {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])
  const load = () => get('/activities').then(setItems).catch(() => {})
  useEffect(() => { load(); const t = setInterval(load, 60000); return () => clearInterval(t) }, [])
  const unread = items.filter((i) => i.unread).length

  const toggle = () => {
    setOpen(!open)
    if (!open && unread) post('/activities/read').then(load)
  }

  return (
    <div className="relative">
      <button onClick={toggle} className="relative rounded-lg p-2 hover:bg-slate-100" aria-label="Notifications">
        <Bell size={20} />
        {unread > 0 && <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">{unread}</span>}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-slate-200 bg-surface shadow-lg">
            <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold">Notifications</div>
            <ul className="max-h-96 divide-y divide-slate-100 overflow-y-auto">
              {items.length === 0 && <li className="px-4 py-6 text-center text-sm text-slate-400">No notifications</li>}
              {items.map((a) => (
                <li key={a._id} className={`px-4 py-3 text-sm ${a.unread ? 'bg-blue-50/50' : ''}`}>
                  <span className="font-medium text-slate-900">{a.user?.name || 'Someone'}</span> <span className="text-slate-600">{a.text}</span>
                  <div className="mt-0.5 text-xs text-slate-400">{ago(a.createdAt)}</div>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  )
}

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)
  const [userOpen, setUserOpen] = useState(false)

  return (
    <div className="flex min-h-screen">
      <aside className="fixed inset-y-0 left-0 hidden w-60 lg:block print:hidden"><Sidebar /></aside>
      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMenuOpen(false)} />
          <aside className="relative h-full w-64"><Sidebar onNavigate={() => setMenuOpen(false)} /></aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col lg:pl-60 print:pl-0">
        <header className="print:hidden sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-surface px-4 lg:px-8">
          <button className="rounded-lg p-2 hover:bg-slate-100 lg:hidden" onClick={() => setMenuOpen(true)} aria-label="Open menu"><Menu size={20} /></button>
          <div className="text-base text-slate-900 lg:hidden"><Logo tile /></div>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => setAiOpen(true)} className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand/90">
              <Sparkles size={16} /> <span className="hidden sm:inline">Ask AI</span>
            </button>
            <ThemeToggle />
            <Notifications />
            <div className="relative">
              <button onClick={() => setUserOpen(!userOpen)} aria-label="Account"><Avatar name={user?.name} photo={user?.photo} /></button>
              {userOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setUserOpen(false)} />
                  <div className="absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-xl border border-slate-200 bg-surface py-1 text-sm shadow-lg">
                    <div className="px-4 py-2"><div className="font-medium">{user?.name}</div><div className="text-xs text-slate-500">{user?.email}</div></div>
                    <button className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-slate-50" onClick={() => { setUserOpen(false); navigate('/settings') }}><Settings size={15} /> Settings</button>
                    <button className="flex w-full items-center gap-2 px-4 py-2 text-left text-red-600 hover:bg-slate-50" onClick={logout}><LogOut size={15} /> Log out</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-8"><Outlet /></main>
      </div>

      {aiOpen && <AskAI onClose={() => setAiOpen(false)} />}
    </div>
  )
}
