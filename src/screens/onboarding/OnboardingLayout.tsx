import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TOTAL_STEPS = 4;

interface Props {
  step: number; // 1–4 (summary has no step bar)
  showProgress?: boolean;
  title: string;
  subtitle?: string;
  onBack?: () => void;
  children: React.ReactNode;
}

export default function OnboardingLayout({
  step,
  showProgress = true,
  title,
  subtitle,
  onBack,
  children,
}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}>
        {/* Progress bar */}
        {showProgress && (
          <View style={styles.progressRow}>
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <View
                key={i}
                style={[styles.progressSegment, i < step ? styles.progressActive : styles.progressInactive]}
              />
            ))}
          </View>
        )}

        {/* Back button */}
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backButton} hitSlop={12}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
        )}

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          {children}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, paddingHorizontal: 28 },
  progressRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 32,
  },
  progressSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  progressActive: { backgroundColor: '#4F7EF7' },
  progressInactive: { backgroundColor: '#E5E7EB' },
  backButton: { marginBottom: 24 },
  backText: { fontSize: 15, color: '#4F7EF7', fontWeight: '600' },
  scroll: { flexGrow: 1 },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    marginBottom: 32,
    lineHeight: 22,
  },
});
