import { View, Text } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { BarChart } from '@/components/statistics/BarChart';
import StatsCalendar from '@/components/statistics/StatsCalendar';
import type { EscaladeStats, DayActivity } from '@/hooks/useStatistics';

interface EscaladeViewProps {
  stats: EscaladeStats;
  dayActivities: Map<string, DayActivity>;
}

function StatCard({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <Animated.View
      entering={FadeInDown.duration(250).delay(delay)}
      className="bg-stone-100 dark:bg-stone-800 rounded-2xl p-4 border border-stone-300 dark:border-stone-700/50"
    >
      {children}
    </Animated.View>
  );
}

function SectionLabel({ text }: { text: string }) {
  return (
    <Text className="text-stone-400 dark:text-stone-500 text-xs font-semibold uppercase tracking-wide mb-2">
      {text}
    </Text>
  );
}

type TrendBadgeProps = {
  current: string | number | null;
  previous: string | number | null;
  unit?: string;
};

function TrendBadge({ current, previous }: TrendBadgeProps) {
  if (current === null || previous === null || current === previous) return null;

  const isUp = String(current) > String(previous);
  const color = isUp ? '#22C55E' : '#EF4444';
  const arrow = isUp ? '↑' : '↓';

  return (
    <View style={{ backgroundColor: color + '20', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
      <Text style={{ color, fontSize: 12, fontWeight: '700' }}>{arrow} vs mois dernier</Text>
    </View>
  );
}

export function EscaladeView({ stats, dayActivities }: EscaladeViewProps) {
  const {
    currentAvgGrade,
    previousAvgGrade,
    successRateMonth,
    successRatePrevMonth,
    weeklyVolume,
    continuityAvgPassages,
    continuityPrevAvgPassages,
  } = stats;

  const barData = weeklyVolume.map((w) => ({
    label: w.weekLabel,
    value: w.bloc,
    value2: w.voie,
  }));

  return (
    <View className="gap-3">
      <StatCard delay={0}>
        <SectionLabel text="Grade moyen (ce mois)" />
        <View className="flex-row items-center justify-between">
          <Text className="text-stone-900 dark:text-stone-50 text-2xl font-bold">
            {currentAvgGrade ?? '—'}
          </Text>
          <TrendBadge current={currentAvgGrade} previous={previousAvgGrade} />
        </View>
      </StatCard>

      <StatCard delay={50}>
        <SectionLabel text="Taux de réussite (ce mois)" />
        <View className="flex-row items-center justify-between">
          <Text className="text-stone-900 dark:text-stone-50 text-2xl font-bold">
            {successRateMonth}%
          </Text>
          <TrendBadge current={successRateMonth} previous={successRatePrevMonth} />
        </View>
      </StatCard>

      <StatCard delay={100}>
        <SectionLabel text="Volume / semaine" />
        <BarChart data={barData} color="#F97316" color2="#2563EB" height={120} />
        <View className="flex-row gap-4 mt-2">
          <View className="flex-row items-center gap-1.5">
            <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: '#F97316' }} />
            <Text className="text-stone-400 dark:text-stone-500 text-xs">Bloc</Text>
          </View>
          <View className="flex-row items-center gap-1.5">
            <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: '#2563EB' }} />
            <Text className="text-stone-400 dark:text-stone-500 text-xs">Voie</Text>
          </View>
        </View>
      </StatCard>

      {continuityAvgPassages !== null && (
        <StatCard delay={150}>
          <SectionLabel text="Continuité — passages / tour" />
          <View className="flex-row items-center justify-between">
            <Text className="text-stone-900 dark:text-stone-50 text-2xl font-bold">
              {continuityAvgPassages}
            </Text>
            <TrendBadge
              current={continuityAvgPassages}
              previous={continuityPrevAvgPassages}
            />
          </View>
        </StatCard>
      )}

      <StatCard delay={200}>
        <SectionLabel text="Activité escalade" />
        <StatsCalendar
          dayActivities={dayActivities}
          filter="escalade"
          accentColor="#2563EB"
        />
      </StatCard>
    </View>
  );
}
