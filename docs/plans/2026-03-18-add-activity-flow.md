# Add Activity Flow — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the BottomSheet quick-log with a 2-step flow: activity type picker (3 cards) → dedicated page per type (bloc, voie, hangboard).

**Architecture:** New routes under `app/journal/` for each step. Types extended with `VoieMode` and continuity session fields. Voie page uses existing `SegmentedControl` to switch between libre/continuité longue/continuité courte. Hangboard page reuses protocol and custom workout data. Existing `ClimbingSession` type extended to support continuity fields.

**Tech Stack:** React Native + Expo Router + NativeWind + SegmentedControl + Reanimated + expo-haptics

---

## Task 1: Extend types for voie modes and continuity sessions

**Files:**
- Modify: `types/index.ts`
- Modify: `constants/climbing.ts`

**Step 1: Add new types in `types/index.ts`**

After line 118, update `ClimbingType` and add new types:

```typescript
export type ClimbingType = 'bloc' | 'voie';
export type VoieMode = 'libre' | 'continuity-long' | 'continuity-short';
export type EffortIntensity = 'easy' | 'correct' | 'hard';
```

Extend `ClimbingSession` (line 131) — add optional continuity fields:

```typescript
export type ClimbingSession = {
  id: string;
  date: string;
  type: ClimbingType;
  voieMode?: VoieMode;
  difficulty?: DifficultyLevel;
  location?: string;
  // Global details (exclusive with entries)
  routeCount?: number;
  grades?: string;
  duration?: number; // minutes
  notes?: string;
  // Route-by-route details (exclusive with global)
  entries?: ClimbEntry[];
  // Continuity-long fields
  rounds?: number;
  effortPerRound?: number; // minutes
  restBetweenRounds?: number; // minutes
  intensity?: EffortIntensity;
  // Continuity-short fields
  setsPerRound?: number;
  effortPerSet?: number; // seconds
  restBetweenSets?: number; // minutes
  fellFromRound?: number;
};
```

**Step 2: Add constants in `constants/climbing.ts`**

Add after the existing constants:

```typescript
import { VoieMode, EffortIntensity } from '@/types';

export const VOIE_MODES: { value: VoieMode; label: string }[] = [
  { value: 'libre', label: 'Libre' },
  { value: 'continuity-long', label: 'Continuité longue' },
  { value: 'continuity-short', label: 'Continuité courte' },
];

export const EFFORT_INTENSITIES: { value: EffortIntensity; label: string }[] = [
  { value: 'easy', label: 'Facile' },
  { value: 'correct', label: 'Correct' },
  { value: 'hard', label: 'Dur' },
];
```

**Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: PASS (no errors)

**Step 4: Commit**

```bash
git add types/index.ts constants/climbing.ts
git commit -m "feat: add voie mode types and continuity session fields"
```

---

## Task 2: Create activity picker screen (`/journal/add`)

**Files:**
- Create: `app/journal/add.tsx`
- Modify: `app/_layout.tsx` (add Stack.Screen)
- Modify: `app/journal.tsx` (change FAB button)

**Step 1: Register routes in `app/_layout.tsx`**

After line 55 (`journal/[id]`), add:

```typescript
<Stack.Screen name="journal/add" options={{ title: 'Ajouter une activité' }} />
<Stack.Screen name="journal/add-bloc" options={{ title: 'Séance de bloc' }} />
<Stack.Screen name="journal/add-voie" options={{ title: 'Séance de voie' }} />
<Stack.Screen name="journal/add-hangboard" options={{ title: 'Hangboard' }} />
```

**Step 2: Create `app/journal/add.tsx`**

