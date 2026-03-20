import { View, Text } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { BarChart } from '@/components/statistics/BarChart';
import StatsCalendar from '@/components/statistics/StatsCalendar';
import type { PoutreStats, DayActivity, GripProgression } from '@/hooks/useStatistics';

interface PoutreViewProps {
  stats: PoutreStats;
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

function GripProgressionRow({ progression }: { progression: GripProgression }) {
  const { gripName, currentMax, previousMax } = progression;
  const diff = currentMax - previousMax;
  const hasPrev = previousMax !== 0;

  const trendColor =
    !hasPrev ? '#78716c' : diff > 0 ? '#22C55E' : diff < 0 ? '#EF4444' : '#78716c';
  const trendArrow = !hasPrev ? '—' : diff > 0 ? '↑' : diff < 0 ? '↓' : '=';
  const diffLabel =
    !hasPrev ? '' : diff > 0 ? `+${diff}kg` : diff < 0 ? `${diff}kg` : '=';

  return (
    <View className="flex-row items-center justify-between py-2 border-b border-stone-200 dark:border-stone-700/50 last:border-b-0">
      <Text className="text-stone-800 dark:text-stone-200 text-sm font-medium flex-1">
        {gripName}
      </Text>
      <View className="flex-row items-center gap-2">
        <Text className="text-stone-900 dark:text-stone-50 text-sm font-bold">
          {currentMax > 0 ? `${currentMax}kg` : '—'}
        </Text>
        {hasPrev && (
          <View
            style={{ backgroundColor: trendColor + '20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}
          >
            <Text style={{ color: trendColor, fontSize: 11, fontWeight: '700' }}>
              {trendArrow} {diffLabel}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

export function PoutreView({ stats, dayActivities }: PoutreViewProps) {
  const { gripProgressions, weeklyHangTime, topProtocols } = stats;

  const barData = weeklyHangTime.map((w) => ({
    label: w.weekLabel,
    value: Math.round(w.value / 60),
  }));

  return (
    <View className="gap-3">
      {gripProgressions.length > 0 && (
        <StatCard delay={0}>
          <SectionLabel text="Progression charges" />
          {gripProgressions.map((gp, i) => (
            <GripProgressionRow key={i} progression={gp} />
          ))}
        </StatCard>
      )}

      <StatCard delay={50}>
        <SectionLabel text="Suspension / semaine (min)" />
        <BarChart data={barData} color="#818CF8" height={120} />
      </StatCard>

      {topProtocols.length > 0 && (
        <StatCard delay={100}>
          <SectionLabel text="Protocoles favoris" />
          <View className="gap-2 mt-1">
            {topProtocols.map((p, i) => (
              <View key={i} className="flex-row items-center gap-3">
                <View
                  className="w-7 h-7 rounded-full items-center justify-center"
                  style={{ backgroundColor: '#818CF8' + '30' }}
                >
                  <Text className="text-[11px] font-bold" style={{ color: '#818CF8' }}>
                    #{i + 1}
                  </Text>
                </View>
                <Text className="text-stone-800 dark:text-stone-200 text-sm font-medium flex-1">
                  {p.protocolName}
                </Text>
                <Text className="text-stone-500 dark:text-stone-400 text-sm">
                  {p.count}x
                </Text>
              </View>
            ))}
          </View>
        </StatCard>
      )}

      <StatCard delay={150}>
        <SectionLabel text="Activité poutre" />
        <StatsCalendar
          dayActivities={dayActivities}
          filter="hangboard"
          accentColor="#818CF8"
        />
      </StatCard>
    </View>
  );
}
