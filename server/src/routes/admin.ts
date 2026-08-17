import { unlink } from 'node:fs/promises'
import { join } from 'node:path'
import type { FastifyInstance } from 'fastify'
import { desc, eq, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../db/index.js'
import { ROLES, apiTokens, assets, contents, publications, users } from '../db/schema.js'
import { createApiToken, createUser, hashPassword, publicUser } from '../lib/auth.js'
import { releaseStaleClaims } from '../lib/claim.js'
import { config } from '../lib/config.js'
import { requireAdmin } from '../lib/guards.js'

const userSchema = z.object({
  username: z.string().min(2).max(31),
  email: z.string().email().optional().or(z.literal('')),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  displayName: z.string().max(120).optional(),
  role: z.enum(ROLES).default('kol'),
})

export async function adminRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAdmin)

  /* ---------- users ---------- */

  app.get('/api/admin/users', async () => ({
    users: db.select().from(users).orderBy(desc(users.createdAt)).all().map(publicUser),
  }))

  app.post('/api/admin/users', async (req, reply) => {
    const parsed = userSchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? 'Invalid input' })
    }
    try {
      const user = await createUser({ ...parsed.data, email: parsed.data.email || null })
      return reply.code(201).send({ user: publicUser(user) })
    } catch (err) {
      const message = (err as Error).message
      const conflict = message.includes('UNIQUE')
        ? 'Username or email already exists'
        : message
      return reply.code(400).send({ error: conflict })
    }
  })

  app.patch('/api/admin/users/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const body = z
      .object({
        displayName: z.string().max(120).optional(),
        role: z.enum(ROLES).optional(),
        active: z.boolean().optional(),
        password: z.string().min(8).optional(),
      })
      .safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid input' })

    const existing = db.select().from(users).where(eq(users.id, id)).get()
    if (!existing) return reply.code(404).send({ error: 'Not found' })

    const { password, ...rest } = body.data
    const patch: Record<string, unknown> = { ...rest }
    if (password) patch.passwordHash = await hashPassword(password)

    db.update(users).set(patch).where(eq(users.id, id)).run()
    return { user: publicUser(db.select().from(users).where(eq(users.id, id)).get()!) }
  })

  /* ---------- contents ---------- */

  app.get('/api/admin/contents', async () => ({
    contents: db.select().from(contents).orderBy(desc(contents.createdAt)).limit(500).all(),
  }))

  app.patch('/api/admin/contents/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const body = z
      .object({
        title: z.string().max(300).optional(),
        caption: z.string().optional(),
        status: z.enum(['DRAFT', 'READY', 'CLAIMED', 'PUBLISHED', 'FAILED']).optional(),
        assignedUserId: z.string().nullable().optional(),
      })
      .safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid input' })

    const existing = db.select().from(contents).where(eq(contents.id, id)).get()
    if (!existing) return reply.code(404).send({ error: 'Not found' })

    db.update(contents).set(body.data).where(eq(contents.id, id)).run()
    return { content: db.select().from(contents).where(eq(contents.id, id)).get() }
  })

  app.delete('/api/admin/contents/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const assetRows = db
      .select({ filePath: assets.filePath })
      .from(assets)
      .where(eq(assets.contentId, id))
      .all()
    for (const a of assetRows) {
      if (a.filePath) {
        unlink(join(config.uploadsDir, a.filePath)).catch(() => {})
      }
    }
    const result = db.delete(contents).where(eq(contents.id, id)).run()
    if (result.changes === 0) return reply.code(404).send({ error: 'Not found' })
    return { ok: true }
  })

  const bulkDeleteSchema = z.object({
    ids: z.array(z.string().min(1)).min(1, 'At least one content ID required'),
  })

  app.post('/api/admin/contents/bulk-delete', async (req, reply) => {
    const parsed = bulkDeleteSchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? 'Invalid input' })
    }
    const { ids } = parsed.data
    const assetRows = db
      .select({ filePath: assets.filePath })
      .from(assets)
      .where(inArray(assets.contentId, ids))
      .all()
    for (const a of assetRows) {
      if (a.filePath) {
        unlink(join(config.uploadsDir, a.filePath)).catch(() => {})
      }
    }
    const result = db.delete(contents).where(inArray(contents.id, ids)).run()
    return { deleted: result.changes }
  })

  const bulkStatusSchema = z.object({
    ids: z.array(z.string().min(1)).min(1, 'At least one content ID required'),
    status: z.enum(['DRAFT', 'READY', 'CLAIMED', 'PUBLISHED', 'FAILED']),
  })

  app.post('/api/admin/contents/bulk-status', async (req, reply) => {
    const parsed = bulkStatusSchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? 'Invalid input' })
    }
    const { ids, status } = parsed.data
    const result = db.update(contents).set({ status }).where(inArray(contents.id, ids)).run()
    return { updated: result.changes }
  })

  app.delete('/api/admin/assets/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const asset = db.select().from(assets).where(eq(assets.id, id)).get()
    if (asset?.filePath) {
      unlink(join(config.uploadsDir, asset.filePath)).catch(() => {})
    }
    const result = db.delete(assets).where(eq(assets.id, id)).run()
    if (result.changes === 0) return reply.code(404).send({ error: 'Not found' })
    return { ok: true }
  })

  /** Return items stuck in CLAIMED back to the queue. */
  app.post('/api/admin/release-stale', async (req) => {
    const { hours } = (req.body ?? {}) as { hours?: number }
    return { released: releaseStaleClaims(hours && hours > 0 ? hours : 24) }
  })

  /* ---------- API tokens for the AI pipeline ---------- */

  app.get('/api/admin/tokens', async () => ({
    tokens: db
      .select({
        id: apiTokens.id,
        name: apiTokens.name,
        role: apiTokens.role,
        createdAt: apiTokens.createdAt,
        lastUsedAt: apiTokens.lastUsedAt,
      })
      .from(apiTokens)
      .orderBy(desc(apiTokens.createdAt))
      .all(),
  }))

  app.post('/api/admin/tokens', async (req, reply) => {
    const body = z
      .object({ name: z.string().min(1).max(120), role: z.enum(ROLES).default('admin') })
      .safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'Token name is required' })

    const token = createApiToken(body.data.name, body.data.role)
    // Shown once — only the hash is stored.
    return reply.code(201).send({ token })
  })

  app.delete('/api/admin/tokens/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const result = db.delete(apiTokens).where(eq(apiTokens.id, id)).run()
    if (result.changes === 0) return reply.code(404).send({ error: 'Not found' })
    return { ok: true }
  })

  app.get('/api/admin/publications', async () => ({
    publications: db.select().from(publications).orderBy(desc(publications.createdAt)).limit(500).all(),
  }))
}
