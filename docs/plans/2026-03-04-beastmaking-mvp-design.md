# Beastmaking Timer — MVP Design

## Vision

Interval timer app for climbing hangboard training, embedding pedagogical content from the Beastmaking book. A climber opens the app, picks a protocol, and gets guided through the session.

## Stack

- **React Native + Expo** (SDK 52+) — Android only
- **TypeScript**
- **Expo Router** — file-based navigation (tabs + stack)
- **NativeWind v4** — Tailwind styling
- **Zustand** — state management (timer state, session)
- **expo-av** — timer sounds (beeps)
- **expo-keep-awake** — prevent screen sleep during timer

Supabase deferred to Phase 2 (auth, history, profile).

## Architecture

```
app/                    # Expo Router screens
  (tabs)/               # Tab navigation
    index.tsx           # Home — protocol list
    library.tsx         # Library — book content
  protocol/[id].tsx     # Protocol config screen
  timer.tsx             # Timer screen (fullscreen)
  recap.tsx             # Session recap screen
components/             # Reusable components
lib/                    # Business logic
  protocols.ts          # 9 protocol definitions (static data)
  timer-engine.ts       # Timer state machine
stores/                 # Zustand stores
  timer-store.ts        # Timer state
types/                  # TypeScript types
constants/              # Colors, sounds, book text
```

## Data Model

### Protocol

```typescript
type Protocol = {
  id: string
  name: string
  family: 'force' | 'continuity' | 'pullups'
  energySystem: 'alactic' | 'lactic' | 'aerobic'
  icon: string
  summary: string
  defaults: TimerConfig
  loadAdvice: string
  recoveryAdvice: string
  frequencyAdvice: string
}

type TimerConfig = {
  hangDuration: number
  restBetweenReps: number
  reps: number
  sets: number
  restBetweenSets: number
  rounds?: number
  restBetweenRounds?: number
}
```

### Grip Types

```typescript
type GripType = 'open3' | 'open4' | 'halfCrimp' | 'fullCrimp' | 'fullCrimpThumb'
```

Max 3 grips per session (book rule). Each grip has description, active/passive type, and warnings.

### Timer State Machine

```
PREP (5s) → HANG → REST_REP → (loop reps) → REST_SET → (loop sets) → REST_ROUND → (loop rounds) → DONE
```

Phase colors:
- PREP: yellow
- HANG: red
- REST_REP: blue
- REST_SET: purple
- REST_ROUND: green

## Screens

### 1. Protocols (Home tab)

List of 9 protocols grouped by family:
- **Force**: Max Short, Max Long, Tendons, Intermittent
- **Continuity**: Long, Short
- **Pull-ups**: Weighted, Negative, Minute

Each card shows: name, energy system, 1-line summary, intensity indicator.

### 2. Protocol Config

Three sections:
- **A) Grip selection** — visual picker, max 3, with book descriptions
- **B) Timer parameters** — pre-filled from book defaults, editable
- **C) Load advice** — contextual text from book (read-only)

### 3. Timer (fullscreen)

- Large countdown, background color per phase
- Progress: current rep/total, set/total, round/total
- Rest phase: grip reminder + load advice for next set
- Sounds: 3 beeps start, 3s countdown, long beep end
- Buttons: Pause/Resume, Stop
- Screen stays awake

### 4. Recap

- Protocol completed, grip(s) used, sets/rounds done, total duration
- Recovery advice from book
- Recommended frequency from book

### 5. Library (tab)

Static book content:
- 6 training principles
- 3 energy systems
- 5 grip types + active vs passive
- Modifiable parameters
- Learning the crimp (3 steps)

## MVP Scope

**In:**
- 9 protocols with configurable parameters
- Functional timer with sounds and phase colors
- Grip selection (max 3 per session)
- Session recap with book advice
- Library with pedagogical content

**Out (Phase 2):**
- Google Auth + user profile
- Supabase backend
- Session history + stats
- Composed workouts (built-in + custom)
- Weekly recommendations + alerts
- Progression tracking (8/16 weeks)

## Phase 2 Roadmap

1. Google Auth + profile (Supabase Auth)
2. Session history (Supabase DB)
3. Composed workouts (built-in + custom)
4. Weekly recommendations + smart alerts
5. Stats and progression tracking
