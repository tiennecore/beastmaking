# Training Plans — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add weekly training plans combining hangboard, climbing, strength, and rest — with templates, a custom generator, and full tracking/stats.

**Architecture:** Static plan templates in constants + a constraint-based generator in a pure function. Active plan stored in AsyncStorage with weekly completion history. 3 new screens (plans list, create plan, active plan view). Auto-completion hooks into existing recap flow.

**Tech Stack:** React Native, Expo Router, TypeScript, NativeWind v4 (dark: variants), AsyncStorage, Zustand (read-only for plan integration).

---

## Task 1: Add plan types

**Files:**
- Modify: `types/index.ts`

**Step 1: Add types at the end of the file, before existing exports end**

```typescript
// Training Plans
export type PlanSessionType =
  | 'hangboard-force'
  | 'hangboard-endurance'
  | 'hangboard-pullups'
  | 'bouldering'
  | 'route'
  | 'strength'
  | 'rest'
  | 'active-recovery';

export type PlanGoal = 'force' | 'endurance' | 'mixed' | 'beginner';

export type PlannedSession = {
  id: string;
  type: PlanSessionType;
  label: string;
  description: string;
  protocolIds?: string[];
  order: number;
};

export type TrainingPlanTemplate = {
  id: string;
  name: string;
  description: string;
  goal: PlanGoal;
  icon: string;
  daysPerWeek: number;
  totalWeeks: number;
  sessions: PlannedSession[];
};

export type SessionCompletion = {
  sessionId: string;
  completed: boolean;
  skipped: boolean;
  completedAt?: string;
  durationMinutes?: number;
};

export type WeekHistory = {
  weekNumber: number;
  startDate: string;
  completions: SessionCompletion[];
};

export type ActivePlan = {
  id: string;
  plan: TrainingPlanTemplate;
  currentWeek: number;
  startDate: string;
  weekHistory: WeekHistory[];
};
```

**Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: 0 errors

---

## Task 2: Create plan templates

**Files:**
- Create: `constants/plans.ts`

**Step 1: Create the templates file**

