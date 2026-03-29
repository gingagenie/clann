import { useCallback, useEffect, useState } from 'react'

const PREF_KEY    = 'clann_notifications_enabled'
const REMINDED_PFX = 'clann_reminded_'

async function swShowNotification(title: string, opts: NotificationOptions) {
  const reg = await navigator.serviceWorker.ready
  return reg.showNotification(title, opts)
}

const DINNER_NOTIF: NotificationOptions = {
  body:  "What's on the menu tonight?",
  icon:  '/icons/icon-192.png',
  badge: '/icons/icon-192.png',
  data:  { url: '/meals' },
}

export function usePushNotifications() {
  const [enabled,   setEnabled]   = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [supported, setSupported] = useState(false)

  useEffect(() => {
    const ok = 'Notification' in window && 'serviceWorker' in navigator
    setSupported(ok)
    if (!ok) return
    setEnabled(localStorage.getItem(PREF_KEY) === '1' && Notification.permission === 'granted')
  }, [])

  // ── Page-side 5pm reminder ──────────────────────────────────────
  // Checks every minute while the app is in the foreground.
  // Stores a per-day flag so it only fires once regardless of how
  // long the app stays open around 5pm.
  useEffect(() => {
    if (!enabled) return

    async function checkTime() {
      const now = new Date()
      const key = REMINDED_PFX + now.toDateString()
      if (localStorage.getItem(key)) return  // already fired today

      const h = now.getHours()
      const m = now.getMinutes()
      if (h === 17 && m < 5) {
        localStorage.setItem(key, '1')
        await swShowNotification('Dinner time! 🍽️', DINNER_NOTIF)
      }
    }

    void checkTime()
    const id = setInterval(() => void checkTime(), 60_000)
    return () => clearInterval(id)
  }, [enabled])

  // ── Toggle ──────────────────────────────────────────────────────

  const toggle = useCallback(async () => {
    setLoading(true)
    try {
      if (enabled) {
        localStorage.setItem(PREF_KEY, '0')
        setEnabled(false)
      } else {
        const perm = await Notification.requestPermission()
        if (perm !== 'granted') return
        localStorage.setItem(PREF_KEY, '1')
        setEnabled(true)
      }
    } catch (e) {
      console.error('[usePushNotifications]', e)
    } finally {
      setLoading(false)
    }
  }, [enabled])

  // ── Test ────────────────────────────────────────────────────────
  // Posts to the SW which keeps itself alive via event.waitUntil —
  // reliable for up to ~5 minutes even when the app is backgrounded.

  const scheduleTest = useCallback(async (minutes = 1) => {
    if (Notification.permission !== 'granted') {
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') return
    }
    const reg = await navigator.serviceWorker.ready
    reg.active?.postMessage({ type: 'SCHEDULE_TEST', delayMs: minutes * 60_000 })
  }, [])

  return { enabled, loading, supported, toggle, scheduleTest }
}
