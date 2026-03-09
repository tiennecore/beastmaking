# Design System "Granite & Chalk" Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate the Beastmaking Timer app from a cold neutral palette to a warm stone/orange "Granite & Chalk" climbing-culture design system, and redesign the 4 key screens (menu, config, timer, recap).

**Architecture:** The migration has 3 phases: (1) update design tokens in constants and layout, (2) redesign the 4 key screens with new UX patterns (progress bar, stat grid, pill badges), (3) batch-propagate stone palette to all remaining screens. NativeWind v4 maps Tailwind classes to React Native styles, so `bg-stone-950` works exactly like `bg-neutral-900` did.

**Tech Stack:** React Native, Expo SDK 55, TypeScript, NativeWind v4, Zustand, Expo Router

---

### Task 1: Update Design Tokens (constants/colors.ts)

**Files:**
- Modify: `constants/colors.ts`

**Step 1: Update PHASE_COLORS with new palette**

Replace the entire file contents with:

```typescript
import { TimerPhase } from '@/types';

export const PHASE_COLORS: Record<TimerPhase, string> = {
  idle: '#1C1917',      // stone-950
  prep: '#FBBF24',      // amber-400
  hang: '#F97316',      // orange-500 (Beastmaker signature)
  restRep: '#22D3EE',   // cyan-400
  restSet: '#818CF8',   // indigo-400
  restRound: '#A3E635', // lime-400
  done: '#1C1917',      // stone-950
};

export const PHASE_LABELS: Record<TimerPhase, string> = {
  idle: '',
  prep: 'PRET',
  hang: 'SUSPENDU',
  restRep: 'REPOS',
  restSet: 'REPOS SERIE',
  restRound: 'REPOS TOUR',
  done: 'TERMINE',
};

export const COLOR_PALETTE = [
  '#F97316', // orange (accent)
  '#FBBF24', // amber
  '#A3E635', // lime
  '#22D3EE', // cyan
  '#818CF8', // indigo
  '#EC4899', // pink
  '#EF4444', // red
  '#06B6D4', // teal
  '#8B5CF6', // violet
  '#78716C', // stone
];
```

**Step 2: Verify tests still pass**

Run: `npx jest --passWithNoTests`
Expected: All timer-engine tests pass (they use PHASE_COLORS indirectly)

**Step 3: Commit**

```bash
git add constants/colors.ts
git commit -m "style: update design tokens to Granite & Chalk palette"
```

---

### Task 2: Update Root Layout (app/_layout.tsx)

**Files:**
- Modify: `app/_layout.tsx`

**Step 1: Replace hardcoded #1a1a1a with stone-950**

Change lines 18 and 20 — replace `#1a1a1a` with `#1C1917` (stone-950):

```typescript
screenOptions={{
  headerStyle: { backgroundColor: '#1C1917' },
  headerTintColor: '#fff',
  contentStyle: { backgroundColor: '#1C1917' },
}}
```

**Step 2: Verify app loads**

Run: `npx expo start` and confirm the header/background color is warm stone instead of cold neutral.

**Step 3: Commit**

```bash
git add app/_layout.tsx
git commit -m "style: update layout background to stone-950"
```

---

### Task 3: Redesign Menu Principal (app/index.tsx)

**Files:**
- Modify: `app/index.tsx`

**Step 1: Apply full redesign**

Replace the entire file with:

