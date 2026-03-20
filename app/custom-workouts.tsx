import { useCallback, useMemo, useState } from 'react';
import { View, Text, ScrollView, Alert, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import { loadCustomWorkouts, deleteCustomWorkout } from '@/lib/storage';
import { getProtocolById, PROTOCOLS } from '@/constants/protocols';
import { computePhaseSequence, computeTotalDuration } from '@/lib/timer-engine';
import { useThemeColors } from '@/lib/theme';
import { useTimerStore } from '@/stores/timer-store';
import { CustomWorkout, WorkoutStep } from '@/types';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function stepSummary(steps: WorkoutStep[]): string {
  return steps
    .map((step) => {
      if (step.type === 'protocol') {
        const protocol = getProtocolById(step.protocolId);
        return protocol?.name ?? step.protocolId;
      }
      return `Custom: ${step.name}`;
    })
    .join(' \u2192 ');
}

function workoutDuration(steps: WorkoutStep[]): string {
  const totalSeconds = steps.reduce((sum, step) => {
    const phases = computePhaseSequence(step.config);
    return sum + computeTotalDuration(phases);
  }, 0);
  const minutes = Math.round(totalSeconds / 60);
  if (minutes < 60) return `~${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `~${h}h${String(m).padStart(2, '0')}` : `~${h}h`;
}

function WorkoutCard({
  workout,
  onPress,
  onDelete,
  onEdit,
}: {
  workout: CustomWorkout;
  onPress: () => void;
  onDelete: () => void;
  onEdit: () => void;
}) {
  const colors = useThemeColors();
  const duration = useMemo(() => workoutDuration(workout.steps), [workout.steps]);
  return (
    <Pressable
      className="bg-stone-100 dark:bg-stone-800 rounded-3xl p-4 mb-3 flex-row"
      onPress={onPress}
      onLongPress={onDelete}
      style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}
      accessibilityRole="button"
      accessibilityLabel={workout.name}
      accessibilityHint="Maintenir pour supprimer"
    >
      <View className="w-12 h-12 rounded-xl bg-orange-500/10 items-center justify-center mr-4 self-center">
        <Ionicons name={workout.icon as any} size={24} color="#F97316" />
      </View>
      <View className="flex-1">
        <Text className="text-stone-900 dark:text-stone-50 text-base font-bold mb-1">{workout.name}</Text>
        <View className="flex-row items-center mb-1">
          <Text className="text-stone-500 dark:text-stone-400 text-sm">
            {workout.steps.length} {workout.steps.length === 1 ? 'étape' : 'étapes'}
          </Text>
          <Text className="text-stone-600 dark:text-stone-500 text-sm mx-1.5">·</Text>
          <Ionicons name="time-outline" size={13} color={colors.textSecondary} style={{ marginRight: 3 }} />
          <Text className="text-stone-500 dark:text-stone-400 text-sm">
            {duration}
          </Text>
        </View>
        <Text className="text-stone-600 dark:text-stone-300 text-sm mb-1" numberOfLines={2}>
          {stepSummary(workout.steps)}
        </Text>
        <Text className="text-stone-400 dark:text-stone-500 text-xs">{formatDate(workout.createdAt)}</Text>
      </View>
      <Pressable
        onPress={(e) => {
          e.stopPropagation();
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onEdit();
        }}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Modifier l'entraînement"
        style={{ alignSelf: 'flex-start', padding: 4, minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
      >
        <Ionicons name="create-outline" size={18} color="#A8A29E" />
      </Pressable>
    </Pressable>
  );
}

export default function CustomWorkoutsScreen() {
  const [workouts, setWorkouts] = useState<CustomWorkout[]>([]);
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      loadCustomWorkouts().then(setWorkouts);
    }, [])
  );

  function handlePress(workout: CustomWorkout) {
    const firstStep = workout.steps[0];
    if (!firstStep) return;

    if (firstStep.type === 'protocol') {
      const protocol = PROTOCOLS.find(p => p.id === firstStep.protocolId);
      if (protocol) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        useTimerStore.getState().setup(
          protocol,
          firstStep.gripMode ?? 'session',
          firstStep.gripConfigs ?? [],
          firstStep.config
        );
        router.push('/timer');
        return;
      }
    }

    Alert.alert('Bientôt', 'Le lancement des étapes libres arrive bientôt.');
  }

  function handleEdit(workout: CustomWorkout) {
    router.push({ pathname: '/create-workout', params: { editId: workout.id } });
  }

  function handleDelete(workout: CustomWorkout) {
    Alert.alert(
      'Supprimer',
      `Supprimer "${workout.name}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            await deleteCustomWorkout(workout.id);
            const updated = await loadCustomWorkouts();
            setWorkouts(updated);
          },
        },
      ],
    );
  }

  return (
    <ScrollView className="flex-1 bg-white dark:bg-stone-950 px-5 pt-4">
      <Text className="text-stone-900 dark:text-stone-50 text-2xl font-bold mb-4">Mes entraînements</Text>

      {workouts.length === 0 ? (
        <View className="items-center justify-center py-20">
          <Text className="text-stone-500 dark:text-stone-400 text-lg mb-4">
            Aucun entraînement personnalisé
          </Text>
          <Pressable
            className="bg-orange-500 rounded-xl px-6 py-3"
            onPress={() => {
              router.push('/create-workout');
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}
          >
            <Text className="text-white font-bold text-base">Créer mon premier</Text>
          </Pressable>
        </View>
      ) : (
        workouts.map((workout) => (
          <WorkoutCard
            key={workout.id}
            workout={workout}
            onPress={() => handlePress(workout)}
            onDelete={() => handleDelete(workout)}
            onEdit={() => handleEdit(workout)}
          />
        ))
      )}

      {workouts.length > 0 && (
        <Text className="text-stone-400 dark:text-stone-500 text-xs text-center mt-4">
          Maintenir pour supprimer une entrée
        </Text>
      )}

      <View className="h-20" />
    </ScrollView>
  );
}
