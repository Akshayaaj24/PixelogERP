import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/Auth'
import { Button, ErrorBox, Field, Input } from '../components/ui'

export default function Login() {
  const { user, login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to="/" replace />

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true); setError('')
    try { await login(email, password) } catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8">
        <div className="mb-1 text-xl font-bold tracking-wide text-slate-900">PIXELOG</div>
        <p className="mb-6 text-sm text-slate-500">Log in to your workspace</p>
        <div className="space-y-4">
          <Field label="Email"><Input type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          <Field label="Password"><Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
          <ErrorBox text={error} />
          <Button className="w-full py-2.5" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</Button>
        </div>
      </form>
    </div>
  )
}
