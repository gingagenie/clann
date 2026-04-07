import { initializeApp, getApps } from 'firebase/app'
import { getMessaging } from 'firebase/messaging'

const firebaseConfig = {
  apiKey:            'AIzaSyChZ1INj8Q12gwlJ1WL1N3Z6rRdsxPwM8k',
  authDomain:        'clann-4daf4.firebaseapp.com',
  projectId:         'clann-4daf4',
  storageBucket:     'clann-4daf4.firebasestorage.app',
  messagingSenderId: '840524894126',
  appId:             '1:840524894126:web:5325a0fc136aabe777823f',
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]

// Don't use isSupported() — it checks window.Notification which TWA doesn't expose,
// causing it to return false even though push works fine via the service worker.
// Instead, check only for the APIs we actually need.
export const messagingPromise: Promise<ReturnType<typeof getMessaging> | null> =
  Promise.resolve().then(() => {
    if (typeof window === 'undefined') return null
    if (!('serviceWorker' in navigator)) return null
    if (!('PushManager' in window)) return null
    try { return getMessaging(app) }
    catch (e) { console.warn('[firebase] getMessaging failed:', e); return null }
  })
