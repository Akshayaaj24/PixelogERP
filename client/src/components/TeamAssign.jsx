import { useState } from 'react'
import { put } from '../lib/api'
import { TEAM_SLOTS, clientName } from '../lib/constants'
import { Button, ErrorBox, Field, Modal, Select } from './ui'

// Manager/admin: who works for this client. New work is auto-assigned from here.
export default function TeamAssign({ client, users, onClose, onSaved }) {
  const [t, setT] = useState(Object.fromEntries(TEAM_SLOTS.map((s) => [s.key, client.team?.[s.key]?._id ?? client.team?.[s.key] ?? ''])))
  const [error, setError] = useState('')
  const save = async () => { try { onSaved(await put(`/clients/${client._id}/team`, t)) } catch (e) { setError(e.message) } }
  return (
    <Modal title={`Team for ${clientName(client)}`} onClose={onClose}
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={save}>Save</Button></>}>
      <p className="mb-4 text-sm text-slate-500">New reels, posters and website work for this client will be assigned to these people automatically.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        {TEAM_SLOTS.map((s) => (
          <Field key={s.key} label={s.label}>
            <Select value={t[s.key]} onChange={(e) => setT({ ...t, [s.key]: e.target.value })}>
              <option value="">—</option>
              {users.map((u) => <option key={u._id} value={u._id}>{u.name}{u.designation ? ` · ${u.designation}` : ''}</option>)}
            </Select>
          </Field>
        ))}
      </div>
      <div className="mt-4"><ErrorBox text={error} /></div>
    </Modal>
  )
}
