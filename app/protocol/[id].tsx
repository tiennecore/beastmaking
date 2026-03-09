import { useState } from 'react';
import { ScrollView, Text, View, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { getProtocolById } from '@/constants/protocols';
import { GripSelector } from '@/components/GripSelector';
import { TimerConfigForm } from '@/components/TimerConfigForm';
import { useTimerStore } from '@/stores/timer-store';
import { Difficulty, EnergySystem, GripType, TimerConfig } from '@/types';

const difficultyLabels: Record<Difficulty, { label: string; color: string }> = {
  beginner: { label: 'Débutant', color: 'text-green-600 dark:text-green-400' },
  intermediate: { label: 'Intermédiaire', color: 'text-amber-600 dark:text-amber-400' },
  advanced: { label: 'Avancé', color: 'text-red-600 dark:text-red-400' },
};

const energySystemLabels: Record<EnergySystem, string> = {
  alactic: 'Anaérobie alactique',
  lactic: 'Anaérobie lactique',
  aerobic: 'Aérobie',
};

export default function ProtocolConfigScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const setup = useTimerStore((s) => s.setup);
  const protocol = getProtocolById(id);

  const [selectedGrips, setSelectedGrips] = useState<GripType[]>([]);
  const [config, setConfig] = useState<TimerConfig>(protocol?.defaults ?? {} as TimerConfig);

  if (!protocol) {
    return (
      <View className="flex-1 bg-white dark:bg-stone-950 items-center justify-center">
        <Text className="text-stone-900 dark:text-stone-50">Protocole introuvable</Text>
      </View>
    );
  }

  const handleToggleGrip = (grip: GripType) => {
    setSelectedGrips((prev) =>
      prev.includes(grip) ? prev.filter((g) => g !== grip) : [...prev, grip]
    );
  };

  const handleStart = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setup(protocol, selectedGrips, config);
    router.push('/timer');
  };

  return (
    <ScrollView className="flex-1 bg-white dark:bg-stone-950 px-5 pt-4">
      {/* Protocol header */}
      <View className="flex-row items-center mb-2">
        <View className="w-12 h-12 rounded-2xl bg-orange-500/20 items-center justify-center mr-3">
          <Text className="text-2xl">{protocol.icon}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-stone-900 dark:text-stone-50 text-2xl font-bold">{protocol.name}</Text>
        </View>
      </View>
      <Text className="text-stone-500 dark:text-stone-400 mb-4 ml-1">{protocol.summary}</Text>

      {/* Protocol description */}
      <Text className="text-stone-600 dark:text-stone-300 text-sm leading-5 mb-4 ml-1">
        {protocol.description}
      </Text>

      {/* Info row */}
      <View className="flex-row items-start mb-6 gap-4">
        <View className="flex-1">
          <Text className="text-xs font-semibold uppercase text-stone-400 dark:text-stone-500 mb-1">
            Difficulté
          </Text>
          <Text className={`text-sm font-medium ${difficultyLabels[protocol.difficulty].color}`}>
            {difficultyLabels[protocol.difficulty].label}
          </Text>
        </View>
        <View className="flex-1">
          <Text className="text-xs font-semibold uppercase text-stone-400 dark:text-stone-500 mb-1">
            Filière
          </Text>
          <Text className="text-sm font-medium text-stone-800 dark:text-stone-200">
            {energySystemLabels[protocol.energySystem]}
          </Text>
        </View>
        <View className="flex-1">
          <Text className="text-xs font-semibold uppercase text-stone-400 dark:text-stone-500 mb-1">
            Cibles
          </Text>
          <Text className="text-sm font-medium text-stone-800 dark:text-stone-200">
            {protocol.targetedQualities.join(', ')}
          </Text>
        </View>
      </View>

      <GripSelector
        selected={selectedGrips}
        onToggle={handleToggleGrip}
      />

      <TimerConfigForm config={config} onChange={setConfig} />

      {/* Load advice */}
      <View className="bg-stone-100 dark:bg-stone-800 rounded-3xl p-4 border border-stone-300 dark:border-stone-700/50 mb-6">
        <View className="flex-row items-center mb-2">
          <Ionicons name="bulb-outline" size={18} color="#FBBF24" style={{ marginRight: 8 }} />
          <Text className="text-amber-600 dark:text-amber-400 font-bold">Conseil de charge</Text>
        </View>
        <Text className="text-stone-600 dark:text-stone-300 text-sm leading-5">{protocol.loadAdvice}</Text>
      </View>

      {/* Progression tips */}
      <View className="bg-stone-100 dark:bg-stone-800 rounded-2xl p-4 mb-6">
        <View className="flex-row items-center mb-3">
          <Ionicons name="trending-up-outline" size={18} color="#F97316" style={{ marginRight: 8 }} />
          <Text className="text-stone-900 dark:text-stone-50 font-bold">Progression</Text>
        </View>
        {protocol.progressionTips.map((tip, index) => (
          <View key={index} className="flex-row items-start mb-2">
            <Text className="text-orange-500 text-sm mr-2 mt-px">•</Text>
            <Text className="text-stone-700 dark:text-stone-200 text-sm leading-5 flex-1">
              {tip}
            </Text>
          </View>
        ))}
      </View>

      {/* Start button */}
      <Pressable
        onPress={handleStart}
        style={({ pressed }) => ({
          transform: [{ scale: pressed ? 0.97 : 1 }],
        })}
        accessibilityRole="button"
        accessibilityLabel="Lancer la séance"
      >
        <View className="bg-orange-500 rounded-3xl py-4 items-center mb-8">
          <Text className="text-white text-xl font-bold">Lancer la séance</Text>
        </View>
      </Pressable>

      <View className="h-8" />
    </ScrollView>
  );
}
