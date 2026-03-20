# Grip Config Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the simple grip type picker with a full grip configuration system supporting hold types, per-grip load, and per-set configuration.

**Architecture:** New types (HoldType, GripConfig, GripMode) replace the old GripType[] throughout the data flow. A new GripConfigSection component replaces GripSelector. The loadKg field moves from TimerConfig into GripConfig. History migration handles old entries on load.

**Tech Stack:** React Native 0.81, Expo 54, TypeScript, NativeWind v4, Zustand

---

## Task 1: Add new types and constants

**Files:**
- Modify: `types/index.ts:3,7-18,46-50,52-60,73-75`
- Modify: `constants/grips.ts`

**Step 1: Add HoldType, GripConfig, GripMode to types/index.ts**

After the `GripType` union (line 3), add:

```typescript
export type HoldType = 'flat' | 'crimp20' | 'crimp15' | 'crimp10' | 'crimp5' | 'round';

export type GripConfig = {
  grip: GripType;
  hold: HoldType;
  loadKg: number;
};

export type GripMode = 'session' | 'perSet';
```

**Step 2: Remove loadKg from TimerConfig**

In `TimerConfig` (line 7-18), remove the `loadKg?: number` field (line 16).

**Step 3: Update SessionConfig**

Replace `grips: GripType[]` with:
```typescript
export type SessionConfig = {
  protocol: Protocol;
  gripMode: GripMode;
  gripConfigs: GripConfig[];
  timerConfig: TimerConfig;
};
```

**Step 4: Update SessionResult**

Replace `grips: GripType[]` with:
```typescript
export type SessionResult = {
  protocol: Protocol;
  gripMode: GripMode;
  gripConfigs: GripConfig[];
  config: TimerConfig;
  completedSets: number;
  completedRounds: number;
  totalDuration: number;
  completed: boolean;
};
```

**Step 5: Update WorkoutStep**

In the protocol variant of `WorkoutStep` (line 74), replace `grips: GripType[]` with:
```typescript
{ type: 'protocol'; protocolId: string; config: TimerConfig; gripMode: GripMode; gripConfigs: GripConfig[] }
```

**Step 6: Add HOLDS constant to constants/grips.ts**

After the existing `GRIPS` array and before `getGripById`, add:

```typescript
export type HoldInfo = {
  id: HoldType;
  name: string;
  shortName: string;
};

export const HOLDS: HoldInfo[] = [
  { id: 'flat', name: 'Plat', shortName: 'Plat' },
  { id: 'crimp20', name: 'Réglette 20mm', shortName: '20mm' },
  { id: 'crimp15', name: 'Réglette 15mm', shortName: '15mm' },
  { id: 'crimp10', name: 'Réglette 10mm', shortName: '10mm' },
  { id: 'crimp5', name: 'Réglette 5mm', shortName: '5mm' },
  { id: 'round', name: 'Prise ronde', shortName: 'Ronde' },
];

export function getHoldById(id: HoldType): HoldInfo | undefined {
  return HOLDS.find(h => h.id === id);
}
```

Import `HoldType` from `types/index.ts` at the top.

**Step 7: Add formatGripConfig helper to constants/grips.ts**

```typescript
export function formatGripConfig(gc: GripConfig): string {
  const grip = getGripById(gc.grip);
  const hold = getHoldById(gc.hold);
  const parts = [grip?.name, hold?.name];
  if (gc.loadKg > 0) parts.push(`+${gc.loadKg}kg`);
  if (gc.loadKg < 0) parts.push(`${gc.loadKg}kg`);
  return parts.filter(Boolean).join(' · ');
}
```

Import `GripConfig` from `types/index.ts`.

**Step 8: Commit**

```bash
git add types/index.ts constants/grips.ts
git commit -m "feat: add HoldType, GripConfig, GripMode types and HOLDS constant"
```

---

## Task 2: Update Zustand store

**Files:**
- Modify: `stores/timer-store.ts:5-17,70-84,102-132`

**Step 1: Update store state type**

Replace `grips: GripType[]` with:
```typescript
gripMode: GripMode;
gripConfigs: GripConfig[];
```

