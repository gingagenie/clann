import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useHousehold } from '@/contexts/HouseholdContext'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

function urlBase64ToUint8Array(base64: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr.buffer
}

export function usePushNotifications() {
  const { user }      = useAuth()
  const { household } = useHousehold()
  const [enabled,   setEnabled]   = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [supported, setSupported] = useState(false)

  useEffect(() => {
    const ok = typeof window !== 'undefined'
      && 'serviceWorker' in navigator
      && 'PushManager' in window
      && 'Notification' in window
    setSupported(ok)
    if (ok) checkStatus()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  async function checkStatus() {
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      setEnabled(!!sub)
    } catch { /* browser restriction */ }
  }

  const toggle = useCallback(async () => {
    if (!user || !household || !VAPID_PUBLIC_KEY) return
    setLoading(true)
    try {
      if (enabled) {
        // Unsubscribe
        const reg = await navigator.serviceWorker.ready
        const sub = await reg.pushManager.getSubscription()
        if (sub) {
          await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
          await sub.unsubscribe()
        }
        setEnabled(false)
      } else {
        // Request permission
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') return

        // Subscribe
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

  return { enabled, loading, supported, toggle }
}