```tsx
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useThemeColors } from '@/lib/theme';

type ActivityOption = {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  href: string;
};

const ACTIVITIES: ActivityOption[] = [
  {
    id: 'bloc',
    title: 'Bloc',
    subtitle: 'Séance de bloc route par route',
    icon: 'cube-outline',
    color: '#F97316',
    href: '/journal/add-bloc',
  },
  {
    id: 'voie',
    title: 'Voie',
    subtitle: 'Libre, continuité longue ou courte',
    icon: 'trending-up-outline',
    color: '#2563EB',
    href: '/journal/add-voie',
  },
  {
    id: 'hangboard',
    title: 'Hangboard',
    subtitle: 'Protocoles et mes entraînements',
    icon: 'hand-left-outline',
    color: '#818CF8',
    href: '/journal/add-hangboard',
  },
];

function ActivityCard({ activity, onPress }: { activity: ActivityOption; onPress: () => void }) {
  const colors = useThemeColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}
      accessibilityRole="button"
      accessibilityLabel={`${activity.title}. ${activity.subtitle}`}
    >
      <View className="bg-stone-100 dark:bg-stone-800 rounded-3xl p-5 overflow-hidden border border-stone-300 dark:border-stone-700/50">
        <LinearGradient
          colors={[activity.color + '18', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
        <View className="flex-row items-center">
          <View
            className="w-14 h-14 rounded-2xl items-center justify-center mr-4"
            style={{ backgroundColor: activity.color + '20' }}
          >
            <Ionicons name={activity.icon} size={28} color={activity.color} />
          </View>
          <View className="flex-1">
            <Text className="text-stone-900 dark:text-stone-50 text-xl font-bold">
              {activity.title}
            </Text>
            <Text className="text-stone-500 dark:text-stone-400 text-sm mt-0.5">
              {activity.subtitle}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.chevron} />
        </View>
      </View>
    </Pressable>
  );
}

export default function AddActivityScreen() {
  const router = useRouter();

  const go = (href: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(href as any);
  };

  return (
    <ScrollView className="flex-1 bg-white dark:bg-stone-950 px-5 pt-6">
      <View className="gap-3">
        {ACTIVITIES.map((activity) => (
          <ActivityCard
            key={activity.id}
            activity={activity}
            onPress={() => go(activity.href)}
          />
        ))}
      </View>
      <View className="h-20" />
    </ScrollView>
  );
}
```

**Step 3: Update FAB in `app/journal.tsx`**

Replace the `openQuickLog()` call in the FAB button (line 552) with navigation:

```tsx
onPress={() => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  router.push('/journal/add' as any);
}}
```

Update label (line 566):
```tsx
<Text className="text-white font-bold text-base">Ajouter une activité</Text>
```

Update accessibilityLabel (line 563):
```tsx
accessibilityLabel="Ajouter une activité"
```

**Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 5: Commit**

```bash
git add app/journal/add.tsx app/_layout.tsx app/journal.tsx
git commit -m "feat: add activity type picker screen with 3 cards"
```

---

## Task 3: Create bloc session page (`/journal/add-bloc`)

**Files:**
- Create: `app/journal/add-bloc.tsx`

This page is a form for creating a bloc session with route-by-route entries. It reuses patterns from the existing `journal/[id].tsx` ClimbingDetail editing flow.

**Step 1: Create `app/journal/add-bloc.tsx`**

