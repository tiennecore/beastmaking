import { View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';

type MenuItem = {
  title: string;
  subtitle: string;
  icon: string;
  href: string;
  color: string;
};

const MENU_ITEMS: MenuItem[] = [
  {
    title: 'Entrainements',
    subtitle: '9 protocoles Beastmaking',
    icon: '💪',
    href: '/protocols',
    color: '#F97316',
  },
  {
    title: 'Creer un entrainement',
    subtitle: 'Composer ou creer de zero',
    icon: '✏️',
    href: '/create-workout',
    color: '#FBBF24',
  },
  {
    title: 'Mes entrainements',
    subtitle: 'Entrainements personnalises',
    icon: '⭐',
    href: '/custom-workouts',
    color: '#F59E0B',
  },
  {
    title: 'Comprendre',
    subtitle: 'Principes, systemes, prehensions',
    icon: '📖',
    href: '/library',
    color: '#22D3EE',
  },
  {
    title: 'Historique',
    subtitle: 'Seances passees',
    icon: '📊',
    href: '/history',
    color: '#818CF8',
  },
  {
    title: 'Grimpe',
    subtitle: 'Bloc, voie, renfo',
    icon: '🧗',
    href: '/climbing',
    color: '#A3E635',
  },
];

export default function HomeScreen() {
  const router = useRouter();

  return (
    <ScrollView className="flex-1 bg-stone-950 px-4 pt-12">
      <Text className="text-stone-50 text-3xl font-bold tracking-tight mb-1">
        Beastmaking
      </Text>
      <Text className="text-stone-400 mb-8">Timer d'entrainement escalade</Text>

      <View className="gap-3">
        {MENU_ITEMS.map((item) => (
          <Pressable
            key={item.href}
            className="bg-stone-800 rounded-2xl p-4 flex-row items-center border border-stone-700 active:bg-stone-700"
            style={{ borderLeftWidth: 3, borderLeftColor: item.color }}
            onPress={() => router.push(item.href as any)}
          >
            <Text className="text-3xl mr-4">{item.icon}</Text>
            <View className="flex-1">
              <Text className="text-stone-50 text-lg font-bold">{item.title}</Text>
              <Text className="text-stone-400 text-sm">{item.subtitle}</Text>
            </View>
            <Text className="text-stone-500 text-xl">›</Text>
          </Pressable>
        ))}
      </View>

      <View className="h-12" />
    </ScrollView>
  );
}
