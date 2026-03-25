import React, { useEffect, useRef, useCallback, useMemo, useState } from 'react';
import { View, Text, Pressable, AppState, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';
import { useThemeColors } from '@/lib/theme';
import { useTimerStore } from '@/stores/timer-store';
import { PHASE_COLORS, PHASE_LABELS } from '@/constants/colors';
import { getGripById, getHoldById } from '@/constants/grips';
import { loadSounds, unloadSounds, playCountdown, playStart, playEnd } from '@/lib/sounds';
import {
  startBackgroundTimer,
  updateBackgroundNotification,
  stopBackgroundTimer,
} from '@/lib/background-timer';
import { TimerPhase } from '@/types';

function formatTime(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const min = Math.floor(s / 60);
  const sec = s % 60;
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
    className="text-stone-900 dark:text-stone-50 mb-4"
    style={{ fontSize: 140, fontVariant: ['tabular-nums'], fontWeight: '900' }}
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
      <Text className="text-stone-400 dark:text-stone-500 text-sm font-semibold uppercase tracking-wide">Rep</Text>
      <Text className="text-stone-900 dark:text-stone-50 text-2xl font-bold">
        {rep}/{reps}
      </Text>
    </View>
    <View className="w-px bg-stone-700/50 self-stretch" />
    <View className="items-center">
      <Text className="text-stone-400 dark:text-stone-500 text-sm font-semibold uppercase tracking-wide">Serie</Text>
      <Text className="text-stone-900 dark:text-stone-50 text-2xl font-bold">
        {set}/{totalSets}
      </Text>
    </View>
    {totalRounds > 1 && (
      <>
        <View className="w-px bg-stone-700/50 self-stretch" />
        <View className="items-center">
          <Text className="text-stone-400 dark:text-stone-500 text-sm font-semibold uppercase tracking-wide">Tour</Text>
          <Text className="text-stone-900 dark:text-stone-50 text-2xl font-bold">
            {round}/{totalRounds}
          </Text>
        </View>
      </>
    )}
  </View>
));

interface GripDetailInfo {
  gripName: string;
  holdAndDetails: string;
}

