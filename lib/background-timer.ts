// Foreground service native module is not registered — all functions are no-ops.
// Background timer relies on JS-only timer + expo-audio.

export function startBackgroundTimer(
  _phase: string,
  _timeRemaining: number,
  _color: string,
  _onPause: () => void
): void {
  // no-op: native TimerForegroundService not available
}

export function updateBackgroundNotification(
  _phase: string,
  _timeRemaining: number,
  _color: string,
  _isPaused: boolean
): void {
  // no-op: native TimerForegroundService not available
}

export function stopBackgroundTimer(): void {
  // no-op: native TimerForegroundService not available
}
