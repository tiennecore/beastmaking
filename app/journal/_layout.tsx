import { Stack } from 'expo-router';
import { useThemeColors } from '@/lib/theme';

export default function JournalLayout() {
  const colors = useThemeColors();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        headerTitleAlign: 'center',
        contentStyle: { backgroundColor: colors.bg },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Suivi' }} />
      <Stack.Screen name="[id]" options={{ title: 'Détail' }} />
      <Stack.Screen name="add" options={{ title: 'Ajouter une activité' }} />
      <Stack.Screen name="add-bloc" options={{ title: 'Séance de bloc' }} />
      <Stack.Screen name="add-voie" options={{ title: 'Séance de voie' }} />
      <Stack.Screen name="add-hangboard" options={{ title: 'Hangboarding' }} />
    </Stack>
  );
}
