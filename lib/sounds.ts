import { Alert } from 'react-native';
import { Audio } from 'expo-av';

let shortBeep: Audio.Sound | null = null;
let longBeep: Audio.Sound | null = null;
let soundsLoaded = false;
let playCount = 0;

export function setNativeSoundMode(_enabled: boolean) {
  // no-op
}

export async function loadSounds() {
  console.warn('[sounds] loadSounds() called');
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: false,
    });
    console.warn('[sounds] setAudioModeAsync OK');
  } catch (e) {
    console.warn('[sounds] setAudioModeAsync ERROR:', e);
  }

  try {
    const { sound: short } = await Audio.Sound.createAsync(
      require('@/assets/sounds/beep-short.mp3'),
      { volume: 1.0 }
    );
    shortBeep = short;
    console.warn('[sounds] shortBeep loaded OK');
  } catch (e) {
    console.warn('[sounds] shortBeep load ERROR:', e);
  }

  try {
    const { sound: long } = await Audio.Sound.createAsync(
      require('@/assets/sounds/beep-long.mp3'),
      { volume: 1.0 }
    );
    longBeep = long;
    console.warn('[sounds] longBeep loaded OK');
  } catch (e) {
    console.warn('[sounds] longBeep load ERROR:', e);
  }

  soundsLoaded = !!(shortBeep && longBeep);
  console.warn('[sounds] loadSounds() done — loaded:', soundsLoaded);

  Alert.alert(
    'Sound Debug',
    `loaded: ${soundsLoaded}\nshortBeep: ${!!shortBeep}\nlongBeep: ${!!longBeep}`,
    [
      {
        text: 'Test Sound',
        onPress: async () => {
          try {
            if (shortBeep) {
              await shortBeep.setPositionAsync(0);
              await shortBeep.playAsync();
              const status = await shortBeep.getStatusAsync();
              Alert.alert(
                'Test',
                `isPlaying: ${status.isLoaded && status.isPlaying}, volume: ${status.isLoaded ? status.volume : 'N/A'}`
              );
            } else {
              Alert.alert('Test', 'shortBeep is null!');
            }
          } catch (e) {
            Alert.alert('Test ERROR', String(e));
          }
        },
      },
      { text: 'OK' },
    ]
  );
}

async function replaySound(sound: Audio.Sound, name: string) {
  try {
    await sound.setPositionAsync(0);
    await sound.playAsync();
    console.warn(`[sounds] ${name} played`);
  } catch (e) {
    console.warn(`[sounds] ${name} play ERROR:`, e);
  }
}

export function playCountdown() {
  playCount++;
  if (playCount === 1) {
    Alert.alert('Play Debug', `shortBeep: ${!!shortBeep}, soundsLoaded: ${soundsLoaded}`);
  }
  if (!shortBeep || !soundsLoaded) return;
  replaySound(shortBeep, 'shortBeep');
}

export function playStart() {
  playCountdown();
  setTimeout(() => playCountdown(), 200);
  setTimeout(() => playCountdown(), 400);
}

export function playEnd() {
  if (!longBeep || !soundsLoaded) return;
  replaySound(longBeep, 'longBeep');
}

export function playSessionEnd() {
  playEnd();
  setTimeout(() => playEnd(), 400);
  setTimeout(() => playEnd(), 800);
}

export function unloadSounds() {
  shortBeep?.unloadAsync();
  longBeep?.unloadAsync();
  shortBeep = null;
  longBeep = null;
  soundsLoaded = false;
  playCount = 0;
}
