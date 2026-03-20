import { Text, View } from 'react-native';

const PRINCIPLES = [
  { name: 'Surcharge', desc: "L'intensité doit être difficile à soutenir pour créer une adaptation." },
  { name: 'Progressivité', desc: "Répéter le même exercice à la même intensité ne produit aucune amélioration." },
  { name: 'Répétition', desc: "Une seule séance ne suffit pas. L'adaptation demande du temps et de la régularité." },
  { name: 'Récupération', desc: "Le corps ne s'adapte que s'il a le temps de se réparer entre les séances." },
  { name: 'Spécificité', desc: "Les exercices doivent être spécifiques à l'escalade pour produire des progrès." },
  { name: 'Réversibilité', desc: "Tout gain physique disparaît progressivement à l'arrêt de l'entraînement." },
];

export function PrinciplesSection() {
  return (
    <View className="mb-6">
      <Text className="text-stone-900 dark:text-stone-50 text-xl font-bold mb-3">Les 6 principes</Text>
      {PRINCIPLES.map((p, i) => (
        <View key={p.name} className="bg-stone-100 dark:bg-stone-800 rounded-2xl p-4 mb-2">
          <Text className="text-stone-900 dark:text-stone-50 font-bold">{i + 1}. {p.name}</Text>
          <Text className="text-stone-600 dark:text-stone-400 text-base leading-relaxed">{p.desc}</Text>
        </View>
      ))}
    </View>
  );
}
