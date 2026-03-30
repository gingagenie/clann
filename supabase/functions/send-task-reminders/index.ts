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
  const dateStr = `${parts.year}-${parts.month}-${parts.day}`  // YYYY-MM-DD
  const hour    = parseInt(parts.hour,   10)
  const minute  = parseInt(parts.minute, 10)
  return { dateStr, hour, minute }
}

// Add days to a YYYY-MM-DD string (UTC-safe)
function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

// Check if a recurring task is due on a given date string
function isDueOn(task: any, dateStr: string): boolean {
  const d = new Date(dateStr + 'T00:00:00Z')
  const rep = task.repeat ?? 'weekly'
  if (rep === 'one_off')  return task.one_off_date === dateStr
  if (rep === 'monthly')  return task.day_of_month === d.getUTCDate()
  // weekly
  return (task.days_of_week ?? []).includes(DAY_NAMES[d.getUTCDay()])
}

// Check if current time is within ±16 minutes of the task's reminder_time
function isReminderWindow(task: any, hour: number, minute: number): boolean {
  if (!task.reminder_time) return false
  const [rh, rm] = (task.reminder_time as string).split(':').map(Number)
  const taskMins    = rh * 60 + rm
  const currentMins = hour * 60 + minute
  return Math.abs(taskMins - currentMins) <= 16
}

Deno.serve(async () => {
  const vapidPublicKey  = Deno.env.get('VAPID_PUBLIC_KEY')
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')
  const vapidEmail      = Deno.env.get('VAPID_EMAIL') ?? 'mailto:hello@clann.app'

  if (!vapidPublicKey || !vapidPrivateKey) {
    return new Response(JSON.stringify({ error: 'VAPID keys not configured' }), { status: 200 })
  }

  webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey)

  const { dateStr: today, hour, minute } = getMelbourneNow()
  const tomorrow = addDays(today, 1)

  // All tasks with reminders enabled that haven't fired today
  const { data: tasks, error: taskErr } = await supabase
    .from('recurring_tasks')
    .select('id, household_id, name, repeat, days_of_week, day_of_month, one_off_date, reminder_time, reminder_advance, reminder_last_sent')
    .eq('reminder_enabled', true)

  if (taskErr || !tasks?.length) {
    return new Response(JSON.stringify({ sent: 0, reason: taskErr?.message ?? 'no tasks' }), { status: 200 })
  }

  // Filter to tasks whose reminder window is now and haven't fired today
  const due = tasks.filter((task: any) => {
    if (task.reminder_last_sent === today) return false       // already sent today
    if (!isReminderWindow(task, hour, minute)) return false  // not the right time

    const advance = task.reminder_advance ?? 'same_day'
    const checkDate = advance === 'night_before' ? tomorrow : today
    return isDueOn(task, checkDate)
  })

  if (!due.length) {
    return new Response(JSON.stringify({ sent: 0, reason: 'no reminders due now' }), { status: 200 })
  }

  // Get all push subscriptions for the affected households
  const householdIds = [...new Set(due.map((t: any) => t.household_id as string))]
  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth, household_id')
    .in('household_id', householdIds)

  if (!subscriptions?.length) {
    return new Response(JSON.stringify({ sent: 0, reason: 'no push subscriptions' }), { status: 200 })
  }

  // Group subscriptions by household
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

    const advance = task.reminder_advance ?? 'same_day'
    const isNightBefore = advance === 'night_before'

    const payload = JSON.stringify({
      title: isNightBefore ? `⏰ Tomorrow: ${task.name}` : `⏰ Task reminder`,
      body:  isNightBefore ? 'Coming up tomorrow — just a heads up' : task.name,
      url:   '/tasks',
    })

    const results = await Promise.allSettled(
      subs.map((sub: any) =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        )
      )
    )

    const taskSent = results.filter(r => r.status === 'fulfilled').length
    sent   += taskSent
    failed += results.length - taskSent

    // Mark reminder as sent for today
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
