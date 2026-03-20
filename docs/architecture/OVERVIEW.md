# Beastmaking — Architecture Overview

## Stack

| Couche | Technologie |
|--------|-------------|
| Framework | React Native 0.81 + Expo SDK 55 |
| Langage | TypeScript |
| Styling | NativeWind v4 (Tailwind CSS pour RN) |
| State global | Zustand |
| Navigation | Expo Router (Stack, slide_from_right) |
| Persistence | AsyncStorage via `lib/storage.ts` |
| Audio | expo-audio (foreground) + SoundPool natif Android (background) |
| Animations | React Native Reanimated / Moti |
| Gestes | react-native-gesture-handler + @gorhom/bottom-sheet |
| Build / OTA | EAS Build + EAS Update |
| Tests | Vitest + ts-jest |

Cible : Android uniquement (MVP). iOS non testé.

---

## Structure des dossiers

```
app/                        # Ecrans (Expo Router file-based routing)
  index.tsx                 # Menu principal
  protocols.tsx             # Liste des protocoles hangboard
  protocol/[id].tsx         # Configuration d'un protocole
  timer.tsx                 # Timer plein ecran
  recap.tsx                 # Recap de seance (auto-save + actions)
  create-workout.tsx        # Creation / edition d'entrainement personnalise
  custom-workouts.tsx       # Liste des entrainements personnalises
  journal.tsx               # Suivi (ex-Journal) — dashboard stats + calendrier custom + liste
  journal/[id].tsx          # Detail / edition d'une entree de journal
  library.tsx               # Bibliotheque (grips, principes, systemes energetiques)
  plans.tsx                 # Plans d'entrainement
  plan/[id].tsx             # Detail d'un plan
  settings.tsx              # Parametres utilisateur
  _layout.tsx               # Root layout (Stack + GestureHandlerRootView)

components/
  ProtocolCard.tsx          # Carte de protocole
  TimerConfigForm.tsx       # Formulaire de configuration du timer
  SegmentedControl.tsx      # Toggle générique typé (remplace 3 implémentations ad hoc)
  GripConfigSection.tsx     # Section de configuration des prises (angle + type)
  InfoButton.tsx            # Bouton d'information contextuel
  journal/                  # Composants du journal
    CalendarView.tsx        # Vue calendrier custom (Pan gesture + Reanimated, heatmap + dots colorés)
    GradeStepper.tsx        # Stepper de cotation
    ClimbEntryCard.tsx      # Carte d'une voie / bloc
    LocationInput.tsx       # Input lieu avec autocomplete
    DifficultyBadge.tsx     # Badge de difficulte
    NativeDatePicker.tsx    # Wrapper date picker natif
  library/                  # Sections de la bibliotheque

hooks/
  useJournalEntries.ts      # Donnees unifiees journal (hangboard + escalade)

lib/
  timer-engine.ts           # Machine a etats du timer
  sounds.ts                 # Gestion audio hybride (expo-audio / SoundPool selon AppState)
  storage.ts                # CRUD AsyncStorage (historique, escalade, workouts, settings)
  theme.ts                  # useThemeColors() — tokens light / dark
  background-timer.ts       # Timer de fond (délègue au foreground service natif Android)
  foreground-service.ts     # Wrapper TypeScript du service natif (platform guard iOS/Android)
  plan-generator.ts         # Generation de plans d'entrainement

android/app/src/main/java/.../
  TimerForegroundService.kt # Android Service : notification sticky + SoundPool STREAM_ALARM
  TimerNativeModule.kt      # Bridge RN : startService / updateNotification / stopService / playBeep
  TimerPackage.kt           # Enregistrement du package RN

constants/
  protocols.ts              # 9 protocoles Beastmaking (statiques)
  grips.ts                  # 9 types de prehension + ANGLES + formatGripConfig()
  grades.ts                 # Cotations 4a → 9c+, DEFAULT_GRADE, helpers
  climbing.ts               # Constantes et helpers pour l'escalade
  plans.ts                  # Templates de plans

stores/
  timer-store.ts            # Zustand store du timer (pause, skip, background sync)

types/
  index.ts                  # Tous les types TypeScript du projet
```

---

## Ecrans et navigation

```
index (home)
  ├── /protocols → protocol/[id] → /timer → /recap
  ├── /custom-workouts → create-workout
  ├── /journal → journal/[id]   (label affiché : "Suivi")
  ├── /plans → plan/[id]
  ├── /library
  └── /settings
```

La navigation est gérée par Expo Router. Toutes les transitions sont `slide_from_right` (configuré dans `_layout.tsx`). Le `_layout.tsx` est enveloppé dans `GestureHandlerRootView` (requis par `@gorhom/bottom-sheet`).

---

## Persistence (AsyncStorage)

Toutes les clés sont préfixées `beastmaking:` et gérées via `lib/storage.ts`.

| Clé | Type | Contenu |
|-----|------|---------|
| `beastmaking:history` | `SessionHistoryEntry[]` | Seances hangboard |
| `beastmaking:climbing-sessions` | `ClimbingSession[]` | Seances escalade |
| `beastmaking:custom-workouts` | `CustomWorkout[]` | Entrainements personnalises |
| `beastmaking:settings` | `AppSettings` | Parametres utilisateur |

Pas de migration de schema — les deux stores hangboard et escalade restent séparés et sont fusionnés à l'affichage.

---

## Modules clés

### Timer Engine (`lib/timer-engine.ts`)

Machine à états séquentielle :

```
PREP → HANG → REST_REP → HANG → ... → REST_SET → ... → REST_ROUND → ... → DONE
```

