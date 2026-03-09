import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, Pressable, AppState, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '@/lib/theme';
import { useTimerStore } from '@/stores/timer-store';
import { PHASE_COLORS, PHASE_LABELS } from '@/constants/colors';
import { getGripById } from '@/constants/grips';
import { playCountdown, playStart, playEnd } from '@/lib/sounds';
import {
  startBackgroundKeepAlive,
  stopBackgroundKeepAlive,
  showTimerNotification,
  dismissTimerNotification,
} from '@/lib/background-timer';
import { TimerPhase } from '@/types';

function formatTime(seconds: number): string {
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  if (min === 0) return String(sec);
  return `${min}:${String(sec).padStart(2, '0')}`;
}

const NOTIF_PHASE_NAMES: Record<TimerPhase, string> = {
  idle: '',
  prep: 'Préparation',
  hang: 'Accroche',
  restRep: 'Repos',
  restSet: 'Repos série',
  restRound: 'Repos tour',
  done: 'Terminé',
};

const TimeDisplay = React.memo(({ timeRemaining }: { timeRemaining: number }) => (
  <Text
    className="text-stone-900 dark:text-stone-50 text-8xl font-bold mb-4"
    style={{ fontVariant: ['tabular-nums'] }}
    accessibilityRole="timer"
    accessibilityLiveRegion="assertive"
    accessibilityLabel={`${formatTime(timeRemaining)} restantes`}
  >
    {formatTime(timeRemaining)}
  </Text>
));

interface ProgressInfoProps {
  rep: number;
  set: number;
  totalSets: number;
  round: number;
  totalRounds: number;
  reps: number;
}

const ProgressInfo = React.memo(({ rep, set, totalSets, round, totalRounds, reps }: ProgressInfoProps) => (
  <View
    className="flex-row gap-6 mb-8"
    accessible={true}
    accessibilityLabel={`Répétition ${rep}, Série ${set} sur ${totalSets}${totalRounds > 1 ? `, Tour ${round} sur ${totalRounds}` : ''}`}
  >
    <View className="items-center">
      <Text className="text-stone-400 dark:text-stone-500 text-xs font-semibold uppercase tracking-wide">Rep</Text>
      <Text className="text-stone-900 dark:text-stone-50 text-xl font-bold">
        {rep}/{reps}
      </Text>
    </View>
    <View className="w-px bg-stone-700/50 self-stretch" />
    <View className="items-center">
      <Text className="text-stone-400 dark:text-stone-500 text-xs font-semibold uppercase tracking-wide">Serie</Text>
      <Text className="text-stone-900 dark:text-stone-50 text-xl font-bold">
        {set}/{totalSets}
      </Text>
    </View>
    {totalRounds > 1 && (
      <>
        <View className="w-px bg-stone-700/50 self-stretch" />
        <View className="items-center">
          <Text className="text-stone-400 dark:text-stone-500 text-xs font-semibold uppercase tracking-wide">Tour</Text>
          <Text className="text-stone-900 dark:text-stone-50 text-xl font-bold">
            {round}/{totalRounds}
          </Text>
        </View>
      </>
    )}
  </View>
));

