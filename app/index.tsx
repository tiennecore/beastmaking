import { View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '@/lib/theme';

type MenuItemConfig = {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  href: string;
  color: string;
};

const ITEMS: Record<string, MenuItemConfig> = {
  protocols: {
    title: 'Hangboarding',
    subtitle: '9 protocoles Beastmaking',
    icon: 'barbell-outline',
    href: '/protocols',
    color: '#F97316',
  },
  create: {
    title: 'Créer',
    subtitle: 'Nouveau workout',
    icon: 'add-circle-outline',
    href: '/create-workout',
    color: '#FBBF24',
  },
  custom: {
    title: 'Mes workouts',
    subtitle: 'Personnalisés',
    icon: 'star-outline',
    href: '/custom-workouts',
    color: '#F59E0B',
  },
  plans: {
    title: 'Plans',
    subtitle: "Programmes d'entraînement hebdomadaires",
    icon: 'calendar-outline',
    href: '/plans',
    color: '#A855F7',
  },
  library: {
    title: 'Comprendre',
    subtitle: 'Principes, systèmes, préhensions',
    icon: 'book-outline',
    href: '/library',
    color: '#22D3EE',
  },
  journal: {
    title: 'Suivi',
    subtitle: 'Poutre, bloc, voie',
    icon: 'stats-chart-outline',
    href: '/journal',
    color: '#818CF8',
  },
  statistics: {
    title: 'Statistiques',
    subtitle: 'Évolution et progression',
    icon: 'bar-chart-outline',
    href: '/statistics',
    color: '#10B981',
  },
};

function SectionLabel({ text }: { text: string }) {
  return (
    <Text
      className="text-stone-400 dark:text-stone-500 text-xs font-semibold uppercase tracking-widest mb-3 ml-1"
      accessibilityRole="header"
    >
      {text}
    </Text>
  );
}

function HeroCard({ item, onPress }: { item: MenuItemConfig; onPress: () => void }) {
  const colors = useThemeColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}. ${item.subtitle}`}
    >
      <View className="bg-stone-100 dark:bg-stone-800 rounded-3xl p-5 overflow-hidden border border-stone-300 dark:border-stone-700/50">
        <LinearGradient
          colors={[item.color + '18', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
        />
        <View className="flex-row items-center">
          <View
            className="w-14 h-14 rounded-2xl items-center justify-center mr-4"
            style={{ backgroundColor: item.color + '20' }}
          >
            <Ionicons name={item.icon} size={28} color={item.color} />
          </View>
          <View className="flex-1">
            <Text className="text-stone-900 dark:text-stone-50 text-xl font-bold">{item.title}</Text>
            <Text className="text-stone-500 dark:text-stone-400 text-sm mt-0.5">{item.subtitle}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.chevron} />
        </View>
      </View>
    </Pressable>
  );
}

function TileCard({ item, onPress }: { item: MenuItemConfig; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-1"
      style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.96 : 1 }] })}
    >
      <View className="bg-stone-100 dark:bg-stone-800 rounded-3xl p-4 border border-stone-300 dark:border-stone-700/50">
        <View
          className="w-11 h-11 rounded-xl items-center justify-center mb-3"
          style={{ backgroundColor: item.color + '20' }}
        >
          <Ionicons name={item.icon} size={22} color={item.color} />
        </View>
        <Text className="text-stone-900 dark:text-stone-50 font-bold text-base">{item.title}</Text>
        <Text className="text-stone-400 dark:text-stone-500 text-xs mt-1">{item.subtitle}</Text>
      </View>
    </Pressable>
  );
}

function ListCard({ item, onPress }: { item: MenuItemConfig; onPress: () => void }) {
  const colors = useThemeColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}
    >
      <View className="bg-stone-100 dark:bg-stone-800 rounded-3xl p-4 flex-row items-center border border-stone-300 dark:border-stone-700/50">
        <View
          className="w-11 h-11 rounded-xl items-center justify-center mr-4"
          style={{ backgroundColor: item.color + '20' }}
        >
          <Ionicons name={item.icon} size={22} color={item.color} />
        </View>
        <View className="flex-1">
          <Text className="text-stone-900 dark:text-stone-50 font-bold text-base">{item.title}</Text>
          <Text className="text-stone-500 dark:text-stone-400 text-sm mt-0.5">{item.subtitle}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.chevron} />
      </View>
    </Pressable>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  const go = (href: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(href as any);
  };

  return (
    <ScrollView
      className="flex-1 bg-white dark:bg-stone-950 px-5"
      contentContainerStyle={{ paddingTop: insets.top + 16 }}
    >
      <View className="flex-row items-start justify-between mb-8">
        <View>
          <Text className="text-stone-900 dark:text-stone-50 text-4xl font-bold tracking-tight">
            Beastmaking
          </Text>
          <Text className="text-stone-400 dark:text-stone-500 text-base">
            Timer d'entraînement escalade
          </Text>
        </View>
        <Pressable
          onPress={() => go('/settings')}
          className="w-12 h-12 rounded-full bg-stone-100 dark:bg-stone-800 items-center justify-center border border-stone-300 dark:border-stone-700/50"
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
        >
          <Ionicons name="settings-outline" size={20} color={colors.textMuted} />
        </Pressable>
      </View>

      {/* Hero — main action */}
      <HeroCard item={ITEMS.protocols} onPress={() => go('/protocols')} />

      {/* Grid — create & custom */}
      <View className="flex-row gap-3 mt-4">
        <TileCard item={ITEMS.create} onPress={() => go('/create-workout')} />
        <TileCard item={ITEMS.custom} onPress={() => go('/custom-workouts')} />
      </View>

      {/* Plans */}
      <View className="mt-4">
        <ListCard item={ITEMS.plans} onPress={() => go('/plans')} />
      </View>

      {/* Section: Apprendre */}
      <View className="mt-8">
        <SectionLabel text="Apprendre" />
        <ListCard item={ITEMS.library} onPress={() => go('/library')} />
      </View>

      {/* Section: Suivi */}
      <View className="mt-8">
        <SectionLabel text="Suivi" />
        <View className="gap-3">
          <ListCard item={ITEMS.journal} onPress={() => go('/journal')} />
          <ListCard item={ITEMS.statistics} onPress={() => go('/statistics')} />
        </View>
      </View>

      <View className="h-20" />
    </ScrollView>
  );
}
