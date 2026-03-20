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