export default function TimerScreen() {
  useKeepAwake();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevPhaseRef = useRef<number>(-1);
  const backgroundTimestampRef = useRef<number | null>(null);

  const phases = useTimerStore(s => s.phases);
  const currentPhaseIndex = useTimerStore(s => s.currentPhaseIndex);
  const timeRemaining = useTimerStore(s => s.timeRemaining);
  const isRunning = useTimerStore(s => s.isRunning);
  const isPaused = useTimerStore(s => s.isPaused);
  const protocol = useTimerStore(s => s.protocol);
  const grips = useTimerStore(s => s.grips);
  const config = useTimerStore(s => s.config);
  const start = useTimerStore(s => s.start);
  const pauseTimer = useTimerStore(s => s.pause);
  const resume = useTimerStore(s => s.resume);
  const stopTimer = useTimerStore(s => s.stop);
  const tick = useTimerStore(s => s.tick);
  const fastForward = useTimerStore(s => s.fastForward);
  const skipPhase = useTimerStore(s => s.skipPhase);
  const currentPhase = useTimerStore(s => s.currentPhase);
  const progressFn = useTimerStore(s => s.progress);

  const phase = useMemo(() => currentPhase(), [currentPhase, currentPhaseIndex, phases]);
  const prog = useMemo(() => progressFn(), [progressFn, currentPhaseIndex, phases]);

  const colors = useThemeColors();
  const isDone = currentPhaseIndex >= phases.length;
  const phaseColor = phase
    ? (config?.phaseColors?.[phase.type] ?? PHASE_COLORS[phase.type])
    : PHASE_COLORS.done;
  const phaseLabel = phase ? PHASE_LABELS[phase.type] : 'TERMINE';

  const phaseDuration = phase?.duration ?? 1;
  const phaseProgress = 1 - timeRemaining / phaseDuration;
  const globalProgress = phases.length > 0
    ? (currentPhaseIndex + phaseProgress) / phases.length
    : 0;

  useEffect(() => {
    if (currentPhaseIndex !== prevPhaseRef.current) {
      prevPhaseRef.current = currentPhaseIndex;
      if (phase?.type === 'hang') {
        playStart();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      } else if (phase?.type === 'restSet' || phase?.type === 'restRound') {
        playEnd();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else if (phase?.type !== 'prep') {
        playEnd();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    }

    if (phase?.type === 'hang' && timeRemaining <= 3 && timeRemaining > 0) {
      playCountdown();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [currentPhaseIndex, timeRemaining, phase]);

  useEffect(() => {
    if (isRunning && !isPaused) {
      let expectedTime = Date.now() + 1000;

      const scheduleTick = () => {
        const now = Date.now();
        const drift = now - expectedTime;
        expectedTime += 1000;
        tick();
        const nextDelay = Math.max(0, 1000 - drift);
        intervalRef.current = setTimeout(scheduleTick, nextDelay);
      };

      intervalRef.current = setTimeout(scheduleTick, 1000);
    } else if (intervalRef.current) {
      clearTimeout(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearTimeout(intervalRef.current);
    };
  }, [isRunning, isPaused]);

  useEffect(() => {
    if (!isRunning && phases.length > 0 && currentPhaseIndex === 0) {
      start();
    }
  }, []);

  useEffect(() => {
    if (isRunning) {
      startBackgroundKeepAlive();
    }
    return () => {
      stopBackgroundKeepAlive();
      dismissTimerNotification();
    };
  }, [isRunning]);

  useEffect(() => {
    if (!isRunning || !phase) return;

    const phaseName = isPaused
      ? `En pause — ${NOTIF_PHASE_NAMES[phase.type]}`
      : NOTIF_PHASE_NAMES[phase.type];

    const parts: string[] = [];
    if (prog.set > 0) parts.push(`Série ${prog.set}/${prog.totalSets}`);
    if (prog.rep > 0) parts.push(`Rép ${prog.rep}/${config?.reps ?? 0}`);
    if (prog.totalRounds > 1) parts.push(`Tour ${prog.round}/${prog.totalRounds}`);
    const detail = parts.join(' · ');

    showTimerNotification(phaseName, phase.duration, detail);
  }, [isRunning, isPaused, currentPhaseIndex]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'background' || nextState === 'inactive') {
        backgroundTimestampRef.current = Date.now();
      } else if (nextState === 'active' && backgroundTimestampRef.current) {
        const elapsed = (Date.now() - backgroundTimestampRef.current) / 1000;
        backgroundTimestampRef.current = null;
        if (elapsed > 2) {
          fastForward(elapsed);
        }
      }
    });
    return () => subscription.remove();
  }, [fastForward]);

  useEffect(() => {
    if (isDone && !isRunning) {
      router.replace('/recap');
    }
  }, [isDone, isRunning]);

  const handleStop = useCallback(() => {
    Alert.alert(
      'Arrêter la séance ?',
      'La progression sera sauvegardée.',
      [
        { text: 'Continuer', style: 'cancel' },
        {
          text: 'Arrêter',
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            dismissTimerNotification();
            stopBackgroundKeepAlive();
            stopTimer();
          },
        },
      ]
    );
  }, [stopTimer]);

  const handlePauseResume = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    isPaused ? resume() : pauseTimer();
  }, [isPaused, resume, pauseTimer]);

  const handleSkip = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    skipPhase();
  }, [skipPhase]);

  const gripReminder =
    (phase?.type === 'restSet' || phase?.type === 'restRound') && grips.length > 0
      ? grips.map((g) => getGripById(g)?.name).join(', ')
      : null;

  const isRestPhase =
    phase &&
    phase.type !== 'hang' &&
    phase.type !== 'prep' &&
    phase.type !== 'done';

  return (
    <View className="flex-1 justify-between" style={{ backgroundColor: colors.bg }}>
      {/* Ambient color overlay */}
      <View
        className="absolute inset-0"
        style={{ backgroundColor: phaseColor, opacity: 0.12 }}
      />

      {/* Global progress bar */}
      <View className="w-full h-1.5 bg-stone-100 dark:bg-stone-800">
        <View
          className="h-full rounded-r-full"
          style={{
            width: `${Math.min(globalProgress * 100, 100)}%`,
            backgroundColor: phaseColor,
          }}
        />
      </View>

      {/* Top zone: phase info + countdown */}
      <View className="flex-1 items-center justify-center px-6">
        {/* Phase pill badge */}
        <View
          className="rounded-full px-6 py-2 mb-4"
          style={{ backgroundColor: phaseColor + '25' }}
        >
          <Text
            style={{ color: phaseColor }}
            className="text-lg font-bold tracking-wide"
            accessibilityRole="header"
            accessibilityLiveRegion="polite"
            accessibilityLabel={`Phase : ${phaseLabel}`}
          >
            {phaseLabel}
          </Text>
        </View>

        {/* Timer */}
        <TimeDisplay timeRemaining={timeRemaining} />

        {/* Skip button — visible during rest phases only */}
        {isRestPhase && (
          <Pressable
            onPress={handleSkip}
            className="mt-0 mb-6 px-6 py-2 rounded-full bg-stone-200/50 dark:bg-stone-700/50"
            style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.95 : 1 }] }]}
            accessibilityRole="button"
            accessibilityLabel="Passer à la phase suivante"
          >
            <Text className="text-stone-500 dark:text-stone-400 text-sm font-medium">
              Passer ›
            </Text>
          </Pressable>
        )}

        {!isRestPhase && <View className="mb-6" />}

        {/* Progress info */}
        <ProgressInfo
          rep={prog.rep}
          set={prog.set}
          totalSets={prog.totalSets}
          round={prog.round}
          totalRounds={prog.totalRounds}
          reps={config?.reps ?? 0}
        />

        {/* Grip reminder */}
        {gripReminder && (
          <View className="bg-stone-100 dark:bg-stone-800/80 border border-stone-300 dark:border-stone-700/50 rounded-3xl p-4 mb-6 w-full">
            <View className="flex-row items-center mb-1">
              <Ionicons name="hand-left-outline" size={16} color="#F97316" style={{ marginRight: 8 }} />
              <Text className="text-stone-900 dark:text-stone-50 font-bold">Préhension suivante</Text>
            </View>
            <Text className="text-stone-700 dark:text-stone-200">{gripReminder}</Text>
          </View>
        )}

        {/* Load advice */}
        {(phase?.type === 'restSet' || phase?.type === 'restRound') && protocol && (
          <View className="bg-stone-100 dark:bg-stone-800/80 border border-stone-300 dark:border-stone-700/50 rounded-3xl p-4 mb-6 w-full">
            <View className="flex-row items-center mb-1">
              <Ionicons name="bulb-outline" size={16} color="#FBBF24" style={{ marginRight: 8 }} />
              <Text className="text-amber-600 dark:text-amber-400 font-bold text-sm">Charge</Text>
            </View>
            <Text className="text-stone-600 dark:text-stone-300 text-sm">{protocol.loadAdvice}</Text>
          </View>
        )}
      </View>

      {/* Bottom zone: controls in thumb zone */}
      <View
        style={{ paddingBottom: Math.max(insets.bottom, 16) }}
        className="px-6 gap-2"
      >
        <Pressable
          onPress={handlePauseResume}
          className="w-full py-5 rounded-2xl items-center bg-stone-800 dark:bg-stone-200"
          style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.97 : 1 }] }]}
          accessibilityRole="button"
          accessibilityLabel={isPaused ? 'Reprendre la séance' : 'Mettre en pause'}
        >
          <Text className="text-white dark:text-stone-900 text-lg font-bold">
            {isPaused ? 'Reprendre' : 'Pause'}
          </Text>
        </Pressable>

        <Pressable
          onPress={handleStop}
          className="w-full py-3 items-center"
          accessibilityRole="button"
          accessibilityLabel="Arrêter la séance"
        >
          <Text className="text-stone-400 dark:text-stone-500 text-base">
            Arrêter la séance
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
