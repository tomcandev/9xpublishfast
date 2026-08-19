import { api } from './api'

/**
 * Converts a base64 string to a Uint8Array for applicationServerKey.
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function isPushSupported(): boolean {
  if (typeof window === 'undefined') return false
  const hasSW = 'serviceWorker' in navigator
  const hasNotification = 'Notification' in window
  const hasPush =
    'PushManager' in window ||
    (typeof ServiceWorkerRegistration !== 'undefined' && 'pushManager' in ServiceWorkerRegistration.prototype)
  return Boolean(hasSW && hasNotification && hasPush)
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
    return reg
  } catch (err) {
    console.warn('Service worker registration failed:', err)
    return null
  }
}

export async function subscribeToPush(): Promise<{ ok: boolean; error?: string }> {
  if (!isPushSupported()) {
    return { ok: false, error: 'Your browser does not support Web Push Notifications.' }
  }

  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      return { ok: false, error: 'Notification permission was denied. Please allow notifications in browser settings.' }
    }

    const reg = await registerServiceWorker()
    if (!reg) {
      return { ok: false, error: 'Could not register Service Worker.' }
    }

    // Wait for active service worker
    await navigator.serviceWorker.ready

    const { publicKey } = await api.vapidKey()
    const appServerKey = urlBase64ToUint8Array(publicKey)

    const existingSub = await reg.pushManager.getSubscription()
    if (existingSub) {
      // Unsubscribe existing if needed or re-send to server
      const keyObj = existingSub.toJSON()
      if (keyObj.keys?.p256dh && keyObj.keys?.auth) {
        await api.subscribePush({
          endpoint: existingSub.endpoint,
          keys: {
            p256dh: keyObj.keys.p256dh,
            auth: keyObj.keys.auth,
          },
        })
        return { ok: true }
      }
    }

    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: appServerKey as any,
    })

    const subJson = subscription.toJSON()
    if (!subJson.keys?.p256dh || !subJson.keys?.auth) {
      return { ok: false, error: 'Could not retrieve device security keys.' }
    }

    await api.subscribePush({
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subJson.keys.p256dh,
        auth: subJson.keys.auth,
      },
    })

    return { ok: true }
  } catch (err: any) {
    console.error('Push subscribe error:', err)
    return { ok: false, error: err.message || 'Failed to subscribe to notifications.' }
  }
}

export async function unsubscribeFromPush(): Promise<{ ok: boolean }> {
  if (!isPushSupported()) return { ok: true }

  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (sub) {
      await api.unsubscribePush({ endpoint: sub.endpoint })
      await sub.unsubscribe()
    }
    return { ok: true }
  } catch {
    return { ok: false }
  }
}
