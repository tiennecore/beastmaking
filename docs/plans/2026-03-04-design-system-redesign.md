# Design System Redesign — Granite & Chalk

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign the Beastmaking Timer app with a climbing-culture "Granite & Chalk" design system and apply it to the 4 key screens.

**Style:** Climbing culture — inspired by Moon Board, Kilter Board, Beastmaker. Warm stone tones, orange accent (Beastmaker signature), rock/chalk aesthetic.

**Scope:** Design tokens + 4 key screens (menu, config, timer, recap) + propagation to remaining screens.

---

## Design Tokens

### Color Palette

| Token | Value | Tailwind | Usage |
|-------|-------|----------|-------|
| bg-base | `#1C1917` | stone-950 | Screen backgrounds |
| bg-surface | `#292524` | stone-800 | Cards, containers |
| bg-surface-raised | `#44403C` | stone-700 | Buttons, inputs, elevated elements |
| accent | `#F97316` | orange-500 | Primary CTA, active elements |
| accent-muted | `#9A3412` | orange-800 | Subtle accent backgrounds |
| text-primary | `#F5F5F4` | stone-50 | Main text |
| text-secondary | `#A8A29E` | stone-400 | Labels, descriptions |
| text-muted | `#78716C` | stone-500 | Disabled, hints |
| success | `#A3E635` | lime-400 | Completed sessions, "go" phase |
| warning | `#FBBF24` | amber-400 | Alerts, advice |
| danger | `#EF4444` | red-500 | Deletion, errors |
| border | `#44403C` | stone-700 | Card borders |

### Timer Phase Colors

| Phase | Value | Tailwind | Rationale |
|-------|-------|----------|-----------|
| prep | `#FBBF24` | amber-400 | Warm, better contrast than yellow |
| hang | `#F97316` | orange-500 | Beastmaker orange, cohesive with accent |
| restRep | `#22D3EE` | cyan-400 | Cool, short rest |
| restSet | `#818CF8` | indigo-400 | Calm, medium rest |
| restRound | `#A3E635` | lime-400 | Long recovery |

### Typography Scale

| Level | Classes | Usage |
|-------|---------|-------|
| H1 | `text-3xl font-bold tracking-tight text-stone-50` | Screen title (1 per page) |
| H2 | `text-xl font-bold text-stone-50` | Section title |
| H3 | `text-base font-semibold text-stone-50` | Card/group title |
| Body | `text-base text-stone-200` | Body text |
| Caption | `text-sm text-stone-400` | Labels, metadata |
| Overline | `text-xs font-semibold uppercase tracking-wide text-stone-500` | Section headers (VOLUME, DUREES) |

### Spacing Scale (4px multiples)

| Token | Value | Tailwind |
|-------|-------|----------|
| xs | 4px | p-1 |
| sm | 8px | p-2 |
| md | 12px | p-3 |
| lg | 16px | p-4 |
| xl | 24px | p-6 |
| 2xl | 32px | p-8 |

### Card System

| Type | Classes |
|------|---------|
| Standard | `bg-stone-800 rounded-2xl p-4 border border-stone-700` |
| Interactive | `bg-stone-800 rounded-2xl p-4 border border-stone-700 active:bg-stone-700` |
| Accent | `bg-stone-800 rounded-2xl p-4` + `style={{ borderLeftWidth: 3, borderLeftColor: color }}` |

---

## Screen Designs

### 1. Menu Principal (index.tsx)

**Changes from current:**
- Background: `bg-stone-950` (warm) replaces `bg-neutral-900` (cold)
- Cards: `bg-stone-800 rounded-2xl border border-stone-700` with left border 3px
- Title: H1 style, subtitle: Caption style
- Item colors aligned with palette:
  - Entrainements: orange-500
  - Creer: amber-400
  - Mes entrainements: amber-500
  - Comprendre: cyan-400
  - Historique: indigo-400
  - Grimpe: lime-400
- Chevron: stone-500 arrow icon (replaces `>` text)

### 2. Config Protocole (protocol/[id].tsx + TimerConfigForm)

**Changes:**
- All stone-950/stone-800 backgrounds
- TimerConfigForm:
  - Overline headers for sections
  - Stepper buttons: `bg-stone-700 rounded-lg active:bg-stone-600`
  - Duration cards: border-left 3px with phase color, rounded-2xl
  - Color picker circles: w-8 h-8 (larger), ring-2 ring-white when selected
- Advice box: `bg-amber-950/40 border border-amber-800/50 rounded-2xl`
- CTA button: `bg-orange-500 rounded-2xl py-4` (replaces red-600)
- GripSelector: stone-800 trigger, stone-950 modal background

### 3. Timer (timer.tsx)

**Major changes:**
- Background: phase color at 15% opacity on stone-950 (ambient color, not solid)
- Progress bar: horizontal bar at top showing global progress (rep/set/round)
- Timer text: always `text-stone-50` (white, never phase color)
- Phase label: pill badge (`bg-phase/20 text-phase px-4 py-1 rounded-full`)
- Progress info: `text-lg` (bigger), organized row with separators
- All overlay text: `text-stone-50` or `text-stone-200` (no more white/70)
- Stop button: outlined (`bg-red-500/20 border border-red-500 rounded-2xl`)

### 4. Recap (recap.tsx)

**Changes:**
- Completion state:
  - Completed: lime-400 text + check icon
  - Interrupted: amber-400 text + pause icon
- Summary: 2x2 grid of mini stat cards (duration, sets, load, grips)
- Advice boxes: unified style `bg-stone-800 border-l-3` with accent color
  - Recovery: lime accent
  - Frequency: cyan accent
- Return button: `bg-orange-500 rounded-2xl` (replaces red-600)

---

## Propagation Rules

All other screens (protocols, library, create-workout, custom-workouts, history, climbing) inherit the design tokens:
- `bg-neutral-900` -> `bg-stone-950`
- `bg-neutral-800` -> `bg-stone-800`
- `bg-neutral-700` -> `bg-stone-700`
- `text-neutral-*` -> `text-stone-*`
- `bg-red-600` (CTA) -> `bg-orange-500`
- `rounded-xl` -> `rounded-2xl` (cards only)
- Add `border border-stone-700` to all cards

---

## Out of Scope (V2)

- Haptic feedback (expo-haptics)
- Animated micro-interactions
- Custom fonts
- Counter badges on menu items
