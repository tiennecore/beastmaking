import { useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTimerStore } from '@/stores/timer-store';
import { getGripById } from '@/constants/grips';
import { saveHistoryEntry } from '@/lib/storage';

function formatDuration(seconds: number): string {
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  if (min === 0) return `${sec}s`;
  return sec > 0 ? `${min}min ${sec}s` : `${min}min`;
}

function StatCard({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View className="bg-stone-800 border border-stone-700 rounded-2xl p-3 flex-1">
      <Text className="text-lg mb-1">{icon}</Text>
      <Text className="text-stone-50 text-xl font-bold">{value}</Text>
      <Text className="text-stone-400 text-xs">{label}</Text>
    </View>
  );
}

export default function RecapScreen() {
  const router = useRouter();
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

  if (!result) {
    return (
      <View className="flex-1 bg-stone-950 items-center justify-center">
        <Text className="text-stone-50">Aucune seance a afficher</Text>
        <TouchableOpacity className="mt-4" onPress={() => router.replace('/')}>
          <Text className="text-orange-400">Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { protocol, grips, completedSets, completedRounds, totalDuration, completed } = result;

  return (
    <ScrollView className="flex-1 bg-stone-950 px-4 pt-8">
      {/* Header */}
      <Text
        className={`text-3xl font-bold tracking-tight text-center mb-2 ${
          completed ? 'text-lime-400' : 'text-amber-400'
        }`}
      >
        {completed ? 'Seance terminee !' : 'Seance interrompue'}
      </Text>
      <Text className="text-stone-400 text-center mb-6">
        {protocol.icon} {protocol.name}
      </Text>

      {/* Stats grid */}
      <View className="flex-row gap-3 mb-4">
        <StatCard
          icon="⏱"
          label="Duree"
          value={formatDuration(totalDuration)}
        />
        <StatCard
          icon="🔁"
          label={completedSets > 1 ? 'Series' : 'Serie'}
          value={String(completedSets)}
        />
      </View>
      <View className="flex-row gap-3 mb-6">
        {completedRounds > 1 && (
          <StatCard
            icon="🔄"
            label="Tours"
            value={String(completedRounds)}
          />
        )}
        {grips.length > 0 && (
          <StatCard
            icon="✋"
            label="Prehensions"
            value={grips.map((g) => getGripById(g)?.name).join(', ')}
          />
        )}
      </View>

      {/* Recovery advice */}
      <View
        className="bg-stone-800 rounded-2xl p-4 mb-4 border border-stone-700"
        style={{ borderLeftWidth: 3, borderLeftColor: '#A3E635' }}
      >
        <Text className="text-lime-400 font-bold mb-1">Recuperation</Text>
        <Text className="text-stone-300">{protocol.recoveryAdvice}</Text>
      </View>

      {/* Frequency advice */}
      <View
        className="bg-stone-800 rounded-2xl p-4 mb-6 border border-stone-700"
        style={{ borderLeftWidth: 3, borderLeftColor: '#22D3EE' }}
      >
        <Text className="text-cyan-400 font-bold mb-1">Frequence recommandee</Text>
        <Text className="text-stone-300">{protocol.frequencyAdvice}</Text>
      </View>

      {/* Return button */}
      <TouchableOpacity
        className="bg-orange-500 rounded-2xl py-4 items-center mb-8"
        onPress={() => router.replace('/')}
        activeOpacity={0.8}
      >
        <Text className="text-white text-lg font-bold">Retour au menu</Text>
      </TouchableOpacity>

      <View className="h-8" />
    </ScrollView>
  );
}
