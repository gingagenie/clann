import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

export interface Household {
  id: string;
  name: string;
  week_start_day: 'monday' | 'sunday';
  created_at: string;
}

export interface Member {
  id: string;
  household_id: string;
  name: string;
  email: string | null;
  role: 'adult' | 'child';
  age_bracket: 'under5' | '5to12' | 'teen' | 'adult' | null;
  portion_multiplier: number;
  is_primary: boolean;
  auth_user_id: string | null;
}

interface HouseholdContextValue {
  household: Household | null;
  members: Member[];
  loading: boolean;
  initialized: boolean; // true once the first fetch has completed
  refresh: () => Promise<void>;
}

const HouseholdContext = createContext<HouseholdContextValue | null>(null);

export function HouseholdProvider({ children }: { children: React.ReactNode }) {
  const { session, loading: authLoading } = useAuth();
  const [household, setHousehold] = useState<Household | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const refresh = useCallback(async () => {
    if (!session?.user) {
      setHousehold(null);
      setMembers([]);
      setInitialized(true);
      return;
    }

    setLoading(true);
    try {
      const { data: memberRow, error: memberError } = await supabase
        .from('members')
        .select('household_id')
        .eq('auth_user_id', session.user.id)
        .maybeSingle();

      if (memberError) {
        console.warn('[Household] member query error:', memberError.message);
        setHousehold(null);
        setMembers([]);
        return;
      }

      if (!memberRow) {
        setHousehold(null);
        setMembers([]);
        return;
      }

      const [{ data: hh, error: hhError }, { data: allMembers }] = await Promise.all([
        supabase.from('households').select('*').eq('id', memberRow.household_id).single(),
        supabase.from('members').select('*').eq('household_id', memberRow.household_id),
      ]);

      if (hhError) {
        console.warn('[Household] household query error:', hhError.message);
        setHousehold(null);
        setMembers([]);
        return;
      }

      setHousehold((hh as Household) ?? null);
      setMembers((allMembers as Member[]) ?? []);
    } catch (err: any) {
      console.error('[Household] unexpected error:', err?.message);
      setHousehold(null);
      setMembers([]);
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  }, [session?.user?.id]);

  // Run refresh when auth is done loading and session state is known
  useEffect(() => {
    if (authLoading) return; // wait for auth before querying
    refresh();
  }, [authLoading, refresh]);

  return (
    <HouseholdContext.Provider value={{ household, members, loading, initialized, refresh }}>
      {children}
    </HouseholdContext.Provider>
  );
}

export function useHousehold(): HouseholdContextValue {
  const ctx = useContext(HouseholdContext);
  if (!ctx) throw new Error('useHousehold must be used within HouseholdProvider');
  return ctx;
}