```tsx
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';

type MenuItem = {
  title: string;
  subtitle: string;
  icon: string;
  href: string;
  color: string;
};

const MENU_ITEMS: MenuItem[] = [
  {
    title: 'Entrainements',
    subtitle: '9 protocoles Beastmaking',
    icon: '💪',
    href: '/protocols',
    color: '#F97316',
  },
  {
    title: 'Creer un entrainement',
    subtitle: 'Composer ou creer de zero',
    icon: '✏️',
    href: '/create-workout',
    color: '#FBBF24',
  },
  {
    title: 'Mes entrainements',
    subtitle: 'Entrainements personnalises',
    icon: '⭐',
    href: '/custom-workouts',
    color: '#F59E0B',
  },
  {
    title: 'Comprendre',
    subtitle: 'Principes, systemes, prehensions',
    icon: '📖',
    href: '/library',
    color: '#22D3EE',
  },
  {
    title: 'Historique',
    subtitle: 'Seances passees',
    icon: '📊',
    href: '/history',
    color: '#818CF8',
  },
  {
    title: 'Grimpe',
    subtitle: 'Bloc, voie, renfo',
    icon: '🧗',
    href: '/climbing',
    color: '#A3E635',
  },
];

export default function HomeScreen() {
  const router = useRouter();

  return (
    <ScrollView className="flex-1 bg-stone-950 px-4 pt-12">
      <Text className="text-stone-50 text-3xl font-bold tracking-tight mb-1">
        Beastmaking
      </Text>
      <Text className="text-stone-400 mb-8">Timer d'entrainement escalade</Text>

      <View className="gap-3">
        {MENU_ITEMS.map((item) => (
          <Pressable
            key={item.href}
            className="bg-stone-800 rounded-2xl p-4 flex-row items-center border border-stone-700 active:bg-stone-700"
            style={{ borderLeftWidth: 3, borderLeftColor: item.color }}
            onPress={() => router.push(item.href as any)}
          >
            <Text className="text-3xl mr-4">{item.icon}</Text>
            <View className="flex-1">
              <Text className="text-stone-50 text-lg font-bold">{item.title}</Text>
              <Text className="text-stone-400 text-sm">{item.subtitle}</Text>
            </View>
            <Text className="text-stone-500 text-xl">›</Text>
          </Pressable>
        ))}
      </View>

      <View className="h-12" />
    </ScrollView>
  );
}
```

Key changes:
- `bg-neutral-900` → `bg-stone-950`
- `bg-neutral-800` → `bg-stone-800`
- `text-white` → `text-stone-50`
- `text-neutral-400` → `text-stone-400`
- `text-neutral-600` → `text-stone-500`
- `rounded-xl` → `rounded-2xl`
- Added `border border-stone-700`
- Added `active:bg-stone-700`
- Border left width 4 → 3
- Item colors updated to match palette
- Added `tracking-tight` on title

**Step 2: Verify visually**

Open app on device/emulator, check:
- Warm stone background (not cold gray)
- Cards with subtle border + colored left accent
- Text readable on all cards

**Step 3: Commit**

```bash
git add app/index.tsx
git commit -m "style: redesign menu with Granite & Chalk palette"
```

---

### Task 4: Redesign TimerConfigForm (components/TimerConfigForm.tsx)

**Files:**
- Modify: `components/TimerConfigForm.tsx`

**Step 1: Apply full redesign**

Replace the entire file with:

