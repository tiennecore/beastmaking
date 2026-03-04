import { useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { loadCustomWorkouts, deleteCustomWorkout } from '@/lib/storage';
import { getProtocolById } from '@/constants/protocols';
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

function WorkoutCard({
  workout,
  onPress,
  onDelete,
}: {
  workout: CustomWorkout;
  onPress: () => void;
  onDelete: () => void;
}) {
  return (
    <TouchableOpacity
      className="bg-stone-800 rounded-2xl p-4 mb-3 flex-row"
      activeOpacity={0.8}
      onPress={onPress}
      onLongPress={onDelete}
    >
      <Text className="text-4xl mr-4 self-center">{workout.icon}</Text>
      <View className="flex-1">
        <Text className="text-white text-base font-bold mb-1">{workout.name}</Text>
        <Text className="text-stone-400 text-sm mb-1">
          {workout.steps.length} {workout.steps.length === 1 ? 'étape' : 'étapes'}
        </Text>
        <Text className="text-stone-300 text-sm mb-1" numberOfLines={2}>
          {stepSummary(workout.steps)}
        </Text>
        <Text className="text-stone-500 text-xs">{formatDate(workout.createdAt)}</Text>
      </View>
    </TouchableOpacity>
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

  function handlePress() {
    Alert.alert('Bientôt', 'Lancement bientôt disponible');
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
    <ScrollView className="flex-1 bg-stone-950 px-4 pt-4">
      <Text className="text-white text-2xl font-bold mb-4">Mes entraînements</Text>

      {workouts.length === 0 ? (
        <View className="items-center justify-center py-20">
          <Text className="text-stone-400 text-lg mb-4">
            Aucun entraînement personnalisé
          </Text>
          <TouchableOpacity
            className="bg-orange-500 rounded-xl px-6 py-3"
            activeOpacity={0.8}
            onPress={() => router.push('/create-workout')}
          >
            <Text className="text-white font-bold text-base">Créer mon premier</Text>
          </TouchableOpacity>
        </View>
      ) : (
        workouts.map((workout) => (
          <WorkoutCard
            key={workout.id}
            workout={workout}
            onPress={handlePress}
            onDelete={() => handleDelete(workout)}
          />
        ))
      )}

      <View className="h-8" />
    </ScrollView>
  );
}
