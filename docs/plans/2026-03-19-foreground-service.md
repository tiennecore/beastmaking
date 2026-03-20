# Foreground Service Timer — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the silent audio background hack with a native Android Foreground Service that keeps the timer alive in background, shows a colored notification with Pause button, and plays beeps over user's music.

**Architecture:** Native Kotlin Foreground Service + React Native bridge module, registered manually in MainApplication. No Expo config plugin — direct native code since the project uses `expo prebuild` with a committed `android/` directory. SoundPool on STREAM_ALARM for beeps that overlay music.

**Tech Stack:** Kotlin, React Native NativeModules, Android ForegroundService, SoundPool, NotificationCompat

---

### Task 1: Create TimerForegroundService.kt

**Files:**
- Create: `android/app/src/main/java/com/tiennecore/beastmaking/TimerForegroundService.kt`

**Step 1: Write the service**

```kotlin
package com.tiennecore.beastmaking

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.media.AudioAttributes
import android.media.SoundPool
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat

class TimerForegroundService : Service() {

    companion object {
        const val CHANNEL_ID = "beastmaking_timer"
        const val NOTIFICATION_ID = 1001

        const val ACTION_UPDATE = "com.tiennecore.beastmaking.UPDATE"
        const val ACTION_STOP = "com.tiennecore.beastmaking.STOP"
        const val ACTION_PAUSE = "com.tiennecore.beastmaking.PAUSE"
        const val ACTION_PLAY_BEEP = "com.tiennecore.beastmaking.PLAY_BEEP"

        const val EXTRA_PHASE = "phase"
        const val EXTRA_TIME = "time"
        const val EXTRA_COLOR = "color"
        const val EXTRA_PAUSED = "paused"
        const val EXTRA_BEEP_TYPE = "beep_type"
    }

    private var soundPool: SoundPool? = null
    private var shortBeepId: Int = 0
    private var longBeepId: Int = 0

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        initSoundPool()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_STOP -> {
                stopForeground(STOP_FOREGROUND_REMOVE)
                stopSelf()
                return START_NOT_STICKY
            }
            ACTION_PAUSE -> {
                // Send event to JS via broadcast
                val broadcastIntent = Intent("com.tiennecore.beastmaking.PAUSE_PRESSED")
                sendBroadcast(broadcastIntent)
                return START_STICKY
            }
            ACTION_PLAY_BEEP -> {
                val type = intent.getStringExtra(EXTRA_BEEP_TYPE) ?: "short"
                playBeep(type)
                return START_STICKY
            }
            else -> {
                // Start or update
                val phase = intent?.getStringExtra(EXTRA_PHASE) ?: "Timer"
                val time = intent?.getStringExtra(EXTRA_TIME) ?: ""
                val color = intent?.getStringExtra(EXTRA_COLOR) ?: "#22C55E"
                val isPaused = intent?.getBooleanExtra(EXTRA_PAUSED, false) ?: false

                val notification = buildNotification(phase, time, color, isPaused)
                startForeground(NOTIFICATION_ID, notification)
                return START_STICKY
            }
        }
    }

    override fun onDestroy() {
        soundPool?.release()
        soundPool = null
        super.onDestroy()
    }

    private fun createNotificationChannel() {
        val channel = NotificationChannel(
            CHANNEL_ID,
            "Timer actif",
            NotificationManager.IMPORTANCE_LOW
        ).apply {
            description = "Notification du timer pendant l'entraînement"
            setShowBadge(false)
            enableVibration(false)
            setSound(null, null)
            lockscreenVisibility = Notification.VISIBILITY_PUBLIC
        }
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.createNotificationChannel(channel)
    }

    private fun buildNotification(
        phase: String,
        time: String,
        color: String,
        isPaused: Boolean
    ): Notification {
        // Intent to open app when tapping notification
        val openIntent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val openPending = PendingIntent.getActivity(
            this, 0, openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // Pause action button
        val pauseIntent = Intent(this, TimerForegroundService::class.java).apply {
            action = ACTION_PAUSE
        }
        val pausePending = PendingIntent.getService(
            this, 1, pauseIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val pauseLabel = if (isPaused) "▶ Reprendre" else "⏸ Pause"
        val title = if (isPaused) "⏸ En pause" else phase
        val parsedColor = try { Color.parseColor(color) } catch (_: Exception) { Color.GREEN }

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(time)
            .setSmallIcon(android.R.drawable.ic_media_play)
            .setColor(parsedColor)
            .setColorized(true)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setSilent(true)
            .setContentIntent(openPending)
            .addAction(0, pauseLabel, pausePending)
            .setCategory(NotificationCompat.CATEGORY_WORKOUT)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .build()
    }

    private fun initSoundPool() {
        val attrs = AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_ALARM)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build()

        soundPool = SoundPool.Builder()
            .setMaxStreams(3)
            .setAudioAttributes(attrs)
            .build()

        shortBeepId = soundPool!!.load(this, R.raw.beep_short, 1)
        longBeepId = soundPool!!.load(this, R.raw.beep_long, 1)
    }

    private fun playBeep(type: String) {
        val id = if (type == "long") longBeepId else shortBeepId
        soundPool?.play(id, 1.0f, 1.0f, 1, 0, 1.0f)
    }
}
```

