import { useState, type FormEvent } from 'react'
import { Alert } from './ui'
import { useAuth } from '../lib/auth'

export function UserIcon({ size = 15 }: { size?: number }) {
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
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

function CopyIcon({ size = 14 }: { size?: number }) {
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
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  )
}

function CheckIcon({ size = 14 }: { size?: number }) {
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
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function SparklesIcon({ size = 14 }: { size?: number }) {
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
      <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
    </svg>
  )
}

function ExternalLinkIcon({ size = 14 }: { size?: number }) {
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
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="dialog"
      aria-labelledby="profile-title"
    >
      <div className="modal-card stack" style={{ maxWidth: '520px' }}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: 'var(--accent)' }}>
              <UserIcon size={18} />
            </span>
            <h2 id="profile-title" style={{ fontSize: '1.2rem', margin: 0, fontWeight: 650 }}>
              Edit Profile & Bio Link
            </h2>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            ✕
          </button>
        </div>

        {error && <Alert kind="error">{error}</Alert>}
        {success && <Alert kind="ok">Profile saved successfully!</Alert>}

        <form className="stack" onSubmit={handleSubmit}>
          {/* Account Summary */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 14px',
              background: 'var(--bg)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
            }}
          >
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-soft)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                Account Username
              </div>
              <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text)' }}>
                @{user.username}
              </div>
            </div>
            <span className="badge" style={{ textTransform: 'uppercase', fontWeight: 600 }}>
              {user.role}
            </span>
          </div>

          {/* Display Name */}
          <div className="field">
            <label className="label" htmlFor="profile-displayName">
              Display Name <span style={{ color: 'var(--danger)' }}>*</span>
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

          {/* Email */}
          <div className="field">
            <label className="label" htmlFor="profile-email">
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
            <span style={{ fontSize: '0.78rem', color: 'var(--text-soft)', marginTop: '2px' }}>
              Used for account notifications and logging in.
            </span>
          </div>

          {/* Bio Link */}
          <div className="field" style={{ borderTop: '1px solid var(--border)', paddingTop: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label className="label" htmlFor="profile-bioLink" style={{ margin: 0, fontWeight: 600 }}>
                Bio / Affiliate Tracking Link
              </label>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={generateDefaultBioLink}
                style={{ height: '28px', minHeight: '28px', padding: '0 8px', fontSize: '0.78rem', color: 'var(--accent)' }}
                title="Generate standard affiliate tracking link with UTM tags"
              >
                <SparklesIcon size={12} />
                <span>Auto-generate</span>
              </button>
            </div>

            <div className="row-tight" style={{ width: '100%' }}>
              <input
                id="profile-bioLink"
                type="url"
                className="input"
                value={bioLink}
                onChange={(e) => setBioLink(e.target.value)}
                placeholder={`https://pteflow.com/?ref=${user.username}&utm_source=tiktok...`}
                disabled={saving}
                style={{ flex: 1, fontFamily: 'monospace', fontSize: '0.82rem' }}
              />
              {bioLink && (
                <>
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={handleCopy}
                    title="Copy bio link"
                    style={{ flexShrink: 0, minWidth: '78px', padding: '0 10px' }}
                  >
                    {copied ? (
                      <>
                        <CheckIcon size={13} />
                        <span style={{ color: 'var(--accent)' }}>Copied!</span>
                      </>
                    ) : (
                      <>
                        <CopyIcon size={13} />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                  <a
                    href={bioLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-ghost btn-sm"
                    title="Open link in new tab"
                    style={{ flexShrink: 0, padding: '0 8px' }}
                  >
                    <ExternalLinkIcon size={14} />
                  </a>
                </>
              )}
            </div>
            <span style={{ fontSize: '0.76rem', color: 'var(--text-soft)', marginTop: '4px' }}>
              Paste this link directly into your TikTok / Instagram Bio. Students who visit your link are tracked with your attribution tag.
            </span>
          </div>

          {/* Modal Actions */}
          <div className="row" style={{ justifyContent: 'flex-end', gap: '8px', paddingTop: '8px' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>
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
