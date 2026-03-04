import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTimerStore } from '@/stores/timer-store';
import { getGripById } from '@/constants/grips';

function formatDuration(seconds: number): string {
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  if (min === 0) return `${sec}s`;
  return sec > 0 ? `${min}min ${sec}s` : `${min}min`;
}

export default function RecapScreen() {
  const router = useRouter();
  const result = useTimerStore((s) => s.getResult());

  if (!result) {
    return (
      <View className="flex-1 bg-neutral-900 items-center justify-center">
        <Text className="text-white">Aucune séance à afficher</Text>
        <TouchableOpacity className="mt-4" onPress={() => router.replace('/')}>
          <Text className="text-red-400">Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { protocol, grips, completedSets, completedRounds, totalDuration, completed } = result;

  return (
    <ScrollView className="flex-1 bg-neutral-900 px-4 pt-8">
      <Text className="text-white text-3xl font-bold text-center mb-2">
        {completed ? '🎉 Séance terminée !' : '⏹ Séance interrompue'}
      </Text>

      <View className="bg-neutral-800 rounded-xl p-4 mt-6 mb-4">
        <Text className="text-white text-lg font-bold mb-3">Résumé</Text>
        <View className="gap-2">
          <Text className="text-neutral-300">
            📋 {protocol.icon} {protocol.name}
          </Text>
          {grips.length > 0 && (
            <Text className="text-neutral-300">
              ✋ {grips.map((g) => getGripById(g)?.name).join(', ')}
            </Text>
          )}
          <Text className="text-neutral-300">
            📊 {completedSets} série{completedSets > 1 ? 's' : ''}
            {completedRounds > 1 ? ` · ${completedRounds} tour${completedRounds > 1 ? 's' : ''}` : ''}
          </Text>
          <Text className="text-neutral-300">
            ⏱ {formatDuration(totalDuration)}
          </Text>
        </View>
      </View>

      <View className="bg-green-900/30 border border-green-700 rounded-xl p-4 mb-4">
        <Text className="text-green-400 font-bold mb-1">🩺 Récupération</Text>
        <Text className="text-neutral-300">{protocol.recoveryAdvice}</Text>
      </View>

      <View className="bg-blue-900/30 border border-blue-700 rounded-xl p-4 mb-6">
        <Text className="text-blue-400 font-bold mb-1">📅 Fréquence recommandée</Text>
        <Text className="text-neutral-300">{protocol.frequencyAdvice}</Text>
      </View>

      <TouchableOpacity
        className="bg-red-600 rounded-xl py-4 items-center mb-8"
        onPress={() => router.replace('/')}
        activeOpacity={0.8}
      >
        <Text className="text-white text-lg font-bold">Retour aux protocoles</Text>
      </TouchableOpacity>

      <View className="h-8" />
    </ScrollView>
  );
}
