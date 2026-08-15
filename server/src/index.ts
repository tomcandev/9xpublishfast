import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import cookie from '@fastify/cookie'
import multipart from '@fastify/multipart'
import fastifyStatic from '@fastify/static'
import Fastify from 'fastify'
import { migrate } from './db/migrate.js'
import { config, repoRoot } from './lib/config.js'
import { attachIdentity } from './lib/guards.js'
import { adminRoutes } from './routes/admin.js'
import { assetRoutes } from './routes/assets.js'
import { authRoutes } from './routes/auth.js'
import { contentRoutes } from './routes/contents.js'
import { ingestRoutes } from './routes/ingest.js'
import { notificationRoutes } from './routes/notifications.js'
import { publicationRoutes } from './routes/publications.js'
import { startReminderScheduler, stopReminderScheduler } from './lib/reminderScheduler.js'

const app = Fastify({
  logger: { level: config.isProd ? 'info' : 'warn' },
  bodyLimit: 2 * 1024 * 1024,
  trustProxy: true, // behind the Cloudflare Tunnel
})

await app.register(cookie)
await app.register(multipart, {
  limits: { fileSize: config.maxUploadBytes, files: 20 },
})

app.addHook('preHandler', attachIdentity)

await app.register(authRoutes)
await app.register(contentRoutes)
await app.register(publicationRoutes)
await app.register(assetRoutes)
await app.register(ingestRoutes)
await app.register(adminRoutes)
await app.register(notificationRoutes)

startReminderScheduler()

app.get('/api/health', async () => ({ ok: true }))

// Serve the built SPA when it exists (production); in dev, Vite serves it.
const webDist = join(repoRoot, 'web', 'dist')
if (existsSync(webDist)) {
  // index must be enabled, otherwise a request for "/" is treated as a
  // directory listing and rejected with 403 before the SPA can load.
  await app.register(fastifyStatic, { root: webDist, index: ['index.html'] })

  app.setNotFoundHandler((req, reply) => {
    // API 404s stay JSON; everything else falls through to the SPA router.
    if (req.url.startsWith('/api/')) {
      return reply.code(404).send({ error: 'Not found' })
    }
    return reply.sendFile('index.html')
  })
} else {
  app.setNotFoundHandler((req, reply) => reply.code(404).send({ error: 'Not found' }))
}

migrate()

await app.listen({ port: config.port, host: config.host })
console.log(`PublishFast API on http://${config.host}:${config.port}`)

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, async () => {
    stopReminderScheduler()
    await app.close()
    process.exit(0)
  })
}
