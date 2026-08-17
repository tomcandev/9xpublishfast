import { useState, type FormEvent } from 'react'
import { Alert } from '../components/ui'
import { useAuth } from '../lib/auth'
import { getSavedAccounts, removeSavedAccount, type SavedAccount } from '../lib/savedAccounts'

export function Login() {
  const { signIn, switchUser } = useAuth()
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>(() => getSavedAccounts())
  const [showPasswordForm, setShowPasswordForm] = useState(() => getSavedAccounts().length === 0)
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [switchingId, setSwitchingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleQuickLogin(account: SavedAccount) {
    setSwitchingId(account.id)
    setBusy(true)
    setError(null)
    try {
      await switchUser(account.sessionToken)
    } catch (err) {
      // If token expired, prompt user to enter password
      removeSavedAccount(account.id)
      setSavedAccounts(getSavedAccounts())
      setIdentifier(account.username || account.email || '')
      setShowPasswordForm(true)
      setError('Saved session expired. Please enter your password to sign in.')
      setBusy(false)
      setSwitchingId(null)
    }
  }

  function handleRemove(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    removeSavedAccount(id)
    const remaining = getSavedAccounts()
    setSavedAccounts(remaining)
    if (remaining.length === 0) {
      setShowPasswordForm(true)
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await signIn(identifier, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed')
      setBusy(false)
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card stack">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <span
            className="brand-mark"
            aria-hidden="true"
            style={{ width: 56, height: 56, borderRadius: 16 }}
          >
            <BoltIcon size={30} />
          </span>
          <span style={{ fontWeight: 700, fontSize: '1.45rem', letterSpacing: '-0.025em' }}>
            PublishFast
          </span>
        </div>

        {savedAccounts.length > 0 && !showPasswordForm ? (
          /* ==================== SAVED ACCOUNTS VIEW ==================== */
          <div className="card card-pad-lg stack" style={{ gap: 16 }}>
            <div>
              <h1 style={{ fontSize: '1.25rem' }}>Choose an account</h1>
              <p className="hint" style={{ fontSize: '0.82rem', marginTop: 2 }}>
                Tap your account to sign in instantly without entering password
              </p>
            </div>

            {error && <Alert>{error}</Alert>}

            <div className="saved-accounts-list">
              {savedAccounts.map((acc) => {
                const initial = (acc.displayName || acc.username || 'U')[0]?.toUpperCase()
                const isSwitching = switchingId === acc.id

                return (
                  <button
                    key={acc.id}
                    type="button"
                    className="saved-account-item"
                    onClick={() => void handleQuickLogin(acc)}
                    disabled={busy}
                  >
                    <div className="saved-account-avatar">
                      {isSwitching ? '⏳' : initial}
                    </div>
                    <div className="saved-account-info">
                      <span className="saved-account-name">{acc.displayName}</span>
                      <span className="saved-account-meta">
                        <span>@{acc.username}</span>
                        <span>•</span>
                        <span style={{ textTransform: 'uppercase', fontWeight: 650, fontSize: '0.72rem' }}>
                          {acc.role}
                        </span>
                      </span>
                    </div>
                    <button
                      type="button"
                      className="saved-account-remove"
                      onClick={(e) => handleRemove(e, acc.id)}
                      title="Remove from saved accounts"
                      aria-label={`Remove ${acc.displayName}`}
                    >
                      ✕
                    </button>
                  </button>
                )
              })}
            </div>

            <button
              type="button"
              className="btn btn-ghost btn-block"
              style={{ border: '1px dashed var(--border)', marginTop: 4 }}
              onClick={() => {
                setError(null)
                setShowPasswordForm(true)
              }}
              disabled={busy}
            >
              ➕ Sign in with another account
            </button>
          </div>
        ) : (
          /* ==================== PASSWORD LOGIN FORM ==================== */
          <form className="card card-pad-lg stack" onSubmit={onSubmit}>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <h1 style={{ fontSize: '1.25rem' }}>Sign In</h1>
              {savedAccounts.length > 0 && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    setError(null)
                    setShowPasswordForm(false)
                  }}
                  disabled={busy}
                >
                  ← Saved accounts
                </button>
              )}
            </div>

            {error && <Alert>{error}</Alert>}

            <div className="field">
              <label className="label" htmlFor="identifier">
                Username or email
              </label>
              <input
                id="identifier"
                className="input"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                required
                autoFocus
              />
            </div>

            <div className="field">
              <label className="label" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            <button className="btn btn-primary btn-block" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export function BoltIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M13 2 4.5 13.5H11L10 22l8.5-11.5H12L13 2Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}
