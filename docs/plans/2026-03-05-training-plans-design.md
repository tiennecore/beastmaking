# Training Plans — Design Document

## Overview

Add weekly training plans to the app combining hangboard protocols, climbing sessions (route/bouldering), strength training, and rest days. Users can choose from pre-built templates or generate a custom plan via a questionnaire.

## Session Types

| Type | Key | Description |
|------|-----|-------------|
| Poutre Force | `hangboard-force` | Max courtes, max longues, tendons, intermittentes |
| Poutre Endurance | `hangboard-endurance` | Continuité longue, continuité courte |
| Tractions poutre | `hangboard-pullups` | Lestées, négatives, minute |
| Bloc | `bouldering` | Séance bloc salle/extérieur |
| Voie | `route` | Séance voie salle/falaise |
| Renforcement | `strength` | Gainage, antagonistes, muscu |
| Repos | `rest` | Repos complet |
| Récup active | `active-recovery` | Stretching, cardio léger |

## Constraints Engine (from Beastmaking book)

- 48h minimum between hangboard-force sessions
- Endurance NEVER before a force session
- Endurance OK after climbing (bouldering/route)
- Max 2 force hangboard sessions per week
- Max 2 endurance hangboard sessions per week
- Min 1 complete rest day per week
- Pullups: complement only, 1-2x/week max

## Pre-built Templates

| Plan | Days | Sequence |
|------|------|----------|
| Débutant | 3 | Bloc → Poutre intermittentes → Voie |
| Force | 4 | Poutre max courtes → Bloc → Repos → Poutre max longues |
| Endurance | 4 | Voie → Poutre continuité longue → Bloc → Poutre continuité courte |
| Complet | 5 | Poutre force → Bloc → Repos → Poutre endurance → Voie |

Templates are adaptable to the user's chosen number of days.

## Custom Plan Generator

3-step questionnaire:
1. **Goal**: Force / Endurance / Mixed
2. **Days available**: 3 / 4 / 5 / 6
3. **Accessible activities**: Poutre ✓ Bloc ✓ Voie ✓ Muscu ✓ (multi-select)

The generator produces a weekly session sequence respecting all constraints.

## Screens

- `app/plans.tsx` — Plan selection: templates gallery + "Create custom" button
- `app/create-plan.tsx` — Generator questionnaire (3 steps)
- `app/plan/[id].tsx` — Active plan: weekly view, session cards, stats

## Data Model

```typescript
type PlanSessionType =
  | 'hangboard-force'
  | 'hangboard-endurance'
  | 'hangboard-pullups'
  | 'bouldering'
  | 'route'
  | 'strength'
  | 'rest'
  | 'active-recovery';

type PlannedSession = {
  id: string;
  type: PlanSessionType;
  label: string;
  description: string;
  protocolIds?: string[];       // Linked protocols for hangboard sessions
  order: number;                // Position in the weekly sequence
};

type PlanGoal = 'force' | 'endurance' | 'mixed' | 'beginner';

type TrainingPlan = {
  id: string;
  name: string;
  description: string;
  goal: PlanGoal;
  daysPerWeek: number;
  sessions: PlannedSession[];
  totalWeeks: number;           // Recommended plan duration
  createdAt: string;
};

type SessionCompletion = {
  sessionId: string;
  completed: boolean;
  skipped: boolean;
  completedAt?: string;
  durationMinutes?: number;
};

type WeekHistory = {
  weekNumber: number;
  startDate: string;
  completions: SessionCompletion[];
  completionRate: number;
};

type ActivePlan = {
  plan: TrainingPlan;
  currentWeek: number;
  startDate: string;
  weekHistory: WeekHistory[];
};
```

## Tracking

### Weekly View (plan/[id].tsx main content)
- Each session = card with icon, type, linked protocols, status
- Status: ⬜ To do / ✅ Done / ⏭️ Skipped
- Constraint warnings visible (e.g., "48h rest before next force")

### Weekly Stats (top of plan screen)
- Completion: `3/5 sessions` with progress bar
- Hangboard volume: `45 min` (sum of completed timers)
- Climbing volume: `2 sessions`
- Remaining: `2 sessions left this week`

### Global Stats (expandable section)
- Streak: consecutive weeks with ≥80% completion
- Adherence: average completion % over last 4 weeks
- Volume/week: stacked bar chart (hangboard, climbing, strength) per week
- Distribution: % force vs endurance vs climbing vs rest
- Current week: "Week 5/8"
- Best week: completion record

### Completion Logic
- Hangboard: auto-marked when timer finishes on recap screen (if protocol matches plan)
- Climbing/strength: manual mark (button on card) or via existing climbing screen
- Rest: auto-marked if no session logged that day

### History
- Horizontal scroll week by week
- Each past week shows: completion rate + compact summary

## Persistence

AsyncStorage via lib/storage.ts (consistent with existing app patterns):
- `@beastmaking_active_plan` — current active plan + week history
- `@beastmaking_plans` — saved custom plans

## Navigation

Add "Plans" entry to the main menu (app/index.tsx) alongside existing items.
