# Beastmaking Timer MVP — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a functional interval timer app for climbing hangboard training with 9 protocols, configurable parameters, sounds, and pedagogical content from the Beastmaking book.

**Architecture:** Expo Router file-based navigation with 2 tabs (Protocols, Library) and 3 stack screens (Config, Timer, Recap). Timer logic lives in a Zustand store driven by a state machine. All protocol/grip/book data is static TypeScript constants.

**Tech Stack:** React Native, Expo SDK 52+, TypeScript, Expo Router, NativeWind v4, Zustand, expo-av, expo-keep-awake

---

## Task 1: Scaffold Expo Project

**Files:**
- Create: entire project scaffold via `create-expo-app`
- Modify: `package.json`, `tsconfig.json`, `app.json`

**Step 1: Create Expo project**

```bash
cd /home/tienne/projects/beastmaking
npx create-expo-app@latest . --template tabs
```

If directory not empty, move `.git`, `.gitignore`, `.claude`, `docs` out, scaffold, then move back.

**Step 2: Install dependencies**

```bash
npx expo install nativewind tailwindcss@^3 zustand expo-av expo-keep-awake
npx expo install react-native-reanimated react-native-safe-area-context
```

**Step 3: Configure NativeWind**

Create `tailwind.config.js`:
```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        prep: '#EAB308',
        hang: '#DC2626',
        restRep: '#2563EB',
        restSet: '#9333EA',
        restRound: '#16A34A',
      },
    },
  },
  plugins: [],
};
```

Create `global.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

Add to `babel.config.js`: `plugins: ["nativewind/babel"]`

Add to `metro.config.js`:
```javascript
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);
module.exports = withNativeWind(config, { input: "./global.css" });
```

**Step 4: Configure app.json for Android only**

Update `app.json`:
```json
{
  "expo": {
    "name": "Beastmaking Timer",
    "slug": "beastmaking-timer",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/images/icon.png",
    "scheme": "beastmaking",
    "platforms": ["android"],
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/adaptive-icon.png",
        "backgroundColor": "#1a1a1a"
      },
      "package": "com.tiennecore.beastmaking"
    }
  }
}
```

**Step 5: Verify it runs**

```bash
npx expo start
```

Expected: Metro bundler starts, app loads on Android emulator/device.

**Step 6: Commit**

```bash
git add -A
git commit -m "chore: scaffold Expo project with NativeWind, Zustand, expo-av"
```

---

## Task 2: Types & Constants

**Files:**
- Create: `types/index.ts`
- Create: `constants/colors.ts`

**Step 1: Define all TypeScript types**

Create `types/index.ts`:
```typescript
export type ProtocolFamily = 'force' | 'continuity' | 'pullups';

export type EnergySystem = 'alactic' | 'lactic' | 'aerobic';

export type GripType = 'open3' | 'open4' | 'halfCrimp' | 'fullCrimp' | 'fullCrimpThumb';

export type TimerPhase = 'idle' | 'prep' | 'hang' | 'restRep' | 'restSet' | 'restRound' | 'done';

export type TimerConfig = {
  hangDuration: number;
  restBetweenReps: number;
  reps: number;
  sets: number;
  restBetweenSets: number;
  rounds?: number;
  restBetweenRounds?: number;
};

export type Protocol = {
  id: string;
  name: string;
  family: ProtocolFamily;
  energySystem: EnergySystem;
  icon: string;
  summary: string;
  defaults: TimerConfig;
  loadAdvice: string;
  recoveryAdvice: string;
  frequencyAdvice: string;
};

export type GripInfo = {
  id: GripType;
  name: string;
  type: 'passive' | 'semi-active' | 'active' | 'very-active';
  description: string;
  keyPoints: string;
  warning?: string;
};

export type SessionConfig = {
  protocol: Protocol;
  grips: GripType[];
  timerConfig: TimerConfig;
};

export type SessionResult = {
  protocol: Protocol;
  grips: GripType[];
  config: TimerConfig;
  completedSets: number;
  completedRounds: number;
  totalDuration: number; // seconds
  completed: boolean;
};
```

**Step 2: Define color constants**

Create `constants/colors.ts`:
```typescript
import { TimerPhase } from '@/types';

export const PHASE_COLORS: Record<TimerPhase, string> = {
  idle: '#1a1a1a',
  prep: '#EAB308',
  hang: '#DC2626',
  restRep: '#2563EB',
  restSet: '#9333EA',
  restRound: '#16A34A',
  done: '#1a1a1a',
};

export const PHASE_LABELS: Record<TimerPhase, string> = {
  idle: '',
  prep: 'PRÊT',
  hang: 'SUSPENDU',
  restRep: 'REPOS',
  restSet: 'REPOS SÉRIE',
  restRound: 'REPOS TOUR',
  done: 'TERMINÉ',
};
```

**Step 3: Commit**

```bash
git add types/ constants/
git commit -m "feat: add TypeScript types and color constants"
```

---

## Task 3: Protocol Data

**Files:**
- Create: `constants/protocols.ts`

**Step 1: Define all 9 protocols**

Create `constants/protocols.ts`:
```typescript
import { Protocol } from '@/types';

