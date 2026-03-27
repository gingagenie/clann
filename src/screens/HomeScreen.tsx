import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useHousehold } from '../contexts/HouseholdContext';

// ── Date helpers ──────────────────────────────────────────────

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekStart(date: Date, weekStartDay: 'monday' | 'sunday'): Date {
  const d = startOfDay(date);
  const day = d.getDay(); // 0 = Sun, 1 = Mon … 6 = Sat
  const diff = weekStartDay === 'monday'
    ? (day === 0 ? -6 : 1 - day)   // back to Monday
    : -day;                          // back to Sunday
  d.setDate(d.getDate() + diff);
  return d;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS   = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatWeekRange(start: Date, end: Date): string {
  if (start.getMonth() === end.getMonth()) {
    return `${start.getDate()}–${end.getDate()} ${MONTHS[start.getMonth()]} ${start.getFullYear()}`;
  }
  return `${start.getDate()} ${MONTHS[start.getMonth()]} – ${end.getDate()} ${MONTHS[end.getMonth()]} ${end.getFullYear()}`;
}

// ── Day card ──────────────────────────────────────────────────

interface DayCardProps {
  date: Date;
  isToday: boolean;
  isPast: boolean;
}

function DayCard({ date, isToday, isPast }: DayCardProps) {
  return (
    <View style={[styles.card, isToday && styles.cardToday, isPast && styles.cardPast]}>
      {/* Left column — day name + date */}
      <View style={[styles.cardLeft, isToday && styles.cardLeftToday]}>
        <Text style={[styles.dayShort, isToday && styles.dayShortToday]}>
          {DAY_SHORT[date.getDay()]}
        </Text>
        <Text style={[styles.dayNum, isToday && styles.dayNumToday]}>
          {date.getDate()}
        </Text>
        {isToday && <View style={styles.todayDot} />}
      </View>

      {/* Right column — placeholder content */}
      <View style={styles.cardBody}>
        {isToday && (
          <Text style={styles.todayLabel}>Today</Text>
        )}
        <Text style={styles.emptyTasks}>No tasks</Text>
        <Text style={styles.emptyMeal}>No meal planned</Text>
      </View>

      {/* Chevron */}
      <Ionicons
        name="chevron-forward"
        size={16}
        color={isToday ? '#4F7EF7' : '#D1D5DB'}
        style={styles.chevron}
      />
    </View>
  );
}

// ── Home screen ───────────────────────────────────────────────

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { household } = useHousehold();
  const weekStartDay = household?.week_start_day ?? 'monday';

  const [weekOffset, setWeekOffset] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const today = startOfDay(new Date());
  const baseStart = getWeekStart(today, weekStartDay);
  const weekStart = addDays(baseStart, weekOffset * 7);
  const weekEnd   = addDays(weekStart, 6);
  const days      = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const isCurrentWeek = weekOffset === 0;

  // Scroll to today's card when viewing the current week
  useEffect(() => {
    if (!isCurrentWeek) return;
    const todayIndex = days.findIndex(d => isSameDay(d, today));
    if (todayIndex > 0) {
      // Each card is ~88px tall with margin; scroll past previous cards
      setTimeout(() => {
        scrollRef.current?.scrollTo({ y: todayIndex * 96, animated: true });
      }, 100);
    }
  }, [weekOffset]);

  return (
    <View style={[styles.container, { paddingTop: Platform.OS === 'android' ? insets.top : 0 }]}>
      {/* Week navigation */}
      <View style={styles.nav}>
        <TouchableOpacity
          onPress={() => setWeekOffset(o => o - 1)}
          style={styles.navArrow}
          hitSlop={12}
        >
          <Ionicons name="chevron-back" size={22} color="#4F7EF7" />
        </TouchableOpacity>

        <View style={styles.navCenter}>
          <Text style={styles.navWeek}>{formatWeekRange(weekStart, weekEnd)}</Text>
          {!isCurrentWeek && (
            <TouchableOpacity onPress={() => setWeekOffset(0)}>
              <Text style={styles.navTodayLink}>Back to this week</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          onPress={() => setWeekOffset(o => o + 1)}
          style={styles.navArrow}
          hitSlop={12}
        >
          <Ionicons name="chevron-forward" size={22} color="#4F7EF7" />
        </TouchableOpacity>
      </View>

      {/* Day cards */}
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      >
        {days.map(day => (
          <DayCard
            key={day.toISOString()}
            date={day}
            isToday={isSameDay(day, today)}
            isPast={day < today && !isSameDay(day, today)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────

const BLUE = '#4F7EF7';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },

  // Navigation
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  navArrow: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navCenter: {
    flex: 1,
    alignItems: 'center',
  },
  navWeek: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  navTodayLink: {
    fontSize: 12,
    color: BLUE,
    marginTop: 2,
    fontWeight: '500',
  },

  // List
  list: {
    padding: 12,
    gap: 8,
  },

  // Day card
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  cardToday: {
    borderColor: BLUE,
    borderWidth: 1.5,
  },
  cardPast: {
    opacity: 0.55,
  },

  // Left date column
  cardLeft: {
    width: 64,
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: '#F9FAFB',
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    gap: 2,
  },
  cardLeftToday: {
    backgroundColor: BLUE,
    borderRightColor: BLUE,
  },
  dayShort: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dayShortToday: {
    color: 'rgba(255,255,255,0.8)',
  },
  dayNum: {
    fontSize: 26,
    fontWeight: '800',
    color: '#111827',
    lineHeight: 30,
  },
  dayNumToday: {
    color: '#fff',
  },
  todayDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },

  // Body
  cardBody: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  todayLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: BLUE,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  emptyTasks: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  emptyMeal: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 2,
  },

  chevron: {
    marginRight: 12,
  },
});
