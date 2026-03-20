# Grip Config Redesign — Design Document

## Goal

Refactor the grip selection system to support hold types, per-grip load, and per-set configuration.

## Current State

- `GripType[]` — simple array of grip IDs (open3, halfCrimp, etc.)
- Single `loadKg` in TimerConfigForm (global)
- GripSelector above TimerConfigForm in protocol config
- No concept of physical hold type (flat, crimp edge, round)

## New Data Model

```typescript
type HoldType = 'flat' | 'crimp20' | 'crimp15' | 'crimp10' | 'crimp5' | 'round';

type GripConfig = {
  grip: GripType;
  hold: HoldType;
  loadKg: number;
};

type GripMode = 'session' | 'perSet';
```

## Hold Types (constant list)

| ID | Label |
|----|-------|
| flat | Plat |
| crimp20 | Réglette 20mm |
| crimp15 | Réglette 15mm |
| crimp10 | Réglette 10mm |
| crimp5 | Réglette 5mm |
| round | Prise ronde |

## Screen Layout — protocol/[id].tsx

1. Protocol info (unchanged)
2. TimerConfigForm (volume + durations — `loadKg` removed from here)
3. **Grip Section** (new, below parameters):
   - Toggle: "Séance complète" / "Par série"
   - Session mode: 1 GripConfigRow (grip + hold + load)
   - Per-set mode: N GripConfigRows (N = number of sets from config)
4. Start button

## GripConfigRow Component

Each row contains:
- Grip picker (existing grip types from constants/grips.ts)
- Hold picker (HoldType from new constant)
- Load stepper (±1, ±5 kg)

## Timer Integration

### Grip reminder during rest phases
- Session mode: show single config during restSet/restRound
- Per-set mode: show NEXT set's config during restSet/restRound
  - Access via `gripConfigs[currentSetIndex]` where currentSetIndex comes from phase.set

### Display format
"Half crimp · Réglette 15mm · +3kg"

## Store Changes — timer-store.ts

```typescript
// setup() signature changes:
setup(protocol, gripMode, gripConfigs, config)

// State:
gripMode: GripMode
gripConfigs: GripConfig[]

// stop() → SessionResult:
gripMode: GripMode
gripConfigs: GripConfig[]
```

## Type Changes — types/index.ts

- Add: `HoldType`, `GripConfig`, `GripMode`
- Modify: `SessionConfig` → replace `grips: GripType[]` with `gripMode: GripMode` + `gripConfigs: GripConfig[]`
- Modify: `SessionResult` → same replacement
- Remove: `loadKg` from `TimerConfig`

## History Migration

Old entries have `grips: GripType[]` and `config.loadKg`. Migration strategy:
- On load, if entry has `grips` array (old format), convert:
  - `gripMode = 'session'`
  - `gripConfigs = grips.map(g => ({ grip: g, hold: 'flat', loadKg: config.loadKg || 0 }))`
- New entries use the new format directly

## Recap Changes — recap.tsx

- Display grip configs instead of simple grip names
- Format: "Half crimp · Réglette 15mm · +3kg"
- Per-set mode: show all set configs in a list

## Files Impacted

| File | Change |
|------|--------|
| types/index.ts | Add HoldType, GripConfig, GripMode; modify SessionConfig, SessionResult; remove loadKg from TimerConfig |
| constants/grips.ts | Add HOLDS constant (HoldType[]) |
| components/GripSelector.tsx | Replace with new GripConfigSection component |
| components/TimerConfigForm.tsx | Remove loadKg section |
| app/protocol/[id].tsx | Move grip section below params, use new component, update setup() call |
| stores/timer-store.ts | Update setup/stop to use gripMode + gripConfigs |
| app/timer.tsx | Update grip reminder to show hold + load, handle per-set display |
| app/recap.tsx | Update grip display format |
| lib/storage.ts | Add migration for old history entries |
| app/create-workout.tsx | Update grip handling in workout steps |
| app/custom-workouts.tsx | Update grip display |
