import { createContext, useContext, useState } from 'react'

export type AgeBracket = 'under5' | '5to12' | 'teen'

export interface Kid {
  id: string          // local only, for list key
  name: string
  age_bracket: AgeBracket
}

export interface WizardData {
  householdName: string
  adultName: string
  partnerName: string
  kids: Kid[]
  weekStartDay: 'monday' | 'sunday'
}

interface WizardContextValue {
  data: WizardData
  setField: <K extends keyof WizardData>(key: K, value: WizardData[K]) => void
}

const WizardContext = createContext<WizardContextValue | null>(null)

const DEFAULTS: WizardData = {
  householdName: '',
  adultName: '',
  partnerName: '',
  kids: [],
  weekStartDay: 'monday',
}

export function WizardProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<WizardData>(DEFAULTS)

  function setField<K extends keyof WizardData>(key: K, value: WizardData[K]) {
    setData(prev => ({ ...prev, [key]: value }))
  }

  return (
    <WizardContext.Provider value={{ data, setField }}>
      {children}
    </WizardContext.Provider>
  )
}

export function useWizard() {
  const ctx = useContext(WizardContext)
  if (!ctx) throw new Error('useWizard must be used within WizardProvider')
  return ctx
}