export default function TimerScreen() {
  useKeepAwake();
  const router = useRouter();
  const [showStopModal, setShowStopModal] = useState(false);
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
  const gripMode = useTimerStore(s => s.gripMode);
  const gripConfigs = useTimerStore(s => s.gripConfigs);
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
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
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
    console.warn('[timer] sound effect — phaseIndex:', currentPhaseIndex, 'phaseType:', phase?.type, 'timeRemaining:', timeRemaining);
    if (currentPhaseIndex !== prevPhaseRef.current) {
      prevPhaseRef.current = currentPhaseIndex;
      console.warn('[timer] phase changed to', phase?.type, '— playing sound for new phase');
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
      console.warn('[timer] countdown beep — timeRemaining:', timeRemaining);
      playCountdown();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [currentPhaseIndex, timeRemaining, phase]);

  const startTicking = useCallback(() => {
    if (intervalRef.current) {
      clearTimeout(intervalRef.current);
      intervalRef.current = null;
    }
    let expectedTime = Date.now() + 1000;
    const scheduleTick = () => {
      if (intervalRef.current === null) return;
      const now = Date.now();
      const drift = now - expectedTime;
      expectedTime += 1000;
      tick();
      const nextDelay = Math.max(0, 1000 - drift);
      intervalRef.current = setTimeout(scheduleTick, nextDelay);
    };
    intervalRef.current = setTimeout(scheduleTick, 1000);
  }, [tick]);

  const stopTicking = useCallback(() => {
    if (intervalRef.current) {
      clearTimeout(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (isRunning && !isPaused) {
      startTicking();
    } else {
      stopTicking();
    }
    return () => stopTicking();
  }, [isRunning, isPaused]);

  useEffect(() => {
    loadSounds().catch(console.error);
    return () => unloadSounds();
  }, []);

  useEffect(() => {
    if (!isRunning && phases.length > 0 && currentPhaseIndex === 0) {
      start();
    }
  }, []);

  useEffect(() => {
    if (isRunning && phase) {
      console.warn('[timer] calling startBackgroundTimer — phase:', phase.type, 'timeRemaining:', timeRemaining);
      startBackgroundTimer(
        NOTIF_PHASE_NAMES[phase.type],
        timeRemaining,
        phaseColor,
        () => { isPaused ? resume() : pauseTimer(); }
      );
    }
    return () => {
      stopBackgroundTimer();
    };
  }, [isRunning]);

  useEffect(() => {
    if (!isRunning || !phase) return;
    updateBackgroundNotification(
      NOTIF_PHASE_NAMES[phase.type],
      timeRemaining,
      phaseColor,
      isPaused
    );
  }, [isRunning, isPaused, currentPhaseIndex, timeRemaining]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'background' || nextState === 'inactive') {
        backgroundTimestampRef.current = Date.now();
      } else if (nextState === 'active' && backgroundTimestampRef.current) {
        const elapsed = (Date.now() - backgroundTimestampRef.current) / 1000;
        backgroundTimestampRef.current = null;
        if (elapsed > 2) {
          fastForward(elapsed);
          startTicking();
        }
      }
    });
    return () => subscription.remove();
  }, [fastForward, startTicking]);

  useEffect(() => {
    if (isDone && !isRunning) {
      router.replace('/recap');
    }
  }, [isDone, isRunning]);

  const handleStop = useCallback(() => {
    pauseTimer();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowStopModal(true);
  }, [pauseTimer]);

  const handleStopCancel = useCallback(() => {
    setShowStopModal(false);
    resume();
  }, [resume]);

  const handleStopSave = useCallback(() => {
    setShowStopModal(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    stopBackgroundTimer();
    stopTimer();
    router.replace('/recap');
  }, [stopTimer, router]);

  const handleStopAbandon = useCallback(() => {
    setShowStopModal(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    stopBackgroundTimer();
    stopTimer();
    router.replace('/');
  }, [stopTimer, router]);

  const handlePauseResume = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    isPaused ? resume() : pauseTimer();
  }, [isPaused, resume, pauseTimer]);

  const handleSkip = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    skipPhase();
  }, [skipPhase]);

  const gripDetailInfo = useMemo((): GripDetailInfo | null => {
    if (!phase || gripConfigs.length === 0) return null;
    const isHang = phase.type === 'hang';
    const isRest = phase.type === 'restRep' || phase.type === 'restSet' || phase.type === 'restRound';
    const isPrep = phase.type === 'prep';
    if (!isHang && !isRest && !isPrep) return null;

    let gcIndex = 0;
    if (gripMode === 'perSet') {
      if (isHang) {
        gcIndex = ((phase.set ?? 1) - 1) % gripConfigs.length;
      } else if (isPrep) {
        gcIndex = 0;
      } else {
        gcIndex = (phase.set ?? 1) % gripConfigs.length;
      }
    }

    const gc = gripConfigs[gcIndex];
    if (!gc) return null;

    const grip = getGripById(gc.grip);
    const hold = getHoldById(gc.hold);
    const gripName = grip?.name ?? '';

    const detailParts: string[] = [];
    if (hold?.name) detailParts.push(hold.name);
    if (gc.angleDeg > 0) detailParts.push(`${gc.angleDeg}°`);
    if (gc.loadKg !== 0) detailParts.push(gc.loadKg > 0 ? `+${gc.loadKg}kg` : `${gc.loadKg}kg`);

    return { gripName, holdAndDetails: detailParts.join(' · ') };
  }, [phase, gripMode, gripConfigs]);

  const nextHangDuration = useMemo((): number | null => {
    if (!phase) return null;
    const isRest = phase.type === 'restRep' || phase.type === 'restSet' || phase.type === 'restRound';
    if (!isRest) return null;
    const nextPhase = phases[currentPhaseIndex + 1];
    if (!nextPhase || nextPhase.type !== 'hang') return null;
    return nextPhase.duration;
  }, [phase, phases, currentPhaseIndex]);

  const isRestPhase = phase &&
    phase.type !== 'hang' &&
    phase.type !== 'prep' &&
    phase.type !== 'done';

  const showSkipButton = phase &&
    (phase.type === 'prep' || isRestPhase);

  return (
    <View className="flex-1 justify-between" style={{ backgroundColor: colors.bg }}>
      {/* Ambient color overlay */}
      <View
        className="absolute inset-0"
        style={{ backgroundColor: phaseColor, opacity: isDark ? 0.20 : 0.30 }}
      />

      {/* Global progress bar */}
      <View className="w-full h-2.5 bg-stone-100 dark:bg-stone-800 overflow-hidden rounded-full">
        <View
          className="h-full rounded-full"
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
            className="text-2xl font-black tracking-widest"
            accessibilityRole="header"
            accessibilityLiveRegion="polite"
            accessibilityLabel={`Phase : ${phaseLabel}`}
          >
            {phaseLabel}
          </Text>
        </View>

        {/* Timer */}
        <TimeDisplay timeRemaining={timeRemaining} />

        {/* Skip button — visible during prep and rest phases */}
        {showSkipButton && (
          <Pressable
            onPress={handleSkip}
            className="w-full mb-6 py-4 rounded-2xl bg-stone-200 dark:bg-stone-700 items-center"
            style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.95 : 1 }] }]}
            accessibilityRole="button"
            accessibilityLabel="Passer à la phase suivante"
          >
            <Text className="text-stone-600 dark:text-stone-300 text-lg font-bold">
              Passer ›
            </Text>
          </Pressable>
        )}

        {!showSkipButton && <View className="mb-6" />}

        {/* Grip info in large text — during prep, hang and rest */}
        {gripDetailInfo && (
          <View className="items-center mb-4 w-full">
            <Text
              className="text-stone-900 dark:text-stone-50 text-4xl font-black text-center mb-1"
              numberOfLines={2}
            >
              {gripDetailInfo.gripName}
            </Text>
            {gripDetailInfo.holdAndDetails.length > 0 && (
              <Text className="text-stone-500 dark:text-stone-400 text-xl text-center">
                {gripDetailInfo.holdAndDetails}
              </Text>
            )}
          </View>
        )}

        {/* Next hang duration during rest */}
        {nextHangDuration !== null && (
          <View className="items-center mb-4">
            <Text className="text-stone-400 dark:text-stone-500 text-xl">
              Accroche · {formatTime(nextHangDuration)}
            </Text>
          </View>
        )}

        {/* Progress info */}
        <ProgressInfo
          rep={prog.rep}
          set={prog.set}
          totalSets={prog.totalSets}
          round={prog.round}
          totalRounds={prog.totalRounds}
          reps={config?.reps ?? 0}
        />

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
          className={`w-full py-5 rounded-2xl items-center ${isPaused ? 'bg-orange-500' : 'bg-stone-800 dark:bg-stone-200'}`}
          style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.97 : 1 }] }]}
          accessibilityRole="button"
          accessibilityLabel={isPaused ? 'Reprendre la séance' : 'Mettre en pause'}
        >
          <Text className={`text-lg font-bold ${isPaused ? 'text-white' : 'text-white dark:text-stone-900'}`}>
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

      <Modal visible={showStopModal} transparent animationType="fade" statusBarTranslucent>
        <Pressable
          className="flex-1 bg-black/50 items-center justify-center px-6"
          onPress={handleStopCancel}
        >
          <Pressable
            className="bg-white dark:bg-stone-900 rounded-3xl p-6 w-full max-w-sm"
            onPress={() => {}}
          >
            <Pressable
              onPress={handleStopCancel}
              className="absolute top-4 right-4 w-11 h-11 items-center justify-center"
              accessibilityRole="button"
              accessibilityLabel="Continuer la séance"
            >
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </Pressable>

            <Text className="text-stone-900 dark:text-stone-50 text-xl font-bold mb-2 pr-10">
              Arrêter la séance ?
            </Text>
            <Text className="text-stone-500 dark:text-stone-400 text-sm mb-6">
              Vous pouvez sauvegarder votre progression ou abandonner complètement.
            </Text>

            <Pressable
              onPress={handleStopSave}
              className="bg-orange-500 rounded-2xl py-4 items-center mb-3"
              style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}
              accessibilityRole="button"
              accessibilityLabel="Sauvegarder la séance"
            >
              <Text className="text-white text-base font-bold">Sauvegarder</Text>
            </Pressable>

            <Pressable
              onPress={handleStopAbandon}
              className="rounded-2xl py-4 items-center"
              style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}
              accessibilityRole="button"
              accessibilityLabel="Abandonner la séance"
            >
              <Text className="text-red-500 text-base font-semibold">Abandonner</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
