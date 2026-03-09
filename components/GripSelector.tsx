import { Text, View, Pressable, Modal, FlatList } from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { GripType } from '@/types';
import { GRIPS, MAX_GRIPS_PER_SESSION, getGripById } from '@/constants/grips';
import { useThemeColors } from '@/lib/theme';

type Props = {
  selected: GripType[];
  onToggle: (grip: GripType) => void;
};

export function GripSelector({ selected, onToggle }: Props) {
  const [open, setOpen] = useState(false);
  const colors = useThemeColors();

  const selectedNames = selected.map((id) => getGripById(id)?.name).filter(Boolean);
  const label =
    selectedNames.length > 0
      ? selectedNames.join(', ')
      : 'Choisir les préhensions (optionnel)';

  return (
    <View className="mb-6">
      <Text className="text-stone-400 dark:text-stone-500 text-xs font-semibold uppercase tracking-widest mb-2 ml-1">
        Préhension
      </Text>

      <Pressable
        className="bg-stone-100 dark:bg-stone-800 border border-stone-300 dark:border-stone-700/50 rounded-2xl px-4 py-3.5 flex-row items-center justify-between"
        onPress={() => setOpen(true)}
        style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint="Ouvrir le sélecteur de prises"
      >
        <Text
          className={`flex-1 ${selected.length > 0 ? 'text-stone-900 dark:text-stone-50' : 'text-stone-400 dark:text-stone-500'}`}
          numberOfLines={1}
        >
          {label}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.chevron} />
      </Pressable>

      {selected.some((id) => getGripById(id)?.warning) && (
        <View className="mt-2 ml-1">
          {selected.map((id) => {
            const grip = getGripById(id);
            if (!grip?.warning) return null;
            return (
              <View key={id} className="flex-row items-start mt-1">
                <Ionicons name="warning-outline" size={14} color="#FBBF24" style={{ marginTop: 2, marginRight: 6 }} />
                <Text className="text-amber-600 dark:text-amber-400 text-sm flex-1">
                  {grip.name} : {grip.warning}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      <Modal visible={open} transparent animationType="slide">
        <Pressable
          className="flex-1 bg-black/60"
          onPress={() => setOpen(false)}
          accessibilityLabel="Fermer le sélecteur"
          accessibilityRole="button"
        />
        <View className="bg-stone-50 dark:bg-stone-900 rounded-t-3xl pb-8">
          <View className="flex-row items-center justify-between px-5 py-4 border-b border-stone-300 dark:border-stone-700/50">
            <Text className="text-stone-900 dark:text-stone-50 text-lg font-bold">Préhension</Text>
            <Pressable
              onPress={() => setOpen(false)}
              className="bg-orange-500/20 rounded-xl px-4 py-1.5"
              accessibilityRole="button"
              accessibilityLabel="Confirmer la sélection"
            >
              <Text className="text-orange-400 font-semibold">OK</Text>
            </Pressable>
          </View>

          <FlatList
            data={GRIPS}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const isSelected = selected.includes(item.id);
              const isDisabled = !isSelected && selected.length >= MAX_GRIPS_PER_SESSION;

              return (
                <Pressable
                  className={`flex-row items-center px-5 py-3.5 border-b border-stone-200 dark:border-stone-800 ${
                    isDisabled ? 'opacity-40' : ''
                  }`}
                  onPress={() => {
                    if (!isDisabled) {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      onToggle(item.id);
                    }
                  }}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isSelected }}
                  accessibilityLabel={item.name}
                >
                  <View
                    className={`w-6 h-6 rounded-lg items-center justify-center mr-3 ${
                      isSelected
                        ? 'bg-orange-500'
                        : 'border-2 border-stone-600'
                    }`}
                  >
                    {isSelected && (
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    )}
                  </View>
                  <View className="flex-1">
                    <Text className="text-stone-900 dark:text-stone-50 font-semibold">{item.name}</Text>
                    <Text className="text-stone-400 dark:text-stone-500 text-sm">{item.description}</Text>
                  </View>
                </Pressable>
              );
            }}
          />
        </View>
      </Modal>
    </View>
  );
}
