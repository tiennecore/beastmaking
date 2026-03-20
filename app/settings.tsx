import { useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, Switch, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { loadSettings, saveSettings, clearHistory, clearCustomWorkouts, clearClimbingSessions, AppSettings } from '@/lib/storage';
import { saveTheme, ThemeChoice } from '@/lib/theme';
import { DEFAULT_GRADE, nextGrade, prevGrade } from '@/constants/grades';
import { SegmentedControl } from '@/components/SegmentedControl';

const DEFAULT_SETTINGS: AppSettings = {
  soundEnabled: true,
  hapticsEnabled: true,
  countdownBeep: true,
  defaultGrade: DEFAULT_GRADE,
  hasHomeHangboard: false,
};

function SettingRow({
  icon,
  iconColor,
  label,
  description,
  value,
  onToggle,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  label: string;
  description?: string;
  value: boolean;
  onToggle: (v: boolean) => void;
}) {
  return (
    <View className="flex-row items-center py-4">
      <View
        className="w-10 h-10 rounded-xl items-center justify-center mr-3"
        style={{ backgroundColor: iconColor + '20' }}
      >
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <View className="flex-1">
        <Text className="text-stone-900 dark:text-stone-50 font-semibold">{label}</Text>
        {description && (
          <Text className="text-stone-400 dark:text-stone-500 text-xs mt-0.5">{description}</Text>
        )}
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: '#44403C', true: '#F9731680' }}
        thumbColor={value ? '#F97316' : '#78716C'}
        accessibilityLabel={label}
      />
    </View>
  );
}

function DangerButton({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }], opacity: pressed ? 0.8 : 1 })}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View className="flex-row items-center py-3">
        <Ionicons name={icon} size={18} color="#EF4444" style={{ marginRight: 12 }} />
        <Text className="text-red-500 dark:text-red-400 font-medium">{label}</Text>
      </View>
    </Pressable>
  );
}

const THEME_OPTIONS: Array<{ value: ThemeChoice; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { value: 'light', label: 'Clair', icon: 'sunny-outline' },
  { value: 'dark', label: 'Sombre', icon: 'moon-outline' },
  { value: 'system', label: 'Système', icon: 'phone-portrait-outline' },
];

