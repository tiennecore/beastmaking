import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'nativewind';
import * as Notifications from 'expo-notifications';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useThemeColors, initTheme } from '@/lib/theme';
import '../global.css';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: false,
    shouldShowList: true,
  }),
});

export default function RootLayout() {
  const { colorScheme, setColorScheme } = useColorScheme();
  const colors = useThemeColors();

  useEffect(() => {
    initTheme(setColorScheme);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          contentStyle: { backgroundColor: colors.bg },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="protocols" options={{ title: 'Hangboarding' }} />
        <Stack.Screen name="library" options={{ title: 'Comprendre' }} />
        <Stack.Screen name="create-workout" options={{ title: 'Créer un entraînement' }} />
        <Stack.Screen name="custom-workouts" options={{ title: 'Mes entraînements' }} />
        <Stack.Screen name="plans" options={{ title: 'Plans' }} />
        <Stack.Screen name="plan/[id]" options={{ title: 'Mon plan' }} />
        <Stack.Screen name="create-plan" options={{ title: 'Créer un plan' }} />
        <Stack.Screen name="journal" options={{ headerShown: false }} />
        <Stack.Screen name="statistics" options={{ title: 'Statistiques' }} />
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
    </GestureHandlerRootView>
  );
}
