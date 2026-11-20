import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/Auth'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Clients from './pages/Clients'
import ClientProfile from './pages/ClientProfile'
import Reels from './pages/Reels'
import Tasks from './pages/Tasks'
import Team from './pages/Team'
import Reports from './pages/Reports'
import Settings from './pages/Settings'

function Protected({ children, admin }) {
  const { user, isAdmin, ready } = useAuth()
  if (!ready) return null
  if (!user) return <Navigate to="/login" replace />
  if (admin && !isAdmin) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Protected><Layout /></Protected>}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/clients/:id" element={<ClientProfile />} />
        <Route path="/reels" element={<Reels />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/team" element={<Protected admin><Team /></Protected>} />
        <Route path="/reports" element={<Protected admin><Reports /></Protected>} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
