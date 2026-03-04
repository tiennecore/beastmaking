import { Text, View } from 'react-native';

const SYSTEMS = [
  { name: 'Aérobie', speed: 'Lente', duration: 'Toute la journée', use: 'Continuité longue', color: 'bg-green-900/30' },
  { name: 'Anaérobie lactique', speed: 'Rapide', duration: '20s à 2min', use: 'Continuité courte', color: 'bg-amber-900/30' },
  { name: 'Anaérobie alactique', speed: 'Instantanée', duration: '< 10s', use: 'Force pure', color: 'bg-red-900/30' },
];

export function EnergySystemsSection() {
  return (
    <View className="mb-6">
      <Text className="text-white text-xl font-bold mb-3">Les 3 filières énergétiques</Text>
      {SYSTEMS.map((s) => (
        <View key={s.name} className={`${s.color} rounded-lg p-3 mb-2`}>
          <Text className="text-white font-bold">{s.name}</Text>
          <Text className="text-neutral-300 text-sm">
            {s.speed} · {s.duration} · {s.use}
          </Text>
        </View>
      ))}
    </View>
  );
}
