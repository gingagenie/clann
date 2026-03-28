import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useHousehold } from '@/contexts/HouseholdContext'
import { toDateString } from '@/lib/dates'

export interface MealPlan {
  id: string
  household_id: string
  date: string       // YYYY-MM-DD
  title: string
  notes: string | null
  recipe_id: string | null
}

export function useMealPlans(weekDays: Date[]) {
  const { household } = useHousehold()
  const [meals, setMeals] = useState<MealPlan[]>([])
  const [loading, setLoading] = useState(false)

  const weekKey = weekDays.map(toDateString).join(',')

  const refresh = useCallback(async () => {
    if (!household || weekDays.length === 0) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('meal_plans')
        .select('*')
        .eq('household_id', household.id)
        .gte('date', toDateString(weekDays[0]))
        .lte('date', toDateString(weekDays[weekDays.length - 1]))

      if (error) { console.warn('[useMealPlans] fetch error:', error.message); return }
      setMeals((data ?? []) as MealPlan[])
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [household?.id, weekKey])

  useEffect(() => { refresh() }, [refresh])

  const saveMeal = useCallback(async (
    date: string,
    title: string,
    notes: string,
    existingId?: string,
    recipeId?: string | null,
  ): Promise<string | null> => {
    if (!household) return 'No household'

    if (existingId) {
      const { error } = await supabase
        .from('meal_plans')
        .update({ title: title.trim(), notes: notes.trim() || null, recipe_id: recipeId ?? null })
        .eq('id', existingId)

      if (error) return error.message

      setMeals(prev => prev.map(m =>
        m.id === existingId
          ? { ...m, title: title.trim(), notes: notes.trim() || null, recipe_id: recipeId ?? null }
          : m
      ))
    } else {
      const { data, error } = await supabase
        .from('meal_plans')
        .insert({
          household_id: household.id,
          date,
          title: title.trim(),
          notes: notes.trim() || null,
          recipe_id: recipeId ?? null,
        })
        .select()
        .single()

      if (error) return error.message
      setMeals(prev => [...prev, data as MealPlan])
    }
    return null
  }, [household?.id])

  const deleteMeal = useCallback(async (id: string): Promise<string | null> => {
    const { error } = await supabase.from('meal_plans').delete().eq('id', id)
    if (error) return error.message
    setMeals(prev => prev.filter(m => m.id !== id))
    return null
  }, [])

  return { meals, loading, refresh, saveMeal, deleteMeal }
}