```tsx
import { Text, View, Pressable } from 'react-native';
import { useRef, useCallback, useState } from 'react';
import { TimerConfig, TimerPhase } from '@/types';
import { PHASE_COLORS } from '@/constants/colors';
import { COLOR_PALETTE } from '@/constants/colors';

type Props = {
  config: TimerConfig;
  onChange: (config: TimerConfig) => void;
};

// --- Long press repeat button ---

function RepeatButton({
  label,
  onStep,
}: {
  label: string;
  onStep: () => void;
}) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const speedRef = useRef(300);

  const startRepeat = useCallback(() => {
    onStep();
    speedRef.current = 300;

    const tick = () => {
      onStep();
      speedRef.current = Math.max(50, speedRef.current * 0.85);
      timerRef.current = setTimeout(tick, speedRef.current);
    };

    timerRef.current = setTimeout(tick, 400);
  }, [onStep]);

  const stopRepeat = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    timerRef.current = null;
    intervalRef.current = null;
  }, []);

  return (
    <Pressable
      className="bg-stone-700 rounded-lg w-10 h-10 items-center justify-center active:bg-stone-600"
      onPressIn={startRepeat}
      onPressOut={stopRepeat}
    >
      <Text className="text-stone-50 font-bold text-lg">{label}</Text>
    </Pressable>
  );
}

// --- Volume stepper button ---

function StepButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      className="bg-stone-700 rounded-lg w-9 h-9 items-center justify-center active:bg-stone-600"
      onPress={onPress}
    >
      <Text className="text-stone-50 font-bold text-sm">{label}</Text>
    </Pressable>
  );
}

// --- Color picker row ---

function ColorPicker({
  current,
  onSelect,
}: {
  current: string;
  onSelect: (color: string) => void;
}) {
  return (
    <View className="flex-row flex-wrap gap-2 mt-2">
      {COLOR_PALETTE.map((color) => (
        <Pressable
          key={color}
          onPress={() => onSelect(color)}
          className="w-8 h-8 rounded-full items-center justify-center"
          style={[
            { backgroundColor: color },
            current === color && {
              borderWidth: 2,
              borderColor: '#F5F5F4',
            },
          ]}
        >
          {current === color && (
            <Text className="text-white text-xs font-bold">✓</Text>
          )}
        </Pressable>
      ))}
    </View>
  );
}

// --- Format seconds to mm:ss ---

function formatSeconds(s: number): string {
  const min = Math.floor(s / 60);
  const sec = s % 60;
  if (min === 0) return `${sec}s`;
  return sec > 0 ? `${min}m${sec.toString().padStart(2, '0')}s` : `${min}m`;
}

// --- Duration card config ---

type DurationField = {
  key: keyof TimerConfig;
  phase: TimerPhase;
  label: string;
  emoji: string;
};

const DURATION_CARDS: DurationField[] = [
  { key: 'prepDuration', phase: 'prep', label: 'Preparation', emoji: '⏳' },
  { key: 'hangDuration', phase: 'hang', label: 'Suspension', emoji: '🤚' },
  { key: 'restBetweenReps', phase: 'restRep', label: 'Repos repetition', emoji: '💨' },
  { key: 'restBetweenSets', phase: 'restSet', label: 'Repos serie', emoji: '😮‍💨' },
  { key: 'restBetweenRounds', phase: 'restRound', label: 'Repos tour', emoji: '🧘' },
];

const VOLUME_FIELDS = [
  { key: 'reps' as keyof TimerConfig, label: 'Repetitions par serie' },
  { key: 'sets' as keyof TimerConfig, label: 'Nombre de series' },
  { key: 'rounds' as keyof TimerConfig, label: 'Nombre de tours' },
];

// --- Main component ---

export function TimerConfigForm({ config, onChange }: Props) {
  const [expandedColor, setExpandedColor] = useState<string | null>(null);

  const adjust = (key: keyof TimerConfig, delta: number, min = 0) => {
    const current = (config[key] ?? 0) as number;
    const next = Math.max(min, current + delta);
    onChange({ ...config, [key]: next });
  };

  const getColor = (phase: TimerPhase): string => {
    return config.phaseColors?.[phase] ?? PHASE_COLORS[phase];
  };

  const setColor = (phase: TimerPhase, color: string) => {
    onChange({
      ...config,
      phaseColors: { ...config.phaseColors, [phase]: color },
    });
  };

  const volumeVisible = VOLUME_FIELDS.filter((f) => config[f.key] !== undefined);
  const durationVisible = DURATION_CARDS.filter((f) => config[f.key] !== undefined);

  return (
    <View className="mb-6">
      <Text className="text-stone-50 text-lg font-bold mb-3">Parametres</Text>

      {/* Volume section */}
      {volumeVisible.length > 0 && (
        <View className="mb-4">
          <Text className="text-stone-500 text-xs font-semibold uppercase tracking-wide mb-2">
            Volume
          </Text>
          <View className="bg-stone-800 rounded-2xl overflow-hidden border border-stone-700">
            {volumeVisible.map((field, i) => (
              <View
                key={field.key}
                className={`px-4 py-3 ${
                  i < volumeVisible.length - 1 ? 'border-b border-stone-700' : ''
                }`}
              >
                <Text className="text-stone-300 mb-2">{field.label}</Text>
                <View className="flex-row items-center justify-center gap-2">
                  <StepButton label="-2" onPress={() => adjust(field.key, -2, 1)} />
                  <StepButton label="-1" onPress={() => adjust(field.key, -1, 1)} />
                  <Text className="text-stone-50 text-xl font-bold w-12 text-center">
                    {config[field.key] as number}
                  </Text>
                  <StepButton label="+1" onPress={() => adjust(field.key, 1, 1)} />
                  <StepButton label="+2" onPress={() => adjust(field.key, 2, 1)} />
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Duration cards */}
      {durationVisible.length > 0 && (
        <View className="mb-4">
          <Text className="text-stone-500 text-xs font-semibold uppercase tracking-wide mb-2">
            Durees
          </Text>
          <View className="flex-row flex-wrap gap-3">
            {durationVisible.map((field) => {
              const color = getColor(field.phase);
              const value = (config[field.key] ?? 0) as number;
              const isColorOpen = expandedColor === field.key;

              return (
                <View
                  key={field.key}
                  className="bg-stone-800 rounded-2xl p-3 flex-1 border border-stone-700"
                  style={{
                    borderLeftWidth: 3,
                    borderLeftColor: color,
                    minWidth: '45%',
                  }}
                >
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-stone-400 text-xs font-semibold">
                      {field.emoji} {field.label}
                    </Text>
                    <Pressable
                      onPress={() =>
                        setExpandedColor(isColorOpen ? null : field.key)
                      }
                      className="w-5 h-5 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                  </View>

                  <Text className="text-stone-50 text-2xl font-bold text-center mb-2">
                    {formatSeconds(value)}
                  </Text>

                  <View className="flex-row items-center justify-center gap-3">
                    <RepeatButton
                      label="−"
                      onStep={() => adjust(field.key, -1, 0)}
                    />
                    <RepeatButton
                      label="+"
                      onStep={() => adjust(field.key, 1, 0)}
                    />
                  </View>

                  {isColorOpen && (
                    <ColorPicker
                      current={color}
                      onSelect={(c) => {
                        setColor(field.phase, c);
                        setExpandedColor(null);
                      }}
                    />
                  )}
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Load section */}
      <View className="mb-4">
        <Text className="text-stone-500 text-xs font-semibold uppercase tracking-wide mb-2">
          Charge
        </Text>
        <View className="bg-stone-800 rounded-2xl px-4 py-3 border border-stone-700">
          <View className="flex-row items-center justify-center gap-2">
            <StepButton label="-10" onPress={() => adjust('loadKg', -10, 0)} />
            <StepButton label="-5" onPress={() => adjust('loadKg', -5, 0)} />
            <StepButton label="-1" onPress={() => adjust('loadKg', -1, 0)} />
            <Text className="text-stone-50 text-xl font-bold w-16 text-center">
              {config.loadKg ?? 0} kg
            </Text>
            <StepButton label="+1" onPress={() => adjust('loadKg', 1, 0)} />
            <StepButton label="+5" onPress={() => adjust('loadKg', 5, 0)} />
            <StepButton label="+10" onPress={() => adjust('loadKg', 10, 0)} />
          </View>
        </View>
      </View>
    </View>
  );
}
```

