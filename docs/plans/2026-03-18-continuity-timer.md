# Continuity Timer + Round Recap — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an optional timer for voie continuity sessions, followed by a recap screen where users log routes per round to track progression.

**Architecture:** Map continuity params to existing TimerConfig. Pass continuity metadata via timer store. Recap detects continuity mode and shows per-round route logging form. Save as ClimbingSession with roundDetails.

**Tech Stack:** React Native, Zustand (timer-store), Reanimated, expo-haptics, expo-router

---

## Task 1: Add round detail types

**Files:**
- Modify: `types/index.ts`

**Step 1: Add new types**

After `ClimbEntry` (around line 129), add:

```typescript
export type RoundRoute = {
  id: string;
  grade?: string;
  name?: string;
  passages: number;
  success?: boolean;
};

export type RoundDetail = {
  roundNumber: number;
  routes: RoundRoute[];
};
```

**Step 2: Add `roundDetails` to `ClimbingSession`**

In the `ClimbingSession` type, after `fellFromRound`, add:

```typescript
  roundDetails?: RoundDetail[];
```

**Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 4: Commit**

```bash
git add types/index.ts
git commit -m "feat: add RoundDetail and RoundRoute types for continuity recap"
```

---

## Task 2: Add continuity metadata to timer store

**Files:**
- Modify: `stores/timer-store.ts`

The timer store needs to carry metadata about the continuity session so the recap screen knows it's a continuity recap (not a hangboard recap).

**Step 1: Extend TimerState**

Add to the state type (after `lastResult`):

```typescript
continuityMeta: {
  mode: 'continuity-long' | 'continuity-short';
  voieSessionData: Record<string, any>;
} | null;
```

**Step 2: Initialize to null**

In the store creation, add `continuityMeta: null` to initial state.

**Step 3: Add setter**

Add a `setContinuityMeta` method to the store:

```typescript
setContinuityMeta: (meta: TimerState['continuityMeta']) => void;
```

Implementation:
```typescript
setContinuityMeta: (meta) => set({ continuityMeta: meta }),
```

**Step 4: Reset on setup**

In the existing `setup` function, add `continuityMeta: null` to the `set()` call so it resets when a new timer is configured.

**Step 5: Verify**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 6: Commit**

```bash
git add stores/timer-store.ts
git commit -m "feat: add continuityMeta to timer store"
```

---

## Task 3: Add "Lancer le timer" button to add-voie

**Files:**
- Modify: `app/journal/add-voie.tsx`

**Step 1: Import timer store**

Add:
```typescript
import { useTimerStore } from '@/stores/timer-store';
```

**Step 2: Add timer launch function**

In `AddVoieScreen`, add a `handleLaunchTimer` function after `handleSave`:

```typescript
const handleLaunchTimer = () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

  let timerConfig: TimerConfig;

  if (mode === 'continuity-long') {
    timerConfig = {
      prepDuration: 10,
      hangDuration: continuityLong.effortPerRound * 60, // minutes to seconds
      restBetweenReps: 0,
      reps: 1,
      sets: continuityLong.rounds,
      restBetweenSets: continuityLong.restBetweenRounds * 60, // minutes to seconds
    };
  } else {
    // continuity-short
    timerConfig = {
      prepDuration: 10,
      hangDuration: continuityShort.effortPerSet * 60, // minutes to seconds
      restBetweenReps: continuityShort.restBetweenSets * 60, // minutes to seconds
      reps: continuityShort.setsPerRound,
      sets: continuityShort.rounds,
      restBetweenSets: continuityShort.restBetweenSets * 60 * 2, // double rest between rounds
    };
  }

  // Create a pseudo-protocol for the timer
  const pseudoProtocol = {
    id: `continuity-${mode}`,
    name: mode === 'continuity-long' ? 'Continuité longue' : 'Continuité courte',
  } as Protocol;

  useTimerStore.getState().setup(pseudoProtocol, 'session', [], timerConfig);
  useTimerStore.getState().setContinuityMeta({
    mode: mode as 'continuity-long' | 'continuity-short',
    voieSessionData: buildSession(),
  });

  router.push('/timer' as any);
};
```

Add `import type { TimerConfig, Protocol } from '@/types';` to imports.

**Step 3: Add the button in the JSX**

