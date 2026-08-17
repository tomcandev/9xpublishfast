import type { FastifyInstance } from 'fastify'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../db/index.js'
import { users } from '../db/schema.js'
import {
  SESSION_COOKIE,
  findUserById,
  findUserByIdentifier,
  hashPassword,
  publicUser,
  readSession,
  signSession,
  verifyPassword,
} from '../lib/auth.js'
import { config } from '../lib/config.js'
import { requireUser } from '../lib/guards.js'

const loginSchema = z.object({
  // Accepts a username ("yoga") or an email — see findUserByIdentifier.
  identifier: z.string().min(1, 'Username or email is required'),
  password: z.string().min(1, 'Password is required'),
})

const switchSchema = z.object({
  sessionToken: z.string().min(1, 'Session token is required'),
})

export async function authRoutes(app: FastifyInstance) {
  app.post('/api/auth/login', async (req, reply) => {
    const parsed = loginSchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? 'Invalid input' })
    }

    const user = findUserByIdentifier(parsed.data.identifier)
    // Same message whether the account is missing or the password is wrong, so
    // the response can't be used to enumerate accounts.
    const invalid = { error: 'Invalid username or password' }
    if (!user || !user.active) return reply.code(401).send(invalid)

    const ok = await verifyPassword(user.passwordHash, parsed.data.password)
    if (!ok) return reply.code(401).send(invalid)

    const token = await signSession(user.id)
    reply.setCookie(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: config.isProd,
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    })
    return { user: publicUser(user), sessionToken: token }
  })

  app.post('/api/auth/switch', async (req, reply) => {
    const parsed = switchSchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? 'Invalid input' })
    }

    const userId = await readSession(parsed.data.sessionToken)
    if (!userId) {
      return reply.code(401).send({ error: 'Session expired or invalid' })
    }

    const user = findUserById(userId)
    if (!user || !user.active) {
      return reply.code(401).send({ error: 'User not found or inactive' })
    }

    const freshToken = await signSession(user.id)
    reply.setCookie(SESSION_COOKIE, freshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: config.isProd,
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    })
    return { user: publicUser(user), sessionToken: freshToken }
  })

  app.post('/api/auth/logout', async (_req, reply) => {
    reply.clearCookie(SESSION_COOKIE, { path: '/' })
    return { ok: true }
  })

  const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(6, 'New password must be at least 6 characters'),
  })

  app.post('/api/auth/change-password', { preHandler: requireUser }, async (req, reply) => {
    const parsed = changePasswordSchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? 'Invalid input' })
    }
    const user = findUserById(req.user!.id)
    if (!user) return reply.code(404).send({ error: 'User not found' })

    const ok = await verifyPassword(user.passwordHash, parsed.data.currentPassword)
    if (!ok) return reply.code(400).send({ error: 'Current password is incorrect' })

    const newHash = await hashPassword(parsed.data.newPassword)
    db.update(users).set({ passwordHash: newHash }).where(eq(users.id, user.id)).run()
    return { ok: true }
  })

  app.get('/api/me', { preHandler: requireUser }, async (req) => ({
    user: publicUser(req.user!),
  }))
}
