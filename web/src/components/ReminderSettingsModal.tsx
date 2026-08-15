import { useEffect, useState, type FormEvent } from 'react'
import { Alert, Spinner } from './ui'
import { api, type ReminderSettingsData } from '../lib/api'
import { isPushSupported, subscribeToPush, unsubscribeFromPush } from '../lib/pushClient'

interface PresetSlot {
  id: string
  title: string
  time: string
  icon: string
}

const PRESET_SLOTS: PresetSlot[] = [
  { id: 'morning', title: 'Morning', time: '07:00', icon: '🌅' },
  { id: 'noon', title: 'Noon', time: '11:00', icon: '☀️' },
  { id: 'evening', title: 'Evening', time: '18:00', icon: '🌙' },
]

export function ReminderSettingsModal({ onClose }: { onClose: () => void }) {
  const [loading, setLoading] = useState(true)
  const [enabled, setEnabled] = useState(true)
  const [times, setTimes] = useState<string[]>(['18:00'])
  const [timezone, setTimezone] = useState('Asia/Ho_Chi_Minh')
  const [hasSubscription, setHasSubscription] = useState(false)
  const [subscriptionCount, setSubscriptionCount] = useState(0)
  const [customTime, setCustomTime] = useState('')
  const [busy, setBusy] = useState(false)
  const [testing, setTesting] = useState(false)
  const [subscribing, setSubscribing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [permission, setPermission] = useState<NotificationPermission>('default')

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission)
    }

    async function loadSettings() {
      try {
        const data = await api.notificationSettings()
        setEnabled(data.enabled)
        setTimes(data.reminderTimes.length > 0 ? data.reminderTimes : ['18:00'])
        setTimezone(data.timezone || 'Asia/Ho_Chi_Minh')
        setHasSubscription(data.hasSubscription)
        setSubscriptionCount(data.subscriptionCount)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load notification settings')
      } finally {
        setLoading(false)
      }
    }
    void loadSettings()
  }, [])

  function togglePreset(timeVal: string) {
    setError(null)
    if (times.includes(timeVal)) {
      if (times.length <= 1) {
        setError('Please keep at least one reminder time.')
        return
      }
      setTimes(times.filter((t) => t !== timeVal))
    } else {
      setTimes([...times, timeVal].sort())
    }
  }

  function addCustomTime() {
    const trimmed = customTime.trim()
    if (!trimmed) return
    if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(trimmed)) {
      setError('Invalid time format (e.g. 08:30, 20:00)')
      return
    }
    if (times.includes(trimmed)) {
      setError('This time is already selected.')
      return
    }
    setTimes([...times, trimmed].sort())
    setCustomTime('')
    setError(null)
  }

  function removeTime(timeToRemove: string) {
    if (times.length <= 1) {
      setError('Please keep at least one reminder time.')
      return
    }
    setTimes(times.filter((t) => t !== timeToRemove))
    setError(null)
  }

  const customTimes = times.filter(
    (t) => !PRESET_SLOTS.some((slot) => slot.time === t),
  )

  async function handleToggleDevicePush() {
    setError(null)
    setSuccess(null)
    setSubscribing(true)
    try {
      if (hasSubscription && permission === 'granted') {
        await unsubscribeFromPush()
        setHasSubscription(false)
        setSubscriptionCount((c) => Math.max(0, c - 1))
        setSuccess('Unsubscribed from notifications on this device.')
      } else {
        const res = await subscribeToPush()
        if (!res.ok) {
          setError(res.error || 'Failed to enable notifications.')
        } else {
          setHasSubscription(true)
          setSubscriptionCount((c) => c + 1)
          if (typeof window !== 'undefined' && 'Notification' in window) {
            setPermission(Notification.permission)
          }
          setSuccess('✓ This device is now ready to receive reminders!')
        }
      }
    } finally {
      setSubscribing(false)
    }
  }

  async function handleTestPush() {
    setError(null)
    setSuccess(null)
    setTesting(true)
    try {
      const res = await api.testNotification()
      setSuccess(`✓ Test notification sent to ${res.sentTo} device(s)!`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send test notification')
    } finally {
      setTesting(false)
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setSuccess(null)
    try {
      await api.updateNotificationSettings({
        enabled,
        reminderTimes: times,
        timezone,
      })
      setSuccess('✓ Reminder settings saved successfully!')
      setTimeout(() => {
        onClose()
      }, 1400)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings')
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
      <div className="modal-card stack" style={{ maxWidth: 520 }}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>⏰</span>
            <span>Daily Post Reminders</span>
          </h2>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            ✕
          </button>
        </div>

        {error && <Alert>{error}</Alert>}
        {success && <Alert kind="ok">{success}</Alert>}

        {loading ? (
          <Spinner />
        ) : (
          <form className="stack" style={{ gap: 18 }} onSubmit={handleSubmit}>
            {/* ---- Master Toggle ---- */}
            <div
              className="row"
              style={{
                justifyContent: 'space-between',
                padding: '12px 14px',
                background: 'var(--bg)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
              }}
            >
              <div>
                <strong style={{ display: 'block', fontSize: '0.95rem' }}>Enable Reminders</strong>
                <span className="hint" style={{ fontSize: '0.8rem' }}>
                  Auto-notify when new content is ready or tasks remain unposted
                </span>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                />
                <span className="slider round" />
              </label>
            </div>

            {/* ---- Time Selection ---- */}
            {enabled && (
              <div className="stack" style={{ gap: 12 }}>
                <label className="label" style={{ fontWeight: 650 }}>
                  Daily Reminder Slots ({timezone}):
                </label>

                {/* 3 Primary Slots */}
                <div className="reminder-time-grid">
                  {PRESET_SLOTS.map((slot) => {
                    const isSelected = times.includes(slot.time)
                    return (
                      <div
                        key={slot.id}
                        className={`reminder-time-card ${isSelected ? 'active' : ''}`}
                        onClick={() => togglePreset(slot.time)}
                        role="checkbox"
                        aria-checked={isSelected}
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === ' ' || e.key === 'Enter') {
                            e.preventDefault()
                            togglePreset(slot.time)
                          }
                        }}
                      >
                        <span className="reminder-time-icon">{slot.icon}</span>
                        <span className="reminder-time-title">{slot.title}</span>
                        <span className="reminder-time-val">{slot.time}</span>
                        <span className="reminder-time-check">
                          {isSelected ? '✓ Active' : '+ Enable'}
                        </span>
                      </div>
                    )
                  })}
                </div>

                {/* Custom Times Strip (if any) */}
                {customTimes.length > 0 && (
                  <div className="stack" style={{ gap: 6 }}>
                    <span className="hint" style={{ fontSize: '0.78rem', fontWeight: 600 }}>
                      Custom Times:
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {customTimes.map((t) => (
                        <span
                          key={t}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            background: 'var(--accent-soft)',
                            color: 'var(--accent)',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            padding: '4px 9px',
                            borderRadius: 4,
                          }}
                        >
                          <span>⏰ {t}</span>
                          <button
                            type="button"
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--text-soft)',
                              cursor: 'pointer',
                              padding: 0,
                              fontSize: '0.9rem',
                              lineHeight: 1,
                            }}
                            onClick={() => removeTime(t)}
                            title="Remove time"
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Add Custom Time Input */}
                <div className="row" style={{ gap: 8, alignItems: 'center' }}>
                  <input
                    className="input"
                    type="time"
                    value={customTime}
                    onChange={(e) => setCustomTime(e.target.value)}
                    style={{ maxWidth: 130 }}
                  />
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={addCustomTime}
                    disabled={!customTime}
                  >
                    + Add Custom Time
                  </button>
                </div>
              </div>
            )}

            {/* ---- Device Web Push Section ---- */}
            <div
              className="stack"
              style={{
                gap: 10,
                padding: '14px',
                background: 'var(--bg)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
              }}
            >
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <strong style={{ fontSize: '0.92rem', display: 'block' }}>
                    📱 Connect Push Notifications to this device
                  </strong>
                  <span className="hint" style={{ fontSize: '0.78rem' }}>
                    {subscriptionCount > 0
                      ? `${subscriptionCount} device(s) currently registered for push notifications`
                      : 'No devices registered yet'}
                  </span>
                </div>

                {isPushSupported() ? (
                  <button
                    type="button"
                    className={`btn btn-sm ${hasSubscription ? 'btn-ghost' : 'btn-primary'}`}
                    onClick={handleToggleDevicePush}
                    disabled={subscribing}
                  >
                    {subscribing
                      ? 'Processing…'
                      : hasSubscription
                        ? 'Disable on this device'
                        : '🔔 Enable Push on this device'}
                  </button>
                ) : (
                  <span className="badge" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>
                    Browser does not support Web Push
                  </span>
                )}
              </div>

              {hasSubscription && (
                <div className="row" style={{ gap: 8, marginTop: 4 }}>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={handleTestPush}
                    disabled={testing}
                  >
                    {testing ? '⏳ Sending…' : '🧪 Send Test Push Notification'}
                  </button>
                </div>
              )}

              <p className="hint" style={{ fontSize: '0.75rem', margin: 0, opacity: 0.85 }}>
                💡 <strong>Tip for iPhone users:</strong> Open Safari ➔ Tap the Share button ➔ Select{' '}
                <strong>"Add to Home Screen"</strong> to receive lock screen push notifications just like a native app.
              </p>
            </div>

            {/* ---- Action Buttons ---- */}
            <div className="row" style={{ justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
              <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {busy ? 'Saving…' : 'Save Settings'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export function BellIcon({ size = 15 }: { size?: number }) {
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
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  )
}
