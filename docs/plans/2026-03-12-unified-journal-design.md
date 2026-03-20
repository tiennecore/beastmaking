# Unified Training Journal — Design

## Goal

Replace the separate History and Climbing screens with a single "Journal" screen that shows all training activity (hangboard + climbing) in a unified chronological timeline with weekly stats, filters, and a quick-log bottom sheet for climbing sessions.

## Architecture

- One screen `app/journal.tsx` replaces `app/history.tsx` and `app/climbing.tsx`
- One detail page `app/journal/[id].tsx` handles viewing and editing
- Data stays in two separate AsyncStorage stores — merged at display time
- Union type `JournalEntry` wraps both data types for rendering

## Journal Screen (`app/journal.tsx`)

### Stats Header (fixed at top)

Three compact stat cards in a single row:
- **Sessions this week** — count of all entries (hangboard + climbing) in current week
- **Streak** — consecutive days with at least one session
- **Suspension minutes** — total hangboard suspension time this week (computed from `totalDuration` of completed hangboard sessions)

### Filters

Horizontal pill row below stats: **Tout** | **Poutre** | **Bloc** | **Voie**
- Active pill: orange background
- Inactive pills: stone background
- Filters apply to the list below

### Timeline List

- **Grouped by day** — section header per day ("Lundi 10 mars")
- **Infinite scroll** — no 7/30 day limit, loads all data
- **Card variants by type:**

**Hangboard card:**
- Protocol icon + name
- Duration (formatted)
- Status badge: "Terminee" (green) / "Interrompue" (yellow)
- First grip config

**Climbing card:**
- Type badge: "Bloc" (orange #F97316) / "Voie" (blue #2563EB)
- Location (if set)
- Difficulty (if set)
- Route/boulder count + success rate (if entries exist)

**Interactions:**
- Tap any card → navigate to `journal/[id]`
- Long-press climbing card → confirm delete
- Haptic feedback on all interactions

### Add Button ("+" FAB or bottom button)

- Fixed at bottom in thumb zone
- Opens bottom sheet for quick climbing log

### Quick Log Bottom Sheet

Minimal form for fast climbing session entry:
- **Type**: two toggle buttons (Bloc / Voie)
- **Count**: stepper for number of routes/boulders
- **Difficulty**: four buttons (Facile / Moyen / Dur / Max)
- **Date**: defaults to today (not shown unless changed)
- **Location**: pre-filled with last used location (not shown unless changed)
- **"Enregistrer"** button
- **"Ajouter des details →"** link: saves the session and navigates to `journal/[id]` in edit mode

### Empty State

- Climbing emoji + "Aucune seance enregistree"
- CTA button: "Commencer un protocole" → navigates to `/protocols`

## Detail Page (`app/journal/[id].tsx`)

### Route parameter

`id` is prefixed to distinguish source: `h-{historyId}` for hangboard, `c-{climbingId}` for climbing.

### Hangboard Detail (read-only)

- Protocol icon + name
- Date
- Duration (formatted)
- Status (completed / interrupted)
- Config summary: sets, reps, hang duration, rest durations
- All grip configs (not just first)

### Climbing Detail (editable)

- **Metadata header**: type, date, location, difficulty — pencil icon toggles edit mode for these fields
- **Entries section**: list of routes/boulders with grade (stepper), color (boulders), success/fail, attempts — always editable inline
- **"Ajouter une voie/un bloc"** button to add entries without page change
- **"Enregistrer"** button → saves and navigates back to journal

## Home Screen Changes (`app/index.tsx`)

- Replace two TileCards ("Historique" + "Grimpe") with one card: **"Journal"**
- Subtitle: "Poutre, bloc, voie"
- Badge: "X seances cette semaine" (combined count)
- Fix obsolete subtitle "Bloc, voie, renfo"

## Recap Screen Changes (`app/recap.tsx`)

- Add secondary button: **"Ajouter une grimpe"**
- Navigates to `/journal` with query param `?quicklog=true` to auto-open the bottom sheet

## Data Model

### No storage migration

Both AsyncStorage keys remain:
- `beastmaking:history` → `SessionHistoryEntry[]`
- `beastmaking:climbing-sessions` → `ClimbingSession[]`

### Display union type

```typescript
type JournalEntry =
  | { type: 'hangboard'; data: SessionHistoryEntry }
  | { type: 'climbing'; data: ClimbingSession };
```

### Hook: `useJournalEntries(filter?)`

- Loads both stores
- Wraps each item in `JournalEntry`
- Sorts by date descending
- Groups by day
- Applies filter if set (tout/poutre/bloc/voie)
- Returns `{ entries: GroupedJournalEntry[], stats: WeeklyStats }`

### Stats computation

```typescript
type WeeklyStats = {
  sessionsThisWeek: number;
  streakDays: number;
  suspensionMinutesThisWeek: number;
};
```

## Files

| Action | File |
|--------|------|
| Create | `app/journal.tsx` |
| Create | `app/journal/[id].tsx` |
| Delete | `app/history.tsx` |
| Delete | `app/climbing.tsx` |
| Modify | `app/index.tsx` — single Journal card |
| Modify | `app/recap.tsx` — add "Ajouter une grimpe" button |
| Modify | `app/_layout.tsx` — update Stack routes |

## UX Quick Fixes (bundled)

- Touch targets: all +/- steppers min 40pt + hitSlop 8
- Empty state: add CTA to protocols
- Home subtitle: "Poutre, bloc, voie" (not "Bloc, voie, renfo")
