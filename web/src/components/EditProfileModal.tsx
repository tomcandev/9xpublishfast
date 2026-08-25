import { useState, type FormEvent } from 'react'
import { Alert } from './ui'
import { useAuth } from '../lib/auth'

export function UserIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

function SparklesIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
    </svg>
  )
}

function ExternalLinkIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  )
}

interface EditProfileModalProps {
  onClose: () => void
}

export function EditProfileModal({ onClose }: EditProfileModalProps) {
  const { user, updateProfile } = useAuth()

  const [displayName, setDisplayName] = useState(user?.displayName ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [bioLink, setBioLink] = useState(user?.bioLink ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [success, setSuccess] = useState(false)

  if (!user) return null

  function generateDefaultBioLink() {
    if (!user) return
    const link = `https://pteflow.com/?ref=${user.username}&utm_source=tiktok&utm_medium=bio&utm_campaign=kol_${user.username}`
    setBioLink(link)
    setError(null)
  }

  async function handleCopy() {
    if (!bioLink) return
    try {
      await navigator.clipboard.writeText(bioLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      await updateProfile({
        displayName: displayName.trim() || undefined,
        email: email.trim() || null,
        bioLink: bioLink.trim() || null,
      })
      setSuccess(true)
      setTimeout(() => {
        onClose()
      }, 900)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal-lg" onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="profile-title">
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: 'var(--color-primary)' }}>
              <UserIcon />
            </span>
            <h2 id="profile-title" style={{ margin: 0 }}>Edit Profile & Bio Link</h2>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {error && <Alert kind="error">{error}</Alert>}
            {success && <Alert kind="ok">Profile saved successfully!</Alert>}

            {/* Account Info Read-Only Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                background: 'var(--color-surface-2)',
                borderRadius: '8px',
                border: '1px solid var(--color-border)',
              }}
            >
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Username
                </div>
                <div style={{ fontWeight: 600, fontSize: '1rem' }}>@{user.username}</div>
              </div>
              <span className={`badge ${user.role === 'admin' ? 'badge-admin' : 'badge-kol'}`} style={{ textTransform: 'uppercase' }}>
                {user.role}
              </span>
            </div>

            {/* Display Name */}
            <div className="field">
              <label htmlFor="profile-displayName" style={{ fontWeight: 500 }}>
                Display Name <span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              <input
                id="profile-displayName"
                type="text"
                className="input"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Tom, Yoga PTE..."
                required
                disabled={saving}
              />
            </div>

            {/* Email Address */}
            <div className="field">
              <label htmlFor="profile-email" style={{ fontWeight: 500 }}>
                Email Address
              </label>
              <input
                id="profile-email"
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your-email@example.com"
                disabled={saving}
              />
              <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                Used for account notifications and logging in.
              </span>
            </div>

            {/* Bio / Affiliate Link */}
            <div className="field" style={{ borderTop: '1px solid var(--color-border)', paddingTop: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label htmlFor="profile-bioLink" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>Bio / Affiliate Tracking Link</span>
                </label>
                <button
                  type="button"
                  className="btn btn-xs btn-outline"
                  onClick={generateDefaultBioLink}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                  title="Generate standard affiliate tracking link with UTM tags"
                >
                  <SparklesIcon />
                  <span>Auto-generate</span>
                </button>
              </div>

              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  id="profile-bioLink"
                  type="url"
                  className="input"
                  value={bioLink}
                  onChange={(e) => setBioLink(e.target.value)}
                  placeholder={`https://pteflow.com/?ref=${user.username}&utm_source=tiktok...`}
                  disabled={saving}
                  style={{ flex: 1, fontFamily: 'monospace', fontSize: '0.85rem' }}
                />
                {bioLink && (
                  <>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      onClick={handleCopy}
                      title="Copy bio link to clipboard"
                      style={{ minWidth: '85px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                    >
                      {copied ? (
                        <>
                          <CheckIcon />
                          <span style={{ color: 'var(--color-success)' }}>Copied!</span>
                        </>
                      ) : (
                        <>
                          <CopyIcon />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                    <a
                      href={bioLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-sm btn-ghost"
                      title="Open link in new tab"
                      style={{ display: 'flex', alignItems: 'center', padding: '0 8px' }}
                    >
                      <ExternalLinkIcon />
                    </a>
                  </>
                )}
              </div>
              <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '4px', display: 'block' }}>
                Paste this link directly into your TikTok / Instagram profile Bio. Any student who visits your link will be tracked with your referral tag and attribution parameters.
              </span>
            </div>
          </div>

          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
