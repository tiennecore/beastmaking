import { PlanGoal, PlanSessionType, PlannedSession, TrainingPlanTemplate } from '@/types';

type GeneratorInput = {
  goal: PlanGoal;
  daysPerWeek: number;
  activities: PlanSessionType[];
};

const GOAL_CONFIGS: Record<PlanGoal, { force: number; endurance: number; climbing: number }> = {
  force:     { force: 2, endurance: 0, climbing: 1 },
  endurance: { force: 0, endurance: 2, climbing: 1 },
  mixed:     { force: 1, endurance: 1, climbing: 1 },
  beginner:  { force: 1, endurance: 0, climbing: 1 },
};

const FORCE_PROTOCOLS = ['max-short', 'max-long', 'intermittent', 'tendons'];
const ENDURANCE_PROTOCOLS = ['continuity-long', 'continuity-short'];
const PULLUP_PROTOCOLS = ['weighted-pullups', 'negative-pullups', 'minute-pullups'];

function pickProtocols(type: 'force' | 'endurance' | 'pullups', index: number): string[] {
  const pool = type === 'force' ? FORCE_PROTOCOLS : type === 'endurance' ? ENDURANCE_PROTOCOLS : PULLUP_PROTOCOLS;
  return [pool[index % pool.length]];
}

export function generatePlan(input: GeneratorInput): TrainingPlanTemplate {
  const { goal, daysPerWeek, activities } = input;
  const config = GOAL_CONFIGS[goal];
  const sessions: PlannedSession[] = [];
  let order = 1;
  let forceCount = 0;
  let enduranceCount = 0;
  let climbingCount = 0;
  let lastWasForce = false;

  const hasHangboard = activities.some((a) => a.startsWith('hangboard'));
  const hasBouldering = activities.includes('bouldering');
  const hasRoute = activities.includes('route');
  const hasStrength = activities.includes('strength');

  for (let day = 0; day < daysPerWeek; day++) {
    // Rule: no 2 force sessions back-to-back
    // Rule: endurance never before force -> place endurance after climbing
    // Rule: at least 1 rest day per week

    // Force hangboard
    if (hasHangboard && forceCount < config.force && !lastWasForce) {
      const protocols = pickProtocols('force', forceCount);
      sessions.push({
        id: `s${order}`,
        type: 'hangboard-force',
        label: `Poutre — Force`,
        description: forceCount === 0 ? 'Suspensions max courtes ou intermittentes' : 'Suspensions max longues ou tendons',
        order,
        protocolIds: protocols,
      });
      forceCount++;
      lastWasForce = true;
      order++;
      continue;
    }

    // Climbing (acts as spacer between force sessions)
    if ((hasBouldering || hasRoute) && climbingCount < config.climbing + Math.max(0, daysPerWeek - 3)) {
      const isRoute = hasRoute && (!hasBouldering || climbingCount % 2 === 1);
      sessions.push({
        id: `s${order}`,
        type: isRoute ? 'route' : 'bouldering',
        label: isRoute ? 'Voie' : 'Bloc',
        description: isRoute ? 'Séance voie en salle ou falaise' : 'Séance bloc en salle',
        order,
      });
      climbingCount++;
      lastWasForce = false;
      order++;
      continue;
    }

    // Endurance hangboard (after climbing, never before force)
    if (hasHangboard && enduranceCount < config.endurance) {
      const protocols = pickProtocols('endurance', enduranceCount);
      sessions.push({
        id: `s${order}`,
        type: 'hangboard-endurance',
        label: 'Poutre — Endurance',
        description: enduranceCount === 0 ? 'Continuité longue — endurance aérobie' : 'Continuité courte — anaérobie lactique',
        order,
        protocolIds: protocols,
      });
      enduranceCount++;
      lastWasForce = false;
      order++;
      continue;
    }

    // Strength
    if (hasStrength && day === daysPerWeek - 1) {
      sessions.push({
        id: `s${order}`,
        type: 'strength',
        label: 'Renforcement',
        description: 'Gainage, antagonistes, tractions complémentaires',
        order,
      });
      lastWasForce = false;
      order++;
      continue;
    }

    // Rest / active recovery
    sessions.push({
      id: `s${order}`,
      type: day % 2 === 0 ? 'rest' : 'active-recovery',
      label: day % 2 === 0 ? 'Repos' : 'Récup active',
      description: day % 2 === 0 ? 'Repos complet' : 'Stretching, mobilité, cardio léger',
      order,
    });
    lastWasForce = false;
    order++;
  }

  const totalWeeks = goal === 'endurance' ? 10 : 8;
  const goalLabels: Record<PlanGoal, string> = {
    force: 'Force',
    endurance: 'Endurance',
    mixed: 'Complet',
    beginner: 'Débutant',
  };

  return {
    id: Date.now().toString(),
    name: `Plan ${goalLabels[goal]} ${daysPerWeek}j`,
    description: `Plan personnalisé ${goalLabels[goal].toLowerCase()} — ${daysPerWeek} jours/semaine`,
    goal,
    icon: goal === 'force' ? '⚡' : goal === 'endurance' ? '🌊' : goal === 'mixed' ? '🎯' : '🌱',
    daysPerWeek,
    totalWeeks,
    sessions,
  };
}