Update the import to include `GripMode, GripConfig` from `types/index.ts`.

**Step 2: Update setup() signature and implementation**

Change setup from `setup(protocol, grips, config)` to:
```typescript
setup: (protocol: Protocol, gripMode: GripMode, gripConfigs: GripConfig[], config: TimerConfig) => {
  const phases = computePhaseSequence(config);
  set({
    protocol,
    gripMode,
    gripConfigs,
    config,
    phases,
    currentPhaseIndex: 0,
    timeRemaining: phases[0]?.duration ?? 0,
    isRunning: false,
    isPaused: false,
    startTime: null,
    elapsedTotal: 0,
    lastResult: null,
  });
},
```

**Step 3: Update stop() — lastResult construction**

In stop(), replace `grips` with `gripMode` and `gripConfigs` in the `lastResult` object:
```typescript
lastResult: {
  protocol: protocol!,
  gripMode,
  gripConfigs,
  config: config!,
  completedSets,
  completedRounds,
  totalDuration: elapsed,
  completed: currentPhaseIndex >= phases.length - 1,
},
```

**Step 4: Update initial state**

Set defaults: `gripMode: 'session'`, `gripConfigs: []`.

**Step 5: Commit**

```bash
git add stores/timer-store.ts
git commit -m "feat: update timer store for gripMode and gripConfigs"
```

---

## Task 3: Create GripConfigSection component

**Files:**
- Create: `components/GripConfigSection.tsx`
- Delete: `components/GripSelector.tsx` (replaced)

**Step 1: Create GripConfigSection component**

