import { useMemo, useState, useCallback } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import * as Haptics from 'expo-haptics';
import type { DayActivity } from '@/hooks/useStatistics';

// --- Types ---

type Filter = 'all' | 'hangboard' | 'escalade';
type Period = 'quarter' | 'year';

interface StatsCalendarProps {
  dayActivities: Map<string, DayActivity>;
  filter: Filter;
  accentColor: string;
}

interface GridCell {
  dateKey: string;
  dayOfWeek: number;
}

interface MonthLabel {
  weekIndex: number;
  label: string;
}

// --- Constants ---

const CELL_SIZE = 14;
const GAP = 2;
const QUARTER_WEEKS = 13;
const YEAR_WEEKS = 52;
const DAY_LABEL_WIDTH = 16;

const MONTH_SHORT_FR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
const WEEK_DAY_LETTERS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

const TODAY_KEY = (() => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
})();

// --- Helpers ---

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function buildContributionGrid(weeksCount: number): GridCell[][] {
  const today = new Date();
  const startDate = new Date(today);

  const dayOfWeek = startDate.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  startDate.setDate(startDate.getDate() + mondayOffset);
  startDate.setDate(startDate.getDate() - (weeksCount - 1) * 7);

  const grid: GridCell[][] = [];

  for (let w = 0; w < weeksCount; w++) {
    const weekCol: GridCell[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + w * 7 + d);
      weekCol.push({ dateKey: toDateKey(date), dayOfWeek: d });
    }
    grid.push(weekCol);
  }

  return grid;
}

function buildYearGrid(year: number, weeksCount: number): GridCell[][] {
  const startOfYear = new Date(year, 0, 1);
  const dayOfWeek = startOfYear.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  startOfYear.setDate(startOfYear.getDate() + mondayOffset);

  const grid: GridCell[][] = [];

  for (let w = 0; w < weeksCount; w++) {
    const weekCol: GridCell[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(startOfYear);
      date.setDate(startOfYear.getDate() + w * 7 + d);
      weekCol.push({ dateKey: toDateKey(date), dayOfWeek: d });
    }
    grid.push(weekCol);
  }

  return grid;
}

function getMonthLabels(grid: GridCell[][]): MonthLabel[] {
  const labels: MonthLabel[] = [];

  for (let wi = 0; wi < grid.length; wi++) {
    const weekCol = grid[wi];
    for (const cell of weekCol) {
      const dateStr = cell.dateKey;
      const day = parseInt(dateStr.slice(8, 10), 10);
      if (day === 1) {
        const month = parseInt(dateStr.slice(5, 7), 10) - 1;
        labels.push({ weekIndex: wi, label: MONTH_SHORT_FR[month] });
        break;
      }
    }
  }

  return labels;
}

function countForFilter(activity: DayActivity | undefined, filter: Filter): number {
  if (!activity) return 0;
  if (filter === 'hangboard') return activity.hasHangboard ? 1 : 0;
  if (filter === 'escalade') return (activity.hasBloc || activity.hasVoie) ? 1 : 0;
  return activity.count;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const match = hex.replace('#', '').match(/.{2}/g);
  if (!match || match.length < 3) return null;
  return {
    r: parseInt(match[0], 16),
    g: parseInt(match[1], 16),
    b: parseInt(match[2], 16),
  };
}

function buildHeatmapColor(count: number, accentColor: string): string {
  if (count === 0) return 'transparent';
  const rgb = hexToRgb(accentColor);
  if (!rgb) return 'transparent';
  const opacity = count === 1 ? 0.25 : 0.45;
  return `rgba(${rgb.r},${rgb.g},${rgb.b},${opacity})`;
}

// --- Sub-components ---

