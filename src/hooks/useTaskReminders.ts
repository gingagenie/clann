import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useHousehold } from '@/contexts/HouseholdContext'

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

function localDateStr(date = new Date()) {
  // YYYY-MM-DD in local time
  return date.toLocaleDateString('en-CA')
}

function isDueOn(task: Record<string, unknown>, dateStr: string): boolean {
  const d = new Date(dateStr + 'T00:00:00')
  const rep = (task.repeat as string) ?? 'weekly'
  if (rep === 'one_off') return task.one_off_date === dateStr
  if (rep === 'monthly') return task.day_of_month === d.getDate()
  return ((task.days_of_week as string[]) ?? []).includes(DAY_NAMES[d.getDay()])
}

export function useTaskReminders() {
  const { user }      = useAuth()
  const { household } = useHousehold()

  useEffect(() => {
    if (!user || !household) return
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return

    let tasks: Record<string, unknown>[] = []

    async function loadTasks() {
      const { data } = await supabase
        .from('recurring_tasks')
        .select('id, name, repeat, days_of_week, day_of_month, one_off_date, reminder_time, reminder_advance')
        .eq('household_id', household!.id)
        .eq('reminder_enabled', true)
      tasks = (data ?? []) as Record<string, unknown>[]
    }

    async function checkReminders() {
      if (!tasks.length) return

      const now         = new Date()
      const today       = localDateStr(now)
      const tomorrow    = localDateStr(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1))
      const currentMins = now.getHours() * 60 + now.getMinutes()

      for (const task of tasks) {
        if (!task.reminder_time) continue

        const [rh, rm]  = (task.reminder_time as string).split(':').map(Number)
        const taskMins  = rh * 60 + rm

        // Fire within ±1 minute of the reminder time to handle interval drift
        if (Math.abs(taskMins - currentMins) > 1) continue

        const advance   = (task.reminder_advance as string) ?? 'same_day'
        const checkDate = advance === 'night_before' ? tomorrow : today

        if (!isDueOn(task, checkDate)) continue

        // One reminder per task per day
        const key = `clann_task_rem_${task.id as string}_${today}`
        if (localStorage.getItem(key)) continue
        localStorage.setItem(key, '1')

        try {
          const reg = await navigator.serviceWorker.ready
          const isNightBefore = advance === 'night_before'
          await reg.showNotification(
            isNightBefore ? `⏰ Tomorrow: ${task.name as string}` : '⏰ Task reminder',
            {
              body:  isNightBefore ? 'Coming up tomorrow — just a heads up' : task.name as string,
              icon:  '/icons/icon-192.png',
              badge: '/icons/icon-192.png',
              data:  { url: '/tasks' },
            },
          )
        } catch {
          // If notification fails (e.g. permission revoked), clear the key so it retries next minute
          localStorage.removeItem(`clann_task_rem_${task.id as string}_${today}`)
        }
      }
    }

    void loadTasks()
    void checkReminders()
    const id = setInterval(() => void checkReminders(), 60_000)
    return () => clearInterval(id)
  }, [user?.id, household?.id])
}