export default function SettingsScreen() {
  const { colorScheme, setColorScheme } = useColorScheme();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const activeTheme: ThemeChoice = colorScheme === undefined ? 'system' : colorScheme as ThemeChoice;

  useFocusEffect(
    useCallback(() => {
      loadSettings().then((saved) => {
        if (saved) setSettings({ ...DEFAULT_SETTINGS, ...saved });
      });
    }, [])
  );

  const update = (key: keyof AppSettings, value: boolean | string) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    saveSettings(next);
    if (next.hapticsEnabled) {
      Haptics.selectionAsync();
    }
  };

  const confirmClear = (label: string, action: () => Promise<void>) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      `Effacer ${label} ?`,
      'Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Effacer',
          style: 'destructive',
          onPress: async () => {
            await action();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  return (
    <ScrollView className="flex-1 bg-white dark:bg-stone-950 px-5 pt-4">
      {/* Theme */}
      <Text className="text-stone-400 dark:text-stone-500 text-xs font-semibold uppercase tracking-widest mb-1 ml-1">
        Apparence
      </Text>
      <View className="bg-stone-100 dark:bg-stone-800 rounded-3xl px-4 py-3 border border-stone-300 dark:border-stone-700/50 mb-6">
        <SegmentedControl
          options={THEME_OPTIONS}
          value={activeTheme}
          onChange={(theme) => saveTheme(theme, setColorScheme)}
        />
      </View>

      {/* Audio & Feedback */}
      <Text className="text-stone-400 dark:text-stone-500 text-xs font-semibold uppercase tracking-widest mb-1 ml-1">
        Audio & retour
      </Text>
      <View className="bg-stone-100 dark:bg-stone-800 rounded-3xl px-4 border border-stone-300 dark:border-stone-700/50 mb-6">
        <SettingRow
          icon="volume-high-outline"
          iconColor="#F97316"
          label="Sons"
          description="Bips de début et fin de phase"
          value={settings.soundEnabled}
          onToggle={(v) => update('soundEnabled', v)}
        />
        <View className="h-px bg-stone-200 dark:bg-stone-700/50" />
        <SettingRow
          icon="megaphone-outline"
          iconColor="#FBBF24"
          label="Compte à rebours"
          description="Bip dans les 3 dernières secondes"
          value={settings.countdownBeep}
          onToggle={(v) => update('countdownBeep', v)}
        />
        <View className="h-px bg-stone-200 dark:bg-stone-700/50" />
        <SettingRow
          icon="phone-portrait-outline"
          iconColor="#818CF8"
          label="Vibrations"
          description="Retour haptique sur les interactions"
          value={settings.hapticsEnabled}
          onToggle={(v) => update('hapticsEnabled', v)}
        />
      </View>

      {/* Climbing */}
      <Text className="text-stone-400 dark:text-stone-500 text-xs font-semibold uppercase tracking-widest mb-1 ml-1">
        Escalade
      </Text>
      <View className="bg-stone-100 dark:bg-stone-800 rounded-3xl px-4 border border-stone-300 dark:border-stone-700/50 mb-6">
        <View className="flex-row items-center py-4">
          <View
            className="w-10 h-10 rounded-xl items-center justify-center mr-3"
            style={{ backgroundColor: '#2563EB20' }}
          >
            <Ionicons name="trending-up-outline" size={20} color="#2563EB" />
          </View>
          <View className="flex-1">
            <Text className="text-stone-900 dark:text-stone-50 font-semibold">Cotation par défaut</Text>
            <Text className="text-stone-400 dark:text-stone-500 text-xs mt-0.5">
              Cotation initiale lors d'une nouvelle entrée
            </Text>
          </View>
          <View className="flex-row items-center gap-2">
            <Pressable
              onPress={() => update('defaultGrade', prevGrade(settings.defaultGrade ?? DEFAULT_GRADE))}
              className="bg-stone-200 dark:bg-stone-700 rounded-lg w-11 h-11 items-center justify-center"
              accessibilityRole="button"
              accessibilityLabel="Diminuer la cotation par défaut"
              hitSlop={4}
            >
              <Text className="text-stone-600 dark:text-stone-300 font-bold text-lg">-</Text>
            </Pressable>
            <Text className="text-stone-900 dark:text-stone-50 text-lg font-bold w-12 text-center">
              {settings.defaultGrade ?? DEFAULT_GRADE}
            </Text>
            <Pressable
              onPress={() => update('defaultGrade', nextGrade(settings.defaultGrade ?? DEFAULT_GRADE))}
              className="bg-stone-200 dark:bg-stone-700 rounded-lg w-11 h-11 items-center justify-center"
              accessibilityRole="button"
              accessibilityLabel="Augmenter la cotation par défaut"
              hitSlop={4}
            >
              <Text className="text-stone-600 dark:text-stone-300 font-bold text-lg">+</Text>
            </Pressable>
          </View>
        </View>
        <View className="h-px bg-stone-200 dark:bg-stone-700/50" />
        <SettingRow
          icon="home-outline"
          iconColor="#F97316"
          label="Poutre à la maison"
          description="Permet des séances poutre sans aller à la salle"
          value={settings.hasHomeHangboard ?? false}
          onToggle={(v) => update('hasHomeHangboard', v)}
        />
      </View>

      {/* Data */}
      <Text className="text-stone-400 dark:text-stone-500 text-xs font-semibold uppercase tracking-widest mb-1 ml-1">
        Données
      </Text>
      <View className="bg-red-500/5 border border-red-500/20 rounded-2xl p-4 gap-3 mt-2 mb-6">
        <Text className="text-red-500 dark:text-red-400 text-sm font-semibold mb-1">Zone de danger</Text>
        <DangerButton
          icon="trash-outline"
          label="Effacer l'historique des séances"
          onPress={() => confirmClear("l'historique", clearHistory)}
        />
        <View className="h-px bg-red-500/10" />
        <DangerButton
          icon="trash-outline"
          label="Effacer les workouts personnalisés"
          onPress={() => confirmClear('les workouts', clearCustomWorkouts)}
        />
        <View className="h-px bg-red-500/10" />
        <DangerButton
          icon="trash-outline"
          label="Effacer les séances de grimpe"
          onPress={() => confirmClear('les séances', clearClimbingSessions)}
        />
      </View>

      {/* About */}
      <Text className="text-stone-400 dark:text-stone-500 text-xs font-semibold uppercase tracking-widest mb-1 ml-1">
        À propos
      </Text>
      <View className="bg-stone-100 dark:bg-stone-800 rounded-3xl px-4 py-4 border border-stone-300 dark:border-stone-700/50 mb-6">
        <Text className="text-stone-900 dark:text-stone-50 font-bold text-base mb-1">Beastmaking Timer</Text>
        <Text className="text-stone-400 dark:text-stone-500 text-sm">Version 1.0.0</Text>
        <Text className="text-stone-400 dark:text-stone-500 text-sm mt-2">
          Timer d'entraînement basé sur le livre Beastmaking de Ned Feehally.
        </Text>
      </View>

      <View className="h-20" />
    </ScrollView>
  );
}