function ContributionGrid({
  grid,
  dayActivities,
  filter,
  accentColor,
  isDark,
  cellSize,
}: {
  grid: GridCell[][];
  dayActivities: Map<string, DayActivity>;
  filter: Filter;
  accentColor: string;
  isDark: boolean;
  cellSize: number;
}) {
  const weekDayColor = isDark ? '#57534e' : '#a8a29e';
  const emptyColor = isDark ? '#292524' : '#e7e5e4';
  const rgb = hexToRgb(accentColor);
  const todayBorderColor = rgb ? `rgba(${rgb.r},${rgb.g},${rgb.b},0.8)` : accentColor;

  const monthLabels = useMemo(() => getMonthLabels(grid), [grid]);

  const monthLabelsRowHeight = 16;
  const totalGridWidth = grid.length * (cellSize + GAP) - GAP;

  return (
    <View>
      {/* Month labels row */}
      <View style={{ marginLeft: DAY_LABEL_WIDTH + GAP, height: monthLabelsRowHeight, position: 'relative', width: totalGridWidth }}>
        {monthLabels.map((ml) => (
          <Text
            key={ml.weekIndex}
            style={{
              position: 'absolute',
              left: ml.weekIndex * (cellSize + GAP),
              fontSize: 10,
              color: weekDayColor,
              fontWeight: '500',
            }}
          >
            {ml.label}
          </Text>
        ))}
      </View>

      {/* Grid: day labels + cells */}
      <View style={{ flexDirection: 'row' }}>
        {/* Day labels column */}
        <View style={{ width: DAY_LABEL_WIDTH, marginRight: GAP }}>
          {WEEK_DAY_LETTERS.map((letter, i) => (
            <View
              key={i}
              style={{
                height: cellSize,
                justifyContent: 'center',
                marginBottom: i < 6 ? GAP : 0,
              }}
            >
              <Text style={{ fontSize: 9, color: weekDayColor, fontWeight: '500' }}>
                {letter}
              </Text>
            </View>
          ))}
        </View>

        {/* Cells grid */}
        <View style={{ flexDirection: 'row', gap: GAP }}>
          {grid.map((weekCol, wi) => (
            <View key={wi} style={{ gap: GAP }}>
              {weekCol.map((cell) => {
                const activity = dayActivities.get(cell.dateKey);
                const count = countForFilter(activity, filter);
                const bgColor = count === 0 ? emptyColor : buildHeatmapColor(count, accentColor);
                const isToday = cell.dateKey === TODAY_KEY;

                return (
                  <View
                    key={cell.dateKey}
                    style={{
                      width: cellSize,
                      height: cellSize,
                      borderRadius: 3,
                      backgroundColor: bgColor,
                      borderWidth: isToday ? 1.5 : 0,
                      borderColor: isToday ? todayBorderColor : 'transparent',
                    }}
                  />
                );
              })}
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

// --- Period selector ---

function PeriodSelector({
  period,
  onChange,
  isDark,
  accentColor,
}: {
  period: Period;
  onChange: (p: Period) => void;
  isDark: boolean;
  accentColor: string;
}) {
  const inactiveTextColor = isDark ? '#78716c' : '#a8a29e';
  const rgb = hexToRgb(accentColor);
  const accentBg = rgb ? `rgba(${rgb.r},${rgb.g},${rgb.b},0.15)` : (isDark ? '#44403c' : '#e7e5e4');

  return (
    <View
      style={{
        flexDirection: 'row',
        gap: 4,
        backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
        borderRadius: 22,
        padding: 3,
        alignSelf: 'center',
      }}
    >
      {(['quarter', 'year'] as Period[]).map((p) => {
        const isActive = period === p;
        return (
          <Pressable
            key={p}
            onPress={() => onChange(p)}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 6,
              borderRadius: 19,
              backgroundColor: isActive ? accentBg : 'transparent',
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: isActive ? '700' : '500',
                color: isActive ? accentColor : inactiveTextColor,
              }}
            >
              {p === 'quarter' ? 'Trimestre' : 'Année'}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// --- Main component ---

const PADDING = 16 * 2;
const LABEL_GAP = 2;

export default function StatsCalendar({ dayActivities, filter, accentColor }: StatsCalendarProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [fadeKey, setFadeKey] = useState(0);
  const [period, setPeriod] = useState<Period>('quarter');
  const [containerWidth, setContainerWidth] = useState(0);

  const goToPrevYear = useCallback(() => {
    setSelectedYear((y) => y - 1);
    setFadeKey((k) => k + 1);
    Haptics.selectionAsync();
  }, []);

  const goToNextYear = useCallback(() => {
    setSelectedYear((y) => Math.min(y + 1, currentYear));
    setFadeKey((k) => k + 1);
    Haptics.selectionAsync();
  }, [currentYear]);

  const handlePeriodChange = useCallback((p: Period) => {
    setPeriod(p);
    setFadeKey((k) => k + 1);
    Haptics.selectionAsync();
  }, []);

  const grid = useMemo(() => {
    if (period === 'quarter') {
      return buildContributionGrid(QUARTER_WEEKS);
    }
    return buildYearGrid(selectedYear, YEAR_WEEKS);
  }, [period, selectedYear]);

  const cellSize = useMemo(() => {
    if (period !== 'quarter' || containerWidth === 0) return CELL_SIZE;
    const numWeeks = grid.length;
    const availableForCells = containerWidth - PADDING - DAY_LABEL_WIDTH - LABEL_GAP;
    const dynamicCellSize = Math.floor((availableForCells - (numWeeks - 1) * GAP) / numWeeks);
    return Math.min(dynamicCellSize, 24);
  }, [period, containerWidth, grid.length]);

  const headerTextColor = isDark ? '#f5f5f4' : '#1c1917';
  const chevronColor = isDark ? '#78716c' : '#a8a29e';
  const borderColor = isDark ? 'rgba(68,64,60,0.5)' : '#e7e5e4';
  const isNextDisabled = selectedYear >= currentYear;

  return (
    <View
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
      style={{
        backgroundColor: isDark ? '#292524' : '#f5f5f4',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor,
        gap: 10,
      }}
    >
      {/* Header: year selector + period pills */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Year selector */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Pressable
            onPress={goToPrevYear}
            accessibilityRole="button"
            accessibilityLabel="Année précédente"
            style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="chevron-back" size={18} color={chevronColor} />
          </Pressable>

          <Text style={{ fontSize: 18, fontWeight: '800', color: headerTextColor, minWidth: 44, textAlign: 'center' }}>
            {period === 'quarter' ? currentYear : selectedYear}
          </Text>

          <Pressable
            onPress={goToNextYear}
            disabled={isNextDisabled || period === 'quarter'}
            accessibilityRole="button"
            accessibilityLabel="Année suivante"
            style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons
              name="chevron-forward"
              size={18}
              color={(isNextDisabled || period === 'quarter') ? 'transparent' : chevronColor}
            />
          </Pressable>
        </View>

        {/* Period pills */}
        <PeriodSelector
          period={period}
          onChange={handlePeriodChange}
          isDark={isDark}
          accentColor={accentColor}
        />
      </View>

      {/* Contribution graph */}
      {(period === 'year' || containerWidth > 0) && (
        <Animated.View key={fadeKey} entering={FadeIn.duration(200)}>
          <ScrollView
            horizontal={period === 'year'}
            showsHorizontalScrollIndicator={false}
            scrollEnabled={period === 'year'}
          >
            <ContributionGrid
              grid={grid}
              dayActivities={dayActivities}
              filter={filter}
              accentColor={accentColor}
              isDark={isDark}
              cellSize={cellSize}
            />
          </ScrollView>
        </Animated.View>
      )}
    </View>
  );
}
