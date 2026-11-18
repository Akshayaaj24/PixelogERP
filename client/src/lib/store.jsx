import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { QueryClient, useQuery, useQueryClient } from '@tanstack/react-query';
import { tasksOf, generalTask, curMonth } from '@studioflow/shared';
import { api, getToken, setToken, setUnauthorizedHandler } from '../api.js';

export const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 15_000, refetchOnWindowFocus: true, retry: 1 } } });

/* ---------------- Auth ---------------- */
const AuthCtx = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const logout = useCallback(() => { setToken(null); setUser(null); queryClient.clear(); }, []);
  useEffect(() => {
    setUnauthorizedHandler(logout);
    if (!getToken()) { setReady(true); return; }
    api.get('/auth/me').then((r) => setUser(r.user)).catch(() => setToken(null)).finally(() => setReady(true));
  }, [logout]);
  const login = async (email, password) => {
    const r = await api.post('/auth/login', { email, password });
    setToken(r.token); setUser(r.user);
  };
  const value = useMemo(() => ({ user, ready, login, logout, setUser, isAdmin: user?.role === 'admin' }), [user, ready, logout]);
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
export const useAuth = () => useContext(AuthCtx);

/* ---------------- Data ---------------- */
const q = (key, url, enabled = true) => ({ queryKey: [key], queryFn: () => api.get(url), enabled });

/** Everything most screens need, already scoped by the server to what this user may see. */
export function useWorkspace() {
  const { user, isAdmin } = useAuth();
  const clients = useQuery(q('clients', '/clients'));
  const staff = useQuery(q('staff', '/staff'));
  const packages = useQuery(q('packages', '/packages'));
  const videos = useQuery(q('videos', '/videos'));
  const tasks = useQuery(q('tasks', '/tasks'));
  const events = useQuery(q('events', '/events'));
  const settings = useQuery(q('settings', '/settings'));
  const loading = [clients, staff, packages, videos, tasks, events, settings].some((x) => x.isLoading);
  const error = [clients, staff, packages, videos, tasks, events, settings].find((x) => x.error)?.error;

  return useMemo(() => {
    const C = clients.data || []; const St = staff.data || []; const P = packages.data || []; const V = videos.data || [];
    const G = tasks.data || []; const E = events.data || [];
    const clientsById = Object.fromEntries(C.map((c) => [c.id, c]));
    const staffById = Object.fromEntries(St.map((s) => [s.id, s]));
    const activeVideos = V.filter((v) => clientsById[v.clientId]?.status !== 'Archived');
    const month = curMonth();
    const curPackages = P.filter((p) => p.month === month && clientsById[p.clientId] && clientsById[p.clientId].status !== 'Archived');
    const curIds = new Set(curPackages.map((p) => p.id));
    const allTasks = activeVideos.flatMap(tasksOf).concat(G.map(generalTask));
    return {
      loading, error, user, isAdmin, me: isAdmin ? 'admin' : user?.id, wfUser: { id: user?.id, role: user?.role },
      clients: C, staff: St, packages: P, videos: V, generalTasks: G, events: E, settings: settings.data || { gaps: {}, notifications: {} },
      clientsById, staffById, activeVideos, curPackages, curVideos: activeVideos.filter((v) => curIds.has(v.packageId)), allTasks,
      staffName: (id) => staffById[id]?.name || (id === 'admin' ? 'Admin' : 'Unassigned'),
      staffOpts: (role) => St.filter((s) => (!role || s.jobRole === role) && s.status !== 'Inactive').map((s) => [s.id, s.name]),
      clientOpts: () => C.filter((c) => c.status !== 'Archived').map((c) => [c.id, c.name]),
    };
  }, [clients.data, staff.data, packages.data, videos.data, tasks.data, events.data, settings.data, loading, error, user, isAdmin]);
}

/* ---------------- UI: toasts, modals, video drawer ---------------- */
const UiCtx = createContext(null);
export function UiProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [modal, setModal] = useState(null);
  const [drawer, setDrawer] = useState(null);
  const toast = useCallback((text, kind) => {
    const id = Math.random();
    setToasts((t) => [...t, { id, text, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === 'warn' ? 5000 : 2600);
  }, []);
  const value = useMemo(() => ({ toast, openModal: setModal, closeModal: () => setModal(null), openVideo: setDrawer, closeVideo: () => setDrawer(null), drawer }), [toast, drawer]);
  return (
    <UiCtx.Provider value={value}>
      {children}
      {modal}
      <div id="toast-root">{toasts.map((t) => <div key={t.id} className={`toast ${t.kind || ''}`} role="status">{t.text}</div>)}</div>
    </UiCtx.Provider>
  );
}
export const useUi = () => useContext(UiCtx);

/** Runs a mutation, refreshes all data and shows a toast. Re-throws so forms can show field errors. */
export function useAction() {
  const qc = useQueryClient();
  const { toast } = useUi();
  return useCallback(async (fn, success) => {
    try {
      const r = await fn();
      await qc.invalidateQueries();
      if (r?.warning) toast(r.warning, 'warn');
      else if (success) toast(success);
      return r;
    } catch (e) {
      if (!e.fields && e.status !== 409) toast(e.message, 'warn');
      throw e;
    }
  }, [qc, toast]);
}
