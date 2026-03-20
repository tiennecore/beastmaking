# Design — Foreground Service Timer (Android)

## Problème

L'app joue actuellement `silence.wav` en boucle à volume 0 pour maintenir le thread JS actif en arrière-plan. Cette approche bloque la musique de l'utilisateur pendant toute la séance. Il faut un Android Foreground Service natif qui maintient le processus en vie sans interférer avec l'audio.

## Solution

Un **Expo Config Plugin** qui injecte un `ForegroundService` Kotlin natif dans le build Android. Le JS continue de piloter le timer (store Zustand), le natif se charge uniquement de maintenir le processus en vie et d'afficher la notification.

---

## Architecture

### Vue d'ensemble

```
App foreground:  Timer JS (Zustand) → tick toutes les secondes → UI + sons
App background:  ForegroundService démarre → processus reste actif → timer JS continue → notification mise à jour + beeps
App returns:     ForegroundService s'arrête → notification disparaît
```

### Séparation des responsabilités

| Couche | Rôle |
|--------|------|
| JS (Zustand) | State machine du timer — inchangée |
| JS bridge (`lib/foreground-service.ts`) | Passerelle entre JS et le service natif |
| Kotlin (`TimerNativeModule.kt`) | Bridge React Native, expose les `@ReactMethod` |
| Kotlin (`TimerForegroundService.kt`) | Service Android, notification sticky, SoundPool |
| Expo Plugin (`plugins/withForegroundService.ts`) | Injection dans le build (AndroidManifest, fichiers Kotlin) |

---

## Composants

### 1. Service Kotlin natif — `TimerForegroundService.kt`

Service Android qui appelle `startForeground()` avec une notification sticky.