**Step 2: Copy sound files to Android raw resources**

Run:
```bash
mkdir -p android/app/src/main/res/raw
cp assets/sounds/beep-short.mp3 android/app/src/main/res/raw/beep_short.mp3
cp assets/sounds/beep-long.mp3 android/app/src/main/res/raw/beep_long.mp3
```

---

### Task 2: Create TimerNativeModule.kt (React Native bridge)

**Files:**
- Create: `android/app/src/main/java/com/tiennecore/beastmaking/TimerNativeModule.kt`

**Step 1: Write the native module**

```kotlin
package com.tiennecore.beastmaking

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule

class TimerNativeModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "TimerNativeModule"

    private var pauseReceiver: BroadcastReceiver? = null

    override fun initialize() {
        super.initialize()
        pauseReceiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context?, intent: Intent?) {
                reactContext
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    .emit("TimerPausePressed", null)
            }
        }
        val filter = IntentFilter("com.tiennecore.beastmaking.PAUSE_PRESSED")
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            reactContext.registerReceiver(pauseReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            reactContext.registerReceiver(pauseReceiver, filter)
        }
    }

    override fun invalidate() {
        pauseReceiver?.let { reactContext.unregisterReceiver(it) }
        pauseReceiver = null
        super.invalidate()
    }

    @ReactMethod
    fun startService(phase: String, time: String, color: String) {
        val intent = Intent(reactContext, TimerForegroundService::class.java).apply {
            putExtra(TimerForegroundService.EXTRA_PHASE, phase)
            putExtra(TimerForegroundService.EXTRA_TIME, time)
            putExtra(TimerForegroundService.EXTRA_COLOR, color)
            putExtra(TimerForegroundService.EXTRA_PAUSED, false)
        }
        reactContext.startForegroundService(intent)
    }

    @ReactMethod
    fun updateNotification(phase: String, time: String, color: String, isPaused: Boolean) {
        val intent = Intent(reactContext, TimerForegroundService::class.java).apply {
            action = TimerForegroundService.ACTION_UPDATE
            putExtra(TimerForegroundService.EXTRA_PHASE, phase)
            putExtra(TimerForegroundService.EXTRA_TIME, time)
            putExtra(TimerForegroundService.EXTRA_COLOR, color)
            putExtra(TimerForegroundService.EXTRA_PAUSED, isPaused)
        }
        reactContext.startService(intent)
    }

    @ReactMethod
    fun stopService() {
        val intent = Intent(reactContext, TimerForegroundService::class.java).apply {
            action = TimerForegroundService.ACTION_STOP
        }
        reactContext.startService(intent)
    }

    @ReactMethod
    fun playBeep(type: String) {
        val intent = Intent(reactContext, TimerForegroundService::class.java).apply {
            action = TimerForegroundService.ACTION_PLAY_BEEP
            putExtra(TimerForegroundService.EXTRA_BEEP_TYPE, type)
        }
        reactContext.startService(intent)
    }

    @ReactMethod
    fun addListener(eventName: String) {
        // Required for RN NativeEventEmitter
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        // Required for RN NativeEventEmitter
    }
}
```

---

### Task 3: Create TimerPackage.kt and register in MainApplication

**Files:**
- Create: `android/app/src/main/java/com/tiennecore/beastmaking/TimerPackage.kt`
- Modify: `android/app/src/main/java/com/tiennecore/beastmaking/MainApplication.kt`

**Step 1: Write the package**

