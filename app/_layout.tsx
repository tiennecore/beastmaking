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
          headerStyle: { backgroundColor: '#1a1a1a' },
          headerTintColor: '#fff',
          contentStyle: { backgroundColor: '#1a1a1a' },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
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
