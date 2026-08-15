import { randomUUID } from 'node:crypto'
import { createWriteStream } from 'node:fs'
import { unlink } from 'node:fs/promises'
import { extname, join } from 'node:path'
import { pipeline } from 'node:stream/promises'
import type { FastifyInstance } from 'fastify'
import { asc, eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../db/index.js'
import { CONTENT_TYPES, assets, contents } from '../db/schema.js'
import { config } from '../lib/config.js'
import { requireIngest } from '../lib/guards.js'

const createSchema = z.object({
  code: z.string().min(1).max(120),
  title: z.string().max(300).optional(),
  caption: z.string().optional(),
  contentType: z.enum(CONTENT_TYPES).default('video'),
  status: z.enum(['DRAFT', 'READY']).default('DRAFT'),
  assignedUserId: z.string().optional(),
})

export async function ingestRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireIngest)

  /** Create a content item. Used by the AI generator. */
  app.post('/api/ingest/contents', async (req, reply) => {
    const parsed = createSchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ' })
    }

    const existing = db.select().from(contents).where(eq(contents.code, parsed.data.code)).get()
    if (existing) return reply.code(409).send({ error: `Code "${parsed.data.code}" đã tồn tại` })

    const id = randomUUID()
    db.insert(contents)
      .values({ id, ...parsed.data, assignedUserId: parsed.data.assignedUserId ?? null })
      .run()

    return reply.code(201).send({ content: db.select().from(contents).where(eq(contents.id, id)).get() })
  })

  app.patch('/api/ingest/contents/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const parsed = createSchema.partial().safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Dữ liệu không hợp lệ' })

    const existing = db.select().from(contents).where(eq(contents.id, id)).get()
    if (!existing) return reply.code(404).send({ error: 'Không tìm thấy' })

    db.update(contents).set(parsed.data).where(eq(contents.id, id)).run()
    return { content: db.select().from(contents).where(eq(contents.id, id)).get() }
  })

  /**
   * Attach media. Accepts one or more files in a multipart request; each is
   * streamed straight to disk so a large video never sits in memory.
   */
  app.post('/api/ingest/contents/:id/assets', async (req, reply) => {
    const { id } = req.params as { id: string }
    const content = db.select().from(contents).where(eq(contents.id, id)).get()
    if (!content) return reply.code(404).send({ error: 'Không tìm thấy bài này' })

    if (!req.isMultipart()) {
      return reply.code(400).send({ error: 'Cần gửi dạng multipart/form-data' })
    }

    const nextOrder =
      (db
        .select({ n: sql<number>`coalesce(max(${assets.sortOrder}), -1)` })
        .from(assets)
        .where(eq(assets.contentId, id))
        .get()?.n ?? -1) + 1

    const created: string[] = []
    const writtenPaths: string[] = []
    let index = 0

    try {
      for await (const part of req.files()) {
        const ext = extname(part.filename || '').slice(0, 12) || ''
        const stored = `${randomUUID()}${ext}`
        const abs = join(config.uploadsDir, stored)

        await pipeline(part.file, createWriteStream(abs))
        if (part.file.truncated) {
          throw Object.assign(new Error('File vượt quá dung lượng cho phép'), { statusCode: 413 })
        }
        writtenPaths.push(abs)

        const mime = part.mimetype || 'application/octet-stream'
        const assetId = randomUUID()
        db.insert(assets)
          .values({
            id: assetId,
            contentId: id,
            filePath: stored,
            originalName: part.filename || stored,
            mime,
            size: (await import('node:fs')).statSync(abs).size,
            sortOrder: nextOrder + index,
            type: mime.startsWith('video/') ? 'video' : 'image',
          })
          .run()
        created.push(assetId)
        index++
      }
    } catch (err) {
      // Don't leave orphaned files behind if the upload fails partway.
      await Promise.all(writtenPaths.map((p) => unlink(p).catch(() => {})))
      const status = (err as { statusCode?: number }).statusCode ?? 400
      return reply.code(status).send({ error: (err as Error).message })
    }

    if (created.length === 0) return reply.code(400).send({ error: 'Không có file nào được gửi lên' })

    return reply.code(201).send({
      assets: db
        .select()
        .from(assets)
        .where(eq(assets.contentId, id))
        .orderBy(asc(assets.sortOrder))
        .all()
        .map(({ filePath: _hidden, ...rest }) => rest),
    })
  })
}
