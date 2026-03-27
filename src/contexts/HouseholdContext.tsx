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
  refresh: () => Promise<void>;
}

const HouseholdContext = createContext<HouseholdContextValue | null>(null);

export function HouseholdProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [household, setHousehold] = useState<Household | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!session?.user) {
      setHousehold(null);
      setMembers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Find this user's member row to get their household_id
      const { data: memberRow } = await supabase
        .from('members')
        .select('household_id')
        .eq('auth_user_id', session.user.id)
        .maybeSingle();

      if (!memberRow) {
        setHousehold(null);
        setMembers([]);
        return;
      }

      const [{ data: hh }, { data: allMembers }] = await Promise.all([
        supabase.from('households').select('*').eq('id', memberRow.household_id).single(),
        supabase.from('members').select('*').eq('household_id', memberRow.household_id),
      ]);

      setHousehold((hh as Household) ?? null);
      setMembers((allMembers as Member[]) ?? []);
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id]);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <HouseholdContext.Provider value={{ household, members, loading, refresh }}>
      {children}
    </HouseholdContext.Provider>
  );
}

export function useHousehold(): HouseholdContextValue {
  const ctx = useContext(HouseholdContext);
  if (!ctx) throw new Error('useHousehold must be used within HouseholdProvider');
  return ctx;
}