```kotlin
package com.tiennecore.beastmaking

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class TimerPackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return listOf(TimerNativeModule(reactContext))
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList()
    }
}
```

**Step 2: Register in MainApplication.kt**

In `MainApplication.kt`, inside `getPackages()`, add `TimerPackage()`:

```kotlin
override fun getPackages(): List<ReactPackage> =
    PackageList(this).packages.apply {
        add(TimerPackage())
    }
```

---

### Task 4: Update AndroidManifest.xml

**Files:**
- Modify: `android/app/src/main/AndroidManifest.xml`

**Step 1: Add permissions and service declaration**

Add permissions before `<application>`:
```xml
<uses-permission android:name="android.permission.FOREGROUND_SERVICE"/>
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK"/>
<uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>
```

Add service inside `<application>`, after the `<activity>` block:
```xml
<service
    android:name=".TimerForegroundService"
    android:foregroundServiceType="mediaPlayback"
    android:exported="false" />
```

---

### Task 5: Create JS bridge wrapper — `lib/foreground-service.ts`

**Files:**
- Create: `lib/foreground-service.ts`

**Step 1: Write the wrapper**

```typescript
import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

const { TimerNativeModule } = NativeModules;

const isAndroid = Platform.OS === 'android';
const emitter = isAndroid && TimerNativeModule
  ? new NativeEventEmitter(TimerNativeModule)
  : null;

function formatTimeForNotif(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const min = Math.floor(s / 60);
  const sec = s % 60;
  if (min === 0) return `${sec}s`;
  return `${min}:${String(sec).padStart(2, '0')}`;
}

export function startForegroundService(
  phase: string,
  timeRemaining: number,
  color: string
): void {
  if (!isAndroid || !TimerNativeModule) return;
  TimerNativeModule.startService(phase, formatTimeForNotif(timeRemaining), color);
}

export function updateForegroundNotification(
  phase: string,
  timeRemaining: number,
  color: string,
  isPaused: boolean
): void {
  if (!isAndroid || !TimerNativeModule) return;
  TimerNativeModule.updateNotification(
    phase,
    formatTimeForNotif(timeRemaining),
    color,
    isPaused
  );
}

export function stopForegroundService(): void {
  if (!isAndroid || !TimerNativeModule) return;
  TimerNativeModule.stopService();
}

export function playNativeBeep(type: 'short' | 'long'): void {
  if (!isAndroid || !TimerNativeModule) return;
  TimerNativeModule.playBeep(type);
}

export function onPausePressed(callback: () => void): () => void {
  if (!emitter) return () => {};
  const subscription = emitter.addListener('TimerPausePressed', callback);
  return () => subscription.remove();
}
```

---

### Task 6: Replace `lib/sounds.ts` to use native SoundPool

**Files:**
- Modify: `lib/sounds.ts`

**Step 1: Rewrite sounds.ts**

Replace the entire file:

```typescript
import { playNativeBeep } from '@/lib/foreground-service';

export function loadSounds() {
  // SoundPool is initialized natively when the foreground service starts.
  // No JS-side preloading needed.
}

export function playCountdown() {
  playNativeBeep('short');
}

export function playStart() {
  playCountdown();
  setTimeout(() => playCountdown(), 200);
  setTimeout(() => playCountdown(), 400);
}

export function playEnd() {
  playNativeBeep('long');
}

export function playSessionEnd() {
  playEnd();
  setTimeout(() => playEnd(), 400);
  setTimeout(() => playEnd(), 800);
}

export function unloadSounds() {
  // Cleanup handled natively when service stops.
}
```

**Important:** The SoundPool is initialized inside the ForegroundService. If sounds need to play while app is in foreground (before service starts), the service must be started at timer start — not only at background transition. Alternatively, keep expo-audio as fallback for foreground-only playback.

**Revised approach — hybrid sound:**
Sounds should work in both foreground and background. The simplest approach:
- Start the foreground service when the timer starts (not only on background)
- The service handles all beeps via SoundPool (works in both states)
- The notification is only shown when app is in background (use a flag)

Update the service to support a "silent" mode (no notification) for foreground usage:

Actually, simpler: start the service only when going to background. For foreground beeps, keep using expo-audio. When the app backgrounds, the service's SoundPool takes over.

**Final approach:**

