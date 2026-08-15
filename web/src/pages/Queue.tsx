import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Alert, Empty, Spinner, StatusBadge } from '../components/ui'
import { ApiError, api, type Content, type Stats } from '../lib/api'
import { useAuth } from '../lib/auth'

export function Queue() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState<Stats | null>(null)
  const [mine, setMine] = useState<Content[]>([])
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const [s, list] = await Promise.all([api.stats(), api.contents('CLAIMED')])
      setStats(s)
      setMine(list.contents.filter((c) => c.claimedBy === user?.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được dữ liệu')
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    void load()
  }, [load])

  async function claimNext() {
    setClaiming(true)
    setError(null)
    try {
      const { content } = await api.claimNext()
      navigate(`/post/${content.id}`)
    } catch (err) {
      setError(
        err instanceof ApiError && err.reason === 'empty_queue'
          ? 'Hiện chưa có bài nào sẵn sàng. Quay lại sau nhé.'
          : err instanceof Error
            ? err.message
            : 'Không nhận được bài',
      )
      void load()
    } finally {
      setClaiming(false)
    }
  }

  if (loading) return <Spinner />

  return (
    <div className="page stack">
      <div className="stack" style={{ gap: 4 }}>
        <h1>Xin chào {user?.displayName} 👋</h1>
        <p className="hint">
          {stats?.available
            ? `Có ${stats.available} bài đang chờ bạn.`
            : 'Chưa có bài mới nào trong hàng đợi.'}
        </p>
      </div>

      {error && <Alert>{error}</Alert>}

      <div className="stats">
        <div className="stat">
          <div className="stat-value">{stats?.available ?? 0}</div>
          <div className="stat-label">Đang chờ</div>
        </div>
        <div className="stat">
          <div className="stat-value">{stats?.claimed ?? 0}</div>
          <div className="stat-label">Bạn đang làm</div>
        </div>
        <div className="stat">
          <div className="stat-value">{stats?.published ?? 0}</div>
          <div className="stat-label">Đã đăng</div>
        </div>
      </div>

      <button
        className="btn btn-primary btn-lg btn-block"
        onClick={claimNext}
        disabled={claiming || !stats?.available}
      >
        {claiming ? 'Đang lấy bài…' : 'Lấy bài tiếp theo'}
      </button>

      <div className="stack" style={{ gap: 10 }}>
        <h2>Bài bạn đang làm</h2>
        {mine.length === 0 ? (
          <Empty>Chưa nhận bài nào. Bấm “Lấy bài tiếp theo” để bắt đầu.</Empty>
        ) : (
          <div className="list">
            {mine.map((c) => (
              <Link key={c.id} to={`/post/${c.id}`} className="list-item">
                <div className="stack min0" style={{ gap: 3, flex: 1 }}>
                  <div className="row-tight">
                    <span className="code">{c.code}</span>
                    <StatusBadge status={c.status} />
                  </div>
                  <div className="truncate" style={{ color: 'var(--text-soft)', fontSize: '0.9rem' }}>
                    {c.title || c.caption || 'Không có tiêu đề'}
                  </div>
                </div>
                <span style={{ color: 'var(--text-faint)' }}>›</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