Key changes:
- All `neutral-*` → `stone-*`
- All `rounded-xl` → `rounded-2xl` on cards
- Added `border border-stone-700` on all cards
- Color picker circles: `w-7 h-7` → `w-8 h-8` with white ring when selected (borderWidth instead of checkmark-only)
- Border left width: 4 → 3

**Step 2: Verify visually**

Open protocol config screen on device. Check:
- Stone-warm card backgrounds
- Colored left borders on duration cards
- Color picker with white ring on selected color
- Stepper buttons in stone-700

**Step 3: Commit**

```bash
git add components/TimerConfigForm.tsx
git commit -m "style: redesign TimerConfigForm with Granite & Chalk palette"
```

---

### Task 5: Redesign Protocol Config Screen (app/protocol/[id].tsx)

**Files:**
- Modify: `app/protocol/[id].tsx`

**Step 1: Read current file and apply changes**

The file needs these class replacements:
- `bg-neutral-900` → `bg-stone-950`
- `bg-neutral-800` → `bg-stone-800`
- `text-neutral-400` → `text-stone-400`
- `text-neutral-300` → `text-stone-300`
- `rounded-xl` → `rounded-2xl` (on cards only)
- `bg-red-600` (CTA button) → `bg-orange-500`
- Add `border border-stone-700` on advice card
- Add `tracking-tight` to protocol title

The advice box should change from:
```tsx
<View className="bg-neutral-800 rounded-xl p-4 mb-4">
  <Text className="text-amber-400 font-bold mb-1">💡 Conseil</Text>
  <Text className="text-neutral-300 text-sm">...</Text>
</View>
```

To:
```tsx
<View className="bg-amber-950/40 rounded-2xl p-4 mb-4 border border-amber-800/50">
  <Text className="text-amber-400 font-bold mb-1">💡 Conseil</Text>
  <Text className="text-stone-300 text-sm">...</Text>
</View>
```

The CTA button should change from:
```tsx
<TouchableOpacity className="bg-red-600 rounded-xl py-4 items-center mb-8" ...>
```

To:
```tsx
<TouchableOpacity className="bg-orange-500 rounded-2xl py-4 items-center mb-8" ...>
```

**Step 2: Verify visually**

Navigate to a protocol config. Check:
- Warm background
- Amber advice box with subtle border
- Orange CTA button

**Step 3: Commit**

```bash
git add app/protocol/[id].tsx
git commit -m "style: redesign protocol config with Granite & Chalk palette"
```

---

### Task 6: Redesign Timer Screen (app/timer.tsx)

This is the biggest change — new progress bar, ambient background, pill badge.

**Files:**
- Modify: `app/timer.tsx`

