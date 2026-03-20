import { Pressable, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { DEFAULT_GRADE, nextGrade, prevGrade } from '@/constants/grades';

interface GradeStepperProps {
  grade: string | undefined;
  onChange: (grade: string) => void;
}

export default function GradeStepper({ grade, onChange }: GradeStepperProps) {
  const currentGrade = grade ?? DEFAULT_GRADE;

  function handlePrev() {
    onChange(prevGrade(currentGrade));
    Haptics.selectionAsync();
  }

  function handleNext() {
    onChange(nextGrade(currentGrade));
    Haptics.selectionAsync();
  }

  return (
    <View className="flex-row items-center justify-center gap-2">
      <Pressable
        onPress={handlePrev}
        className="bg-stone-200 dark:bg-stone-600 rounded-lg w-12 h-12 items-center justify-center"
        accessibilityRole="button"
        accessibilityLabel="Cotation inferieure"
        hitSlop={8}
      >
        <Text className="text-stone-600 dark:text-stone-300 font-bold text-lg">-</Text>
      </Pressable>
      <Text className="text-stone-900 dark:text-stone-50 text-lg font-bold w-14 text-center">
        {currentGrade}
      </Text>
      <Pressable
        onPress={handleNext}
        className="bg-stone-200 dark:bg-stone-600 rounded-lg w-12 h-12 items-center justify-center"
        accessibilityRole="button"
        accessibilityLabel="Cotation superieure"
        hitSlop={8}
      >
        <Text className="text-stone-600 dark:text-stone-300 font-bold text-lg">+</Text>
      </Pressable>
    </View>
  );
}
