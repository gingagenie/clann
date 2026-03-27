import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';

import { useAuth } from '../contexts/AuthContext';
import { useHousehold } from '../contexts/HouseholdContext';
import AuthScreen from '../screens/auth/AuthScreen';
import OnboardingNavigator from './OnboardingNavigator';
import TabNavigator from './TabNavigator';

export type RootStackParamList = {
  Auth: undefined;
  Onboarding: undefined;
  Main: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const { session, loading: authLoading } = useAuth();
  const { household, loading: householdLoading } = useHousehold();

  // Show spinner while auth or household check is in progress
  if (authLoading || (session && householdLoading)) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#4F7EF7" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        {!session ? (
          // Not logged in → auth screen
          <Stack.Screen name="Auth" component={AuthScreen} />
        ) : !household ? (
          // Logged in but no household → onboarding
          <Stack.Screen name="Onboarding" component={OnboardingNavigator} />
        ) : (
          // Logged in + household exists → main app
          <Stack.Screen name="Main" component={TabNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
