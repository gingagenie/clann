import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useHousehold } from '@/contexts/HouseholdContext'

export interface ShoppingItem {
  id: string
  household_id: string
  name: string
  quantity: string | null
  checked: boolean
  checked_at: string | null
  created_at: string
}

export function useShoppingList() {
  const { household } = useHousehold()
  const [items, setItems] = useState<ShoppingItem[]>([])
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!household) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('shopping_items')
        .select('*')
        .eq('household_id', household.id)
        .order('created_at', { ascending: true })

      if (error) { console.warn('[useShoppingList] fetch error:', error.message); return }
      setItems((data ?? []) as ShoppingItem[])
    } finally {
      setLoading(false)
    }
  }, [household?.id])

  useEffect(() => { refresh() }, [refresh])

  const addItem = useCallback(async (name: string, quantity?: string): Promise<string | null> => {
    if (!household) return 'No household'

    const { data, error } = await supabase
      .from('shopping_items')
      .insert({
        household_id: household.id,
        name: name.trim(),
        quantity: quantity?.trim() || null,
      })
      .select()
      .single()

    if (error) return error.message
    setItems(prev => [...prev, data as ShoppingItem])
    return null
  }, [household?.id])

  const toggleItem = useCallback(async (id: string, checked: boolean): Promise<void> => {
    // Optimistic update
    setItems(prev => prev.map(item =>
      item.id === id
        ? { ...item, checked, checked_at: checked ? new Date().toISOString() : null }
        : item
    ))

    const { error } = await supabase
      .from('shopping_items')
      .update({ checked, checked_at: checked ? new Date().toISOString() : null })
      .eq('id', id)

    if (error) {
      console.warn('[useShoppingList] toggle error:', error.message)
      // Revert
      setItems(prev => prev.map(item =>
        item.id === id
          ? { ...item, checked: !checked, checked_at: null }
          : item
      ))
    }
  }, [])

  const deleteItem = useCallback(async (id: string): Promise<void> => {
    // Optimistic
    setItems(prev => prev.filter(item => item.id !== id))

    const { error } = await supabase
      .from('shopping_items')
      .delete()
      .eq('id', id)

    if (error) {
      console.warn('[useShoppingList] delete error:', error.message)
      refresh()
    }
  }, [refresh])

  const clearChecked = useCallback(async (): Promise<void> => {
    if (!household) return
    const checkedIds = items.filter(i => i.checked).map(i => i.id)
    if (checkedIds.length === 0) return

    // Optimistic
    setItems(prev => prev.filter(item => !item.checked))

    const { error } = await supabase
      .from('shopping_items')
      .delete()
      .in('id', checkedIds)

    if (error) {
      console.warn('[useShoppingList] clearChecked error:', error.message)
      refresh()
    }
  }, [household?.id, items, refresh])

  return { items, loading, refresh, addItem, toggleItem, deleteItem, clearChecked }
}
