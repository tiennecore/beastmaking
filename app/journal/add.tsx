import { View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '@/lib/theme';

type ActivityConfig = {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  href: string;
  color: string;
};

const ACTIVITIES: ActivityConfig[] = [
  {
    title: 'Bloc',
    subtitle: 'Séance de bloc route par route',
    icon: 'cube-outline',
    color: '#F97316',
    href: '/journal/add-bloc',
  },
  {
    title: 'Voie',
    subtitle: 'Libre, continuité longue ou courte',
    icon: 'trending-up-outline',
    color: '#2563EB',
    href: '/journal/add-voie',
  },
  {
    title: 'Hangboard',
    subtitle: 'Protocoles et mes entraînements',
    icon: 'hand-left-outline',
    color: '#818CF8',
    href: '/journal/add-hangboard',
  },
];

interface ActivityCardProps {
  activity: ActivityConfig;
  onPress: () => void;
}

function ActivityCard({ activity, onPress }: ActivityCardProps) {
  const colors = useThemeColors();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}
      accessibilityRole="button"
      accessibilityLabel={`${activity.title}. ${activity.subtitle}`}
    >
      <View className="bg-stone-100 dark:bg-stone-800 rounded-3xl p-5 overflow-hidden border border-stone-300 dark:border-stone-700/50">
        <LinearGradient
          colors={[activity.color + '18', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
        <View className="flex-row items-center">
          <View
            className="w-14 h-14 rounded-2xl items-center justify-center mr-4"
            style={{ backgroundColor: activity.color + '20' }}
          >
            <Ionicons name={activity.icon} size={28} color={activity.color} />
          </View>
          <View className="flex-1">
            <Text className="text-stone-900 dark:text-stone-50 text-xl font-bold">
              {activity.title}
            </Text>
            <Text className="text-stone-500 dark:text-stone-400 text-sm mt-0.5">
              {activity.subtitle}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.chevron} />
        </View>
      </View>
    </Pressable>
  );
}

export default function AddActivityScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handlePress = (href: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(href as any);
  };

  return (
    <ScrollView
      className="flex-1 bg-white dark:bg-stone-950 px-5"
      contentContainerStyle={{ paddingTop: insets.top > 0 ? 8 : 16 }}
    >
      <View className="gap-3">
        {ACTIVITIES.map((activity) => (
          <ActivityCard
            key={activity.href}
            activity={activity}
            onPress={() => handlePress(activity.href)}
          />
        ))}
      </View>

      <View className="h-10" />
    </ScrollView>
  );
}
