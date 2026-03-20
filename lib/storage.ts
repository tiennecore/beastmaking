import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  history: 'beastmaking:history',
  customWorkouts: 'beastmaking:custom-workouts',
  climbingSessions: 'beastmaking:climbing-sessions',
  activePlan: 'beastmaking:active-plan',
  savedPlans: 'beastmaking:saved-plans',
} as const;

async function getJSON<T>(key: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(key);
  return raw ? JSON.parse(raw) : null;
}

async function setJSON<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

// --- History ---

import { SessionHistoryEntry } from '@/types';

export async function loadHistory(): Promise<SessionHistoryEntry[]> {
  const entries = await getJSON<SessionHistoryEntry[]>(KEYS.history) ?? [];
  return entries.map(entry => {
    const result = entry.result as any;
    if ('grips' in result && !('gripConfigs' in result)) {
      const oldGrips = result.grips as string[];
      const loadKg = result.config?.loadKg ?? 0;
      const { grips: _grips, ...resultWithoutGrips } = result;
      return {
        ...entry,
        result: {
          ...resultWithoutGrips,
          gripMode: 'session' as const,
          gripConfigs: oldGrips.map((g: string) => ({ grip: g, hold: 'flat' as const, loadKg })),
        },
      };
    }
    return entry;
  });
}

export async function saveHistoryEntry(entry: SessionHistoryEntry): Promise<void> {
  const history = await loadHistory();
  history.unshift(entry);
  await setJSON(KEYS.history, history);
}

// --- Custom Workouts ---

import { CustomWorkout } from '@/types';

export async function loadCustomWorkouts(): Promise<CustomWorkout[]> {
  return (await getJSON<CustomWorkout[]>(KEYS.customWorkouts)) ?? [];
}

export async function saveCustomWorkout(workout: CustomWorkout): Promise<void> {
  const workouts = await loadCustomWorkouts();
  workouts.push(workout);
  await setJSON(KEYS.customWorkouts, workouts);
}

export async function updateCustomWorkout(updated: CustomWorkout): Promise<void> {
  const workouts = await loadCustomWorkouts();
  const index = workouts.findIndex((w) => w.id === updated.id);
  if (index >= 0) {
    workouts[index] = updated;
    await setJSON(KEYS.customWorkouts, workouts);
  }
}

export async function deleteCustomWorkout(id: string): Promise<void> {
  const workouts = await loadCustomWorkouts();
  await setJSON(KEYS.customWorkouts, workouts.filter((w) => w.id !== id));
}

// --- Climbing Sessions ---

import { ClimbingSession } from '@/types';

export async function loadClimbingSessions(): Promise<ClimbingSession[]> {
  return (await getJSON<ClimbingSession[]>(KEYS.climbingSessions)) ?? [];
}

export async function saveClimbingSession(session: ClimbingSession): Promise<void> {
  const sessions = await loadClimbingSessions();
  sessions.unshift(session);
  await setJSON(KEYS.climbingSessions, sessions);
}

export async function updateClimbingSession(updated: ClimbingSession): Promise<void> {
  const sessions = await loadClimbingSessions();
  const index = sessions.findIndex((s) => s.id === updated.id);
  if (index >= 0) {
    sessions[index] = updated;
    await setJSON(KEYS.climbingSessions, sessions);
  }
}

export async function deleteClimbingSession(id: string): Promise<void> {
  const sessions = await loadClimbingSessions();
  await setJSON(KEYS.climbingSessions, sessions.filter((s) => s.id !== id));
}

// --- Settings ---

const SETTINGS_KEY = 'beastmaking:settings';

export type AppSettings = {
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  countdownBeep: boolean;
  defaultGrade: string;
  hasHomeHangboard: boolean;
};

export async function loadSettings(): Promise<Partial<AppSettings> | null> {
  return getJSON<Partial<AppSettings>>(SETTINGS_KEY);
}

export async function saveSettings(settings: Partial<AppSettings>): Promise<void> {
  await setJSON(SETTINGS_KEY, settings);
}

// --- Training Plans ---

