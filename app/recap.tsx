import { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, Pressable, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '@/lib/theme';
import { useTimerStore } from '@/stores/timer-store';
import { formatGripConfig } from '@/constants/grips';
import { saveHistoryEntry, tryAutoCompletePlanSession, saveCustomWorkout, saveClimbingSession } from '@/lib/storage';
import type { CustomWorkout, RoundDetail, RoundRoute } from '@/types';
import { DEFAULT_GRADE, nextGrade, prevGrade } from '@/constants/grades';

function formatDuration(seconds: number): string {
  const total = Math.round(seconds);
  const min = Math.floor(total / 60);
  const sec = total % 60;
  if (min === 0) return `${sec}s`;
  return sec > 0 ? `${min}min ${sec}s` : `${min}min`;
}

function RoundSection({
  round,
  roundIndex,
  onAddRoute,
  onUpdateRoute,
  onRemoveRoute,
}: {
  round: RoundDetail;
  roundIndex: number;
  onAddRoute: () => void;
  onUpdateRoute: (routeId: string, update: Partial<RoundRoute>) => void;
  onRemoveRoute: (routeId: string) => void;
}) {
  const colors = useThemeColors();
  return (
    <View className="mb-4">
      <Text className="text-stone-500 dark:text-stone-400 text-xs font-semibold uppercase tracking-wide mb-2">
        Tour {round.roundNumber}
      </Text>
      <View className="bg-stone-100 dark:bg-stone-800 rounded-2xl border border-stone-300 dark:border-stone-700/50 p-3">
        {round.routes.map((route) => (
          <View
            key={route.id}
            className="flex-row items-center gap-2 mb-2"
          >
            <Pressable
              onPress={() => {
                const prev = prevGrade(route.grade ?? DEFAULT_GRADE);
                if (prev) { Haptics.selectionAsync(); onUpdateRoute(route.id, { grade: prev }); }
              }}
              className="bg-stone-200 dark:bg-stone-700 rounded-lg w-10 h-10 items-center justify-center"
            >
              <Ionicons name="remove" size={14} color="#1c1917" />
            </Pressable>
            <Text className="text-stone-900 dark:text-stone-50 font-bold text-sm w-10 text-center">
              {route.grade ?? DEFAULT_GRADE}
            </Text>
            <Pressable
              onPress={() => {
                const next = nextGrade(route.grade ?? DEFAULT_GRADE);
                if (next) { Haptics.selectionAsync(); onUpdateRoute(route.id, { grade: next }); }
              }}
              className="bg-stone-200 dark:bg-stone-700 rounded-lg w-10 h-10 items-center justify-center"
            >
              <Ionicons name="add" size={14} color="#1c1917" />
            </Pressable>

            <Text className="text-stone-400 text-xs ml-1">×</Text>
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                onUpdateRoute(route.id, { passages: Math.max(1, route.passages - 1) });
              }}
              className="bg-stone-200 dark:bg-stone-700 rounded-lg w-10 h-10 items-center justify-center"
            >
              <Ionicons name="remove" size={14} color="#1c1917" />
            </Pressable>
            <Text className="text-stone-900 dark:text-stone-50 font-bold text-sm w-6 text-center">
              {route.passages}
            </Text>
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                onUpdateRoute(route.id, { passages: route.passages + 1 });
              }}
              className="bg-stone-200 dark:bg-stone-700 rounded-lg w-10 h-10 items-center justify-center"
            >
              <Ionicons name="add" size={14} color="#1c1917" />
            </Pressable>

            <Pressable
              onPress={() => onRemoveRoute(route.id)}
              className="ml-auto w-10 h-10 items-center justify-center"
            >
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          </View>
        ))}
        <Pressable
          onPress={onAddRoute}
          className="rounded-xl px-3 py-2 flex-row items-center justify-center border border-dashed border-stone-300 dark:border-stone-700/50 mt-1"
        >
          <Ionicons name="add-circle-outline" size={16} color="#2563EB" />
          <Text className="text-blue-600 font-semibold text-sm ml-1">Ajouter une voie</Text>
        </Pressable>
      </View>
    </View>
  );
}

