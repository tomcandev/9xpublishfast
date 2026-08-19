import { useEffect, useRef, useState, type FormEvent } from 'react'
import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { Alert, Spinner } from './components/ui'
import { BellIcon, ReminderSettingsModal } from './components/ReminderSettingsModal'
import { api } from './lib/api'
import { useAuth } from './lib/auth'
import { Admin } from './pages/Admin'
import { BoltIcon, Login } from './pages/Login'
import { Post } from './pages/Post'
import { Queue } from './pages/Queue'

export function App() {
  const { user, loading, signOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [showReminderModal, setShowReminderModal] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) {
      document.addEventListener('click', onDocClick)
      return () => document.removeEventListener('click', onDocClick)
    }
  }, [menuOpen])

  if (loading) return <Spinner />
  if (!user) return <Login />

  return (
    <div className="shell">
      <header className="topbar">
        <div className="topbar-inner">
          <NavLink to="/" className="brand">
            <span className="brand-mark" aria-hidden="true">
              <BoltIcon />
            </span>
            PublishFast
          </NavLink>

          <nav className="nav" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {user.role === 'admin' && <NavLink to="/admin">Admin</NavLink>}

            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setShowReminderModal(true)}
              title="Daily Post Reminders & Notification Settings"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 10px',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <BellIcon />
              <span style={{ fontSize: '0.85rem' }}>Reminders</span>
            </button>

            <div className="menu-wrap" ref={menuRef}>
              <button
                type="button"
                className="menu-trigger"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((v) => !v)}
              >
                <span>{user.displayName} 👋</span>
                <ChevronDownIcon />
              </button>

              {menuOpen && (
                <div className="dropdown-menu" role="menu">
                  <button
                    type="button"
                    className="dropdown-item"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false)
                      setShowReminderModal(true)
                    }}
                  >
                    <BellIcon />
                    <span>Daily Reminders</span>
                  </button>
                  <button
                    type="button"
                    className="dropdown-item"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false)
                      setShowPasswordModal(true)
                    }}
                  >
                    <KeyIcon />
                    <span>Change Password</span>
                  </button>
                  <button
                    type="button"
                    className="dropdown-item"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false)
                      void signOut()
                    }}
                  >
                    <UserSwitchIcon />
                    <span>Switch Account</span>
                  </button>
                  <button
                    type="button"
                    className="dropdown-item dropdown-item-danger"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false)
                      void signOut()
                    }}
                  >
                    <SignOutIcon />
                    <span>Sign out</span>
                  </button>
                </div>
              )}
            </div>
          </nav>
        </div>
      </header>

      <main>
        <Routes>
          <Route path="/" element={<Queue />} />
          <Route path="/post/:id" element={<Post />} />
          <Route path="/history" element={<Navigate to="/?tab=history" replace />} />
          <Route path="/admin" element={user.role === 'admin' ? <Admin /> : <Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {showPasswordModal && <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />}
      {showReminderModal && <ReminderSettingsModal onClose={() => setShowReminderModal(false)} />}
    </div>
  )
}

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match')
      return
    }
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await api.changePassword(currentPassword, newPassword)
      setSuccess(true)
      setTimeout(() => {
        onClose()
      }, 1200)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change password')
      setBusy(false)
    }
  }

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="modal-card stack">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: '1.2rem' }}>Change Password</h2>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            ✕
          </button>
        </div>

        {error && <Alert>{error}</Alert>}
        {success && <Alert kind="ok">Password changed successfully!</Alert>}

        <form className="stack" onSubmit={handleSubmit}>
          <div className="field">
            <label className="label" htmlFor="currentPassword">
              Current Password
            </label>
            <input
              id="currentPassword"
              className="input"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="field">
            <label className="label" htmlFor="newPassword">
              New Password
            </label>
            <input
              id="newPassword"
              className="input"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <div className="field">
            <label className="label" htmlFor="confirmPassword">
              Confirm New Password
            </label>
            <input
              id="confirmPassword"
              className="input"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <div className="row" style={{ justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={busy || success}>
              {busy ? 'Updating…' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function UserSwitchIcon({ size = 15 }: { size?: number }) {
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
      <polyline points="16 11 18 13 22 9" />
    </svg>
  )
}

export function SignOutIcon({ size = 15 }: { size?: number }) {
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
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}

function KeyIcon({ size = 15 }: { size?: number }) {
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
      <path d="M21 2l-2 2m-1.5 1.5L14 9a5 5 0 1 0 3 3l6-6-2.5-2.5z" />
      <circle cx="7.5" cy="16.5" r="1.5" />
    </svg>
  )
}

function ChevronDownIcon({ size = 12 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}
