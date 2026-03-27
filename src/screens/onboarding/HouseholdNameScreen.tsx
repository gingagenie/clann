import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { OnboardingStackParamList } from '../../navigation/OnboardingNavigator';
import { useWizard } from '../../contexts/WizardContext';
import OnboardingLayout from './OnboardingLayout';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'HouseholdName'>;

export default function HouseholdNameScreen({ navigation }: Props) {
  const { data, set } = useWizard();
  const [name, setName] = useState(data.householdName);

  function handleContinue() {
    const trimmed = name.trim();
    if (!trimmed) return;
    set({ householdName: trimmed });
    navigation.navigate('AddAdults');
  }

  return (
    <OnboardingLayout
      step={1}
      title="What's your household called?"
      subtitle="This appears on your family's shared view."
    >
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="e.g. The Smiths, Our Family"
        placeholderTextColor="#9CA3AF"
        autoFocus
        returnKeyType="next"
        onSubmitEditing={handleContinue}
      />

      <View style={styles.spacer} />

      <TouchableOpacity
        style={[styles.button, !name.trim() && styles.buttonDisabled]}
        onPress={handleContinue}
        disabled={!name.trim()}
      >
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 18,
    color: '#111827',
    backgroundColor: '#F9FAFB',
  },
  spacer: { flex: 1, minHeight: 32 },
  button: {
    backgroundColor: '#4F7EF7',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