**Step 1: Apply full redesign**

Replace the entire file with:

```tsx
import { useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import { useTimerStore } from '@/stores/timer-store';
import { PHASE_COLORS, PHASE_LABELS } from '@/constants/colors';
import { getGripById } from '@/constants/grips';
import { playCountdown, playStart, playEnd } from '@/lib/sounds';

function formatTime(seconds: number): string {
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  if (min === 0) return String(sec);
  return `${min}:${String(sec).padStart(2, '0')}`;
}

export default function TimerScreen() {
  useKeepAwake();
  const router = useRouter();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevPhaseRef = useRef<number>(-1);

  const {
    isRunning,
    isPaused,
    timeRemaining,
    currentPhaseIndex,
    phases,
    grips,
    protocol,
    config,
    start,
    pause,
    resume,
    stop,
    tick,
    currentPhase,
    progress,
  } = useTimerStore();

  const phase = currentPhase();
  const prog = progress();
  const isDone = currentPhaseIndex >= phases.length;
  const phaseColor = phase
    ? (config?.phaseColors?.[phase.type] ?? PHASE_COLORS[phase.type])
    : PHASE_COLORS.done;
  const phaseLabel = phase ? PHASE_LABELS[phase.type] : 'TERMINE';

  // Phase progress (0 to 1) for the current phase
  const phaseDuration = phase?.duration ?? 1;
  const phaseProgress = 1 - timeRemaining / phaseDuration;

  // Global progress (0 to 1) across all phases
  const globalProgress = phases.length > 0
    ? (currentPhaseIndex + phaseProgress) / phases.length
    : 0;

  // Handle sounds
  useEffect(() => {
    if (currentPhaseIndex !== prevPhaseRef.current) {
      prevPhaseRef.current = currentPhaseIndex;
      if (phase?.type === 'hang') {
        playStart();
      } else if (phase?.type !== 'prep') {
        playEnd();
      }
    }

    if (phase?.type === 'hang' && timeRemaining <= 3 && timeRemaining > 0) {
      playCountdown();
    }
  }, [currentPhaseIndex, timeRemaining, phase]);

  // Handle tick interval
  useEffect(() => {
    if (isRunning && !isPaused) {
      intervalRef.current = setInterval(tick, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, isPaused, tick]);

  // Auto-start on mount
  useEffect(() => {
    if (!isRunning && phases.length > 0 && currentPhaseIndex === 0) {
      start();
    }
  }, []);

  // Navigate to recap when done
  useEffect(() => {
    if (isDone && !isRunning) {
      router.replace('/recap');
    }
  }, [isDone, isRunning]);

  const handleStop = useCallback(() => {
    stop();
    router.replace('/recap');
  }, [stop, router]);

  const gripReminder =
    (phase?.type === 'restSet' || phase?.type === 'restRound') && grips.length > 0
      ? grips.map((g) => getGripById(g)?.name).join(', ')
      : null;

  return (
    <View className="flex-1" style={{ backgroundColor: '#1C1917' }}>
      {/* Ambient color overlay */}
      <View
        className="absolute inset-0"
        style={{ backgroundColor: phaseColor, opacity: 0.12 }}
      />

      {/* Global progress bar */}
      <View className="w-full h-1.5 bg-stone-800">
        <View
          className="h-full rounded-r-full"
          style={{
            width: `${Math.min(globalProgress * 100, 100)}%`,
            backgroundColor: phaseColor,
          }}
        />
      </View>

      {/* Main content */}
      <View className="flex-1 items-center justify-center px-6">
        {/* Phase pill badge */}
        <View
          className="rounded-full px-5 py-1.5 mb-4"
          style={{ backgroundColor: phaseColor + '25' }}
        >
          <Text style={{ color: phaseColor }} className="text-lg font-bold">
            {phaseLabel}
          </Text>
        </View>

        {/* Timer */}
        <Text className="text-stone-50 text-8xl font-bold mb-8">
          {formatTime(timeRemaining)}
        </Text>

        {/* Progress info */}
        <View className="flex-row gap-6 mb-8">
          <View className="items-center">
            <Text className="text-stone-400 text-sm">Repetition</Text>
            <Text className="text-stone-50 text-xl font-bold">
              {prog.rep}/{config?.reps ?? 0}
            </Text>
          </View>
          <View className="w-px bg-stone-700 self-stretch" />
          <View className="items-center">
            <Text className="text-stone-400 text-sm">Serie</Text>
            <Text className="text-stone-50 text-xl font-bold">
              {prog.set}/{prog.totalSets}
            </Text>
          </View>
          {prog.totalRounds > 1 && (
            <>
              <View className="w-px bg-stone-700 self-stretch" />
              <View className="items-center">
                <Text className="text-stone-400 text-sm">Tour</Text>
                <Text className="text-stone-50 text-xl font-bold">
                  {prog.round}/{prog.totalRounds}
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Grip reminder */}
        {gripReminder && (
          <View className="bg-stone-800/80 border border-stone-700 rounded-2xl p-4 mb-6 w-full">
            <Text className="text-stone-50 font-bold mb-1">Prehension suivante</Text>
            <Text className="text-stone-200">{gripReminder}</Text>
            <Text className="text-stone-400 text-sm mt-1">
              Gardez la position correcte (regle des +/-15 deg.)
            </Text>
          </View>
        )}

        {/* Load advice */}
        {(phase?.type === 'restSet' || phase?.type === 'restRound') && protocol && (
          <View className="bg-stone-800/80 border border-stone-700 rounded-2xl p-4 mb-6 w-full">
            <Text className="text-amber-400 text-sm">{protocol.loadAdvice}</Text>
          </View>
        )}

        {/* Controls */}
        <View className="flex-row gap-4">
          <TouchableOpacity
            className="bg-stone-700/60 border border-stone-600 rounded-2xl px-8 py-4"
            onPress={isPaused ? resume : pause}
            activeOpacity={0.7}
          >
            <Text className="text-stone-50 text-lg font-bold">
              {isPaused ? 'Reprendre' : 'Pause'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="bg-red-500/20 border border-red-500 rounded-2xl px-8 py-4"
            onPress={handleStop}
            activeOpacity={0.7}
          >
            <Text className="text-red-400 text-lg font-bold">Arreter</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
```

