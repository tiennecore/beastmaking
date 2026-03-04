import { TouchableOpacity, Text, View } from 'react-native';
import { Protocol } from '@/types';

type Props = {
  protocol: Protocol;
  onPress: () => void;
};

const FAMILY_LABELS = {
  force: 'Force',
  continuity: 'Continuité',
  pullups: 'Tractions',
} as const;

export function ProtocolCard({ protocol, onPress }: Props) {
  return (
    <TouchableOpacity
      className="bg-stone-800 border border-stone-700 rounded-2xl p-4 mb-3"
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View className="flex-row items-center justify-between mb-1">
        <Text className="text-white text-lg font-bold flex-1">
          {protocol.icon} {protocol.name}
        </Text>
      </View>
      <Text className="text-stone-400 text-sm mb-2">
        {FAMILY_LABELS[protocol.family]} · {protocol.energySystem}
      </Text>
      <Text className="text-stone-300 text-sm">{protocol.summary}</Text>
    </TouchableOpacity>
  );
}
