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
  return (await getJSON<SessionHistoryEntry[]>(KEYS.history)) ?? [];
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

export async function deleteClimbingSession(id: string): Promise<void> {
  const sessions = await loadClimbingSessions();
  await setJSON(KEYS.climbingSessions, sessions.filter((s) => s.id !== id));
}

// --- Settings ---

const SETTINGS_KEY = 'beastmaking:settings';

export async function loadSettings(): Promise<Record<string, boolean> | null> {
  return getJSON<Record<string, boolean>>(SETTINGS_KEY);
}

export async function saveSettings(settings: Record<string, boolean>): Promise<void> {
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
