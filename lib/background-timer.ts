import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const CHANNEL_ID = 'timer-channel';
const NOTIF_ID = 'timer-sticky';

let channelReady = false;

async function ensureChannel() {
  if (channelReady || Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Timer en cours',
    importance: Notifications.AndroidImportance.LOW,
    sound: null,
    vibrationPattern: null,
    enableVibrate: false,
  });
  channelReady = true;
}

function formatTime(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const min = Math.floor(s / 60);
  const sec = s % 60;
  if (min === 0) return `${sec}s`;
  return `${min}:${String(sec).padStart(2, '0')}`;
}

export async function startBackgroundTimer(
  phase: string,
  timeRemaining: number,
  _color: string,
  _onPause: () => void
): Promise<void> {
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    const { status: newStatus } = await Notifications.requestPermissionsAsync();
    if (newStatus !== 'granted') return;
  }
  await ensureChannel();
  await Notifications.scheduleNotificationAsync({
    identifier: NOTIF_ID,
    content: {
      title: phase || 'Timer',
      body: formatTime(timeRemaining),
      sticky: true,
      autoDismiss: false,
      ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
    },
    trigger: null,
  });
}

export async function updateBackgroundNotification(
  phase: string,
  timeRemaining: number,
  _color: string,
  isPaused: boolean
): Promise<void> {
  if (!channelReady && Platform.OS === 'android') return;
  const body = isPaused
    ? `En pause · ${formatTime(timeRemaining)}`
    : formatTime(timeRemaining);
  await Notifications.scheduleNotificationAsync({
    identifier: NOTIF_ID,
    content: {
      title: phase || 'Timer',
      body,
      sticky: true,
      autoDismiss: false,
      ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
    },
    trigger: null,
  });
}

export async function stopBackgroundTimer(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(NOTIF_ID);
  await Notifications.dismissNotificationAsync(NOTIF_ID);
}
