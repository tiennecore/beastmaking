import { Text, View } from 'react-native';
import { GRIPS } from '@/constants/grips';

export function GripsSection() {
  return (
    <View className="mb-6">
      <Text className="text-stone-900 dark:text-stone-50 text-xl font-bold mb-3">Les 5 préhensions</Text>
      {GRIPS.map((grip) => (
        <View key={grip.id} className="bg-stone-100 dark:bg-stone-800 rounded-2xl p-3 mb-2">
          <Text className="text-stone-900 dark:text-stone-50 font-bold">{grip.name}</Text>
          <Text className="text-stone-500 dark:text-stone-400 text-sm">{grip.type} · {grip.description}</Text>
          <Text className="text-stone-600 dark:text-stone-300 text-sm mt-1">{grip.keyPoints}</Text>
        </View>
      ))}
      <View className="bg-amber-900/30 rounded-2xl p-3 mt-2">
        <Text className="text-amber-300 font-bold">Règle des ±15°</Text>
        <Text className="text-stone-600 dark:text-stone-300 text-sm">
          On ne gagne en force que dans un intervalle de ±15° autour de l'angle articulaire travaillé. Si les doigts se relâchent, réduisez la charge plutôt que de finir en mauvaise position.
        </Text>
      </View>
    </View>
  );
}
