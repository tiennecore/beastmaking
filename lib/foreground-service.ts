import { Platform } from 'react-native';

const isAndroid = Platform.OS === 'android';

let TimerNativeModule: {
  startService: (phase: string, time: string, color: string) => void;
  updateNotification: (phase: string, time: string, color: string, isPaused: boolean) => void;
  stopService: () => void;
  playBeep: (type: string) => void;
} | null = null;

let emitter: { addListener: (event: string, callback: () => void) => { remove: () => void } } | null = null;

if (isAndroid) {
  try {
    const { requireNativeModule } = require('expo-modules-core') as {
      requireNativeModule: (name: string) => typeof TimerNativeModule;
    };
    TimerNativeModule = requireNativeModule('TimerNativeModule');
    const { EventEmitter } = require('expo-modules-core') as {
      EventEmitter: new (module: typeof TimerNativeModule) => typeof emitter;
    };
    emitter = new EventEmitter(TimerNativeModule);
  } catch (_) {
    // Module unavailable in Expo Go or iOS
  }
}

function formatTime(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const min = Math.floor(s / 60);
  const sec = s % 60;
  if (min === 0) return `${sec}s`;
  return `${min}:${String(sec).padStart(2, '0')}`;
}

export function startForegroundService(phase: string, timeRemaining: number, color: string): void {
  if (!TimerNativeModule) return;
  TimerNativeModule.startService(phase, formatTime(timeRemaining), color);
}

export function updateForegroundNotification(
  phase: string,
  timeRemaining: number,
  color: string,
  isPaused: boolean
): void {
  if (!TimerNativeModule) return;
  TimerNativeModule.updateNotification(phase, formatTime(timeRemaining), color, isPaused);
}

export function stopForegroundService(): void {
  if (!TimerNativeModule) return;
  TimerNativeModule.stopService();
}

export function playNativeBeep(type: 'short' | 'long'): void {
  if (!TimerNativeModule) return;
  TimerNativeModule.playBeep(type);
}

export function onPausePressed(callback: () => void): () => void {
  if (!emitter) return () => {};
  const subscription = emitter.addListener('TimerPausePressed', callback);
  return () => subscription.remove();
}
