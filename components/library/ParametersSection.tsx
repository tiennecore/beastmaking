import { Text, View } from 'react-native';

export function ParametersSection() {
  return (
    <View className="mb-6">
      <Text className="text-white text-xl font-bold mb-3">Paramètres modulables</Text>
      <View className="bg-red-900/20 rounded-lg p-3 mb-2">
        <Text className="text-red-400 font-bold mb-1">Augmenter la difficulté</Text>
        <Text className="text-neutral-300 text-sm">
          {'\u2022'} Prise plus petite{'\n'}{'\u2022'} Durée de suspension plus longue{'\n'}{'\u2022'} Ajouter du poids{'\n'}{'\u2022'} Moins de doigts{'\n'}{'\u2022'} Un seul bras{'\n'}{'\u2022'} Réduire les repos
        </Text>
      </View>
      <View className="bg-green-900/20 rounded-lg p-3 mb-2">
        <Text className="text-green-400 font-bold mb-1">Réduire la difficulté</Text>
        <Text className="text-neutral-300 text-sm">
          {'\u2022'} Prises plus grosses{'\n'}{'\u2022'} Durée plus courte{'\n'}{'\u2022'} Délester (poulie, élastique, pied sur chaise){'\n'}{'\u2022'} Allonger les repos
        </Text>
      </View>
      <View className="bg-neutral-800 rounded-lg p-3">
        <Text className="text-amber-300 font-bold mb-1">Conseil peau</Text>
        <Text className="text-neutral-300 text-sm">
          Éviter les micro-réglettes en continu. Alterner : grosses prises lestées / petites prises sans lest.
        </Text>
      </View>
    </View>
  );
}
