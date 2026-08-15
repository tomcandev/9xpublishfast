import { useState, type FormEvent } from 'react'
import { Alert } from '../components/ui'
import { useAuth } from '../lib/auth'

export function Login() {
  const { signIn } = useAuth()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

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

        <form className="card card-pad-lg stack" onSubmit={onSubmit}>
          <h1 style={{ fontSize: '1.25rem' }}>Sign In</h1>

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