```typescript
import React, { useMemo } from 'react';
import { View, Text, Pressable, Modal, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useThemeColors } from '@/lib/theme';
import { GRIPS, HOLDS, getGripById, getHoldById } from '@/constants/grips';
import type { GripType, HoldType, GripConfig, GripMode } from '@/types';

type Props = {
  gripMode: GripMode;
  gripConfigs: GripConfig[];
  sets: number;
  onChangeMode: (mode: GripMode) => void;
  onChangeConfigs: (configs: GripConfig[]) => void;
};

const DEFAULT_CONFIG: GripConfig = { grip: 'halfCrimp', hold: 'crimp20', loadKg: 0 };

function GripConfigRow({
  config,
  index,
  label,
  onChange,
}: {
  config: GripConfig;
  index: number;
  label: string;
  onChange: (index: number, config: GripConfig) => void;
}) {
  const colors = useThemeColors();
  const [showGripPicker, setShowGripPicker] = React.useState(false);
  const [showHoldPicker, setShowHoldPicker] = React.useState(false);

  const gripInfo = getGripById(config.grip);
  const holdInfo = getHoldById(config.hold);

  const adjustLoad = (delta: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange(index, { ...config, loadKg: config.loadKg + delta });
  };

  return (
    <View className="bg-stone-100 dark:bg-stone-800 rounded-2xl p-4 gap-3">
      {label && (
        <Text className="text-stone-500 dark:text-stone-400 text-xs font-medium uppercase tracking-wide">
          {label}
        </Text>
      )}

      {/* Grip picker */}
      <Pressable
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowGripPicker(true); }}
        className="flex-row items-center justify-between bg-stone-200 dark:bg-stone-700 rounded-xl px-4 py-3"
        accessibilityRole="button"
        accessibilityLabel={`Préhension : ${gripInfo?.name}`}
      >
        <Text className="text-stone-900 dark:text-stone-50 font-medium">{gripInfo?.name ?? 'Choisir'}</Text>
        <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
      </Pressable>

      {/* Hold picker */}
      <Pressable
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowHoldPicker(true); }}
        className="flex-row items-center justify-between bg-stone-200 dark:bg-stone-700 rounded-xl px-4 py-3"
        accessibilityRole="button"
        accessibilityLabel={`Prise : ${holdInfo?.name}`}
      >
        <Text className="text-stone-900 dark:text-stone-50 font-medium">{holdInfo?.name ?? 'Choisir'}</Text>
        <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
      </Pressable>

      {/* Load stepper */}
      <View className="flex-row items-center justify-center gap-2">
        <Pressable
          onPress={() => adjustLoad(-5)}
          className="w-11 h-11 rounded-xl bg-stone-200 dark:bg-stone-700 items-center justify-center"
          accessibilityRole="button"
          accessibilityLabel="Réduire la charge de 5kg"
        >
          <Text className="text-stone-500 dark:text-stone-400 font-bold">-5</Text>
        </Pressable>
        <Pressable
          onPress={() => adjustLoad(-1)}
          className="w-11 h-11 rounded-xl bg-stone-200 dark:bg-stone-700 items-center justify-center"
          accessibilityRole="button"
          accessibilityLabel="Réduire la charge de 1kg"
        >
          <Text className="text-stone-500 dark:text-stone-400 font-bold">-1</Text>
        </Pressable>
        <View className="w-20 items-center">
          <Text className="text-stone-900 dark:text-stone-50 text-lg font-bold">{config.loadKg} kg</Text>
        </View>
        <Pressable
          onPress={() => adjustLoad(1)}
          className="w-11 h-11 rounded-xl bg-stone-200 dark:bg-stone-700 items-center justify-center"
          accessibilityRole="button"
          accessibilityLabel="Augmenter la charge de 1kg"
        >
          <Text className="text-stone-500 dark:text-stone-400 font-bold">+1</Text>
        </Pressable>
        <Pressable
          onPress={() => adjustLoad(5)}
          className="w-11 h-11 rounded-xl bg-stone-200 dark:bg-stone-700 items-center justify-center"
          accessibilityRole="button"
          accessibilityLabel="Augmenter la charge de 5kg"
        >
          <Text className="text-stone-500 dark:text-stone-400 font-bold">+5</Text>
        </Pressable>
      </View>

      {/* Grip warning */}
      {gripInfo?.warning && (
        <View className="flex-row items-start gap-2 mt-1">
          <Ionicons name="warning-outline" size={16} color="#F59E0B" />
          <Text className="text-amber-500 dark:text-amber-400 text-xs flex-1">{gripInfo.warning}</Text>
        </View>
      )}

      {/* Grip picker modal */}
      <Modal visible={showGripPicker} transparent animationType="slide">
        <Pressable className="flex-1 bg-black/60" onPress={() => setShowGripPicker(false)} accessibilityLabel="Fermer">
          <View className="mt-auto bg-stone-50 dark:bg-stone-900 rounded-t-3xl p-6" onStartShouldSetResponder={() => true}>
            <Text className="text-stone-900 dark:text-stone-50 text-lg font-bold mb-4">Préhension</Text>
            <FlatList
              data={GRIPS}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onChange(index, { ...config, grip: item.id }); setShowGripPicker(false); }}
                  className={`py-3 px-4 rounded-xl mb-1 ${config.grip === item.id ? 'bg-orange-500/10' : ''}`}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: config.grip === item.id }}
                  accessibilityLabel={item.name}
                >
                  <Text className={`font-medium ${config.grip === item.id ? 'text-orange-500' : 'text-stone-900 dark:text-stone-50'}`}>
                    {item.name}
                  </Text>
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>

      {/* Hold picker modal */}
      <Modal visible={showHoldPicker} transparent animationType="slide">
        <Pressable className="flex-1 bg-black/60" onPress={() => setShowHoldPicker(false)} accessibilityLabel="Fermer">
          <View className="mt-auto bg-stone-50 dark:bg-stone-900 rounded-t-3xl p-6" onStartShouldSetResponder={() => true}>
            <Text className="text-stone-900 dark:text-stone-50 text-lg font-bold mb-4">Type de prise</Text>
            <FlatList
              data={HOLDS}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onChange(index, { ...config, hold: item.id }); setShowHoldPicker(false); }}
                  className={`py-3 px-4 rounded-xl mb-1 ${config.hold === item.id ? 'bg-orange-500/10' : ''}`}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: config.hold === item.id }}
                  accessibilityLabel={item.name}
                >
                  <Text className={`font-medium ${config.hold === item.id ? 'text-orange-500' : 'text-stone-900 dark:text-stone-50'}`}>
                    {item.name}
                  </Text>
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

export default function GripConfigSection({ gripMode, gripConfigs, sets, onChangeMode, onChangeConfigs }: Props) {
  const handleChangeRow = (index: number, config: GripConfig) => {
    const newConfigs = [...gripConfigs];
    newConfigs[index] = config;
    onChangeConfigs(newConfigs);
  };

  // Sync configs count with sets when in perSet mode
  const effectiveConfigs = useMemo(() => {
    if (gripMode === 'session') return gripConfigs.length > 0 ? [gripConfigs[0]] : [DEFAULT_CONFIG];
    // perSet: ensure we have exactly `sets` configs
    const result: GripConfig[] = [];
    for (let i = 0; i < sets; i++) {
      result.push(gripConfigs[i] ?? gripConfigs[0] ?? DEFAULT_CONFIG);
    }
    return result;
  }, [gripMode, gripConfigs, sets]);

  return (
    <View className="gap-4">
      <Text className="text-stone-900 dark:text-stone-50 text-lg font-bold">Préhension</Text>

      {/* Mode toggle */}
      <View className="flex-row bg-stone-100 dark:bg-stone-800 rounded-xl p-1">
        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onChangeMode('session'); }}
          className={`flex-1 py-2 rounded-lg items-center ${gripMode === 'session' ? 'bg-orange-500' : ''}`}
          accessibilityRole="tab"
          accessibilityState={{ selected: gripMode === 'session' }}
        >
          <Text className={gripMode === 'session' ? 'text-white font-semibold' : 'text-stone-500 dark:text-stone-400'}>
            Séance complète
          </Text>
        </Pressable>
        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onChangeMode('perSet'); }}
          className={`flex-1 py-2 rounded-lg items-center ${gripMode === 'perSet' ? 'bg-orange-500' : ''}`}
          accessibilityRole="tab"
          accessibilityState={{ selected: gripMode === 'perSet' }}
        >
          <Text className={gripMode === 'perSet' ? 'text-white font-semibold' : 'text-stone-500 dark:text-stone-400'}>
            Par série
          </Text>
        </Pressable>
      </View>

      {/* Grip config rows */}
      {effectiveConfigs.map((config, i) => (
        <GripConfigRow
          key={i}
          config={config}
          index={i}
          label={gripMode === 'perSet' ? `Série ${i + 1}` : ''}
          onChange={handleChangeRow}
        />
      ))}
    </View>
  );
}
```