```typescript
import { Platform, NativeModules } from 'react-native';
import { createAudioPlayer, AudioPlayer } from 'expo-audio';
import { playNativeBeep } from '@/lib/foreground-service';

let shortBeep: AudioPlayer | null = null;
let longBeep: AudioPlayer | null = null;
let useNativeSound = false;

export function setNativeSoundMode(enabled: boolean) {
  useNativeSound = enabled;
}

export function loadSounds() {
  shortBeep = createAudioPlayer(require('@/assets/sounds/beep-short.mp3'));
  longBeep = createAudioPlayer(require('@/assets/sounds/beep-long.mp3'));
}

export function playCountdown() {
  if (useNativeSound) {
    playNativeBeep('short');
    return;
  }
  if (!shortBeep) return;
  shortBeep.seekTo(0);
  shortBeep.play();
}

export function playStart() {
  playCountdown();
  setTimeout(() => playCountdown(), 200);
  setTimeout(() => playCountdown(), 400);
}

export function playEnd() {
  if (useNativeSound) {
    playNativeBeep('long');
    return;
  }
  if (!longBeep) return;
  longBeep.seekTo(0);
  longBeep.play();
}

export function playSessionEnd() {
  playEnd();
  setTimeout(() => playEnd(), 400);
  setTimeout(() => playEnd(), 800);
}

export function unloadSounds() {
  shortBeep?.remove();
  longBeep?.remove();
  shortBeep = null;
  longBeep = null;
}
```

---

### Task 7: Replace `lib/background-timer.ts`

**Files:**
- Modify: `lib/background-timer.ts`

**Step 1: Rewrite to use foreground service**

Replace the entire file:

```typescript
import {
  startForegroundService,
  updateForegroundNotification,
  stopForegroundService,
  onPausePressed,
} from '@/lib/foreground-service';
import { setNativeSoundMode } from '@/lib/sounds';

let pauseUnsubscribe: (() => void) | null = null;

export function startBackgroundTimer(
  phase: string,
  timeRemaining: number,
  color: string,
  onPause: () => void
): void {
  setNativeSoundMode(true);
  startForegroundService(phase, timeRemaining, color);
  pauseUnsubscribe = onPausePressed(onPause);
}

export function updateBackgroundNotification(
  phase: string,
  timeRemaining: number,
  color: string,
  isPaused: boolean
): void {
  updateForegroundNotification(phase, timeRemaining, color, isPaused);
}

export function stopBackgroundTimer(): void {
  setNativeSoundMode(false);
  stopForegroundService();
  if (pauseUnsubscribe) {
    pauseUnsubscribe();
    pauseUnsubscribe = null;
  }
}
```

---

### Task 8: Update `app/timer.tsx` to use new background API

**Files:**
- Modify: `app/timer.tsx`

**Step 1: Replace background timer imports and usage**

Replace imports:
```typescript
// OLD
import {
  startBackgroundKeepAlive,
  stopBackgroundKeepAlive,
  showTimerNotification,
  dismissTimerNotification,
} from '@/lib/background-timer';

// NEW
import {
  startBackgroundTimer,
  stopBackgroundTimer,
  updateBackgroundNotification,
} from '@/lib/background-timer';
```

**Step 2: Replace the isRunning background effect**

Remove the old effect that starts silence.wav:
```typescript
// REMOVE THIS:
useEffect(() => {
  if (isRunning) {
    startBackgroundKeepAlive();
  }
  return () => {
    stopBackgroundKeepAlive();
    dismissTimerNotification();
  };
}, [isRunning]);
```

No replacement needed — the service starts only on background transition (AppState).

**Step 3: Replace the notification update effect**

Remove the old notification effect:
```typescript
// REMOVE THIS:
useEffect(() => {
  if (!isRunning || !phase) return;
  const phaseName = isPaused
    ? `En pause — ${NOTIF_PHASE_NAMES[phase.type]}`
    : NOTIF_PHASE_NAMES[phase.type];
  // ...
  showTimerNotification(phaseName, phase.duration, detail);
}, [isRunning, isPaused, currentPhaseIndex]);
```

No replacement needed — the AppState handler updates the notification.

**Step 4: Rewrite the AppState effect**

