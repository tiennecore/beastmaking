import { useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';

import { useThemeColors } from '@/lib/theme';
import { saveClimbingSession, tryAutoCompletePlanSession } from '@/lib/storage';
import {
  todayIso,
  newClimbEntry,
  isoToDate,
  dateToIso,
  formatClimbingDate,
  BOULDER_COLORS,
} from '@/constants/climbing';
import { GRADES, DEFAULT_GRADE, nextGrade, prevGrade } from '@/constants/grades';
import type { ClimbEntry, BoulderColor } from '@/types';

// --- Sub-components ---

interface ColorSelectorProps {
  selected: BoulderColor | undefined;
  onChange: (color: BoulderColor) => void;
}

function ColorSelector({ selected, onChange }: ColorSelectorProps) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {BOULDER_COLORS.map(({ value, hex }) => (
        <Pressable
          key={value}
          onPress={() => {
            Haptics.selectionAsync();
            onChange(value);
          }}
          accessibilityRole="radio"
          accessibilityLabel={value}
          accessibilityState={{ selected: selected === value }}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: hex,
            borderWidth: selected === value ? 2.5 : 0,
            borderColor: '#ffffff',
            shadowColor: selected === value ? hex : 'transparent',
            shadowOpacity: 0.6,
            shadowRadius: 4,
            elevation: selected === value ? 4 : 0,
          }}
        />
      ))}
    </View>
  );
}

interface GradeStepperProps {
  grade: string;
  onDecrease: () => void;
  onIncrease: () => void;
}

function GradeStepper({ grade, onDecrease, onIncrease }: GradeStepperProps) {
  const isMin = GRADES.indexOf(grade) <= 0;
  const isMax = GRADES.indexOf(grade) >= GRADES.length - 1;

  return (
    <View className="flex-row items-center gap-2">
      <Pressable
        onPress={onDecrease}
        disabled={isMin}
        accessibilityRole="button"
        accessibilityLabel="Cotation inférieure"
        className="w-11 h-11 rounded-full bg-stone-200 dark:bg-stone-700 items-center justify-center active:opacity-60"
        style={{ opacity: isMin ? 0.3 : 1 }}
      >
        <Ionicons name="remove" size={18} color="#78716c" />
      </Pressable>
      <Text className="text-stone-900 dark:text-stone-50 text-sm font-semibold w-10 text-center">
        {grade}
      </Text>
      <Pressable
        onPress={onIncrease}
        disabled={isMax}
        accessibilityRole="button"
        accessibilityLabel="Cotation supérieure"
        className="w-11 h-11 rounded-full bg-stone-200 dark:bg-stone-700 items-center justify-center active:opacity-60"
        style={{ opacity: isMax ? 0.3 : 1 }}
      >
        <Ionicons name="add" size={18} color="#78716c" />
      </Pressable>
    </View>
  );
}

interface AttemptsStepperProps {
  attempts: number;
  onDecrease: () => void;
  onIncrease: () => void;
}

function AttemptsStepper({ attempts, onDecrease, onIncrease }: AttemptsStepperProps) {
  return (
    <View className="flex-row items-center gap-2">
      <Pressable
        onPress={onDecrease}
        disabled={attempts <= 1}
        accessibilityRole="button"
        accessibilityLabel="Moins de tentatives"
        className="w-11 h-11 rounded-full bg-stone-200 dark:bg-stone-700 items-center justify-center active:opacity-60"
        style={{ opacity: attempts <= 1 ? 0.3 : 1 }}
      >
        <Ionicons name="remove" size={18} color="#78716c" />
      </Pressable>
      <Text className="text-stone-900 dark:text-stone-50 text-sm font-semibold w-6 text-center">
        {attempts}
      </Text>
      <Pressable
        onPress={onIncrease}
        accessibilityRole="button"
        accessibilityLabel="Plus de tentatives"
        className="w-11 h-11 rounded-full bg-stone-200 dark:bg-stone-700 items-center justify-center active:opacity-60"
      >
        <Ionicons name="add" size={18} color="#78716c" />
      </Pressable>
    </View>
  );
}

interface EntryCardProps {
  entry: ClimbEntry;
  index: number;
  onUpdate: (updated: ClimbEntry) => void;
  onRemove: () => void;
}

