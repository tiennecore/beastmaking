import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { loadSounds, unloadSounds } from '@/lib/sounds';
import '../global.css';

export default function RootLayout() {
  useEffect(() => {
    loadSounds();
    return () => { unloadSounds(); };
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#1C1917' },
          headerTintColor: '#fff',
          contentStyle: { backgroundColor: '#1C1917' },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="protocols" options={{ title: 'Entraînements' }} />
        <Stack.Screen name="library" options={{ title: 'Comprendre' }} />
        <Stack.Screen name="create-workout" options={{ title: 'Créer un entraînement' }} />
        <Stack.Screen name="custom-workouts" options={{ title: 'Mes entraînements' }} />
        <Stack.Screen name="history" options={{ title: 'Historique' }} />
        <Stack.Screen name="climbing" options={{ title: 'Grimpe' }} />
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
