import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'nativewind';
import * as Notifications from 'expo-notifications';
import { loadSounds, unloadSounds } from '@/lib/sounds';
import { setupNotificationChannel } from '@/lib/background-timer';
import { useThemeColors, initTheme } from '@/lib/theme';
import '../global.css';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: false,
    shouldShowList: false,
  }),
});

export default function RootLayout() {
  const { colorScheme, setColorScheme } = useColorScheme();
  const colors = useThemeColors();

  useEffect(() => {
    loadSounds();
    setupNotificationChannel();
    return () => { unloadSounds(); };
  }, []);

  useEffect(() => {
    initTheme(setColorScheme);
  }, []);

  return (
    <>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="protocols" options={{ title: 'Entraînements' }} />
        <Stack.Screen name="library" options={{ title: 'Comprendre' }} />
        <Stack.Screen name="create-workout" options={{ title: 'Créer un entraînement' }} />
        <Stack.Screen name="custom-workouts" options={{ title: 'Mes entraînements' }} />
        <Stack.Screen name="history" options={{ title: 'Historique' }} />
        <Stack.Screen name="climbing" options={{ title: 'Grimpe' }} />
        <Stack.Screen name="plans" options={{ title: 'Plans' }} />
        <Stack.Screen name="plan/[id]" options={{ title: 'Mon plan' }} />
        <Stack.Screen name="create-plan" options={{ title: 'Créer un plan' }} />
        <Stack.Screen name="settings" options={{ title: 'Paramètres' }} />
        <Stack.Screen
          name="protocol/[id]"
          options={{ title: 'Configuration', presentation: 'card' }}
        />
        <Stack.Screen
          name="timer"
          options={{ headerShown: false, presentation: 'fullScreenModal', gestureEnabled: false }}
        />
        <Stack.Screen
          name="recap"
          options={{ title: 'Récapitulatif', headerBackVisible: false, gestureEnabled: false }}
        />
      </Stack>
    </>
  );
}