```typescript
import { TrainingPlanTemplate } from '@/types';

function session(
  id: string,
  type: TrainingPlanTemplate['sessions'][0]['type'],
  label: string,
  description: string,
  order: number,
  protocolIds?: string[]
) {
  return { id, type, label, description, order, protocolIds };
}

export const PLAN_TEMPLATES: TrainingPlanTemplate[] = [
  {
    id: 'beginner-3',
    name: 'Débutant',
    description: 'Initiation à la poutre et à la grimpe régulière. Faible risque de blessure, idéal pour commencer.',
    goal: 'beginner',
    icon: '🌱',
    daysPerWeek: 3,
    totalWeeks: 8,
    sessions: [
      session('s1', 'bouldering', 'Bloc', 'Séance bloc en salle', 1),
      session('s2', 'hangboard-force', 'Poutre — Intermittentes', 'Suspensions intermittentes 7s/3s. Faible risque, idéal pour débuter.', 2, ['intermittent']),
      session('s3', 'route', 'Voie', 'Séance voie en salle ou falaise', 3),
    ],
  },
  {
    id: 'force-4',
    name: 'Force',
    description: 'Développez la force maximale de vos doigts. Alternance max courtes et max longues avec 48h de repos entre chaque.',
    goal: 'force',
    icon: '⚡',
    daysPerWeek: 4,
    totalWeeks: 8,
    sessions: [
      session('s1', 'hangboard-force', 'Poutre — Max courtes', 'Adaptations neuromusculaires rapides. Travaillez frais.', 1, ['max-short']),
      session('s2', 'bouldering', 'Bloc', 'Séance bloc en salle', 2),
      session('s3', 'rest', 'Repos', 'Repos complet — récupération force', 3),
      session('s4', 'hangboard-force', 'Poutre — Max longues', 'Hypertrophie des avant-bras. Gains lents mais durables.', 4, ['max-long']),
    ],
  },
  {
    id: 'endurance-4',
    name: 'Endurance',
    description: 'Améliorez votre capacité à enchaîner. Continuité longue (aérobie) et courte (lactique) sur poutre.',
    goal: 'endurance',
    icon: '🌊',
    daysPerWeek: 4,
    totalWeeks: 10,
    sessions: [
      session('s1', 'route', 'Voie', 'Séance voie — travail volume', 1),
      session('s2', 'hangboard-endurance', 'Poutre — Continuité longue', 'Endurance aérobie, 3 tours de 10 séries. Après la grimpe.', 2, ['continuity-long']),
      session('s3', 'bouldering', 'Bloc', 'Séance bloc en salle', 3),
      session('s4', 'hangboard-endurance', 'Poutre — Continuité courte', 'Anaérobie lactique. Vous devez chuter en fin de séance.', 4, ['continuity-short']),
    ],
  },
  {
    id: 'complete-5',
    name: 'Complet',
    description: 'Programme équilibré : force, endurance et grimpe. Pour grimpeurs réguliers visant une progression globale.',
    goal: 'mixed',
    icon: '🎯',
    daysPerWeek: 5,
    totalWeeks: 8,
    sessions: [
      session('s1', 'hangboard-force', 'Poutre — Force', 'Max courtes ou intermittentes. Travaillez frais.', 1, ['max-short', 'intermittent']),
      session('s2', 'bouldering', 'Bloc', 'Séance bloc en salle', 2),
      session('s3', 'rest', 'Repos', 'Repos complet — récupération', 3),
      session('s4', 'hangboard-endurance', 'Poutre — Endurance', 'Continuité longue après un jour de repos.', 4, ['continuity-long']),
      session('s5', 'route', 'Voie', 'Séance voie — volume et technique', 5),
    ],
  },
];

export const getPlanTemplateById = (id: string) =>
  PLAN_TEMPLATES.find((p) => p.id === id);
```

**Step 2: Verify**

Run: `npx tsc --noEmit`

---

## Task 3: Create plan generator

**Files:**
- Create: `lib/plan-generator.ts`

**Step 1: Create the constraint-based generator**

```typescript
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
    // Rule: endurance never before force → place endurance after climbing
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
```

**Step 2: Verify**

Run: `npx tsc --noEmit`

---

## Task 4: Add storage functions

**Files:**
- Modify: `lib/storage.ts`

**Step 1: Add keys to KEYS constant**

```typescript
const KEYS = {
  history: 'beastmaking:history',
  customWorkouts: 'beastmaking:custom-workouts',
  climbingSessions: 'beastmaking:climbing-sessions',
  activePlan: 'beastmaking:active-plan',
  savedPlans: 'beastmaking:saved-plans',
} as const;
```

**Step 2: Add plan storage functions at the end of the file**

```typescript
// Training Plans
export async function loadActivePlan(): Promise<ActivePlan | null> {
  return getJSON<ActivePlan>(KEYS.activePlan);
}

export async function saveActivePlan(plan: ActivePlan): Promise<void> {
  await setJSON(KEYS.activePlan, plan);
}

export async function clearActivePlan(): Promise<void> {
  await AsyncStorage.removeItem(KEYS.activePlan);
}

export async function completeSessionInPlan(
  sessionId: string,
  durationMinutes?: number
): Promise<void> {
  const active = await loadActivePlan();
  if (!active) return;

  const week = active.weekHistory.find((w) => w.weekNumber === active.currentWeek);
  if (!week) return;

  const existing = week.completions.find((c) => c.sessionId === sessionId);
  if (existing) {
    existing.completed = true;
    existing.completedAt = new Date().toISOString();
    if (durationMinutes) existing.durationMinutes = durationMinutes;
  } else {
    week.completions.push({
      sessionId,
      completed: true,
      skipped: false,
      completedAt: new Date().toISOString(),
      durationMinutes,
    });
  }

  await saveActivePlan(active);
}

export async function skipSessionInPlan(sessionId: string): Promise<void> {
  const active = await loadActivePlan();
  if (!active) return;

  const week = active.weekHistory.find((w) => w.weekNumber === active.currentWeek);
  if (!week) return;

  const existing = week.completions.find((c) => c.sessionId === sessionId);
  if (existing) {
    existing.skipped = true;
  } else {
    week.completions.push({ sessionId, completed: false, skipped: true });
  }

  await saveActivePlan(active);
}

export async function advanceWeek(): Promise<void> {
  const active = await loadActivePlan();
  if (!active) return;

  active.currentWeek++;
  active.weekHistory.push({
    weekNumber: active.currentWeek,
    startDate: new Date().toISOString(),
    completions: [],
  });

  await saveActivePlan(active);
}
```

