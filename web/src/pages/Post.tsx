import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Alert, CopyButton, Spinner, StatusBadge, formatBytes } from '../components/ui'
import {
  PLATFORM_LABELS,
  api,
  assetDownloadUrl,
  assetUrl,
  zipUrl,
  type Content,
  type Platform,
} from '../lib/api'

const PLATFORM_ORDER: Platform[] = ['tiktok', 'instagram', 'youtube_shorts', 'facebook', 'other']

export function Post() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [content, setContent] = useState<Content | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [urls, setUrls] = useState<Partial<Record<Platform, string>>>({})
  const [savingPlatform, setSavingPlatform] = useState<Platform | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    try {
      const { content } = await api.content(id)
      setContent(content)
      // Pre-fill inputs with links already recorded.
      const existing: Partial<Record<Platform, string>> = {}
      for (const p of content.publications) {
        if (p.publishedUrl) existing[p.platform] = p.publishedUrl
      }
      setUrls(existing)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load post')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  async function saveLink(platform: Platform) {
    const url = (urls[platform] ?? '').trim()
    if (!url || !content) return
    setSavingPlatform(platform)
    setError(null)
    try {
      await api.savePublication({ contentId: content.id, platform, publishedUrl: url })
      setNotice(`Saved link for ${PLATFORM_LABELS[platform]}`)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save link')
    } finally {
      setSavingPlatform(null)
    }
  }

  async function complete() {
    if (!content) return
    setBusy(true)
    setError(null)
    try {
      await api.complete(content.id)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete post')
      setBusy(false)
    }
  }

  async function release() {
    if (!content) return
    if (!confirm('Return this post back to the queue for someone else?')) return
    setBusy(true)
    try {
      await api.release(content.id)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to return post')
      setBusy(false)
    }
  }

  if (loading) return <Spinner />
  if (!content) {
    return (
      <div className="page stack">
        <Alert>{error ?? 'Post not found'}</Alert>
        <button className="btn" onClick={() => navigate('/')}>
          ← Back to queue
        </button>
      </div>
    )
  }

  const videos = content.assets.filter((a) => a.type === 'video')
  const images = content.assets.filter((a) => a.type === 'image')
  const savedCount = content.publications.filter((p) => p.publishedUrl).length

  return (
    <div className="page stack">
      <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => navigate('/')}>
        ← Queue
      </button>

      <div className="stack" style={{ gap: 8 }}>
        <div className="row-tight">
          <span className="code">{content.code}</span>
          <StatusBadge status={content.status} />
        </div>
        {content.title && <h1>{content.title}</h1>}
      </div>

      {error && <Alert>{error}</Alert>}
      {notice && <Alert kind="ok">{notice}</Alert>}

      {/* ---- media ---- */}
      {content.assets.length > 0 && (
        <div className="card stack">
          {videos.map((v) => (
            <video key={v.id} className="media" src={assetUrl(v.id)} controls preload="metadata" playsInline />
          ))}

          {images.length > 0 && (
            <div className="thumbs">
              {images.map((img) => (
                <a key={img.id} href={assetUrl(img.id)} target="_blank" rel="noreferrer">
                  <img className="thumb" src={assetUrl(img.id)} alt={img.originalName} loading="lazy" />
                </a>
              ))}
            </div>
          )}

          <div className="row">
            {videos.map((v) => (
              <a key={v.id} className="btn" href={assetDownloadUrl(v.id)} download>
                ⬇ Download video ({formatBytes(v.size)})
              </a>
            ))}
            {images.length > 0 && (
              <a className="btn" href={zipUrl(content.id)} download>
                ⬇ Download all images ({images.length})
              </a>
            )}
          </div>
        </div>
      )}

      {/* ---- caption ---- */}
      {content.caption && (
        <div className="card stack">
          <div className="row">
            <h2>Caption</h2>
            <div className="spacer" />
            <CopyButton text={content.caption} className="btn btn-sm" />
          </div>
          <div className="caption-box">{content.caption}</div>
        </div>
      )}

      {/* ---- links ---- */}
      <div className="card stack">
        <div className="stack" style={{ gap: 3 }}>
          <h2>Published links</h2>
          <p className="hint">After publishing on each platform, paste the link and tap Save.</p>
        </div>

        {PLATFORM_ORDER.map((platform) => {
          const saved = content.publications.find((p) => p.platform === platform)
          return (
            <div className="field" key={platform}>
              <label className="label" htmlFor={`url-${platform}`}>
                {PLATFORM_LABELS[platform]} {saved?.publishedUrl && <span style={{ color: 'var(--accent)' }}>✓</span>}
              </label>
              <div className="row-tight">
                <input
                  id={`url-${platform}`}
                  className="input"
                  type="url"
                  inputMode="url"
                  placeholder="https://…"
                  value={urls[platform] ?? ''}
                  onChange={(e) => setUrls((u) => ({ ...u, [platform]: e.target.value }))}
                  autoCapitalize="none"
                  spellCheck={false}
                />
                <button
                  className="btn"
                  onClick={() => saveLink(platform)}
                  disabled={savingPlatform === platform || !(urls[platform] ?? '').trim()}
                >
                  {savingPlatform === platform ? '…' : 'Save'}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* ---- finish ---- */}
      {content.status === 'CLAIMED' && (
        <div className="stack">
          <button className="btn btn-primary btn-lg btn-block" onClick={complete} disabled={busy || savedCount === 0}>
            {busy ? 'Saving…' : 'Complete'}
          </button>
          {savedCount === 0 && <p className="hint">Please save at least one published link before completing.</p>}
          <button className="btn btn-danger btn-block" onClick={release} disabled={busy}>
            Return post to queue
          </button>
        </div>
      )}

      {content.status === 'PUBLISHED' && <Alert kind="ok">This post has been published. Thank you!</Alert>}
    </div>
  )
}
