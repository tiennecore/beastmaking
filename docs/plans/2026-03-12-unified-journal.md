# Unified Training Journal — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the separate History and Climbing screens with a single "Journal" screen showing all training activity in a unified chronological timeline with weekly stats, filters, and a quick-log bottom sheet.

**Architecture:** One new screen `app/journal.tsx` merges data from two AsyncStorage stores (hangboard history + climbing sessions) via a `useJournalEntries()` hook. A detail page `app/journal/[id].tsx` handles read-only hangboard view and editable climbing view. The old `app/history.tsx` and `app/climbing.tsx` are deleted. Components from `climbing.tsx` (GradeStepper, LocationInput, ClimbEntryCard, etc.) are extracted to reusable files under `components/journal/`.

**Tech Stack:** React Native 0.81, Expo 54, TypeScript, NativeWind v4, Zustand, AsyncStorage, expo-haptics, react-native-reanimated, @react-native-community/datetimepicker

---

## Wave 1: Data Layer & Types (independent, no UI)

### Task 1: Add JournalEntry types

**Files:**
- Modify: `types/index.ts`

**Step 1: Add the union type and stats type at the end of `types/index.ts`**

```typescript
// --- Journal ---

export type JournalFilter = 'all' | 'hangboard' | 'bloc' | 'voie';

export type JournalEntry =
  | { type: 'hangboard'; data: SessionHistoryEntry }
  | { type: 'climbing'; data: ClimbingSession };

export type GroupedJournalDay = {
  dateKey: string; // YYYY-MM-DD
  label: string;   // "Lundi 10 mars"
  entries: JournalEntry[];
};

export type WeeklyStats = {
  sessionsThisWeek: number;
  streakDays: number;
  suspensionMinutesThisWeek: number;
};
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add types/index.ts
git commit -m "feat: add JournalEntry union type and WeeklyStats"
```

---

### Task 2: Create useJournalEntries hook

**Files:**
- Create: `hooks/useJournalEntries.ts`

**Step 1: Write the hook**

This hook loads both data sources, merges them into a unified timeline, groups by day, computes weekly stats, and applies filters.

```typescript
import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { loadHistory, loadClimbingSessions } from '@/lib/storage';
import type {
  SessionHistoryEntry,
  ClimbingSession,
  JournalEntry,
  JournalFilter,
  GroupedJournalDay,
  WeeklyStats,
} from '@/types';

function getDateKey(isoDate: string): string {
  // Handle both full ISO (2026-03-10T14:30:00.000Z) and date-only (2026-03-10)
  return isoDate.slice(0, 10);
}

function formatDayLabel(dateKey: string): string {
  const d = new Date(dateKey + 'T12:00:00');
  return d.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function computeStats(
  history: SessionHistoryEntry[],
  climbing: ClimbingSession[]
): WeeklyStats {
  const now = new Date();
  const monday = getMonday(now);
  const mondayTime = monday.getTime();

  // Sessions this week
  const hangboardThisWeek = history.filter(
    (e) => new Date(e.date).getTime() >= mondayTime
  );
  const climbingThisWeek = climbing.filter(
    (s) => new Date(s.date + 'T12:00:00').getTime() >= mondayTime
  );
  const sessionsThisWeek = hangboardThisWeek.length + climbingThisWeek.length;

  // Suspension minutes this week (hangboard only, completed sessions)
  const suspensionMinutesThisWeek = Math.round(
    hangboardThisWeek
      .filter((e) => e.result.completed)
      .reduce((sum, e) => sum + e.result.totalDuration, 0) / 60
  );

  // Streak: consecutive days with at least one session (going backward from today)
  const allDates = new Set<string>();
  history.forEach((e) => allDates.add(getDateKey(e.date)));
  climbing.forEach((s) => allDates.add(s.date.slice(0, 10)));

  let streakDays = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkDate = new Date(today);

  while (true) {
    const key =
      checkDate.getFullYear() +
      '-' +
      String(checkDate.getMonth() + 1).padStart(2, '0') +
      '-' +
      String(checkDate.getDate()).padStart(2, '0');
    if (allDates.has(key)) {
      streakDays++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return { sessionsThisWeek, streakDays, suspensionMinutesThisWeek };
}

export function useJournalEntries(filter: JournalFilter = 'all') {
  const [history, setHistory] = useState<SessionHistoryEntry[]>([]);
  const [climbing, setClimbing] = useState<ClimbingSession[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const [h, c] = await Promise.all([loadHistory(), loadClimbingSessions()]);
    setHistory(h);
    setClimbing(c);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const { days, stats } = useMemo(() => {
    // Build unified entries
    let entries: JournalEntry[] = [
      ...history.map((h) => ({ type: 'hangboard' as const, data: h })),
      ...climbing.map((c) => ({ type: 'climbing' as const, data: c })),
    ];

    // Apply filter
    if (filter === 'hangboard') {
      entries = entries.filter((e) => e.type === 'hangboard');
    } else if (filter === 'bloc') {
      entries = entries.filter(
        (e) => e.type === 'climbing' && e.data.type === 'bloc'
      );
    } else if (filter === 'voie') {
      entries = entries.filter(
        (e) => e.type === 'climbing' && e.data.type === 'voie'
      );
    }

    // Group by day
    const dayMap = new Map<string, JournalEntry[]>();
    for (const entry of entries) {
      const dateKey =
        entry.type === 'hangboard'
          ? getDateKey(entry.data.date)
          : entry.data.date.slice(0, 10);
      const group = dayMap.get(dateKey);
      if (group) {
        group.push(entry);
      } else {
        dayMap.set(dateKey, [entry]);
      }
    }

    // Sort days descending
    const sortedKeys = [...dayMap.keys()].sort((a, b) => b.localeCompare(a));
    const days: GroupedJournalDay[] = sortedKeys.map((dateKey) => ({
      dateKey,
      label: formatDayLabel(dateKey),
      entries: dayMap.get(dateKey)!,
    }));

    // Stats always computed from unfiltered data
    const stats = computeStats(history, climbing);

    return { days, stats };
  }, [history, climbing, filter]);

  return { days, stats, loading, reload };
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add hooks/useJournalEntries.ts
git commit -m "feat: add useJournalEntries hook with stats and filtering"
```

