import { createClient } from 'jsr:@supabase/supabase-js@2'

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
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  })
  const toSign   = `${header64}.${payload64}`
  const pemBody  = privateKey.replace(/-----[^-]+-----/g, '').replace(/\s/g, '')
  const keyBytes = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0))
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8', keyBytes,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false, ['sign'],
  )
  const sigBytes = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, new TextEncoder().encode(toSign))
  const sig = btoa(String.fromCharCode(...new Uint8Array(sigBytes)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  const jwt = `${toSign}.${sig}`
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  })
  const json = await res.json()
  if (!json.access_token) throw new Error('No access_token: ' + JSON.stringify(json))
  return json.access_token as string
}

Deno.serve(async () => {
  const projectId   = Deno.env.get('FIREBASE_PROJECT_ID')
  const clientEmail = Deno.env.get('FIREBASE_CLIENT_EMAIL')
  const privateKey  = Deno.env.get('FIREBASE_PRIVATE_KEY')?.replace(/\\n/g, '\n')

  if (!projectId || !clientEmail || !privateKey) {
    return new Response(JSON.stringify({
      error: 'Missing Firebase secrets',
      projectId: !!projectId,
      clientEmail: !!clientEmail,
      privateKey: !!privateKey,
    }), { status: 400, headers: { 'Content-Type': 'application/json' } })
  }

  // Get all FCM subscriptions
  const { data: subs, error } = await supabase
    .from('push_subscriptions')
    .select('endpoint, user_id')
    .eq('p256dh', 'fcm')

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  if (!subs?.length) {
    return new Response(JSON.stringify({ error: 'No FCM subscriptions found' }), { status: 404 })
  }

  let accessToken: string
  try {
    accessToken = await getFirebaseAccessToken(clientEmail, privateKey)
  } catch (e: any) {
    return new Response(JSON.stringify({ error: 'JWT/token error: ' + e.message }), { status: 500 })
  }

  const results = []
  for (const sub of subs) {
    const res = await fetch(
      `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: {
            token: sub.endpoint,
            data: { title: 'Test notification', body: 'Firebase is working!', url: '/tasks' },
            webpush: { headers: { Urgency: 'high' } },
          },
        }),
      }
    )
    const body = await res.text()
    results.push({ user_id: sub.user_id, status: res.status, body })
  }

  return new Response(JSON.stringify({ results }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
