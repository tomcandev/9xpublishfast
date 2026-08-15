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
      setError(err instanceof Error ? err.message : 'Failed to load data')
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
          ? 'No posts ready right now. Check back later.'
          : err instanceof Error
            ? err.message
            : 'Failed to claim post',
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
        <h1>Welcome, {user?.displayName} 👋</h1>
        <p className="hint">
          {stats?.available
            ? `${stats.available} post${stats.available === 1 ? '' : 's'} waiting in queue.`
            : 'No new posts waiting in queue.'}
        </p>
      </div>

      {error && <Alert>{error}</Alert>}

      <div className="stats">
        <div className="stat">
          <div className="stat-value">{stats?.available ?? 0}</div>
          <div className="stat-label">Waiting</div>
        </div>
        <div className="stat">
          <div className="stat-value">{stats?.claimed ?? 0}</div>
          <div className="stat-label">In Progress</div>
        </div>
        <div className="stat">
          <div className="stat-value">{stats?.published ?? 0}</div>
          <div className="stat-label">Published</div>
        </div>
      </div>

      <button
        className="btn btn-primary btn-lg btn-block"
        onClick={claimNext}
        disabled={claiming || !stats?.available}
      >
        {claiming ? 'Claiming post…' : 'Claim next post'}
      </button>

      <div className="stack" style={{ gap: 10 }}>
        <h2>Your active posts</h2>
        {mine.length === 0 ? (
          <Empty>No active posts. Tap “Claim next post” to begin.</Empty>
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
                    {c.title || c.caption || 'Untitled'}
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