---

## Wave 2: Extract Reusable Components from climbing.tsx

These components currently live inside `app/climbing.tsx` and need to be extracted so they can be reused by the journal detail page. Each task is independent.

### Task 3: Extract climbing constants and helpers

**Files:**
- Create: `constants/climbing.ts`

**Step 1: Create the constants file**

Extract from `app/climbing.tsx` lines 36-106: CLIMBING_TYPES, DIFFICULTY_LEVELS, TYPE_COLORS, DIFFICULTY_LABELS, BOULDER_COLORS, and helper functions (todayIso, formatDate, isoToDate, dateToIso, extractUniqueLocations, newClimbEntry).

```typescript
import * as Haptics from 'expo-haptics';
import { BoulderColor, ClimbEntry, ClimbingSession, ClimbingType, DifficultyLevel } from '@/types';
import { DEFAULT_GRADE } from '@/constants/grades';

export const CLIMBING_TYPES: { value: ClimbingType; label: string }[] = [
  { value: 'bloc', label: 'Bloc' },
  { value: 'voie', label: 'Voie' },
];

export const DIFFICULTY_LEVELS: { value: DifficultyLevel; label: string }[] = [
  { value: 'easy', label: 'Facile' },
  { value: 'medium', label: 'Moyen' },
  { value: 'hard', label: 'Dur' },
  { value: 'max', label: 'Max' },
];

export const TYPE_COLORS: Record<ClimbingType, string> = {
  bloc: '#F97316',
  voie: '#2563EB',
};

export const DIFFICULTY_LABELS: Record<DifficultyLevel, string> = {
  easy: 'Facile',
  medium: 'Moyen',
  hard: 'Dur',
  max: 'Max',
};

export const BOULDER_COLORS: { value: BoulderColor; label: string; hex: string }[] = [
  { value: 'yellow', label: 'Jaune', hex: '#EAB308' },
  { value: 'green', label: 'Vert', hex: '#22C55E' },
  { value: 'blue', label: 'Bleu', hex: '#3B82F6' },
  { value: 'pink', label: 'Rose', hex: '#EC4899' },
  { value: 'red', label: 'Rouge', hex: '#EF4444' },
  { value: 'black', label: 'Noir', hex: '#1C1917' },
  { value: 'violet', label: 'Violet', hex: '#8B5CF6' },
];

export function todayIso(): string {
  return new Date().toISOString().split('T')[0];
}

export function formatClimbingDate(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function isoToDate(iso: string): Date {
  return new Date(iso + 'T12:00:00');
}

export function dateToIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function extractUniqueLocations(sessions: ClimbingSession[]): string[] {
  return [...new Set(sessions.filter((s) => s.location).map((s) => s.location!))];
}

export function newClimbEntry(defaultGrade?: string): ClimbEntry {
  return {
    id: Date.now().toString() + Math.random().toString(36).slice(2),
    ...(defaultGrade ? { grade: defaultGrade } : {}),
  };
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add constants/climbing.ts
git commit -m "refactor: extract climbing constants and helpers"
```