Key changes:
- **Background**: stone-950 base + phase color at 12% opacity overlay (ambient, not solid)
- **Progress bar**: horizontal bar at top showing global progress
- **Phase label**: pill badge with phase color background at 15% opacity
- **Timer text**: always `text-stone-50` (never colored)
- **Progress info**: `text-stone-400` labels (readable), separators between stats
- **Grip/advice boxes**: `bg-stone-800/80 border border-stone-700 rounded-2xl`
- **Pause button**: outlined stone-700 (not white/20)
- **Stop button**: outlined red-500 (not filled red-900/50) — less accidental taps

**Step 2: Verify visually**

Launch a timer session. Check:
- Ambient color changes with phase (subtle, not blinding)
- Progress bar moves at top
- Phase pill badge shows current phase with color
- Timer text always white/readable
- Stop button is outlined red (not filled)

**Step 3: Commit**

```bash
git add app/timer.tsx
git commit -m "style: redesign timer with ambient bg, progress bar, pill badge"
```

---

### Task 7: Redesign Recap Screen (app/recap.tsx)

**Files:**
- Modify: `app/recap.tsx`

**Step 1: Apply full redesign**

Replace the entire file with:

```tsx
import { useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTimerStore } from '@/stores/timer-store';
import { getGripById } from '@/constants/grips';
import { saveHistoryEntry } from '@/lib/storage';

function formatDuration(seconds: number): string {
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  if (min === 0) return `${sec}s`;
  return sec > 0 ? `${min}min ${sec}s` : `${min}min`;
}

function StatCard({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View className="bg-stone-800 border border-stone-700 rounded-2xl p-3 flex-1">
      <Text className="text-lg mb-1">{icon}</Text>
      <Text className="text-stone-50 text-xl font-bold">{value}</Text>
      <Text className="text-stone-400 text-xs">{label}</Text>
    </View>
  );
}

export default function RecapScreen() {
  const router = useRouter();
  const result = useTimerStore((s) => s.lastResult);
  const savedRef = useRef(false);

  useEffect(() => {
    if (result && !savedRef.current) {
      savedRef.current = true;
      saveHistoryEntry({
        id: Date.now().toString(),
        date: new Date().toISOString(),
        result,
      });
    }
  }, [result]);

  if (!result) {
    return (
      <View className="flex-1 bg-stone-950 items-center justify-center">
        <Text className="text-stone-50">Aucune seance a afficher</Text>
        <TouchableOpacity className="mt-4" onPress={() => router.replace('/')}>
          <Text className="text-orange-400">Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { protocol, grips, completedSets, completedRounds, totalDuration, completed } = result;

  return (
    <ScrollView className="flex-1 bg-stone-950 px-4 pt-8">
      {/* Header */}
      <Text
        className={`text-3xl font-bold tracking-tight text-center mb-2 ${
          completed ? 'text-lime-400' : 'text-amber-400'
        }`}
      >
        {completed ? 'Seance terminee !' : 'Seance interrompue'}
      </Text>
      <Text className="text-stone-400 text-center mb-6">
        {protocol.icon} {protocol.name}
      </Text>

      {/* Stats grid */}
      <View className="flex-row gap-3 mb-4">
        <StatCard
          icon="⏱"
          label="Duree"
          value={formatDuration(totalDuration)}
        />
        <StatCard
          icon="🔁"
          label={completedSets > 1 ? 'Series' : 'Serie'}
          value={String(completedSets)}
        />
      </View>
      <View className="flex-row gap-3 mb-6">
        {completedRounds > 1 && (
          <StatCard
            icon="🔄"
            label="Tours"
            value={String(completedRounds)}
          />
        )}
        {grips.length > 0 && (
          <StatCard
            icon="✋"
            label="Prehensions"
            value={grips.map((g) => getGripById(g)?.name).join(', ')}
          />
        )}
      </View>

      {/* Recovery advice */}
      <View
        className="bg-stone-800 rounded-2xl p-4 mb-4 border border-stone-700"
        style={{ borderLeftWidth: 3, borderLeftColor: '#A3E635' }}
      >
        <Text className="text-lime-400 font-bold mb-1">Recuperation</Text>
        <Text className="text-stone-300">{protocol.recoveryAdvice}</Text>
      </View>

      {/* Frequency advice */}
      <View
        className="bg-stone-800 rounded-2xl p-4 mb-6 border border-stone-700"
        style={{ borderLeftWidth: 3, borderLeftColor: '#22D3EE' }}
      >
        <Text className="text-cyan-400 font-bold mb-1">Frequence recommandee</Text>
        <Text className="text-stone-300">{protocol.frequencyAdvice}</Text>
      </View>

      {/* Return button */}
      <TouchableOpacity
        className="bg-orange-500 rounded-2xl py-4 items-center mb-8"
        onPress={() => router.replace('/')}
        activeOpacity={0.8}
      >
        <Text className="text-white text-lg font-bold">Retour au menu</Text>
      </TouchableOpacity>

      <View className="h-8" />
    </ScrollView>
  );
}
```

