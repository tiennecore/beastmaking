import { ClimbingActivity, ExerciseTiming, PlannedSession, SessionMode, TrainingPlanTemplate } from '@/types';

function session(
  id: string,
  mode: SessionMode,
  label: string,
  description: string,
  order: number,
  options?: {
    climbingActivity?: ClimbingActivity;
    protocolIds?: string[];
    exerciseTiming?: ExerciseTiming;
    restAfterHours?: number;
  }
): PlannedSession {
  return { id, mode, label, description, order, ...options };
}

function buildBeginnerSessions(hasHomeHangboard: boolean): PlannedSession[] {
  if (hasHomeHangboard) {
    return [
      session('s1', 'climbing', 'Bloc', 'Séance bloc en salle', 1, {
        climbingActivity: 'bouldering',
        restAfterHours: 24,
      }),
      session('s2', 'exercise', 'Poutre — Intermittentes', 'Suspensions 7s/3s à la maison. Idéal pour débuter la poutre.', 2, {
        protocolIds: ['intermittent'],
        restAfterHours: 24,
      }),
      session('s3', 'climbing', 'Voie', 'Séance voie en salle ou falaise', 3, {
        climbingActivity: 'route',
        restAfterHours: 48,
      }),
    ];
  }
  return [
    session('s1', 'climbing', 'Bloc', 'Séance bloc en salle', 1, {
      climbingActivity: 'bouldering',
      restAfterHours: 24,
    }),
    session('s2', 'climbing-exercise', 'Bloc + Poutre', 'Séance bloc suivie de suspensions intermittentes 7s/3s. Idéal pour débuter la poutre.', 2, {
      climbingActivity: 'bouldering',
      exerciseTiming: 'after',
      protocolIds: ['intermittent'],
      restAfterHours: 48,
    }),
    session('s3', 'climbing', 'Voie', 'Séance voie en salle ou falaise', 3, {
      climbingActivity: 'route',
      restAfterHours: 48,
    }),
  ];
}

function buildForceSessions(hasHomeHangboard: boolean): PlannedSession[] {
  if (hasHomeHangboard) {
    return [
      session('s1', 'exercise', 'Poutre — Max courtes', 'Adaptations neuromusculaires rapides. Travaillez frais.', 1, {
        protocolIds: ['max-short'],
        restAfterHours: 48,
      }),
      session('s2', 'climbing', 'Bloc', 'Séance bloc en salle', 2, {
        climbingActivity: 'bouldering',
        restAfterHours: 24,
      }),
      session('s3', 'exercise', 'Poutre — Max longues', 'Hypertrophie des avant-bras. Gains lents mais durables.', 3, {
        protocolIds: ['max-long'],
        restAfterHours: 48,
      }),
      session('s4', 'climbing', 'Bloc', 'Séance bloc en salle', 4, {
        climbingActivity: 'bouldering',
        restAfterHours: 48,
      }),
    ];
  }
  return [
    session('s1', 'climbing-exercise', 'Bloc + Max courtes', 'Séance bloc suivie de suspensions max courtes. Adaptations neuromusculaires.', 1, {
      climbingActivity: 'bouldering',
      exerciseTiming: 'after',
      protocolIds: ['max-short'],
      restAfterHours: 48,
    }),
    session('s2', 'climbing', 'Bloc', 'Séance bloc en salle', 2, {
      climbingActivity: 'bouldering',
      restAfterHours: 24,
    }),
    session('s3', 'climbing-exercise', 'Bloc + Max longues', 'Séance bloc suivie de suspensions max longues. Hypertrophie.', 3, {
      climbingActivity: 'bouldering',
      exerciseTiming: 'after',
      protocolIds: ['max-long'],
      restAfterHours: 48,
    }),
    session('s4', 'climbing', 'Voie — Continuité courte', 'Intensité ~70%, enchaîner 10-30 mouvements durs, ratio repos 1:3 (1 min grimpe → 3 min repos), 4-5 tours. Objectif : chuter sur les 2 derniers tours.', 4, {
      climbingActivity: 'route',
      restAfterHours: 48,
    }),
  ];
}

function buildEnduranceSessions(hasHomeHangboard: boolean): PlannedSession[] {
  if (hasHomeHangboard) {
    return [
      session('s1', 'climbing', 'Voie — Continuité longue', 'Intensité ~40%, grimpe facile 15 min, ratio repos 1:1 (15 min grimpe → 15 min repos), 3 tours. Objectif : fatigue 3/10, jamais avant une séance de force.', 1, {
        climbingActivity: 'route',
        restAfterHours: 24,
      }),
      session('s2', 'exercise', 'Poutre — Continuité longue', 'Endurance aérobie à la maison. 3 tours de 10 séries.', 2, {
        protocolIds: ['continuity-long'],
        restAfterHours: 48,
      }),
      session('s3', 'climbing', 'Bloc', 'Séance bloc en salle', 3, {
        climbingActivity: 'bouldering',
        restAfterHours: 24,
      }),
      session('s4', 'exercise', 'Poutre — Continuité courte', 'Anaérobie lactique à la maison. Vous devez chuter en fin de séance.', 4, {
        protocolIds: ['continuity-short'],
        restAfterHours: 48,
      }),
    ];
  }
  return [
    session('s1', 'climbing-exercise', 'Voie — Continuité longue + Poutre', 'Grimpe voie en continuité longue (~40%, 3 tours de 15 min avec 15 min repos), puis continuité longue sur poutre. Endurance aérobie.', 1, {
      climbingActivity: 'route',
      exerciseTiming: 'after',
      protocolIds: ['continuity-long'],
      restAfterHours: 48,
    }),
    session('s2', 'climbing', 'Bloc', 'Séance bloc en salle', 2, {
      climbingActivity: 'bouldering',
      restAfterHours: 24,
    }),
    session('s3', 'climbing-exercise', 'Bloc + Continuité courte', 'Séance bloc suivie de continuité courte. Anaérobie lactique.', 3, {
      climbingActivity: 'bouldering',
      exerciseTiming: 'after',
      protocolIds: ['continuity-short'],
      restAfterHours: 48,
    }),
    session('s4', 'climbing', 'Voie — Continuité courte', 'Intensité ~70%, enchaîner 10-30 mouvements durs, ratio repos 1:3 (1 min grimpe → 3 min repos), 4-5 tours. Objectif : chuter sur les 2 derniers tours.', 4, {
      climbingActivity: 'route',
      restAfterHours: 48,
    }),
  ];
}

