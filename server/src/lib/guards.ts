import type { FastifyReply, FastifyRequest } from 'fastify'
import { SESSION_COOKIE, findUserById, readSession, resolveApiToken } from './auth.js'
import type { User } from '../db/schema.js'

declare module 'fastify' {
  interface FastifyRequest {
    /** Set when the caller is a logged-in human. */
    user?: User
    /** Set when the caller is an API token (the AI pipeline). */
    tokenRole?: 'admin' | 'kol'
  }
}

/**
 * Resolves the caller from either a session cookie or a bearer API token.
 * Never rejects on its own — the requireX guards decide what is allowed.
 */
export async function attachIdentity(req: FastifyRequest) {
  const auth = req.headers.authorization
  if (auth?.startsWith('Bearer ')) {
    const token = resolveApiToken(auth.slice(7).trim())
    if (token) {
      req.tokenRole = token.role
      return
    }
  }

  const cookie = req.cookies?.[SESSION_COOKIE]
  if (cookie) {
    const userId = await readSession(cookie)
    if (userId) {
      const user = findUserById(userId)
      if (user?.active) req.user = user
    }
  }
}

export async function requireUser(req: FastifyRequest, reply: FastifyReply) {
  if (!req.user) {
    reply.code(401).send({ error: 'Not signed in' })
    return reply
  }
}

export async function requireAdmin(req: FastifyRequest, reply: FastifyReply) {
  // An admin API token counts as admin; a KOL session does not.
  if (req.tokenRole === 'admin') return
  if (req.user?.role === 'admin') return
  reply.code(req.user || req.tokenRole ? 403 : 401).send({ error: 'Admin access required' })
  return reply
}

/** Ingestion endpoints accept an API token or an admin session. */
export async function requireIngest(req: FastifyRequest, reply: FastifyReply) {
  if (req.tokenRole) return
  if (req.user?.role === 'admin') return
  reply.code(401).send({ error: 'A valid API token is required' })
  return reply
}
