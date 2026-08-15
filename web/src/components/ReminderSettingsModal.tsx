import { useEffect, useState, type FormEvent } from 'react'
import { Alert, Spinner } from './ui'
import { api, type ReminderSettingsData } from '../lib/api'
import { isPushSupported, subscribeToPush, unsubscribeFromPush } from '../lib/pushClient'

const PRESET_TIMES = [
  { label: '09:00 (Sáng)', value: '09:00' },
  { label: '12:30 (Trưa)', value: '12:30' },
  { label: '19:30 (Tối)', value: '19:30' },
  { label: '21:00 (Đêm)', value: '21:00' },
]

export function ReminderSettingsModal({ onClose }: { onClose: () => void }) {
  const [loading, setLoading] = useState(true)
  const [enabled, setEnabled] = useState(true)
  const [times, setTimes] = useState<string[]>(['09:00', '12:30', '19:30'])
  const [timezone, setTimezone] = useState('Asia/Ho_Chi_Minh')
  const [hasSubscription, setHasSubscription] = useState(false)
  const [subscriptionCount, setSubscriptionCount] = useState(0)
  const [newTime, setNewTime] = useState('')
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
        setTimes(data.reminderTimes)
        setTimezone(data.timezone || 'Asia/Ho_Chi_Minh')
        setHasSubscription(data.hasSubscription)
        setSubscriptionCount(data.subscriptionCount)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Không thể tải cài đặt thông báo')
      } finally {
        setLoading(false)
      }
    }
    void loadSettings()
  }, [])

  function addTime(timeToAdd: string) {
    const trimmed = timeToAdd.trim()
    if (!trimmed) return
    if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(trimmed)) {
      setError('Định dạng giờ không hợp lệ (VD: 09:30, 20:00)')
      return
    }
    if (!times.includes(trimmed)) {
      const updated = [...times, trimmed].sort()
      setTimes(updated)
    }
    setNewTime('')
    setError(null)
  }

  function removeTime(timeToRemove: string) {
    if (times.length <= 1) {
      setError('Cần giữ ít nhất 1 khung giờ nhắc nhở')
      return
    }
    setTimes(times.filter((t) => t !== timeToRemove))
    setError(null)
  }

  async function handleToggleDevicePush() {
    setError(null)
    setSuccess(null)
    setSubscribing(true)
    try {
      if (hasSubscription && permission === 'granted') {
        await unsubscribeFromPush()
        setHasSubscription(false)
        setSubscriptionCount((c) => Math.max(0, c - 1))
        setSuccess('Đã hủy đăng ký thông báo trên thiết bị này.')
      } else {
        const res = await subscribeToPush()
        if (!res.ok) {
          setError(res.error || 'Không thể bật thông báo.')
        } else {
          setHasSubscription(true)
          setSubscriptionCount((c) => c + 1)
          if (typeof window !== 'undefined' && 'Notification' in window) {
            setPermission(Notification.permission)
          }
          setSuccess('✓ Thiết bị này đã sẵn sàng nhận thông báo nhắc nhở!')
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
      setSuccess(`✓ Đã gửi thông báo thử nghiệm tới ${res.sentTo} thiết bị!`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gửi thông báo thử nghiệm thất bại')
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
      setSuccess('✓ Cài đặt nhắc nhở đã được lưu thành công!')
      setTimeout(() => {
        onClose()
      }, 1400)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể lưu cài đặt')
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
            <span>Nhắc nhở đăng bài hàng ngày</span>
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
                <strong style={{ display: 'block', fontSize: '0.95rem' }}>Bật thông báo nhắc nhở</strong>
                <span className="hint" style={{ fontSize: '0.8rem' }}>
                  Tự động thông báo khi có video mới hoặc bài viết chưa đăng
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
              <div className="stack" style={{ gap: 10 }}>
                <label className="label" style={{ fontWeight: 650 }}>
                  Khung giờ nhắc nhở mỗi ngày ({timezone}):
                </label>

                {/* Preset Chips */}
                <div className="row-tight" style={{ flexWrap: 'wrap', gap: 6 }}>
                  {PRESET_TIMES.map((preset) => {
                    const isSelected = times.includes(preset.value)
                    return (
                      <button
                        key={preset.value}
                        type="button"
                        className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-ghost'}`}
                        style={{ fontSize: '0.82rem', padding: '5px 10px' }}
                        onClick={() => {
                          if (isSelected) removeTime(preset.value)
                          else addTime(preset.value)
                        }}
                      >
                        {isSelected ? `✓ ${preset.label}` : `+ ${preset.label}`}
                      </button>
                    )
                  })}
                </div>

                {/* Selected Times List */}
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 8,
                    padding: '10px',
                    background: 'var(--bg)',
                    borderRadius: 'var(--radius-sm)',
                    minHeight: 44,
                    alignItems: 'center',
                  }}
                >
                  {times.map((t) => (
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
                        title="Xóa giờ này"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>

                {/* Add Custom Time */}
                <div className="row" style={{ gap: 8 }}>
                  <input
                    className="input"
                    type="time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    style={{ maxWidth: 140 }}
                  />
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => addTime(newTime)}
                    disabled={!newTime}
                  >
                    + Thêm giờ tùy chỉnh
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
                    📱 Kết nối Thông báo tới thiết bị này
                  </strong>
                  <span className="hint" style={{ fontSize: '0.78rem' }}>
                    {subscriptionCount > 0
                      ? `Đang có ${subscriptionCount} thiết bị đăng ký nhận thông báo`
                      : 'Chưa có thiết bị nào kích hoạt nhận thông báo'}
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
                      ? 'Đang xử lý…'
                      : hasSubscription
                        ? 'Tắt trên thiết bị này'
                        : '🔔 Bật thông báo trên máy này'}
                  </button>
                ) : (
                  <span className="badge" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>
                    Trình duyệt không hỗ trợ Web Push
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
                    {testing ? '⏳ Đang gửi…' : '🧪 Gửi thông báo kiểm tra (Test Push)'}
                  </button>
                </div>
              )}

              <p className="hint" style={{ fontSize: '0.75rem', margin: 0, opacity: 0.85 }}>
                💡 <strong>Mẹo trên iPhone:</strong> Mở Safari ➔ Bấm nút Chia sẻ ➔ Chọn{' '}
                <strong>"Thêm vào Màn hình chính" (Add to Home Screen)</strong> để nhận thông báo đẩy ra màn hình khóa như ứng dụng thông thường.
              </p>
            </div>

            {/* ---- Action Buttons ---- */}
            <div className="row" style={{ justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
              <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>
                Đóng
              </button>
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {busy ? 'Đang lưu…' : 'Lưu cài đặt'}
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
