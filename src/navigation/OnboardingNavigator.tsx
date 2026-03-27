import React, { createContext, useContext, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HouseholdNameScreen from '../screens/onboarding/HouseholdNameScreen';
import AddAdultsScreen from '../screens/onboarding/AddAdultsScreen';
import AddKidsScreen from '../screens/onboarding/AddKidsScreen';
import WeekStartScreen from '../screens/onboarding/WeekStartScreen';
import SummaryScreen from '../screens/onboarding/SummaryScreen';

export type OnboardingStackParamList = {
  HouseholdName: undefined;
  AddAdults: undefined;
  AddKids: undefined;
  WeekStart: undefined;
  Summary: undefined;
};

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

export function useWizard(): WizardContextValue {
  const ctx = useContext(WizardContext);
  if (!ctx) throw new Error('useWizard must be used inside OnboardingNavigator');
  return ctx;
}

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export default function OnboardingNavigator() {
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
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="HouseholdName" component={HouseholdNameScreen} />
        <Stack.Screen name="AddAdults" component={AddAdultsScreen} />
        <Stack.Screen name="AddKids" component={AddKidsScreen} />
        <Stack.Screen name="WeekStart" component={WeekStartScreen} />
        <Stack.Screen name="Summary" component={SummaryScreen} />
      </Stack.Navigator>
    </WizardContext.Provider>
  );
}