**Step 2: Commit**

```bash
git add components/GripConfigSection.tsx
git commit -m "feat: create GripConfigSection component with hold and load pickers"
```

---

## Task 4: Remove loadKg from TimerConfigForm

**Files:**
- Modify: `components/TimerConfigForm.tsx:264-281`

**Step 1: Remove the entire Charge section**

Delete the "Charge additionnelle" section (lines 264-281) — the `<Text>` title and the `<View>` containing the ±10/±5/±1 buttons and the kg display.

Keep everything else (Volume section, Duration section) unchanged.

**Step 2: Commit**

```bash
git add components/TimerConfigForm.tsx
git commit -m "refactor: remove loadKg from TimerConfigForm (moved to GripConfigSection)"
```

---

## Task 5: Update protocol config screen

**Files:**
- Modify: `app/protocol/[id].tsx:30-31,41-51,99-104`

**Step 1: Replace grip state**

Replace:
```typescript
const [selectedGrips, setSelectedGrips] = useState<GripType[]>([]);
```

With:
```typescript
const [gripMode, setGripMode] = useState<GripMode>('session');
const [gripConfigs, setGripConfigs] = useState<GripConfig[]>([{ grip: 'halfCrimp', hold: 'crimp20', loadKg: 0 }]);
```

Import `GripMode`, `GripConfig` from `@/types`.

**Step 2: Remove handleToggleGrip**

Delete the `handleToggleGrip` function (lines 41-44).

**Step 3: Update handleStart**

Replace:
```typescript
setup(protocol, selectedGrips, config);
```

With:
```typescript
setup(protocol, gripMode, gripConfigs, config);
```

