import { useCallback, useEffect, useState } from 'react'
import { getToken, deleteToken } from 'firebase/messaging'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useHousehold } from '@/contexts/HouseholdContext'
import { messagingPromise } from '@/lib/firebase'

// Firebase Web Push certificate public key (from Firebase Console → Cloud Messaging)
const VAPID_KEY = 'BBW6345OeVTtJc4EqD5c5PBi8vbhzUUg_L-G4ofq2eKGfIOzij_ewKcPau7OeRMU_X0qEIz026iCKFB8vLsJSSs'

const REMINDED_PFX = 'clann_reminded_'

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
    const ok = typeof window !== 'undefined'
      && 'serviceWorker' in navigator
      && 'PushManager' in window
    setSupported(ok)
    if (ok && user?.id) void checkStatus()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  async function checkStatus() {
    if (!user?.id) return
    try {
      // Check DB for any active subscription for this user
      const { data } = await supabase
        .from('push_subscriptions')
        .select('endpoint')
        .eq('user_id', user.id)
        .limit(1)
      setEnabled((data?.length ?? 0) > 0)
      if (getNotificationPermission() === 'denied') setPermissionDenied(true)
    } catch { /* ignore */ }
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
    if (!user || !household) return
    setLoading(true)
    try {
      if (enabled) {
        // Disable — delete FCM token then remove from DB
        const messaging = await messagingPromise
        if (messaging) {
          try { await deleteToken(messaging) } catch { /* already gone */ }
        }
        await supabase.from('push_subscriptions').delete().eq('user_id', user.id)
        setEnabled(false)
      } else {
        // Enable — request permission, get Firebase FCM token, save to DB
        const permission = await requestNotificationPermission()
        if (permission === 'denied') { setPermissionDenied(true); return }
        if (permission !== 'granted') return

        setPermissionDenied(false)

        const messaging = await messagingPromise
        if (!messaging) throw new Error('Firebase Messaging not supported in this browser')

        const reg   = await navigator.serviceWorker.ready
        const token = await getToken(messaging, {
          vapidKey: VAPID_KEY,
          serviceWorkerRegistration: reg,
        })

        if (!token) throw new Error('Failed to get FCM token')

        await supabase.from('push_subscriptions').upsert({
          household_id: household.id,
          user_id:      user.id,
          endpoint:     token,   // FCM registration token stored here
          p256dh:       'fcm',   // marker — distinguishes from web-push subscriptions
          auth:         'fcm',
        }, { onConflict: 'user_id,endpoint' })

        setEnabled(true)
      }
    } catch (e) {
      console.error('[usePushNotifications] toggle error:', e)
    } finally {
      setLoading(false)
    }
  }, [enabled, user, household])

  // ── Test via SW ─────────────────────────────────────────────────

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
