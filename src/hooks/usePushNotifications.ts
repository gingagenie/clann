import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useHousehold } from '@/contexts/HouseholdContext'

const VAPID_PUBLIC_KEY = 'BIsEMxwPNvcY6lZrJG7rgrVgOXk_aQzv5R5TGpzoyUgI35CofGnFQp06aidaAQc4hfNjzKt4EJrBTjfwHtcX9t4'
const REMINDED_PFX     = 'clann_reminded_'

function urlBase64ToUint8Array(base64: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr.buffer
}

// Safe wrappers — TWA on Android may not expose window.Notification even when
// PushManager is available, so we guard all access to avoid ReferenceErrors.
function getNotificationPermission(): NotificationPermission | null {
  try { return typeof Notification !== 'undefined' ? Notification.permission : null }
  catch { return null }
}

async function requestNotificationPermission(): Promise<NotificationPermission> {
  try {
    if (typeof Notification === 'undefined') return 'denied'
    return await Notification.requestPermission()
  } catch { return 'denied' }
}

export function usePushNotifications() {
  const { user }      = useAuth()
  const { household } = useHousehold()
  const [enabled,          setEnabled]          = useState(false)
  const [loading,          setLoading]          = useState(false)
  const [supported,        setSupported]        = useState(false)
  const [permissionDenied, setPermissionDenied] = useState(false)

  useEffect(() => {
    // Don't gate on 'Notification' in window — TWA may omit it while still
    // supporting PushManager (service worker handles the actual display).
    const ok = typeof window !== 'undefined'
      && 'serviceWorker' in navigator
      && 'PushManager' in window
    setSupported(ok)
    if (ok) void checkStatus()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  async function checkStatus() {
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      setEnabled(!!sub)
      if (getNotificationPermission() === 'denied') setPermissionDenied(true)
    } catch { /* browser restriction */ }
  }

  // ── Foreground fallback: fire at 5pm if app is open ────────────
  useEffect(() => {
    if (!enabled) return

    async function checkTime() {
      const now = new Date()
      const key = REMINDED_PFX + now.toDateString()
      if (localStorage.getItem(key)) return
      if (now.getHours() === 17 && now.getMinutes() < 5) {
        localStorage.setItem(key, '1')
        const reg = await navigator.serviceWorker.ready
        await reg.showNotification('Dinner time! 🍽️', {
          body:  "What's on the menu tonight?",
          icon:  '/icons/icon-192.png',
          badge: '/icons/icon-192.png',
          data:  { url: '/meals' },
        })
      }
    }

    void checkTime()
    const id = setInterval(() => void checkTime(), 60_000)
    return () => clearInterval(id)
  }, [enabled])

  // ── Toggle ──────────────────────────────────────────────────────

  const toggle = useCallback(async () => {
    if (!user || !household || !VAPID_PUBLIC_KEY) {
      console.warn('[usePushNotifications] missing VAPID key or user/household')
      return
    }
    setLoading(true)
    try {
      if (enabled) {
        const reg = await navigator.serviceWorker.ready
        const sub = await reg.pushManager.getSubscription()
        if (sub) {
          await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
          await sub.unsubscribe()
        }
        setEnabled(false)
      } else {
        const permission = await requestNotificationPermission()
        if (permission === 'denied') { setPermissionDenied(true); return }
        if (permission !== 'granted') return

        setPermissionDenied(false)
        const reg = await navigator.serviceWorker.ready
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        })
        const json = sub.toJSON()
        await supabase.from('push_subscriptions').upsert({
          household_id: household.id,
          user_id:      user.id,
          endpoint:     sub.endpoint,
          p256dh:       json.keys!.p256dh,
          auth:         json.keys!.auth,
        }, { onConflict: 'user_id,endpoint' })
        setEnabled(true)
      }
    } catch (e) {
      console.error('[usePushNotifications] toggle error:', e)
    } finally {
      setLoading(false)
    }
  }, [enabled, user, household])

  // ── Test via SW waitUntil ───────────────────────────────────────

  const scheduleTest = useCallback(async (minutes = 1) => {
    if (getNotificationPermission() !== 'granted') {
      const perm = await requestNotificationPermission()
      if (perm !== 'granted') return
    }
    const reg = await navigator.serviceWorker.ready
    reg.active?.postMessage({ type: 'SCHEDULE_TEST', delayMs: minutes * 60_000 })
  }, [])

  return { enabled, loading, supported, permissionDenied, toggle, scheduleTest }
}