---

### Task 4: Extract climbing UI components

**Files:**
- Create: `components/journal/GradeStepper.tsx`
- Create: `components/journal/NativeDatePicker.tsx`
- Create: `components/journal/LocationInput.tsx`
- Create: `components/journal/DifficultyBadge.tsx`
- Create: `components/journal/ClimbEntryCard.tsx`
- Create: `components/journal/ToggleButton.tsx`

**Step 1: Extract each component**

Extract from `app/climbing.tsx` the following components as standalone files. Each component should import its dependencies from `@/constants/climbing` instead of inline constants. Keep the exact same implementation — just move to separate files with proper imports/exports.

Key components to extract (reference original line numbers in `app/climbing.tsx`):
- `GradeStepper` (lines 108-152) — grade +/- stepper
- `ToggleButton` (lines 156-189) — generic toggle pill
- `NativeDatePicker` (lines 191-240) — date picker wrapper
- `DifficultyBadge` (lines 242-260) — star rating badge
- `LocationInput` (lines 262-342) — location text input with autocomplete
- `ClimbEntryCard` (lines 344-520) — individual route/boulder card with grade, color, success, attempts

Each file exports a single default component. Props types should be explicitly defined.

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add components/journal/
git commit -m "refactor: extract climbing UI components to components/journal/"
```

---

## Wave 3: Journal Screen (depends on Wave 1 + 2)

### Task 5: Create the Journal screen

**Files:**
- Create: `app/journal.tsx`
- Modify: `app/_layout.tsx` — add journal route

**Step 1: Create `app/journal.tsx`**

The journal screen has:
1. Stats header (3 compact cards in a row)
2. Filter pills (Tout / Poutre / Bloc / Voie)
3. Timeline list grouped by day
4. "+" button at the bottom that opens a quick log bottom sheet (Modal)
5. Empty state with CTA

Use `useJournalEntries()` hook for data. Card rendering differentiates hangboard vs climbing entries.

Key patterns to follow (from existing codebase):
- `useFocusEffect` for data loading (same as `history.tsx`)
- `Pressable` with `scale: pressed ? 0.97 : 1` for all interactive elements
- `Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)` on interactions
- `bg-stone-100 dark:bg-stone-800 rounded-3xl` for cards
- `border border-stone-300 dark:border-stone-700/50` for card borders
- `useThemeColors()` for dynamic colors
- `formatGripConfig` from `@/constants/grips` for hangboard grip display

**Bottom sheet implementation:** Use React Native `Modal` with `animationType="slide"` and a semi-transparent backdrop. The sheet slides up from the bottom with the quick log form inside. Contains:
- Type toggle (Bloc/Voie) using `ToggleButton`
- Count stepper (number input)
- Difficulty pills (4 buttons)
- "Enregistrer" button
- "Ajouter des détails →" link

On save, call `saveClimbingSession()` from storage, then `reload()` from the hook.

The `?quicklog=true` query param (from recap screen) should auto-open the bottom sheet on mount.

**Step 2: Add route to `_layout.tsx`**

Add between the `climbing` and `plans` routes:

```typescript
<Stack.Screen name="journal" options={{ title: 'Journal' }} />
<Stack.Screen name="journal/[id]" options={{ title: 'Détail' }} />
```

**Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add app/journal.tsx app/_layout.tsx
git commit -m "feat: create unified Journal screen with stats, filters, and quick log"
```

---

### Task 6: Create the Journal detail page

**Files:**
- Create: `app/journal/[id].tsx`

**Step 1: Create the detail page**

The `id` param uses prefixes: `h-{id}` for hangboard, `c-{id}` for climbing.

**Hangboard detail (read-only):**
- Protocol icon + name
- Date (formatted with `fr-FR`)
- Duration (formatted as `Xmin Ys`)
- Status badge (Terminée / Interrompue)
- Config summary: `{sets} séries × {reps} reps`, `{hangDuration}s suspension / {restBetweenReps}s repos`
- All grip configs listed (use `formatGripConfig` from `@/constants/grips`)

**Climbing detail (editable):**
Migrate the `SessionDetailPage` component from `app/climbing.tsx` (lines 565-780). It has:
- Metadata header with pencil icon to toggle edit mode
- Entries section (ClimbEntryCard list)
- "Ajouter un bloc/voie" button
- "Enregistrer" button that calls `updateClimbingSession()` and navigates back

