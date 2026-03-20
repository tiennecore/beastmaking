import { useState, useRef, useEffect } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useThemeColors } from '@/lib/theme';

interface LocationInputProps {
  value: string;
  suggestions: string[];
  onChangeText: (text: string) => void;
  onSelectSuggestion: (location: string) => void;
}

export default function LocationInput({
  value,
  suggestions,
  onChangeText,
  onSelectSuggestion,
}: LocationInputProps) {
  const colors = useThemeColors();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const blurTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (blurTimeout.current) clearTimeout(blurTimeout.current);
    };
  }, []);

  const filtered =
    value.length > 0
      ? suggestions
          .filter((s) => s.toLowerCase().includes(value.toLowerCase()) && s !== value)
          .slice(0, 5)
      : [];

  function handleChangeText(text: string) {
    onChangeText(text);
    setShowSuggestions(true);
  }

  function handleSelect(location: string) {
    onSelectSuggestion(location);
    setShowSuggestions(false);
    Haptics.selectionAsync();
  }

  return (
    <View className="mb-4">
      <Text className="text-stone-500 dark:text-stone-400 text-sm mb-2">
        Salle / Site <Text className="text-stone-400 dark:text-stone-500">(optionnel)</Text>
      </Text>
      <View className="flex-row items-center bg-stone-200 dark:bg-stone-700 rounded-lg px-3 py-2 gap-2">
        <Ionicons name="location-outline" size={16} color="#78716C" />
        <TextInput
          className="flex-1 text-stone-900 dark:text-stone-50"
          placeholder="Ex: Arkose Nation, Font..."
          placeholderTextColor={colors.textMuted}
          value={value}
          onChangeText={handleChangeText}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => {
            blurTimeout.current = setTimeout(() => setShowSuggestions(false), 150);
          }}
          accessibilityLabel="Lieu de la séance"
          returnKeyType="done"
        />
        {value.length > 0 && (
          <Pressable
            onPress={() => {
              onChangeText('');
              setShowSuggestions(false);
            }}
            accessibilityLabel="Effacer le lieu"
            hitSlop={8}
          >
            <Ionicons name="close-circle" size={16} color="#78716C" />
          </Pressable>
        )}
      </View>
      {showSuggestions && filtered.length > 0 && (
        <View className="bg-stone-50 dark:bg-stone-700 rounded-lg mt-1 border border-stone-200 dark:border-stone-600 overflow-hidden">
          {filtered.map((loc, idx) => (
            <Pressable
              key={loc}
              className={`px-3 py-2 flex-row items-center gap-2 ${
                idx < filtered.length - 1
                  ? 'border-b border-stone-200 dark:border-stone-600'
                  : ''
              }`}
              onPress={() => handleSelect(loc)}
              accessibilityRole="button"
              accessibilityLabel={`Sélectionner ${loc}`}
            >
              <Ionicons name="time-outline" size={14} color="#78716C" />
              <Text className="text-stone-700 dark:text-stone-300 text-sm">{loc}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}
