import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useThemeColors } from '@/lib/theme';
import { ClimbEntry, ClimbingType } from '@/types';
import { BOULDER_COLORS } from '@/constants/climbing';
import GradeStepper from './GradeStepper';
import ToggleButton from './ToggleButton';

interface ClimbEntryCardProps {
  entry: ClimbEntry;
  sessionType: ClimbingType;
  onUpdate: (updated: ClimbEntry) => void;
  onDelete: () => void;
}

type BlocSubMode = 'grade' | 'color';

export default function ClimbEntryCard({
  entry,
  sessionType,
  onUpdate,
  onDelete,
}: ClimbEntryCardProps) {
  const colors = useThemeColors();
  const [blocSubMode, setBlocSubMode] = useState<BlocSubMode>('grade');

  function update(partial: Partial<ClimbEntry>) {
    onUpdate({ ...entry, ...partial });
  }

  function toggleSuccess(val: boolean) {
    if (entry.success === val) {
      update({ success: undefined });
    } else {
      update({ success: val });
    }
    Haptics.selectionAsync();
  }

  return (
    <View className="bg-stone-200 dark:bg-stone-700 rounded-2xl p-3 mb-3">
      <View className="flex-row items-center justify-between mb-2">
        <TextInput
          className="flex-1 text-stone-900 dark:text-stone-50 text-sm font-medium mr-2"
          placeholder="Nom de la voie/bloc"
          placeholderTextColor={colors.textMuted}
          value={entry.name ?? ''}
          onChangeText={(text) => update({ name: text || undefined })}
          accessibilityLabel="Nom de la voie ou du bloc"
          returnKeyType="done"
        />
        <Pressable
          onPress={onDelete}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Supprimer cette entrée"
        >
          <Ionicons name="close-circle-outline" size={20} color="#78716C" />
        </Pressable>
      </View>

      {sessionType === 'voie' ? (
        <View className="mb-2">
          <GradeStepper
            grade={entry.grade}
            onChange={(g) => update({ grade: g })}
          />
        </View>
      ) : (
        <View className="mb-2">
          <View className="flex-row gap-2 mb-2">
            <ToggleButton<BlocSubMode>
              value="grade"
              selected={blocSubMode === 'grade'}
              label="Cotation"
              onPress={setBlocSubMode}
            />
            <ToggleButton<BlocSubMode>
              value="color"
              selected={blocSubMode === 'color'}
              label="Couleur"
              onPress={setBlocSubMode}
            />
          </View>
          {blocSubMode === 'grade' ? (
            <GradeStepper
              grade={entry.grade}
              onChange={(g) => update({ grade: g, color: undefined })}
            />
          ) : (
            <View className="flex-row flex-wrap gap-2">
              {BOULDER_COLORS.map((bc) => (
                <Pressable
                  key={bc.value}
                  onPress={() => {
                    update({
                      color: entry.color === bc.value ? undefined : bc.value,
                      grade: undefined,
                    });
                    Haptics.selectionAsync();
                  }}
                  style={[
                    {
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: bc.hex,
                      borderWidth: entry.color === bc.value ? 3 : 0,
                      borderColor: '#F97316',
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={bc.label}
                  accessibilityState={{ selected: entry.color === bc.value }}
                />
              ))}
            </View>
          )}
        </View>
      )}

      <View className="flex-row items-center justify-between">
        <View className="flex-row gap-2">
          <Pressable
            className={`px-3 py-1.5 rounded-lg border ${
              entry.success === true
                ? 'bg-green-500 border-green-500'
                : 'bg-stone-100 dark:bg-stone-600 border-stone-300 dark:border-stone-500'
            }`}
            onPress={() => toggleSuccess(true)}
            accessibilityRole="button"
            accessibilityLabel="Marquer comme réussi"
            accessibilityState={{ selected: entry.success === true }}
          >
            <Text
              className={`text-xs font-medium ${
                entry.success === true
                  ? 'text-white'
                  : 'text-stone-600 dark:text-stone-300'
              }`}
            >
              Reussi
            </Text>
          </Pressable>
          <Pressable
            className={`px-3 py-1.5 rounded-lg border ${
              entry.success === false
                ? 'bg-red-500 border-red-500'
                : 'bg-stone-100 dark:bg-stone-600 border-stone-300 dark:border-stone-500'
            }`}
            onPress={() => toggleSuccess(false)}
            accessibilityRole="button"
            accessibilityLabel="Marquer comme echoue"
            accessibilityState={{ selected: entry.success === false }}
          >
            <Text
              className={`text-xs font-medium ${
                entry.success === false
                  ? 'text-white'
                  : 'text-stone-600 dark:text-stone-300'
              }`}
            >
              Echoue
            </Text>
          </Pressable>
        </View>

        <View className="flex-row items-center gap-2">
          <Text className="text-stone-500 dark:text-stone-400 text-xs">Essais</Text>
          <Pressable
            className="bg-stone-100 dark:bg-stone-600 rounded-md w-10 h-10 items-center justify-center"
            onPress={() => {
              const cur = entry.attempts ?? 0;
              update({ attempts: cur > 0 ? cur - 1 : undefined });
              Haptics.selectionAsync();
            }}
            accessibilityLabel="Diminuer le nombre d'essais"
            hitSlop={8}
          >
            <Text className="text-stone-600 dark:text-stone-300 font-bold">-</Text>
          </Pressable>
          <Text className="text-stone-900 dark:text-stone-50 text-sm font-medium w-5 text-center">
            {entry.attempts ?? 0}
          </Text>
          <Pressable
            className="bg-stone-100 dark:bg-stone-600 rounded-md w-10 h-10 items-center justify-center"
            onPress={() => {
              update({ attempts: (entry.attempts ?? 0) + 1 });
              Haptics.selectionAsync();
            }}
            accessibilityLabel="Augmenter le nombre d'essais"
            hitSlop={8}
          >
            <Text className="text-stone-600 dark:text-stone-300 font-bold">+</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