**Responsabilités :**
- Créer un canal de notification dédié (importance LOW — aucun son système)
- Afficher une notification contenant : icône de phase, nom de phase, temps restant, couleur (depuis `phaseColors` de l'utilisateur), bouton Pause
- Recevoir les mises à jour depuis JS via `@ReactMethod` (phase, temps restant, couleur, état pausé)
- Écouter le bouton Pause et renvoyer l'événement vers JS via `DeviceEventEmitter`
- Se terminer proprement à la demande de JS ou en fin de timer

**Canal de notification :**
- ID : `beastmaking_timer`
- Importance : `NotificationManager.IMPORTANCE_LOW`
- Pas de vibration, pas de son système

### 2. Bridge React Native — `TimerNativeModule.kt`

Module React Native qui expose les méthodes appelables depuis JS.

**Méthodes exposées (`@ReactMethod`) :**
- `startService(phase: String, timeRemaining: Int, color: String)` — démarre le foreground service
- `updateNotification(phase: String, timeRemaining: Int, color: String, isPaused: Boolean)` — met à jour le contenu de la notification
- `stopService()` — arrête le service et ferme la notification
- `playBeep(type: String)` — joue un son via SoundPool (`"short"` ou `"long"`)

**Événements émis vers JS (`DeviceEventEmitter`) :**
- `TimerPausePressed` — déclenché quand l'utilisateur appuie sur Pause dans la notification

### 3. Package de registration — `TimerPackage.kt`

Classe standard `ReactPackage` qui enregistre `TimerNativeModule` dans l'infrastructure React Native.

### 4. Sons natifs — SoundPool (dans `TimerForegroundService.kt`)

Remplace `expo-audio` pour les beeps pendant la séance.

**Pourquoi SoundPool :**
- Joue sur `STREAM_ALARM` ou `STREAM_NOTIFICATION` → s'superpose à la musique de l'utilisateur au lieu de la couper
- Préchargé au démarrage du service → latence quasi nulle
- Aucune dépendance npm supplémentaire

**Sons :**
- `beep_short.wav` — countdown (3, 2, 1)
- `beep_long.wav` — fin de phase

**Appel depuis JS :** `NativeModules.TimerNativeModule.playBeep('short')`

### 5. Expo Config Plugin — `plugins/withForegroundService.ts`

Plugin exécuté pendant `eas build` (prebuild) qui :
- Ajoute les permissions dans `AndroidManifest.xml` :
  - `FOREGROUND_SERVICE`
  - `FOREGROUND_SERVICE_MEDIA_PLAYBACK`
- Enregistre le service dans `AndroidManifest.xml` :
  ```xml
  <service
    android:name=".TimerForegroundService"
    android:foregroundServiceType="mediaPlayback"
    android:exported="false" />
  ```
- Copie les fichiers Kotlin dans `android/app/src/main/java/com/tiennecore/beastmaking/`

### 6. Bridge JS — `lib/foreground-service.ts`

Wrapper TypeScript qui encapsule les appels natifs et gère la disponibilité de la plateforme.

```typescript
// API publique
startService(phase: string, timeRemaining: number, color: string): void
updateNotification(phase: string, timeRemaining: number, color: string, isPaused: boolean): void
stopService(): void
playBeep(type: 'short' | 'long'): void
onPausePressed(callback: () => void): () => void  // retourne un unsubscribe
```

Comportement : no-op sur iOS (platform guard), log warning si le module natif n'est pas disponible.

---

## Couleurs de notification

Les couleurs proviennent des `phaseColors` configurés par l'utilisateur dans la config timer. JS passe la couleur de la phase courante au service natif à chaque mise à jour :

```typescript
updateNotification(
  phaseName,
  timeRemaining,
  phaseColors[currentPhase.type],  // ex: '#FF6B35' pour HANG
  isPaused
)
```

---

## Comportement de la notification

| Condition | Comportement |
|-----------|--------------|
| App en foreground | Pas de notification |
| App en background | Notification sticky apparaît |
| Retour au foreground | Notification disparaît |
| Timer terminé | Service et notification s'arrêtent |
| Swipe sur la notification | Impossible (sticky) |
| Tap sur la notification | Ouvre l'app sur l'écran timer |
| Bouton Pause pressé | Événement envoyé à JS → toggle pause dans Zustand |

---

## Modifications du code existant

### `lib/background-timer.ts`
- Supprimer la logique silence.wav (lecture audio en boucle + gestion du playback)
- Remplacer par des appels à `lib/foreground-service.ts` : `startService()`, `updateNotification()`, `stopService()`
- Conserver `fastForward()` comme fallback de sécurité au retour en foreground

### `app/timer.tsx`
- L'écouteur `AppState` existant déclenche `startService()` au passage en background et `stopService()` au retour en foreground
- Abonnement à `onPausePressed` pour propager le pause depuis la notification vers le store Zustand

### `lib/sounds.ts`
- Remplacer les appels `expo-audio` par `NativeModules.TimerNativeModule.playBeep('short' | 'long')`
- Supprimer la gestion de l'instance audio

### `app/_layout.tsx`
- Supprimer l'initialisation de silence.wav si présente

### `app.json`
- Ajouter le plugin : `["./plugins/withForegroundService"]`

### Asset supprimé
- `assets/silence.wav` — supprimé

---

## Fichiers à créer

| Fichier | Description |
|---------|-------------|
| `plugins/withForegroundService.ts` | Expo Config Plugin |
| `android/app/src/main/java/com/tiennecore/beastmaking/TimerForegroundService.kt` | Service Android |
| `android/app/src/main/java/com/tiennecore/beastmaking/TimerNativeModule.kt` | Bridge React Native |
| `android/app/src/main/java/com/tiennecore/beastmaking/TimerPackage.kt` | Package de registration |
| `lib/foreground-service.ts` | Wrapper JS |

## Fichiers à modifier

| Fichier | Changement |
|---------|-----------|
| `app.json` | Ajout du plugin |
| `lib/background-timer.ts` | Remplacement silence.wav → foreground service |
| `app/timer.tsx` | AppState listener + écoute Pause notification |
| `lib/sounds.ts` | Remplacement expo-audio → SoundPool natif |
| `app/_layout.tsx` | Suppression init silence.wav |

---

## Ce qui ne change pas

- Timer engine (state machine Zustand — identique)
- `useKeepAwake()` en foreground
- `expo-haptics` pour le retour haptique
- `fastForward()` comme fallback de sécurité au retour en foreground
- Toute la logique de configuration du timer (TimerConfig, phaseColors, etc.)

---

## Dépendances

- Aucun nouveau package npm
- Code Kotlin natif ajouté via le Config Plugin
- Nécessite un EAS Build (pas Expo Go) — déjà le cas pour ce projet

---

## Contraintes et risques

| Risque | Mitigation |
|--------|-----------|
| Le service est tué par Android (Doze mode) | `foregroundServiceType="mediaPlayback"` protège contre Doze |
| Latence des beeps SoundPool | Préchargement au démarrage du service (avant le premier beep) |
| Notification qui persiste après crash | `stopForeground()` appelé dans `onDestroy()` du service |
| Module natif absent (Expo Go, CI) | Platform guard + no-op dans `lib/foreground-service.ts` |
| iOS ne supporte pas les Foreground Services Android | Platform guard, code iOS inchangé |
