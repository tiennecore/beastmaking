import { computePhaseSequence, computeTotalDuration, Phase } from '@/lib/timer-engine';
import { TimerConfig } from '@/types';

describe('computePhaseSequence', () => {
  it('generates correct sequence for simple protocol (2 reps x 2 sets, no rounds)', () => {
    const config: TimerConfig = {
      prepDuration: 5,
      hangDuration: 7,
      restBetweenReps: 3,
      reps: 2,
      sets: 2,
      restBetweenSets: 120,
    };

    const phases = computePhaseSequence(config);

    const expected: Phase[] = [
      // PREP
      { type: 'prep', duration: 5, rep: 1, set: 1, round: 1 },
      // Set 1
      { type: 'hang', duration: 7, rep: 1, set: 1, round: 1 },
      { type: 'restRep', duration: 3, rep: 1, set: 1, round: 1 },
      { type: 'hang', duration: 7, rep: 2, set: 1, round: 1 },
      // No REST_REP after last rep
      // REST_SET between set 1 and set 2
      { type: 'restSet', duration: 120, rep: 2, set: 1, round: 1 },
      // Set 2
      { type: 'hang', duration: 7, rep: 1, set: 2, round: 1 },
      { type: 'restRep', duration: 3, rep: 1, set: 2, round: 1 },
      { type: 'hang', duration: 7, rep: 2, set: 2, round: 1 },
      // No REST_SET after last set
    ];

    expect(phases).toEqual(expected);
  });

  it('generates correct sequence with rounds (2 reps x 2 sets x 2 rounds)', () => {
    const config: TimerConfig = {
      prepDuration: 5,
      hangDuration: 7,
      restBetweenReps: 3,
      reps: 2,
      sets: 2,
      restBetweenSets: 120,
      rounds: 2,
      restBetweenRounds: 300,
    };

    const phases = computePhaseSequence(config);

    const expected: Phase[] = [
      // PREP
      { type: 'prep', duration: 5, rep: 1, set: 1, round: 1 },
      // Round 1, Set 1
      { type: 'hang', duration: 7, rep: 1, set: 1, round: 1 },
      { type: 'restRep', duration: 3, rep: 1, set: 1, round: 1 },
      { type: 'hang', duration: 7, rep: 2, set: 1, round: 1 },
      { type: 'restSet', duration: 120, rep: 2, set: 1, round: 1 },
      // Round 1, Set 2
      { type: 'hang', duration: 7, rep: 1, set: 2, round: 1 },
      { type: 'restRep', duration: 3, rep: 1, set: 2, round: 1 },
      { type: 'hang', duration: 7, rep: 2, set: 2, round: 1 },
      // REST_ROUND between round 1 and round 2
      { type: 'restRound', duration: 300, rep: 2, set: 2, round: 1 },
      // Round 2, Set 1
      { type: 'hang', duration: 7, rep: 1, set: 1, round: 2 },
      { type: 'restRep', duration: 3, rep: 1, set: 1, round: 2 },
      { type: 'hang', duration: 7, rep: 2, set: 1, round: 2 },
      { type: 'restSet', duration: 120, rep: 2, set: 1, round: 2 },
      // Round 2, Set 2
      { type: 'hang', duration: 7, rep: 1, set: 2, round: 2 },
      { type: 'restRep', duration: 3, rep: 1, set: 2, round: 2 },
      { type: 'hang', duration: 7, rep: 2, set: 2, round: 2 },
      // No REST_ROUND after last round
    ];

    expect(phases).toEqual(expected);
  });

  it('skips REST_REP when restBetweenReps is 0', () => {
    const config: TimerConfig = {
      prepDuration: 5,
      hangDuration: 10,
      restBetweenReps: 0,
      reps: 1,
      sets: 2,
      restBetweenSets: 60,
    };

    const phases = computePhaseSequence(config);

    const expected: Phase[] = [
      { type: 'prep', duration: 5, rep: 1, set: 1, round: 1 },
      // Set 1: 1 rep, no rest rep
      { type: 'hang', duration: 10, rep: 1, set: 1, round: 1 },
      { type: 'restSet', duration: 60, rep: 1, set: 1, round: 1 },
      // Set 2: 1 rep, no rest rep
      { type: 'hang', duration: 10, rep: 1, set: 2, round: 1 },
      // No REST_SET after last set
    ];

    expect(phases).toEqual(expected);

    // Double-check no restRep phases exist
    const restRepPhases = phases.filter((p) => p.type === 'restRep');
    expect(restRepPhases).toHaveLength(0);
  });

  it('generates minimal sequence for single rep, single set', () => {
    const config: TimerConfig = {
      prepDuration: 5,
      hangDuration: 7,
      restBetweenReps: 3,
      reps: 1,
      sets: 1,
      restBetweenSets: 120,
    };

    const phases = computePhaseSequence(config);

    const expected: Phase[] = [
      { type: 'prep', duration: 5, rep: 1, set: 1, round: 1 },
      { type: 'hang', duration: 7, rep: 1, set: 1, round: 1 },
    ];

    expect(phases).toEqual(expected);
  });

  it('treats undefined rounds as 1 round (no REST_ROUND)', () => {
    const config: TimerConfig = {
      prepDuration: 5,
      hangDuration: 7,
      restBetweenReps: 3,
      reps: 1,
      sets: 2,
      restBetweenSets: 60,
    };

    const phases = computePhaseSequence(config);
    const restRoundPhases = phases.filter((p) => p.type === 'restRound');
    expect(restRoundPhases).toHaveLength(0);
  });
});

describe('computeTotalDuration', () => {
  it('sums all phase durations correctly', () => {
    const phases: Phase[] = [
      { type: 'prep', duration: 5, rep: 1, set: 1, round: 1 },
      { type: 'hang', duration: 7, rep: 1, set: 1, round: 1 },
      { type: 'restRep', duration: 3, rep: 1, set: 1, round: 1 },
      { type: 'hang', duration: 7, rep: 2, set: 1, round: 1 },
      { type: 'restSet', duration: 120, rep: 2, set: 1, round: 1 },
      { type: 'hang', duration: 7, rep: 1, set: 2, round: 1 },
      { type: 'restRep', duration: 3, rep: 1, set: 2, round: 1 },
      { type: 'hang', duration: 7, rep: 2, set: 2, round: 1 },
    ];

    expect(computeTotalDuration(phases)).toBe(5 + 7 + 3 + 7 + 120 + 7 + 3 + 7);
  });

  it('returns 0 for empty phases', () => {
    expect(computeTotalDuration([])).toBe(0);
  });
});