In the sticky bottom area, add a "Lancer le timer" button ABOVE the "Enregistrer" button, only visible for continuity modes:

```tsx
{(mode === 'continuity-long' || mode === 'continuity-short') && (
  <Pressable
    onPress={handleLaunchTimer}
    className="bg-stone-100 dark:bg-stone-800 rounded-2xl py-4 items-center flex-row justify-center gap-2 mb-2 border border-stone-300 dark:border-stone-700/50"
    style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    accessibilityRole="button"
    accessibilityLabel="Lancer le timer"
  >
    <Ionicons name="timer-outline" size={20} color="#2563EB" />
    <Text className="text-blue-600 font-bold text-base">Lancer le timer</Text>
  </Pressable>
)}
```

**Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 5: Commit**

```bash
git add app/journal/add-voie.tsx
git commit -m "feat: add optional timer launch for continuity sessions"
```

---

## Task 4: Add continuity recap to recap screen

**Files:**
- Modify: `app/recap.tsx`

This is the most complex task. The recap screen must detect continuity mode and show a per-round route logging form.

**Step 1: Import new types and helpers**

Add to imports:
```typescript
import type { CustomWorkout, RoundDetail, RoundRoute } from '@/types';
import { GRADES, DEFAULT_GRADE, nextGrade, prevGrade } from '@/constants/grades';
import { saveClimbingSession, tryAutoCompletePlanSession } from '@/lib/storage';
```

**Step 2: Add state for continuity recap**

In `RecapScreen`, read continuity meta and add state:

```typescript
const continuityMeta = useTimerStore((s) => s.continuityMeta);
const isContinuityRecap = continuityMeta !== null;

// Round details state — initialized with empty rounds based on completed sets
const [roundDetails, setRoundDetails] = useState<RoundDetail[]>(() => {
  if (!continuityMeta || !result) return [];
  const numRounds = result.completedSets || 1;
  return Array.from({ length: numRounds }, (_, i) => ({
    roundNumber: i + 1,
    routes: [],
  }));
});
```

**Step 3: Add round route helper functions**

```typescript
function newRoundRoute(): RoundRoute {
  return {
    id: Date.now().toString() + Math.random().toString(36).slice(2),
    grade: DEFAULT_GRADE,
    passages: 1,
  };
}

const addRouteToRound = (roundIndex: number) => {
  setRoundDetails((prev) =>
    prev.map((rd, i) =>
      i === roundIndex
        ? { ...rd, routes: [...rd.routes, newRoundRoute()] }
        : rd
    )
  );
};

const updateRoute = (roundIndex: number, routeId: string, update: Partial<RoundRoute>) => {
  setRoundDetails((prev) =>
    prev.map((rd, i) =>
      i === roundIndex
        ? { ...rd, routes: rd.routes.map((r) => (r.id === routeId ? { ...r, ...update } : r)) }
        : rd
    )
  );
};

const removeRoute = (roundIndex: number, routeId: string) => {
  setRoundDetails((prev) =>
    prev.map((rd, i) =>
      i === roundIndex
        ? { ...rd, routes: rd.routes.filter((r) => r.id !== routeId) }
        : rd
    )
  );
};
```

**Step 4: Add save continuity session function**

```typescript
const handleSaveContinuity = async () => {
  if (!continuityMeta) return;
  const sessionData = continuityMeta.voieSessionData;
  await saveClimbingSession({
    ...sessionData,
    roundDetails: roundDetails.filter((rd) => rd.routes.length > 0),
  });
  await tryAutoCompletePlanSession({ type: 'climbing', climbingType: 'voie' });
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  router.replace('/journal' as any);
};
```

**Step 5: Add RoundSection component**

Create inside the file:

