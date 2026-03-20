import { Pressable, Text } from 'react-native';

interface ToggleButtonProps<T extends string> {
  value: T;
  selected: boolean;
  label: string;
  onPress: (v: T) => void;
}

export default function ToggleButton<T extends string>({
  value,
  selected,
  label,
  onPress,
}: ToggleButtonProps<T>) {
  return (
    <Pressable
      className={`px-3 py-3 rounded-lg border ${
        selected
          ? 'bg-orange-500 border-orange-500'
          : 'bg-stone-100 dark:bg-stone-800 border-stone-300 dark:border-stone-700/50'
      }`}
      onPress={() => onPress(value)}
      style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
    >
      <Text
        className={`text-sm font-medium text-center ${
          selected ? 'text-white' : 'text-stone-600 dark:text-stone-300'
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
