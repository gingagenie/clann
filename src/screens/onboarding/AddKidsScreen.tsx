import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { OnboardingStackParamList } from '../../navigation/OnboardingNavigator';
import { useWizard, Kid, AgeBracket } from '../../contexts/WizardContext';
import OnboardingLayout from './OnboardingLayout';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'AddKids'>;

const AGE_BRACKETS: { value: AgeBracket; label: string; description: string }[] = [
  { value: 'under5',  label: 'Under 5',  description: '½ portion' },
  { value: '5to12',   label: '5–12',     description: '¾ portion' },
  { value: 'teen',    label: '13+',      description: 'Full portion' },
];

function KidRow({
  kid,
  index,
  onChange,
  onRemove,
}: {
  kid: Kid;
  index: number;
  onChange: (updated: Kid) => void;
  onRemove: () => void;
}) {
  return (
    <View style={styles.kidCard}>
      <View style={styles.kidHeader}>
        <Text style={styles.kidLabel}>Child {index + 1}</Text>
        <TouchableOpacity onPress={onRemove} hitSlop={8}>
          <Text style={styles.removeText}>Remove</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.input}
        value={kid.name}
        onChangeText={name => onChange({ ...kid, name })}
        placeholder="Child's name"
        placeholderTextColor="#9CA3AF"
        autoCapitalize="words"
      />

      <Text style={styles.bracketLabel}>Age group</Text>
      <View style={styles.bracketRow}>
        {AGE_BRACKETS.map(b => (
          <TouchableOpacity
            key={b.value}
            style={[
              styles.bracketOption,
              kid.ageBracket === b.value && styles.bracketSelected,
            ]}
            onPress={() => onChange({ ...kid, ageBracket: b.value })}
          >
            <Text style={[
              styles.bracketOptionLabel,
              kid.ageBracket === b.value && styles.bracketSelectedText,
            ]}>
              {b.label}
            </Text>
            <Text style={[
              styles.bracketOptionDesc,
              kid.ageBracket === b.value && styles.bracketSelectedText,
            ]}>
              {b.description}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export default function AddKidsScreen({ navigation }: Props) {
  const { data, set } = useWizard();
  const [kids, setKids] = useState<Kid[]>(data.kids);

  function addKid() {
    setKids(prev => [...prev, { name: '', ageBracket: '5to12' }]);
  }

  function updateKid(index: number, updated: Kid) {
    setKids(prev => prev.map((k, i) => i === index ? updated : k));
  }

  function removeKid(index: number) {
    setKids(prev => prev.filter((_, i) => i !== index));
  }

  function handleContinue() {
    // Filter out kids with no name
    const validKids = kids.filter(k => k.name.trim());
    set({ kids: validKids });
    navigation.navigate('WeekStart');
  }

  const allValid = kids.every(k => k.name.trim());

  return (
    <OnboardingLayout
      step={3}
      title="Add your kids"
      subtitle="We use this for meal portion sizing. You can add more later."
      onBack={() => navigation.goBack()}
    >
      {kids.map((kid, i) => (
        <KidRow
          key={i}
          kid={kid}
          index={i}
          onChange={updated => updateKid(i, updated)}
          onRemove={() => removeKid(i)}
        />
      ))}

      <TouchableOpacity style={styles.addButton} onPress={addKid}>
        <Text style={styles.addButtonText}>+ Add a child</Text>
      </TouchableOpacity>

      <View style={styles.spacer} />

      <TouchableOpacity
        style={[styles.button, (!allValid && kids.length > 0) && styles.buttonDisabled]}
        onPress={handleContinue}
        disabled={!allValid && kids.length > 0}
      >
        <Text style={styles.buttonText}>
          {kids.length === 0 ? 'Skip — no kids yet' : 'Continue'}
        </Text>
      </TouchableOpacity>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  kidCard: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    backgroundColor: '#F9FAFB',
  },
  kidHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  kidLabel: { fontSize: 14, fontWeight: '700', color: '#374151' },
  removeText: { fontSize: 13, color: '#EF4444' },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#fff',
    marginBottom: 14,
  },
  bracketLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  bracketRow: { flexDirection: 'row', gap: 8 },
  bracketOption: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  bracketSelected: {
    borderColor: '#4F7EF7',
    backgroundColor: '#EEF3FF',
  },
  bracketOptionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
  },
  bracketOptionDesc: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  bracketSelectedText: { color: '#4F7EF7' },
  addButton: {
    borderWidth: 1.5,
    borderColor: '#4F7EF7',
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  addButtonText: { color: '#4F7EF7', fontSize: 15, fontWeight: '600' },
  spacer: { flex: 1, minHeight: 24 },
  button: {
    backgroundColor: '#4F7EF7',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
