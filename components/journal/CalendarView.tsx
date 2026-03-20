import { useMemo, useCallback, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import * as Haptics from 'expo-haptics';
import type { JournalEntry } from '@/types';

// --- Types ---

interface CalendarViewProps {
  entries: JournalEntry[];
  onSelectDay: (dateKey: string) => void;
  selectedDay: string | null;
}

interface DayData {
  dateKey: string;
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
}

interface DayActivity {
  count: number;
  hasBloc: boolean;
  hasVoie: boolean;
  hasHangboard: boolean;
}

type ActivityMap = Map<string, DayActivity>;

// --- Constants ---

const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

const WEEK_DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

const COLOR_BLOC = '#F97316';
const COLOR_VOIE = '#2563EB';
const COLOR_HANGBOARD = '#818CF8';

const SWIPE_THRESHOLD = 50;

// --- Helpers ---

function getTodayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function buildActivityMap(entries: JournalEntry[]): ActivityMap {
  const map = new Map<string, DayActivity>();

  for (const entry of entries) {
    const dateKey = entry.data.date.slice(0, 10);
    const existing = map.get(dateKey) ?? { count: 0, hasBloc: false, hasVoie: false, hasHangboard: false };

    if (entry.type === 'climbing') {
      const isBloc = entry.data.type === 'bloc';
      map.set(dateKey, {
        count: existing.count + 1,
        hasBloc: existing.hasBloc || isBloc,
        hasVoie: existing.hasVoie || !isBloc,
        hasHangboard: existing.hasHangboard,
      });
    } else {
      map.set(dateKey, {
        count: existing.count + 1,
        hasBloc: existing.hasBloc,
        hasVoie: existing.hasVoie,
        hasHangboard: true,
      });
    }
  }

  return map;
}

function buildCalendarGrid(year: number, month: number): DayData[] {
  const todayKey = getTodayKey();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Monday-based: getDay() returns 0=Sun, 1=Mon, ... 6=Sat
  // We want offset: Mon=0, Tue=1, ..., Sun=6
  const rawOffset = firstDay.getDay();
  const startOffset = rawOffset === 0 ? 6 : rawOffset - 1;

  const grid: DayData[] = [];

  // Previous month filler days
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = startOffset - 1; i >= 0; i--) {
    const day = prevMonthLastDay - i;
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    const dateKey = formatDateKey(prevYear, prevMonth, day);
    grid.push({ dateKey, day, isCurrentMonth: false, isToday: dateKey === todayKey });
  }

  // Current month days
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const dateKey = formatDateKey(year, month, day);
    grid.push({ dateKey, day, isCurrentMonth: true, isToday: dateKey === todayKey });
  }

  // Next month filler days to complete the grid to a multiple of 7
  const remaining = 7 - (grid.length % 7);
  if (remaining < 7) {
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    for (let day = 1; day <= remaining; day++) {
      const dateKey = formatDateKey(nextYear, nextMonth, day);
      grid.push({ dateKey, day, isCurrentMonth: false, isToday: dateKey === todayKey });
    }
  }

  return grid;
}

function getIntensityColor(count: number, isDark: boolean): string {
  if (count === 0) return 'transparent';
  if (count === 1) return isDark ? 'rgba(129,140,248,0.15)' : 'rgba(129,140,248,0.12)';
  return isDark ? 'rgba(129,140,248,0.30)' : 'rgba(129,140,248,0.22)';
}

// --- Sub-components ---

interface DayCellProps {
  dayData: DayData;
  activity: DayActivity | undefined;
  isSelected: boolean;
  isDark: boolean;
  onPress: (dateKey: string) => void;
}

function DayCell({ dayData, activity, isSelected, isDark, onPress }: DayCellProps) {
  const { dateKey, day, isCurrentMonth, isToday } = dayData;
  const count = activity?.count ?? 0;

  const bgColor = isSelected ? COLOR_BLOC : getIntensityColor(count, isDark);
  const textColor = isSelected
    ? '#ffffff'
    : isToday
      ? COLOR_BLOC
      : isCurrentMonth
        ? (isDark ? '#f5f5f4' : '#1c1917')
        : (isDark ? '#44403c' : '#d6d3d1');

  return (
    <View style={{ flex: 1, alignItems: 'center', paddingVertical: 4 }}>
      <Pressable
        onPress={() => {
          if (isCurrentMonth) {
            Haptics.selectionAsync();
            onPress(dateKey);
          }
        }}
        style={({ pressed }) => ({
          opacity: pressed && isCurrentMonth ? 0.7 : 1,
          alignItems: 'center',
        })}
        accessibilityRole="button"
        accessibilityLabel={dateKey}
        accessibilityState={{ selected: isSelected }}
      >
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 11,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: bgColor,
            borderWidth: isToday && !isSelected ? 2 : 0,
            borderColor: COLOR_BLOC,
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: '500', color: textColor }}>
            {day}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 2, marginTop: 2, height: 6, alignItems: 'center' }}>
          {activity?.hasBloc && (
            <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: COLOR_BLOC }} />
          )}
          {activity?.hasVoie && (
            <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: COLOR_VOIE }} />
          )}
          {activity?.hasHangboard && (
            <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: COLOR_HANGBOARD }} />
          )}
        </View>
      </Pressable>
    </View>
  );
}

