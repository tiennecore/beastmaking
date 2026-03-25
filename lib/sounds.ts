import { Alert } from 'react-native';
import { createAudioPlayer, setAudioModeAsync, AudioPlayer } from 'expo-audio';
import { Asset } from 'expo-asset';

let shortBeep: AudioPlayer | null = null;
let longBeep: AudioPlayer | null = null;
let shortBeepReady = false;
let longBeepReady = false;
let playCount = 0;
let resolvedShortUri: string | null = null;
let resolvedLongUri: string | null = null;

// Native sound mode is disabled — foreground service native module not registered
export function setNativeSoundMode(_enabled: boolean) {
  // no-op: native TimerNativeModule is not registered, use expo-audio only
}

export async function loadSounds() {
  console.warn('[sounds] loadSounds() called');
  try {
    await setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false });
    console.warn('[sounds] setAudioModeAsync OK');
  } catch (e) {
    console.warn('[sounds] setAudioModeAsync ERROR:', e);
  }

  // Resolve assets via expo-asset to get reliable local URIs in production builds
  try {
    const shortAsset = Asset.fromModule(require('@/assets/sounds/beep-short.mp3'));
    await shortAsset.downloadAsync();
    resolvedShortUri = shortAsset.localUri;
    console.warn('[sounds] shortAsset resolved — localUri:', resolvedShortUri);
  } catch (e) {
    console.warn('[sounds] shortAsset resolve ERROR:', e);
  }

  try {
    const longAsset = Asset.fromModule(require('@/assets/sounds/beep-long.mp3'));
    await longAsset.downloadAsync();
    resolvedLongUri = longAsset.localUri;
    console.warn('[sounds] longAsset resolved — localUri:', resolvedLongUri);
  } catch (e) {
    console.warn('[sounds] longAsset resolve ERROR:', e);
  }

  try {
    if (!resolvedShortUri) throw new Error('shortAsset localUri is null');
    shortBeep = createAudioPlayer({ uri: resolvedShortUri });
    console.warn('[sounds] shortBeep created, isLoaded:', shortBeep.isLoaded);
  } catch (e) {
    console.warn('[sounds] createAudioPlayer(shortBeep) ERROR:', e);
  }

  try {
    if (!resolvedLongUri) throw new Error('longAsset localUri is null');
    longBeep = createAudioPlayer({ uri: resolvedLongUri });
    console.warn('[sounds] longBeep created, isLoaded:', longBeep.isLoaded);
  } catch (e) {
    console.warn('[sounds] createAudioPlayer(longBeep) ERROR:', e);
  }

  if (shortBeep) {
    try {
      await shortBeep.seekTo(0);
      shortBeepReady = true;
      console.warn('[sounds] shortBeep seekTo(0) OK, isLoaded:', shortBeep.isLoaded);
    } catch (e) {
      console.warn('[sounds] shortBeep seekTo(0) FAILED:', e);
    }
  }

  if (longBeep) {
    try {
      await longBeep.seekTo(0);
      longBeepReady = true;
      console.warn('[sounds] longBeep seekTo(0) OK, isLoaded:', longBeep.isLoaded);
    } catch (e) {
      console.warn('[sounds] longBeep seekTo(0) FAILED:', e);
    }
  }

  // Set volume explicitly
  if (shortBeep) shortBeep.volume = 1.0;
  if (longBeep) longBeep.volume = 1.0;

  console.warn('[sounds] loadSounds() done — shortBeepReady:', shortBeepReady, 'longBeepReady:', longBeepReady);
  Alert.alert(
    'Sound Debug',
    `shortBeep: ${shortBeepReady}, longBeep: ${longBeepReady}\nisLoaded: ${shortBeep?.isLoaded}/${longBeep?.isLoaded}\nvolume: ${shortBeep?.volume}\nshortURI: ${resolvedShortUri}\nlongURI: ${resolvedLongUri}`,
    [
      { text: 'Test Sound', onPress: () => {
        if (shortBeep) {
          shortBeep.play();
          Alert.alert('Test', `playing: ${shortBeep.playing}`);
        }
      }},
      { text: 'OK' },
    ],
  );
}

async function replayPlayer(player: AudioPlayer, name: string) {
  console.warn(`[sounds] replayPlayer(${name}) called — playing:`, player.playing, 'isLoaded:', player.isLoaded, 'currentTime:', player.currentTime);
  try {
    await player.seekTo(0);
    console.warn(`[sounds] replayPlayer(${name}) seekTo(0) OK`);
    player.play();
    console.warn(`[sounds] replayPlayer(${name}) play() called`);
  } catch (e) {
    console.warn(`[sounds] replayPlayer(${name}) ERROR:`, e);
  }
}

export function playCountdown() {
  playCount++;
  if (playCount === 1) Alert.alert('Play Debug', `shortBeep exists: ${!!shortBeep}, ready: ${shortBeepReady}, isLoaded: ${shortBeep?.isLoaded}`);
  console.warn('[sounds] playCountdown() called — shortBeep exists:', !!shortBeep, 'shortBeepReady:', shortBeepReady);
  if (!shortBeep || !shortBeepReady) return;
  replayPlayer(shortBeep, 'shortBeep');
}

export function playStart() {
  playCountdown();
  setTimeout(() => playCountdown(), 200);
  setTimeout(() => playCountdown(), 400);
}

export function playEnd() {
  console.warn('[sounds] playEnd() called — longBeep exists:', !!longBeep, 'longBeepReady:', longBeepReady);
  if (!longBeep || !longBeepReady) return;
  replayPlayer(longBeep, 'longBeep');
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
  shortBeepReady = false;
  longBeepReady = false;
}
