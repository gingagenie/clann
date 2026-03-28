import { createClient } from 'jsr:@supabase/supabase-js@2'
// @ts-ignore — npm: specifier, no types needed
import webpush from 'npm:web-push'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

Deno.serve(async () => {
  const vapidPublicKey  = Deno.env.get('VAPID_PUBLIC_KEY')
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')
  const vapidEmail      = Deno.env.get('VAPID_EMAIL') ?? 'mailto:hello@clann.app'

  if (!vapidPublicKey || !vapidPrivateKey) {
    return new Response(JSON.stringify({ error: 'VAPID keys not configured' }), { status: 200 })
  }

  webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey)

  // Today's date in AEST (UTC+10)
  const now  = new Date()
  const aest = new Date(now.getTime() + 10 * 60 * 60 * 1000)
  const today = aest.toISOString().slice(0, 10)

  // All push subscriptions
  const { data: subscriptions, error: subErr } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth, household_id')

  if (subErr || !subscriptions?.length) {
    return new Response(JSON.stringify({ sent: 0, reason: subErr?.message ?? 'no subscriptions' }), { status: 200 })
  }

  // Tonight's meals for those households
  const householdIds = [...new Set(subscriptions.map((s: { household_id: string }) => s.household_id))]
  const { data: meals } = await supabase
    .from('meal_plans')
    .select('household_id, title')
    .in('household_id', householdIds)
    .eq('date', today)

  const mealMap = new Map(
    (meals ?? []).map((m: { household_id: string; title: string }) => [m.household_id, m.title])
  )

  const results = await Promise.allSettled(
    subscriptions.map(async (sub: { endpoint: string; p256dh: string; auth: string; household_id: string }) => {
      const meal = mealMap.get(sub.household_id)
      const payload = JSON.stringify({
        title: meal ? `🍽️ Tonight: ${meal}` : "🍽️ What's for dinner?",
        body:  meal ? 'Tap to see this week\'s meal plan' : 'Nothing planned yet — tap to add a meal',
        url:   '/meals',
      })
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
      )
    })
  )

  const sent = results.filter(r => r.status === 'fulfilled').length
  const failed = results.length - sent

  return new Response(JSON.stringify({ sent, failed, date: today }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