Key changes:
- **Background**: stone-950
- **Header**: lime-400 (completed) or amber-400 (interrupted) — no emoji, color conveys state
- **Protocol info**: subtitle under header
- **Stats**: 2x2 grid of StatCard components (icon + value + label)
- **Advice boxes**: unified stone-800 cards with colored left border (lime for recovery, cyan for frequency) — no more different colored backgrounds
- **CTA**: orange-500 (accent) instead of red-600

**Step 2: Verify visually**

Complete a timer session and check recap:
- Lime/amber header depending on completion
- Stats grid with 2-4 cards
- Consistent advice cards with left border accent
- Orange return button

**Step 3: Commit**

```bash
git add app/recap.tsx
git commit -m "style: redesign recap with stat grid and Granite & Chalk palette"
```

---

### Task 8: Redesign GripSelector and ProtocolCard

**Files:**
- Modify: `components/GripSelector.tsx`
- Modify: `components/ProtocolCard.tsx`

**Step 1: Update GripSelector**

Apply these replacements throughout the file:
- `bg-neutral-800` → `bg-stone-800`
- `border-neutral-700` → `border-stone-700`
- `text-neutral-500` → `text-stone-500`
- `text-neutral-400` → `text-stone-400`
- `text-neutral-600` → `text-stone-600`
- `bg-neutral-900` → `bg-stone-950`
- `bg-red-600` → `bg-orange-500` (checkboxes)
- `border-red-600` → `border-orange-500`
- `rounded-t-2xl` stays (modal sheet)
- `rounded-lg` → `rounded-xl` (trigger button)

**Step 2: Update ProtocolCard**

Apply these replacements:
- `bg-neutral-800` → `bg-stone-800`
- `text-neutral-400` → `text-stone-400`
- `text-neutral-300` → `text-stone-300`
- `rounded-xl` → `rounded-2xl`
- Add `border border-stone-700`

**Step 3: Verify visually**

Open protocol list and config screen. Check both components look cohesive with the new palette.

**Step 4: Commit**

