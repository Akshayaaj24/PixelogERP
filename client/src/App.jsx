import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './lib/store.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Clients, { ClientProfile, Planning } from './pages/Clients.jsx';
import { StagePage, StaffList, StaffProfile } from './pages/Production.jsx';
import CalendarPage, { Schedule } from './pages/Calendar.jsx';
import Reports from './pages/Reports.jsx';
import Settings from './pages/Settings.jsx';
import { MyTasks, MyClients, History } from './pages/Mine.jsx';

const AdminOnly = ({ children }) => (useAuth().isAdmin ? children : <Navigate to="/" replace />);
const StaffOnly = ({ children }) => (useAuth().isAdmin ? <Navigate to="/" replace /> : children);

export default function App() {
  const { user, ready } = useAuth();
  if (!ready) return null;
  if (!user) return <Login />;
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="clients" element={<AdminOnly><Clients /></AdminOnly>} />
        <Route path="clients/:id" element={<AdminOnly><ClientProfile /></AdminOnly>} />
        <Route path="planning" element={<AdminOnly><Planning /></AdminOnly>} />
        <Route path="scripts" element={<AdminOnly><StagePage key="script" stage="script" /></AdminOnly>} />
        <Route path="shoots" element={<AdminOnly><StagePage key="shoot" stage="shoot" /></AdminOnly>} />
        <Route path="editing" element={<AdminOnly><StagePage key="edit" stage="edit" /></AdminOnly>} />
        <Route path="posting" element={<AdminOnly><StagePage key="post" stage="post" /></AdminOnly>} />
        <Route path="staff" element={<AdminOnly><StaffList /></AdminOnly>} />
        <Route path="staff/:id" element={<AdminOnly><StaffProfile /></AdminOnly>} />
        <Route path="schedule" element={<AdminOnly><Schedule /></AdminOnly>} />
        <Route path="reports" element={<AdminOnly><Reports /></AdminOnly>} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="settings" element={<Settings />} />
        <Route path="my-tasks" element={<StaffOnly><MyTasks /></StaffOnly>} />
        <Route path="my-clients" element={<StaffOnly><MyClients /></StaffOnly>} />
        <Route path="history" element={<StaffOnly><History /></StaffOnly>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
