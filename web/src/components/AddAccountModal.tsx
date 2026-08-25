import { useState, type FormEvent } from 'react'
import { Alert } from './ui'
import { useAuth } from '../lib/auth'

export function UserPlusIcon({ size = 15 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
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
      setError(err instanceof Error ? err.message : 'Invalid username or password')
      setBusy(false)
    }
  }

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="dialog"
      aria-labelledby="add-acc-title"
    >
      <div className="modal-card stack" style={{ maxWidth: '440px' }}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: 'var(--accent)' }}>
              <UserPlusIcon size={18} />
            </span>
            <h2 id="add-acc-title" style={{ fontSize: '1.2rem', margin: 0, fontWeight: 650 }}>
              Add Another Account
            </h2>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            ✕
          </button>
        </div>

        {error && <Alert kind="error">{error}</Alert>}

        <form className="stack" onSubmit={handleSubmit}>
          <div className="field">
            <label className="label" htmlFor="add-identifier">
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
            <label className="label" htmlFor="add-password">
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

          <div className="row" style={{ justifyContent: 'flex-end', gap: '8px', paddingTop: '8px' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>
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
