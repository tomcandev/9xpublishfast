import { randomUUID } from 'node:crypto'
import type { FastifyInstance } from 'fastify'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../db/index.js'
import { pushSubscriptions, reminderSettings } from '../db/schema.js'
import { requireUser } from '../lib/guards.js'
import { getVapidPublicKey, sendPushNotification } from '../lib/push.js'

const settingsSchema = z.object({
  enabled: z.boolean(),
  reminderTimes: z.array(z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/)),
  timezone: z.string().optional(),
})

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
})

const unsubscribeSchema = z.object({
  endpoint: z.string().url(),
})

export async function notificationRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireUser)

  /** Get the public VAPID key to subscribe to pushManager in browser */
  app.get('/api/notifications/vapid-key', async () => {
    return { publicKey: getVapidPublicKey() }
  })

  /** Get user's reminder settings & push subscription count */
  app.get('/api/notifications/settings', async (req) => {
    const user = req.user!

    let setting = db
      .select()
      .from(reminderSettings)
      .where(eq(reminderSettings.userId, user.id))
      .get()

    if (!setting) {
      // Create default settings row
      const defaultSetting = {
        userId: user.id,
        enabled: true,
        reminderTimes: '09:00,12:30,20:00',
        timezone: 'Asia/Ho_Chi_Minh',
        lastNotifiedDate: null,
      }
      db.insert(reminderSettings).values(defaultSetting).run()
      setting = defaultSetting as any
    }

    const subscriptions = db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, user.id))
      .all()

    return {
      enabled: Boolean(setting!.enabled),
      reminderTimes: setting!.reminderTimes
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      timezone: setting!.timezone,
      hasSubscription: subscriptions.length > 0,
      subscriptionCount: subscriptions.length,
    }
  })

  /** Update user's reminder settings */
  app.post('/api/notifications/settings', async (req, reply) => {
    const user = req.user!
    const parsed = settingsSchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message || 'Invalid settings' })
    }

    const { enabled, reminderTimes, timezone } = parsed.data
    const timesStr = reminderTimes.join(',')

    const existing = db
      .select()
      .from(reminderSettings)
      .where(eq(reminderSettings.userId, user.id))
      .get()

    if (existing) {
      db.update(reminderSettings)
        .set({
          enabled,
          reminderTimes: timesStr,
          timezone: timezone || existing.timezone,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(reminderSettings.userId, user.id))
        .run()
    } else {
      db.insert(reminderSettings)
        .values({
          userId: user.id,
          enabled,
          reminderTimes: timesStr,
          timezone: timezone || 'Asia/Ho_Chi_Minh',
        })
        .run()
    }

    return { ok: true, enabled, reminderTimes, timezone: timezone || 'Asia/Ho_Chi_Minh' }
  })

  /** Register a browser push subscription for this user */
  app.post('/api/notifications/subscribe', async (req, reply) => {
    const user = req.user!
    const parsed = subscribeSchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message || 'Invalid subscription payload' })
    }

    const { endpoint, keys } = parsed.data

    // Check if endpoint already registered
    const existing = db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, endpoint))
      .get()

    if (existing) {
      db.update(pushSubscriptions)
        .set({
          userId: user.id,
          p256dh: keys.p256dh,
          auth: keys.auth,
        })
        .where(eq(pushSubscriptions.id, existing.id))
        .run()
    } else {
      db.insert(pushSubscriptions)
        .values({
          id: randomUUID(),
          userId: user.id,
          endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
        })
        .run()
    }

    return { ok: true }
  })

  /** Remove a push subscription */
  app.post('/api/notifications/unsubscribe', async (req, reply) => {
    const parsed = unsubscribeSchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid payload' })
    }

    db.delete(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, parsed.data.endpoint))
      .run()

    return { ok: true }
  })

  /** Trigger an instant test notification to check device reception */
  app.post('/api/notifications/test', async (req, reply) => {
    const user = req.user!

    const subs = db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, user.id))
      .all()

    if (subs.length === 0) {
      return reply.code(400).send({
        error: 'No active device subscription found. Please enable notifications on this device first!',
      })
    }

    let successCount = 0
    for (const sub of subs) {
      const result = await sendPushNotification(sub, {
        title: '🔔 PublishFast: Test Notification',
        body: 'Daily post reminders are successfully connected to your device!',
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: `test-${user.id}`,
        data: { url: '/' },
      })

      if (result.ok) {
        successCount++
      } else if (result.expired) {
        db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id)).run()
      }
    }

    if (successCount === 0) {
      return reply.code(500).send({ error: 'Failed to send notification to device. Please re-subscribe.' })
    }

    return { ok: true, sentTo: successCount }
  })
}
