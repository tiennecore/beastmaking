import * as Notifications from 'expo-notifications';
import { createAudioPlayer, setAudioModeAsync, AudioPlayer } from 'expo-audio';

const NOTIFICATION_ID = 'beastmaking-timer';
let silentPlayer: AudioPlayer | null = null;

export async function setupNotificationChannel() {
  await Notifications.setNotificationChannelAsync('timer', {
    name: 'Timer',
    importance: Notifications.AndroidImportance.LOW,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
}

export async function startBackgroundKeepAlive() {
  await setAudioModeAsync({ shouldPlayInBackground: true });

  if (!silentPlayer) {
    silentPlayer = createAudioPlayer(require('@/assets/sounds/silence.wav'));
  }
  silentPlayer.loop = true;
  silentPlayer.volume = 0;
  silentPlayer.play();
}

export async function stopBackgroundKeepAlive() {
  if (silentPlayer) {
    silentPlayer.pause();
  }
}

export async function showTimerNotification(
  phaseName: string,
  timeRemaining: number,
  detail: string
) {
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const timeStr =
    minutes > 0
      ? `${minutes}:${String(seconds).padStart(2, '0')}`
      : `${seconds}s`;

  await Notifications.scheduleNotificationAsync({
    identifier: NOTIFICATION_ID,
    content: {
      title: `${phaseName} — ${timeStr}`,
      body: detail,
      sticky: true,
      autoDismiss: false,
    },
    trigger: null,
  });
}

export async function dismissTimerNotification() {
  await Notifications.dismissNotificationAsync(NOTIFICATION_ID);
}
