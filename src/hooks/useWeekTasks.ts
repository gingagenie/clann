import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useHousehold } from '@/contexts/HouseholdContext'
import { DAY_NAMES, toDateString } from '@/lib/dates'
import { isSchoolHoliday } from '@/lib/schoolTerms'
import type { AustralianState } from '@/contexts/HouseholdContext'

export interface WeekTask {
  id: string
  household_id: string
  recurring_task_id: string
  due_date: string
  completed: boolean
  completed_by: string | null
  completed_at: string | null
  name: string
  assigned_to: string | null
  school_days_only: boolean
}

export function useWeekTasks(weekDays: Date[]) {
  const { household } = useHousehold()
  const [tasks, setTasks] = useState<WeekTask[]>([])
  const [loading, setLoading] = useState(false)

  const weekKey = weekDays.map(toDateString).join(',')
  const state   = household?.state as AustralianState | null | undefined

  const refresh = useCallback(async () => {
    if (!household || weekDays.length === 0) return
    setLoading(true)

    try {
      const startDate = toDateString(weekDays[0])
      const endDate   = toDateString(weekDays[weekDays.length - 1])

      // Fetch all recurring tasks for this household
      const { data: recurring, error: rErr } = await supabase
        .from('recurring_tasks')
        .select('*')
        .eq('household_id', household.id)

      if (rErr) { console.warn('[useWeekTasks] recurring error:', rErr.message); return }

      // Determine which (task, date) pairs should exist this week
      type RT = {
        id: string
        days_of_week: string[]
        repeat?: string
        one_off_date?: string | null
        day_of_month?: number | null
        school_days_only?: boolean
      }

      // Helper: should this task appear on this date?
      function shouldInclude(rt: RT, dateStr: string): boolean {
        if (rt.school_days_only && state && isSchoolHoliday(state, dateStr)) return false
        return true
      }

      const expected = (recurring ?? []).flatMap((rt: RT) => {
        const rep = rt.repeat ?? 'weekly'

        if (rep === 'one_off' && rt.one_off_date) {
          const match = weekDays.find(d => toDateString(d) === rt.one_off_date)
          if (!match || !shouldInclude(rt, rt.one_off_date!)) return []
          return [{ recurring_task_id: rt.id, due_date: rt.one_off_date!, household_id: household.id }]
        }

        if (rep === 'monthly' && rt.day_of_month) {
          const match = weekDays.find(d => d.getDate() === rt.day_of_month)
          if (!match || !shouldInclude(rt, toDateString(match))) return []
          return [{ recurring_task_id: rt.id, due_date: toDateString(match), household_id: household.id }]
        }

        // weekly (default)
        return weekDays
          .filter(day => rt.days_of_week.includes(DAY_NAMES[day.getDay()]))
          .filter(day => shouldInclude(rt, toDateString(day)))
          .map(day => ({
            recurring_task_id: rt.id,
            due_date:          toDateString(day),
            household_id:      household.id,
          }))
      })

      // Upsert — ignore existing rows
      if (expected.length > 0) {
        const { error: upsertErr } = await supabase
          .from('week_tasks')
          .upsert(expected, { onConflict: 'recurring_task_id,due_date', ignoreDuplicates: true })
          .select('id')

        if (upsertErr) console.warn('[useWeekTasks] upsert error:', upsertErr.message)
      }

      // Fetch week_tasks with joined recurring_task fields
      const { data: rows, error: wtErr } = await supabase
        .from('week_tasks')
        .select(`
          id, household_id, recurring_task_id, due_date,
          completed, completed_by, completed_at,
          recurring_tasks ( name, assigned_to, school_days_only )
        `)
        .eq('household_id', household.id)
        .gte('due_date', startDate)
        .lte('due_date', endDate)

      if (wtErr) { console.warn('[useWeekTasks] fetch error:', wtErr.message); return }

      const mapped: WeekTask[] = (rows ?? []).map((row: any) => ({
        id:               row.id,
        household_id:     row.household_id,
        recurring_task_id: row.recurring_task_id,
        due_date:         row.due_date,
        completed:        row.completed,
        completed_by:     row.completed_by,
        completed_at:     row.completed_at,
        name:             row.recurring_tasks?.name ?? '',
        assigned_to:      row.recurring_tasks?.assigned_to ?? null,
        school_days_only: row.recurring_tasks?.school_days_only ?? false,
      }))

      // Filter out school_days_only tasks on holiday dates (handles stale DB rows)
      setTasks(mapped.filter(t =>
        !t.school_days_only || !state || !isSchoolHoliday(state, t.due_date)
      ))
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [household?.id, household?.state, weekKey])

  useEffect(() => { refresh() }, [refresh])

  const toggleComplete = useCallback(async (taskId: string, currentlyCompleted: boolean) => {
    // Optimistic update
    setTasks(prev => prev.map(t =>
      t.id === taskId
        ? { ...t, completed: !currentlyCompleted, completed_at: !currentlyCompleted ? new Date().toISOString() : null }
        : t
    ))

    const patch = currentlyCompleted
      ? { completed: false, completed_by: null, completed_at: null }
      : { completed: true,  completed_at: new Date().toISOString() }

    const { data, error } = await supabase
      .from('week_tasks')
      .update(patch)
      .eq('id', taskId)
      .select('id, completed')

    if (error || !data?.length) {
      console.warn('[useWeekTasks] toggle failed:', error?.message ?? 'no rows updated')
      setTasks(prev => prev.map(t =>
        t.id === taskId ? { ...t, completed: currentlyCompleted, completed_at: null } : t
      ))
    }
  }, [])

  return { tasks, loading, refresh, toggleComplete }
}