export const PROTOCOLS: Protocol[] = [
  // === FORCE ===
  {
    id: 'max-short',
    name: 'Suspensions Max Courtes',
    family: 'force',
    energySystem: 'alactic',
    icon: '⚡',
    summary: '5-12s suspendu · 2-3min repos · 3-5 répét · force pure',
    defaults: {
      hangDuration: 10,
      restBetweenReps: 150,
      reps: 4,
      sets: 3,
      restBetweenSets: 180,
    },
    loadAdvice: 'Dosez pour lâcher entre 5 et 12 secondes. Si vous tenez plus longtemps, ajoutez du poids.',
    recoveryAdvice: 'Travaillez la force uniquement quand vous êtes frais. Prévoyez au moins 48h avant la prochaine séance de force.',
    frequencyAdvice: '1 à 2 fois par semaine, jamais fatigué.',
  },
  {
    id: 'max-long',
    name: 'Suspensions Max Longues',
    family: 'force',
    energySystem: 'alactic',
    icon: '💪',
    summary: '20s suspendu · 3-5min repos · 3-5 répét · hypertrophie',
    defaults: {
      hangDuration: 20,
      restBetweenReps: 240,
      reps: 4,
      sets: 3,
      restBetweenSets: 300,
    },
    loadAdvice: 'Dosez pour lâcher à 20 secondes maximum. Gains lents mais durables.',
    recoveryAdvice: 'Travaillez la force uniquement quand vous êtes frais. Prévoyez au moins 48h avant la prochaine séance de force.',
    frequencyAdvice: '1 à 2 fois par semaine, jamais fatigué.',
  },
  {
    id: 'tendons',
    name: 'Suspensions pour les tendons',
    family: 'force',
    energySystem: 'alactic',
    icon: '🦴',
    summary: '30-45s suspendu · 5min repos · 3 répét · entretien tendons',
    defaults: {
      hangDuration: 40,
      restBetweenReps: 300,
      reps: 3,
      sets: 3,
      restBetweenSets: 300,
    },
    loadAdvice: 'Dosez pour lâcher à environ 45 secondes. Maximum 3 séries en tout (1 par préhension).',
    recoveryAdvice: 'Travaillez la force uniquement quand vous êtes frais. Prévoyez au moins 48h avant la prochaine séance de force.',
    frequencyAdvice: '1 à 2 fois par semaine.',
  },
  {
    id: 'intermittent',
    name: 'Suspensions Intermittentes',
    family: 'force',
    energySystem: 'alactic',
    icon: '🔄',
    summary: '7s/3s × 6 = 1min · 5min repos · force/résistance',
    defaults: {
      hangDuration: 7,
      restBetweenReps: 3,
      reps: 6,
      sets: 2,
      restBetweenSets: 300,
    },
    loadAdvice: 'Confortable sur la réglette choisie. Le risque de blessure est faible.',
    recoveryAdvice: 'Travaillez la force uniquement quand vous êtes frais.',
    frequencyAdvice: '1 à 2 fois par semaine.',
  },

  // === CONTINUITY ===
  {
    id: 'continuity-long',
    name: 'Continuité Longue sur poutre',
    family: 'continuity',
    energySystem: 'aerobic',
    icon: '🌊',
    summary: '7s/3s × 6 · 10 séries · 3 tours · endurance aérobie',
    defaults: {
      hangDuration: 7,
      restBetweenReps: 3,
      reps: 6,
      sets: 10,
      restBetweenSets: 60,
      rounds: 3,
      restBetweenRounds: 600,
    },
    loadAdvice: 'Délestez avec une poulie à 30-40% de votre max. Vous devez être légèrement fatigué, pas à bout.',
    recoveryAdvice: 'Compatible avec le reste de l\'entraînement. Peut être casé après une séance de grimpe, jamais avant une séance de force.',
    frequencyAdvice: '2 séances/semaine pendant minimum 8 semaines, maximum 16 semaines.',
  },
  {
    id: 'continuity-short',
    name: 'Continuité Courte sur poutre',
    family: 'continuity',
    energySystem: 'lactic',
    icon: '🔥',
    summary: '7s/3s × 6 · 6 séries · repos 3min · anaérobie lactique',
    defaults: {
      hangDuration: 7,
      restBetweenReps: 3,
      reps: 6,
      sets: 6,
      restBetweenSets: 180,
    },
    loadAdvice: '70-80% de votre max. Vous devez tomber sur les 2 dernières séries des 2 derniers tours.',
    recoveryAdvice: 'Prévoyez un jour de repos le lendemain.',
    frequencyAdvice: '2×/semaine si priorité continuité, 1×/semaine si combiné avec force. Minimum 6 semaines.',
  },

  // === PULL-UPS ===
  {
    id: 'weighted-pullups',
    name: 'Tractions Lestées',
    family: 'pullups',
    energySystem: 'alactic',
    icon: '🏋️',
    summary: '5 répét max · 5 séries · 2min repos · force bras',
    defaults: {
      hangDuration: 4,
      restBetweenReps: 3,
      reps: 5,
      sets: 5,
      restBetweenSets: 120,
    },
    loadAdvice: 'Maximum 5 répétitions. Redescendez toujours lentement et sans à-coups.',
    recoveryAdvice: 'Travaillez la force uniquement quand vous êtes frais. Prévoyez au moins 48h.',
    frequencyAdvice: '1 à 2 fois par semaine.',
  },
  {
    id: 'negative-pullups',
    name: 'Tractions Négatives',
    family: 'pullups',
    energySystem: 'alactic',
    icon: '⬇️',
    summary: '8s descente · 5 séries · 3min repos · force excentrique',
    defaults: {
      hangDuration: 8,
      restBetweenReps: 0,
      reps: 1,
      sets: 5,
      restBetweenSets: 180,
    },
    loadAdvice: 'Depuis menton au-dessus de la barre, descente en 8 secondes à tension maximale. Option 1 ou 2 bras.',
    recoveryAdvice: 'Travaillez la force uniquement quand vous êtes frais. Prévoyez au moins 48h.',
    frequencyAdvice: '1 à 2 fois par semaine.',
  },
  {
    id: 'minute-pullups',
    name: 'Traction Minute',
    family: 'pullups',
    energySystem: 'aerobic',
    icon: '⏱️',
    summary: 'X tractions/minute · 10 minutes · entretien bras',
    defaults: {
      hangDuration: 3,
      restBetweenReps: 2,
      reps: 5,
      sets: 10,
      restBetweenSets: 60,
    },
    loadAdvice: 'X tractions au début de chaque minute, repos jusqu\'à la fin de la minute. Ajoutez des pompes si la forme le permet.',
    recoveryAdvice: 'Séance légère, peut être intégrée à n\'importe quel jour.',
    frequencyAdvice: '2 à 3 fois par semaine.',
  },
];

export const getProtocolById = (id: string): Protocol | undefined =>
  PROTOCOLS.find((p) => p.id === id);

export const getProtocolsByFamily = (family: Protocol['family']): Protocol[] =>
  PROTOCOLS.filter((p) => p.family === family);
```

**Step 2: Commit**

```bash
git add constants/protocols.ts
git commit -m "feat: add 9 protocol definitions from book"
```

---

## Task 4: Grip Data

**Files:**
- Create: `constants/grips.ts`

**Step 1: Define grip data**

Create `constants/grips.ts`:
```typescript
import { GripInfo } from '@/types';

export const GRIPS: GripInfo[] = [
  {
    id: 'open3',
    name: 'Tendu 3 doigts',
    type: 'passive',
    description: 'Flexion IPD, frottement des coussinets. Grande allonge.',
    keyPoints: 'Efficace sur à-plats. Moins utile en dévers.',
  },
  {
    id: 'open4',
    name: 'Tendu 4 doigts',
    type: 'passive',
    description: 'Index droit, 2 doigts centraux fléchis, auriculaire tendu.',
    keyPoints: 'Bonne pour réglettes. Mobilité poignet limitée.',
  },
  {
    id: 'halfCrimp',
    name: 'Semi-arqué',
    type: 'semi-active',
    description: 'Au moins 2 premières phalanges fléchies.',
    keyPoints: 'La plus courante. Polyvalente, bonne liberté de mouvement.',
  },
  {
    id: 'fullCrimp',
    name: 'Arqué',
    type: 'active',
    description: 'Toutes articulations IPP à angle droit + pouce.',
    keyPoints: 'Puissante, contrôle maximal. S\'apprend progressivement.',
    warning: 'Position agressive. À apprendre en 3 étapes (voir bibliothèque).',
  },
  {
    id: 'fullCrimpThumb',
    name: 'Arqué + verrou du pouce',
    type: 'very-active',
    description: 'Arqué avec le pouce qui couvre l\'index.',
    keyPoints: 'La plus agressive. Forte charge sur les articulations.',
    warning: 'À limiter. Risque articulaire élevé si mal maîtrisé.',
  },
];

