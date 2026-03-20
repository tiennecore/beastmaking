import { useCallback, useRef, useState, useEffect } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import { getProtocolsByFamily, PROTOCOLS } from '@/constants/protocols';
import { loadCustomWorkouts } from '@/lib/storage';
import { useThemeColors } from '@/lib/theme';
import { useTimerStore } from '@/stores/timer-store';
import { CustomWorkout, Protocol } from '@/types';

const FAMILIES = [
  { key: 'force' as const, label: 'Force', color: '#F97316' },
  { key: 'continuity' as const, label: 'Continuité', color: '#22D3EE' },
  { key: 'pullups' as const, label: 'Tractions', color: '#818CF8' },
];

function ProtocolRow({
  protocol,
  familyColor,
  onPress,
}: {
  protocol: Protocol;
  familyColor: string;
  onPress: () => void;
}) {
  const colors = useThemeColors();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}
      accessibilityRole="button"
      accessibilityLabel={`${protocol.name}. ${protocol.summary}`}
    >
      <View className="bg-white dark:bg-stone-900 rounded-2xl px-4 py-3 mb-2 flex-row items-center border border-stone-200 dark:border-stone-700/50">
        <View
          className="w-10 h-10 rounded-xl items-center justify-center mr-3"
          style={{ backgroundColor: familyColor + '20' }}
        >
          <Text className="text-xl">{protocol.icon}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-stone-900 dark:text-stone-50 font-semibold text-sm">{protocol.name}</Text>
          <Text className="text-stone-400 dark:text-stone-500 text-xs mt-0.5" numberOfLines={1}>
            {protocol.summary}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.chevron} />
      </View>
    </Pressable>
  );
}

function WorkoutRow({
  workout,
  onPress,
}: {
  workout: CustomWorkout;
  onPress: () => void;
}) {
  const stepCount = workout.steps.length;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}
      accessibilityRole="button"
      accessibilityLabel={`${workout.name}, ${stepCount} étape${stepCount > 1 ? 's' : ''}`}
    >
      <View className="bg-white dark:bg-stone-900 rounded-2xl px-4 py-3 mb-2 flex-row items-center border border-stone-200 dark:border-stone-700/50">
        <View className="w-10 h-10 rounded-xl bg-indigo-500/10 items-center justify-center mr-3">
          <Text className="text-xl">{workout.icon}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-stone-900 dark:text-stone-50 font-semibold text-sm">{workout.name}</Text>
          <Text className="text-stone-400 dark:text-stone-500 text-xs mt-0.5">
            {stepCount} étape{stepCount > 1 ? 's' : ''}
          </Text>
        </View>
        <Ionicons name="play-circle" size={28} color="#6366F1" />
      </View>
    </Pressable>
  );
}

function EmptyWorkouts({ onCreatePress }: { onCreatePress: () => void }) {
  return (
    <View className="items-center py-6 mb-2">
      <Text className="text-stone-400 dark:text-stone-500 text-sm mb-3 text-center">
        Aucun entraînement personnalisé
      </Text>
      <Pressable
        onPress={onCreatePress}
        style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}
        className="bg-indigo-500 rounded-xl px-5 py-2.5"
        accessibilityRole="button"
      >
        <Text className="text-white font-semibold text-sm">Créer un entraînement</Text>
      </Pressable>
    </View>
  );
}

function CollapsibleContent({
  expanded,
  children,
}: {
  expanded: boolean;
  children: React.ReactNode;
}) {
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

function CollapsibleSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const colors = useThemeColors();
  const [expanded, setExpanded] = useState(false);

  function handleToggle() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpanded((prev) => !prev);
  }

  return (
    <View className="mb-3">
      <Pressable
        onPress={handleToggle}
        style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
        className="flex-row items-center justify-between py-3 px-4 bg-stone-100 dark:bg-stone-800 rounded-2xl border border-stone-300 dark:border-stone-700/50 mb-2"
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${label}, section ${expanded ? 'ouverte' : 'fermée'}`}
      >
        <Text className="text-stone-900 dark:text-stone-50 font-bold text-base">{label}</Text>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.chevron}
        />
      </Pressable>

      <CollapsibleContent expanded={expanded}>
        {children}
      </CollapsibleContent>
    </View>
  );
}

export default function AddHangboardScreen() {
  const [customWorkouts, setCustomWorkouts] = useState<CustomWorkout[]>([]);
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      loadCustomWorkouts().then(setCustomWorkouts);
    }, [])
  );

  function handleProtocolPress(protocol: Protocol) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/protocol/${protocol.id}`);
  }

  function handleWorkoutPress(workout: CustomWorkout) {
    const firstStep = workout.steps[0];
    if (!firstStep) return;

    if (firstStep.type === 'protocol') {
      const protocol = PROTOCOLS.find((p) => p.id === firstStep.protocolId);
      if (protocol) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        useTimerStore.getState().setup(
          protocol,
          firstStep.gripMode ?? 'session',
          firstStep.gripConfigs ?? [],
          firstStep.config,
        );
        router.push('/timer');
        return;
      }
    }

    Alert.alert('Bientôt', 'Le lancement des étapes libres arrive bientôt.');
  }

  function handleCreateWorkout() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/create-workout');
  }

  return (
    <ScrollView
      className="flex-1 bg-white dark:bg-stone-950 px-5 pt-4"
      contentInsetAdjustmentBehavior="automatic"
    >
      {FAMILIES.map((family) => (
        <CollapsibleSection key={family.key} label={family.label}>
          {getProtocolsByFamily(family.key).map((protocol) => (
            <ProtocolRow
              key={protocol.id}
              protocol={protocol}
              familyColor={family.color}
              onPress={() => handleProtocolPress(protocol)}
            />
          ))}
        </CollapsibleSection>
      ))}

      <CollapsibleSection label="Mes entraînements">
        {customWorkouts.length === 0 ? (
          <EmptyWorkouts onCreatePress={handleCreateWorkout} />
        ) : (
          customWorkouts.map((workout) => (
            <WorkoutRow
              key={workout.id}
              workout={workout}
              onPress={() => handleWorkoutPress(workout)}
            />
          ))
        )}
      </CollapsibleSection>

      <View className="h-8" />
    </ScrollView>
  );
}
