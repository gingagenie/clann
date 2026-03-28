import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useHousehold } from '@/contexts/HouseholdContext'

export interface RecipeIngredient {
  id: string
  recipe_id: string
  name: string
  quantity: string | null
  sort_order: number
}

export interface Recipe {
  id: string
  household_id: string | null
  title: string
  notes: string | null
  is_starter: boolean
  created_at: string
  ingredients: RecipeIngredient[]
}

export interface RecipeInput {
  title: string
  notes: string
  ingredients: { name: string; quantity: string }[]
}

export function useRecipes() {
  const { household } = useHousehold()
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!household) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('recipes')
        .select('*, recipe_ingredients(*)')
        .or(`household_id.eq.${household.id},is_starter.eq.true`)
        .order('created_at', { ascending: false })
        .order('sort_order', { referencedTable: 'recipe_ingredients', ascending: true })

      if (error) { console.warn('[useRecipes] fetch error:', error.message); return }

      const mapped: Recipe[] = (data ?? []).map((r: any) => ({
        ...r,
        ingredients: (r.recipe_ingredients ?? []) as RecipeIngredient[],
      }))
      setRecipes(mapped)
    } finally {
      setLoading(false)
    }
  }, [household?.id])

  useEffect(() => { refresh() }, [refresh])

  const saveRecipe = useCallback(async (
    input: RecipeInput,
    existingId?: string,
  ): Promise<string | null> => {
    if (!household) return 'No household'

    if (existingId) {
      const { error: recipeErr } = await supabase
        .from('recipes')
        .update({ title: input.title.trim(), notes: input.notes.trim() || null })
        .eq('id', existingId)

      if (recipeErr) return recipeErr.message

      await supabase.from('recipe_ingredients').delete().eq('recipe_id', existingId)

      const toInsert = input.ingredients
        .filter(i => i.name.trim())
        .map((i, idx) => ({
          recipe_id: existingId,
          name: i.name.trim(),
          quantity: i.quantity.trim() || null,
          sort_order: idx,
        }))

      if (toInsert.length > 0) {
        const { error: ingErr } = await supabase.from('recipe_ingredients').insert(toInsert)
        if (ingErr) return ingErr.message
      }
    } else {
      const { data: recipeData, error: recipeErr } = await supabase
        .from('recipes')
        .insert({ household_id: household.id, title: input.title.trim(), notes: input.notes.trim() || null })
        .select()
        .single()

      if (recipeErr) return recipeErr.message

      const newId = (recipeData as any).id as string

      const toInsert = input.ingredients
        .filter(i => i.name.trim())
        .map((i, idx) => ({
          recipe_id: newId,
          name: i.name.trim(),
          quantity: i.quantity.trim() || null,
          sort_order: idx,
        }))

      if (toInsert.length > 0) {
        const { error: ingErr } = await supabase.from('recipe_ingredients').insert(toInsert)
        if (ingErr) return ingErr.message
      }
    }

    await refresh()
    return null
  }, [household?.id, refresh])

  const deleteRecipe = useCallback(async (id: string): Promise<string | null> => {
    const { error } = await supabase.from('recipes').delete().eq('id', id)
    if (error) return error.message
    setRecipes(prev => prev.filter(r => r.id !== id))
    return null
  }, [])

  return { recipes, loading, refresh, saveRecipe, deleteRecipe }
}
