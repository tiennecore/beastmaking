import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Protocol, Difficulty } from '@/types';
import { useThemeColors } from '@/lib/theme';
import { computePhaseSequence, computeTotalDuration } from '@/lib/timer-engine';
import { useMemo } from 'react';

type Props = {
  protocol: Protocol;
  familyColor?: string;
  onPress: () => void;
};

const ENERGY_LABELS: Record<string, string> = {
  alactic: 'Alactique',
  lactic: 'Lactique',
  aerobic: 'Aérobie',
};

const DIFFICULTY_CONFIG: Record<Difficulty, { label: string; textClass: string; bgClass: string }> = {
  beginner: { label: 'Débutant', textClass: 'text-green-600 dark:text-green-400', bgClass: 'bg-green-500/10' },
  intermediate: { label: 'Intermédiaire', textClass: 'text-amber-600 dark:text-amber-400', bgClass: 'bg-amber-500/10' },
  advanced: { label: 'Avancé', textClass: 'text-red-500 dark:text-red-400', bgClass: 'bg-red-500/10' },
};

function formatDuration(totalSeconds: number): string {
  const minutes = Math.round(totalSeconds / 60);
  if (minutes < 60) return `~${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `~${h}h${String(m).padStart(2, '0')}` : `~${h}h`;
}

export function ProtocolCard({ protocol, familyColor = '#F97316', onPress }: Props) {
  const colors = useThemeColors();
  const difficulty = DIFFICULTY_CONFIG[protocol.difficulty];

  const duration = useMemo(() => {
    const phases = computePhaseSequence(protocol.defaults);
    return formatDuration(computeTotalDuration(phases));
  }, [protocol.defaults]);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}
      accessibilityRole="button"
      accessibilityLabel={`${protocol.name}. ${protocol.summary}`}
    >
      <View className="bg-stone-100 dark:bg-stone-800 rounded-3xl p-4 border border-stone-300 dark:border-stone-700/50">
        <View className="flex-row items-start">
          <View
            className="w-11 h-11 rounded-xl items-center justify-center mr-3"
            style={{ backgroundColor: familyColor + '20' }}
          >
            <Text className="text-2xl">{protocol.icon}</Text>
          </View>
          <View className="flex-1">
            <Text className="text-stone-900 dark:text-stone-50 font-bold text-base">{protocol.name}</Text>
            <View className="flex-row items-center mt-0.5 gap-2">
              <Text className="text-stone-400 dark:text-stone-500 text-xs">
                {ENERGY_LABELS[protocol.energySystem] ?? protocol.energySystem}
              </Text>
              <View className={`${difficulty.bgClass} rounded-full px-2 py-0.5`}>
                <Text className={`${difficulty.textClass} text-xs font-medium`}>{difficulty.label}</Text>
              </View>
              <View className="flex-row items-center">
                <Ionicons name="time-outline" size={12} color={colors.textMuted} style={{ marginRight: 2 }} />
                <Text className="text-stone-400 dark:text-stone-500 text-xs">{duration}</Text>
              </View>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.chevron} style={{ marginTop: 4 }} />
        </View>
        <Text className="text-stone-500 dark:text-stone-400 text-sm mt-3 leading-5">{protocol.summary}</Text>
        {protocol.targetedQualities?.length > 0 && (
          <Text className="text-stone-400 dark:text-stone-500 text-xs mt-1.5">
            {protocol.targetedQualities.join(' · ')}
          </Text>
        )}
      </View>
    </Pressable>
  );
}
