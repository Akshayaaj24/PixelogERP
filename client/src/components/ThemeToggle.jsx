import { useState } from 'react'
import { Moon, Sun } from 'lucide-react'

// Light / dark switch — remembered on this device
export default function ThemeToggle({ className = '' }) {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))
  const toggle = () => {
    const next = !dark
    document.documentElement.classList.toggle('dark', next)
    try { localStorage.setItem('theme', next ? 'dark' : 'light') } catch { /* private mode */ }
    setDark(next)
  }
  return (
    <button onClick={toggle} className={`rounded-lg p-2 text-slate-600 hover:bg-slate-100 ${className}`} aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'} title={dark ? 'Light theme' : 'Dark theme'}>
      {dark ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  )
}
