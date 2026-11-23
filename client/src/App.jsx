import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/Auth'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Clients from './pages/Clients'
import ClientProfile from './pages/ClientProfile'
import Calendar from './pages/Calendar'
import Team from './pages/Team'
import Reports from './pages/Reports'
import Settings from './pages/Settings'

// manage = admin or manager only
function Protected({ children, manage }) {
  const { user, canManage, ready } = useAuth()
  if (!ready) return null
  if (!user) return <Navigate to="/login" replace />
  if (manage && !canManage) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Protected><Layout /></Protected>}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/clients" element={<Protected manage><Clients /></Protected>} />
        <Route path="/clients/:id" element={<Protected manage><ClientProfile /></Protected>} />
        <Route path="/team" element={<Protected manage><Team /></Protected>} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/settings" element={<Settings />} />
        {/* old links */}
        <Route path="/reels" element={<Navigate to="/calendar" replace />} />
        <Route path="/tasks" element={<Navigate to="/calendar" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