```tsx
import { useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useThemeColors } from '@/lib/theme';
import { saveClimbingSession } from '@/lib/storage';
import { todayIso, newClimbEntry, isoToDate, dateToIso, formatClimbingDate } from '@/constants/climbing';
import { BOULDER_COLORS } from '@/constants/climbing';
import { GRADES, DEFAULT_GRADE } from '@/constants/grades';
import type { ClimbEntry, BoulderColor } from '@/types';

export default function AddBlocScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  const [date, setDate] = useState(todayIso());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [entries, setEntries] = useState<ClimbEntry[]>([newClimbEntry()]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const addEntry = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEntries((prev) => [...prev, newClimbEntry()]);
  }, []);

  const removeEntry = useCallback((id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const updateEntry = useCallback((id: string, update: Partial<ClimbEntry>) => {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...update } : e)));
  }, []);

  const handleSave = useCallback(async () => {
    if (entries.length === 0) {
      Alert.alert('Erreur', 'Ajoute au moins un bloc.');
      return;
    }
    setSaving(true);
    await saveClimbingSession({
      id: Date.now().toString(),
      date,
      type: 'bloc',
      entries,
      ...(notes ? { notes } : {}),
    });
    setSaving(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  }, [date, entries, notes, router]);

  return (
    <View className="flex-1 bg-white dark:bg-stone-950">
      <ScrollView className="flex-1 px-5 pt-4">
        {/* Date picker */}
        <Pressable
          onPress={() => setShowDatePicker(true)}
          className="bg-stone-100 dark:bg-stone-800 rounded-2xl px-4 py-3 mb-4 flex-row items-center border border-stone-300 dark:border-stone-700/50"
        >
          <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
          <Text className="text-stone-900 dark:text-stone-50 font-semibold ml-3 flex-1">
            {formatClimbingDate(date)}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={colors.chevron} />
        </Pressable>

        {showDatePicker && (
          <DateTimePicker
            value={isoToDate(date)}
            mode="date"
            onChange={(_, d) => {
              setShowDatePicker(false);
              if (d) setDate(dateToIso(d));
            }}
          />
        )}

        {/* Entries */}
        <Text className="text-stone-400 dark:text-stone-500 text-xs font-semibold uppercase tracking-wide mb-2">
          Blocs ({entries.length})
        </Text>

        {entries.map((entry, index) => (
          <BlocEntryRow
            key={entry.id}
            entry={entry}
            index={index}
            onUpdate={(update) => updateEntry(entry.id, update)}
            onRemove={() => removeEntry(entry.id)}
            colors={colors}
          />
        ))}

        <Pressable
          onPress={addEntry}
          className="bg-stone-100 dark:bg-stone-800 rounded-2xl px-4 py-3 flex-row items-center justify-center border border-dashed border-stone-300 dark:border-stone-700/50 mb-4"
        >
          <Ionicons name="add-circle-outline" size={18} color="#F97316" />
          <Text className="text-orange-500 font-semibold ml-2">Ajouter un bloc</Text>
        </Pressable>

        <View className="h-24" />
      </ScrollView>

      {/* Sticky save button */}
      <View
        className="px-5 pt-3 bg-white dark:bg-stone-950 border-t border-stone-200 dark:border-stone-800"
        style={{ paddingBottom: Math.max(insets.bottom, 16) }}
      >
        <Pressable
          onPress={handleSave}
          disabled={saving}
          className="bg-orange-500 rounded-2xl py-4 items-center"
          style={({ pressed }) => ({ opacity: pressed || saving ? 0.7 : 1 })}
        >
          <Text className="text-white font-bold text-base">
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

// --- Sub-component: one bloc entry row ---

function BlocEntryRow({
  entry,
  index,
  onUpdate,
  onRemove,
  colors,
}: {
  entry: ClimbEntry;
  index: number;
  onUpdate: (update: Partial<ClimbEntry>) => void;
  onRemove: () => void;
  colors: ReturnType<typeof useThemeColors>;
}) {
  return (
    <View className="bg-stone-100 dark:bg-stone-800 rounded-2xl p-3 mb-2 border border-stone-300 dark:border-stone-700/50">
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-stone-500 dark:text-stone-400 text-xs font-semibold">
          Bloc {index + 1}
        </Text>
        <Pressable onPress={onRemove} hitSlop={12}>
          <Ionicons name="close-circle" size={20} color={colors.textMuted} />
        </Pressable>
      </View>

      {/* Color selector */}
      <View className="flex-row gap-2 mb-3">
        {BOULDER_COLORS.map((c) => (
          <Pressable
            key={c.value}
            onPress={() => {
              Haptics.selectionAsync();
              onUpdate({ color: c.value });
            }}
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: c.hex,
              borderWidth: entry.color === c.value ? 2 : 0,
              borderColor: '#fff',
            }}
          />
        ))}
      </View>

      {/* Grade stepper */}
      <View className="flex-row items-center gap-3 mb-2">
        <Text className="text-stone-500 dark:text-stone-400 text-xs w-12">Grade</Text>
        <Pressable
          onPress={() => {
            const grades = GRADES;
            const idx = grades.indexOf(entry.grade ?? DEFAULT_GRADE);
            if (idx > 0) {
              Haptics.selectionAsync();
              onUpdate({ grade: grades[idx - 1] });
            }
          }}
          className="bg-stone-200 dark:bg-stone-700 rounded-lg w-8 h-8 items-center justify-center"
        >
          <Text className="text-stone-900 dark:text-stone-50 font-bold">−</Text>
        </Pressable>
        <Text className="text-stone-900 dark:text-stone-50 font-bold text-base w-10 text-center">
          {entry.grade ?? DEFAULT_GRADE}
        </Text>
        <Pressable
          onPress={() => {
            const grades = GRADES;
            const idx = grades.indexOf(entry.grade ?? DEFAULT_GRADE);
            if (idx < grades.length - 1) {
              Haptics.selectionAsync();
              onUpdate({ grade: grades[idx + 1] });
            }
          }}
          className="bg-stone-200 dark:bg-stone-700 rounded-lg w-8 h-8 items-center justify-center"
        >
          <Text className="text-stone-900 dark:text-stone-50 font-bold">+</Text>
        </Pressable>
      </View>

      {/* Success / Attempts */}
      <View className="flex-row items-center gap-3">
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            onUpdate({ success: !entry.success });
          }}
          className="flex-row items-center gap-1"
        >
          <Ionicons
            name={entry.success ? 'checkmark-circle' : 'checkmark-circle-outline'}
            size={22}
            color={entry.success ? '#22C55E' : colors.textMuted}
          />
          <Text
            className="text-sm font-semibold"
            style={{ color: entry.success ? '#22C55E' : colors.textMuted }}
          >
            {entry.success ? 'Réussi' : 'Échoué'}
          </Text>
        </Pressable>

        <View className="flex-row items-center gap-1 ml-auto">
          <Text className="text-stone-500 dark:text-stone-400 text-xs">Essais</Text>
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              onUpdate({ attempts: Math.max(1, (entry.attempts ?? 1) - 1) });
            }}
            className="bg-stone-200 dark:bg-stone-700 rounded-lg w-7 h-7 items-center justify-center"
          >
            <Text className="text-stone-900 dark:text-stone-50 font-bold text-xs">−</Text>
          </Pressable>
          <Text className="text-stone-900 dark:text-stone-50 font-bold text-sm w-6 text-center">
            {entry.attempts ?? 1}
          </Text>
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              onUpdate({ attempts: (entry.attempts ?? 1) + 1 });
            }}
            className="bg-stone-200 dark:bg-stone-700 rounded-lg w-7 h-7 items-center justify-center"
          >
            <Text className="text-stone-900 dark:text-stone-50 font-bold text-xs">+</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
```

**Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add app/journal/add-bloc.tsx
git commit -m "feat: add bloc session creation page with route-by-route entries"
```

---

## Task 4: Create voie session page (`/journal/add-voie`)

**Files:**
- Create: `app/journal/add-voie.tsx`

This page has a SegmentedControl for 3 modes: Libre (route-by-route like bloc), Continuité longue, Continuité courte. Each mode shows different form fields.

**Step 1: Create `app/journal/add-voie.tsx`**

```tsx
import { useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, Alert, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useThemeColors } from '@/lib/theme';
import { saveClimbingSession } from '@/lib/storage';
import { todayIso, newClimbEntry, isoToDate, dateToIso, formatClimbingDate, VOIE_MODES, EFFORT_INTENSITIES } from '@/constants/climbing';
import { GRADES, DEFAULT_GRADE } from '@/constants/grades';
import { SegmentedControl } from '@/components/SegmentedControl';
import type { ClimbEntry, VoieMode, EffortIntensity } from '@/types';

type NumericRowProps = {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  onChange: (v: number) => void;
};

function NumericRow({ label, value, min = 0, max = 99, step = 1, suffix, onChange }: NumericRowProps) {
  return (
    <View className="flex-row items-center justify-between py-3">
      <Text className="text-stone-600 dark:text-stone-300 text-sm">{label}</Text>
      <View className="flex-row items-center gap-2">
        <Pressable
          onPress={() => {
            if (value > min) {
              Haptics.selectionAsync();
              onChange(Math.max(min, value - step));
            }
          }}
          className="bg-stone-200 dark:bg-stone-700 rounded-xl w-9 h-9 items-center justify-center"
          style={value <= min ? { opacity: 0.4 } : undefined}
        >
          <Text className="text-stone-900 dark:text-stone-50 font-bold">−</Text>
        </Pressable>
        <Text className="text-stone-900 dark:text-stone-50 font-bold text-base w-14 text-center">
          {value}{suffix ?? ''}
        </Text>
        <Pressable
          onPress={() => {
            if (value < max) {
              Haptics.selectionAsync();
              onChange(Math.min(max, value + step));
            }
          }}
          className="bg-stone-200 dark:bg-stone-700 rounded-xl w-9 h-9 items-center justify-center"
          style={value >= max ? { opacity: 0.4 } : undefined}
        >
          <Text className="text-stone-900 dark:text-stone-50 font-bold">+</Text>
        </Pressable>
      </View>
    </View>
  );
}

