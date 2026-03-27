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
  Loading: undefined;
  Auth: undefined;
  Onboarding: undefined;
  Main: undefined;
};

function LoadingScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
      <ActivityIndicator size="large" color="#4F7EF7" />
    </View>
  );
}

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const { session, loading: authLoading } = useAuth();
  const { household, initialized } = useHousehold();

  // Not ready until auth has resolved AND household check has run
  const isReady = !authLoading && initialized;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        {!isReady ? (
          <Stack.Screen name="Loading" component={LoadingScreen} />
        ) : !session ? (
          <Stack.Screen name="Auth" component={AuthScreen} />
        ) : !household ? (
          <Stack.Screen name="Onboarding" component={OnboardingNavigator} />
        ) : (
          <Stack.Screen name="Main" component={TabNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
