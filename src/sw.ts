/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>
}

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// SPA fallback — serve index.html for all navigation requests so
// refreshing at /shopping, /meals etc. doesn't return a 404
registerRoute(new NavigationRoute(createHandlerBoundToURL('/index.html')))

// ── Local scheduled notifications ──────────────────────────────
//
// The app posts { type: 'SCHEDULE_REMINDER', testMinutes?: number }
// when the user enables dinner reminders. We try the Notification
// Triggers API (Chrome Android 80+) first — it persists across SW
// restarts. We fall back to setTimeout for desktop Chrome / other
// browsers, and re-schedule for the next day after firing.

interface ScheduleMessage {
  type: 'SCHEDULE_REMINDER'
  testMinutes?: number   // set to schedule a test notification N minutes from now
}

const NOTIF_TITLE = 'Dinner time! 🍽️'
const NOTIF_OPTS: NotificationOptions = {
  body: "What's on the menu tonight?",
  icon: '/icons/icon-192.png',
  badge: '/icons/icon-192.png',
  data: { url: '/meals' },
}

function nextTargetMs(testMinutes?: number): number {
  if (testMinutes != null) return Date.now() + testMinutes * 60 * 1000
  // Next 5pm in local time
  const d = new Date()
  d.setHours(17, 0, 0, 0)
  if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1)
  return d.getTime()
}

function scheduleLocal(targetMs: number) {
  const delay = Math.max(0, targetMs - Date.now())

  setTimeout(() => {
    void self.registration.showNotification(NOTIF_TITLE, NOTIF_OPTS)
    // Re-schedule for the next day so daily reminders keep firing
    // as long as the SW stays alive (desktop Chrome / Firefox)
    const next = new Date()
    next.setHours(17, 0, 0, 0)
    next.setDate(next.getDate() + 1)
    scheduleLocal(next.getTime())
  }, delay)
}

self.addEventListener('message', (event: ExtendableMessageEvent) => {
  const data = event.data as ScheduleMessage | null
  if (data?.type !== 'SCHEDULE_REMINDER') return

  const targetMs = nextTargetMs(data.testMinutes)

  // Notification Triggers API — Chrome Android 80+
  // Survives SW termination; the OS fires it regardless.
  if ('TimestampTrigger' in (globalThis as Record<string, unknown>)) {
    const opts = {
      ...NOTIF_OPTS,
      showTrigger: new (globalThis as Record<string, unknown> & { TimestampTrigger: new (t: number) => unknown }).TimestampTrigger(targetMs),
    }
    event.waitUntil(
      self.registration.showNotification(NOTIF_TITLE, opts as NotificationOptions)
    )
    return
  }

  // setTimeout fallback — works on desktop Chrome; may not survive
  // SW kill on mobile but re-registers each time the app opens.
  scheduleLocal(targetMs)
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
