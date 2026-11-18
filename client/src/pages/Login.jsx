import { useState } from 'react';
import { STAGES } from '@studioflow/shared';
import { useAuth } from '../lib/store.jsx';
import { Icon } from '../components/ui.jsx';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setError('');
    if (!email || !password) { setError('Enter your email and password'); return; }
    setBusy(true);
    try { await login(email.trim(), password); } catch (x) { setError(x.message); } finally { setBusy(false); }
  };
  return (
    <div className="login">
      <div className="login-art">
        <div className="row g12"><div className="logo" style={{ background: 'rgba(255,255,255,.15)' }}>S</div><b style={{ fontSize: 17 }}>StudioFlow ERP</b></div>
        <div>
          <h1>Every client, every video, every deadline in one workflow.</h1>
          <p>Monthly content packages become individual video pipelines automatically, from the first script to the published post.</p>
          <div className="feat"><div><Icon n="layers" /> Client-wise monthly content planning</div><div><Icon n="film" /> An independent workflow and status for every video</div><div><Icon n="calendar" /> Drag-and-drop scheduling with conflict detection</div><div><Icon n="shield" /> Separate admin and staff access</div></div>
          <div className="login-pipe">{STAGES.map((s) => <span key={s}>{s}</span>)}</div>
        </div>
        <div style={{ opacity: 0.6, fontSize: 12 }}>Production workspace</div>
      </div>
      <div className="login-box">
        <div className="row g8"><div className="logo">S</div><b>StudioFlow</b></div>
        <h2>Sign in</h2><div className="muted" style={{ marginBottom: 22 }}>Admins and staff use the same sign-in. You’ll see the screens for your role.</div>
        <form onSubmit={submit} noValidate>
          <label className="fld"><span>Work email</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" autoFocus /></label>
          <label className="fld"><span>Password</span><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" /></label>
          {error && <div className="m-err on" style={{ margin: 0 }} role="alert">{error}</div>}
          <button className="btn primary full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        </form>
        {import.meta.env.DEV && <div className="demo"><b>Sample data</b> (after <b>npm run seed</b>)<br />Admin: admin@brightwave.agency / admin12345<br />Staff: sneha@brightwave.agency / staff12345</div>}
      </div>
    </div>
  );
}
