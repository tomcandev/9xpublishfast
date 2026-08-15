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
      setError(err instanceof Error ? err.message : 'Đăng nhập thất bại')
      setBusy(false)
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card stack">
        <div className="row-tight" style={{ justifyContent: 'center' }}>
          <span className="brand-mark" aria-hidden="true">
            <BoltIcon />
          </span>
          <span style={{ fontWeight: 680, fontSize: '1.15rem', letterSpacing: '-0.02em' }}>
            PublishFast
          </span>
        </div>

        <form className="card card-pad-lg stack" onSubmit={onSubmit}>
          <div className="stack" style={{ gap: 4 }}>
            <h1 style={{ fontSize: '1.25rem' }}>Đăng nhập</h1>
            <p className="hint">Dùng username hoặc email đều được.</p>
          </div>

          {error && <Alert>{error}</Alert>}

          <div className="field">
            <label className="label" htmlFor="identifier">
              Username hoặc email
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
              placeholder="yoga"
              required
              autoFocus
            />
          </div>

          <div className="field">
            <label className="label" htmlFor="password">
              Mật khẩu
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
            {busy ? 'Đang vào…' : 'Đăng nhập'}
          </button>
        </form>
      </div>
    </div>
  )
}

export function BoltIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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