// Reuse the same VoieEntryRow as BlocEntryRow but without boulder colors (uses grades only)
function VoieEntryRow({
  entry,
  index,
  onUpdate,
  onRemove,
  colors,
}: {
  entry: ClimbEntry;
  index: number;
  onUpdate: (update: Partial<ClimbEntry>) => void;
  onRemove: () => void;
  colors: ReturnType<typeof useThemeColors>;
}) {
  return (
    <View className="bg-stone-100 dark:bg-stone-800 rounded-2xl p-3 mb-2 border border-stone-300 dark:border-stone-700/50">
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-stone-500 dark:text-stone-400 text-xs font-semibold">
          Voie {index + 1}
        </Text>
        <Pressable onPress={onRemove} hitSlop={12}>
          <Ionicons name="close-circle" size={20} color={colors.textMuted} />
        </Pressable>
      </View>

      {/* Grade stepper */}
      <View className="flex-row items-center gap-3 mb-2">
        <Text className="text-stone-500 dark:text-stone-400 text-xs w-12">Grade</Text>
        <Pressable
          onPress={() => {
            const idx = GRADES.indexOf(entry.grade ?? DEFAULT_GRADE);
            if (idx > 0) {
              Haptics.selectionAsync();
              onUpdate({ grade: GRADES[idx - 1] });
            }
          }}
          className="bg-stone-200 dark:bg-stone-700 rounded-lg w-8 h-8 items-center justify-center"
        >
          <Text className="text-stone-900 dark:text-stone-50 font-bold">−</Text>
        </Pressable>
        <Text className="text-stone-900 dark:text-stone-50 font-bold text-base w-10 text-center">
          {entry.grade ?? DEFAULT_GRADE}
        </Text>
        <Pressable
          onPress={() => {
            const idx = GRADES.indexOf(entry.grade ?? DEFAULT_GRADE);
            if (idx < GRADES.length - 1) {
              Haptics.selectionAsync();
              onUpdate({ grade: GRADES[idx + 1] });
            }
          }}
          className="bg-stone-200 dark:bg-stone-700 rounded-lg w-8 h-8 items-center justify-center"
        >
          <Text className="text-stone-900 dark:text-stone-50 font-bold">+</Text>
        </Pressable>
      </View>

      {/* Success / Attempts */}
      <View className="flex-row items-center gap-3">
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            onUpdate({ success: !entry.success });
          }}
          className="flex-row items-center gap-1"
        >
          <Ionicons
            name={entry.success ? 'checkmark-circle' : 'checkmark-circle-outline'}
            size={22}
            color={entry.success ? '#22C55E' : colors.textMuted}
          />
          <Text
            className="text-sm font-semibold"
            style={{ color: entry.success ? '#22C55E' : colors.textMuted }}
          >
            {entry.success ? 'Réussi' : 'Échoué'}
          </Text>
        </Pressable>

        <View className="flex-row items-center gap-1 ml-auto">
          <Text className="text-stone-500 dark:text-stone-400 text-xs">Essais</Text>
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              onUpdate({ attempts: Math.max(1, (entry.attempts ?? 1) - 1) });
            }}
            className="bg-stone-200 dark:bg-stone-700 rounded-lg w-7 h-7 items-center justify-center"
          >
            <Text className="text-stone-900 dark:text-stone-50 font-bold text-xs">−</Text>
          </Pressable>
          <Text className="text-stone-900 dark:text-stone-50 font-bold text-sm w-6 text-center">
            {entry.attempts ?? 1}
          </Text>
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              onUpdate({ attempts: (entry.attempts ?? 1) + 1 });
            }}
            className="bg-stone-200 dark:bg-stone-700 rounded-lg w-7 h-7 items-center justify-center"
          >
            <Text className="text-stone-900 dark:text-stone-50 font-bold text-xs">+</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export default function AddVoieScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  const [date, setDate] = useState(todayIso());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [mode, setMode] = useState<VoieMode>('libre');
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState('');

  // Libre mode state
  const [entries, setEntries] = useState<ClimbEntry[]>([newClimbEntry()]);

  // Continuity-long state
  const [clRounds, setClRounds] = useState(2);
  const [clEffort, setClEffort] = useState(15);
  const [clRest, setClRest] = useState(10);
  const [clIntensity, setClIntensity] = useState<EffortIntensity>('correct');

  // Continuity-short state
  const [csRounds, setCsRounds] = useState(4);
  const [csSets, setCsSets] = useState(4);
  const [csEffort, setCsEffort] = useState(3);
  const [csRest, setCsRest] = useState(3);
  const [csFell, setCsFell] = useState(0);

  const addEntry = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEntries((prev) => [...prev, newClimbEntry()]);
  }, []);

  const removeEntry = useCallback((id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const updateEntry = useCallback((id: string, update: Partial<ClimbEntry>) => {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...update } : e)));
  }, []);

  const handleSave = useCallback(async () => {
    if (mode === 'libre' && entries.length === 0) {
      Alert.alert('Erreur', 'Ajoute au moins une voie.');
      return;
    }
    setSaving(true);
    const base = {
      id: Date.now().toString(),
      date,
      type: 'voie' as const,
      voieMode: mode,
      ...(notes ? { notes } : {}),
    };

    if (mode === 'libre') {
      await saveClimbingSession({ ...base, entries });
    } else if (mode === 'continuity-long') {
      await saveClimbingSession({
        ...base,
        rounds: clRounds,
        effortPerRound: clEffort,
        restBetweenRounds: clRest,
        intensity: clIntensity,
      });
    } else {
      await saveClimbingSession({
        ...base,
        rounds: csRounds,
        setsPerRound: csSets,
        effortPerSet: csEffort,
        restBetweenSets: csRest,
        ...(csFell > 0 ? { fellFromRound: csFell } : {}),
      });
    }
    setSaving(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  }, [mode, date, notes, entries, clRounds, clEffort, clRest, clIntensity, csRounds, csSets, csEffort, csRest, csFell, router]);

  return (
    <View className="flex-1 bg-white dark:bg-stone-950">
      <ScrollView className="flex-1 px-5 pt-4">
        {/* Mode selector */}
        <View className="mb-4">
          <SegmentedControl options={VOIE_MODES} value={mode} onChange={setMode} />
        </View>

        {/* Date picker */}
        <Pressable
          onPress={() => setShowDatePicker(true)}
          className="bg-stone-100 dark:bg-stone-800 rounded-2xl px-4 py-3 mb-4 flex-row items-center border border-stone-300 dark:border-stone-700/50"
        >
          <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
          <Text className="text-stone-900 dark:text-stone-50 font-semibold ml-3 flex-1">
            {formatClimbingDate(date)}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={colors.chevron} />
        </Pressable>

        {showDatePicker && (
          <DateTimePicker
            value={isoToDate(date)}
            mode="date"
            onChange={(_, d) => {
              setShowDatePicker(false);
              if (d) setDate(dateToIso(d));
            }}
          />
        )}

        {/* Mode-specific form */}
        {mode === 'libre' && (
          <View>
            <Text className="text-stone-400 dark:text-stone-500 text-xs font-semibold uppercase tracking-wide mb-2">
              Voies ({entries.length})
            </Text>
            {entries.map((entry, index) => (
              <VoieEntryRow
                key={entry.id}
                entry={entry}
                index={index}
                onUpdate={(update) => updateEntry(entry.id, update)}
                onRemove={() => removeEntry(entry.id)}
                colors={colors}
              />
            ))}
            <Pressable
              onPress={addEntry}
              className="bg-stone-100 dark:bg-stone-800 rounded-2xl px-4 py-3 flex-row items-center justify-center border border-dashed border-stone-300 dark:border-stone-700/50 mb-4"
            >
              <Ionicons name="add-circle-outline" size={18} color="#2563EB" />
              <Text className="text-blue-600 font-semibold ml-2">Ajouter une voie</Text>
            </Pressable>
          </View>
        )}

        {mode === 'continuity-long' && (
          <View className="bg-stone-100 dark:bg-stone-800 rounded-2xl px-4 border border-stone-300 dark:border-stone-700/50 mb-4">
            <NumericRow label="Tours" value={clRounds} min={1} max={5} onChange={setClRounds} />
            <NumericRow label="Effort / tour" value={clEffort} min={1} max={30} suffix=" min" onChange={setClEffort} />
            <NumericRow label="Repos entre tours" value={clRest} min={1} max={20} suffix=" min" onChange={setClRest} />
            <View className="py-3">
              <Text className="text-stone-600 dark:text-stone-300 text-sm mb-2">Intensité ressentie</Text>
              <SegmentedControl options={EFFORT_INTENSITIES} value={clIntensity} onChange={setClIntensity} />
            </View>
          </View>
        )}

        {mode === 'continuity-short' && (
          <View className="bg-stone-100 dark:bg-stone-800 rounded-2xl px-4 border border-stone-300 dark:border-stone-700/50 mb-4">
            <NumericRow label="Tours" value={csRounds} min={1} max={8} onChange={setCsRounds} />
            <NumericRow label="Séries / tour" value={csSets} min={1} max={8} onChange={setCsSets} />
            <NumericRow label="Effort / série" value={csEffort} min={1} max={15} suffix=" min" onChange={setCsEffort} />
            <NumericRow label="Repos entre séries" value={csRest} min={1} max={10} suffix=" min" onChange={setCsRest} />
            <NumericRow label="Tombé au tour" value={csFell} min={0} max={csRounds} onChange={setCsFell} />
          </View>
        )}

        {/* Notes */}
        <View className="mb-4">
          <TextInput
            placeholder="Notes (optionnel)"
            value={notes}
            onChangeText={setNotes}
            multiline
            className="bg-stone-100 dark:bg-stone-800 rounded-2xl px-4 py-3 text-stone-900 dark:text-stone-50 border border-stone-300 dark:border-stone-700/50 min-h-[80px]"
            placeholderTextColor={colors.textMuted}
            textAlignVertical="top"
          />
        </View>

        <View className="h-24" />
      </ScrollView>

      {/* Sticky save */}
      <View
        className="px-5 pt-3 bg-white dark:bg-stone-950 border-t border-stone-200 dark:border-stone-800"
        style={{ paddingBottom: Math.max(insets.bottom, 16) }}
      >
        <Pressable
          onPress={handleSave}
          disabled={saving}
          className="bg-blue-600 rounded-2xl py-4 items-center"
          style={({ pressed }) => ({ opacity: pressed || saving ? 0.7 : 1 })}
        >
          <Text className="text-white font-bold text-base">
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
```

**Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add app/journal/add-voie.tsx
git commit -m "feat: add voie session page with libre/continuity modes"
```

---

## Task 5: Create hangboard page (`/journal/add-hangboard`)

**Files:**
- Create: `app/journal/add-hangboard.tsx`

This page shows protocols and custom workouts, reusing data from constants/protocols.ts and lib/storage.ts.

**Step 1: Create `app/journal/add-hangboard.tsx`**

```tsx
import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useThemeColors } from '@/lib/theme';
import { getProtocolsByFamily, PROTOCOL_FAMILIES } from '@/constants/protocols';
import { loadCustomWorkouts } from '@/lib/storage';
import type { Protocol, CustomWorkout } from '@/types';
import { useTimerStore } from '@/stores/timer-store';

export default function AddHangboardScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const [customWorkouts, setCustomWorkouts] = useState<CustomWorkout[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCustomWorkouts().then((wk) => {
      setCustomWorkouts(wk);
      setLoading(false);
    });
  }, []);

  const handleProtocol = useCallback((protocol: Protocol) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/protocol/${protocol.id}` as any);
  }, [router]);

  const handleWorkout = useCallback((workout: CustomWorkout) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Launch first step directly into timer
    const step = workout.steps[0];
    if (!step) return;
    const protocolId = step.type === 'protocol' ? step.protocolId : undefined;
    useTimerStore.getState().setup({
      protocol: { id: protocolId ?? workout.id, name: workout.name } as any,
      gripMode: step.gripMode,
      gripConfigs: step.gripConfigs,
      timerConfig: step.config,
    });
    router.push('/timer' as any);
  }, [router]);

  return (
    <ScrollView className="flex-1 bg-white dark:bg-stone-950 px-5 pt-4">
      {/* Protocols section */}
      <Text className="text-stone-400 dark:text-stone-500 text-xs font-semibold uppercase tracking-wide mb-3">
        Protocoles
      </Text>

      {PROTOCOL_FAMILIES.map((family) => {
        const protocols = getProtocolsByFamily(family.id);
        return (
          <View key={family.id} className="mb-4">
            <Text className="text-stone-600 dark:text-stone-300 text-sm font-semibold mb-2">
              {family.label}
            </Text>
            {protocols.map((protocol) => (
              <Pressable
                key={protocol.id}
                onPress={() => handleProtocol(protocol)}
                className="bg-stone-100 dark:bg-stone-800 rounded-2xl px-4 py-3 mb-2 flex-row items-center border border-stone-300 dark:border-stone-700/50"
                style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
              >
                <Text className="text-lg mr-3">{protocol.icon}</Text>
                <View className="flex-1">
                  <Text className="text-stone-900 dark:text-stone-50 font-semibold text-sm">
                    {protocol.name}
                  </Text>
                  <Text className="text-stone-500 dark:text-stone-400 text-xs" numberOfLines={1}>
                    {protocol.summary}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.chevron} />
              </Pressable>
            ))}
          </View>
        );
      })}

      {/* Custom workouts section */}
      <Text className="text-stone-400 dark:text-stone-500 text-xs font-semibold uppercase tracking-wide mb-3 mt-4">
        Mes entraînements
      </Text>

      {loading ? (
        <ActivityIndicator color="#818CF8" />
      ) : customWorkouts.length === 0 ? (
        <View className="bg-stone-100 dark:bg-stone-800 rounded-2xl p-4 items-center border border-stone-300 dark:border-stone-700/50">
          <Text className="text-stone-500 dark:text-stone-400 text-sm text-center">
            Aucun entraînement personnalisé
          </Text>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/create-workout' as any);
            }}
            className="mt-3"
          >
            <Text className="text-indigo-400 font-semibold text-sm">Créer un entraînement</Text>
          </Pressable>
        </View>
      ) : (
        customWorkouts.map((workout) => (
          <Pressable
            key={workout.id}
            onPress={() => handleWorkout(workout)}
            className="bg-stone-100 dark:bg-stone-800 rounded-2xl px-4 py-3 mb-2 flex-row items-center border border-stone-300 dark:border-stone-700/50"
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <Text className="text-lg mr-3">{workout.icon}</Text>
            <View className="flex-1">
              <Text className="text-stone-900 dark:text-stone-50 font-semibold text-sm">
                {workout.name}
              </Text>
              <Text className="text-stone-500 dark:text-stone-400 text-xs">
                {workout.steps.length} étape{workout.steps.length > 1 ? 's' : ''}
              </Text>
            </View>
            <Ionicons name="play-circle-outline" size={22} color="#818CF8" />
          </Pressable>
        ))
      )}

      <View className="h-20" />
    </ScrollView>
  );
}
```

**Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add app/journal/add-hangboard.tsx
git commit -m "feat: add hangboard page with protocols and custom workouts"
```