export const getGripById = (id: string): GripInfo | undefined =>
  GRIPS.find((g) => g.id === id);

export const MAX_GRIPS_PER_SESSION = 3;
```

**Step 2: Commit**

```bash
git add constants/grips.ts
git commit -m "feat: add 5 grip type definitions from book"
```

---

## Task 5: Timer Engine (Zustand Store)

**Files:**
- Create: `stores/timer-store.ts`
- Create: `lib/timer-engine.ts`
- Test: `__tests__/lib/timer-engine.test.ts`

**Step 1: Write timer engine tests**

Create `__tests__/lib/timer-engine.test.ts`:
```typescript
import { computePhaseSequence, Phase } from '@/lib/timer-engine';
import { TimerConfig } from '@/types';

describe('computePhaseSequence', () => {
  it('generates correct sequence for simple protocol (no rounds)', () => {
    const config: TimerConfig = {
      hangDuration: 10,
      restBetweenReps: 150,
      reps: 2,
      sets: 2,
      restBetweenSets: 180,
    };

    const phases = computePhaseSequence(config);

    expect(phases[0]).toEqual({ type: 'prep', duration: 5 });
    // Set 1
    expect(phases[1]).toEqual({ type: 'hang', duration: 10, rep: 1, set: 1, round: 1 });
    expect(phases[2]).toEqual({ type: 'restRep', duration: 150, rep: 1, set: 1, round: 1 });
    expect(phases[3]).toEqual({ type: 'hang', duration: 10, rep: 2, set: 1, round: 1 });
    expect(phases[4]).toEqual({ type: 'restSet', duration: 180, set: 1, round: 1 });
    // Set 2
    expect(phases[5]).toEqual({ type: 'hang', duration: 10, rep: 1, set: 2, round: 1 });
    expect(phases[6]).toEqual({ type: 'restRep', duration: 150, rep: 1, set: 2, round: 1 });
    expect(phases[7]).toEqual({ type: 'hang', duration: 10, rep: 2, set: 2, round: 1 });
    // No rest after last set
    expect(phases).toHaveLength(8);
  });

  it('generates correct sequence with rounds', () => {
    const config: TimerConfig = {
      hangDuration: 7,
      restBetweenReps: 3,
      reps: 2,
      sets: 2,
      restBetweenSets: 60,
      rounds: 2,
      restBetweenRounds: 600,
    };

    const phases = computePhaseSequence(config);

    expect(phases[0]).toEqual({ type: 'prep', duration: 5 });
    // Round 1, Set 1
    expect(phases[1]).toEqual({ type: 'hang', duration: 7, rep: 1, set: 1, round: 1 });
    expect(phases[2]).toEqual({ type: 'restRep', duration: 3, rep: 1, set: 1, round: 1 });
    expect(phases[3]).toEqual({ type: 'hang', duration: 7, rep: 2, set: 1, round: 1 });
    expect(phases[4]).toEqual({ type: 'restSet', duration: 60, set: 1, round: 1 });
    // Round 1, Set 2
    expect(phases[5]).toEqual({ type: 'hang', duration: 7, rep: 1, set: 2, round: 1 });
    expect(phases[6]).toEqual({ type: 'restRep', duration: 3, rep: 1, set: 2, round: 1 });
    expect(phases[7]).toEqual({ type: 'hang', duration: 7, rep: 2, set: 2, round: 1 });
    // Rest between rounds
    expect(phases[8]).toEqual({ type: 'restRound', duration: 600, round: 1 });
    // Round 2, Set 1
    expect(phases[9]).toEqual({ type: 'hang', duration: 7, rep: 1, set: 1, round: 2 });
  });

  it('skips restBetweenReps when 0', () => {
    const config: TimerConfig = {
      hangDuration: 8,
      restBetweenReps: 0,
      reps: 1,
      sets: 2,
      restBetweenSets: 180,
    };

    const phases = computePhaseSequence(config);

    expect(phases[0]).toEqual({ type: 'prep', duration: 5 });
    expect(phases[1]).toEqual({ type: 'hang', duration: 8, rep: 1, set: 1, round: 1 });
    expect(phases[2]).toEqual({ type: 'restSet', duration: 180, set: 1, round: 1 });
    expect(phases[3]).toEqual({ type: 'hang', duration: 8, rep: 1, set: 2, round: 1 });
    expect(phases).toHaveLength(4);
  });
});
```

**Step 2: Run tests — verify they fail**

```bash
npx jest __tests__/lib/timer-engine.test.ts
```

Expected: FAIL — module not found.

**Step 3: Implement timer engine**

Create `lib/timer-engine.ts`:
```typescript
import { TimerConfig, TimerPhase } from '@/types';

export type Phase = {
  type: TimerPhase;
  duration: number;
  rep?: number;
  set?: number;
  round?: number;
};

const PREP_DURATION = 5;

export function computePhaseSequence(config: TimerConfig): Phase[] {
  const phases: Phase[] = [];
  const totalRounds = config.rounds ?? 1;

  phases.push({ type: 'prep', duration: PREP_DURATION });

  for (let round = 1; round <= totalRounds; round++) {
    for (let set = 1; set <= config.sets; set++) {
      for (let rep = 1; rep <= config.reps; rep++) {
        phases.push({ type: 'hang', duration: config.hangDuration, rep, set, round });

        const isLastRep = rep === config.reps;
        if (!isLastRep && config.restBetweenReps > 0) {
          phases.push({ type: 'restRep', duration: config.restBetweenReps, rep, set, round });
        }
      }

      const isLastSet = set === config.sets;
      const isLastRound = round === totalRounds;

      if (!isLastSet) {
        phases.push({ type: 'restSet', duration: config.restBetweenSets, set, round });
      } else if (!isLastRound && config.restBetweenRounds) {
        phases.push({ type: 'restRound', duration: config.restBetweenRounds, round });
      }
    }
  }

  return phases;
}