function StatCard({ icon, label, value, color }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; color?: string }) {
  const colors = useThemeColors();
  const iconColor = color ?? colors.textSecondary;
  return (
    <View
      className="bg-stone-100 dark:bg-stone-800 border border-stone-300 dark:border-stone-700/50 rounded-2xl p-3 flex-1"
      accessible={true}
      accessibilityLabel={`${label} : ${value}`}
    >
      <View
        className="w-8 h-8 rounded-xl items-center justify-center mb-2"
        style={{ backgroundColor: iconColor + '20' }}
      >
        <Ionicons name={icon} size={16} color={iconColor} />
      </View>
      <Text className="text-stone-900 dark:text-stone-50 text-lg font-bold">{value}</Text>
      <Text className="text-stone-400 dark:text-stone-500 text-xs mt-0.5">{label}</Text>
    </View>
  );
}

export default function RecapScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const result = useTimerStore((s) => s.lastResult);
  const continuityMeta = useTimerStore((s) => s.continuityMeta);
  const isContinuityRecap = continuityMeta !== null;
  const savedRef = useRef(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [workoutName, setWorkoutName] = useState('');
  const [workoutSaved, setWorkoutSaved] = useState(false);
  const [roundDetails, setRoundDetails] = useState<RoundDetail[]>(() => {
    if (!continuityMeta || !result) return [];
    const numRounds = result.completedSets || 1;
    return Array.from({ length: numRounds }, (_, i) => ({
      roundNumber: i + 1,
      routes: [],
    }));
  });

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
    if (!result || !savedRef.current || !result.completed) return;
    tryAutoCompletePlanSession({ type: 'hangboard', protocolId: result.protocol.id });
  }, [result]);

  useEffect(() => {
    if (result?.completed) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [result]);

  function newRoundRoute(): RoundRoute {
    return {
      id: Date.now().toString() + Math.random().toString(36).slice(2),
      grade: DEFAULT_GRADE,
      passages: 1,
    };
  }

  const addRouteToRound = (roundIndex: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRoundDetails((prev) =>
      prev.map((rd, i) =>
        i === roundIndex ? { ...rd, routes: [...rd.routes, newRoundRoute()] } : rd
      )
    );
  };

  const updateRoute = (roundIndex: number, routeId: string, update: Partial<RoundRoute>) => {
    setRoundDetails((prev) =>
      prev.map((rd, i) =>
        i === roundIndex
          ? { ...rd, routes: rd.routes.map((r) => (r.id === routeId ? { ...r, ...update } : r)) }
          : rd
      )
    );
  };

  const removeRoute = (roundIndex: number, routeId: string) => {
    setRoundDetails((prev) =>
      prev.map((rd, i) =>
        i === roundIndex ? { ...rd, routes: rd.routes.filter((r) => r.id !== routeId) } : rd
      )
    );
  };

  const handleSaveContinuity = async () => {
    if (!continuityMeta) return;
    const sessionData = continuityMeta.voieSessionData as Record<string, unknown>;
    await saveClimbingSession({
      ...(sessionData as any),
      roundDetails: roundDetails.filter((rd) => rd.routes.length > 0),
    });
    await tryAutoCompletePlanSession({ type: 'climbing', climbingType: 'voie' });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace('/journal' as any);
  };

  function openSaveModal() {
    if (!result) return;
    setWorkoutName(result.protocol.name);
    setModalVisible(true);
  }

  async function handleSaveWorkout() {
    if (!result || !workoutName.trim()) return;

    const workout: CustomWorkout = {
      id: Date.now().toString(),
      name: workoutName.trim(),
      icon: result.protocol.icon,
      steps: [
        {
          type: 'protocol',
          protocolId: result.protocol.id,
          config: result.config,
          gripMode: result.gripMode,
          gripConfigs: result.gripConfigs,
        },
      ],
      createdAt: new Date().toISOString(),
    };

    await saveCustomWorkout(workout);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setModalVisible(false);
    setWorkoutSaved(true);
  }

  if (!result) {
    return (
      <View className="flex-1 bg-white dark:bg-stone-950 items-center justify-center">
        <Text className="text-stone-900 dark:text-stone-50">Aucune séance à afficher</Text>
        <Pressable
          className="mt-4 py-3 px-6 items-center justify-center"
          onPress={() => router.replace('/')}
          style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.97 : 1 }] }]}
          accessibilityRole="button"
          accessibilityLabel="Retour à l'accueil"
        >
          <Text className="text-orange-400 font-semibold">Retour</Text>
        </Pressable>
      </View>
    );
  }

  const { protocol, gripMode, gripConfigs, completedSets, completedRounds, totalDuration, completed } = result;

  return (
    <ScrollView
      className="flex-1 bg-white dark:bg-stone-950 px-5 pt-4"
      showsVerticalScrollIndicator={false}
    >
      {/* Status header — compact */}
      <View className="items-center mb-3 mt-2">
        <View
          className="w-12 h-12 rounded-full items-center justify-center mb-2"
          style={{ backgroundColor: completed ? '#A3E63520' : '#FBBF2420' }}
        >
          <Ionicons
            name={completed ? 'checkmark-circle' : 'pause-circle'}
            size={28}
            color={completed ? '#A3E635' : '#FBBF24'}
          />
        </View>
        <Text
          className={`text-xl font-bold tracking-tight text-center mb-0.5 ${
            completed ? 'text-lime-600 dark:text-lime-400' : 'text-amber-600 dark:text-amber-400'
          }`}
        >
          {completed ? 'Séance terminée !' : 'Séance interrompue'}
        </Text>
        <Text className="text-stone-500 dark:text-stone-400 text-sm text-center">
          {protocol.icon} {protocol.name}
        </Text>
      </View>

      {/* Stats grid */}
      <View className="flex-row gap-2 mb-2">
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
        {completedRounds > 1 && (
          <StatCard
            icon="sync-outline"
            label="Tours"
            value={String(completedRounds)}
            color="#22D3EE"
          />
        )}
      </View>

      {gripConfigs.length > 0 && (
        <View className="flex-row gap-2 mb-3">
          <StatCard
            icon="hand-left-outline"
            label="Préhension"
            value={gripMode === 'session'
              ? formatGripConfig(gripConfigs[0])
              : gripConfigs.map((gc, i) => `S${i + 1}: ${formatGripConfig(gc)}`).join('\n')
            }
            color="#A3E635"
          />
        </View>
      )}

      {/* Recovery + frequency — side by side when possible */}
      <View className="flex-row gap-2 mb-3">
        <View className="bg-stone-100 dark:bg-stone-800 rounded-2xl p-3 flex-1 border border-stone-300 dark:border-stone-700/50">
          <View className="flex-row items-center mb-1.5">
            <Ionicons name="fitness-outline" size={15} color="#A3E635" style={{ marginRight: 6 }} />
            <Text className="text-lime-600 dark:text-lime-400 font-bold text-sm">Récupération</Text>
          </View>
          <Text className="text-stone-600 dark:text-stone-300 text-xs leading-4">{protocol.recoveryAdvice}</Text>
        </View>

        <View className="bg-stone-100 dark:bg-stone-800 rounded-2xl p-3 flex-1 border border-stone-300 dark:border-stone-700/50">
          <View className="flex-row items-center mb-1.5">
            <Ionicons name="calendar-outline" size={15} color="#22D3EE" style={{ marginRight: 6 }} />
            <Text className="text-cyan-600 dark:text-cyan-400 font-bold text-sm">Fréquence</Text>
          </View>
          <Text className="text-stone-600 dark:text-stone-300 text-xs leading-4">{protocol.frequencyAdvice}</Text>
        </View>
      </View>

      {/* Continuity recap: per-round route logging */}
      {isContinuityRecap && (
        <View className="mt-2 mb-2">
          <Text className="text-stone-900 dark:text-stone-50 text-base font-bold mb-2">
            Détail par tour
          </Text>
          {roundDetails.map((round, i) => (
            <RoundSection
              key={round.roundNumber}
              round={round}
              roundIndex={i}
              onAddRoute={() => addRouteToRound(i)}
              onUpdateRoute={(routeId, update) => updateRoute(i, routeId, update)}
              onRemoveRoute={(routeId) => removeRoute(i, routeId)}
            />
          ))}
        </View>
      )}

      {/* Primary CTA: Add climbing session */}
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          router.push('/journal?quicklog=true');
        }}
        className="bg-lime-500 dark:bg-lime-600 rounded-2xl py-3 mb-2 flex-row items-center justify-center gap-2"
        style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.97 : 1 }], opacity: pressed ? 0.9 : 1 }]}
        accessibilityRole="button"
        accessibilityLabel="Ajouter une séance de grimpe"
      >
        <Ionicons name="trending-up-outline" size={18} color="#fff" />
        <Text className="text-white text-base font-bold">
          Ajouter une grimpe
        </Text>
      </Pressable>

      {/* Secondary: Save as custom workout */}
      <Pressable
        onPress={workoutSaved ? undefined : openSaveModal}
        disabled={workoutSaved}
        className="rounded-2xl py-3 mb-3 border border-stone-300 dark:border-stone-700 flex-row items-center justify-center gap-2"
        style={({ pressed }) => [
          { transform: [{ scale: pressed && !workoutSaved ? 0.97 : 1 }] },
          workoutSaved ? { opacity: 0.5 } : {},
        ]}
        accessibilityRole="button"
        accessibilityLabel={workoutSaved ? 'Workout sauvegardé' : 'Sauvegarder comme workout'}
      >
        <Ionicons
          name={workoutSaved ? 'checkmark-circle-outline' : 'bookmark-outline'}
          size={16}
          color={workoutSaved ? '#84CC16' : '#78716c'}
        />
        <Text className={`text-sm font-semibold ${workoutSaved ? 'text-lime-600 dark:text-lime-400' : 'text-stone-500 dark:text-stone-400'}`}>
          {workoutSaved ? 'Workout sauvegardé' : 'Sauvegarder comme workout'}
        </Text>
      </Pressable>

      {/* Save workout modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1 items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <View className="bg-white dark:bg-stone-900 rounded-3xl p-6 mx-6 w-full max-w-sm border border-stone-200 dark:border-stone-700">
            <Text className="text-stone-900 dark:text-stone-50 text-xl font-bold mb-5 text-center">
              Nommer le workout
            </Text>
            <TextInput
              value={workoutName}
              onChangeText={setWorkoutName}
              autoFocus
              placeholder="Nom du workout"
              placeholderTextColor={colors.textSecondary}
              className="bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-50 rounded-2xl px-4 py-3 text-base border border-stone-300 dark:border-stone-700 mb-5"
              returnKeyType="done"
              onSubmitEditing={handleSaveWorkout}
            />
            <View className="flex-row gap-3">
              <Pressable
                onPress={() => setModalVisible(false)}
                className="flex-1 py-3 rounded-2xl bg-stone-100 dark:bg-stone-800 items-center border border-stone-300 dark:border-stone-700"
                style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.97 : 1 }] }]}
                accessibilityRole="button"
                accessibilityLabel="Annuler"
              >
                <Text className="text-stone-700 dark:text-stone-300 font-semibold">Annuler</Text>
              </Pressable>
              <Pressable
                onPress={handleSaveWorkout}
                className="flex-1 py-3 rounded-2xl bg-orange-500 items-center"
                style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.97 : 1 }] }]}
                accessibilityRole="button"
                accessibilityLabel="Enregistrer"
              >
                <Text className="text-white font-semibold">Enregistrer</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Save continuity session to journal */}
      {isContinuityRecap && (
        <Pressable
          onPress={handleSaveContinuity}
          className="bg-blue-600 rounded-2xl py-3 items-center mb-2"
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          accessibilityRole="button"
          accessibilityLabel="Enregistrer dans Suivi"
        >
          <Text className="text-white font-bold text-base">Enregistrer dans Suivi</Text>
        </Pressable>
      )}

      {/* Action buttons */}
      <View
        className="flex-row gap-2 mb-4"
        style={{ paddingBottom: Math.max(insets.bottom, 8) }}
      >
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            if (result) {
              useTimerStore.getState().setup(result.protocol, result.gripMode, result.gripConfigs, result.config);
              router.replace('/timer');
            }
          }}
          className="flex-1 py-3 rounded-2xl bg-stone-100 dark:bg-stone-800 items-center border border-stone-200 dark:border-stone-700"
          style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.97 : 1 }] }]}
          accessibilityRole="button"
          accessibilityLabel="Refaire la séance"
        >
          <Text className="text-stone-700 dark:text-stone-200 text-sm font-semibold">Refaire</Text>
        </Pressable>

        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.replace('/journal');
          }}
          className="flex-1 py-3 rounded-2xl bg-orange-500 items-center"
          style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.97 : 1 }] }]}
          accessibilityRole="button"
          accessibilityLabel="Retour au menu"
        >
          <Text className="text-white text-sm font-semibold">Retour au menu</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
