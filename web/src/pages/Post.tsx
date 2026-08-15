import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Alert, CopyButton, Empty, Snackbar, Spinner, StatusBadge, formatBytes } from '../components/ui'
import {
  PLATFORM_LABELS,
  api,
  assetDownloadUrl,
  assetUrl,
  zipUrl,
  type Asset,
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
  const [urls, setUrls] = useState<Partial<Record<Platform, string>>>({})
  const [saveStatus, setSaveStatus] = useState<Partial<Record<Platform, 'idle' | 'saving' | 'saved'>>>({})
  const [busy, setBusy] = useState(false)
  const [activeSlide, setActiveSlide] = useState(0)
  const [downloading, setDownloading] = useState(false)
  const debounceTimers = useRef<Partial<Record<Platform, NodeJS.Timeout>>>({})

  const load = useCallback(async () => {
    if (!id) return
    try {
      const { content } = await api.content(id)
      setContent(content)
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

  const doSaveLink = useCallback(
    async (platform: Platform, url: string) => {
      if (!content) return
      const trimmed = url.trim()
      if (!trimmed) return
      setSaveStatus((prev) => ({ ...prev, [platform]: 'saving' }))
      setError(null)
      try {
        await api.savePublication({ contentId: content.id, platform, publishedUrl: trimmed })
        setSaveStatus((prev) => ({ ...prev, [platform]: 'saved' }))
        const updated = await api.content(content.id)
        setContent(updated.content)
        setTimeout(() => {
          setSaveStatus((prev) => ({ ...prev, [platform]: 'idle' }))
        }, 2500)
      } catch (err) {
        setSaveStatus((prev) => ({ ...prev, [platform]: 'idle' }))
        setError(err instanceof Error ? err.message : 'Failed to save link')
      }
    },
    [content],
  )

  const handleUrlChange = useCallback(
    (platform: Platform, value: string) => {
      setUrls((u) => ({ ...u, [platform]: value }))
      if (debounceTimers.current[platform]) {
        clearTimeout(debounceTimers.current[platform]!)
      }
      if (value.trim().startsWith('http')) {
        debounceTimers.current[platform] = setTimeout(() => {
          void doSaveLink(platform, value)
        }, 750)
      }
    },
    [doSaveLink],
  )

  const handleUrlBlur = useCallback(
    (platform: Platform) => {
      const val = (urls[platform] ?? '').trim()
      const saved = content?.publications.find((p) => p.platform === platform)
      if (val && val !== saved?.publishedUrl) {
        if (debounceTimers.current[platform]) {
          clearTimeout(debounceTimers.current[platform]!)
        }
        void doSaveLink(platform, val)
      }
    },
    [content?.publications, doSaveLink, urls],
  )

  const handlePaste = useCallback(
    async (platform: Platform) => {
      try {
        const text = await navigator.clipboard.readText()
        if (text && text.trim()) {
          const trimmed = text.trim()
          setUrls((u) => ({ ...u, [platform]: trimmed }))
          await doSaveLink(platform, trimmed)
        }
      } catch {
        const val = window.prompt('Paste published link:')
        if (val && val.trim()) {
          const trimmed = val.trim()
          setUrls((u) => ({ ...u, [platform]: trimmed }))
          await doSaveLink(platform, trimmed)
        }
      }
    },
    [doSaveLink],
  )

  const handleDownloadAllSeparate = useCallback(
    async (assetsList: Asset[]) => {
      if (!assetsList.length) return
      setDownloading(true)
      try {
        for (let i = 0; i < assetsList.length; i++) {
          const a = assetsList[i]!
          const link = document.createElement('a')
          link.href = assetDownloadUrl(a.id)
          link.download = a.originalName || `${content?.code || 'media'}_${i + 1}.${a.type === 'video' ? 'mp4' : 'jpg'}`
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          if (i < assetsList.length - 1) {
            await new Promise((r) => setTimeout(r, 450))
          }
        }
      } finally {
        setTimeout(() => setDownloading(false), 1200)
      }
    },
    [content?.code],
  )

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
        <Snackbar
          message={error ?? 'Post not found or inaccessible'}
          kind="error"
          onClose={() => setError(null)}
        />
        <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => navigate('/')}>
          ← Back
        </button>
        <Empty>Post not found. It may have been claimed or removed.</Empty>
      </div>
    )
  }

  const videos = content.assets.filter((a) => a.type === 'video')
  const images = content.assets.filter((a) => a.type === 'image')
  const savedCount = content.publications.filter((p) => p.publishedUrl).length
  const videosTotalSize = videos.reduce((sum, v) => sum + v.size, 0)
  const imagesTotalSize = images.reduce((sum, img) => sum + img.size, 0)

  // Ensure activeSlide stays within bounds if content changes
  const currentSlideIndex = Math.min(activeSlide, Math.max(0, images.length - 1))

  return (
    <div className="page stack">
      <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => navigate('/')}>
        ← Back
      </button>

      <div className="stack" style={{ gap: 8 }}>
        <div className="row-tight">
          <span className="code">{content.code}</span>
          <StatusBadge status={content.status} />
        </div>
        {content.title && <h1>{content.title}</h1>}
      </div>

      {error && <Snackbar message={error} kind="error" onClose={() => setError(null)} />}

      {/* ---- 3-step quick guide ---- */}
      <div className="guide-card" aria-label="Publishing workflow guide">
        <div className="guide-title">How to publish in 3 simple steps:</div>
        <div className="guide-steps">
          <div className="guide-step">
            <div className="guide-step-badge">1</div>
            <div className="guide-step-body">
              <strong>Download Media</strong>
              <span>Save video or carousel images to your device</span>
            </div>
          </div>

          <div className="guide-step">
            <div className="guide-step-badge">2</div>
            <div className="guide-step-body">
              <strong>Copy Caption & Customize</strong>
              <span>Copy caption, add trending audio, stickers & tags in the app</span>
            </div>
          </div>

          <div className="guide-step">
            <div className="guide-step-badge">3</div>
            <div className="guide-step-body">
              <strong>Publish & Paste Live Link</strong>
              <span>Publish on your channel, copy the live post link, and paste below</span>
            </div>
          </div>
        </div>
      </div>

      {/* ---- Step 1: Media ---- */}
      {content.assets.length > 0 && (
        <div className="card">
          <div className="step-split">
            <div className="step-split-left">
              <div className="step-header">
                <span className="step-badge">Step 1</span>
                <h2>Download Media</h2>
              </div>
              <div className="stack" style={{ gap: 8 }}>
                {videos.length > 0 && (
                  videos.length === 1 ? (
                    <a
                      className="btn btn-primary btn-step-action"
                      href={assetDownloadUrl(videos[0]!.id)}
                      download
                    >
                      <span className="btn-step-title">⬇ Download Video</span>
                      <span className="btn-step-sub">1 video • {formatBytes(videosTotalSize)}</span>
                    </a>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-primary btn-step-action"
                      onClick={() => void handleDownloadAllSeparate(videos)}
                      disabled={downloading}
                    >
                      <span className="btn-step-title">
                        {downloading ? '⏳ Downloading…' : '⬇ Download All Videos'}
                      </span>
                      <span className="btn-step-sub">
                        {videos.length} separate videos • {formatBytes(videosTotalSize)}
                      </span>
                    </button>
                  )
                )}
                {images.length > 0 && (
                  <>
                    <button
                      type="button"
                      className="btn btn-primary btn-step-action"
                      onClick={() => void handleDownloadAllSeparate(images)}
                      disabled={downloading}
                    >
                      <span className="btn-step-title">
                        {downloading ? '⏳ Downloading…' : '⬇ Download All Images'}
                      </span>
                      <span className="btn-step-sub">
                        {images.length === 1 ? '1 image' : `${images.length} separate images`} • {formatBytes(imagesTotalSize)}
                      </span>
                    </button>
                    {images.length > 1 && (
                      <a
                        className="btn btn-ghost btn-sm"
                        style={{ alignSelf: 'center', fontSize: '0.8rem', color: 'var(--text-soft)' }}
                        href={assetDownloadUrl(images[currentSlideIndex]!.id)}
                        download
                      >
                        ⬇ Download Slide {currentSlideIndex + 1} only
                      </a>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="step-split-right">
              {videos.map((v) => (
                <video key={v.id} className="media" src={assetUrl(v.id)} controls preload="metadata" playsInline />
              ))}

              {images.length > 0 && (
                <div className="carousel-viewer">
                  {/* Main Preview with Left/Right Navigation */}
                  <div className="carousel-main">
                    <img
                      className="carousel-main-img"
                      src={assetUrl(images[currentSlideIndex]!.id)}
                      alt={images[currentSlideIndex]!.originalName}
                    />
                    <span className="carousel-slide-badge">
                      Slide {currentSlideIndex + 1} / {images.length}
                    </span>
                    {images.length > 1 && (
                      <>
                        <button
                          type="button"
                          className="carousel-arrow carousel-arrow-prev"
                          onClick={() => setActiveSlide((prev) => (prev > 0 ? prev - 1 : images.length - 1))}
                          aria-label="Previous slide"
                        >
                          ‹
                        </button>
                        <button
                          type="button"
                          className="carousel-arrow carousel-arrow-next"
                          onClick={() => setActiveSlide((prev) => (prev < images.length - 1 ? prev + 1 : 0))}
                          aria-label="Next slide"
                        >
                          ›
                        </button>
                      </>
                    )}
                  </div>

                  {/* Horizontal scroll strip with numbered sequence badges 1, 2, 3, 4 */}
                  <div className="carousel-strip" role="tablist" aria-label="Carousel slides">
                    {images.map((img, idx) => (
                      <button
                        key={img.id}
                        type="button"
                        className={`carousel-thumb-wrap ${currentSlideIndex === idx ? 'active' : ''}`}
                        onClick={() => setActiveSlide(idx)}
                        role="tab"
                        aria-selected={currentSlideIndex === idx}
                        aria-label={`Select slide ${idx + 1}`}
                      >
                        <img className="carousel-thumb-img" src={assetUrl(img.id)} alt={img.originalName} loading="lazy" />
                        <span className="carousel-thumb-badge">{idx + 1}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ---- Step 2: Caption ---- */}
      {content.caption && (
        <div className="card">
          <div className="step-split">
            <div className="step-split-left">
              <div className="step-header">
                <span className="step-badge">Step 2</span>
                <h2>Copy Caption</h2>
              </div>
              <CopyButton
                text={content.caption}
                className="btn btn-primary btn-step-action"
                label="📋 Copy Caption"
              />
            </div>

            <div className="step-split-right">
              <div className="caption-box" style={{ margin: 0 }}>
                {content.caption}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---- Step 3: Links ---- */}
      <div className="card stack">
        <div className="stack" style={{ gap: 3 }}>
          <div className="step-header">
            <span className="step-badge">Step 3</span>
            <h2>Publish & Paste Live Links</h2>
          </div>
          <p className="hint">
            After publishing natively, copy the live post URL and paste it here. Links are saved automatically.
          </p>
        </div>

        <div className="link-rows">
          {PLATFORM_ORDER.map((platform) => {
            const saved = content.publications.find((p) => p.platform === platform)
            const status = saveStatus[platform]
            const isSaved = !!saved?.publishedUrl && (urls[platform] ?? '').trim() === saved.publishedUrl

            return (
              <div className="link-row" key={platform}>
                <label className="link-row-label" htmlFor={`url-${platform}`}>
                  <PlatformIcon platform={platform} />
                  <span>{PLATFORM_LABELS[platform]}</span>
                </label>
                <div className="link-row-input-wrap">
                  <input
                    id={`url-${platform}`}
                    className="input link-row-input"
                    type="url"
                    inputMode="url"
                    placeholder="Paste live post link (https://…)"
                    value={urls[platform] ?? ''}
                    onChange={(e) => handleUrlChange(platform, e.target.value)}
                    onBlur={() => handleUrlBlur(platform)}
                    autoCapitalize="none"
                    spellCheck={false}
                  />
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm paste-btn"
                    onClick={() => void handlePaste(platform)}
                    title="Paste from clipboard"
                  >
                    {status === 'saving' ? (
                      <span className="save-indicator saving">Saving…</span>
                    ) : status === 'saved' || isSaved ? (
                      <span className="save-indicator saved" title="Saved">
                        ✓
                      </span>
                    ) : (
                      <>
                        <PasteIcon />
                        <span>Paste</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ---- finish ---- */}
      {content.status === 'CLAIMED' && (
        <div className="stack">
          <button className="btn btn-primary btn-lg btn-block" onClick={complete} disabled={busy || savedCount === 0}>
            {busy ? 'Saving…' : 'Complete'}
          </button>
          {savedCount === 0 && <p className="hint">Please paste at least one published link before completing.</p>}
          <button className="btn btn-danger btn-block" onClick={release} disabled={busy}>
            Return post to queue
          </button>
        </div>
      )}

      {content.status === 'PUBLISHED' && <Alert kind="ok">This post has been published. Thank you!</Alert>}
    </div>
  )
}

function PlatformIcon({ platform }: { platform: Platform }) {
  switch (platform) {
    case 'tiktok':
      return <TikTokIcon />
    case 'instagram':
      return <InstagramIcon />
    case 'youtube_shorts':
      return <YouTubeIcon />
    case 'facebook':
      return <FacebookIcon />
    default:
      return <LinkIcon />
  }
}

function TikTokIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.002.595.042.88.13V9.4a6.33 6.33 0 0 0-1-.08A6.34 6.34 0 0 0 3 15.66a6.34 6.34 0 0 0 10.82 4.49 6.27 6.27 0 0 0 1.96-4.51V8.5a8.28 8.28 0 0 0 5.06 1.72v-3.53Z" />
    </svg>
  )
}

function InstagramIcon({ size = 18 }: { size?: number }) {
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
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  )
}

function YouTubeIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  )
}

function FacebookIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  )
}

function LinkIcon({ size = 18 }: { size?: number }) {
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
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  )
}

function PasteIcon({ size = 14 }: { size?: number }) {
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
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    </svg>
  )
}
