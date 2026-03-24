import { createAudioPlayer, setAudioModeAsync, AudioPlayer } from 'expo-audio';

const SHORT_BEEP_SOURCE = require('@/assets/sounds/beep-short.mp3') as number;
const LONG_BEEP_SOURCE = require('@/assets/sounds/beep-long.mp3') as number;

let shortBeep: AudioPlayer | null = null;
let longBeep: AudioPlayer | null = null;

// Native sound mode is disabled — foreground service native module not registered
export function setNativeSoundMode(_enabled: boolean) {
  // no-op: native TimerNativeModule is not registered, use expo-audio only
}

export async function loadSounds() {
  await setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false });
  shortBeep = createAudioPlayer(SHORT_BEEP_SOURCE);
  longBeep = createAudioPlayer(LONG_BEEP_SOURCE);
}

function replayPlayer(player: AudioPlayer) {
  player.seekTo(0).then(() => player.play());
}

export function playCountdown() {
  if (!shortBeep) return;
  replayPlayer(shortBeep);
}

export function playStart() {
  playCountdown();
  setTimeout(() => playCountdown(), 200);
  setTimeout(() => playCountdown(), 400);
}

export function playEnd() {
  if (!longBeep) return;
  replayPlayer(longBeep);
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
