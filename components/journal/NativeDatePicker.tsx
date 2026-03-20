import { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { dateToIso, formatClimbingDate, isoToDate } from '@/constants/climbing';

interface NativeDatePickerProps {
  isoDate: string;
  onChange: (iso: string) => void;
}

export default function NativeDatePicker({ isoDate, onChange }: NativeDatePickerProps) {
  const [showPicker, setShowPicker] = useState(false);
  const currentDate = isoToDate(isoDate);

  function handleChange(_event: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    if (selected) {
      onChange(dateToIso(selected));
    }
  }

  function handlePress() {
    Haptics.selectionAsync();
    setShowPicker((prev) => !prev);
  }

  return (
    <View className="mb-4">
      <Pressable
        className="flex-row items-center gap-2 bg-stone-200 dark:bg-stone-700 rounded-lg px-3 py-2"
        onPress={handlePress}
        style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}
        accessibilityRole="button"
        accessibilityLabel={`Date : ${formatClimbingDate(isoDate)}, appuyer pour changer`}
      >
        <Ionicons name="calendar-outline" size={16} color="#78716C" />
        <Text className="text-stone-700 dark:text-stone-300 text-sm font-medium">
          {formatClimbingDate(isoDate)}
        </Text>
      </Pressable>

      {showPicker && (
        <DateTimePicker
          value={currentDate}
          mode="date"
          display="default"
          onChange={handleChange}
        />
      )}
    </View>
  );
}
