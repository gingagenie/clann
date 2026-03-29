import { useCallback, useEffect, useRef, useState } from 'react'

const PREF_KEY = 'clann_notifications_enabled'

async function getSWRegistration() {
  if (!('serviceWorker' in navigator)) return null
  return navigator.serviceWorker.ready
}

async function postToSW(message: object) {
  const reg = await getSWRegistration()
  reg?.active?.postMessage(message)
}

export function usePushNotifications() {
  const [enabled,   setEnabled]   = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [supported, setSupported] = useState(false)
  const scheduledRef = useRef(false)

  useEffect(() => {
    const ok = 'Notification' in window && 'serviceWorker' in navigator
    setSupported(ok)
    if (!ok) return

    const pref       = localStorage.getItem(PREF_KEY)
    const isEnabled  = pref === '1' && Notification.permission === 'granted'
    setEnabled(isEnabled)

    // Re-schedule on every app open so the SW timer stays fresh
    if (isEnabled && !scheduledRef.current) {
      scheduledRef.current = true
      void postToSW({ type: 'SCHEDULE_REMINDER' })
    }
  }, [])

  const toggle = useCallback(async () => {
    setLoading(true)
    try {
      if (enabled) {
        localStorage.setItem(PREF_KEY, '0')
        setEnabled(false)
        // Clear any pending triggered notifications
        const reg = await getSWRegistration()
        if (reg) {
          const pending = await (reg as ServiceWorkerRegistration & {
            getNotifications(opts?: { includeTriggered?: boolean }): Promise<Notification[]>
          }).getNotifications({ includeTriggered: true })
          pending.forEach(n => n.close())
        }
      } else {
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') return
        localStorage.setItem(PREF_KEY, '1')
        setEnabled(true)
        await postToSW({ type: 'SCHEDULE_REMINDER' })
      }
    } catch (e) {
      console.error('[usePushNotifications]', e)
    } finally {
      setLoading(false)
    }
  }, [enabled])

  // Exposed for testing — schedule a notification N minutes from now
  const scheduleTest = useCallback(async (minutes = 1) => {
    const permission = Notification.permission === 'granted'
      ? 'granted'
      : await Notification.requestPermission()
    if (permission !== 'granted') return
    await postToSW({ type: 'SCHEDULE_REMINDER', testMinutes: minutes })
  }, [])

  return { enabled, loading, supported, toggle, scheduleTest }
}
