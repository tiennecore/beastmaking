import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DIFFICULTY_LABELS } from '@/constants/climbing';
import { DifficultyLevel } from '@/types';

interface DifficultyBadgeProps {
  level: DifficultyLevel;
}

export default function DifficultyBadge({ level }: DifficultyBadgeProps) {
  const filled =
    level === 'easy' ? 1 : level === 'medium' ? 2 : level === 'hard' ? 3 : 4;

  return (
    <View className="flex-row items-center gap-0.5">
      {[1, 2, 3, 4].map((i) => (
        <Ionicons
          key={i}
          name="star"
          size={14}
          color={i <= filled ? '#EF4444' : '#78716C'}
        />
      ))}
      <Text className="text-stone-500 dark:text-stone-400 text-xs ml-1">
        {DIFFICULTY_LABELS[level]}
      </Text>
    </View>
  );
}
