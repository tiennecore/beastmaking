import { ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ProtocolCard } from '@/components/ProtocolCard';
import { getProtocolsByFamily } from '@/constants/protocols';
import * as Haptics from 'expo-haptics';

const FAMILIES = [
  { key: 'force' as const, label: 'Force', color: '#F97316', subtitle: 'Développez la force maximale de vos doigts et la puissance de préhension' },
  { key: 'continuity' as const, label: 'Continuité', color: '#22D3EE', subtitle: 'Améliorez votre endurance pour enchaîner les mouvements sans faiblir' },
  { key: 'pullups' as const, label: 'Tractions', color: '#818CF8', subtitle: 'Renforcez la chaîne de traction : bras, épaules et dos' },
];

export default function ProtocolsScreen() {
  const router = useRouter();

  return (
    <ScrollView className="flex-1 bg-white dark:bg-stone-950 px-5 pt-4">
      {FAMILIES.map((family) => (
        <View key={family.key} className="mb-8">
          <Text
            className="text-stone-400 dark:text-stone-500 text-xs font-semibold uppercase tracking-widest mb-1 ml-1"
            accessibilityRole="header"
          >
            {family.label}
          </Text>
          <Text className="text-stone-400 dark:text-stone-500 text-xs ml-1 mb-3">
            {family.subtitle}
          </Text>
          <View className="gap-3">
            {getProtocolsByFamily(family.key).map((protocol) => (
              <ProtocolCard
                key={protocol.id}
                protocol={protocol}
                familyColor={family.color}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push(`/protocol/${protocol.id}`);
                }}
              />
            ))}
          </View>
        </View>
      ))}
      <View className="h-8" />
    </ScrollView>
  );
}