export function computeTotalDuration(phases: Phase[]): number {
  return phases.reduce((sum, phase) => sum + phase.duration, 0);
}
```

**Step 4: Run tests — verify they pass**

```bash
npx jest __tests__/lib/timer-engine.test.ts
```

Expected: PASS — all 3 tests pass.

**Step 5: Create Zustand timer store**

Create `stores/timer-store.ts`:
```typescript
import { create } from 'zustand';
import { Phase, computePhaseSequence, computeTotalDuration } from '@/lib/timer-engine';
import { TimerConfig, TimerPhase, SessionResult, Protocol, GripType } from '@/types';

type TimerState = {
  // Session config
  protocol: Protocol | null;
  grips: GripType[];
  config: TimerConfig | null;

  // Timer state
  phases: Phase[];
  currentPhaseIndex: number;
  timeRemaining: number;
  isRunning: boolean;
  isPaused: boolean;
  startTime: number | null;
  elapsedTotal: number;

  // Derived
  currentPhase: () => Phase | null;
  progress: () => { rep: number; set: number; round: number; totalSets: number; totalRounds: number };

  // Actions
  setup: (protocol: Protocol, grips: GripType[], config: TimerConfig) => void;
  start: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  tick: () => void;
  getResult: () => SessionResult | null;
};

export const useTimerStore = create<TimerState>((set, get) => ({
  protocol: null,
  grips: [],
  config: null,
  phases: [],
  currentPhaseIndex: 0,
  timeRemaining: 0,
  isRunning: false,
  isPaused: false,
  startTime: null,
  elapsedTotal: 0,

  currentPhase: () => {
    const { phases, currentPhaseIndex } = get();
    return phases[currentPhaseIndex] ?? null;
  },

  progress: () => {
    const phase = get().currentPhase();
    const config = get().config;
    return {
      rep: phase?.rep ?? 0,
      set: phase?.set ?? 0,
      round: phase?.round ?? 0,
      totalSets: config?.sets ?? 0,
      totalRounds: config?.rounds ?? 1,
    };
  },

  setup: (protocol, grips, config) => {
    const phases = computePhaseSequence(config);
    set({
      protocol,
      grips,
      config,
      phases,
      currentPhaseIndex: 0,
      timeRemaining: phases[0]?.duration ?? 0,
      isRunning: false,
      isPaused: false,
      startTime: null,
      elapsedTotal: 0,
    });
  },

  start: () => {
    set({ isRunning: true, isPaused: false, startTime: Date.now() });
  },

  pause: () => {
    set({ isPaused: true });
  },

  resume: () => {
    set({ isPaused: false });
  },

  stop: () => {
    set({ isRunning: false, isPaused: false });
  },

  tick: () => {
    const state = get();
    if (!state.isRunning || state.isPaused) return;

    const newTime = state.timeRemaining - 1;
    const newElapsed = state.elapsedTotal + 1;

    if (newTime > 0) {
      set({ timeRemaining: newTime, elapsedTotal: newElapsed });
      return;
    }

    // Move to next phase
    const nextIndex = state.currentPhaseIndex + 1;
    if (nextIndex >= state.phases.length) {
      set({ isRunning: false, timeRemaining: 0, elapsedTotal: newElapsed, currentPhaseIndex: nextIndex });
      return;
    }

    set({
      currentPhaseIndex: nextIndex,
      timeRemaining: state.phases[nextIndex].duration,
      elapsedTotal: newElapsed,
    });
  },

  getResult: () => {
    const { protocol, grips, config, phases, currentPhaseIndex, elapsedTotal } = get();
    if (!protocol || !config) return null;

    const lastHangPhase = phases
      .slice(0, currentPhaseIndex)
      .filter((p) => p.type === 'hang')
      .pop();

    return {
      protocol,
      grips,
      config,
      completedSets: lastHangPhase?.set ?? 0,
      completedRounds: lastHangPhase?.round ?? 0,
      totalDuration: elapsedTotal,
      completed: currentPhaseIndex >= phases.length,
    };
  },
}));
```

**Step 6: Commit**

```bash
git add lib/timer-engine.ts stores/timer-store.ts __tests__/
git commit -m "feat: add timer engine with state machine and Zustand store"
```

---

## Task 6: Sound Manager

**Files:**
- Create: `lib/sounds.ts`
- Create: `assets/sounds/` (generate simple beep sounds)

**Step 1: Create sound manager**

Create `lib/sounds.ts`:
```typescript
import { Audio } from 'expo-av';

let shortBeep: Audio.Sound | null = null;
let longBeep: Audio.Sound | null = null;

export async function loadSounds() {
  const { sound: short } = await Audio.Sound.createAsync(
    require('@/assets/sounds/beep-short.mp3')
  );
  const { sound: long } = await Audio.Sound.createAsync(
    require('@/assets/sounds/beep-long.mp3')
  );
  shortBeep = short;
  longBeep = long;
}

export async function playCountdown() {
  if (!shortBeep) return;
  await shortBeep.replayAsync();
}

export async function playStart() {
  if (!shortBeep) return;
  for (let i = 0; i < 3; i++) {
    await shortBeep.replayAsync();
    await new Promise((r) => setTimeout(r, 200));
  }
}

export async function playEnd() {
  if (!longBeep) return;
  await longBeep.replayAsync();
}

export async function playSessionEnd() {
  if (!longBeep) return;
  for (let i = 0; i < 3; i++) {
    await longBeep.replayAsync();
    await new Promise((r) => setTimeout(r, 400));
  }
}

export async function unloadSounds() {
  await shortBeep?.unloadAsync();
  await longBeep?.unloadAsync();
}
```

**Step 2: Generate placeholder beep sounds**

Two options:
- A) Use `expo-av` tone generation at runtime (no files needed)
- B) Download 2 free CC0 beep MP3s into `assets/sounds/`

Use option B — download or create 2 minimal MP3 beeps (short 100ms, long 500ms). Can use `ffmpeg` to generate:

```bash
mkdir -p assets/sounds
ffmpeg -f lavfi -i "sine=frequency=880:duration=0.1" -ac 1 assets/sounds/beep-short.mp3 -y
ffmpeg -f lavfi -i "sine=frequency=660:duration=0.5" -ac 1 assets/sounds/beep-long.mp3 -y
```

**Step 3: Commit**

```bash
git add lib/sounds.ts assets/sounds/
git commit -m "feat: add sound manager with beep sounds"
```

---

## Task 7: Tab Layout & Protocol List Screen

**Files:**
- Modify: `app/(tabs)/_layout.tsx`
- Modify: `app/(tabs)/index.tsx`
- Create: `components/ProtocolCard.tsx`

**Step 1: Set up tab layout**

Replace `app/(tabs)/_layout.tsx`:
```tsx
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#DC2626',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: { backgroundColor: '#1a1a1a', borderTopColor: '#333' },
        headerStyle: { backgroundColor: '#1a1a1a' },
        headerTintColor: '#fff',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Protocoles',
          tabBarIcon: ({ color, size }) => <Ionicons name="barbell" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: 'Bibliothèque',
          tabBarIcon: ({ color, size }) => <Ionicons name="book" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
