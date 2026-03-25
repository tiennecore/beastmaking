import * as Notifications from 'expo-notifications';
import { Alert, Platform } from 'react-native';

const CHANNEL_ID = 'timer-channel';
const NOTIF_ID = 'timer-sticky';

async function ensureChannel() {
  console.warn('[bg-timer] ensureChannel() called, platform:', Platform.OS);
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Timer en cours',
      importance: Notifications.AndroidImportance.LOW,
      sound: null,
      vibrationPattern: null,
      enableVibrate: false,
    });
    console.warn('[bg-timer] channel created/updated:', CHANNEL_ID);
  } catch (e) {
    console.warn('[bg-timer] ensureChannel ERROR:', e);
  }
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
  console.warn('[bg-timer] startBackgroundTimer() called — phase:', phase, 'timeRemaining:', timeRemaining);

  let permStatus: string;
  try {
    const { status } = await Notifications.getPermissionsAsync();
    permStatus = status;
    console.warn('[bg-timer] permission status:', status);
    if (status !== 'granted') {
      const { status: newStatus } = await Notifications.requestPermissionsAsync();
      permStatus = newStatus;
      console.warn('[bg-timer] requested permission, new status:', newStatus);
      if (newStatus !== 'granted') {
        console.warn('[bg-timer] permission denied — notifications will not show');
        return;
      }
    }
  } catch (e) {
    console.warn('[bg-timer] getPermissionsAsync ERROR:', e);
    return;
  }

  await ensureChannel();

  console.warn('[bg-timer] scheduling notification — identifier:', NOTIF_ID, 'trigger: { channelId }');
  try {
    await Notifications.scheduleNotificationAsync({
      identifier: NOTIF_ID,
      content: {
        title: phase || 'Timer',
        body: formatTime(timeRemaining),
        sticky: true,
        autoDismiss: false,
      },
      trigger: { channelId: CHANNEL_ID },
    });
    console.warn('[bg-timer] notification scheduled OK');
    Alert.alert('Notif Debug', `permission: ${permStatus}, scheduled: OK`);
  } catch (e) {
    console.warn('[bg-timer] scheduleNotificationAsync ERROR:', e);
    Alert.alert('Notif Debug', `ERROR: ${e}`);
  }
}

export async function updateBackgroundNotification(
  phase: string,
  timeRemaining: number,
  _color: string,
  isPaused: boolean
): Promise<void> {
  console.warn('[bg-timer] updateBackgroundNotification() — phase:', phase, 'timeRemaining:', timeRemaining, 'isPaused:', isPaused);
  await ensureChannel();
  const body = isPaused
    ? `En pause · ${formatTime(timeRemaining)}`
    : formatTime(timeRemaining);
  try {
    await Notifications.scheduleNotificationAsync({
      identifier: NOTIF_ID,
      content: {
        title: phase || 'Timer',
        body,
        sticky: true,
        autoDismiss: false,
      },
      trigger: { channelId: CHANNEL_ID },
    });
  } catch (e) {
    console.warn('[bg-timer] updateBackgroundNotification scheduleNotificationAsync ERROR:', e);
  }
}

export async function stopBackgroundTimer(): Promise<void> {
  try {
    await Notifications.dismissNotificationAsync(NOTIF_ID);
  } catch {
    // notification may already be gone
  }
}
