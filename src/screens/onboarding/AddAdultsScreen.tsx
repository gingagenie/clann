import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { OnboardingStackParamList } from '../../navigation/OnboardingNavigator';
import { useWizard } from '../../contexts/WizardContext';
import OnboardingLayout from './OnboardingLayout';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'AddAdults'>;

export default function AddAdultsScreen({ navigation }: Props) {
  const { data, set } = useWizard();
  const [name, setName] = useState(data.adultName);

  function handleContinue() {
    const trimmed = name.trim();
    if (!trimmed) return;
    set({ adultName: trimmed });
    navigation.navigate('AddKids');
  }

  return (
    <OnboardingLayout
      step={2}
      title="What's your name?"
      subtitle="You're Adult 1. You can invite a partner to join later."
      onBack={() => navigation.goBack()}
    >
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Your first name"
        placeholderTextColor="#9CA3AF"
        autoCapitalize="words"
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
