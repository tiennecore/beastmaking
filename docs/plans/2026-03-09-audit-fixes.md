# Audit Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all critical and important issues found in the UX, UI/Styling, Accessibility, and Performance audits.

**Architecture:** 5 waves ordered by dependency and impact. Wave 1 fixes performance-critical timer issues (the app's core feature). Wave 2 fixes UI visibility bugs (text-white in light mode). Wave 3 improves UX flows. Wave 4 adds accessibility. Wave 5 polishes performance.

**Tech Stack:** React Native 0.81, Expo 54, TypeScript, NativeWind v4, Zustand, expo-audio, expo-haptics, expo-notifications

---

## Wave 1: Performance Critical (Timer)

### Task 1: Fix timer drift — use monotone Date.now()

**Files:**
- Modify: `app/timer.tsx:100-107`

**Step 1: Replace setInterval with drift-compensated setTimeout**

In `app/timer.tsx`, find the timer interval effect (~line 100):

```typescript
// CURRENT (buggy):
useEffect(() => {
  if (isRunning && !isPaused) {
    intervalRef.current = setInterval(tick, 1000);
  } else if (intervalRef.current) {
    clearInterval(intervalRef.current);
  }
  return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
}, [isRunning, isPaused]);
```

Replace with:

```typescript
useEffect(() => {
  if (isRunning && !isPaused) {
    let expectedTime = Date.now() + 1000;

    const scheduleTick = () => {
      tick();
      const drift = Date.now() - expectedTime;
      expectedTime += 1000;
      const nextDelay = Math.max(0, 1000 - drift);
      intervalRef.current = setTimeout(scheduleTick, nextDelay) as unknown as ReturnType<typeof setInterval>;
    };

    intervalRef.current = setTimeout(scheduleTick, 1000) as unknown as ReturnType<typeof setInterval>;
  } else if (intervalRef.current) {
    clearTimeout(intervalRef.current as unknown as ReturnType<typeof setTimeout>);
  }
  return () => {
    if (intervalRef.current) clearTimeout(intervalRef.current as unknown as ReturnType<typeof setTimeout>);
  };
}, [isRunning, isPaused]);
```

**Step 2: Run tests**

Run: `npx jest __tests__/lib/timer-engine.test.ts`
Expected: All existing timer tests pass (engine logic unchanged)

**Step 3: Commit**

```bash
git add app/timer.tsx
git commit -m "perf: fix timer drift with monotone Date.now() compensation"
```

---

### Task 2: Fix sounds blocking JS thread

**Files:**
- Modify: `lib/sounds.ts:18-24, 37-45`

**Step 1: Replace blocking await loops with fire-and-forget setTimeout**

In `lib/sounds.ts`, replace `playStart()` and `playSessionEnd()`:

```typescript
// CURRENT (blocking):
export async function playStart() {
  for (let i = 0; i < 3; i++) {
    await playCountdown();
    await new Promise(r => setTimeout(r, 200));
  }
}

// REPLACE WITH (non-blocking):
export function playStart() {
  playCountdown();
  setTimeout(() => playCountdown(), 200);
  setTimeout(() => playCountdown(), 400);
}
```

Same for `playSessionEnd()`:

```typescript
// CURRENT:
export async function playSessionEnd() {
  for (let i = 0; i < 3; i++) {
    await playEnd();
    await new Promise(r => setTimeout(r, 400));
  }
}

// REPLACE WITH:
export function playSessionEnd() {
  playEnd();
  setTimeout(() => playEnd(), 400);
  setTimeout(() => playEnd(), 800);
}
```

**Step 2: Remove async from callers if needed**

Check `timer.tsx` phase change effect — if `playStart()` was awaited, remove the await.

**Step 3: Commit**

```bash
git add lib/sounds.ts app/timer.tsx
git commit -m "perf: make sound playback non-blocking (fire-and-forget)"
```

---

### Task 3: Fix sounds memory leak — add cleanup

**Files:**
- Modify: `app/timer.tsx` (add unloadSounds to cleanup)

**Step 1: Add unloadSounds to the loadSounds effect**

Find the effect that calls `loadSounds()` (in `_layout.tsx` or `timer.tsx`). Add cleanup:

```typescript
useEffect(() => {
  loadSounds();
  return () => { unloadSounds(); };
}, []);
```

If `loadSounds()` is called in `_layout.tsx`, add the cleanup there. If in `timer.tsx`, add it there.

**Step 2: Commit**

```bash
git add app/timer.tsx
git commit -m "fix: clean up audio players on unmount (memory leak)"
```

---

### Task 4: Throttle notification updates to phase changes only

**Files:**
- Modify: `app/timer.tsx:127-141`

**Step 1: Change notification effect dependencies**

Replace the notification effect that fires every tick:

```typescript
// CURRENT (fires every second):
useEffect(() => {
  if (isRunning && !isPaused && phase) {
    showTimerNotification(
      NOTIF_PHASE_NAMES[phase.type],
      timeRemaining,
      `Rép ${prog.rep} · Série ${prog.set}/${prog.totalSets} · Tour ${prog.round}/${prog.totalRounds}`
    );
  }
}, [isRunning, isPaused, timeRemaining, phase, prog]);
```

Replace with phase-change-only updates:

```typescript
useEffect(() => {
  if (isRunning && !isPaused && phase) {
    showTimerNotification(
      NOTIF_PHASE_NAMES[phase.type],
      timeRemaining,
      `Rép ${prog.rep} · Série ${prog.set}/${prog.totalSets} · Tour ${prog.round}/${prog.totalRounds}`
    );
  }
}, [isRunning, isPaused, currentPhaseIndex]);
```

This reduces `scheduleNotificationAsync` calls from once-per-second to once-per-phase-change (typically every 5-60s).

**Step 2: Commit**

```bash
git add app/timer.tsx
git commit -m "perf: throttle notification updates to phase changes only"
```

---

### Task 5: Zustand granular selectors in TimerScreen

**Files:**
- Modify: `app/timer.tsx:44-61`

**Step 1: Replace full store destructuring with individual selectors**

```typescript
// CURRENT (full destructuring → re-renders on ANY store change):
const {
  phases, currentPhaseIndex, timeRemaining, isRunning, isPaused,
  currentPhase, progress, protocol, grips, config,
  start, pause: pauseTimer, resume, stop: stopTimer, tick, fastForward,
} = useTimerStore();

// REPLACE WITH (granular selectors):
const phases = useTimerStore(s => s.phases);
const currentPhaseIndex = useTimerStore(s => s.currentPhaseIndex);
const timeRemaining = useTimerStore(s => s.timeRemaining);
const isRunning = useTimerStore(s => s.isRunning);
const isPaused = useTimerStore(s => s.isPaused);
const protocol = useTimerStore(s => s.protocol);
const grips = useTimerStore(s => s.grips);
const config = useTimerStore(s => s.config);
const start = useTimerStore(s => s.start);
const pauseTimer = useTimerStore(s => s.pause);
const resume = useTimerStore(s => s.resume);
const stopTimer = useTimerStore(s => s.stop);
const tick = useTimerStore(s => s.tick);
const fastForward = useTimerStore(s => s.fastForward);
const currentPhase = useTimerStore(s => s.currentPhase);
const progress = useTimerStore(s => s.progress);
```

**Step 2: Memoize derived values**

```typescript
const phase = useMemo(() => currentPhase(), [currentPhaseIndex, phases]);
const prog = useMemo(() => progress(), [currentPhaseIndex, phases]);
```

**Step 3: Commit**

```bash
git add app/timer.tsx
git commit -m "perf: use granular Zustand selectors in TimerScreen"
```

---

## Wave 2: UI/Styling Fixes

### Task 6: Fix text-white → theme tokens (batch)

**Files:**
- Modify: `app/history.tsx` — lines 69, 122
- Modify: `app/climbing.tsx` — lines 169, 283, 291
- Modify: `app/create-workout.tsx` — lines 64, 270, 334, 409
- Modify: `app/custom-workouts.tsx` — lines 63, 118
- Modify: `components/library/PrinciplesSection.tsx` — all `text-white`
- Modify: `components/library/EnergySystemsSection.tsx` — all `text-white`
- Modify: `components/library/GripsSection.tsx` — all `text-white`
- Modify: `components/library/ParametersSection.tsx` — all `text-white`
- Modify: `components/library/CrimpLearningSection.tsx` — all `text-white`

**Step 1: Search and replace across all files**

Replace pattern: `text-white` → `text-stone-900 dark:text-stone-50`

Exceptions — keep `text-white` ONLY when:
- Inside a colored badge/button with a dark background (e.g., `bg-orange-500` button text)
- Inside the timer screen on colored overlays

For titles (text-2xl font-bold): `text-stone-900 dark:text-stone-50`
For body text: `text-stone-700 dark:text-stone-300`
For secondary: `text-stone-500 dark:text-stone-400`

**Step 2: Verify light mode visually**

Run: `npx expo start` → toggle theme to light mode → check all affected screens

**Step 3: Commit**

```bash
git add app/history.tsx app/climbing.tsx app/create-workout.tsx app/custom-workouts.tsx components/library/
git commit -m "fix: replace hardcoded text-white with theme-aware tokens"
```

---

### Task 7: Replace emojis with Ionicons

**Files:**
- Modify: `components/TimerConfigForm.tsx:115-120` — DURATION_CARDS emojis
- Modify: `app/recap.tsx` — StatCard emojis
- Modify: `app/create-workout.tsx:20, 527-539` — emoji icon picker
- Modify: `app/climbing.tsx:113-114` — DifficultyBadge ★

**Step 1: TimerConfigForm — replace emoji labels**

Replace emoji labels in `DURATION_CARDS`:
- `⏳` → `<Ionicons name="hourglass-outline" />`
- `🤚` → `<Ionicons name="hand-left-outline" />`
- `💨` → `<Ionicons name="flash-outline" />`
- `😮‍💨` → `<Ionicons name="pause-outline" />`
- `🧘` → `<Ionicons name="bed-outline" />`

**Step 2: recap.tsx — replace StatCard emojis**

- `⏱` → `<Ionicons name="time-outline" />`
- `🔁` → `<Ionicons name="repeat-outline" />`
- `🔄` → `<Ionicons name="sync-outline" />`
- `✋` → `<Ionicons name="hand-left-outline" />`

**Step 3: climbing.tsx — replace ★ with Ionicons**

Replace `<Text>★</Text>` repeated N times with:
```tsx
<Ionicons name="star" size={14} color="#F59E0B" />
```

**Step 4: create-workout.tsx — replace emoji picker with Ionicons picker**

Replace the emoji array:
```typescript
const ICONS = ['barbell-outline', 'flame-outline', 'flash-outline', 'body-outline', 'fitness-outline', 'heart-outline', 'trophy-outline', 'rocket-outline'] as const;
```

Update the picker to render `<Ionicons name={icon} />` instead of `<Text>{emoji}</Text>`.

Update `CustomWorkout` type if `icon` field changes from string emoji to Ionicons name.

**Step 5: Commit**

```bash
git add components/TimerConfigForm.tsx app/recap.tsx app/climbing.tsx app/create-workout.tsx
git commit -m "style: replace emojis with Ionicons for design consistency"
```

---

### Task 8: Fix touch target sizes

**Files:**
- Modify: `components/TimerConfigForm.tsx` — StepButton (w-9→w-11), RepeatButton (w-10→w-12), ColorPicker dots (w-5→w-10)
- Modify: `app/create-workout.tsx` — NumericRow buttons (w-9→w-11), reorder buttons (w-8→w-11), delete "X" button
- Modify: `app/index.tsx:181` — settings button (w-10→w-12 or add hitSlop)

**Step 1: TimerConfigForm**

- `StepButton`: `w-9 h-9` → `w-11 h-11` (44pt)
- `RepeatButton`: `w-10 h-10` → `w-12 h-12` (48pt)
- Color dots: `w-5 h-5` → `w-10 h-10` (40pt), add `hitSlop={4}`
- Color picker trigger: `w-8 h-8` → `w-10 h-10`

**Step 2: create-workout.tsx**

- NumericRow ±: `w-9 h-9` → `w-11 h-11`
- Reorder arrows: `w-8 h-8` → `w-11 h-11`
- Delete "X": replace with `<Ionicons name="close-circle" size={22} />` in a `w-11 h-11` Pressable

**Step 3: index.tsx — settings button**

```tsx
<Pressable onPress={() => router.push('/settings')} className="w-12 h-12 items-center justify-center">
```

**Step 4: Commit**

```bash
git add components/TimerConfigForm.tsx app/create-workout.tsx app/index.tsx
git commit -m "fix: increase touch targets to 44pt+ minimum"
```

---

### Task 9: Fix remaining styling inconsistencies

**Files:**
- Modify: `app/climbing.tsx` — placeholderTextColor
- Modify: `app/create-workout.tsx` — placeholderTextColor, TouchableOpacity → Pressable
- Modify: `app/custom-workouts.tsx` — TouchableOpacity → Pressable
- Modify: `app/plans.tsx` — inline border style → NativeWind classes
- Modify: `app/create-plan.tsx` — add press states
- Modify: `app/recap.tsx:91` — add press state on empty Pressable
- Modify: `app/settings.tsx:200-219` — danger zone visual separation

**Step 1: Fix placeholderTextColor**

In `climbing.tsx` and `create-workout.tsx`, replace:
```tsx
placeholderTextColor="#737373"
```
With:
```tsx
placeholderTextColor={colors.textMuted}
```
(where `colors` comes from `useThemeColors()`)

**Step 2: Replace TouchableOpacity with Pressable**

In `create-workout.tsx` and `custom-workouts.tsx`:
- Remove `TouchableOpacity` import
- Replace all `<TouchableOpacity>` with `<Pressable>` + press state style

**Step 3: Fix plans.tsx inline border**

Replace `style={{ borderWidth: active ? 2 : 0, borderColor: ... }}` with:
```tsx
className={active ? 'border-2 border-orange-500' : 'border border-stone-300 dark:border-stone-700/50'}
```

**Step 4: Add missing press states**

For `create-plan.tsx` and `recap.tsx` Pressables without feedback:
```tsx
style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.97 : 1 }] }]}
```

**Step 5: Danger zone styling in settings**

Wrap the 3 danger buttons in:
```tsx
<View className="bg-red-500/5 border border-red-500/20 rounded-2xl p-4 gap-3">
  <Text className="text-red-500 dark:text-red-400 text-sm font-semibold mb-1">Zone de danger</Text>
  {/* danger buttons */}
</View>
```

**Step 6: Commit**

```bash
git add app/climbing.tsx app/create-workout.tsx app/custom-workouts.tsx app/plans.tsx app/create-plan.tsx app/recap.tsx app/settings.tsx
git commit -m "style: fix styling inconsistencies (colors, press states, danger zone)"
```

---

## Wave 3: UX Improvements

### Task 10: Restructure timer controls — thumb zone + Pause/Stop separation

**Files:**
- Modify: `app/timer.tsx:190-300`

**Step 1: Restructure timer layout**

Change the main container from `justify-center` to `justify-between`:

```tsx
<View className="flex-1 justify-between">
  {/* Top zone: phase info + timer display */}
  <View className="flex-1 justify-center items-center px-6">
    {/* Progress bar */}
    {/* Phase label */}
    {/* Timer countdown */}
    {/* Rep/Set/Round indicators */}
    {/* Grip reminder */}
    {/* Load advice */}
  </View>

  {/* Bottom zone: controls (thumb zone) */}
  <View className="px-6 pb-8 gap-4">
    {/* Primary: Pause/Resume — full width, tall */}
    <Pressable
      onPress={handlePauseResume}
      className="w-full py-5 rounded-2xl items-center bg-stone-800 dark:bg-stone-200"
      style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.97 : 1 }] }]}
    >
      <Text className="text-white dark:text-stone-900 text-lg font-bold">
        {isPaused ? 'Reprendre' : 'Pause'}
      </Text>
    </Pressable>

    {/* Secondary: Stop — text-only, requires confirmation */}
    <Pressable
      onPress={handleStop}
      className="w-full py-3 items-center"
    >
      <Text className="text-stone-400 dark:text-stone-500 text-base">
        Arrêter la séance
      </Text>
    </Pressable>
  </View>
</View>
```

**Step 2: Add confirmation dialog to Stop**

```typescript
const handleStop = () => {
  Alert.alert(
    'Arrêter la séance ?',
    'La progression sera sauvegardée.',
    [
      { text: 'Continuer', style: 'cancel' },
      { text: 'Arrêter', style: 'destructive', onPress: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        dismissTimerNotification();
        stopBackgroundKeepAlive();
        stopTimer();
      }},
    ]
  );
};
```

**Step 3: Commit**

```bash
git add app/timer.tsx
git commit -m "ux: move timer controls to thumb zone + add stop confirmation"
```

---

### Task 11: Add Skip phase button

**Files:**
- Modify: `stores/timer-store.ts` — add `skipPhase()` action
- Modify: `app/timer.tsx` — add Skip button

**Step 1: Add skipPhase action to Zustand store**

In `stores/timer-store.ts`, add to the store:

```typescript
skipPhase: () => {
  const { phases, currentPhaseIndex, isRunning } = get();
  if (!isRunning) return;
  const nextIndex = currentPhaseIndex + 1;
  if (nextIndex >= phases.length) {
    get().stop();
    return;
  }
  set({
    currentPhaseIndex: nextIndex,
    timeRemaining: phases[nextIndex].duration,
  });
},
```

Add `skipPhase` to the TypeScript type as well.

**Step 2: Add Skip button in timer.tsx**

Below the phase label and above the controls, show a Skip button during rest phases only:

```tsx
{phase && phase.type !== 'hang' && phase.type !== 'done' && (
  <Pressable
    onPress={() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      skipPhase();
    }}
    className="mt-4 px-6 py-2 rounded-full bg-stone-200/50 dark:bg-stone-700/50"
  >
    <Text className="text-stone-500 dark:text-stone-400 text-sm font-medium">
      Passer ›
    </Text>
  </Pressable>
)}
```

**Step 3: Commit**

```bash
git add stores/timer-store.ts app/timer.tsx
git commit -m "feat: add skip phase button during rest periods"
```

---

### Task 12: Add "Redo" button on recap screen

**Files:**
- Modify: `app/recap.tsx:179-189`

**Step 1: Replace single button with two-button row**

```tsx
<View className="flex-row gap-3 mt-6">
  {/* Redo button */}
  <Pressable
    onPress={() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      // Re-setup same protocol with same config
      if (result) {
        useTimerStore.getState().setup(result.protocol, result.grips, result.config);
        router.replace('/timer');
      }
    }}
    className="flex-1 py-4 rounded-2xl bg-stone-100 dark:bg-stone-800 items-center"
    style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.97 : 1 }] }]}
  >
    <Text className="text-stone-900 dark:text-stone-50 text-base font-semibold">
      Refaire
    </Text>
  </Pressable>

  {/* Return button */}
  <Pressable
    onPress={() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      router.replace('/');
    }}
    className="flex-1 py-4 rounded-2xl bg-orange-500 items-center"
    style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.97 : 1 }] }]}
  >
    <Text className="text-white text-base font-semibold">
      Retour au menu
    </Text>
  </Pressable>
</View>
```

**Step 2: Import useTimerStore at top if not already imported**

**Step 3: Commit**

```bash
git add app/recap.tsx
git commit -m "feat: add redo button on recap screen"
```

---

### Task 13: Implement custom workout launch

**Files:**
- Modify: `app/custom-workouts.tsx:94` — replace alert with actual launch
- Modify: `stores/timer-store.ts` — add `setupCustomWorkout()` action (if needed)

**Step 1: Implement handlePress to launch workout**

In `custom-workouts.tsx`, replace the `Alert.alert('Bientôt', ...)` with logic to launch.

For a compose-mode workout with protocol steps:
```typescript
const handlePress = (workout: CustomWorkout) => {
  // Take the first step's protocol and config to setup the timer
  // For multi-step workouts, this is a simplification — full support is a separate feature
  const firstStep = workout.steps[0];
  if (firstStep.type === 'protocol') {
    const protocol = PROTOCOLS.find(p => p.id === firstStep.protocolId);
    if (protocol) {
      useTimerStore.getState().setup(protocol, firstStep.grips || [], firstStep.config);
      router.push('/timer');
      return;
    }
  }
  // Free mode steps — setup with a generic protocol wrapper
  const freeConfig: TimerConfig = firstStep.type === 'free' ? firstStep.config : protocol.defaults;
  useTimerStore.getState().setup(
    { id: 'custom', name: workout.name, icon: workout.icon, /* ... minimal protocol */ } as Protocol,
    [],
    freeConfig
  );
  router.push('/timer');
};
```

Note: Full multi-step sequential workout support (step 1 → step 2 → step 3) is a larger feature. This task implements single-step launch. Add a comment noting the limitation.

**Step 2: Commit**

```bash
git add app/custom-workouts.tsx
git commit -m "feat: implement basic custom workout launch (single step)"
```

---

### Task 14: Add long-press hint + SafeAreaView

**Files:**
- Modify: `app/custom-workouts.tsx` — add hint text
- Modify: `app/climbing.tsx` — add hint text
- Modify: `app/timer.tsx` — add SafeAreaView
- Modify: `app/recap.tsx` — add SafeAreaView

**Step 1: Add long-press hint**

In `custom-workouts.tsx` and `climbing.tsx`, after the list:
```tsx
<Text className="text-stone-400 dark:text-stone-500 text-xs text-center mt-4">
  Maintenir pour supprimer une entrée
</Text>
```

**Step 2: Add SafeAreaView to timer and recap**

Import `useSafeAreaInsets` from `react-native-safe-area-context`:
```tsx
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// In component:
const insets = useSafeAreaInsets();

// Apply to bottom controls:
<View style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
```

**Step 3: Commit**

```bash
git add app/custom-workouts.tsx app/climbing.tsx app/timer.tsx app/recap.tsx
git commit -m "ux: add long-press hints and SafeAreaView for bottom controls"
```

---

## Wave 4: Accessibility

### Task 15: Timer accessibility — live region + labels

**Files:**
- Modify: `app/timer.tsx`

**Step 1: Add accessibilityLiveRegion to countdown**

```tsx
<Text
  className="text-7xl font-bold text-stone-900 dark:text-stone-50"
  style={{ fontVariant: ['tabular-nums'] }}
  accessibilityRole="timer"
  accessibilityLiveRegion="assertive"
  accessibilityLabel={`${formatTime(timeRemaining)} restantes`}
>
  {formatTime(timeRemaining)}
</Text>
```

**Step 2: Add accessibilityLabel + role to controls**

```tsx
<Pressable
  onPress={handlePauseResume}
  accessibilityRole="button"
  accessibilityLabel={isPaused ? 'Reprendre la séance' : 'Mettre en pause'}
>
```

```tsx
<Pressable
  onPress={handleStop}
  accessibilityRole="button"
  accessibilityLabel="Arrêter la séance"
>
```

**Step 3: Add accessibilityLabel to phase display**

```tsx
<Text
  accessibilityRole="header"
  accessibilityLiveRegion="polite"
  accessibilityLabel={`Phase : ${phaseLabel}`}
>
```

**Step 4: Label progress indicators**

```tsx
<View accessible={true} accessibilityLabel={`Répétition ${prog.rep}, Série ${prog.set} sur ${prog.totalSets}, Tour ${prog.round} sur ${prog.totalRounds}`}>
```

**Step 5: Commit**

```bash
git add app/timer.tsx
git commit -m "a11y: add live regions, roles and labels to timer screen"
```

---

### Task 16: Index screen accessibility

**Files:**
- Modify: `app/index.tsx`

**Step 1: Add roles and labels to navigation cards**

For HeroCard, TileCard, ListCard — add to each Pressable:
```tsx
accessibilityRole="button"
accessibilityLabel={`${title}. ${subtitle}`}
```

**Step 2: Add label to settings button**

```tsx
<Pressable
  accessibilityRole="button"
  accessibilityLabel="Paramètres"
>
```

**Step 3: Add header role to section labels**

```tsx
<Text accessibilityRole="header">{label}</Text>
```

**Step 4: Commit**

```bash
git add app/index.tsx
git commit -m "a11y: add roles and labels to main menu"
```

---

### Task 17: Form accessibility — TextInputs, buttons, selectors

**Files:**
- Modify: `app/climbing.tsx` — TextInput labels, ToggleButton states, SessionCard hint
- Modify: `app/create-workout.tsx` — TextInput labels, NumericRow labels, reorder labels, emoji picker
- Modify: `app/custom-workouts.tsx` — WorkoutCard hint
- Modify: `app/history.tsx` — toggle role/state
- Modify: `app/settings.tsx` — Switch labels, DangerButton labels, toggle role/state

**Step 1: TextInput accessibility labels**

For every `TextInput`, add:
```tsx
accessibilityLabel="Nom de l'entraînement"  // descriptive label matching the placeholder
```

**Step 2: ToggleButton states (climbing, history, settings, create-workout)**

Add to every toggle/tab Pressable:
```tsx
accessibilityRole="tab"
accessibilityState={{ selected: isActive }}
```

**Step 3: NumericRow buttons (create-workout)**

```tsx
// Minus button:
accessibilityRole="button"
accessibilityLabel={`Réduire ${label}`}

// Plus button:
accessibilityRole="button"
accessibilityLabel={`Augmenter ${label}`}
```

**Step 4: Reorder and delete buttons (create-workout)**

```tsx
// Up arrow:
accessibilityRole="button"
accessibilityLabel="Monter l'étape"

// Down arrow:
accessibilityRole="button"
accessibilityLabel="Descendre l'étape"

// Delete X:
accessibilityRole="button"
accessibilityLabel="Supprimer l'étape"
```

**Step 5: Long-press actions — add accessibilityHint**

For `SessionCard` (climbing) and `WorkoutCard` (custom-workouts):
```tsx
accessibilityHint="Maintenir pour supprimer"
```

**Step 6: Settings — Switch labels**

```tsx
<Switch
  accessibilityLabel={`${label} : ${value ? 'activé' : 'désactivé'}`}
/>
```

**Step 7: Settings — DangerButton**

```tsx
accessibilityRole="button"
accessibilityLabel={label}
```

**Step 8: Commit**

```bash
git add app/climbing.tsx app/create-workout.tsx app/custom-workouts.tsx app/history.tsx app/settings.tsx
git commit -m "a11y: add labels, roles and states to forms and interactive elements"
```

---

### Task 18: Component accessibility — GripSelector, ProtocolCard, TimerConfigForm

**Files:**
- Modify: `components/GripSelector.tsx`
- Modify: `components/ProtocolCard.tsx`
- Modify: `components/TimerConfigForm.tsx`

**Step 1: GripSelector**

Main trigger button:
```tsx
accessibilityRole="button"
accessibilityLabel={`Sélection des prises : ${selectedGrips.length} sélectionnées`}
accessibilityHint="Ouvrir le sélecteur de prises"
```

Modal overlay close:
```tsx
accessibilityLabel="Fermer le sélecteur"
```

Each grip item in FlatList:
```tsx
accessibilityRole="checkbox"
accessibilityState={{ checked: isSelected }}
accessibilityLabel={grip.name}
```

OK button:
```tsx
accessibilityRole="button"
accessibilityLabel="Confirmer la sélection"
```

**Step 2: ProtocolCard**

```tsx
<Pressable
  accessibilityRole="button"
  accessibilityLabel={`${protocol.name}. ${protocol.summary}. Difficulté : ${protocol.difficulty}`}
>
```

**Step 3: TimerConfigForm**

StepButton:
```tsx
accessibilityRole="button"
accessibilityLabel={`${label === '+1' ? 'Augmenter' : 'Réduire'} de ${Math.abs(value)}`}
```

RepeatButton:
```tsx
accessibilityRole="button"
accessibilityLabel={`${label === '+' ? 'Augmenter' : 'Réduire'} ${fieldName}`}
```

Color dots:
```tsx
accessibilityRole="button"
accessibilityLabel={`Couleur ${colorName || hexValue}`}
accessibilityState={{ selected: isActive }}
```

**Step 4: Commit**

```bash
git add components/GripSelector.tsx components/ProtocolCard.tsx components/TimerConfigForm.tsx
git commit -m "a11y: add roles, labels and states to shared components"
```

---

### Task 19: Remaining screens accessibility

**Files:**
- Modify: `app/protocols.tsx` — section headers
- Modify: `app/protocol/[id].tsx` — start button, header
- Modify: `app/recap.tsx` — StatCard grouping, return button
- Modify: `app/plans.tsx` — PlanCard labels
- Modify: `app/create-plan.tsx` — navigation buttons

**Step 1: protocols.tsx**

Section titles:
```tsx
accessibilityRole="header"
```

**Step 2: protocol/[id].tsx**

Start button:
```tsx
accessibilityRole="button"
accessibilityLabel={`Lancer la séance ${protocol.name}`}
```

**Step 3: recap.tsx**

StatCard container:
```tsx
accessible={true}
accessibilityLabel={`${label} : ${value}`}
```

Return button:
```tsx
accessibilityRole="button"
accessibilityLabel="Retour au menu principal"
```

**Step 4: plans.tsx**

PlanCard:
```tsx
accessibilityRole="button"
accessibilityLabel={`Plan ${plan.name}. ${plan.daysPerWeek} jours par semaine, ${plan.totalWeeks} semaines`}
```

**Step 5: create-plan.tsx**

Navigation buttons:
```tsx
// Back:
accessibilityRole="button"
accessibilityLabel="Retour à l'étape précédente"

// Next/Generate:
accessibilityRole="button"
accessibilityLabel={isLastStep ? 'Générer le plan' : 'Étape suivante'}
```

**Step 6: Commit**

```bash
git add app/protocols.tsx app/protocol/[id].tsx app/recap.tsx app/plans.tsx app/create-plan.tsx
git commit -m "a11y: add roles and labels to protocol, recap, and plan screens"
```

---

## Wave 5: Performance Polish

### Task 20: Split TimerScreen into memoized sub-components

**Files:**
- Modify: `app/timer.tsx`

**Step 1: Extract sub-components**

At the bottom of `timer.tsx`, before the default export, extract:

```tsx
const TimeDisplay = React.memo(({ timeRemaining }: { timeRemaining: number }) => (
  <Text
    className="text-7xl font-bold text-stone-900 dark:text-stone-50"
    style={{ fontVariant: ['tabular-nums'] }}
    accessibilityRole="timer"
    accessibilityLiveRegion="assertive"
  >
    {formatTime(timeRemaining)}
  </Text>
));

const ProgressInfo = React.memo(({ prog }: { prog: ReturnType<typeof useTimerStore.getState().progress> }) => (
  <View accessible={true} accessibilityLabel={`Rép ${prog.rep}, Série ${prog.set}/${prog.totalSets}, Tour ${prog.round}/${prog.totalRounds}`}>
    {/* existing rep/set/round display */}
  </View>
));
```

**Step 2: Use sub-components in render**

Replace inline JSX with:
```tsx
<TimeDisplay timeRemaining={timeRemaining} />
<ProgressInfo prog={prog} />
```

**Step 3: Commit**

```bash
git add app/timer.tsx
git commit -m "perf: split TimerScreen into memoized sub-components"
```

---

### Task 21: Memoize derived data in history and custom-workouts

**Files:**
- Modify: `app/history.tsx:108-118`
- Modify: `app/custom-workouts.tsx:32-41`

**Step 1: history.tsx — useMemo for filtering**

```typescript
const { filtered, sortedKeys } = useMemo(() => {
  const now = new Date();
  const cutoff = viewMode === 'week'
    ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const filtered = history.filter(e => new Date(e.date).getTime() >= cutoff.getTime());
  // ... existing grouping logic
  return { filtered, sortedKeys };
}, [history, viewMode]);
```

**Step 2: custom-workouts.tsx — useMemo for duration**

In `WorkoutCard`:
```typescript
const duration = useMemo(() => workoutDuration(workout.steps), [workout.steps]);
```

**Step 3: Commit**

```bash
git add app/history.tsx app/custom-workouts.tsx
git commit -m "perf: memoize derived data in history and custom-workouts"
```

---

## Summary

| Wave | Tasks | Focus |
|------|-------|-------|
| 1 | 1-5 | Timer performance (drift, sounds, notifications, Zustand) |
| 2 | 6-9 | UI visibility (text-white, emojis, touch targets, styling) |
| 3 | 10-14 | UX improvements (thumb zone, skip, redo, custom launch, hints) |
| 4 | 15-19 | Accessibility (labels, roles, states, live regions) |
| 5 | 20-21 | Performance polish (memoization, component splitting) |

**Total: 21 tasks, ~60 steps**

**Dependencies:**
- Wave 1 tasks are independent of each other (can be parallelized)
- Wave 2 tasks are independent of each other (can be parallelized)
- Task 10 (timer layout) should be done AFTER Task 5 (Zustand selectors)
- Task 15 (timer a11y) should be done AFTER Task 10 (timer layout restructure)
- Task 20 (timer split) should be done AFTER Task 15 (timer a11y)
- All other tasks within waves are independent
