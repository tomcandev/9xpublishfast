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

import { inferHookId } from '../lib/metrics.js'

const createSchema = z.object({
  code: z.string().min(1).max(120),
  title: z.string().max(300).optional(),
  caption: z.string().optional(),
  contentType: z.enum(CONTENT_TYPES).default('video'),
  status: z.enum(['DRAFT', 'READY']).default('DRAFT'),
  assignedUserId: z.string().optional(),
  hookId: z.string().optional(),
})

export async function ingestRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireIngest)

  /** Create a content item. Used by the AI generator. */
  app.post('/api/ingest/contents', async (req, reply) => {
    const parsed = createSchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? 'Invalid input' })
    }

    const existing = db.select().from(contents).where(eq(contents.code, parsed.data.code)).get()
    if (existing) return reply.code(409).send({ error: `Code "${parsed.data.code}" already exists` })

    const id = randomUUID()
    const hookId = parsed.data.hookId || inferHookId(parsed.data.title, parsed.data.caption)

    db.insert(contents)
      .values({
        id,
        ...parsed.data,
        hookId,
        assignedUserId: parsed.data.assignedUserId ?? null,
      })
      .run()

    return reply.code(201).send({ content: db.select().from(contents).where(eq(contents.id, id)).get() })
  })

  app.patch('/api/ingest/contents/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const parsed = createSchema.partial().safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid input' })

    const existing = db.select().from(contents).where(eq(contents.id, id)).get()
    if (!existing) return reply.code(404).send({ error: 'Not found' })

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
    if (!content) return reply.code(404).send({ error: 'Post not found' })

    if (!req.isMultipart()) {
      return reply.code(400).send({ error: 'Content-Type must be multipart/form-data' })
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
          throw Object.assign(new Error('File size exceeds allowed limit'), { statusCode: 413 })
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

    if (created.length === 0) return reply.code(400).send({ error: 'No files were uploaded' })

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

  /** Ingest X notes into secondbrain inbox (called by local Mac scraper) */
  app.post('/api/ingest/x-inbox', async (req, reply) => {
    const xSchema = z.object({
      notes: z.array(
        z.object({
          filename: z.string().min(1),
          content: z.string().min(1),
        })
      ),
    })

    const parsed = xSchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid payload' })
    }

    const targetDir = join(config.dataDir, '..', '..', 'tomcandev', 'secondbrain', 'raw_data', '_inbox', 'x')
    const fs = await import('node:fs/promises')
    await fs.mkdir(targetDir, { recursive: true })

    let saved = 0
    for (const note of parsed.data.notes) {
      const sanitizedName = note.filename.replace(/[^a-zA-Z0-9._-]/g, '')
      if (!sanitizedName) continue
      const targetPath = join(targetDir, sanitizedName)
      await fs.writeFile(targetPath, note.content, 'utf-8')
      saved++
    }

    return reply.send({ success: true, savedCount: saved })
  })
}
