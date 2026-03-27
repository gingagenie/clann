import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { OnboardingStackParamList } from '../../navigation/OnboardingNavigator';
import { useWizard } from '../../contexts/WizardContext';
import OnboardingLayout from './OnboardingLayout';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'WeekStart'>;

const OPTIONS: { value: 'monday' | 'sunday'; label: string; sub: string }[] = [
  { value: 'monday', label: 'Monday',  sub: 'Mon → Sun' },
  { value: 'sunday', label: 'Sunday',  sub: 'Sun → Sat' },
];

export default function WeekStartScreen({ navigation }: Props) {
  const { data, set } = useWizard();
  const [selected, setSelected] = useState<'monday' | 'sunday'>(data.weekStartDay);

  function handleContinue() {
    set({ weekStartDay: selected });
    navigation.navigate('Summary');
  }

  return (
    <OnboardingLayout
      step={4}
      title="When does your week start?"
      subtitle="This controls how your week view is laid out."
      onBack={() => navigation.goBack()}
    >
      <View style={styles.optionsContainer}>
        {OPTIONS.map(opt => (
          <TouchableOpacity
            key={opt.value}
            style={[styles.option, selected === opt.value && styles.optionSelected]}
            onPress={() => setSelected(opt.value)}
          >
            <View style={[styles.radio, selected === opt.value && styles.radioSelected]}>
              {selected === opt.value && <View style={styles.radioDot} />}
            </View>
            <View>
              <Text style={[styles.optionLabel, selected === opt.value && styles.optionLabelSelected]}>
                {opt.label}
              </Text>
              <Text style={styles.optionSub}>{opt.sub}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.spacer} />

      <TouchableOpacity style={styles.button} onPress={handleContinue}>
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  optionsContainer: { gap: 12 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 20,
    backgroundColor: '#F9FAFB',
  },
  optionSelected: {
    borderColor: '#4F7EF7',
    backgroundColor: '#EEF3FF',
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: '#4F7EF7' },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4F7EF7',
  },
  optionLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
  },
  optionLabelSelected: { color: '#4F7EF7' },
  optionSub: { fontSize: 13, color: '#9CA3AF', marginTop: 2 },
  spacer: { flex: 1, minHeight: 32 },
  button: {
    backgroundColor: '#4F7EF7',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