- `prepDuration` configurable (plus de 5 s codé en dur)
- Sons : beep court (countdown), beep long (fin de phase)
- Tests unitaires : 7 cas via Vitest + ts-jest

### Foreground Service Android (module natif)

Le timer en arrière-plan repose sur un **Android Foreground Service natif** (`TimerForegroundService.kt`) enregistré dans `MainApplication.kt` via `TimerPackage.kt`.

**Flux :**
1. `app/timer.tsx` écoute `AppState` — quand l'app passe en arrière-plan, il appelle `foreground-service.ts`
2. `lib/foreground-service.ts` expose `startForegroundService` / `stopForegroundService` avec un guard `Platform.OS === 'android'`
3. `lib/background-timer.ts` délègue à `foreground-service.ts` (plus d'audio silencieux)
4. Le service natif affiche une notification sticky mise à jour chaque seconde avec phase et temps restant. La couleur de fond reflète la `phaseColors` de la config utilisateur.
5. À la remise en premier plan, le service est arrêté et les sons repassent par `expo-audio`

**Audio en arrière-plan :**
`lib/sounds.ts` opère en mode hybride :
- Foreground : `expo-audio` (qualité supérieure, pas de contrainte de stream)
- Background (service actif) : `SoundPool` natif sur `STREAM_ALARM` — les beeps passent par-dessus la musique de l'utilisateur et sont audibles même en mode silencieux

**Permissions requises (`AndroidManifest.xml`) :**
- `FOREGROUND_SERVICE`
- `POST_NOTIFICATIONS`

> `silence.wav` supprimé. `enableBackgroundPlayback` retiré de `app.json`.

### Background Timer (`lib/background-timer.ts`)

Orchestre le timer en arrière-plan :
- Délègue le maintien de process au foreground service natif
- `AppState` listener + `fastForward()` comme fallback si le service est indisponible
- Nécessite un dev build EAS (pas compatible Expo Go)

### Theme (`lib/theme.ts`)

Hook `useThemeColors()` qui retourne les tokens de couleur selon le thème actif (light / dark). Utilisé dans tous les écrans à la place de classes NativeWind dynamiques.

Design system : palette Granite & Chalk.

### Suivi / Journal (`app/journal.tsx` + `hooks/useJournalEntries.ts`)

Écran renommé "Suivi" (route `/journal` inchangée). Comprend :
- Dashboard de stats en haut : sessions/semaine avec tendance, 3 compteurs d'activité, temps de suspension, taux de réussite, grade moyen
- Calendrier swipeable custom — `Pan` gesture-handler + `Reanimated` fade entre mois, cellules heatmap par intensité, dots colorés par type d'activité. Remplace `react-native-calendars` (dépendance supprimée).
- Bascule calendrier ↔ liste par swipe horizontal (`GestureDetector` + `Gesture.Pan`)
- Liste des entrées sous le calendrier (durées arrondie, libellés bloc/voie corrigés, entrées "0 voie" masquées)
- Titres de header centrés sur Android

Voir [deep-dive Journal](deep-dives/journal.md).

### Statistics Calendar (`components/statistics/StatsCalendar.tsx`)

Le calendrier en mode "Trimestre" calcule dynamiquement la taille de chaque cellule via un `onLayout` sur le conteneur, au lieu d'une valeur fixe de 14 px. Cela garantit un rendu correct sur toutes les tailles d'écran Android.

### EAS Build

Le projet est configuré pour EAS Build avec deux profils :
- `preview` — APK pour tests internes (Android)
- `production` — AAB pour le Play Store

Projet lié à Expo : `@tiennecore/beastmaking-timer`.

React a été mis à jour en 19.2.4 pour la compatibilité des peer dependencies.

### SegmentedControl (`components/SegmentedControl.tsx`)

Composant toggle générique typé remplaçant 3 implémentations ad hoc présentes dans `create-workout`, `journal` et `settings`. Accepte un tableau d'options et une valeur active via props.

### Écrans — changements notables

| Écran | Changements |
|-------|-------------|
| `protocol/[id].tsx` | Bouton "Démarrer" sticky en bas, description et conseils de progression en accordéon, section "Options avancées" (grip config) masquée par défaut avec séparateur animé, color picker extrait sous la grille avec animation |
| `create-workout.tsx` | Bouton "Sauvegarder" sticky, étapes en accordéon, sélecteur de protocole en modal, `DurationRow` pour les temps de repos avec pas adaptatif, validation inline, confirmation de suppression, réorganisation en mode libre |
| `library.tsx` | Navigation en pill sticky avec suivi de section active au scroll, animations d'entrée en stagger, contraste et taille de texte améliorés |

---

## Conventions de code

- **Styling** : NativeWind (`className` prop), jamais `StyleSheet.create`
- **Composants interactifs** : `Pressable` avec `scale: pressed ? 0.97 : 1`
- **Haptics** : `Haptics.impactAsync(Light)` sur les interactions, `Medium` sur les actions importantes
- **Touch targets** : minimum 44 × 44 pt, 60 × 60 pt pendant les séances
- **Imports** : alias `@/` via `tsconfig` paths
- **Commits** : Conventional Commits en anglais
- **Border-radius** : `rounded-xl` standardisé sur tous les boutons stepper
- **Espacement bas** : `h-20` sur tous les `ScrollView` pour le safe area
- **Couleurs** : tokens theme (`useThemeColors`) — plus de valeurs hex codées en dur
- **Barre sticky** : bordures visibles en mode light (pas seulement en dark)
