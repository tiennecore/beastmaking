import { Text, View } from 'react-native';

const STEPS = [
  {
    title: 'Étape 1 — Découverte de la position',
    desc: "Saisir le bord d'un objet (table, chambranle). Placer les doigts en arqué (IPP à angle droit) en tirant doucement. Répéter pendant plusieurs jours ou semaines.",
  },
  {
    title: 'Étape 2 — Monter en charge (1 main)',
    desc: "Après échauffement : debout sous une réglette, empoigner en arqué avec le pouce et tirer. Garder les pieds au sol. Tenir 10s de chaque côté, 5 séries par main.",
  },
  {
    title: 'Étape 3 — Suspension à deux mains',
    desc: "Soutenir le poids du corps en arqué avec le pouce et les deux mains. Commencer avec charge réduite et augmenter progressivement.",
  },
];

export function CrimpLearningSection() {
  return (
    <View className="mb-6">
      <Text className="text-white text-xl font-bold mb-3">Apprendre l'arqué</Text>
      {STEPS.map((step, i) => (
        <View key={i} className="bg-stone-800 rounded-xl p-3 mb-2">
          <Text className="text-white font-bold">{step.title}</Text>
          <Text className="text-stone-400 text-sm">{step.desc}</Text>
        </View>
      ))}
    </View>
  );
}