function buildCompleteSessions(hasHomeHangboard: boolean): PlannedSession[] {
  if (hasHomeHangboard) {
    return [
      session('s1', 'exercise', 'Poutre — Force', 'Max courtes ou intermittentes à la maison. Travaillez frais.', 1, {
        protocolIds: ['max-short', 'intermittent'],
        restAfterHours: 48,
      }),
      session('s2', 'climbing', 'Bloc', 'Séance bloc en salle', 2, {
        climbingActivity: 'bouldering',
        restAfterHours: 24,
      }),
      session('s3', 'climbing-exercise', 'Voie — Continuité longue + Poutre', 'Continuité longue en voie (~40%, 3 tours de 15 min, ratio 1:1), suivie de continuité longue sur poutre. Ne pas placer avant une séance de force.', 3, {
        climbingActivity: 'route',
        exerciseTiming: 'after',
        protocolIds: ['continuity-long'],
        restAfterHours: 48,
      }),
      session('s4', 'climbing', 'Voie — Continuité courte', 'Intensité ~70%, 10-30 mouvements durs, ratio repos 1:3 (1 min grimpe → 3 min repos), 4-5 tours. Objectif : chuter sur les 2 derniers tours.', 4, {
        climbingActivity: 'route',
        restAfterHours: 24,
      }),
      session('s5', 'exercise', 'Poutre — Max courtes', 'Suspensions max courtes à la maison.', 5, {
        protocolIds: ['max-short'],
        restAfterHours: 48,
      }),
    ];
  }
  return [
    session('s1', 'climbing-exercise', 'Poutre + Bloc', 'Séance de force sur poutre avant le bloc.', 1, {
      climbingActivity: 'bouldering',
      exerciseTiming: 'before',
      protocolIds: ['max-short'],
      restAfterHours: 48,
    }),
    session('s2', 'climbing', 'Voie — Continuité courte', 'Intensité ~70%, 10-30 mouvements durs, ratio repos 1:3 (1 min grimpe → 3 min repos), 4-5 tours. Objectif : chuter sur les 2 derniers tours.', 2, {
      climbingActivity: 'route',
      restAfterHours: 24,
    }),
    session('s3', 'climbing-exercise', 'Voie — Continuité longue + Poutre', 'Continuité longue en voie (~40%, 3 tours de 15 min, ratio 1:1), suivie de continuité longue sur poutre. Ne pas placer avant une séance de force.', 3, {
      climbingActivity: 'route',
      exerciseTiming: 'after',
      protocolIds: ['continuity-long'],
      restAfterHours: 48,
    }),
    session('s4', 'climbing', 'Bloc', 'Séance bloc en salle', 4, {
      climbingActivity: 'bouldering',
      restAfterHours: 24,
    }),
    session('s5', 'climbing-exercise', 'Bloc + Poutre', 'Séance de bloc suivie d\'intermittentes.', 5, {
      climbingActivity: 'bouldering',
      exerciseTiming: 'after',
      protocolIds: ['intermittent'],
      restAfterHours: 48,
    }),
  ];
}

export function getPlanTemplates(hasHomeHangboard: boolean): TrainingPlanTemplate[] {
  return [
    {
      id: 'beginner-3',
      name: 'Débutant',
      description: 'Initiation à la poutre et à la grimpe régulière. Faible risque de blessure, idéal pour commencer.',
      goal: 'beginner',
      icon: '🌱',
      daysPerWeek: 3,
      totalWeeks: 8,
      sessions: buildBeginnerSessions(hasHomeHangboard),
    },
    {
      id: 'force-4',
      name: 'Force',
      description: 'Développez la force maximale de vos doigts. Alternance max courtes et max longues avec 48h de repos entre chaque.',
      goal: 'force',
      icon: '⚡',
      daysPerWeek: 4,
      totalWeeks: 8,
      sessions: buildForceSessions(hasHomeHangboard),
    },
    {
      id: 'endurance-4',
      name: 'Endurance',
      description: 'Améliorez votre capacité à enchaîner. Continuité longue (aérobie) et courte (lactique) sur poutre.',
      goal: 'endurance',
      icon: '🌊',
      daysPerWeek: 4,
      totalWeeks: 10,
      sessions: buildEnduranceSessions(hasHomeHangboard),
    },
    {
      id: 'complete-5',
      name: 'Complet',
      description: 'Programme équilibré : force, endurance et grimpe. Pour grimpeurs réguliers visant une progression globale.',
      goal: 'mixed',
      icon: '🎯',
      daysPerWeek: 5,
      totalWeeks: 8,
      sessions: buildCompleteSessions(hasHomeHangboard),
    },
  ];
}

export const PLAN_TEMPLATES = getPlanTemplates(false);

export const getPlanTemplateById = (id: string) =>
  PLAN_TEMPLATES.find((p) => p.id === id);