// --- Month Grid ---

interface MonthGridProps {
  year: number;
  month: number;
  activityMap: ActivityMap;
  selectedDay: string | null;
  isDark: boolean;
  weekDayColor: string;
  onSelectDay: (dateKey: string) => void;
}

function MonthGrid({ year, month, activityMap, selectedDay, isDark, weekDayColor, onSelectDay }: MonthGridProps) {
  const grid = useMemo(() => buildCalendarGrid(year, month), [year, month]);

  const weeks: DayData[][] = [];
  for (let i = 0; i < grid.length; i += 7) {
    weeks.push(grid.slice(i, i + 7));
  }

  return (
    <View>
      {/* Week day labels — rendered inside MonthGrid for pixel-perfect column alignment */}
      <View style={{ flexDirection: 'row', marginBottom: 4 }}>
        {WEEK_DAYS.map((label) => (
          <View key={label} style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: weekDayColor }}>{label}</Text>
          </View>
        ))}
      </View>
      {weeks.map((week, weekIndex) => (
        <View key={weekIndex} style={{ flexDirection: 'row' }}>
          {week.map((dayData) => (
            <DayCell
              key={dayData.dateKey}
              dayData={dayData}
              activity={activityMap.get(dayData.dateKey)}
              isSelected={dayData.dateKey === selectedDay}
              isDark={isDark}
              onPress={onSelectDay}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

// --- Main CalendarView ---

export default function CalendarView({ entries, onSelectDay, selectedDay }: CalendarViewProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const today = new Date();
  const [displayYear, setDisplayYear] = useState(today.getFullYear());
  const [displayMonth, setDisplayMonth] = useState(today.getMonth());
  const [fadeKey, setFadeKey] = useState(0);

  const activityMap = useMemo(() => buildActivityMap(entries), [entries]);

  const goToPrevMonth = useCallback(() => {
    setDisplayYear((y) => (displayMonth === 0 ? y - 1 : y));
    setDisplayMonth((m) => (m === 0 ? 11 : m - 1));
    setFadeKey((k) => k + 1);
  }, [displayMonth]);

  const goToNextMonth = useCallback(() => {
    setDisplayYear((y) => (displayMonth === 11 ? y + 1 : y));
    setDisplayMonth((m) => (m === 11 ? 0 : m + 1));
    setFadeKey((k) => k + 1);
  }, [displayMonth]);

  const swipeGesture = Gesture.Pan()
    .runOnJS(true)
    .onEnd((event) => {
      if (event.translationX < -SWIPE_THRESHOLD) {
        goToNextMonth();
      } else if (event.translationX > SWIPE_THRESHOLD) {
        goToPrevMonth();
      }
    });

  const headerTextColor = isDark ? '#f5f5f4' : '#1c1917';
  const weekDayColor = isDark ? '#78716c' : '#a8a29e';
  const chevronColor = isDark ? '#78716c' : '#a8a29e';
  const borderColor = isDark ? 'rgba(68,64,60,0.5)' : '#e7e5e4';

  return (
    <View
      style={{
        backgroundColor: isDark ? '#292524' : '#f5f5f4',
        borderRadius: 24,
        padding: 16,
        borderWidth: 1,
        borderColor,
      }}
    >
      {/* Month header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <Pressable
          onPress={goToPrevMonth}
          hitSlop={12}
          style={{ padding: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Mois précédent"
        >
          <Ionicons name="chevron-back" size={20} color={chevronColor} />
        </Pressable>

        <Text style={{ fontSize: 16, fontWeight: '700', color: headerTextColor }}>
          {MONTH_NAMES[displayMonth]} {displayYear}
        </Text>

        <Pressable
          onPress={goToNextMonth}
          hitSlop={12}
          style={{ padding: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Mois suivant"
        >
          <Ionicons name="chevron-forward" size={20} color={chevronColor} />
        </Pressable>
      </View>

      {/* Swipeable month grid with fade — week day labels are inside MonthGrid */}
      <GestureDetector gesture={swipeGesture}>
        <Animated.View key={fadeKey} entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)}>
          <MonthGrid
            year={displayYear}
            month={displayMonth}
            activityMap={activityMap}
            selectedDay={selectedDay}
            isDark={isDark}
            weekDayColor={weekDayColor}
            onSelectDay={onSelectDay}
          />
        </Animated.View>
      </GestureDetector>

      {/* Legend */}
      <View
        style={{
          flexDirection: 'row',
          gap: 16,
          marginTop: 12,
          paddingTop: 12,
          borderTopWidth: 1,
          borderTopColor: borderColor,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: COLOR_BLOC }} />
          <Text style={{ fontSize: 11, fontWeight: '500', color: weekDayColor }}>Bloc</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: COLOR_VOIE }} />
          <Text style={{ fontSize: 11, fontWeight: '500', color: weekDayColor }}>Voie</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: COLOR_HANGBOARD }} />
          <Text style={{ fontSize: 11, fontWeight: '500', color: weekDayColor }}>Poutre</Text>
        </View>
      </View>
    </View>
  );
}
