import { Audio } from 'expo-av';

let shortBeep: Audio.Sound | null = null;
let longBeep: Audio.Sound | null = null;

export async function loadSounds() {
  const { sound: short } = await Audio.Sound.createAsync(
    require('@/assets/sounds/beep-short.mp3')
  );
  const { sound: long } = await Audio.Sound.createAsync(
    require('@/assets/sounds/beep-long.mp3')
  );
  shortBeep = short;
  longBeep = long;
}

export async function playCountdown() {
  if (!shortBeep) return;
  await shortBeep.replayAsync();
}

export async function playStart() {
  if (!shortBeep) return;
  for (let i = 0; i < 3; i++) {
    await shortBeep.replayAsync();
    await new Promise((r) => setTimeout(r, 200));
  }
}

export async function playEnd() {
  if (!longBeep) return;
  await longBeep.replayAsync();
}

export async function playSessionEnd() {
  if (!longBeep) return;
  for (let i = 0; i < 3; i++) {
    await longBeep.replayAsync();
    await new Promise((r) => setTimeout(r, 400));
  }
}

export async function unloadSounds() {
  await shortBeep?.unloadAsync();
  await longBeep?.unloadAsync();
}
