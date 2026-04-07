import { createClient } from 'jsr:@supabase/supabase-js@2'
// @ts-ignore — npm: specifier, no types needed
import webpush from 'npm:web-push'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

async function getFirebaseAccessToken(clientEmail: string, privateKey: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000)

  const toB64url = (obj: object) =>
    btoa(JSON.stringify(obj)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')

  const header64  = toB64url({ alg: 'RS256', typ: 'JWT' })
  const payload64 = toB64url({
    iss:   clientEmail,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud:   'https://oauth2.googleapis.com/token',
    exp:   now + 3600,
    iat:   now,
  })

  const toSign   = `${header64}.${payload64}`
  const pemBody  = privateKey.replace(/-----[^-]+-----/g, '').replace(/\s/g, '')
  const keyBytes = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0))

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8', keyBytes,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false, ['sign'],
  )

  const sigBytes = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5', cryptoKey,
    new TextEncoder().encode(toSign),
  )
  const sig = btoa(String.fromCharCode(...new Uint8Array(sigBytes)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')

  const jwt = `${toSign}.${sig}`

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  })
  const json = await res.json()
  return json.access_token as string
}

async function sendFcm(
  token: string, title: string, body: string, url: string,
  projectId: string, accessToken: string,
): Promise<{ ok: boolean; status: number }> {
  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        message: {
          token,
          data:    { title, body, url },
          webpush: {
            headers:      { Urgency: 'high' },
            notification: { title, body, icon: 'https://clann.onrender.com/icons/icon-192.png' },
          },
        },
      }),
    },
  )
  return { ok: res.ok, status: res.status }
}

Deno.serve(async () => {
  const vapidPublicKey  = Deno.env.get('VAPID_PUBLIC_KEY')
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')
  const vapidEmail      = Deno.env.get('VAPID_EMAIL') ?? 'mailto:hello@clann.app'

  const firebaseProjectId   = Deno.env.get('FIREBASE_PROJECT_ID')
  const firebaseClientEmail = Deno.env.get('FIREBASE_CLIENT_EMAIL')
  const firebasePrivateKey  = Deno.env.get('FIREBASE_PRIVATE_KEY')?.replace(/\\n/g, '\n')

  if (vapidPublicKey && vapidPrivateKey) {
    webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey)
  }

  let firebaseAccessToken: string | null = null
  if (firebaseProjectId && firebaseClientEmail && firebasePrivateKey) {
    try {
      firebaseAccessToken = await getFirebaseAccessToken(firebaseClientEmail, firebasePrivateKey)
    } catch (e) {
      console.error('[firebase] failed to get access token:', e)
    }
  }

  // Today's date in Melbourne time
  const now  = new Date()
  const fmt  = new Intl.DateTimeFormat('en-AU', { timeZone: 'Australia/Melbourne', year: 'numeric', month: '2-digit', day: '2-digit' })
  const parts = Object.fromEntries(fmt.formatToParts(now).map(p => [p.type, p.value]))
  const today = `${parts.year}-${parts.month}-${parts.day}`

  const { data: subscriptions, error: subErr } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth, household_id')

  if (subErr || !subscriptions?.length) {
    return new Response(JSON.stringify({ sent: 0, reason: subErr?.message ?? 'no subscriptions' }), { status: 200 })
  }

  const householdIds = [...new Set(subscriptions.map((s: any) => s.household_id as string))]
  const { data: meals } = await supabase
    .from('meal_plans')
    .select('household_id, title')
    .in('household_id', householdIds)
    .eq('date', today)

  const mealMap = new Map(
    (meals ?? []).map((m: any) => [m.household_id, m.title as string])
  )

  let sent = 0
  let failed = 0

  for (const sub of subscriptions) {
    const endpoint = (sub as any).endpoint as string
    const isFcm    = (sub as any).p256dh === 'fcm'
    const meal     = mealMap.get((sub as any).household_id)
    const title    = meal ? `🍽️ Tonight: ${meal}` : "🍽️ What's for dinner?"
    const body     = meal ? "Tap to see this week's meal plan" : 'Nothing planned yet — tap to add a meal'
    const url      = '/meals'

    try {
      if (isFcm) {
        if (!firebaseAccessToken || !firebaseProjectId) {
          console.warn('[firebase] credentials not set, skipping FCM token')
          failed++
          continue
        }
        const result = await sendFcm(endpoint, title, body, url, firebaseProjectId, firebaseAccessToken)
        if (result.ok) {
          sent++
        } else {
          console.error('[firebase] send failed:', result.status, endpoint.slice(0, 30))
          failed++
          if (result.status === 404 || result.status === 410) {
            await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint)
          }
        }
      } else {
        // Legacy web-push subscription
        if (!vapidPublicKey || !vapidPrivateKey) {
          console.warn('[webpush] VAPID keys not set, skipping')
          failed++
          continue
        }
        await webpush.sendNotification(
          { endpoint, keys: { p256dh: (sub as any).p256dh, auth: (sub as any).auth } },
          JSON.stringify({ title, body, url }),
        )
        sent++
      }
    } catch (e: any) {
      console.error('[send] push failed:', e?.statusCode ?? e?.message)
      failed++
      // Remove on HTTP 404/410 (expired token) or local validation errors (bad key data)
      if (e?.statusCode === 410 || e?.statusCode === 404 || !e?.statusCode) {
        await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint)
        console.log('[send] Removed bad subscription:', endpoint.slice(0, 30))
      }
    }
  }

  return new Response(JSON.stringify({ sent, failed, date: today }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
