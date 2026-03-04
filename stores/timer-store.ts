import { create } from 'zustand';
import { Phase, computePhaseSequence } from '@/lib/timer-engine';
import { TimerConfig, Protocol, GripType, SessionResult } from '@/types';

type TimerState = {
  protocol: Protocol | null;
  grips: GripType[];
  config: TimerConfig | null;
  phases: Phase[];
  currentPhaseIndex: number;
  timeRemaining: number;
  isRunning: boolean;
  isPaused: boolean;
  startTime: number | null;
  elapsedTotal: number;

  currentPhase: () => Phase | null;
  progress: () => {
    rep: number;
    set: number;
    round: number;
    totalSets: number;
    totalRounds: number;
  };

  setup: (protocol: Protocol, grips: GripType[], config: TimerConfig) => void;
  start: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  tick: () => void;
  getResult: () => SessionResult | null;
};

export const useTimerStore = create<TimerState>((set, get) => ({
  protocol: null,
  grips: [],
  config: null,
  phases: [],
  currentPhaseIndex: 0,
  timeRemaining: 0,
  isRunning: false,
  isPaused: false,
  startTime: null,
  elapsedTotal: 0,

  currentPhase: () => {
    const { phases, currentPhaseIndex } = get();
    return phases[currentPhaseIndex] ?? null;
  },

  progress: () => {
    const { phases, currentPhaseIndex, config } = get();
    const phase = phases[currentPhaseIndex];
    if (!phase || !config) {
      return { rep: 0, set: 0, round: 0, totalSets: 0, totalRounds: 0 };
    }
    return {
      rep: phase.rep ?? 0,
      set: phase.set ?? 0,
      round: phase.round ?? 0,
      totalSets: config.sets,
      totalRounds: config.rounds ?? 1,
    };
  },

  setup: (protocol, grips, config) => {
    const phases = computePhaseSequence(config);
    set({
      protocol,
      grips,
      config,
      phases,
      currentPhaseIndex: 0,
      timeRemaining: phases.length > 0 ? phases[0].duration : 0,
      isRunning: false,
      isPaused: false,
      startTime: null,
      elapsedTotal: 0,
    });
  },

  start: () => {
    set({
      isRunning: true,
      isPaused: false,
      startTime: Date.now(),
    });
  },

  pause: () => {
    set({ isPaused: true });
  },

  resume: () => {
    set({ isPaused: false });
  },

  stop: () => {
    const { startTime } = get();
    const elapsed = startTime ? (Date.now() - startTime) / 1000 : 0;
    set({
      isRunning: false,
      isPaused: false,
      elapsedTotal: elapsed,
    });
  },

  tick: () => {
    const { isRunning, isPaused, timeRemaining, currentPhaseIndex, phases } = get();

    if (!isRunning || isPaused) return;

    const newTimeRemaining = timeRemaining - 1;

    if (newTimeRemaining > 0) {
      set({ timeRemaining: newTimeRemaining });
      return;
    }

    // Phase completed, advance to next
    const nextIndex = currentPhaseIndex + 1;

    if (nextIndex >= phases.length) {
      // All phases done
      const { startTime } = get();
      const elapsed = startTime ? (Date.now() - startTime) / 1000 : 0;
      set({
        timeRemaining: 0,
        currentPhaseIndex: nextIndex,
        isRunning: false,
        elapsedTotal: elapsed,
      });
      return;
    }

    set({
      currentPhaseIndex: nextIndex,
      timeRemaining: phases[nextIndex].duration,
    });
  },

  getResult: () => {
    const { protocol, grips, config, phases, currentPhaseIndex } = get();

    if (!protocol || !config) return null;

    const completed = currentPhaseIndex >= phases.length;

    // Find the last HANG phase before or at currentPhaseIndex to determine progress
    let completedSets = 0;
    let completedRounds = 0;
    const lastIndex = Math.min(currentPhaseIndex, phases.length - 1);

    for (let i = lastIndex; i >= 0; i--) {
      if (phases[i].type === 'hang') {
        completedSets = phases[i].set ?? 0;
        completedRounds = phases[i].round ?? 0;
        break;
      }
    }

    const { startTime } = get();
    const totalDuration = startTime ? (Date.now() - startTime) / 1000 : 0;

    return {
      protocol,
      grips,
      config,
      completedSets,
      completedRounds,
      totalDuration,
      completed,
    };
  },
}));
