import "../global.css";
import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerStyle: { backgroundColor: '#171717' }, headerTintColor: '#fff' }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="protocol/[id]" options={{ title: 'Configuration', headerBackTitle: 'Retour' }} />
      <Stack.Screen
        name="timer"
        options={{ headerShown: false, presentation: 'fullScreenModal', gestureEnabled: false }}
      />
      <Stack.Screen name="recap" options={{ title: 'Récapitulatif', headerBackVisible: false, gestureEnabled: false }} />
    </Stack>
  );
}
