import { TouchableOpacity, Text, View } from 'react-native';
import { GripType } from '@/types';
import { GRIPS, MAX_GRIPS_PER_SESSION } from '@/constants/grips';

type Props = {
  selected: GripType[];
  onToggle: (grip: GripType) => void;
  showForPullups?: boolean;
};

export function GripSelector({ selected, onToggle, showForPullups }: Props) {
  if (showForPullups) return null;

  return (
    <View className="mb-6">
      <Text className="text-white text-lg font-bold mb-1">Prehension</Text>
      <Text className="text-neutral-400 text-sm mb-3">
        Maximum {MAX_GRIPS_PER_SESSION} par seance
      </Text>
      {GRIPS.map((grip) => {
        const isSelected = selected.includes(grip.id);
        const isDisabled = !isSelected && selected.length >= MAX_GRIPS_PER_SESSION;

        return (
          <TouchableOpacity
            key={grip.id}
            className={`rounded-lg p-3 mb-2 border ${
              isSelected
                ? 'bg-red-900/30 border-red-500'
                : isDisabled
                ? 'bg-neutral-800/50 border-neutral-700 opacity-50'
                : 'bg-neutral-800 border-neutral-700'
            }`}
            onPress={() => !isDisabled && onToggle(grip.id)}
            activeOpacity={isDisabled ? 1 : 0.7}
          >
            <Text className="text-white font-semibold">{grip.name}</Text>
            <Text className="text-neutral-400 text-sm">{grip.description}</Text>
            {grip.warning && isSelected && (
              <Text className="text-amber-400 text-sm mt-1">{grip.warning}</Text>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
