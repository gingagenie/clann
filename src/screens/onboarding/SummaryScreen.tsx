import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { OnboardingStackParamList, useWizard, AgeBracket } from '../../navigation/OnboardingNavigator';
import { useAuth } from '../../contexts/AuthContext';
import { useHousehold } from '../../contexts/HouseholdContext';
import { supabase } from '../../lib/supabase';
import OnboardingLayout from './OnboardingLayout';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Summary'>;

const AGE_LABEL: Record<AgeBracket, string> = {
  under5: 'Under 5',
  '5to12': '5–12',
  teen: '13+',
};

const PORTION_MULTIPLIER: Record<AgeBracket, number> = {
  under5: 0.5,
  '5to12': 0.75,
  teen: 1.0,
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

export default function SummaryScreen({ navigation }: Props) {
  const { data } = useWizard();
  const { user } = useAuth();
  const { refresh } = useHousehold();
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    try {
      // 1. Create household
      const { data: hh, error: hhError } = await supabase
        .from('households')
        .insert({
          name: data.householdName,
          week_start_day: data.weekStartDay,
        })
        .select()
        .single();

      if (hhError) throw hhError;

      // 2. Insert Adult 1 (current user) — the auth_user_id = auth.uid() INSERT policy covers this
      const { error: adult1Error } = await supabase.from('members').insert({
        household_id: hh.id,
        name: data.adultName,
        email: user?.email ?? null,
        role: 'adult',
        age_bracket: 'adult',
        portion_multiplier: 1.0,
        is_primary: true,
        auth_user_id: user?.id ?? null,
      });

      if (adult1Error) throw adult1Error;

      // 3. Insert kids (Adult 1 is now in the household, so the second INSERT policy covers these)
      if (data.kids.length > 0) {
        const { error: kidsError } = await supabase.from('members').insert(
          data.kids.map(kid => ({
            household_id: hh.id,
            name: kid.name,
            role: 'child',
            age_bracket: kid.ageBracket,
            portion_multiplier: PORTION_MULTIPLIER[kid.ageBracket],
            is_primary: false,
            auth_user_id: null,
          }))
        );
        if (kidsError) throw kidsError;
      }

      // 4. Refresh HouseholdContext — AppNavigator will switch to TabNavigator
      await refresh();
    } catch (err: any) {
      console.error('[Onboarding] Save failed:', err);
      Alert.alert('Something went wrong', err?.message ?? 'Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <OnboardingLayout
      step={4}
      showProgress={false}
      title="Here's your household"
      subtitle="Double-check everything looks right."
      onBack={() => navigation.goBack()}
    >
      <View style={styles.card}>
        <Row label="Household" value={data.householdName} />
        <View style={styles.divider} />
        <Row label="You (Adult 1)" value={data.adultName} />
        <View style={styles.divider} />
        <Row
          label="Kids"
          value={
            data.kids.length === 0
              ? 'None added'
              : data.kids.map(k => `${k.name} (${AGE_LABEL[k.ageBracket]})`).join(', ')
          }
        />
        <View style={styles.divider} />
        <Row
          label="Week starts"
          value={data.weekStartDay === 'monday' ? 'Monday' : 'Sunday'}
        />
      </View>

      <View style={styles.spacer} />

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleConfirm}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Let's go! 🎉</Text>
        )}
      </TouchableOpacity>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    backgroundColor: '#F9FAFB',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 18,
    paddingVertical: 16,
    gap: 12,
  },
  rowLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    flexShrink: 0,
  },
  rowValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
  },
  divider: { height: 1, backgroundColor: '#E5E7EB', marginHorizontal: 18 },
  spacer: { flex: 1, minHeight: 32 },
  button: {
    backgroundColor: '#4F7EF7',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
