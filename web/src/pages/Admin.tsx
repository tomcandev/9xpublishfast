import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Alert, Spinner, StatusBadge, formatDate } from '../components/ui'
import { api, type Content, type ContentStatus, type Role, type User } from '../lib/api'

type Tab = 'contents' | 'users' | 'tokens'
type AdminContent = Omit<Content, 'assets' | 'publications'>

export function Admin() {
  const [tab, setTab] = useState<Tab>('contents')
  return (
    <div className="page page-wide stack">
      <h1>Admin</h1>
      <div className="nav" role="tablist">
        {(
          [
            ['contents', 'Content'],
            ['users', 'Users'],
            ['tokens', 'API Tokens'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            className={`btn btn-sm ${tab === key ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === 'contents' && <ContentsTab />}
      {tab === 'users' && <UsersTab />}
      {tab === 'tokens' && <TokensTab />}
    </div>
  )
}

/* ---------------- contents ---------------- */

function ContentsTab() {
  const [items, setItems] = useState<AdminContent[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [busyAction, setBusyAction] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    code: '',
    title: '',
    caption: '',
    contentType: 'video' as 'video' | 'carousel',
  })

  const load = useCallback(async () => {
    try {
      const { contents } = await api.admin.contents()
      setItems(contents)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  function toggleSelectAll() {
    if (selectedIds.size === items.length && items.length > 0) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(items.map((c) => c.id)))
    }
  }

  function toggleSelectOne(id: string) {
    const updated = new Set(selectedIds)
    if (updated.has(id)) updated.delete(id)
    else updated.add(id)
    setSelectedIds(updated)
  }

  async function handleBulkDelete() {
    const count = selectedIds.size
    if (count === 0) return
    if (
      !confirm(
        `Delete ${count} selected content items? All attached media files and publication links will be permanently deleted.`,
      )
    ) {
      return
    }

    setBusyAction(true)
    setError(null)
    setNotice(null)
    try {
      const res = await api.admin.bulkDeleteContents(Array.from(selectedIds))
      setSelectedIds(new Set())
      setNotice(`✓ Successfully deleted ${res.deleted} content items.`)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bulk deletion failed')
    } finally {
      setBusyAction(false)
    }
  }

  async function handleBulkSetStatus(status: ContentStatus) {
    const count = selectedIds.size
    if (count === 0) return

    setBusyAction(true)
    setError(null)
    setNotice(null)
    try {
      const res = await api.admin.bulkUpdateContentStatus(Array.from(selectedIds), status)
      setSelectedIds(new Set())
      setNotice(`✓ Updated status to "${status}" for ${res.updated} content items.`)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bulk status update failed')
    } finally {
      setBusyAction(false)
    }
  }

  async function create(e: FormEvent) {
    e.preventDefault()
    setCreating(true)
    setError(null)
    setNotice(null)
    try {
      const { content } = await api.admin.createContent({
        code: form.code.trim(),
        title: form.title.trim() || undefined,
        caption: form.caption.trim() || undefined,
        contentType: form.contentType,
        status: 'DRAFT',
      })

      const files = fileRef.current?.files
      if (files && files.length > 0) {
        await api.admin.uploadAssets(content.id, files)
      }

      setNotice(`Created ${content.code}. Set status to “Ready” for KOLs to claim.`)
      setForm({ code: '', title: '', caption: '', contentType: 'video' })
      if (fileRef.current) fileRef.current.value = ''
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Creation failed')
    } finally {
      setCreating(false)
    }
  }

  async function setStatus(id: string, status: ContentStatus) {
    try {
      await api.admin.updateContent(id, { status })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed')
    }
  }

  async function remove(id: string, code: string) {
    if (!confirm(`Delete "${code}"? All attached media and links will be permanently removed.`)) return
    try {
      await api.admin.deleteContent(id)
      const updated = new Set(selectedIds)
      updated.delete(id)
      setSelectedIds(updated)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Deletion failed')
    }
  }

  if (loading) return <Spinner />

  const allSelected = items.length > 0 && selectedIds.size === items.length

  return (
    <div className="stack">
      {error && <Alert>{error}</Alert>}
      {notice && <Alert kind="ok">{notice}</Alert>}

      <form className="card stack" onSubmit={create}>
        <h2>Add Content</h2>
        <div className="row" style={{ gap: 12 }}>
          <div className="field" style={{ flex: '1 1 180px' }}>
            <label className="label" htmlFor="code">Code *</label>
            <input
              id="code"
              className="input"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              placeholder="PTE-RS-001"
              required
            />
          </div>
          <div className="field" style={{ flex: '2 1 240px' }}>
            <label className="label" htmlFor="title">Title</label>
            <input
              id="title"
              className="input"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div className="field" style={{ flex: '0 1 150px' }}>
            <label className="label" htmlFor="ctype">Type</label>
            <select
              id="ctype"
              className="select"
              value={form.contentType}
              onChange={(e) => setForm({ ...form, contentType: e.target.value as 'video' | 'carousel' })}
            >
              <option value="video">Video</option>
              <option value="carousel">Carousel</option>
            </select>
          </div>
        </div>

        <div className="field">
          <label className="label" htmlFor="caption">Caption</label>
          <textarea
            id="caption"
            className="textarea"
            value={form.caption}
            onChange={(e) => setForm({ ...form, caption: e.target.value })}
          />
        </div>

        <div className="field">
          <label className="label" htmlFor="files">Video / Images</label>
          <input id="files" ref={fileRef} className="input" type="file" multiple accept="video/*,image/*" />
          <span className="hint">Select multiple images for carousels — order follows selection.</span>
        </div>

        <button className="btn btn-primary" disabled={creating}>
          {creating ? 'Creating…' : 'Create Content'}
        </button>
      </form>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="bulk-action-bar">
          <div className="bulk-action-info">
            <span>✓</span>
            <span>{selectedIds.size} of {items.length} items selected</span>
          </div>
          <div className="row-tight" style={{ flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={() => handleBulkSetStatus('READY')}
              disabled={busyAction}
            >
              Set Ready ({selectedIds.size})
            </button>
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => handleBulkSetStatus('DRAFT')}
              disabled={busyAction}
            >
              Set Draft ({selectedIds.size})
            </button>
            <button
              type="button"
              className="btn btn-sm btn-danger"
              onClick={handleBulkDelete}
              disabled={busyAction}
            >
              {busyAction ? 'Deleting…' : `🗑️ Delete Selected (${selectedIds.size})`}
            </button>
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => setSelectedIds(new Set())}
              disabled={busyAction}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th style={{ width: 40 }}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  aria-label="Select all content items"
                />
              </th>
              <th>Code</th>
              <th>Title</th>
              <th>Status</th>
              <th>Created</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((c) => {
              const isSelected = selectedIds.has(c.id)
              return (
                <tr
                  key={c.id}
                  style={{
                    background: isSelected ? 'var(--accent-soft)' : undefined,
                    transition: 'background 0.12s ease',
                  }}
                >
                  <td>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelectOne(c.id)}
                      aria-label={`Select ${c.code}`}
                    />
                  </td>
                  <td><span className="code">{c.code}</span></td>
                  <td style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {c.title || <span className="hint">—</span>}
                  </td>
                  <td><StatusBadge status={c.status} /></td>
                  <td className="hint">{formatDate(c.createdAt)}</td>
                  <td>
                    <div className="row-tight">
                      {c.status === 'DRAFT' && (
                        <button className="btn btn-sm btn-primary" onClick={() => setStatus(c.id, 'READY')}>
                          Ready
                        </button>
                      )}
                      {c.status === 'READY' && (
                        <button className="btn btn-sm" onClick={() => setStatus(c.id, 'DRAFT')}>
                          Draft
                        </button>
                      )}
                      <button className="btn btn-sm btn-danger" onClick={() => remove(c.id, c.code)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="hint" style={{ textAlign: 'center', padding: 28 }}>
                  No content items found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ---------------- users ---------------- */

function UsersTab() {
  const [users, setUsers] = useState<User[]>([])
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({ username: '', password: '', email: '', displayName: '', role: 'kol' as Role })

  const load = useCallback(async () => {
    try {
      const { users } = await api.admin.users()
      setUsers(users)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function create(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      await api.admin.createUser({
        username: form.username.trim().toLowerCase(),
        password: form.password,
        email: form.email.trim() || undefined,
        displayName: form.displayName.trim() || undefined,
        role: form.role,
      })
      setNotice(`Created account "${form.username}".`)
      setForm({ username: '', password: '', email: '', displayName: '', role: 'kol' })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Creation failed')
    } finally {
      setBusy(false)
    }
  }

  async function toggleActive(u: User) {
    try {
      await api.admin.updateUser(u.id, { active: !u.active })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed')
    }
  }

  if (loading) return <Spinner />

  return (
    <div className="stack">
      {error && <Alert>{error}</Alert>}
      {notice && <Alert kind="ok">{notice}</Alert>}

      <form className="card stack" onSubmit={create}>
        <h2>Add User</h2>
        <div className="row" style={{ gap: 12 }}>
          <div className="field" style={{ flex: '1 1 150px' }}>
            <label className="label" htmlFor="u-name">Username *</label>
            <input
              id="u-name"
              className="input"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="yoga"
              autoCapitalize="none"
              required
            />
            <span className="hint">Lowercase, no @ symbol</span>
          </div>
          <div className="field" style={{ flex: '1 1 150px' }}>
            <label className="label" htmlFor="u-pass">Password *</label>
            <input
              id="u-pass"
              className="input"
              type="text"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="at least 8 characters"
              required
            />
          </div>
          <div className="field" style={{ flex: '1 1 180px' }}>
            <label className="label" htmlFor="u-email">Email (optional)</label>
            <input
              id="u-email"
              className="input"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="field" style={{ flex: '0 1 130px' }}>
            <label className="label" htmlFor="u-role">Role</label>
            <select
              id="u-role"
              className="select"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
            >
              <option value="kol">KOL</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>
        <button className="btn btn-primary" disabled={busy}>
          {busy ? 'Creating…' : 'Create User'}
        </button>
      </form>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Username</th>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td><span className="code">{u.username}</span></td>
                <td>{u.displayName}</td>
                <td className="hint">{u.email || '—'}</td>
                <td><span className="badge">{u.role}</span></td>
                <td>
                  <span className={`badge ${u.active ? 'badge-ready' : ''}`}>
                    {u.active ? 'Active' : 'Disabled'}
                  </span>
                </td>
                <td>
                  <div className="row-tight">
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost"
                      onClick={() => setEditingUser(u)}
                    >
                      ✏️ Edit
                    </button>
                    <button className="btn btn-sm" onClick={() => toggleActive(u)}>
                      {u.active ? 'Disable' : 'Enable'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSaved={async () => {
            setNotice(`✓ Updated user @${editingUser.username} successfully.`)
            await load()
          }}
        />
      )}
    </div>
  )
}

function EditUserModal({
  user,
  onClose,
  onSaved,
}: {
  user: User
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const [displayName, setDisplayName] = useState(user.displayName || '')
  const [email, setEmail] = useState(user.email || '')
  const [role, setRole] = useState<Role>(user.role)
  const [active, setActive] = useState(user.active)
  const [newPassword, setNewPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (newPassword && newPassword.length < 8) {
      setError('New password must be at least 8 characters')
      return
    }

    setBusy(true)
    setError(null)
    try {
      await api.admin.updateUser(user.id, {
        displayName: displayName.trim() || user.username,
        email: email.trim() || null,
        role,
        active,
        password: newPassword ? newPassword : undefined,
      })
      await onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed')
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
      <div className="modal-card stack" style={{ maxWidth: 460 }}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: '1.2rem' }}>Edit User @{user.username}</h2>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            ✕
          </button>
        </div>

        {error && <Alert>{error}</Alert>}

        <form className="stack" style={{ gap: 14 }} onSubmit={handleSubmit}>
          <div className="field">
            <label className="label" htmlFor="edit-display-name">
              Display Name
            </label>
            <input
              id="edit-display-name"
              className="input"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={user.username}
              required
            />
          </div>

          <div className="field">
            <label className="label" htmlFor="edit-email">
              Email (optional)
            </label>
            <input
              id="edit-email"
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
            />
          </div>

          <div className="row" style={{ gap: 12 }}>
            <div className="field" style={{ flex: '1 1 140px' }}>
              <label className="label" htmlFor="edit-role">
                Role
              </label>
              <select
                id="edit-role"
                className="select"
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
              >
                <option value="kol">KOL</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div className="field" style={{ flex: '1 1 140px' }}>
              <label className="label" htmlFor="edit-active">
                Account Status
              </label>
              <select
                id="edit-active"
                className="select"
                value={active ? 'active' : 'disabled'}
                onChange={(e) => setActive(e.target.value === 'active')}
              >
                <option value="active">Active</option>
                <option value="disabled">Disabled</option>
              </select>
            </div>
          </div>

          <div
            className="field stack"
            style={{
              padding: '12px',
              background: 'var(--bg)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              gap: 6,
            }}
          >
            <label className="label" htmlFor="edit-password" style={{ fontWeight: 650 }}>
              🔑 Set New Password (optional)
            </label>
            <input
              id="edit-password"
              className="input"
              type="text"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Leave blank to keep current password (min 8 chars)"
            />
            <span className="hint" style={{ fontSize: '0.76rem' }}>
              If filled, user's password will be immediately updated to this new password.
            </span>
          </div>

          <div className="row" style={{ justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ---------------- tokens ---------------- */

function TokensTab() {
  const [tokens, setTokens] = useState<Awaited<ReturnType<typeof api.admin.tokens>>['tokens']>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [fresh, setFresh] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const { tokens } = await api.admin.tokens()
      setTokens(tokens)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function create(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      const { token } = await api.admin.createToken(name.trim())
      setFresh(token)
      setName('')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create token')
    }
  }

  async function remove(id: string) {
    if (!confirm('Revoke this token?')) return
    await api.admin.deleteToken(id).catch(() => {})
    await load()
  }

  if (loading) return <Spinner />

  return (
    <div className="stack">
      {error && <Alert>{error}</Alert>}

      {fresh && (
        <Alert kind="warn">
          <div className="stack" style={{ gap: 6 }}>
            <strong>Token is displayed once — save it now:</strong>
            <code className="code" style={{ wordBreak: 'break-all', display: 'block', padding: 8 }}>{fresh}</code>
          </div>
        </Alert>
      )}

      <form className="card stack" onSubmit={create}>
        <h2>Generate API Token</h2>
        <p className="hint">Used by AI ingestion pipelines to push content into the queue.</p>
        <div className="row-tight">
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ai-pipeline"
            required
          />
          <button className="btn btn-primary">Generate</button>
        </div>
      </form>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Created</th>
              <th>Last Used</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {tokens.map((t) => (
              <tr key={t.id}>
                <td>{t.name}</td>
                <td className="hint">{formatDate(t.createdAt)}</td>
                <td className="hint">{formatDate(t.lastUsedAt)}</td>
                <td>
                  <button className="btn btn-sm btn-danger" onClick={() => remove(t.id)}>
                    Revoke
                  </button>
                </td>
              </tr>
            ))}
            {tokens.length === 0 && (
              <tr>
                <td colSpan={4} className="hint" style={{ textAlign: 'center', padding: 28 }}>
                  No API tokens found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
