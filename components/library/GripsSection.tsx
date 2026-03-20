import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GRIPS } from '@/constants/grips';

export function GripsSection() {
  return (
    <View className="mb-6">
      <Text className="text-stone-900 dark:text-stone-50 text-xl font-bold mb-3">
        Les {GRIPS.length} préhensions
      </Text>
      {GRIPS.map((grip) => (
        <View key={grip.id} className="bg-stone-100 dark:bg-stone-800 rounded-2xl p-4 mb-2">
          <View className="flex-row items-start gap-3">
            <View className="w-16 h-16 rounded-xl bg-stone-200 dark:bg-stone-700 items-center justify-center mb-2">
              <Ionicons name="hand-left-outline" size={24} color="#a8a29e" />
            </View>
            <View className="flex-1">
              <Text className="text-stone-900 dark:text-stone-50 font-bold">{grip.name}</Text>
              <Text className="text-stone-600 dark:text-stone-400 text-base leading-relaxed">
                {grip.type} · {grip.description}
              </Text>
              <Text className="text-stone-600 dark:text-stone-300 text-base leading-relaxed mt-1">
                {grip.keyPoints}
              </Text>
              {grip.warning && (
                <Text className="text-red-500 dark:text-red-400 text-xs mt-1">{grip.warning}</Text>
              )}
            </View>
          </View>
        </View>
      ))}
      <View className="bg-amber-900/30 rounded-2xl p-4 mt-2">
        <Text className="text-amber-700 dark:text-amber-300 font-bold">Règle des ±15°</Text>
        <Text className="text-stone-600 dark:text-stone-300 text-base leading-relaxed">
          On ne gagne en force que dans un intervalle de ±15° autour de l'angle articulaire travaillé. Si les doigts se relâchent, réduisez la charge plutôt que de finir en mauvaise position.
        </Text>
      </View>
    </View>
  );
}