```

**Step 2: Create ProtocolCard component**

Create `components/ProtocolCard.tsx`:
```tsx
import { TouchableOpacity, Text, View } from 'react-native';
import { Protocol } from '@/types';

type Props = {
  protocol: Protocol;
  onPress: () => void;
};

export function ProtocolCard({ protocol, onPress }: Props) {
  const familyLabel = {
    force: 'Force',
    continuity: 'Continuité',
    pullups: 'Tractions',
  }[protocol.family];

  return (
    <TouchableOpacity
      className="bg-neutral-800 rounded-xl p-4 mb-3"
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View className="flex-row items-center justify-between mb-1">
        <Text className="text-white text-lg font-bold flex-1">
          {protocol.icon} {protocol.name}
        </Text>
      </View>
      <Text className="text-neutral-400 text-sm mb-2">{familyLabel} · {protocol.energySystem}</Text>
      <Text className="text-neutral-300 text-sm">{protocol.summary}</Text>
    </TouchableOpacity>
  );
}
```

**Step 3: Create protocol list screen**

Replace `app/(tabs)/index.tsx`:
```tsx
import { ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ProtocolCard } from '@/components/ProtocolCard';
import { getProtocolsByFamily } from '@/constants/protocols';

const FAMILIES = [
  { key: 'force' as const, label: 'Poutre — Force' },
  { key: 'continuity' as const, label: 'Poutre — Continuité' },
  { key: 'pullups' as const, label: 'Tractions' },
];

export default function ProtocolsScreen() {
  const router = useRouter();

  return (
    <ScrollView className="flex-1 bg-neutral-900 px-4 pt-4">
      {FAMILIES.map((family) => (
        <View key={family.key} className="mb-6">
          <Text className="text-white text-xl font-bold mb-3">{family.label}</Text>
          {getProtocolsByFamily(family.key).map((protocol) => (
            <ProtocolCard
              key={protocol.id}
              protocol={protocol}
              onPress={() => router.push(`/protocol/${protocol.id}`)}
            />
          ))}
        </View>
      ))}
      <View className="h-8" />
    </ScrollView>
  );
}
```

**Step 4: Verify it renders**

```bash
npx expo start
```

Expected: Tab bar with "Protocoles" and "Bibliothèque". Protocol list shows 9 cards grouped in 3 families.

**Step 5: Commit**

```bash
git add app/ components/ProtocolCard.tsx
git commit -m "feat: add protocol list screen with tab navigation"
```

---

## Task 8: Protocol Config Screen

**Files:**
- Create: `app/protocol/[id].tsx`
- Create: `components/GripSelector.tsx`
- Create: `components/TimerConfigForm.tsx`

**Step 1: Create GripSelector component**

Create `components/GripSelector.tsx`:
```tsx
import { TouchableOpacity, Text, View } from 'react-native';
import { GripType } from '@/types';
import { GRIPS, MAX_GRIPS_PER_SESSION } from '@/constants/grips';

type Props = {
  selected: GripType[];
  onToggle: (grip: GripType) => void;
  showForPullups?: boolean;
};

