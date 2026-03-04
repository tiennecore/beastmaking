import { ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ProtocolCard } from '@/components/ProtocolCard';
import { getProtocolsByFamily } from '@/constants/protocols';

const FAMILIES = [
  { key: 'force' as const, label: 'Poutre — Force' },
  { key: 'continuity' as const, label: 'Poutre — Continuité' },
  { key: 'pullups' as const, label: 'Tractions' },
];

export default function ProtocolsScreen() {
  const router = useRouter();

  return (
    <ScrollView className="flex-1 bg-stone-950 px-4 pt-4">
      {FAMILIES.map((family) => (
        <View key={family.key} className="mb-6">
          <Text className="text-white text-xl font-bold mb-3">{family.label}</Text>
          {getProtocolsByFamily(family.key).map((protocol) => (
            <ProtocolCard
              key={protocol.id}
              protocol={protocol}
              onPress={() => router.push(`/protocol/${protocol.id}`)}
            />
          ))}
        </View>
      ))}
      <View className="h-8" />
    </ScrollView>
  );
}
