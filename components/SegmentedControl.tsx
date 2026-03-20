import { View, Text, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

type Option<T extends string> = {
  value: T;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
};

type Props<T extends string> = {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
};

export function SegmentedControl<T extends string>({ options, value, onChange }: Props<T>) {
  return (
    <View className="flex-row bg-stone-100 dark:bg-stone-800 rounded-xl p-1">
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <Pressable
            key={option.value}
            className={`flex-1 py-3 rounded-lg items-center justify-center ${
              isActive ? 'bg-orange-500' : ''
            }`}
            onPress={() => {
              if (option.value !== value) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onChange(option.value);
              }
            }}
            style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={option.label}
          >
            {option.icon ? (
              <View className="items-center gap-1">
                <Ionicons
                  name={option.icon}
                  size={18}
                  color={isActive ? '#fff' : '#78716c'}
                />
                <Text
                  className={`text-sm font-semibold ${
                    isActive ? 'text-white' : 'text-stone-500 dark:text-stone-400'
                  }`}
                >
                  {option.label}
                </Text>
              </View>
            ) : (
              <Text
                className={`font-semibold ${
                  isActive ? 'text-white' : 'text-stone-500 dark:text-stone-400'
                }`}
              >
                {option.label}
              </Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