Use the extracted components from `components/journal/`.

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add app/journal/
git commit -m "feat: create Journal detail page with hangboard view and climbing editor"
```

---

## Wave 4: Update existing screens (depends on Wave 3)

### Task 7: Update home screen

**Files:**
- Modify: `app/index.tsx`

**Step 1: Replace the Suivi section**

In the `ITEMS` config object:
- Remove `history` and `climbing` entries
- Add a new `journal` entry:

```typescript
journal: {
  title: 'Journal',
  subtitle: 'Poutre, bloc, voie',
  icon: 'book-outline',
  href: '/journal',
  color: '#818CF8',
},
```

In the JSX, replace the two-TileCard grid in the "Suivi" section (lines 213-220) with a single `HeroCard` or `ListCard` for the journal:

```tsx
{/* Section: Suivi */}
<View className="mt-8">
  <SectionLabel text="Suivi" />
  <ListCard item={ITEMS.journal} onPress={() => go('/journal')} />
</View>
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add app/index.tsx
git commit -m "feat: replace History+Climbing cards with unified Journal card on home"
```

---

### Task 8: Update recap screen

**Files:**
- Modify: `app/recap.tsx`

**Step 1: Add "Ajouter une grimpe" button**

After the "Sauvegarder comme workout" button and before the action buttons section, add:

```tsx
{/* Add climbing session */}
<Pressable
  onPress={() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/journal?quicklog=true');
  }}
  className="bg-stone-100 dark:bg-stone-800 rounded-3xl p-4 mb-8 border border-stone-300 dark:border-stone-700/50 flex-row items-center justify-center gap-2"
  style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.97 : 1 }] }]}
  accessibilityRole="button"
  accessibilityLabel="Ajouter une séance de grimpe"
>
  <Ionicons name="trending-up-outline" size={18} color="#A3E635" />
  <Text className="text-lime-600 dark:text-lime-400 text-base font-semibold">
    Ajouter une grimpe
  </Text>
</Pressable>
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add app/recap.tsx
git commit -m "feat: add 'Ajouter une grimpe' button to recap screen"
```

---

## Wave 5: Cleanup (depends on Wave 4)

### Task 9: Delete old screens and update layout

**Files:**
- Delete: `app/history.tsx`
- Delete: `app/climbing.tsx`
- Modify: `app/_layout.tsx` — remove old routes

**Step 1: Remove old route declarations from `_layout.tsx`**

Remove these two lines:
```typescript
<Stack.Screen name="history" options={{ title: 'Historique' }} />
<Stack.Screen name="climbing" options={{ title: 'Grimpe' }} />
```

**Step 2: Delete old files**

```bash
rm app/history.tsx app/climbing.tsx
```

**Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors. If there are import errors from other files referencing history/climbing, fix them.

**Step 4: Verify no broken references**

Run: `grep -r "'/history'" app/ --include='*.tsx' --include='*.ts'`
Run: `grep -r "'/climbing'" app/ --include='*.tsx' --include='*.ts'`

Fix any remaining references to point to `/journal`.

**Step 5: Commit**

```bash
git add -A
git commit -m "chore: remove old history.tsx and climbing.tsx screens"
```

---

### Task 10: UX quick fixes

**Files:**
- Modify: `components/journal/GradeStepper.tsx` — touch targets
- Modify: `components/journal/ClimbEntryCard.tsx` — touch targets

**Step 1: Fix touch targets in GradeStepper**

Change `w-11 h-11` to `w-12 h-12` and `hitSlop={4}` to `hitSlop={8}` on both +/- buttons. This brings the effective touch target to 56pt (48pt button + 8pt hitSlop), above the 44pt minimum.

**Step 2: Fix touch targets in ClimbEntryCard**

For the attempts +/- buttons (originally `w-7 h-7`), change to `w-10 h-10` and `hitSlop={8}`. For the delete button (close-circle icon), ensure `hitSlop={8}`.

**Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add components/journal/
git commit -m "fix: increase touch targets on steppers and entry cards"
```

---

## Dependency Graph

```
Wave 1 (parallel):  Task 1 (types) ──┐
                    Task 2 (hook)  ───┤
                                      │
Wave 2 (parallel):  Task 3 (constants)┤
                    Task 4 (components)┤
                                      │
Wave 3 (sequential): Task 5 (journal screen) ← depends on all above
                     Task 6 (detail page)    ← depends on all above
                                      │
Wave 4 (parallel):  Task 7 (home)  ───┤── depends on Wave 3
                    Task 8 (recap) ───┤
                                      │
Wave 5 (sequential): Task 9 (cleanup) ← depends on Wave 4
                     Task 10 (UX fixes)← depends on Task 4
```
