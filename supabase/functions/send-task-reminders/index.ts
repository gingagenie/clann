import { createClient } from 'jsr:@supabase/supabase-js@2'
// @ts-ignore
import webpush from 'npm:web-push'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

// Day names matching the days_of_week column values
const DAY_NAMES = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday']

// Get current date and time in Melbourne timezone
function getMelbourneNow() {
  const now = new Date()
  const fmt = new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Melbourne',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
  const parts = Object.fromEntries(fmt.formatToParts(now).map(p => [p.type, p.value]))
  const dateStr = `${parts.year}-${parts.month}-${parts.day}`
  const hour    = parseInt(parts.hour,   10)
  const minute  = parseInt(parts.minute, 10)
  return { dateStr, hour, minute }
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function isDueOn(task: any, dateStr: string): boolean {
  const d = new Date(dateStr + 'T00:00:00Z')
  const rep = task.repeat ?? 'weekly'
  if (rep === 'one_off')  return task.one_off_date === dateStr
  if (rep === 'monthly')  return task.day_of_month === d.getUTCDate()
  return (task.days_of_week ?? []).includes(DAY_NAMES[d.getUTCDay()])
}

function isReminderWindow(task: any, hour: number, minute: number): boolean {
  if (!task.reminder_time) return false
  const [rh, rm] = (task.reminder_time as string).split(':').map(Number)
  const taskMins    = rh * 60 + rm
  const currentMins = hour * 60 + minute
  return Math.abs(taskMins - currentMins) <= 1
}

// ── Firebase FCM via HTTP v1 API ────────────────────────────────────────────

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

// ── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async () => {
  const vapidPublicKey  = Deno.env.get('VAPID_PUBLIC_KEY')
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')
  const vapidEmail      = Deno.env.get('VAPID_EMAIL') ?? 'mailto:hello@clann.app'

  const firebaseProjectId  = Deno.env.get('FIREBASE_PROJECT_ID')
  const firebaseClientEmail = Deno.env.get('FIREBASE_CLIENT_EMAIL')
  const firebasePrivateKey  = Deno.env.get('FIREBASE_PRIVATE_KEY')?.replace(/\\n/g, '\n')

  if (vapidPublicKey && vapidPrivateKey) {
    webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey)
  }

  // Get Firebase access token if credentials are available
  let firebaseAccessToken: string | null = null
  if (firebaseProjectId && firebaseClientEmail && firebasePrivateKey) {
    try {
      firebaseAccessToken = await getFirebaseAccessToken(firebaseClientEmail, firebasePrivateKey)
    } catch (e) {
      console.error('[firebase] failed to get access token:', e)
    }
  }

  const { dateStr: today, hour, minute } = getMelbourneNow()
  const tomorrow = addDays(today, 1)

  const { data: tasks, error: taskErr } = await supabase
    .from('recurring_tasks')
    .select('id, household_id, name, repeat, days_of_week, day_of_month, one_off_date, reminder_time, reminder_advance, reminder_last_sent')
    .eq('reminder_enabled', true)

  if (taskErr || !tasks?.length) {
    return new Response(JSON.stringify({ sent: 0, reason: taskErr?.message ?? 'no tasks' }), { status: 200 })
  }

  const due = tasks.filter((task: any) => {
    if (task.reminder_last_sent === today) return false
    if (!isReminderWindow(task, hour, minute)) return false
    const advance   = task.reminder_advance ?? 'same_day'
    const checkDate = advance === 'night_before' ? tomorrow : today
    return isDueOn(task, checkDate)
  })

  if (!due.length) {
    return new Response(JSON.stringify({ sent: 0, reason: 'no reminders due now' }), { status: 200 })
  }

  const householdIds = [...new Set(due.map((t: any) => t.household_id as string))]
  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth, household_id')
    .in('household_id', householdIds)

  if (!subscriptions?.length) {
    return new Response(JSON.stringify({ sent: 0, reason: 'no push subscriptions' }), { status: 200 })
  }

  const subsByHousehold = new Map<string, typeof subscriptions>()
  for (const sub of subscriptions) {
    const hid = (sub as any).household_id as string
    if (!subsByHousehold.has(hid)) subsByHousehold.set(hid, [])
    subsByHousehold.get(hid)!.push(sub)
  }

  let sent = 0
  let failed = 0

  for (const task of due) {
    const subs = subsByHousehold.get(task.household_id) ?? []
    if (!subs.length) continue

    const advance       = task.reminder_advance ?? 'same_day'
    const isNightBefore = advance === 'night_before'
    const title  = isNightBefore ? `Tomorrow: ${task.name}` : 'Task reminder'
    const body   = isNightBefore ? 'Coming up tomorrow — just a heads up' : task.name
    const url    = '/tasks'

    const webpushPayload = JSON.stringify({ title, body, url })

    for (const sub of subs) {
      const endpoint = (sub as any).endpoint as string
      const isFcm    = (sub as any).p256dh === 'fcm'

      try {
        if (isFcm) {
          // Firebase FCM token
          if (!firebaseAccessToken || !firebaseProjectId) {
            console.warn('[firebase] credentials not set, skipping FCM token')
            failed++
            continue
          }
          const result = await sendFcm(endpoint, title, body, url, firebaseProjectId, firebaseAccessToken)
          if (result.ok) {
            sent++
          } else {
            console.error('[firebase] send failed:', result.status, endpoint.slice(0, 20))
            failed++
            // Remove invalid tokens
            if (result.status === 404 || result.status === 410) {
              await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint)
            }
          }
        } else {
          // Legacy web-push subscription
          if (!vapidPublicKey || !vapidPrivateKey) {
            console.warn('[webpush] VAPID keys not set, skipping web-push subscription')
            failed++
            continue
          }
          await webpush.sendNotification(
            { endpoint, keys: { p256dh: (sub as any).p256dh, auth: (sub as any).auth } },
            webpushPayload,
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

    await supabase
      .from('recurring_tasks')
      .update({ reminder_last_sent: today })
      .eq('id', task.id)
  }

  return new Response(JSON.stringify({ sent, failed, date: today, time: `${hour}:${String(minute).padStart(2,'0')}` }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