**Step 4: Replace GripSelector with GripConfigSection in JSX**

Remove the `<GripSelector>` component (lines 99-102).

After `<TimerConfigForm>` (line 104), add:

```tsx
<GripConfigSection
  gripMode={gripMode}
  gripConfigs={gripConfigs}
  sets={config.sets}
  onChangeMode={setGripMode}
  onChangeConfigs={setGripConfigs}
/>
```

Import `GripConfigSection` from `@/components/GripConfigSection`.

**Step 5: Remove old imports**

Remove `GripSelector` import. Remove `GripType` import if unused.

**Step 6: Commit**

```bash
git add app/protocol/[id].tsx
git commit -m "feat: use GripConfigSection in protocol config screen"
```

---

## Task 6: Update timer screen grip reminder

**Files:**
- Modify: `app/timer.tsx:106,260-263,339-347`

**Step 1: Update store selectors**

Replace:
```typescript
const grips = useTimerStore(s => s.grips);
```

With:
```typescript
const gripMode = useTimerStore(s => s.gripMode);
const gripConfigs = useTimerStore(s => s.gripConfigs);
```

**Step 2: Update grip reminder logic**

Replace the `gripReminder` computation (lines 260-263):

```typescript
const gripReminder = useMemo(() => {
  if (!phase || gripConfigs.length === 0) return null;
  if (phase.type !== 'restSet' && phase.type !== 'restRound') return null;

  if (gripMode === 'session') {
    return formatGripConfig(gripConfigs[0]);
  }
  // perSet: show next set's config
  const nextSetIndex = (phase.set ?? 1) % gripConfigs.length;
  return formatGripConfig(gripConfigs[nextSetIndex]);
}, [phase, gripMode, gripConfigs]);
```

Import `formatGripConfig` from `@/constants/grips`.

**Step 3: Update grip reminder JSX**

The existing render (lines 339-347) shows `gripReminder` as text — this should work as-is since `formatGripConfig` returns a formatted string. Just verify the label text says "Préhension suivante" for perSet mode and "Préhension" for session mode:

```tsx
{gripReminder && (
  <View className="...">
    <Ionicons name="hand-left-outline" ... />
    <Text ...>{gripMode === 'perSet' ? 'Préhension suivante' : 'Préhension'}</Text>
    <Text ...>{gripReminder}</Text>
  </View>
)}
```

**Step 4: Commit**

```bash
git add app/timer.tsx
git commit -m "feat: update timer grip reminder for hold types and per-set mode"
```

---

## Task 7: Update recap screen

**Files:**
- Modify: `app/recap.tsx:109,161-168`

**Step 1: Update destructuring**

Replace:
```typescript
const { protocol, grips, completedSets, ... } = result;
```

With:
```typescript
const { protocol, gripMode, gripConfigs, completedSets, ... } = result;
```

**Step 2: Update grip StatCard**

Replace the grip stat card section:

```tsx
{gripConfigs.length > 0 && (
  <StatCard
    icon="hand-left-outline"
    label="Préhension"
    value={gripMode === 'session'
      ? formatGripConfig(gripConfigs[0])
      : gripConfigs.map((gc, i) => `S${i+1}: ${formatGripConfig(gc)}`).join('\n')
    }
  />
)}
```

Import `formatGripConfig` from `@/constants/grips`.

**Step 3: Update redo button**

The redo button calls `setup(result.protocol, result.grips, result.config)`. Update to:
```typescript
useTimerStore.getState().setup(result.protocol, result.gripMode, result.gripConfigs, result.config);
```

**Step 4: Commit**

```bash
git add app/recap.tsx
git commit -m "feat: update recap to display grip configs with hold and load"
```

---

## Task 8: Update history migration

**Files:**
- Modify: `lib/storage.ts:20-32`

**Step 1: Add migration in loadHistory**

In `loadHistory()`, after loading from AsyncStorage, add migration:

