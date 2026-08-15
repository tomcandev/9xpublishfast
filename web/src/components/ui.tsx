import { useEffect, useState, type ReactNode } from 'react'
import { STATUS_LABELS, type ContentStatus } from '../lib/api'

export function StatusBadge({ status }: { status: ContentStatus }) {
  const cls =
    status === 'READY'
      ? 'badge-ready'
      : status === 'CLAIMED'
        ? 'badge-claimed'
        : status === 'PUBLISHED'
          ? 'badge-published'
          : 'badge-draft'
  return <span className={`badge ${cls}`}>{STATUS_LABELS[status]}</span>
}

/** Copy button that confirms inline — the one-tap caption copy from plan.txt §23. */
export function CopyButton({
  text,
  label = 'Copy caption',
  className = 'btn',
}: {
  text: string
  label?: string
  className?: string
}) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 1800)
    return () => clearTimeout(t)
  }, [copied])

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
    } catch {
      // Clipboard API needs a secure context; fall back to a temp selection.
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      try {
        document.execCommand('copy')
        setCopied(true)
      } catch {
        window.prompt('Copy caption:', text)
      }
      document.body.removeChild(ta)
    }
  }

  return (
    <button type="button" className={className} onClick={copy} disabled={!text}>
      {copied ? '✓ Đã copy' : label}
    </button>
  )
}

export function Alert({ kind = 'error', children }: { kind?: 'error' | 'ok' | 'warn'; children: ReactNode }) {
  return <div className={`alert alert-${kind}`}>{children}</div>
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>
}

export function Spinner({ label = 'Đang tải…' }: { label?: string }) {
  return <div className="center-note">{label}</div>
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`
}

export function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