```typescript
const isBackgroundRef = useRef(false);

useEffect(() => {
  const subscription = AppState.addEventListener('change', (nextState) => {
    if (nextState === 'background' || nextState === 'inactive') {
      isBackgroundRef.current = true;
      backgroundTimestampRef.current = Date.now();

      if (isRunning && phase) {
        const color = config?.phaseColors?.[phase.type] ?? PHASE_COLORS[phase.type];
        startBackgroundTimer(
          NOTIF_PHASE_NAMES[phase.type],
          timeRemaining,
          color,
          () => {
            // Pause toggle from notification
            const store = useTimerStore.getState();
            if (store.isPaused) store.resume();
            else store.pause();
          }
        );
      }
    } else if (nextState === 'active') {
      isBackgroundRef.current = false;
      stopBackgroundTimer();

      if (backgroundTimestampRef.current) {
        const elapsed = (Date.now() - backgroundTimestampRef.current) / 1000;
        backgroundTimestampRef.current = null;
        if (elapsed > 2) {
          fastForward(elapsed);
          startTicking();
        }
      }
    }
  });
  return () => subscription.remove();
}, [isRunning, isPaused, phase, timeRemaining, config, fastForward, startTicking]);
```

**Step 5: Add a tick effect that updates the notification when in background**

```typescript
useEffect(() => {
  if (!isBackgroundRef.current || !isRunning || !phase) return;
  const color = config?.phaseColors?.[phase.type] ?? PHASE_COLORS[phase.type];
  updateBackgroundNotification(
    NOTIF_PHASE_NAMES[phase.type],
    timeRemaining,
    color,
    isPaused
  );
}, [timeRemaining, currentPhaseIndex, isPaused]);
```

**Step 6: Update handleStopSave and handleStopAbandon**

Replace `dismissTimerNotification()` and `stopBackgroundKeepAlive()` calls:

```typescript
const handleStopSave = useCallback(() => {
  setShowStopModal(false);
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  stopBackgroundTimer();
  stopTimer();
  router.replace('/recap');
}, [stopTimer, router]);

const handleStopAbandon = useCallback(() => {
  setShowStopModal(false);
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  stopBackgroundTimer();
  stopTimer();
  router.replace('/');
}, [stopTimer, router]);
```

---

### Task 9: Update `app/_layout.tsx`

**Files:**
- Modify: `app/_layout.tsx`

**Step 1: Remove old background-timer import**

```typescript
// REMOVE:
import { setupNotificationChannel } from '@/lib/background-timer';

// REMOVE from useEffect:
setupNotificationChannel();
```

The notification channel is now created natively in `TimerForegroundService.onCreate()`.

Keep `loadSounds()` and `unloadSounds()` — they still handle expo-audio for foreground beeps.

---

### Task 10: Clean up and verify

**Step 1: Delete silence.wav**

```bash
rm assets/sounds/silence.wav
```

**Step 2: Remove expo-audio background playback config from app.json**

Change `app.json` plugins:
```json
"plugins": [
  "expo-router",
  "expo-audio",
  "expo-notifications"
]
```

Remove the `enableBackgroundPlayback` option since we no longer need background audio.

**Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

**Step 4: Rebuild Android**

```bash
npx expo prebuild --platform android --clean
eas build --platform android --profile development
```

Note: After `prebuild --clean`, the custom Kotlin files and manifest changes will be wiped. The native files must either:
- Be placed outside the prebuild path and copied via a config plugin, OR
- Be committed and the `--clean` flag avoided

**Recommended: skip `--clean` and commit the android/ changes directly** since the project already has a committed android/ directory that was generated via prebuild.

```bash
eas build --platform android --profile development --local
```

---

### Task dependency order

```
Task 1 (Service) ──┐
Task 2 (Bridge)  ──┤
Task 3 (Package) ──┼── Can be done in parallel (all native Kotlin)
Task 4 (Manifest)──┘
                   │
Task 5 (JS bridge) ── depends on Tasks 1-4 (needs to know the API)
                   │
Task 6 (sounds.ts) ── depends on Task 5
Task 7 (background-timer.ts) ── depends on Task 5
                   │
Task 8 (timer.tsx) ── depends on Tasks 6 + 7
Task 9 (_layout.tsx) ── depends on Task 7
                   │
Task 10 (cleanup + build) ── depends on all above
```

**Parallel batches:**
- Batch 1: Tasks 1, 2, 3, 4 (all native, independent)
- Batch 2: Task 5 (JS bridge)
- Batch 3: Tasks 6, 7 (both depend on Task 5, independent of each other)
- Batch 4: Tasks 8, 9 (both depend on batch 3, independent of each other)
- Batch 5: Task 10 (final cleanup + build)
