import { Text, View, Pressable, Modal, FlatList } from 'react-native';
import { useState } from 'react';
import { GripType } from '@/types';
import { GRIPS, MAX_GRIPS_PER_SESSION, getGripById } from '@/constants/grips';

type Props = {
  selected: GripType[];
  onToggle: (grip: GripType) => void;
};

export function GripSelector({ selected, onToggle }: Props) {
  const [open, setOpen] = useState(false);

  const selectedNames = selected.map((id) => getGripById(id)?.name).filter(Boolean);
  const label =
    selectedNames.length > 0
      ? selectedNames.join(', ')
      : 'Choisir les préhensions…';

  return (
    <View className="mb-6">
      <Text className="text-white text-lg font-bold mb-3">Préhension</Text>

      <Pressable
        className="bg-stone-800 border border-stone-700 rounded-xl px-4 py-3 flex-row items-center justify-between"
        onPress={() => setOpen(true)}
      >
        <Text
          className={`flex-1 ${selected.length > 0 ? 'text-white' : 'text-stone-500'}`}
          numberOfLines={1}
        >
          {label}
        </Text>
        <Text className="text-stone-400 ml-2">▼</Text>
      </Pressable>

      {selected.some((id) => getGripById(id)?.warning) && (
        <View className="mt-2">
          {selected.map((id) => {
            const grip = getGripById(id);
            if (!grip?.warning) return null;
            return (
              <Text key={id} className="text-amber-400 text-sm">
                ⚠ {grip.name} : {grip.warning}
              </Text>
            );
          })}
        </View>
      )}

      <Modal visible={open} transparent animationType="slide">
        <Pressable
          className="flex-1 bg-black/60"
          onPress={() => setOpen(false)}
        />
        <View className="bg-stone-950 rounded-t-2xl pb-8">
          <View className="flex-row items-center justify-between px-4 py-3 border-b border-stone-700">
            <Text className="text-white text-lg font-bold">Préhension</Text>
            <Pressable onPress={() => setOpen(false)}>
              <Text className="text-red-400 font-semibold text-base">OK</Text>
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
                  className={`flex-row items-center px-4 py-3 border-b border-stone-700 ${
                    isDisabled ? 'opacity-40' : ''
                  }`}
                  onPress={() => {
                    if (!isDisabled) onToggle(item.id);
                  }}
                >
                  <View
                    className={`w-6 h-6 rounded-md border-2 items-center justify-center mr-3 ${
                      isSelected
                        ? 'bg-orange-500 border-orange-500'
                        : 'border-stone-600'
                    }`}
                  >
                    {isSelected && (
                      <Text className="text-white text-xs font-bold">✓</Text>
                    )}
                  </View>
                  <View className="flex-1">
                    <Text className="text-white font-semibold">{item.name}</Text>
                    <Text className="text-stone-400 text-sm">{item.description}</Text>
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
