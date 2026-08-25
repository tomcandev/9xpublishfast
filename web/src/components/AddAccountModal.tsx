import { useState, type FormEvent } from 'react'
import { Alert } from './ui'
import { useAuth } from '../lib/auth'

export function UserPlusIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" y1="8" x2="19" y2="14" />
      <line x1="22" y1="11" x2="16" y2="11" />
    </svg>
  )
}

interface AddAccountModalProps {
  onClose: () => void
}

export function AddAccountModal({ onClose }: AddAccountModalProps) {
  const { signIn } = useAuth()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await signIn(identifier.trim(), password)
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid credentials')
      setBusy(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="add-acc-title">
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: 'var(--color-primary)' }}>
              <UserPlusIcon />
            </span>
            <h2 id="add-acc-title" style={{ margin: 0 }}>Add Another Account</h2>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {error && <Alert kind="error">{error}</Alert>}

            <div className="field">
              <label htmlFor="add-identifier" style={{ fontWeight: 500 }}>
                Username or Email
              </label>
              <input
                id="add-identifier"
                type="text"
                className="input"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="e.g. yoga or yoga@example.com"
                required
                autoFocus
                disabled={busy}
              />
            </div>

            <div className="field">
              <label htmlFor="add-password" style={{ fontWeight: 500 }}>
                Password
              </label>
              <input
                id="add-password"
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Account password"
                required
                disabled={busy}
              />
            </div>
          </div>

          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Signing in...' : 'Sign In & Switch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