```tsx
function RoundSection({
  round,
  roundIndex,
  onAddRoute,
  onUpdateRoute,
  onRemoveRoute,
}: {
  round: RoundDetail;
  roundIndex: number;
  onAddRoute: () => void;
  onUpdateRoute: (routeId: string, update: Partial<RoundRoute>) => void;
  onRemoveRoute: (routeId: string) => void;
}) {
  const colors = useThemeColors();
  return (
    <View className="mb-4">
      <Text className="text-stone-500 dark:text-stone-400 text-xs font-semibold uppercase tracking-wide mb-2">
        Tour {round.roundNumber}
      </Text>
      {round.routes.map((route) => (
        <View
          key={route.id}
          className="bg-stone-50 dark:bg-stone-800/50 rounded-xl p-3 mb-2 flex-row items-center gap-2"
        >
          {/* Grade stepper */}
          <Pressable
            onPress={() => {
              const prev = prevGrade(route.grade ?? DEFAULT_GRADE);
              if (prev) { Haptics.selectionAsync(); onUpdateRoute(route.id, { grade: prev }); }
            }}
            className="bg-stone-200 dark:bg-stone-700 rounded-lg w-7 h-7 items-center justify-center"
          >
            <Text className="text-stone-900 dark:text-stone-50 font-bold text-xs">−</Text>
          </Pressable>
          <Text className="text-stone-900 dark:text-stone-50 font-bold text-sm w-10 text-center">
            {route.grade ?? DEFAULT_GRADE}
          </Text>
          <Pressable
            onPress={() => {
              const next = nextGrade(route.grade ?? DEFAULT_GRADE);
              if (next) { Haptics.selectionAsync(); onUpdateRoute(route.id, { grade: next }); }
            }}
            className="bg-stone-200 dark:bg-stone-700 rounded-lg w-7 h-7 items-center justify-center"
          >
            <Text className="text-stone-900 dark:text-stone-50 font-bold text-xs">+</Text>
          </Pressable>

          {/* Passages */}
          <Text className="text-stone-400 text-xs ml-2">×</Text>
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              onUpdateRoute(route.id, { passages: Math.max(1, route.passages - 1) });
            }}
            className="bg-stone-200 dark:bg-stone-700 rounded-lg w-7 h-7 items-center justify-center"
          >
            <Text className="text-stone-900 dark:text-stone-50 font-bold text-xs">−</Text>
          </Pressable>
          <Text className="text-stone-900 dark:text-stone-50 font-bold text-sm w-6 text-center">
            {route.passages}
          </Text>
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              onUpdateRoute(route.id, { passages: route.passages + 1 });
            }}
            className="bg-stone-200 dark:bg-stone-700 rounded-lg w-7 h-7 items-center justify-center"
          >
            <Text className="text-stone-900 dark:text-stone-50 font-bold text-xs">+</Text>
          </Pressable>

          {/* Remove */}
          <Pressable onPress={() => onRemoveRoute(route.id)} className="ml-auto" hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </Pressable>
        </View>
      ))}
      <Pressable
        onPress={onAddRoute}
        className="rounded-xl px-3 py-2 flex-row items-center justify-center border border-dashed border-stone-300 dark:border-stone-700/50"
      >
        <Ionicons name="add-circle-outline" size={16} color="#2563EB" />
        <Text className="text-blue-600 font-semibold text-sm ml-1">Ajouter une voie</Text>
      </Pressable>
    </View>
  );
}
```

**Step 6: Render continuity recap in main component**

In the JSX of `RecapScreen`, after the existing stats/recap content, conditionally render the continuity section:

```tsx
{isContinuityRecap && (
  <View className="mt-6">
    <Text className="text-stone-900 dark:text-stone-50 text-lg font-bold mb-3">
      Détail par tour
    </Text>
    {roundDetails.map((round, i) => (
      <RoundSection
        key={round.roundNumber}
        round={round}
        roundIndex={i}
        onAddRoute={() => addRouteToRound(i)}
        onUpdateRoute={(routeId, update) => updateRoute(i, routeId, update)}
        onRemoveRoute={(routeId) => removeRoute(i, routeId)}
      />
    ))}
  </View>
)}
```

**Step 7: Add "Enregistrer dans Suivi" button**

At the bottom of the recap screen, if `isContinuityRecap`, show:

```tsx
{isContinuityRecap && (
  <Pressable
    onPress={handleSaveContinuity}
    className="bg-blue-600 rounded-2xl py-4 items-center mt-4"
    style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
  >
    <Text className="text-white font-bold text-base">Enregistrer dans Suivi</Text>
  </Pressable>
)}
```

**Step 8: Verify**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 9: Commit**

```bash
git add app/recap.tsx
git commit -m "feat: add continuity recap with per-round route logging"
```
