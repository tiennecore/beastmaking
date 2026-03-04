import { useState } from 'react';
import { ScrollView, Text, View, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getProtocolById } from '@/constants/protocols';
import { GripSelector } from '@/components/GripSelector';
import { TimerConfigForm } from '@/components/TimerConfigForm';
import { useTimerStore } from '@/stores/timer-store';
import { GripType, TimerConfig } from '@/types';

export default function ProtocolConfigScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const setup = useTimerStore((s) => s.setup);
  const protocol = getProtocolById(id);

  const [selectedGrips, setSelectedGrips] = useState<GripType[]>([]);
  const [config, setConfig] = useState<TimerConfig>(protocol?.defaults ?? {} as TimerConfig);

  if (!protocol) {
    return (
      <View className="flex-1 bg-neutral-900 items-center justify-center">
        <Text className="text-white">Protocole introuvable</Text>
      </View>
    );
  }

  const isPullups = protocol.family === 'pullups';
  const canStart = isPullups || selectedGrips.length > 0;

  const handleToggleGrip = (grip: GripType) => {
    setSelectedGrips((prev) =>
      prev.includes(grip) ? prev.filter((g) => g !== grip) : [...prev, grip]
    );
  };

  const handleStart = () => {
    setup(protocol, selectedGrips, config);
    router.push('/timer');
  };

  return (
    <ScrollView className="flex-1 bg-neutral-900 px-4 pt-4">
      <Text className="text-white text-2xl font-bold mb-1">{protocol.icon} {protocol.name}</Text>
      <Text className="text-neutral-400 mb-6">{protocol.summary}</Text>

      <GripSelector
        selected={selectedGrips}
        onToggle={handleToggleGrip}
        showForPullups={isPullups}
      />

      <TimerConfigForm config={config} onChange={setConfig} />

      <View className="bg-neutral-800 rounded-xl p-4 mb-6">
        <Text className="text-amber-400 font-bold mb-1">Conseil de charge</Text>
        <Text className="text-neutral-300">{protocol.loadAdvice}</Text>
      </View>

      <TouchableOpacity
        className={`rounded-xl py-4 items-center mb-8 ${canStart ? 'bg-red-600' : 'bg-neutral-700'}`}
        onPress={handleStart}
        disabled={!canStart}
        activeOpacity={0.8}
      >
        <Text className="text-white text-xl font-bold">
          {canStart ? 'Lancer la seance' : 'Selectionnez une prehension'}
        </Text>
      </TouchableOpacity>

      <View className="h-8" />
    </ScrollView>
  );
}
