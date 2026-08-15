import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Alert, Spinner, StatusBadge, formatDate } from '../components/ui'
import { api, type Content, type ContentStatus, type Role, type User } from '../lib/api'

type Tab = 'contents' | 'users' | 'tokens'
type AdminContent = Omit<Content, 'assets' | 'publications'>

export function Admin() {
  const [tab, setTab] = useState<Tab>('contents')
  return (
    <div className="page page-wide stack">
      <h1>Quản trị</h1>
      <div className="nav" role="tablist">
        {(
          [
            ['contents', 'Nội dung'],
            ['users', 'Tài khoản'],
            ['tokens', 'API token'],
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
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
      setError(err instanceof Error ? err.message : 'Không tải được')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

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

      setNotice(`Đã tạo ${content.code}. Chuyển sang “Sẵn sàng” để KOL nhận được.`)
      setForm({ code: '', title: '', caption: '', contentType: 'video' })
      if (fileRef.current) fileRef.current.value = ''
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tạo thất bại')
    } finally {
      setCreating(false)
    }
  }

  async function setStatus(id: string, status: ContentStatus) {
    try {
      await api.admin.updateContent(id, { status })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cập nhật thất bại')
    }
  }

  async function remove(id: string, code: string) {
    if (!confirm(`Xoá "${code}"? Toàn bộ file và link đã lưu sẽ mất.`)) return
    try {
      await api.admin.deleteContent(id)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Xoá thất bại')
    }
  }

  if (loading) return <Spinner />

  return (
    <div className="stack">
      {error && <Alert>{error}</Alert>}
      {notice && <Alert kind="ok">{notice}</Alert>}

      <form className="card stack" onSubmit={create}>
        <h2>Thêm nội dung</h2>
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
            <label className="label" htmlFor="title">Tiêu đề</label>
            <input
              id="title"
              className="input"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div className="field" style={{ flex: '0 1 150px' }}>
            <label className="label" htmlFor="ctype">Loại</label>
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
          <label className="label" htmlFor="files">Video / ảnh</label>
          <input id="files" ref={fileRef} className="input" type="file" multiple accept="video/*,image/*" />
          <span className="hint">Chọn nhiều ảnh cho carousel — thứ tự theo lúc chọn.</span>
        </div>

        <button className="btn btn-primary" disabled={creating}>
          {creating ? 'Đang tạo…' : 'Tạo nội dung'}
        </button>
      </form>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Tiêu đề</th>
              <th>Trạng thái</th>
              <th>Tạo lúc</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id}>
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
                        Sẵn sàng
                      </button>
                    )}
                    {c.status === 'READY' && (
                      <button className="btn btn-sm" onClick={() => setStatus(c.id, 'DRAFT')}>
                        Về nháp
                      </button>
                    )}
                    <button className="btn btn-sm btn-danger" onClick={() => remove(c.id, c.code)}>
                      Xoá
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="hint" style={{ textAlign: 'center', padding: 28 }}>
                  Chưa có nội dung nào.
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
      setError(err instanceof Error ? err.message : 'Không tải được')
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
      setNotice(`Đã tạo tài khoản "${form.username}".`)
      setForm({ username: '', password: '', email: '', displayName: '', role: 'kol' })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tạo thất bại')
    } finally {
      setBusy(false)
    }
  }

  async function toggleActive(u: User) {
    try {
      await api.admin.updateUser(u.id, { active: !u.active })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cập nhật thất bại')
    }
  }

  if (loading) return <Spinner />

  return (
    <div className="stack">
      {error && <Alert>{error}</Alert>}
      {notice && <Alert kind="ok">{notice}</Alert>}

      <form className="card stack" onSubmit={create}>
        <h2>Thêm tài khoản</h2>
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
            <span className="hint">Chữ thường, không dấu @</span>
          </div>
          <div className="field" style={{ flex: '1 1 150px' }}>
            <label className="label" htmlFor="u-pass">Mật khẩu *</label>
            <input
              id="u-pass"
              className="input"
              type="text"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="tối thiểu 8 ký tự"
              required
            />
          </div>
          <div className="field" style={{ flex: '1 1 180px' }}>
            <label className="label" htmlFor="u-email">Email (tuỳ chọn)</label>
            <input
              id="u-email"
              className="input"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="field" style={{ flex: '0 1 130px' }}>
            <label className="label" htmlFor="u-role">Vai trò</label>
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
          {busy ? 'Đang tạo…' : 'Tạo tài khoản'}
        </button>
      </form>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Username</th>
              <th>Tên</th>
              <th>Email</th>
              <th>Vai trò</th>
              <th>Trạng thái</th>
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
                    {u.active ? 'Hoạt động' : 'Đã khoá'}
                  </span>
                </td>
                <td>
                  <button className="btn btn-sm" onClick={() => toggleActive(u)}>
                    {u.active ? 'Khoá' : 'Mở'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
      setError(err instanceof Error ? err.message : 'Không tải được')
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
      setError(err instanceof Error ? err.message : 'Tạo token thất bại')
    }
  }

  async function remove(id: string) {
    if (!confirm('Thu hồi token này?')) return
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
            <strong>Token chỉ hiện một lần — lưu lại ngay:</strong>
            <code className="code" style={{ wordBreak: 'break-all', display: 'block', padding: 8 }}>{fresh}</code>
          </div>
        </Alert>
      )}

      <form className="card stack" onSubmit={create}>
        <h2>Tạo API token</h2>
        <p className="hint">Dùng cho pipeline AI đẩy content vào hệ thống.</p>
        <div className="row-tight">
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ai-pipeline"
            required
          />
          <button className="btn btn-primary">Tạo</button>
        </div>
      </form>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Tên</th>
              <th>Tạo lúc</th>
              <th>Dùng lần cuối</th>
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
                    Thu hồi
                  </button>
                </td>
              </tr>
            ))}
            {tokens.length === 0 && (
              <tr>
                <td colSpan={4} className="hint" style={{ textAlign: 'center', padding: 28 }}>
                  Chưa có token nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
