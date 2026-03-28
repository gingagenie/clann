import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './AuthContext'

export interface Household {
  id: string
  name: string
  week_start_day: 'monday' | 'sunday'
  join_code: string | null
  created_at: string
}

export interface Member {
  id: string
  household_id: string
  name: string
  email: string | null
  role: 'adult' | 'child'
  age_bracket: 'under5' | '5to12' | 'teen' | 'adult' | null
  portion_multiplier: number
  is_primary: boolean
  auth_user_id: string | null
}

interface HouseholdContextValue {
  household: Household | null
  members: Member[]
  loading: boolean
  initialized: boolean
  refresh: () => Promise<void>
  updateHousehold: (updates: Partial<Pick<Household, 'name' | 'week_start_day'>>) => Promise<void>
}

const HouseholdContext = createContext<HouseholdContextValue | null>(null)

export function HouseholdProvider({ children }: { children: React.ReactNode }) {
  const { session, loading: authLoading } = useAuth()
  const [household, setHousehold] = useState<Household | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(false)
  const [initialized, setInitialized] = useState(false)

  const refresh = useCallback(async () => {
    if (!session?.user) {
      setHousehold(null)
      setMembers([])
      setInitialized(true)
      return
    }

    setLoading(true)
    try {
      const { data: memberRow, error: memberError } = await supabase
        .from('members')
        .select('household_id')
        .eq('auth_user_id', session.user.id)
        .maybeSingle()

      if (memberError || !memberRow) {
        setHousehold(null)
        setMembers([])
        return
      }

      const [{ data: hh }, { data: allMembers }] = await Promise.all([
        supabase.from('households').select('*').eq('id', memberRow.household_id).single(),
        supabase.from('members').select('*').eq('household_id', memberRow.household_id),
      ])

      setHousehold((hh as Household) ?? null)
      setMembers((allMembers as Member[]) ?? [])
    } finally {
      setLoading(false)
      setInitialized(true)
    }
  }, [session?.user?.id])

  useEffect(() => {
    if (authLoading) return
    refresh()
  }, [authLoading, refresh])

  const updateHousehold = useCallback(async (updates: Partial<Pick<Household, 'name' | 'week_start_day'>>) => {
    if (!household) return
    const { error } = await supabase.from('households').update(updates).eq('id', household.id)
    if (!error) setHousehold(prev => prev ? { ...prev, ...updates } : null)
  }, [household?.id])

  return (
    <HouseholdContext.Provider value={{ household, members, loading, initialized, refresh, updateHousehold }}>
      {children}
    </HouseholdContext.Provider>
  )
}

export function useHousehold() {
  const ctx = useContext(HouseholdContext)
  if (!ctx) throw new Error('useHousehold must be used within HouseholdProvider')
  return ctx
}
