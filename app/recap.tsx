import { useEffect, useRef } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '@/lib/theme';
import { useTimerStore } from '@/stores/timer-store';
import { getGripById } from '@/constants/grips';
import { saveHistoryEntry, loadActivePlan, completeSessionInPlan } from '@/lib/storage';

function formatDuration(seconds: number): string {
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  if (min === 0) return `${sec}s`;
  return sec > 0 ? `${min}min ${sec}s` : `${min}min`;
}

function StatCard({ icon, label, value, color }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; color?: string }) {
  const colors = useThemeColors();
  const iconColor = color ?? colors.textSecondary;
  return (
    <View
      className="bg-stone-100 dark:bg-stone-800 border border-stone-300 dark:border-stone-700/50 rounded-3xl p-4 flex-1"
      accessible={true}
      accessibilityLabel={`${label} : ${value}`}
    >
      <View
        className="w-10 h-10 rounded-xl items-center justify-center mb-3"
        style={{ backgroundColor: iconColor + '20' }}
      >
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <Text className="text-stone-900 dark:text-stone-50 text-xl font-bold">{value}</Text>
      <Text className="text-stone-400 dark:text-stone-500 text-xs mt-1">{label}</Text>
    </View>
  );
}

export default function RecapScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const result = useTimerStore((s) => s.lastResult);
  const savedRef = useRef(false);

  useEffect(() => {
    if (result && !savedRef.current) {
      savedRef.current = true;
      saveHistoryEntry({
        id: Date.now().toString(),
        date: new Date().toISOString(),
        result,
      });
    }
  }, [result]);

  useEffect(() => {
    if (!result || !savedRef.current) return;

    // Check if this protocol matches the active plan
    (async () => {
      const active = await loadActivePlan();
      if (!active) return;

      const currentWeek = active.weekHistory.find(
        (w) => w.weekNumber === active.currentWeek
      );
      if (!currentWeek) return;

      // Find a matching session (hangboard session with this protocol)
      const matchingSession = active.plan.sessions.find((s) => {
        if (!s.protocolIds?.includes(result.protocol.id)) return false;
        const already = currentWeek.completions.find(
          (c) => c.sessionId === s.id && c.completed
        );
        return !already;
      });

      if (matchingSession) {
        await completeSessionInPlan(
          matchingSession.id,
          Math.round(result.totalDuration / 60)
        );
      }
    })();
  }, [result]);

  useEffect(() => {
    if (result?.completed) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [result]);

  if (!result) {
    return (
      <View className="flex-1 bg-white dark:bg-stone-950 items-center justify-center">
        <Text className="text-stone-900 dark:text-stone-50">Aucune séance à afficher</Text>
        <Pressable
          className="mt-4"
          onPress={() => router.replace('/')}
          style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.97 : 1 }] }]}
        >
          <Text className="text-orange-400">Retour</Text>
        </Pressable>
      </View>
    );
  }

  const { protocol, grips, completedSets, completedRounds, totalDuration, completed } = result;

  return (
    <ScrollView className="flex-1 bg-white dark:bg-stone-950 px-5 pt-8">
      {/* Status header */}
      <View className="items-center mb-6">
        <View
          className="w-16 h-16 rounded-full items-center justify-center mb-4"
          style={{ backgroundColor: completed ? '#A3E63520' : '#FBBF2420' }}
        >
          <Ionicons
            name={completed ? 'checkmark-circle' : 'pause-circle'}
            size={36}
            color={completed ? '#A3E635' : '#FBBF24'}
          />
        </View>
        <Text
          className={`text-3xl font-bold tracking-tight text-center mb-1 ${
            completed ? 'text-lime-600 dark:text-lime-400' : 'text-amber-600 dark:text-amber-400'
          }`}
        >
          {completed ? 'Séance terminée !' : 'Séance interrompue'}
        </Text>
        <Text className="text-stone-400 dark:text-stone-500 text-center">
          {protocol.icon} {protocol.name}
        </Text>
      </View>

      {/* Stats grid */}
      <View className="flex-row gap-3 mb-3">
        <StatCard
          icon="time-outline"
          label="Durée"
          value={formatDuration(totalDuration)}
          color="#F97316"
        />
        <StatCard
          icon="repeat-outline"
          label={completedSets > 1 ? 'Séries' : 'Série'}
          value={String(completedSets)}
          color="#818CF8"
        />
      </View>
      <View className="flex-row gap-3 mb-8">
        {completedRounds > 1 && (
          <StatCard
            icon="sync-outline"
            label="Tours"
            value={String(completedRounds)}
            color="#22D3EE"
          />
        )}
        {grips.length > 0 && (
          <StatCard
            icon="hand-left-outline"
            label="Préhensions"
            value={grips.map((g) => getGripById(g)?.name).join(', ')}
            color="#A3E635"
          />
        )}
      </View>

      {/* Recovery advice */}
      <View className="bg-stone-100 dark:bg-stone-800 rounded-3xl p-4 mb-3 border border-stone-300 dark:border-stone-700/50">
        <View className="flex-row items-center mb-2">
          <Ionicons name="fitness-outline" size={18} color="#A3E635" style={{ marginRight: 8 }} />
          <Text className="text-lime-600 dark:text-lime-400 font-bold">Récupération</Text>
        </View>
        <Text className="text-stone-600 dark:text-stone-300 text-sm leading-5">{protocol.recoveryAdvice}</Text>
      </View>

      {/* Frequency advice */}
      <View className="bg-stone-100 dark:bg-stone-800 rounded-3xl p-4 mb-8 border border-stone-300 dark:border-stone-700/50">
        <View className="flex-row items-center mb-2">
          <Ionicons name="calendar-outline" size={18} color="#22D3EE" style={{ marginRight: 8 }} />
          <Text className="text-cyan-600 dark:text-cyan-400 font-bold">Fréquence recommandée</Text>
        </View>
        <Text className="text-stone-600 dark:text-stone-300 text-sm leading-5">{protocol.frequencyAdvice}</Text>
      </View>

      {/* Action buttons */}
      <View
        className="flex-row gap-3 mb-8"
        style={{ paddingBottom: Math.max(insets.bottom, 0) }}
      >
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            if (result) {
              useTimerStore.getState().setup(result.protocol, result.grips, result.config);
              router.replace('/timer');
            }
          }}
          className="flex-1 py-4 rounded-2xl bg-stone-100 dark:bg-stone-800 items-center"
          style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.97 : 1 }] }]}
          accessibilityRole="button"
          accessibilityLabel="Refaire la séance"
        >
          <Text className="text-stone-900 dark:text-stone-50 text-base font-semibold">Refaire</Text>
        </Pressable>

        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.replace('/');
          }}
          className="flex-1 py-4 rounded-2xl bg-orange-500 items-center"
          style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.97 : 1 }] }]}
          accessibilityRole="button"
          accessibilityLabel="Retour au menu"
        >
          <Text className="text-white text-base font-semibold">Retour au menu</Text>
        </Pressable>
      </View>

      <View className="h-8" />
    </ScrollView>
  );
}
