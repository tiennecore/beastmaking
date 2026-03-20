import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { getProtocolsByFamily, PROTOCOLS } from '@/constants/protocols';
import { loadCustomWorkouts } from '@/lib/storage';
import { useThemeColors } from '@/lib/theme';
import { useTimerStore } from '@/stores/timer-store';
import { CustomWorkout, Protocol, ProtocolFamily } from '@/types';

interface FamilyConfig {
  key: ProtocolFamily;
  label: string;
  subtitle: string;
  color: string;
}

const FAMILIES: FamilyConfig[] = [
  {
    key: 'force',
    label: 'Force',
    color: '#F97316',
    subtitle: 'Développez la force maximale de vos doigts et la puissance de préhension',
  },
  {
    key: 'continuity',
    label: 'Continuité',
    color: '#22D3EE',
    subtitle: 'Améliorez votre endurance pour enchaîner les mouvements sans faiblir',
  },
  {
    key: 'pullups',
    label: 'Tractions',
    color: '#818CF8',
    subtitle: 'Renforcez la chaîne de traction : bras, épaules et dos',
  },
];

interface ProtocolRowProps {
  protocol: Protocol;
  color: string;
  onPress: () => void;
}

function ProtocolRow({ protocol, color, onPress }: ProtocolRowProps) {
  const colors = useThemeColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.98 : 1 }], opacity: pressed ? 0.9 : 1 })}
      accessibilityRole="button"
      accessibilityLabel={`${protocol.name}. ${protocol.summary}`}
    >
      <View className="bg-stone-50 dark:bg-stone-800/50 rounded-2xl px-4 py-3 mb-2 flex-row items-center">
        <Text
          style={{ fontSize: 24 }}
          className="mr-3"
          accessibilityElementsHidden
          importantForAccessibility="no"
        >
          {protocol.icon}
        </Text>
        <View className="flex-1">
          <Text className="text-stone-900 dark:text-stone-50 font-semibold text-sm">
            {protocol.name}
          </Text>
          <Text className="text-stone-500 dark:text-stone-400 text-xs mt-0.5" numberOfLines={1}>
            {protocol.summary}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.chevron} />
      </View>
    </Pressable>
  );
}

interface CollapsibleContentProps {
  expanded: boolean;
  children: React.ReactNode;
}

function CollapsibleContent({ expanded, children }: CollapsibleContentProps) {
  const [contentHeight, setContentHeight] = useState(0);
  const animatedHeight = useSharedValue(0);
  const animatedOpacity = useSharedValue(0);
  const measuredRef = useRef(false);

  useEffect(() => {
    if (expanded && contentHeight > 0) {
      animatedHeight.value = withTiming(contentHeight, {
        duration: 250,
        easing: Easing.out(Easing.cubic),
      });
      animatedOpacity.value = withTiming(1, { duration: 250 });
    } else if (!expanded) {
      animatedHeight.value = withTiming(0, {
        duration: 200,
        easing: Easing.out(Easing.cubic),
      });
      animatedOpacity.value = withTiming(0, { duration: 150 });
    }
  }, [expanded, contentHeight]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: animatedHeight.value,
    opacity: animatedOpacity.value,
    overflow: 'hidden',
  }));

  return (
    <Animated.View style={animatedStyle}>
      <View
        onLayout={(e) => {
          const h = e.nativeEvent.layout.height;
          if (h > 0 && !measuredRef.current) {
            measuredRef.current = true;
            setContentHeight(h);
            if (expanded) {
              animatedHeight.value = withTiming(h, {
                duration: 250,
                easing: Easing.out(Easing.cubic),
              });
              animatedOpacity.value = withTiming(1, { duration: 250 });
            }
          }
        }}
        style={{ position: 'absolute', width: '100%' }}
      >
        {children}
      </View>
    </Animated.View>
  );
}

interface FamilySectionProps {
  family: FamilyConfig;
  onProtocolPress: (id: string) => void;
}

function FamilySection({ family, onProtocolPress }: FamilySectionProps) {
  const [expanded, setExpanded] = useState(false);
  const colors = useThemeColors();
  const protocols = getProtocolsByFamily(family.key);

  const toggle = () => {
    Haptics.selectionAsync();
    setExpanded((prev) => !prev);
  };

  return (
    <View className="mb-4">
      <Pressable
        onPress={toggle}
        style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.98 : 1 }] })}
        accessibilityRole="button"
        accessibilityLabel={`${family.label}. ${family.subtitle}. ${expanded ? 'Replier' : 'Déplier'}`}
        accessibilityState={{ expanded }}
      >
        <View className="bg-stone-100 dark:bg-stone-800 rounded-3xl p-4 border border-stone-300 dark:border-stone-700/50">
          <View className="flex-row items-center">
            <View
              className="w-10 h-10 rounded-2xl items-center justify-center mr-3"
              style={{ backgroundColor: family.color + '20' }}
            >
              <Ionicons
                name={
                  family.key === 'force'
                    ? 'flash-outline'
                    : family.key === 'continuity'
                      ? 'water-outline'
                      : 'barbell-outline'
                }
                size={20}
                color={family.color}
              />
            </View>
            <View className="flex-1">
              <Text
                className="text-stone-900 dark:text-stone-50 font-bold text-base"
                style={{ color: family.color }}
              >
                {family.label}
              </Text>
              <Text className="text-stone-500 dark:text-stone-400 text-xs mt-0.5" numberOfLines={1}>
                {family.subtitle}
              </Text>
            </View>
            <Ionicons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={colors.chevron}
            />
          </View>
        </View>
      </Pressable>

      <CollapsibleContent expanded={expanded}>
        <View className="mt-2 px-1">
          {protocols.map((protocol) => (
            <ProtocolRow
              key={protocol.id}
              protocol={protocol}
              color={family.color}
              onPress={() => onProtocolPress(protocol.id)}
            />
          ))}
        </View>
      </CollapsibleContent>
    </View>
  );
}