import { ActivePlan } from '@/types';

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
  durationMinutes?: number,
  weekNumber?: number
): Promise<void> {
  const active = await loadActivePlan();
  if (!active) return;

  const targetWeek = weekNumber ?? active.currentWeek;
  const week = active.weekHistory.find((w) => w.weekNumber === targetWeek);
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

export async function uncompleteSessionInPlan(
  sessionId: string,
  weekNumber: number
): Promise<void> {
  const active = await loadActivePlan();
  if (!active) return;

  const week = active.weekHistory.find((w) => w.weekNumber === weekNumber);
  if (!week) return;

  const completion = week.completions.find((c) => c.sessionId === sessionId);
  if (!completion) return;

  completion.completed = false;
  completion.progress = 0;
  delete completion.completedAt;
  delete completion.durationMinutes;

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

// --- Auto-complete plan session ---

export type AutoCompleteInput =
  | { type: 'climbing'; climbingType: 'bloc' | 'voie' }
  | { type: 'hangboard'; protocolId: string };

export async function tryAutoCompletePlanSession(input: AutoCompleteInput): Promise<void> {
  const active = await loadActivePlan();
  if (!active) return;

  const week = active.weekHistory.find((w) => w.weekNumber === active.currentWeek);
  if (!week) return;

  const sessions = active.plan.sessions;
  let matched = false;

  for (const session of sessions) {
    const completion = week.completions.find((c) => c.sessionId === session.id);
    if (completion?.completed) continue;

    if (input.type === 'climbing') {
      const activityMatch =
        (input.climbingType === 'bloc' && session.climbingActivity === 'bouldering') ||
        (input.climbingType === 'voie' && session.climbingActivity === 'route');

      if (session.mode === 'climbing' && activityMatch) {
        if (!completion) {
          week.completions.push({
            sessionId: session.id,
            completed: true,
            skipped: false,
            completedAt: new Date().toISOString(),
            progress: 2,
          });
        } else {
          completion.completed = true;
          completion.completedAt = new Date().toISOString();
          completion.progress = 2;
        }
        matched = true;
        break;
      }

      if (session.mode === 'climbing-exercise' && activityMatch) {
        const currentProgress = completion?.progress ?? 0;
        if (currentProgress === 0) {
          if (!completion) {
            week.completions.push({
              sessionId: session.id,
              completed: false,
              skipped: false,
              progress: 1,
            });
          } else {
            completion.progress = 1;
          }
          matched = true;
          break;
        }
        if (currentProgress === 1) {
          completion!.completed = true;
          completion!.completedAt = new Date().toISOString();
          completion!.progress = 2;
          matched = true;
          break;
        }
      }
    }

    if (input.type === 'hangboard') {
      if (session.mode === 'exercise' && session.protocolIds?.includes(input.protocolId)) {
        if (!completion) {
          week.completions.push({
            sessionId: session.id,
            completed: true,
            skipped: false,
            completedAt: new Date().toISOString(),
            progress: 2,
          });
        } else {
          completion.completed = true;
          completion.completedAt = new Date().toISOString();
          completion.progress = 2;
        }
        matched = true;
        break;
      }

      if (session.mode === 'climbing-exercise' && session.protocolIds?.includes(input.protocolId)) {
        const currentProgress = completion?.progress ?? 0;
        if (currentProgress === 0) {
          if (!completion) {
            week.completions.push({
              sessionId: session.id,
              completed: false,
              skipped: false,
              progress: 1,
            });
          } else {
            completion.progress = 1;
          }
          matched = true;
          break;
        }
        if (currentProgress === 1) {
          completion!.completed = true;
          completion!.completedAt = new Date().toISOString();
          completion!.progress = 2;
          matched = true;
          break;
        }
      }
    }
  }

  if (matched) {
    await saveActivePlan(active);
  }
}

// --- Clear data ---

export async function clearHistory(): Promise<void> {
  await AsyncStorage.removeItem(KEYS.history);
}

export async function clearCustomWorkouts(): Promise<void> {
  await AsyncStorage.removeItem(KEYS.customWorkouts);
}

export async function clearClimbingSessions(): Promise<void> {
  await AsyncStorage.removeItem(KEYS.climbingSessions);
}
