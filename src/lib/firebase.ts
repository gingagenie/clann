import { initializeApp, getApps } from 'firebase/app'
import { getMessaging, isSupported } from 'firebase/messaging'

const firebaseConfig = {
  apiKey:            'AIzaSyChZ1INj8Q12gwlJ1WL1N3Z6rRdsxPwM8k',
  authDomain:        'clann-4daf4.firebaseapp.com',
  projectId:         'clann-4daf4',
  storageBucket:     'clann-4daf4.firebasestorage.app',
  messagingSenderId: '840524894126',
  appId:             '1:840524894126:web:5325a0fc136aabe777823f',
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]

// isSupported() is async — resolves false in environments without push support
export const messagingPromise: Promise<ReturnType<typeof getMessaging> | null> =
  isSupported().then(ok => (ok ? getMessaging(app) : null)).catch(() => null)
