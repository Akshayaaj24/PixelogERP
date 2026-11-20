import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Users, Film, CheckSquare, UserCircle, BarChart3, Settings, Bell, Sparkles, Menu, X, LogOut } from 'lucide-react'
import { useAuth } from '../context/Auth'
import { get, post } from '../lib/api'
import { Avatar } from './ui'

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/clients', label: 'Clients', icon: Users },
  { to: '/reels', label: 'Reels', icon: Film },
  { to: '/tasks', label: 'Tasks', icon: CheckSquare },
  { to: '/team', label: 'Team', icon: UserCircle, admin: true },
  { to: '/reports', label: 'Reports', icon: BarChart3, admin: true },
  { to: '/settings', label: 'Settings', icon: Settings },
]

const ago = (d) => {
  const m = Math.round((Date.now() - new Date(d)) / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  if (m < 1440) return `${Math.round(m / 60)}h ago`
  return `${Math.round(m / 1440)}d ago`
}

function Sidebar({ onNavigate }) {
  const { user, isAdmin } = useAuth()
  return (
    <div className="flex h-full flex-col bg-navy text-slate-300">
      <div className="px-6 py-5 text-lg font-bold tracking-wide text-white">PIXELOG</div>
      <nav className="flex-1 space-y-1 px-3">
        {NAV.filter((n) => !n.admin || isAdmin).map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === '/'} onClick={onNavigate}
            className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${isActive ? 'bg-white/10 font-medium text-white' : 'hover:bg-white/5 hover:text-white'}`}>
            <Icon size={18} /> {label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-white/10 px-6 py-4 text-xs text-slate-400">
        {user?.name} · {isAdmin ? 'Admin' : user?.designation || 'Employee'}
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
          <div className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
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
        <header className="print:hidden sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-white px-4 lg:px-8">
          <button className="rounded-lg p-2 hover:bg-slate-100 lg:hidden" onClick={() => setMenuOpen(true)} aria-label="Open menu"><Menu size={20} /></button>
          <div className="text-base font-bold tracking-wide lg:hidden">PIXELOG</div>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => setAiOpen(true)} className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-blue-700">
              <Sparkles size={16} /> <span className="hidden sm:inline">Ask AI</span>
            </button>
            <Notifications />
            <div className="relative">
              <button onClick={() => setUserOpen(!userOpen)} aria-label="Account"><Avatar name={user?.name} /></button>
              {userOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setUserOpen(false)} />
                  <div className="absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 text-sm shadow-lg">
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

      {/* AI panel — connected to Claude in Step 5 */}
      {aiOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setAiOpen(false)} />
          <div className="relative flex h-full w-full max-w-md flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div className="flex items-center gap-2 font-semibold"><Sparkles size={18} className="text-brand" /> AI Assistant</div>
              <button onClick={() => setAiOpen(false)} className="rounded-lg p-1.5 hover:bg-slate-100" aria-label="Close"><X size={18} /></button>
            </div>
            <div className="flex-1 space-y-2 p-5 text-sm">
              <p className="text-slate-500">Soon you can ask:</p>
              {["What's pending today?", 'Which reels are waiting for approval?', 'Who has overdue work?', 'Give me this week\'s summary'].map((q) => (
                <div key={q} className="rounded-lg border border-slate-200 px-3 py-2 text-slate-700">{q}</div>
              ))}
            </div>
            <div className="border-t border-slate-200 p-4">
              <input disabled placeholder="Coming soon — Claude AI" className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