interface CustomWorkoutRowProps {
  workout: CustomWorkout;
  onPress: () => void;
}

function CustomWorkoutRow({ workout, onPress }: CustomWorkoutRowProps) {
  const colors = useThemeColors();
  const stepCount = workout.steps.length;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.98 : 1 }], opacity: pressed ? 0.9 : 1 })}
      accessibilityRole="button"
      accessibilityLabel={`${workout.name}. ${stepCount} ${stepCount === 1 ? 'étape' : 'étapes'}`}
    >
      <View className="bg-stone-50 dark:bg-stone-800/50 rounded-2xl px-4 py-3 mb-2 flex-row items-center">
        <Text
          style={{ fontSize: 24 }}
          className="mr-3"
          accessibilityElementsHidden
          importantForAccessibility="no"
        >
          {workout.icon}
        </Text>
        <View className="flex-1">
          <Text className="text-stone-900 dark:text-stone-50 font-semibold text-sm">
            {workout.name}
          </Text>
          <Text className="text-stone-500 dark:text-stone-400 text-xs mt-0.5">
            {stepCount} {stepCount === 1 ? 'étape' : 'étapes'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.chevron} />
      </View>
    </Pressable>
  );
}

interface CustomWorkoutsSectionProps {
  onWorkoutPress: (workout: CustomWorkout) => void;
  onCreatePress: () => void;
}

function CustomWorkoutsSection({ onWorkoutPress, onCreatePress }: CustomWorkoutsSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const [workouts, setWorkouts] = useState<CustomWorkout[]>([]);
  const colors = useThemeColors();

  useFocusEffect(
    useCallback(() => {
      loadCustomWorkouts().then(setWorkouts);
    }, [])
  );

  const toggle = () => {
    Haptics.selectionAsync();
    setExpanded((prev) => !prev);
  };

  return (
    <View className="mb-4">
      <Pressable
        onPress={toggle}
        style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.98 : 1 }] })}
        accessibilityRole="button"
        accessibilityLabel={`Mes entraînements. ${expanded ? 'Replier' : 'Déplier'}`}
        accessibilityState={{ expanded }}
      >
        <View className="bg-stone-100 dark:bg-stone-800 rounded-3xl p-4 border border-stone-300 dark:border-stone-700/50">
          <View className="flex-row items-center">
            <View
              className="w-10 h-10 rounded-2xl items-center justify-center mr-3"
              style={{ backgroundColor: '#F59E0B20' }}
            >
              <Ionicons name="star-outline" size={18} color="#F59E0B" />
            </View>
            <View className="flex-1">
              <Text
                className="text-stone-900 dark:text-stone-50 font-bold text-base"
                style={{ color: '#F59E0B' }}
              >
                Mes entraînements
              </Text>
              <Text className="text-stone-500 dark:text-stone-400 text-xs mt-0.5" numberOfLines={1}>
                Vos séquences personnalisées
              </Text>
            </View>
            <Ionicons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={colors.chevron}
            />
          </View>
        </View>
      </Pressable>

      <CollapsibleContent expanded={expanded}>
        <View className="mt-2 px-1">
          {workouts.length === 0 ? (
            <View className="bg-stone-50 dark:bg-stone-800/50 rounded-2xl px-4 py-5 mb-2 items-center">
              <Text className="text-stone-500 dark:text-stone-400 text-sm mb-3">
                Aucun entraînement personnalisé
              </Text>
              <Pressable
                onPress={onCreatePress}
                style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
                accessibilityRole="button"
                accessibilityLabel="Créer un entraînement"
              >
                <Text className="text-amber-500 font-semibold text-sm">
                  Créer un entraînement
                </Text>
              </Pressable>
            </View>
          ) : (
            workouts.map((workout) => (
              <CustomWorkoutRow
                key={workout.id}
                workout={workout}
                onPress={() => onWorkoutPress(workout)}
              />
            ))
          )}
        </View>
      </CollapsibleContent>
    </View>
  );
}

export default function ProtocolsScreen() {
  const router = useRouter();

  const handleProtocolPress = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/protocol/${id}`);
  };

  const handleWorkoutPress = (workout: CustomWorkout) => {
    const firstStep = workout.steps[0];
    if (!firstStep) return;

    if (firstStep.type === 'protocol') {
      const protocol = PROTOCOLS.find((p) => p.id === firstStep.protocolId);
      if (protocol) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        useTimerStore.getState().setup(
          protocol,
          firstStep.gripMode,
          firstStep.gripConfigs,
          firstStep.config
        );
        router.push('/timer');
        return;
      }
    }

    Alert.alert('Bientôt', 'Le lancement des étapes libres arrive bientôt.');
  };

  const handleCreatePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/create-workout');
  };

  return (
    <ScrollView className="flex-1 bg-white dark:bg-stone-950 px-5 pt-4">
      {FAMILIES.map((family) => (
        <FamilySection
          key={family.key}
          family={family}
          onProtocolPress={handleProtocolPress}
        />
      ))}
      <CustomWorkoutsSection
        onWorkoutPress={handleWorkoutPress}
        onCreatePress={handleCreatePress}
      />
      <View className="h-8" />
    </ScrollView>
  );
}
