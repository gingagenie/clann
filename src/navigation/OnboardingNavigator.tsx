import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { WizardProvider } from '../contexts/WizardContext';

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

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export default function OnboardingNavigator() {
  return (
    <WizardProvider>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="HouseholdName" component={HouseholdNameScreen} />
        <Stack.Screen name="AddAdults" component={AddAdultsScreen} />
        <Stack.Screen name="AddKids" component={AddKidsScreen} />
        <Stack.Screen name="WeekStart" component={WeekStartScreen} />
        <Stack.Screen name="Summary" component={SummaryScreen} />
      </Stack.Navigator>
    </WizardProvider>
  );
}