---

## Task 6: Clean up — remove old BottomSheet quick-log from journal.tsx

**Files:**
- Modify: `app/journal.tsx`

**Step 1: Remove BottomSheet code**

Remove from `journal.tsx`:
- All quick-log state variables (`quickLogType`, `quickLogCount`, `quickLogDifficulty`, `quickLogPrefillDate`, `quickLogSaving`)
- `bottomSheetRef`
- `resetQuickLogForm`, `buildQuickLogSession`, `handleQuickLogSave`, `handleQuickLogAddDetails`, `openQuickLog` callbacks
- The `params.quicklog` effect
- The entire `<BottomSheet>` component for quick-log (lines ~570-773)
- Remove unused imports (`BottomSheet`, `BottomSheetBackdrop`, etc. — only if not used by dayDetailSheet)

Keep the `dayDetailSheetRef` and its BottomSheet (for day detail view in calendar mode).

**Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 3: Test on device**

- Open Suivi screen
- Tap "Ajouter une activité" → should navigate to activity picker
- Tap Bloc → should open bloc form
- Tap back → Voie → should open voie form with SegmentedControl
- Tap back → Hangboard → should show protocols + workouts
- Create a bloc session → should save and appear in journal
- Create a voie libre session → should save
- Create a continuité longue session → should save
- Create a continuité courte session → should save

**Step 4: Commit**

```bash
git add app/journal.tsx
git commit -m "refactor: remove old BottomSheet quick-log, use new add-activity flow"
```

---

## Task 7: Update useJournalEntries for new voie modes

**Files:**
- Modify: `hooks/useJournalEntries.ts`

**Step 1: Update stats computation**

In the `computeStats` function, voie sessions with `voieMode` of `continuity-long` or `continuity-short` should still count as voie sessions (they already will since `type === 'voie'`). No changes needed for counting.

For success rate: continuity sessions don't have entries, so they won't affect the success rate calculation (which only iterates entries). This is correct behavior.

Verify that the existing filter logic handles the new fields gracefully — `JournalFilter` of `'voie'` should match all voie sessions regardless of `voieMode`.

**Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: PASS (likely no code changes needed, just verification)

**Step 3: Commit (only if changes were needed)**

```bash
git add hooks/useJournalEntries.ts
git commit -m "fix: ensure voie mode sessions are counted correctly in stats"
```
