import fs from 'node:fs'
import path from 'node:path'
import webpush from 'web-push'
import { config } from './config.js'

interface VapidKeys {
  publicKey: string
  privateKey: string
  contactEmail: string
}

let vapidKeys: VapidKeys | null = null

function initVapidKeys(): VapidKeys {
  if (vapidKeys) return vapidKeys

    const vapidFilePath = path.join(config.dataDir, 'vapid.json')

  // 1. Check environment variables
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    vapidKeys = {
      publicKey: process.env.VAPID_PUBLIC_KEY,
      privateKey: process.env.VAPID_PRIVATE_KEY,
      contactEmail: process.env.VAPID_EMAIL || 'mailto:admin@publishfast.local',
    }
  } else if (fs.existsSync(vapidFilePath)) {
    // 2. Load from persisted file
    try {
      const data = JSON.parse(fs.readFileSync(vapidFilePath, 'utf-8'))
      vapidKeys = data
    } catch {
      // ignore
    }
  }

  // 3. Generate fresh keypair if not found
  if (!vapidKeys) {
    const generated = webpush.generateVAPIDKeys()
    vapidKeys = {
      publicKey: generated.publicKey,
      privateKey: generated.privateKey,
      contactEmail: 'mailto:admin@publishfast.local',
    }
    try {
      fs.mkdirSync(config.dataDir, { recursive: true })
      fs.writeFileSync(vapidFilePath, JSON.stringify(vapidKeys, null, 2), 'utf-8')
    } catch (err) {
      console.warn('Could not persist vapid.json:', err)
    }
  }

  webpush.setVapidDetails(
    vapidKeys.contactEmail,
    vapidKeys.publicKey,
    vapidKeys.privateKey,
  )

  return vapidKeys
}

export function getVapidPublicKey(): string {
  const keys = initVapidKeys()
  return keys.publicKey
}

export interface PushPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  tag?: string
  data?: {
    url?: string
    [key: string]: unknown
  }
}

export async function sendPushNotification(
  subscription: {
    endpoint: string
    p256dh: string
    auth: string
  },
  payload: PushPayload,
): Promise<{ ok: boolean; status?: number; expired?: boolean }> {
  initVapidKeys()

  const pushSubscription = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dh,
      auth: subscription.auth,
    },
  }

  try {
    const res = await webpush.sendNotification(
      pushSubscription,
      JSON.stringify(payload),
      { TTL: 86400 },
    )
    return { ok: true, status: res.statusCode }
  } catch (err: any) {
    const status = err.statusCode || 500
    // 404 or 410 means subscription expired/unregistered
    const expired = status === 404 || status === 410
    return { ok: false, status, expired }
  }
}
