import { useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import { useTimerStore } from '@/stores/timer-store';
import { PHASE_COLORS, PHASE_LABELS } from '@/constants/colors';
import { getGripById } from '@/constants/grips';
import { playCountdown, playStart, playEnd } from '@/lib/sounds';

function formatTime(seconds: number): string {
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  if (min === 0) return String(sec);
  return `${min}:${String(sec).padStart(2, '0')}`;
}

export default function TimerScreen() {
  useKeepAwake();
  const router = useRouter();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevPhaseRef = useRef<number>(-1);

  const {
    isRunning,
    isPaused,
    timeRemaining,
    currentPhaseIndex,
    phases,
    grips,
    protocol,
    config,
    start,
    pause,
    resume,
    stop,
    tick,
    currentPhase,
    progress,
  } = useTimerStore();

  const phase = currentPhase();
  const prog = progress();
  const isDone = currentPhaseIndex >= phases.length;
  const bgColor = phase ? PHASE_COLORS[phase.type] : PHASE_COLORS.done;
  const phaseLabel = phase ? PHASE_LABELS[phase.type] : 'TERMINE';

  // Handle sounds
  useEffect(() => {
    if (currentPhaseIndex !== prevPhaseRef.current) {
      prevPhaseRef.current = currentPhaseIndex;
      if (phase?.type === 'hang') {
        playStart();
      } else if (phase?.type !== 'prep') {
        playEnd();
      }
    }

    if (phase?.type === 'hang' && timeRemaining <= 3 && timeRemaining > 0) {
      playCountdown();
    }
  }, [currentPhaseIndex, timeRemaining, phase]);

  // Handle tick interval
  useEffect(() => {
    if (isRunning && !isPaused) {
      intervalRef.current = setInterval(tick, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, isPaused, tick]);

  // Auto-start on mount
  useEffect(() => {
    if (!isRunning && phases.length > 0 && currentPhaseIndex === 0) {
      start();
    }
  }, []);

  // Navigate to recap when done
  useEffect(() => {
    if (isDone && !isRunning) {
      router.replace('/recap');
    }
  }, [isDone, isRunning]);

  const handleStop = useCallback(() => {
    stop();
    router.replace('/recap');
  }, [stop, router]);

  const gripReminder =
    (phase?.type === 'restSet' || phase?.type === 'restRound') && grips.length > 0
      ? grips.map((g) => getGripById(g)?.name).join(', ')
      : null;

  return (
    <View className="flex-1 items-center justify-center px-6" style={{ backgroundColor: bgColor }}>
      <Text className="text-white/70 text-2xl font-bold mb-2">{phaseLabel}</Text>

      <Text className="text-white text-8xl font-bold mb-8">{formatTime(timeRemaining)}</Text>

      <View className="flex-row gap-6 mb-8">
        <View className="items-center">
          <Text className="text-white/60 text-sm">Repetition</Text>
          <Text className="text-white text-xl font-bold">
            {prog.rep}/{config?.reps ?? 0}
          </Text>
        </View>
        <View className="items-center">
          <Text className="text-white/60 text-sm">Serie</Text>
          <Text className="text-white text-xl font-bold">
            {prog.set}/{prog.totalSets}
          </Text>
        </View>
        {prog.totalRounds > 1 && (
          <View className="items-center">
            <Text className="text-white/60 text-sm">Tour</Text>
            <Text className="text-white text-xl font-bold">
              {prog.round}/{prog.totalRounds}
            </Text>
          </View>
        )}
      </View>

      {gripReminder && (
        <View className="bg-black/30 rounded-xl p-4 mb-6 w-full">
          <Text className="text-white font-bold mb-1">Prehension suivante</Text>
          <Text className="text-white/80">{gripReminder}</Text>
          <Text className="text-white/60 text-sm mt-1">
            Gardez la position correcte (regle des +/-15 deg.)
          </Text>
        </View>
      )}

      {(phase?.type === 'restSet' || phase?.type === 'restRound') && protocol && (
        <View className="bg-black/20 rounded-xl p-4 mb-6 w-full">
          <Text className="text-amber-300 text-sm">{protocol.loadAdvice}</Text>
        </View>
      )}

      <View className="flex-row gap-4">
        <TouchableOpacity
          className="bg-white/20 rounded-full px-8 py-4"
          onPress={isPaused ? resume : pause}
          activeOpacity={0.7}
        >
          <Text className="text-white text-lg font-bold">
            {isPaused ? 'Reprendre' : 'Pause'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="bg-red-900/50 rounded-full px-8 py-4"
          onPress={handleStop}
          activeOpacity={0.7}
        >
          <Text className="text-white text-lg font-bold">Arreter</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
