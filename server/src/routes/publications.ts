import { randomUUID } from 'node:crypto'
import type { FastifyInstance } from 'fastify'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../db/index.js'
import { PLATFORMS, contents, publications } from '../db/schema.js'
import { requireUser } from '../lib/guards.js'

const upsertSchema = z.object({
  contentId: z.string().min(1),
  platform: z.enum(PLATFORMS),
  publishedUrl: z.string().url('Link không hợp lệ'),
  publishedAt: z.string().datetime().optional(),
})

export async function publicationRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireUser)

  /**
   * Record "I posted this content to this platform, here is the link".
   * Re-submitting the same (content, platform) updates the existing row rather
   * than creating a duplicate.
   */
  app.post('/api/publications', async (req, reply) => {
    const parsed = upsertSchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ' })
    }
    const { contentId, platform, publishedUrl, publishedAt } = parsed.data
    const user = req.user!

    // A KOL may only log links against an item they currently hold.
    const owned = db
      .select()
      .from(contents)
      .where(
        and(
          eq(contents.id, contentId),
          ...(user.role === 'admin' ? [] : [eq(contents.claimedBy, user.id)]),
        ),
      )
      .get()

    if (!owned) return reply.code(403).send({ error: 'Bạn chưa nhận bài này' })

    const existing = db
      .select()
      .from(publications)
      .where(and(eq(publications.contentId, contentId), eq(publications.platform, platform)))
      .get()

    const values = {
      publishedUrl,
      publishedAt: publishedAt ?? new Date().toISOString(),
      status: 'PUBLISHED' as const,
      userId: user.role === 'admin' ? (owned.claimedBy ?? user.id) : user.id,
    }

    if (existing) {
      db.update(publications).set(values).where(eq(publications.id, existing.id)).run()
      return { publication: db.select().from(publications).where(eq(publications.id, existing.id)).get() }
    }

    const id = randomUUID()
    db.insert(publications).values({ id, contentId, platform, ...values }).run()
    return { publication: db.select().from(publications).where(eq(publications.id, id)).get() }
  })

  app.delete('/api/publications/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const user = req.user!

    const row = db.select().from(publications).where(eq(publications.id, id)).get()
    if (!row) return reply.code(404).send({ error: 'Không tìm thấy' })
    if (user.role !== 'admin' && row.userId !== user.id) {
      return reply.code(403).send({ error: 'Không có quyền' })
    }

    db.delete(publications).where(eq(publications.id, id)).run()
    return { ok: true }
  })
}