**Step 3: Add import for ActivePlan type at top of file**

Add `ActivePlan` to the import from `@/types`.

**Step 4: Verify**

Run: `npx tsc --noEmit`

---

## Task 5: Plans list screen

**Files:**
- Create: `app/plans.tsx`

**Step 1: Create the screen**

```typescript
import { useCallback, useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import { PLAN_TEMPLATES } from '@/constants/plans';
import { loadActivePlan, saveActivePlan, clearActivePlan } from '@/lib/storage';
import { useThemeColors } from '@/lib/theme';
import { ActivePlan, TrainingPlanTemplate } from '@/types';

function PlanCard({
  plan,
  onPress,
  active,
}: {
  plan: TrainingPlanTemplate;
  onPress: () => void;
  active: boolean;
}) {
  const colors = useThemeColors();
  return (
    <Pressable
      className="bg-stone-100 dark:bg-stone-800 rounded-3xl p-4 mb-3"
      onPress={onPress}
      style={({ pressed }) => ({
        transform: [{ scale: pressed ? 0.97 : 1 }],
        borderWidth: active ? 2 : 0,
        borderColor: active ? '#F97316' : 'transparent',
      })}
    >
      <View className="flex-row items-center mb-2">
        <Text className="text-3xl mr-3">{plan.icon}</Text>
        <View className="flex-1">
          <Text className="text-stone-900 dark:text-stone-50 text-lg font-bold">
            {plan.name}
          </Text>
          <Text className="text-stone-500 dark:text-stone-400 text-sm">
            {plan.daysPerWeek} jours/sem · {plan.totalWeeks} semaines
          </Text>
        </View>
        {active && (
          <View className="bg-orange-500/15 rounded-full px-2.5 py-1">
            <Text className="text-orange-500 text-xs font-bold">Actif</Text>
          </View>
        )}
      </View>
      <Text className="text-stone-600 dark:text-stone-300 text-sm" numberOfLines={2}>
        {plan.description}
      </Text>
      <View className="flex-row flex-wrap gap-1.5 mt-2">
        {plan.sessions
          .filter((s) => s.type !== 'rest' && s.type !== 'active-recovery')
          .map((s) => (
            <View key={s.id} className="bg-stone-200 dark:bg-stone-700 rounded-full px-2.5 py-0.5">
              <Text className="text-stone-600 dark:text-stone-300 text-xs">{s.label}</Text>
            </View>
          ))}
      </View>
    </Pressable>
  );
}

export default function PlansScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const [activePlan, setActivePlan] = useState<ActivePlan | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadActivePlan().then(setActivePlan);
    }, [])
  );

  const startPlan = (template: TrainingPlanTemplate) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (activePlan) {
      Alert.alert(
        'Plan en cours',
        `Vous avez déjà "${activePlan.plan.name}" en cours. Le remplacer ?`,
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Remplacer',
            style: 'destructive',
            onPress: () => activatePlan(template),
          },
        ]
      );
    } else {
      activatePlan(template);
    }
  };

  const activatePlan = async (template: TrainingPlanTemplate) => {
    const active: ActivePlan = {
      id: Date.now().toString(),
      plan: template,
      currentWeek: 1,
      startDate: new Date().toISOString(),
      weekHistory: [
        { weekNumber: 1, startDate: new Date().toISOString(), completions: [] },
      ],
    };
    await saveActivePlan(active);
    setActivePlan(active);
    router.push(`/plan/${active.id}`);
  };

  const goToActivePlan = () => {
    if (!activePlan) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/plan/${activePlan.id}`);
  };

  return (
    <ScrollView className="flex-1 bg-white dark:bg-stone-950 px-5 pt-4">
      {activePlan && (
        <Pressable
          className="bg-orange-500/10 border border-orange-500/30 rounded-3xl p-4 mb-6"
          onPress={goToActivePlan}
          style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
              <Text className="text-2xl">{activePlan.plan.icon}</Text>
              <View>
                <Text className="text-orange-500 text-xs font-semibold uppercase">Plan actif</Text>
                <Text className="text-stone-900 dark:text-stone-50 text-base font-bold">
                  {activePlan.plan.name}
                </Text>
                <Text className="text-stone-500 dark:text-stone-400 text-sm">
                  Semaine {activePlan.currentWeek}/{activePlan.plan.totalWeeks}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.chevron} />
          </View>
        </Pressable>
      )}

      <Text className="text-stone-500 dark:text-stone-400 text-xs font-semibold uppercase tracking-widest mb-1 ml-1">
        Plans recommandés
      </Text>
      <Text className="text-stone-400 dark:text-stone-500 text-xs mb-3 ml-1">
        Basés sur le livre Beastmaking
      </Text>

      {PLAN_TEMPLATES.map((template) => (
        <PlanCard
          key={template.id}
          plan={template}
          active={activePlan?.plan.id === template.id}
          onPress={() => startPlan(template)}
        />
      ))}

      <Pressable
        className="border border-dashed border-stone-300 dark:border-stone-600 rounded-3xl p-4 mb-3 items-center"
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push('/create-plan');
        }}
      >
        <Ionicons name="add-circle-outline" size={28} color={colors.textMuted} />
        <Text className="text-stone-500 dark:text-stone-400 text-sm mt-1">Créer un plan personnalisé</Text>
      </Pressable>

      <View className="h-8" />
    </ScrollView>
  );
}
```

**Step 2: Verify**

Run: `npx tsc --noEmit`

---

## Task 6: Create plan screen (generator questionnaire)

**Files:**
- Create: `app/create-plan.tsx`

**Step 1: Create the 3-step questionnaire screen**

```typescript
import { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { generatePlan } from '@/lib/plan-generator';
import { saveActivePlan } from '@/lib/storage';
import { PlanGoal, PlanSessionType, ActivePlan } from '@/types';

type Step = 1 | 2 | 3;

const GOALS: { key: PlanGoal; label: string; icon: string; desc: string }[] = [
  { key: 'beginner', label: 'Débutant', icon: '🌱', desc: 'Initiation progressive, faible risque' },
  { key: 'force', label: 'Force', icon: '⚡', desc: 'Force maximale des doigts' },
  { key: 'endurance', label: 'Endurance', icon: '🌊', desc: 'Enchaîner sans faiblir' },
  { key: 'mixed', label: 'Complet', icon: '🎯', desc: 'Équilibre force + endurance' },
];

const DAYS = [3, 4, 5, 6];

const ACTIVITIES: { key: PlanSessionType; label: string; icon: string }[] = [
  { key: 'hangboard-force', label: 'Poutre', icon: '🤏' },
  { key: 'bouldering', label: 'Bloc', icon: '🧗' },
  { key: 'route', label: 'Voie', icon: '🏔️' },
  { key: 'strength', label: 'Muscu', icon: '🏋️' },
];

function OptionCard({
  selected,
  onPress,
  children,
}: {
  selected: boolean;
  onPress: () => void;
  children: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-2xl p-4 mb-3 border ${
        selected
          ? 'bg-orange-500/10 border-orange-500'
          : 'bg-stone-100 dark:bg-stone-800 border-stone-300 dark:border-stone-700/50'
      }`}
      style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}
    >
      {children}
    </Pressable>
  );
}

export default function CreatePlanScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [goal, setGoal] = useState<PlanGoal>('mixed');
  const [days, setDays] = useState(4);
  const [activities, setActivities] = useState<PlanSessionType[]>([
    'hangboard-force',
    'bouldering',
    'route',
  ]);

  const toggleActivity = (key: PlanSessionType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActivities((prev) =>
      prev.includes(key) ? prev.filter((a) => a !== key) : [...prev, key]
    );
  };

  const handleGenerate = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const template = generatePlan({ goal, daysPerWeek: days, activities });
    const active: ActivePlan = {
      id: Date.now().toString(),
      plan: template,
      currentWeek: 1,
      startDate: new Date().toISOString(),
      weekHistory: [
        { weekNumber: 1, startDate: new Date().toISOString(), completions: [] },
      ],
    };
    await saveActivePlan(active);
    router.replace(`/plan/${active.id}`);
  };

  const titles = { 1: 'Objectif', 2: 'Jours par semaine', 3: 'Activités accessibles' };

  return (
    <ScrollView className="flex-1 bg-white dark:bg-stone-950 px-5 pt-4">
      <View className="flex-row items-center gap-2 mb-6">
        {[1, 2, 3].map((s) => (
          <View
            key={s}
            className={`flex-1 h-1 rounded-full ${
              s <= step ? 'bg-orange-500' : 'bg-stone-200 dark:bg-stone-700'
            }`}
          />
        ))}
      </View>

      <Text className="text-stone-900 dark:text-stone-50 text-2xl font-bold mb-1">
        {titles[step]}
      </Text>
      <Text className="text-stone-500 dark:text-stone-400 text-sm mb-6">
        {step === 1 && 'Que voulez-vous travailler en priorité ?'}
        {step === 2 && "Combien de jours pouvez-vous vous entraîner ?"}
        {step === 3 && 'Quelles activités avez-vous à disposition ?'}
      </Text>

      {step === 1 &&
        GOALS.map((g) => (
          <OptionCard
            key={g.key}
            selected={goal === g.key}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setGoal(g.key);
            }}
          >
            <View className="flex-row items-center gap-3">
              <Text className="text-2xl">{g.icon}</Text>
              <View>
                <Text className="text-stone-900 dark:text-stone-50 text-base font-bold">{g.label}</Text>
                <Text className="text-stone-500 dark:text-stone-400 text-sm">{g.desc}</Text>
              </View>
            </View>
          </OptionCard>
        ))}

      {step === 2 && (
        <View className="flex-row gap-3">
          {DAYS.map((d) => (
            <Pressable
              key={d}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setDays(d);
              }}
              className={`flex-1 rounded-2xl py-6 items-center border ${
                days === d
                  ? 'bg-orange-500/10 border-orange-500'
                  : 'bg-stone-100 dark:bg-stone-800 border-stone-300 dark:border-stone-700/50'
              }`}
            >
              <Text className="text-stone-900 dark:text-stone-50 text-2xl font-bold">{d}</Text>
              <Text className="text-stone-500 dark:text-stone-400 text-xs mt-1">jours</Text>
            </Pressable>
          ))}
        </View>
      )}

      {step === 3 && (
        <View className="gap-3">
          {ACTIVITIES.map((a) => (
            <OptionCard
              key={a.key}
              selected={activities.includes(a.key)}
              onPress={() => toggleActivity(a.key)}
            >
              <View className="flex-row items-center gap-3">
                <Text className="text-2xl">{a.icon}</Text>
                <Text className="text-stone-900 dark:text-stone-50 text-base font-bold">{a.label}</Text>
              </View>
            </OptionCard>
          ))}
        </View>
      )}

      <View className="flex-row gap-3 mt-8 mb-8">
        {step > 1 && (
          <Pressable
            className="flex-1 bg-stone-200 dark:bg-stone-700 rounded-2xl py-4 items-center"
            onPress={() => setStep((step - 1) as Step)}
          >
            <Text className="text-stone-900 dark:text-stone-50 font-bold">Retour</Text>
          </Pressable>
        )}
        <Pressable
          className="flex-1 bg-orange-500 rounded-2xl py-4 items-center"
          onPress={() => {
            if (step < 3) setStep((step + 1) as Step);
            else handleGenerate();
          }}
        >
          <Text className="text-white font-bold text-base">
            {step < 3 ? 'Suivant' : 'Générer le plan'}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
```

**Step 2: Verify**

Run: `npx tsc --noEmit`

---

## Task 7: Active plan screen (weekly view + tracking + stats)

**Files:**
- Create: `app/plan/[id].tsx`

**Step 1: Create the plan view screen**

This is the biggest screen. It shows:
- Weekly progress bar
- Session cards with completion status
- Stats section (completion, streak, volume)

```typescript
import { useCallback, useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  loadActivePlan,
  completeSessionInPlan,
  skipSessionInPlan,
  advanceWeek,
  clearActivePlan,
} from '@/lib/storage';
import { useThemeColors } from '@/lib/theme';
import { ActivePlan, PlannedSession, PlanSessionType } from '@/types';

const SESSION_ICONS: Record<PlanSessionType, string> = {
  'hangboard-force': '⚡',
  'hangboard-endurance': '🌊',
  'hangboard-pullups': '🏋️',
  bouldering: '🧗',
  route: '🏔️',
  strength: '💪',
  rest: '😴',
  'active-recovery': '🧘',
};

function SessionCard({
  session,
  completed,
  skipped,
  onComplete,
  onSkip,
}: {
  session: PlannedSession;
  completed: boolean;
  skipped: boolean;
  onComplete: () => void;
  onSkip: () => void;
}) {
  return (
    <View
      className={`rounded-2xl p-4 mb-3 border ${
        completed
          ? 'bg-green-500/10 border-green-500/30'
          : skipped
            ? 'bg-stone-100 dark:bg-stone-800 border-stone-300 dark:border-stone-700/50 opacity-50'
            : 'bg-stone-100 dark:bg-stone-800 border-stone-300 dark:border-stone-700/50'
      }`}
    >
      <View className="flex-row items-center">
        <Text className="text-2xl mr-3">{SESSION_ICONS[session.type]}</Text>
        <View className="flex-1">
          <Text className="text-stone-900 dark:text-stone-50 text-base font-bold">
            {session.label}
          </Text>
          <Text className="text-stone-500 dark:text-stone-400 text-sm" numberOfLines={2}>
            {session.description}
          </Text>
        </View>
        {completed ? (
          <View className="bg-green-500 rounded-full w-8 h-8 items-center justify-center">
            <Ionicons name="checkmark" size={18} color="#fff" />
          </View>
        ) : skipped ? (
          <View className="bg-stone-400 rounded-full w-8 h-8 items-center justify-center">
            <Ionicons name="arrow-forward" size={16} color="#fff" />
          </View>
        ) : (
          <View className="flex-row gap-2">
            <Pressable
              onPress={onComplete}
              className="bg-green-500/15 rounded-full w-8 h-8 items-center justify-center"
            >
              <Ionicons name="checkmark" size={18} color="#22C55E" />
            </Pressable>
            <Pressable
              onPress={onSkip}
              className="bg-stone-200 dark:bg-stone-700 rounded-full w-8 h-8 items-center justify-center"
            >
              <Ionicons name="arrow-forward" size={16} color="#78716c" />
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

export default function PlanViewScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const [activePlan, setActivePlan] = useState<ActivePlan | null>(null);

  const reload = useCallback(() => {
    loadActivePlan().then(setActivePlan);
  }, []);

  useFocusEffect(reload);

  if (!activePlan) {
    return (
      <View className="flex-1 bg-white dark:bg-stone-950 items-center justify-center">
        <Text className="text-stone-500 dark:text-stone-400">Aucun plan actif</Text>
      </View>
    );
  }

  const { plan, currentWeek, weekHistory } = activePlan;
  const currentWeekHistory = weekHistory.find((w) => w.weekNumber === currentWeek);
  const completions = currentWeekHistory?.completions ?? [];

  const completedCount = completions.filter((c) => c.completed).length;
  const skippedCount = completions.filter((c) => c.skipped && !c.completed).length;
  const totalSessions = plan.sessions.length;
  const completionRate = totalSessions > 0 ? Math.round((completedCount / totalSessions) * 100) : 0;

  // Streak: consecutive weeks with >= 80% completion
  const streak = weekHistory
    .filter((w) => w.weekNumber < currentWeek)
    .reverse()
    .reduce((count, w) => {
      const done = w.completions.filter((c) => c.completed).length;
      return done / totalSessions >= 0.8 ? count + 1 : -1;
    }, 0);
  const streakCount = Math.max(0, streak);

  const handleComplete = async (sessionId: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await completeSessionInPlan(sessionId);
    reload();
  };

  const handleSkip = async (sessionId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await skipSessionInPlan(sessionId);
    reload();
  };

  const handleNextWeek = () => {
    if (currentWeek >= plan.totalWeeks) {
      Alert.alert('Plan terminé', 'Félicitations ! Vous avez terminé le plan.', [
        { text: 'OK', onPress: () => clearActivePlan().then(() => router.back()) },
      ]);
      return;
    }
    Alert.alert('Semaine suivante', `Passer à la semaine ${currentWeek + 1} ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Confirmer',
        onPress: async () => {
          await advanceWeek();
          reload();
        },
      },
    ]);
  };

  const handleQuit = () => {
    Alert.alert('Arrêter le plan', 'Voulez-vous arrêter ce plan ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Arrêter',
        style: 'destructive',
        onPress: async () => {
          await clearActivePlan();
          router.back();
        },
      },
    ]);
  };

  return (
    <ScrollView className="flex-1 bg-white dark:bg-stone-950 px-5 pt-4">
      {/* Header */}
      <View className="flex-row items-center mb-4">
        <Text className="text-3xl mr-3">{plan.icon}</Text>
        <View className="flex-1">
          <Text className="text-stone-900 dark:text-stone-50 text-xl font-bold">{plan.name}</Text>
          <Text className="text-stone-500 dark:text-stone-400 text-sm">
            Semaine {currentWeek}/{plan.totalWeeks}
          </Text>
        </View>
      </View>

      {/* Progress bar */}
      <View className="bg-stone-200 dark:bg-stone-700 rounded-full h-2 mb-2">
        <View
          className="bg-orange-500 rounded-full h-2"
          style={{ width: `${completionRate}%` }}
        />
      </View>
      <Text className="text-stone-500 dark:text-stone-400 text-xs mb-6">
        {completedCount}/{totalSessions} séances · {completionRate}%
      </Text>

      {/* Stats row */}
      <View className="flex-row gap-3 mb-6">
        <View className="flex-1 bg-stone-100 dark:bg-stone-800 rounded-2xl p-3 items-center">
          <Text className="text-orange-500 text-xl font-bold">{completedCount}</Text>
          <Text className="text-stone-500 dark:text-stone-400 text-xs">Faites</Text>
        </View>
        <View className="flex-1 bg-stone-100 dark:bg-stone-800 rounded-2xl p-3 items-center">
          <Text className="text-stone-900 dark:text-stone-50 text-xl font-bold">{totalSessions - completedCount - skippedCount}</Text>
          <Text className="text-stone-500 dark:text-stone-400 text-xs">Restantes</Text>
        </View>
        <View className="flex-1 bg-stone-100 dark:bg-stone-800 rounded-2xl p-3 items-center">
          <Text className="text-amber-500 text-xl font-bold">{streakCount}</Text>
          <Text className="text-stone-500 dark:text-stone-400 text-xs">Streak</Text>
        </View>
      </View>

      {/* Session cards */}
      <Text className="text-stone-500 dark:text-stone-400 text-xs font-semibold uppercase tracking-widest mb-3 ml-1">
        Séances de la semaine
      </Text>

      {plan.sessions.map((session) => {
        const completion = completions.find((c) => c.sessionId === session.id);
        return (
          <SessionCard
            key={session.id}
            session={session}
            completed={completion?.completed ?? false}
            skipped={completion?.skipped ?? false}
            onComplete={() => handleComplete(session.id)}
            onSkip={() => handleSkip(session.id)}
          />
        );
      })}

      {/* Actions */}
      <View className="gap-3 mt-4 mb-8">
        <Pressable
          className="bg-orange-500 rounded-2xl py-4 items-center"
          onPress={handleNextWeek}
        >
          <Text className="text-white font-bold text-base">
            {currentWeek >= plan.totalWeeks ? 'Terminer le plan' : 'Semaine suivante →'}
          </Text>
        </Pressable>
        <Pressable
          className="bg-stone-200 dark:bg-stone-700 rounded-2xl py-3 items-center"
          onPress={handleQuit}
        >
          <Text className="text-red-500 dark:text-red-400 font-bold text-sm">Arrêter le plan</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
```

**Step 2: Verify**

Run: `npx tsc --noEmit`

---

## Task 8: Add Plans to main menu

**Files:**
- Modify: `app/index.tsx`

**Step 1: Read the file and find the menu items array**

Add a new menu entry for Plans. Look for the array of menu items (likely objects with label, icon, href, color). Add:

```typescript
{
  label: 'Plans',
  subtitle: "Programmes d'entraînement hebdomadaires",
  icon: 'calendar-outline',
  href: '/plans',
  color: '#A855F7', // purple-500
}
```

Place it after "Protocoles" and before "Entraînements personnalisés" in the menu order.

**Step 2: Verify**

Run: `npx tsc --noEmit`

---

## Task 9: Auto-complete plan sessions from timer recap

**Files:**
- Modify: `app/recap.tsx`

**Step 1: Read the file to understand the existing auto-save pattern**

**Step 2: After the existing history save effect, add plan completion logic**

```typescript
import { loadActivePlan, completeSessionInPlan } from '@/lib/storage';

// Add after the existing saveHistoryEntry effect:
useEffect(() => {
  if (!result || !savedRef.current) return;

  // Check if this protocol matches the active plan
  (async () => {
    const active = await loadActivePlan();
    if (!active) return;

    const currentWeek = active.weekHistory.find(
      (w) => w.weekNumber === active.currentWeek
    );
    if (!currentWeek) return;

    // Find a matching session (hangboard session with this protocol)
    const matchingSession = active.plan.sessions.find((s) => {
      if (!s.protocolIds?.includes(result.protocol.id)) return false;
      const already = currentWeek.completions.find(
        (c) => c.sessionId === s.id && c.completed
      );
      return !already;
    });

    if (matchingSession) {
      await completeSessionInPlan(
        matchingSession.id,
        Math.round(result.totalDuration / 60)
      );
    }
  })();
}, [result]);
```

**Step 3: Verify**

Run: `npx tsc --noEmit`

---

## Task 10: Final verification

**Step 1: TypeScript check**

Run: `npx tsc --noEmit`
Expected: 0 errors

**Step 2: Tests**

Run: `npx jest`
Expected: 7/7 pass (existing tests unchanged)

**Step 3: Visual verification checklist**
- Menu: "Plans" visible with purple icon
- Plans screen: 4 templates listed + "Créer personnalisé"
- Start a template → Active plan view with session cards
- Check/skip sessions → progress bar updates
- Create custom plan → 3-step questionnaire works
- Timer recap → matching plan session auto-completes