function EntryCard({ entry, index, onUpdate, onRemove }: EntryCardProps) {
  const colors = useThemeColors();
  const grade = entry.grade ?? DEFAULT_GRADE;
  const attempts = entry.attempts ?? 1;
  const success = entry.success ?? false;

  const handleGradeDecrease = () => {
    Haptics.selectionAsync();
    onUpdate({ ...entry, grade: prevGrade(grade) });
  };

  const handleGradeIncrease = () => {
    Haptics.selectionAsync();
    onUpdate({ ...entry, grade: nextGrade(grade) });
  };

  const handleAttemptsDecrease = () => {
    if (attempts <= 1) return;
    Haptics.selectionAsync();
    onUpdate({ ...entry, attempts: attempts - 1 });
  };

  const handleAttemptsIncrease = () => {
    Haptics.selectionAsync();
    onUpdate({ ...entry, attempts: attempts + 1 });
  };

  const handleSuccessToggle = () => {
    Haptics.selectionAsync();
    onUpdate({ ...entry, success: !success });
  };

  return (
    <View className="bg-stone-100 dark:bg-stone-800 rounded-2xl p-4 border border-stone-300 dark:border-stone-700/50">
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-stone-500 dark:text-stone-400 text-xs font-medium uppercase tracking-wide">
          Bloc {index + 1}
        </Text>
        <Pressable
          onPress={onRemove}
          accessibilityRole="button"
          accessibilityLabel="Supprimer ce bloc"
          className="w-11 h-11 items-center justify-center active:opacity-60"
        >
          <Ionicons name="close-circle" size={20} color={colors.textMuted} />
        </Pressable>
      </View>

      <ColorSelector selected={entry.color} onChange={(color) => onUpdate({ ...entry, color })} />

      <View className="flex-row items-center justify-between mt-3">
        <View className="flex-row items-center gap-3">
          <Text className="text-stone-500 dark:text-stone-400 text-xs">Cotation</Text>
          <GradeStepper
            grade={grade}
            onDecrease={handleGradeDecrease}
            onIncrease={handleGradeIncrease}
          />
        </View>

        <Pressable
          onPress={handleSuccessToggle}
          accessibilityRole="checkbox"
          accessibilityLabel="Succès"
          accessibilityState={{ checked: success }}
          className="w-11 h-11 rounded-full items-center justify-center active:opacity-70"
          style={{ backgroundColor: success ? '#22C55E20' : '#a8a29e20' }}
        >
          <Ionicons
            name="checkmark"
            size={20}
            color={success ? '#22C55E' : colors.textMuted}
          />
        </Pressable>
      </View>

      <View className="flex-row items-center gap-3 mt-2">
        <Text className="text-stone-500 dark:text-stone-400 text-xs">Tentatives</Text>
        <AttemptsStepper
          attempts={attempts}
          onDecrease={handleAttemptsDecrease}
          onIncrease={handleAttemptsIncrease}
        />
      </View>
    </View>
  );
}

// --- Screen ---

export default function AddBlocScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();

  const [dateIso, setDateIso] = useState(todayIso);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [entries, setEntries] = useState<ClimbEntry[]>([newClimbEntry(DEFAULT_GRADE)]);
  const [isSaving, setIsSaving] = useState(false);

  const handleDateChange = useCallback((_: unknown, selected?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selected) setDateIso(dateToIso(selected));
  }, []);

  const handleAddEntry = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEntries((prev) => [...prev, newClimbEntry(DEFAULT_GRADE)]);
  };

  const handleUpdateEntry = useCallback((id: string, updated: ClimbEntry) => {
    setEntries((prev) => prev.map((e) => (e.id === id ? updated : e)));
  }, []);

  const handleRemoveEntry = useCallback((id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const handleSave = async () => {
    if (entries.length === 0) return;

    setIsSaving(true);
    try {
      await saveClimbingSession({
        id: Date.now().toString() + Math.random().toString(36).slice(2),
        date: dateIso,
        type: 'bloc',
        entries,
      });
      await tryAutoCompletePlanSession({ type: 'climbing', climbingType: 'bloc' });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } finally {
      setIsSaving(false);
    }
  };

  const canSave = entries.length > 0 && !isSaving;

  return (
    <View className="flex-1 bg-white dark:bg-stone-950">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20, paddingBottom: 24, gap: 12 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Date picker */}
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            setShowDatePicker(true);
          }}
          accessibilityRole="button"
          accessibilityLabel="Choisir la date"
          className="bg-stone-100 dark:bg-stone-800 rounded-2xl p-4 border border-stone-300 dark:border-stone-700/50 flex-row items-center justify-between active:opacity-70"
        >
          <View className="flex-row items-center gap-3">
            <Ionicons name="calendar-outline" size={20} color="#F97316" />
            <Text className="text-stone-900 dark:text-stone-50 text-base font-medium capitalize">
              {formatClimbingDate(dateIso)}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.chevron} />
        </Pressable>

        {showDatePicker && (
          <DateTimePicker
            value={isoToDate(dateIso)}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            maximumDate={new Date()}
            onChange={handleDateChange}
          />
        )}

        {/* Entry list */}
        {entries.map((entry, index) => (
          <EntryCard
            key={entry.id}
            entry={entry}
            index={index}
            onUpdate={(updated) => handleUpdateEntry(entry.id, updated)}
            onRemove={() => handleRemoveEntry(entry.id)}
          />
        ))}

        {/* Add entry button */}
        <Pressable
          onPress={handleAddEntry}
          accessibilityRole="button"
          accessibilityLabel="Ajouter un bloc"
          className="rounded-2xl p-4 items-center justify-center flex-row gap-2 active:opacity-70"
          style={{
            borderWidth: 1.5,
            borderStyle: 'dashed',
            borderColor: '#F97316',
          }}
        >
          <Ionicons name="add" size={20} color="#F97316" />
          <Text className="text-orange-500 text-base font-semibold">Ajouter un bloc</Text>
        </Pressable>
      </ScrollView>

      {/* Sticky save button */}
      <View
        className="border-t border-stone-200 dark:border-stone-800 px-5 pt-3"
        style={{ paddingBottom: insets.bottom > 0 ? insets.bottom : 16 }}
      >
        <Pressable
          onPress={handleSave}
          disabled={!canSave}
          accessibilityRole="button"
          accessibilityLabel="Sauvegarder la séance"
          className="bg-orange-500 rounded-2xl py-4 items-center justify-center active:opacity-80"
          style={{ opacity: canSave ? 1 : 0.5 }}
        >
          <Text className="text-white text-base font-bold">Sauvegarder</Text>
        </Pressable>
      </View>
    </View>
  );
}
