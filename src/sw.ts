/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>
}

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// Activate immediately — don't wait for existing clients to close
self.addEventListener('install',  () => self.skipWaiting())
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()))

// SPA fallback — serve index.html for all navigation requests so
// refreshing at /shopping, /meals etc. doesn't return a 404
registerRoute(new NavigationRoute(createHandlerBoundToURL('/index.html')))

// ── Server push ────────────────────────────────────────────────
// Fired by the Supabase Edge Function send-dinner-reminder at 5pm daily

self.addEventListener('push', event => {
  let title = 'Clann'
  let body  = 'You have a new notification'
  let url   = '/'

  if (event.data) {
    try {
      const raw = event.data.json() as Record<string, unknown>
      const n   = raw.notification as Record<string, unknown> | undefined
      title = (raw.title ?? n?.title ?? title) as string
      body  = (raw.body  ?? n?.body  ?? body)  as string
      url   = (raw.url   ?? url) as string
    } catch { /* non-JSON payload — use fallback text */ }
  }

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon:  '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data:  { url },
    })
  )
})

// ── Scheduled test notification ─────────────────────────────────
//
// The page posts { type: 'SCHEDULE_TEST', delayMs: number } to fire
// a test notification after delayMs milliseconds. We wrap the setTimeout
// in event.waitUntil so Chrome keeps the SW alive for the full duration
// (Chrome allows up to ~5 minutes via waitUntil).

self.addEventListener('message', (event: ExtendableMessageEvent) => {
  const data = event.data as { type: string; delayMs?: number } | null
  if (data?.type !== 'SCHEDULE_TEST' || !data.delayMs) return

  event.waitUntil(
    new Promise<void>(resolve => {
      setTimeout(() => {
        void self.registration.showNotification('Test notification 🔔', {
          body: 'Dinner reminders are working!',
          icon: '/icons/icon-192.png',
          badge: '/icons/icon-192.png',
          data: { url: '/meals' },
        }).then(resolve)
      }, data.delayMs)
    })
  )
})

// ── Notification click ──────────────────────────────────────────

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const url = (event.notification.data as { url: string })?.url ?? '/meals'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      const existing = clients.find(c => c.url.startsWith(self.location.origin))
      if (existing) {
        void existing.navigate(url)
        return existing.focus()
      }
      return self.clients.openWindow(url)
    })
  )
})