export function GripSelector({ selected, onToggle, showForPullups }: Props) {
  if (showForPullups) return null;

  return (
    <View className="mb-6">
      <Text className="text-white text-lg font-bold mb-1">Préhension</Text>
      <Text className="text-neutral-400 text-sm mb-3">
        Maximum {MAX_GRIPS_PER_SESSION} par séance
      </Text>
      {GRIPS.map((grip) => {
        const isSelected = selected.includes(grip.id);
        const isDisabled = !isSelected && selected.length >= MAX_GRIPS_PER_SESSION;

        return (
          <TouchableOpacity
            key={grip.id}
            className={`rounded-lg p-3 mb-2 border ${
              isSelected
                ? 'bg-red-900/30 border-red-500'
                : isDisabled
                ? 'bg-neutral-800/50 border-neutral-700 opacity-50'
                : 'bg-neutral-800 border-neutral-700'
            }`}
            onPress={() => !isDisabled && onToggle(grip.id)}
            activeOpacity={isDisabled ? 1 : 0.7}
          >
            <Text className="text-white font-semibold">{grip.name}</Text>
            <Text className="text-neutral-400 text-sm">{grip.description}</Text>
            {grip.warning && isSelected && (
              <Text className="text-amber-400 text-sm mt-1">⚠️ {grip.warning}</Text>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
```

**Step 2: Create TimerConfigForm component**

Create `components/TimerConfigForm.tsx`:
```tsx
import { Text, View, TextInput } from 'react-native';
import { TimerConfig } from '@/types';

type Props = {
  config: TimerConfig;
  onChange: (config: TimerConfig) => void;
};

type Field = {
  key: keyof TimerConfig;
  label: string;
  unit: string;
};

const FIELDS: Field[] = [
  { key: 'hangDuration', label: 'Durée de suspension', unit: 's' },
  { key: 'restBetweenReps', label: 'Repos inter-répétition', unit: 's' },
  { key: 'reps', label: 'Répétitions par série', unit: '' },
  { key: 'sets', label: 'Nombre de séries', unit: '' },
  { key: 'restBetweenSets', label: 'Repos inter-série', unit: 's' },
  { key: 'rounds', label: 'Nombre de tours', unit: '' },
  { key: 'restBetweenRounds', label: 'Repos inter-tour', unit: 's' },
];

function formatSeconds(s: number): string {
  if (s < 60) return `${s}s`;
  const min = Math.floor(s / 60);
  const sec = s % 60;
  return sec > 0 ? `${min}min${sec}s` : `${min}min`;
}

export function TimerConfigForm({ config, onChange }: Props) {
  const visibleFields = FIELDS.filter((f) => config[f.key] !== undefined);

  return (
    <View className="mb-6">
      <Text className="text-white text-lg font-bold mb-3">Paramètres</Text>
      {visibleFields.map((field) => (
        <View key={field.key} className="flex-row items-center justify-between mb-3">
          <Text className="text-neutral-300 flex-1">{field.label}</Text>
          <View className="flex-row items-center">
            <TextInput
              className="bg-neutral-800 text-white text-center rounded-lg px-3 py-2 w-20 border border-neutral-600"
              keyboardType="numeric"
              value={String(config[field.key] ?? '')}
              onChangeText={(text) => {
                const value = parseInt(text, 10);
                if (!isNaN(value) && value >= 0) {
                  onChange({ ...config, [field.key]: value });
                }
              }}
            />
            {field.unit && (
              <Text className="text-neutral-400 ml-2 w-8">{field.unit}</Text>
            )}
          </View>
        </View>
      ))}
    </View>
  );
}
```

**Step 3: Create protocol config screen**

Create `app/protocol/[id].tsx`:
```tsx
import { useState } from 'react';
import { ScrollView, Text, View, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getProtocolById } from '@/constants/protocols';
import { GripSelector } from '@/components/GripSelector';
import { TimerConfigForm } from '@/components/TimerConfigForm';
import { useTimerStore } from '@/stores/timer-store';
import { GripType, TimerConfig } from '@/types';

export default function ProtocolConfigScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const setup = useTimerStore((s) => s.setup);
  const protocol = getProtocolById(id);

  const [selectedGrips, setSelectedGrips] = useState<GripType[]>([]);
  const [config, setConfig] = useState<TimerConfig>(protocol?.defaults ?? {} as TimerConfig);

  if (!protocol) {
    return (
      <View className="flex-1 bg-neutral-900 items-center justify-center">
        <Text className="text-white">Protocole introuvable</Text>
      </View>
    );
  }

  const isPullups = protocol.family === 'pullups';
  const canStart = isPullups || selectedGrips.length > 0;

  const handleToggleGrip = (grip: GripType) => {
    setSelectedGrips((prev) =>
      prev.includes(grip) ? prev.filter((g) => g !== grip) : [...prev, grip]
    );
  };

  const handleStart = () => {
    setup(protocol, selectedGrips, config);
    router.push('/timer');
  };

  return (
    <ScrollView className="flex-1 bg-neutral-900 px-4 pt-4">
      <Text className="text-white text-2xl font-bold mb-1">{protocol.icon} {protocol.name}</Text>
      <Text className="text-neutral-400 mb-6">{protocol.summary}</Text>

      <GripSelector
        selected={selectedGrips}
        onToggle={handleToggleGrip}
        showForPullups={isPullups}
      />

      <TimerConfigForm config={config} onChange={setConfig} />

      <View className="bg-neutral-800 rounded-xl p-4 mb-6">
        <Text className="text-amber-400 font-bold mb-1">💡 Conseil de charge</Text>
        <Text className="text-neutral-300">{protocol.loadAdvice}</Text>
      </View>

      <TouchableOpacity
        className={`rounded-xl py-4 items-center mb-8 ${canStart ? 'bg-red-600' : 'bg-neutral-700'}`}
        onPress={handleStart}
        disabled={!canStart}
        activeOpacity={0.8}
      >
        <Text className="text-white text-xl font-bold">
          {canStart ? 'Lancer la séance' : 'Sélectionnez une préhension'}
        </Text>
      </TouchableOpacity>

      <View className="h-8" />
    </ScrollView>
  );
}
```

**Step 4: Verify navigation works**

```bash
npx expo start
```

Expected: Tap a protocol card → navigates to config screen with grip selector, parameters, and launch button.

**Step 5: Commit**

```bash
git add app/protocol/ components/GripSelector.tsx components/TimerConfigForm.tsx
git commit -m "feat: add protocol config screen with grip selection and parameters"
```

---

## Task 9: Timer Screen

**Files:**
- Create: `app/timer.tsx`

**Step 1: Create timer screen**

Create `app/timer.tsx`:
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
  const bgColor = phase ? PHASE_COLORS[phase.type] : PHASE_COLORS.done;
  const phaseLabel = phase ? PHASE_LABELS[phase.type] : 'TERMINÉ';

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
    <View className="flex-1 items-center justify-center px-6" style={{ backgroundColor: bgColor }}>
      {/* Phase label */}
      <Text className="text-white/70 text-2xl font-bold mb-2">{phaseLabel}</Text>

      {/* Time */}
      <Text className="text-white text-8xl font-bold mb-8">{formatTime(timeRemaining)}</Text>

      {/* Progress */}
      <View className="flex-row gap-6 mb-8">
        <View className="items-center">
          <Text className="text-white/60 text-sm">Répétition</Text>
          <Text className="text-white text-xl font-bold">
            {prog.rep}/{config?.reps ?? 0}
          </Text>
        </View>
        <View className="items-center">
          <Text className="text-white/60 text-sm">Série</Text>
          <Text className="text-white text-xl font-bold">
            {prog.set}/{prog.totalSets}
          </Text>
        </View>
        {prog.totalRounds > 1 && (
          <View className="items-center">
            <Text className="text-white/60 text-sm">Tour</Text>
            <Text className="text-white text-xl font-bold">
              {prog.round}/{prog.totalRounds}
            </Text>
          </View>
        )}
      </View>

      {/* Grip reminder during rest */}
      {gripReminder && (
        <View className="bg-black/30 rounded-xl p-4 mb-6 w-full">
          <Text className="text-white font-bold mb-1">✋ Préhension suivante</Text>
          <Text className="text-white/80">{gripReminder}</Text>
          <Text className="text-white/60 text-sm mt-1">
            Gardez la position correcte (règle des ±15°)
          </Text>
        </View>
      )}

      {/* Load advice during rest */}
      {(phase?.type === 'restSet' || phase?.type === 'restRound') && protocol && (
        <View className="bg-black/20 rounded-xl p-4 mb-6 w-full">
          <Text className="text-amber-300 text-sm">{protocol.loadAdvice}</Text>
        </View>
      )}

      {/* Controls */}
      <View className="flex-row gap-4">
        <TouchableOpacity
          className="bg-white/20 rounded-full px-8 py-4"
          onPress={isPaused ? resume : pause}
          activeOpacity={0.7}
        >
          <Text className="text-white text-lg font-bold">
            {isPaused ? '▶ Reprendre' : '⏸ Pause'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="bg-red-900/50 rounded-full px-8 py-4"
          onPress={handleStop}
          activeOpacity={0.7}
        >
          <Text className="text-white text-lg font-bold">⏹ Arrêter</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
```

**Step 2: Verify timer works**

```bash
npx expo start
```

Expected: Select a protocol → configure → launch → timer runs with color changes, countdown, sounds.

**Step 3: Commit**

```bash
git add app/timer.tsx
git commit -m "feat: add fullscreen timer with phase colors, sounds, and progress"
```

---

## Task 10: Recap Screen

**Files:**
- Create: `app/recap.tsx`

**Step 1: Create recap screen**

Create `app/recap.tsx`:
```tsx
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTimerStore } from '@/stores/timer-store';
import { getGripById } from '@/constants/grips';

function formatDuration(seconds: number): string {
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  if (min === 0) return `${sec}s`;
  return sec > 0 ? `${min}min ${sec}s` : `${min}min`;
}

export default function RecapScreen() {
  const router = useRouter();
  const result = useTimerStore((s) => s.getResult());

  if (!result) {
    return (
      <View className="flex-1 bg-neutral-900 items-center justify-center">
        <Text className="text-white">Aucune séance à afficher</Text>
        <TouchableOpacity className="mt-4" onPress={() => router.replace('/')}>
          <Text className="text-red-400">Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { protocol, grips, completedSets, completedRounds, totalDuration, completed } = result;

  return (
    <ScrollView className="flex-1 bg-neutral-900 px-4 pt-8">
      <Text className="text-white text-3xl font-bold text-center mb-2">
        {completed ? '🎉 Séance terminée !' : '⏹ Séance interrompue'}
      </Text>

      <View className="bg-neutral-800 rounded-xl p-4 mt-6 mb-4">
        <Text className="text-white text-lg font-bold mb-3">Résumé</Text>
        <View className="gap-2">
          <Text className="text-neutral-300">
            📋 {protocol.icon} {protocol.name}
          </Text>
          {grips.length > 0 && (
            <Text className="text-neutral-300">
              ✋ {grips.map((g) => getGripById(g)?.name).join(', ')}
            </Text>
          )}
          <Text className="text-neutral-300">
            📊 {completedSets} série{completedSets > 1 ? 's' : ''}
            {completedRounds > 1 ? ` · ${completedRounds} tour${completedRounds > 1 ? 's' : ''}` : ''}
          </Text>
          <Text className="text-neutral-300">
            ⏱ {formatDuration(totalDuration)}
          </Text>
        </View>
      </View>

      <View className="bg-green-900/30 border border-green-700 rounded-xl p-4 mb-4">
        <Text className="text-green-400 font-bold mb-1">🩺 Récupération</Text>
        <Text className="text-neutral-300">{protocol.recoveryAdvice}</Text>
      </View>

      <View className="bg-blue-900/30 border border-blue-700 rounded-xl p-4 mb-6">
        <Text className="text-blue-400 font-bold mb-1">📅 Fréquence recommandée</Text>
        <Text className="text-neutral-300">{protocol.frequencyAdvice}</Text>
      </View>

      <TouchableOpacity
        className="bg-red-600 rounded-xl py-4 items-center mb-8"
        onPress={() => router.replace('/')}
        activeOpacity={0.8}
      >
        <Text className="text-white text-lg font-bold">Retour aux protocoles</Text>
      </TouchableOpacity>

      <View className="h-8" />
    </ScrollView>
  );
}
```

**Step 2: Commit**

```bash
git add app/recap.tsx
git commit -m "feat: add session recap screen with recovery and frequency advice"
```

---

## Task 11: Library Tab

**Files:**
- Modify: `app/(tabs)/library.tsx`
- Create: `components/library/PrinciplesSection.tsx`
- Create: `components/library/EnergySystemsSection.tsx`
- Create: `components/library/GripsSection.tsx`
- Create: `components/library/ParametersSection.tsx`
- Create: `components/library/CrimpLearningSection.tsx`

**Step 1: Create library sections**

Create `components/library/PrinciplesSection.tsx`:
```tsx
import { Text, View } from 'react-native';

const PRINCIPLES = [
  { name: 'Surcharge', desc: "L'intensité doit être difficile à soutenir pour créer une adaptation." },
  { name: 'Progressivité', desc: "Répéter le même exercice à la même intensité ne produit aucune amélioration." },
  { name: 'Répétition', desc: "Une seule séance ne suffit pas. L'adaptation demande du temps et de la régularité." },
  { name: 'Récupération', desc: "Le corps ne s'adapte que s'il a le temps de se réparer entre les séances." },
  { name: 'Spécificité', desc: "Les exercices doivent être spécifiques à l'escalade pour produire des progrès." },
  { name: 'Réversibilité', desc: "Tout gain physique disparaît progressivement à l'arrêt de l'entraînement." },
];

export function PrinciplesSection() {
  return (
    <View className="mb-6">
      <Text className="text-white text-xl font-bold mb-3">Les 6 principes</Text>
      {PRINCIPLES.map((p, i) => (
        <View key={p.name} className="bg-neutral-800 rounded-lg p-3 mb-2">
          <Text className="text-white font-bold">{i + 1}. {p.name}</Text>
          <Text className="text-neutral-400 text-sm">{p.desc}</Text>
        </View>
      ))}
    </View>
  );
}
```

Create `components/library/EnergySystemsSection.tsx`:
```tsx
import { Text, View } from 'react-native';

const SYSTEMS = [
  { name: 'Aérobie', speed: 'Lente', duration: 'Toute la journée', use: 'Continuité longue', color: 'bg-green-900/30' },
  { name: 'Anaérobie lactique', speed: 'Rapide', duration: '20s à 2min', use: 'Continuité courte', color: 'bg-amber-900/30' },
  { name: 'Anaérobie alactique', speed: 'Instantanée', duration: '< 10s', use: 'Force pure', color: 'bg-red-900/30' },
];

export function EnergySystemsSection() {
  return (
    <View className="mb-6">
      <Text className="text-white text-xl font-bold mb-3">Les 3 filières énergétiques</Text>
      {SYSTEMS.map((s) => (
        <View key={s.name} className={`${s.color} rounded-lg p-3 mb-2`}>
          <Text className="text-white font-bold">{s.name}</Text>
          <Text className="text-neutral-300 text-sm">
            {s.speed} · {s.duration} · {s.use}
          </Text>
        </View>
      ))}
    </View>
  );
}
```

Create `components/library/GripsSection.tsx`:
```tsx
import { Text, View } from 'react-native';
import { GRIPS } from '@/constants/grips';

export function GripsSection() {
  return (
    <View className="mb-6">
      <Text className="text-white text-xl font-bold mb-3">Les 5 préhensions</Text>
      {GRIPS.map((grip) => (
        <View key={grip.id} className="bg-neutral-800 rounded-lg p-3 mb-2">
          <Text className="text-white font-bold">{grip.name}</Text>
          <Text className="text-neutral-400 text-sm">{grip.type} · {grip.description}</Text>
          <Text className="text-neutral-300 text-sm mt-1">{grip.keyPoints}</Text>
        </View>
      ))}
      <View className="bg-amber-900/30 rounded-lg p-3 mt-2">
        <Text className="text-amber-300 font-bold">Règle des ±15°</Text>
        <Text className="text-neutral-300 text-sm">
          On ne gagne en force que dans un intervalle de ±15° autour de l'angle articulaire travaillé.
          Si les doigts se relâchent, réduisez la charge plutôt que de finir en mauvaise position.
        </Text>
      </View>
    </View>
  );
}
```

Create `components/library/ParametersSection.tsx`:
```tsx
import { Text, View } from 'react-native';

export function ParametersSection() {
  return (
    <View className="mb-6">
      <Text className="text-white text-xl font-bold mb-3">Paramètres modulables</Text>
      <View className="bg-red-900/20 rounded-lg p-3 mb-2">
        <Text className="text-red-400 font-bold mb-1">Augmenter la difficulté</Text>
        <Text className="text-neutral-300 text-sm">
          • Prise plus petite{'\n'}• Durée de suspension plus longue{'\n'}• Ajouter du poids{'\n'}• Moins de doigts{'\n'}• Un seul bras{'\n'}• Réduire les repos
        </Text>
      </View>
      <View className="bg-green-900/20 rounded-lg p-3 mb-2">
        <Text className="text-green-400 font-bold mb-1">Réduire la difficulté</Text>
        <Text className="text-neutral-300 text-sm">
          • Prises plus grosses{'\n'}• Durée plus courte{'\n'}• Délester (poulie, élastique, pied sur chaise){'\n'}• Allonger les repos
        </Text>
      </View>
      <View className="bg-neutral-800 rounded-lg p-3">
        <Text className="text-amber-300 font-bold mb-1">Conseil peau</Text>
        <Text className="text-neutral-300 text-sm">
          Éviter les micro-réglettes en continu. Alterner : grosses prises lestées / petites prises sans lest.
        </Text>
      </View>
    </View>
  );
}
```

Create `components/library/CrimpLearningSection.tsx`:
```tsx
import { Text, View } from 'react-native';

const STEPS = [
  {
    title: 'Étape 1 — Découverte de la position',
    desc: "Saisir le bord d'un objet (table, chambranle). Placer les doigts en arqué (IPP à angle droit) en tirant doucement. Répéter pendant plusieurs jours ou semaines.",
  },
  {
    title: 'Étape 2 — Monter en charge (1 main)',
    desc: "Après échauffement : debout sous une réglette, empoigner en arqué avec le pouce et tirer. Garder les pieds au sol. Tenir 10s de chaque côté, 5 séries par main.",
  },
  {
    title: 'Étape 3 — Suspension à deux mains',
    desc: "Soutenir le poids du corps en arqué avec le pouce et les deux mains. Commencer avec charge réduite et augmenter progressivement.",
  },
];

export function CrimpLearningSection() {
  return (
    <View className="mb-6">
      <Text className="text-white text-xl font-bold mb-3">Apprendre l'arqué</Text>
      {STEPS.map((step, i) => (
        <View key={i} className="bg-neutral-800 rounded-lg p-3 mb-2">
          <Text className="text-white font-bold">{step.title}</Text>
          <Text className="text-neutral-400 text-sm">{step.desc}</Text>
        </View>
      ))}
    </View>
  );
}
```

**Step 2: Create library screen**

Replace `app/(tabs)/library.tsx`:
```tsx
import { ScrollView, View } from 'react-native';
import { PrinciplesSection } from '@/components/library/PrinciplesSection';
import { EnergySystemsSection } from '@/components/library/EnergySystemsSection';
import { GripsSection } from '@/components/library/GripsSection';
import { ParametersSection } from '@/components/library/ParametersSection';
import { CrimpLearningSection } from '@/components/library/CrimpLearningSection';

export default function LibraryScreen() {
  return (
    <ScrollView className="flex-1 bg-neutral-900 px-4 pt-4">
      <PrinciplesSection />
      <EnergySystemsSection />
      <GripsSection />
      <ParametersSection />
      <CrimpLearningSection />
      <View className="h-8" />
    </ScrollView>
  );
}
```

**Step 3: Verify library renders**

```bash
npx expo start
```

Expected: Library tab shows all 5 sections with book content.

**Step 4: Commit**

```bash
git add app/ components/library/
git commit -m "feat: add library tab with pedagogical content from book"
```

---

## Task 12: Root Layout & Final Wiring

**Files:**
- Modify: `app/_layout.tsx`

**Step 1: Configure root layout**

Update `app/_layout.tsx`:
```tsx
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { loadSounds, unloadSounds } from '@/lib/sounds';
import '../global.css';

export default function RootLayout() {
  useEffect(() => {
    loadSounds();
    return () => { unloadSounds(); };
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#1a1a1a' },
          headerTintColor: '#fff',
          contentStyle: { backgroundColor: '#1a1a1a' },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="protocol/[id]"
          options={{ title: 'Configuration', presentation: 'card' }}
        />
        <Stack.Screen
          name="timer"
          options={{ headerShown: false, presentation: 'fullScreenModal', gestureEnabled: false }}
        />
        <Stack.Screen
          name="recap"
          options={{ title: 'Récapitulatif', headerBackVisible: false, gestureEnabled: false }}
        />
      </Stack>
    </>
  );
}
```

**Step 2: Full end-to-end test**

```bash
npx expo start
```

Test flow:
1. Open app → see 9 protocols in 3 families
2. Tap "Suspensions Intermittentes" → config screen
3. Select 2 grips → modify parameters → tap "Lancer"
4. Timer runs with color changes, sounds, progress counters
5. Wait for completion (or hit Stop) → recap screen
6. Verify recovery + frequency advice
7. Tap "Retour" → back to protocol list
8. Tap "Bibliothèque" tab → all 5 sections render

**Step 3: Commit**

```bash
git add app/_layout.tsx
git commit -m "feat: configure root layout with navigation and sound loading"
```

---

## Task 13: Clean Up & Push

**Step 1: Remove unused template files**

Delete any leftover template screens/components from `create-expo-app` that are not used (explore, etc.).

**Step 2: Final commit and push**

```bash
git add -A
git commit -m "chore: clean up unused template files"
git push origin main
```

---

## Summary

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Scaffold Expo + deps | `chore: scaffold Expo project` |
| 2 | Types & colors | `feat: add TypeScript types and color constants` |
| 3 | 9 protocol definitions | `feat: add 9 protocol definitions from book` |
| 4 | 5 grip definitions | `feat: add 5 grip type definitions from book` |
| 5 | Timer engine + store (TDD) | `feat: add timer engine with state machine` |
| 6 | Sound manager + beeps | `feat: add sound manager with beep sounds` |
| 7 | Tab layout + protocol list | `feat: add protocol list screen` |
| 8 | Protocol config screen | `feat: add protocol config screen` |
| 9 | Timer screen | `feat: add fullscreen timer` |
| 10 | Recap screen | `feat: add session recap screen` |
| 11 | Library tab | `feat: add library tab` |
| 12 | Root layout wiring | `feat: configure root layout` |
| 13 | Clean up + push | `chore: clean up` |
