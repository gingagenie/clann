/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>
}

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// ── Push notifications ──────────────────────────────────────────

interface PushPayload {
  title: string
  body: string
  url?: string
}

self.addEventListener('push', event => {
  if (!event.data) return
  const data = event.data.json() as PushPayload

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: data.url ?? '/meals' },
    })
  )
})

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
