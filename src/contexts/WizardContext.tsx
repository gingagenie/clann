import React, { createContext, useContext, useState } from 'react';

export type AgeBracket = 'under5' | '5to12' | 'teen';

export interface Kid {
  name: string;
  ageBracket: AgeBracket;
}

export interface WizardData {
  householdName: string;
  adultName: string;
  kids: Kid[];
  weekStartDay: 'monday' | 'sunday';
}

interface WizardContextValue {
  data: WizardData;
  set: (partial: Partial<WizardData>) => void;
}

const WizardContext = createContext<WizardContextValue | null>(null);

export function WizardProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<WizardData>({
    householdName: '',
    adultName: '',
    kids: [],
    weekStartDay: 'monday',
  });

  function set(partial: Partial<WizardData>) {
    setData(prev => ({ ...prev, ...partial }));
  }

  return (
    <WizardContext.Provider value={{ data, set }}>
      {children}
    </WizardContext.Provider>
  );
}

export function useWizard(): WizardContextValue {
  const ctx = useContext(WizardContext);
  if (!ctx) throw new Error('useWizard must be used inside WizardProvider');
  return ctx;
}
