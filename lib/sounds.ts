import { createAudioPlayer, AudioPlayer } from 'expo-audio';

let shortBeep: AudioPlayer | null = null;
let longBeep: AudioPlayer | null = null;

export function loadSounds() {
  shortBeep = createAudioPlayer(require('@/assets/sounds/beep-short.mp3'));
  longBeep = createAudioPlayer(require('@/assets/sounds/beep-long.mp3'));
}

export function playCountdown() {
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
