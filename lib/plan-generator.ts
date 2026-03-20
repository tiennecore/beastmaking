import { ClimbingActivity, PlanGoal, PlannedSession, SessionMode, TrainingPlanTemplate } from '@/types';

type ActivityKey = 'hangboard' | 'bouldering' | 'route' | 'strength';

type GeneratorInput = {
  goal: PlanGoal;
  daysPerWeek: number;
  activities: ActivityKey[];
  hasHomeHangboard?: boolean;
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
  const { goal, daysPerWeek, activities, hasHomeHangboard = false } = input;
  const config = GOAL_CONFIGS[goal];
  const sessions: PlannedSession[] = [];
  let order = 1;
  let forceCount = 0;
  let enduranceCount = 0;
  let climbingCount = 0;
  let lastWasForce = false;

  const hasHangboard = activities.includes('hangboard');
  const hasBouldering = activities.includes('bouldering');
  const hasRoute = activities.includes('route');
  const hasStrength = activities.includes('strength');

  for (let day = 0; day < daysPerWeek; day++) {
    // Force hangboard
    if (hasHangboard && forceCount < config.force && !lastWasForce) {
      const protocols = pickProtocols('force', forceCount);

      if (hasHomeHangboard) {
        // Standalone session at home
        sessions.push({
          id: `s${order}`,
          mode: 'exercise',
          label: 'Poutre — Force',
          description: forceCount === 0 ? 'Suspensions max courtes ou intermittentes' : 'Suspensions max longues ou tendons',
          order,
          protocolIds: protocols,
          restAfterHours: 48,
        });
      } else {
        // Must combine with climbing at the gym — defer to climbing block
        // by not adding a standalone session; will be combined below
        forceCount++;
        lastWasForce = true;
        order++;
        // Add the combined session now
        if (hasBouldering || hasRoute) {
          const isRoute = hasRoute && !hasBouldering;
          const climbingActivity: ClimbingActivity = isRoute ? 'route' : 'bouldering';
          sessions.push({
            id: `s${order - 1}`,
            mode: 'climbing-exercise',
            label: isRoute ? 'Voie + Poutre' : 'Bloc + Poutre',
            description: 'Séance de grimpe avec poutre intégrée.',
            order: order - 1,
            climbingActivity,
            exerciseTiming: 'after',
            protocolIds: protocols,
            restAfterHours: 48,
          });
          climbingCount++;
        }
        continue;
      }

      forceCount++;
      lastWasForce = true;
      order++;
      continue;
    }

    // Climbing (acts as spacer between force sessions)
    if ((hasBouldering || hasRoute) && climbingCount < config.climbing + Math.max(0, daysPerWeek - 3)) {
      const isRoute = hasRoute && (!hasBouldering || climbingCount % 2 === 1);
      const climbingActivity: ClimbingActivity = isRoute ? 'route' : 'bouldering';

      // If endurance is needed:
      // - with home hangboard: combine with climbing at gym
      // - without home hangboard: always combine (no standalone option)
      const shouldCombineEndurance = hasHangboard && enduranceCount < config.endurance && climbingCount > 0;
      if (shouldCombineEndurance) {
        const protocols = pickProtocols('endurance', enduranceCount);
        sessions.push({
          id: `s${order}`,
          mode: 'climbing-exercise',
          label: isRoute ? 'Voie + Poutre' : 'Bloc + Poutre',
          description: 'Séance de grimpe suivie de continuité sur poutre.',
          order,
          climbingActivity,
          exerciseTiming: 'after',
          protocolIds: protocols,
          restAfterHours: 48,
        });
        enduranceCount++;
      } else {
        sessions.push({
          id: `s${order}`,
          mode: 'climbing',
          label: isRoute ? 'Voie' : 'Bloc',
          description: isRoute ? 'Séance voie en salle ou falaise' : 'Séance bloc en salle',
          order,
          climbingActivity,
          restAfterHours: 24,
        });
      }
      climbingCount++;
      lastWasForce = false;
      order++;
      continue;
    }

    // Standalone endurance hangboard
    if (hasHangboard && enduranceCount < config.endurance) {
      const protocols = pickProtocols('endurance', enduranceCount);

      if (hasHomeHangboard) {
        // Can do it at home
        sessions.push({
          id: `s${order}`,
          mode: 'exercise',
          label: 'Poutre — Endurance',
          description: enduranceCount === 0 ? 'Continuité longue — endurance aérobie' : 'Continuité courte — anaérobie lactique',
          order,
          protocolIds: protocols,
          restAfterHours: 48,
        });
        enduranceCount++;
        lastWasForce = false;
        order++;
        continue;
      }
      // Without home hangboard: skip standalone endurance — it must be combined with climbing
      // (already handled in the climbing block above)
      enduranceCount++;
      continue;
    }

    // Strength
    if (hasStrength && day === daysPerWeek - 1) {
      sessions.push({
        id: `s${order}`,
        mode: 'exercise',
        label: 'Renforcement',
        description: 'Gainage, antagonistes, tractions complémentaires',
        order,
        restAfterHours: 24,
      });
      lastWasForce = false;
      order++;
      continue;
    }

    // Filler climbing session if slots remain
    if (hasBouldering || hasRoute) {
      const climbingActivity: ClimbingActivity = hasRoute ? 'route' : 'bouldering';
      sessions.push({
        id: `s${order}`,
        mode: 'climbing',
        label: hasRoute ? 'Voie' : 'Bloc',
        description: hasRoute ? 'Séance voie en salle ou falaise' : 'Séance bloc en salle',
        order,
        climbingActivity,
        restAfterHours: 24,
      });
      climbingCount++;
      lastWasForce = false;
      order++;
    }
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