```bash
git add components/GripSelector.tsx components/ProtocolCard.tsx
git commit -m "style: update GripSelector and ProtocolCard to Granite & Chalk"
```

---

### Task 9: Propagate to Protocols and Library Screens

**Files:**
- Modify: `app/protocols.tsx`
- Modify: `app/library.tsx`
- Modify: `components/library/PrinciplesSection.tsx`
- Modify: `components/library/EnergySystemsSection.tsx`
- Modify: `components/library/GripsSection.tsx`
- Modify: `components/library/ParametersSection.tsx`
- Modify: `components/library/CrimpLearningSection.tsx`

**Step 1: Apply batch replacements**

For ALL files above, apply these find-and-replace:
- `bg-neutral-900` → `bg-stone-950`
- `bg-neutral-800` → `bg-stone-800`
- `text-neutral-400` → `text-stone-400`
- `text-neutral-300` → `text-stone-300`
- `text-neutral-500` → `text-stone-500`
- `rounded-lg` → `rounded-xl` (library cards)

`protocols.tsx` only has `bg-neutral-900` to replace.

`library.tsx` only has `bg-neutral-900` to replace.

Library sections each have 1-3 neutral classes to replace.

**Step 2: Verify visually**

Navigate to Protocols list and Library. Check warm backgrounds, consistent text colors.

**Step 3: Commit**

```bash
git add app/protocols.tsx app/library.tsx components/library/
git commit -m "style: propagate Granite & Chalk to protocols and library"
```

---

### Task 10: Propagate to Remaining Screens

**Files:**
- Modify: `app/create-workout.tsx`
- Modify: `app/custom-workouts.tsx`
- Modify: `app/history.tsx`
- Modify: `app/climbing.tsx`

**Step 1: Apply batch replacements to all 4 files**

For ALL files, apply these find-and-replace:
- `bg-neutral-900` → `bg-stone-950`
- `bg-neutral-800` → `bg-stone-800`
- `bg-neutral-700` → `bg-stone-700`
- `bg-neutral-600` → `bg-stone-600`
- `active:bg-neutral-600` → `active:bg-stone-600`
- `text-neutral-500` → `text-stone-500`
- `text-neutral-400` → `text-stone-400`
- `text-neutral-300` → `text-stone-300`
- `text-neutral-600` → `text-stone-600`
- `border-neutral-700` → `border-stone-700`
- `border-neutral-600` → `border-stone-600`
- `bg-red-600` (CTA buttons only, not delete) → `bg-orange-500`
- `rounded-xl` → `rounded-2xl` (on cards/containers, not small buttons)

**Important notes per file:**

- **create-workout.tsx** (~35 replacements): The mode toggle active state changes from `bg-red-600` to `bg-orange-500`. Keep `text-red-600` for delete buttons as `text-red-500`.
- **custom-workouts.tsx** (~5 replacements): Main CTA `bg-red-600` → `bg-orange-500`.
- **history.tsx** (~12 replacements): Mode toggle `bg-red-600` → `bg-orange-500`. Keep `text-green-400` and `text-yellow-400` for status indicators.
- **climbing.tsx** (~25 replacements): Form toggle `bg-red-600` → `bg-orange-500`. Keep `text-red-400`/`text-red-500` for delete. Keep `bg-red-500` for difficulty stars.

**Step 2: Verify visually**

Navigate to each screen and confirm:
- Warm stone backgrounds everywhere
- Orange primary buttons
- Red only for destructive actions
- Consistent card styling

**Step 3: Run tests**

Run: `npx jest --passWithNoTests`
Expected: All tests still pass.

**Step 4: Commit**

```bash
git add app/create-workout.tsx app/custom-workouts.tsx app/history.tsx app/climbing.tsx
git commit -m "style: propagate Granite & Chalk to all remaining screens"
```

---

## Summary

| Task | Scope | Files |
|------|-------|-------|
| 1 | Design tokens | constants/colors.ts |
| 2 | Root layout | app/_layout.tsx |
| 3 | Menu principal | app/index.tsx |
| 4 | TimerConfigForm | components/TimerConfigForm.tsx |
| 5 | Protocol config | app/protocol/[id].tsx |
| 6 | Timer (major) | app/timer.tsx |
| 7 | Recap | app/recap.tsx |
| 8 | Components | GripSelector.tsx, ProtocolCard.tsx |
| 9 | Library batch | protocols.tsx, library.tsx, 5 library components |
| 10 | Remaining screens | create-workout, custom-workouts, history, climbing |

**Total: 10 tasks, ~20 files modified**
