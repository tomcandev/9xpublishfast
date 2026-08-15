export type Role = 'admin' | 'kol'
export type ContentStatus = 'DRAFT' | 'READY' | 'CLAIMED' | 'PUBLISHED' | 'FAILED'
export type Platform = 'tiktok' | 'instagram' | 'youtube_shorts' | 'facebook' | 'other'

export interface User {
  id: string
  username: string
  email: string | null
  displayName: string
  role: Role
  active: boolean
  createdAt: string
}

export interface Asset {
  id: string
  contentId: string
  originalName: string
  mime: string
  size: number
  sortOrder: number
  type: 'video' | 'image'
}

export interface Publication {
  id: string
  contentId: string
  userId: string
  platform: Platform
  status: string
  publishedUrl: string | null
  publishedAt: string | null
}

export interface Content {
  id: string
  code: string
  title: string | null
  caption: string | null
  contentType: 'video' | 'carousel'
  status: ContentStatus
  assignedUserId: string | null
  claimedBy: string | null
  claimedAt: string | null
  createdAt: string
  assets: Asset[]
  publications: Publication[]
}

export interface Stats {
  available: number
  claimed: number
  published: number
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly reason?: string,
  ) {
    super(message)
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: 'same-origin',
    headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
    ...init,
  })

  if (res.status === 204) return undefined as T

  const text = await res.text()
  const data = text ? JSON.parse(text) : {}

  if (!res.ok) {
    throw new ApiError(data.error ?? `Error ${res.status}`, res.status, data.reason)
  }
  return data as T
}

export const PLATFORM_LABELS: Record<Platform, string> = {
  tiktok: 'TikTok',
  instagram: 'Instagram',
  youtube_shorts: 'YouTube Shorts',
  facebook: 'Facebook',
  other: 'Other',
}

export const STATUS_LABELS: Record<ContentStatus, string> = {
  DRAFT: 'Draft',
  READY: 'Ready',
  CLAIMED: 'In Progress',
  PUBLISHED: 'Published',
  FAILED: 'Failed',
}

export const api = {
  login: (identifier: string, password: string) =>
    request<{ user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    }),

  logout: () => request<{ ok: true }>('/api/auth/logout', { method: 'POST' }),

  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ ok: true }>('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  me: () => request<{ user: User }>('/api/me'),

  stats: () => request<Stats>('/api/contents/stats'),

  contents: (status?: ContentStatus) =>
    request<{ contents: Content[] }>(`/api/contents${status ? `?status=${status}` : ''}`),

  content: (id: string) => request<{ content: Content }>(`/api/contents/${id}`),

  claimNext: () => request<{ content: Content }>('/api/contents/claim-next', { method: 'POST' }),

  claim: (id: string) => request<{ content: Content }>(`/api/contents/${id}/claim`, { method: 'POST' }),

  release: (id: string) => request<{ ok: true }>(`/api/contents/${id}/release`, { method: 'POST' }),

  complete: (id: string) =>
    request<{ content: Content }>(`/api/contents/${id}/complete`, { method: 'POST' }),

  history: () => request<{ contents: Content[] }>('/api/history'),

  savePublication: (input: { contentId: string; platform: Platform; publishedUrl: string }) =>
    request<{ publication: Publication }>('/api/publications', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  deletePublication: (id: string) =>
    request<{ ok: true }>(`/api/publications/${id}`, { method: 'DELETE' }),

  admin: {
    users: () => request<{ users: User[] }>('/api/admin/users'),
    createUser: (input: {
      username: string
      password: string
      email?: string
      displayName?: string
      role: Role
    }) => request<{ user: User }>('/api/admin/users', { method: 'POST', body: JSON.stringify(input) }),
    updateUser: (id: string, patch: Partial<{ active: boolean; role: Role; password: string; displayName: string }>) =>
      request<{ user: User }>(`/api/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),

    contents: () => request<{ contents: Omit<Content, 'assets' | 'publications'>[] }>('/api/admin/contents'),
    updateContent: (id: string, patch: Partial<{ status: ContentStatus; title: string; caption: string }>) =>
      request<{ content: Content }>(`/api/admin/contents/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      }),
    deleteContent: (id: string) => request<{ ok: true }>(`/api/admin/contents/${id}`, { method: 'DELETE' }),
    releaseStale: (hours: number) =>
      request<{ released: number }>('/api/admin/release-stale', {
        method: 'POST',
        body: JSON.stringify({ hours }),
      }),

    tokens: () =>
      request<{ tokens: { id: string; name: string; role: Role; createdAt: string; lastUsedAt: string | null }[] }>(
        '/api/admin/tokens',
      ),
    createToken: (name: string) =>
      request<{ token: string }>('/api/admin/tokens', { method: 'POST', body: JSON.stringify({ name }) }),
    deleteToken: (id: string) => request<{ ok: true }>(`/api/admin/tokens/${id}`, { method: 'DELETE' }),

    createContent: (input: { code: string; title?: string; caption?: string; contentType: 'video' | 'carousel'; status: 'DRAFT' | 'READY' }) =>
      request<{ content: Content }>('/api/ingest/contents', {
        method: 'POST',
        body: JSON.stringify(input),
      }),

    uploadAssets: async (contentId: string, files: FileList | File[]) => {
      const form = new FormData()
      Array.from(files).forEach((file, i) => form.append(`file${i}`, file))
      const res = await fetch(`/api/ingest/contents/${contentId}/assets`, {
        method: 'POST',
        credentials: 'same-origin',
        body: form,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new ApiError(data.error ?? 'Upload failed', res.status)
      return data as { assets: Asset[] }
    },
  },
}

export const assetUrl = (id: string) => `/api/assets/${id}`
export const assetDownloadUrl = (id: string) => `/api/assets/${id}/download`
export const zipUrl = (contentId: string) => `/api/contents/${contentId}/assets.zip`
