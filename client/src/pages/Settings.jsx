import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/Auth'
import { put } from '../lib/api'
import { Button, Card, ErrorBox, Field, Input, PageHeader } from '../components/ui'

export default function Settings() {
  const { user, setUser, isAdmin } = useAuth()
  const [profile, setProfile] = useState({ name: user.name, phone: user.phone || '' })
  const [pw, setPw] = useState({ current: '', next: '' })
  const [msg, setMsg] = useState({})

  const saveProfile = async () => {
    try { setUser({ ...user, ...(await put('/auth/me', profile)) }); setMsg({ profile: 'Saved ✓' }) } catch (e) { setMsg({ profileErr: e.message }) }
  }
  const savePw = async () => {
    try { await put('/auth/me/password', pw); setPw({ current: '', next: '' }); setMsg({ pw: 'Password changed ✓' }) } catch (e) { setMsg({ pwErr: e.message }) }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Settings" />
      <Card title="My Profile">
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Name"><Input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} /></Field>
          <Field label="Phone"><Input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} /></Field>
          <Field label="Email (login)"><Input value={user.email} disabled /></Field>
          <Field label="Role"><Input value={isAdmin ? 'Admin' : user.designation || 'Employee'} disabled /></Field>
          <div className="flex items-center gap-3 sm:col-span-2">
            <Button onClick={saveProfile}>Save</Button>
            {msg.profile && <span className="text-sm text-green-700">{msg.profile}</span>}
          </div>
          <div className="sm:col-span-2"><ErrorBox text={msg.profileErr} /></div>
        </div>
      </Card>

      <Card title="Change Password">
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Current password"><Input type="password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} /></Field>
          <Field label="New password"><Input type="password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} /></Field>
          <div className="flex items-center gap-3 sm:col-span-2">
            <Button variant="dark" onClick={savePw}>Change password</Button>
            {msg.pw && <span className="text-sm text-green-700">{msg.pw}</span>}
          </div>
          <div className="sm:col-span-2"><ErrorBox text={msg.pwErr} /></div>
        </div>
      </Card>

      {isAdmin && (
        <Card title="Company">
          <div className="space-y-2 p-5 text-sm text-slate-600">
            <p>Add, edit or disable team logins in <Link to="/team" className="font-medium text-brand">Team</Link>.</p>
            <p className="text-slate-400">Coming later: AI settings (Claude), WhatsApp notifications, Meta Ads connection.</p>
          </div>
        </Card>
      )}
    </div>
  )
}