```typescript
export async function loadHistory(): Promise<SessionHistoryEntry[]> {
  const entries = await getJSON<SessionHistoryEntry[]>(KEYS.history) ?? [];
  // Migrate old format (grips: GripType[]) to new (gripMode + gripConfigs)
  return entries.map(entry => {
    const result = entry.result;
    if ('grips' in result && !('gripConfigs' in result)) {
      const oldGrips = (result as any).grips as GripType[];
      const loadKg = (result as any).config?.loadKg ?? 0;
      return {
        ...entry,
        result: {
          ...result,
          gripMode: 'session' as GripMode,
          gripConfigs: oldGrips.map(g => ({ grip: g, hold: 'flat' as HoldType, loadKg })),
        },
      };
    }
    return entry;
  });
}
```

Import `GripType, GripMode, HoldType` from `@/types`.

**Step 2: Commit**

```bash
git add lib/storage.ts
git commit -m "feat: add history migration for old grip format"
```

---

## Task 9: Update create-workout and custom-workouts

**Files:**
- Modify: `app/create-workout.tsx:42-46,102-137,182-192,254-266`
- Modify: `app/custom-workouts.tsx:100-115`

**Step 1: Update ComposeStep type in create-workout**

Replace `grips: GripType[]` in the ComposeStep type with:
```typescript
type ComposeStep = {
  protocolId: string;
  config: TimerConfig;
  gripMode: GripMode;
  gripConfigs: GripConfig[];
};
```

**Step 2: Replace StepGripPicker with GripConfigSection**

In each compose step's config area, replace the inline `StepGripPicker` with `GripConfigSection`:

```tsx
<GripConfigSection
  gripMode={step.gripMode}
  gripConfigs={step.gripConfigs}
  sets={step.config.sets}
  onChangeMode={(mode) => updateComposeStep(i, { ...step, gripMode: mode })}
  onChangeConfigs={(configs) => updateComposeStep(i, { ...step, gripConfigs: configs })}
/>
```

**Step 3: Update step save to include gripMode/gripConfigs**

When building the `WorkoutStep` object for save, use:
```typescript
{ type: 'protocol', protocolId: step.protocolId, config: step.config, gripMode: step.gripMode, gripConfigs: step.gripConfigs }
```

**Step 4: Update custom-workouts handlePress**

Replace:
```typescript
useTimerStore.getState().setup(protocol, firstStep.grips || [], firstStep.config);
```

With:
```typescript
useTimerStore.getState().setup(
  protocol,
  firstStep.gripMode ?? 'session',
  firstStep.gripConfigs ?? [],
  firstStep.config
);
```

**Step 5: Commit**

```bash
git add app/create-workout.tsx app/custom-workouts.tsx
git commit -m "feat: update custom workouts to use grip configs"
```

---

## Task 10: Delete old GripSelector and verify

**Files:**
- Delete: `components/GripSelector.tsx`

**Step 1: Search for remaining GripSelector imports**

Run: `grep -r "GripSelector" app/ components/`

If any remain, update them to use GripConfigSection.

**Step 2: Delete GripSelector.tsx**

```bash
rm components/GripSelector.tsx
```

**Step 3: Full verification**

Run: `npx tsc --noEmit`
Run: `npx jest`

**Step 4: Commit**

```bash
git rm components/GripSelector.tsx
git commit -m "refactor: remove old GripSelector (replaced by GripConfigSection)"
```

---

## Summary

| Task | Files | Description |
|------|-------|-------------|
| 1 | types/index.ts, constants/grips.ts | New types + HOLDS constant |
| 2 | stores/timer-store.ts | Store setup/stop for gripMode/gripConfigs |
| 3 | components/GripConfigSection.tsx | New component (grip + hold + load pickers) |
| 4 | components/TimerConfigForm.tsx | Remove loadKg section |
| 5 | app/protocol/[id].tsx | Wire new component into config screen |
| 6 | app/timer.tsx | Update grip reminder for new format |
| 7 | app/recap.tsx | Update grip display |
| 8 | lib/storage.ts | History migration |
| 9 | app/create-workout.tsx, custom-workouts.tsx | Update custom workouts |
| 10 | components/GripSelector.tsx | Delete old component + verify |

**Dependencies:** Tasks 1 → 2 → 3/4 (parallel) → 5 → 6/7/8/9 (parallel) → 10
