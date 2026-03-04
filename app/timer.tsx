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
  const phaseColor = phase
    ? (config?.phaseColors?.[phase.type] ?? PHASE_COLORS[phase.type])
    : PHASE_COLORS.done;
  const phaseLabel = phase ? PHASE_LABELS[phase.type] : 'TERMINE';

  // Phase progress (0 to 1) for the current phase
  const phaseDuration = phase?.duration ?? 1;
  const phaseProgress = 1 - timeRemaining / phaseDuration;

  // Global progress (0 to 1) across all phases
  const globalProgress = phases.length > 0
    ? (currentPhaseIndex + phaseProgress) / phases.length
    : 0;

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
    <View className="flex-1" style={{ backgroundColor: '#1C1917' }}>
      {/* Ambient color overlay */}
      <View
        className="absolute inset-0"
        style={{ backgroundColor: phaseColor, opacity: 0.12 }}
      />

      {/* Global progress bar */}
      <View className="w-full h-1.5 bg-stone-800">
        <View
          className="h-full rounded-r-full"
          style={{
            width: `${Math.min(globalProgress * 100, 100)}%`,
            backgroundColor: phaseColor,
          }}
        />
      </View>

      {/* Main content */}
      <View className="flex-1 items-center justify-center px-6">
        {/* Phase pill badge */}
        <View
          className="rounded-full px-5 py-1.5 mb-4"
          style={{ backgroundColor: phaseColor + '25' }}
        >
          <Text style={{ color: phaseColor }} className="text-lg font-bold">
            {phaseLabel}
          </Text>
        </View>

        {/* Timer */}
        <Text className="text-stone-50 text-8xl font-bold mb-8">
          {formatTime(timeRemaining)}
        </Text>

        {/* Progress info */}
        <View className="flex-row gap-6 mb-8">
          <View className="items-center">
            <Text className="text-stone-400 text-sm">Repetition</Text>
            <Text className="text-stone-50 text-xl font-bold">
              {prog.rep}/{config?.reps ?? 0}
            </Text>
          </View>
          <View className="w-px bg-stone-700 self-stretch" />
          <View className="items-center">
            <Text className="text-stone-400 text-sm">Serie</Text>
            <Text className="text-stone-50 text-xl font-bold">
              {prog.set}/{prog.totalSets}
            </Text>
          </View>
          {prog.totalRounds > 1 && (
            <>
              <View className="w-px bg-stone-700 self-stretch" />
              <View className="items-center">
                <Text className="text-stone-400 text-sm">Tour</Text>
                <Text className="text-stone-50 text-xl font-bold">
                  {prog.round}/{prog.totalRounds}
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Grip reminder */}
        {gripReminder && (
          <View className="bg-stone-800/80 border border-stone-700 rounded-2xl p-4 mb-6 w-full">
            <Text className="text-stone-50 font-bold mb-1">Prehension suivante</Text>
            <Text className="text-stone-200">{gripReminder}</Text>
            <Text className="text-stone-400 text-sm mt-1">
              Gardez la position correcte (regle des +/-15 deg.)
            </Text>
          </View>
        )}

        {/* Load advice */}
        {(phase?.type === 'restSet' || phase?.type === 'restRound') && protocol && (
          <View className="bg-stone-800/80 border border-stone-700 rounded-2xl p-4 mb-6 w-full">
            <Text className="text-amber-400 text-sm">{protocol.loadAdvice}</Text>
          </View>
        )}

        {/* Controls */}
        <View className="flex-row gap-4">
          <TouchableOpacity
            className="bg-stone-700/60 border border-stone-600 rounded-2xl px-8 py-4"
            onPress={isPaused ? resume : pause}
            activeOpacity={0.7}
          >
            <Text className="text-stone-50 text-lg font-bold">
              {isPaused ? 'Reprendre' : 'Pause'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="bg-red-500/20 border border-red-500 rounded-2xl px-8 py-4"
            onPress={handleStop}
            activeOpacity={0.7}
          >
            <Text className="text-red-400 text-lg font-bold">Arreter</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
