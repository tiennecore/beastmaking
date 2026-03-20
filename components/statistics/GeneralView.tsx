import { View, Text } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { BarChart } from '@/components/statistics/BarChart';
import StatsCalendar from '@/components/statistics/StatsCalendar';
import type { GeneralStats, DayActivity } from '@/hooks/useStatistics';

interface GeneralViewProps {
  stats: GeneralStats;
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

type ActivityDotProps = {
  color: string;
  label: string;
  count: number;
};

function ActivityCounter({ color, label, count }: ActivityDotProps) {
  return (
    <View className="flex-1 items-center gap-1">
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
      <Text className="text-stone-900 dark:text-stone-50 text-lg font-bold">{count}</Text>
      <Text className="text-stone-400 dark:text-stone-500 text-xs text-center">{label}</Text>
    </View>
  );
}

export function GeneralView({ stats, dayActivities }: GeneralViewProps) {
  const { weeklySessionCounts, totalPoutre, totalBloc, totalVoie, currentStreak } = stats;

  const barData = weeklySessionCounts.map((w) => ({
    label: w.weekLabel,
    value: w.value,
  }));

  return (
    <View className="gap-3">
      <StatCard delay={0}>
        <SectionLabel text="Séances / semaine" />
        <BarChart data={barData} color="#F97316" height={120} />
      </StatCard>

      <StatCard delay={50}>
        <SectionLabel text="Répartition (3 derniers mois)" />
        <View className="flex-row justify-around mt-2">
          <ActivityCounter color="#F97316" label="Poutre" count={totalPoutre} />
          <ActivityCounter color="#F59E0B" label="Bloc" count={totalBloc} />
          <ActivityCounter color="#2563EB" label="Voie" count={totalVoie} />
        </View>
      </StatCard>

      <StatCard delay={100}>
        <View className="flex-row items-center gap-2">
          <Text style={{ fontSize: 22 }}>🔥</Text>
          <View>
            <Text className="text-stone-900 dark:text-stone-50 text-2xl font-bold">
              {currentStreak} semaine{currentStreak !== 1 ? 's' : ''}
            </Text>
            <Text className="text-stone-400 dark:text-stone-500 text-xs font-semibold uppercase tracking-wide">
              Consécutives
            </Text>
          </View>
        </View>
      </StatCard>

      <StatCard delay={150}>
        <SectionLabel text="Activité" />
        <StatsCalendar
          dayActivities={dayActivities}
          filter="all"
          accentColor="#F97316"
        />
      </StatCard>
    </View>
  );
}
