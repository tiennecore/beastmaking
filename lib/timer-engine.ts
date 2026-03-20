import { TimerConfig, TimerPhase } from '@/types';

export type Phase = {
  type: TimerPhase;
  duration: number;
  rep?: number;
  set?: number;
  round?: number;
};

export function computePhaseSequence(config: TimerConfig): Phase[] {
  const phases: Phase[] = [];
  const totalRounds = config.rounds ?? 1;

  phases.push({ type: 'prep', duration: config.prepDuration, rep: 1, set: 1, round: 1 });

  for (let round = 1; round <= totalRounds; round++) {
    for (let set = 1; set <= config.sets; set++) {
      for (let rep = 1; rep <= config.reps; rep++) {
        phases.push({ type: 'hang', duration: config.hangDuration, rep, set, round });

        const isLastRep = rep === config.reps;
        if (!isLastRep && config.restBetweenReps > 0) {
          phases.push({ type: 'restRep', duration: config.restBetweenReps, rep, set, round });
        }
      }

      const isLastSetOfRound = set === config.sets;
      if (!isLastSetOfRound) {
        phases.push({
          type: 'restSet',
          duration: config.restBetweenSets,
          rep: config.reps,
          set,
          round,
        });
      }
    }

    const isLastRound = round === totalRounds;
    if (!isLastRound && totalRounds > 1 && (config.restBetweenRounds ?? 0) > 0) {
      phases.push({
        type: 'restRound',
        duration: config.restBetweenRounds ?? 0,
        rep: config.reps,
        set: config.sets,
        round,
      });
    }
  }

  return phases;
}

export function computeTotalDuration(phases: Phase[]): number {
  return phases.reduce((sum, phase) => sum + phase.duration, 0);
}
