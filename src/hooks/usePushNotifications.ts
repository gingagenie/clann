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
  const [lastError,        setLastError]        = useState<string | null>(null)
  const [swStatus,         setSwStatus]         = useState<'unknown' | 'active' | 'inactive'>('unknown')

  useEffect(() => {
    const isNative = typeof window !== 'undefined' && (!!(window as any).__isNativeApp || !!(window as any).ReactNativeWebView)
    const ok = isNative || (
      typeof window !== 'undefined'
      && 'serviceWorker' in navigator
      && 'PushManager' in window
    )
    setSupported(ok)
    if (user?.id) void checkStatus()
    if (!isNative && ok) {
      navigator.serviceWorker.ready.then(reg => {
        setSwStatus(reg.active ? 'active' : 'inactive')
      }).catch(() => setSwStatus('inactive'))
    }
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
    setLastError(null)
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
        setPermissionDenied(false)

        // ── Native app shell (React Native WebView) ──────────────
        // The shell handles push registration natively via expo-notifications.
        // We post a message and wait for the token to come back via CustomEvent.
        const isNative = !!(window as any).__isNativeApp || !!(window as any).ReactNativeWebView
        if (isNative) {
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Timed out — no response from native layer')), 15000)
            window.addEventListener('nativePushRegistered', async (e: any) => {
              clearTimeout(timeout)
              try {
                const token = e.detail?.token
                if (!token) throw new Error('No token in event')
                const { error } = await supabase.from('push_subscriptions').upsert({
                  household_id: household.id,
                  user_id:      user.id,
                  endpoint:     token,
                  p256dh:       'fcm',
                  auth:         'fcm',
                }, { onConflict: 'user_id,endpoint' })
                if (error) throw new Error(error.message)
                resolve()
              } catch (err: any) {
                reject(err)
              }
            }, { once: true })
            window.addEventListener('nativePushError', (e: any) => { clearTimeout(timeout); reject(new Error('Native error: ' + (e.detail ?? 'unknown'))) }, { once: true })
            ;(window as any).ReactNativeWebView?.postMessage(JSON.stringify({
              type: 'REGISTER_PUSH',
              userId: user.id,
              householdId: household.id,
            }))
          })
          setEnabled(true)
          return
        }

        // ── Web / TWA path (Firebase web SDK) ────────────────────
        const permission = await requestNotificationPermission()
        if (permission === 'denied') { setPermissionDenied(true); return }
        if (permission !== 'granted') return

        if (typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
          try {
            Object.defineProperty(window.Notification, 'permission', {
              get: () => 'granted' as NotificationPermission,
              configurable: true,
            })
          } catch (e) {
            console.warn('[TWA] could not patch Notification.permission:', e)
          }
        }

        const messaging = await messagingPromise
        if (!messaging) {
          const msg = 'Firebase Messaging not supported — serviceWorker=' +
            ('serviceWorker' in navigator) + ' PushManager=' + ('PushManager' in window)
          setLastError(msg)
          throw new Error(msg)
        }

        let reg: ServiceWorkerRegistration
        try {
          reg = await navigator.serviceWorker.ready
        } catch (e: any) {
          const msg = 'serviceWorker.ready failed: ' + (e?.message ?? String(e))
          setLastError(msg)
          throw new Error(msg)
        }

        let token: string
        try {
          token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: reg })
        } catch (e: any) {
          const msg = 'getToken failed: ' + (e?.message ?? String(e)) + (e?.code ? ' [' + e.code + ']' : '')
          setLastError(msg)
          throw new Error(msg)
        }

        if (!token) {
          const msg = 'getToken returned empty string'
          setLastError(msg)
          throw new Error(msg)
        }

        const { error: upsertError } = await supabase.from('push_subscriptions').upsert({
          household_id: household.id,
          user_id:      user.id,
          endpoint:     token,
          p256dh:       'fcm',
          auth:         'fcm',
        }, { onConflict: 'user_id,endpoint' })

        if (upsertError) {
          const msg = 'DB upsert failed: ' + upsertError.message
          setLastError(msg)
          throw new Error(msg)
        }

        setEnabled(true)
      }
    } catch (e: any) {
      console.error('[usePushNotifications] toggle error:', e)
      if (!lastError) setLastError(e?.message ?? String(e))
    } finally {
      setLoading(false)
    }
  }, [enabled, user, household])

  // ── Test via SW ─────────────────────────────────────────────────

  const scheduleTest = useCallback(async (minutes = 1) => {
    const perm = getNotificationPermission()
    if (perm !== 'granted') {
      const requested = await requestNotificationPermission()
      if (requested !== 'granted') return
    }
    const reg = await navigator.serviceWorker.ready
    if (!reg.active) {
      console.warn('[scheduleTest] SW not active — cannot post message')
      return
    }
    reg.active.postMessage({ type: 'SCHEDULE_TEST', delayMs: minutes * 60_000 })
  }, [])

  return { enabled, loading, supported, permissionDenied, lastError, swStatus, toggle, scheduleTest }
}
