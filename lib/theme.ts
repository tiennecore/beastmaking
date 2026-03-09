import { useColorScheme } from 'nativewind';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_KEY = '@beastmaking_theme';

export type ThemeChoice = 'light' | 'dark' | 'system';

export type ThemeColors = {
  bg: string;
  surface: string;
  raised: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  chevron: string;
  border: string;
};

const lightColors: ThemeColors = {
  bg: '#ffffff',
  surface: '#f5f5f4',
  raised: '#e7e5e4',
  text: '#1c1917',
  textSecondary: '#78716c',
  textMuted: '#a8a29e',
  chevron: '#a8a29e',
  border: '#d6d3d1',
};

const darkColors: ThemeColors = {
  bg: '#0c0a09',
  surface: '#292524',
  raised: '#44403c',
  text: '#fafaf9',
  textSecondary: '#a8a29e',
  textMuted: '#78716c',
  chevron: '#78716c',
  border: '#44403c80',
};

export function useThemeColors(): ThemeColors {
  const { colorScheme } = useColorScheme();
  return colorScheme === 'dark' ? darkColors : lightColors;
}

export async function initTheme(
  setColorScheme: (scheme: ThemeChoice) => void
) {
  try {
    const saved = await AsyncStorage.getItem(THEME_KEY);
    if (saved === 'dark' || saved === 'light' || saved === 'system') {
      setColorScheme(saved);
    }
  } catch {}
}

export async function saveTheme(
  theme: ThemeChoice,
  setColorScheme: (scheme: ThemeChoice) => void
) {
  await AsyncStorage.setItem(THEME_KEY, theme);
  setColorScheme(theme);
}
