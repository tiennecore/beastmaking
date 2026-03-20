import React, { useRef, useState } from 'react';
import { ScrollView, Text, View, Pressable } from 'react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getProtocolById } from '@/constants/protocols';
import { GripConfigSection } from '@/components/GripConfigSection';
import { TimerConfigForm } from '@/components/TimerConfigForm';
import { useTimerStore } from '@/stores/timer-store';
import { useThemeColors } from '@/lib/theme';
import { Difficulty, EnergySystem, GripMode, GripConfig, TimerConfig, HoldType, Protocol, InfoNotes } from '@/types';

const difficultyLabels: Record<Difficulty, { label: string; color: string }> = {
  beginner: { label: 'Débutant', color: 'text-green-600 dark:text-green-400' },
  intermediate: { label: 'Intermédiaire', color: 'text-amber-600 dark:text-amber-400' },
  advanced: { label: 'Avancé', color: 'text-red-600 dark:text-red-400' },
};

const energySystemLabels: Record<EnergySystem, string> = {
  alactic: 'Anaérobie alactique',
  lactic: 'Anaérobie lactique',
  aerobic: 'Aérobie',
};

function buildInfoNotes(protocol: Protocol): InfoNotes {
  const notes: InfoNotes = {};

  if (!protocol.usageGuide) return notes;

  for (const section of protocol.usageGuide) {
    const title = section.title.toLowerCase();
    if (title === 'descriptif') {
      notes.hangDuration = section.content;
    } else if (title === 'séries' || title.includes('série')) {
      notes.sets = section.content;
    } else if (title === 'repos' || title.includes('récupération')) {
      notes.restBetweenSets = section.content;
    }
  }

  return notes;
}

export default function ProtocolConfigScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const setup = useTimerStore((s) => s.setup);
  const protocol = getProtocolById(id);

  const recommendation = protocol?.gripRecommendation;

  const [gripMode, setGripMode] = useState<GripMode>(recommendation?.mode ?? 'session');
  const [gripConfigs, setGripConfigs] = useState<GripConfig[]>(() => {
    if (recommendation?.mode === 'perSet' && recommendation.defaultGrips && protocol) {
      return recommendation.defaultGrips.slice(0, protocol.defaults.sets).map((g) => ({
        grip: g,
        hold: 'crimp20' as HoldType,
        loadKg: 0,
        angleDeg: 0,
      }));
    }
    return [{ grip: 'halfCrimp', hold: 'crimp20' as HoldType, loadKg: 0, angleDeg: 0 }];
  });
  const [config, setConfig] = useState<TimerConfig>(() => protocol?.defaults ?? {
    prepDuration: 5,
    hangDuration: 10,
    restBetweenReps: 150,
    reps: 4,
    sets: 3,
    restBetweenSets: 180,
  });
  const colors = useThemeColors();
  const scrollViewRef = useRef<ScrollView>(null);
  const advancedY = useRef(0);

  const [showFullDescription, setShowFullDescription] = useState(false);
  const [showTips, setShowTips] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isAdvancedMounted, setIsAdvancedMounted] = useState(false);

  const ADVANCED_EXIT_MS = 200;
  const ADVANCED_ENTER_MS = 300;

  const toggleAdvanced = () => {
    if (!showAdvanced) {
      setIsAdvancedMounted(true);
      setShowAdvanced(true);
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: advancedY.current, animated: true });
      }, 100);
    } else {
      setShowAdvanced(false);
      setTimeout(() => setIsAdvancedMounted(false), ADVANCED_EXIT_MS);
    }
  };

  if (!protocol) {
    return (
      <View className="flex-1 bg-white dark:bg-stone-950 items-center justify-center">
        <Text className="text-stone-900 dark:text-stone-50">Protocole introuvable</Text>
      </View>
    );
  }

  const handleStart = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (showAdvanced) {
      setup(protocol, gripMode, gripConfigs, config);
    } else {
      setup(protocol, 'session', [{ grip: 'halfCrimp', hold: 'crimp20' as HoldType, loadKg: 0, angleDeg: 0 }], config);
    }
    router.push('/timer');
  };

  return (
    <View className="flex-1 bg-white dark:bg-stone-950">
      <ScrollView ref={scrollViewRef} className="flex-1 px-5 pt-4" contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Protocol header */}
        <View className="flex-row items-center mb-2">
          <View className="w-12 h-12 rounded-2xl bg-orange-500/20 items-center justify-center mr-3">
            <Text className="text-2xl">{protocol.icon}</Text>
          </View>
          <View className="flex-1">
            <Text className="text-stone-900 dark:text-stone-50 text-2xl font-bold">{protocol.name}</Text>
          </View>
        </View>
        <Text className="text-stone-500 dark:text-stone-400 mb-2 ml-1">{protocol.summary}</Text>

        {/* Collapsible description + info grid */}
        <Pressable
          onPress={() => setShowFullDescription(!showFullDescription)}
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
        >
          <Text
            className="text-stone-600 dark:text-stone-300 text-sm leading-5 ml-1"
            numberOfLines={showFullDescription ? undefined : 2}
          >
            {protocol.description}
          </Text>
          {!showFullDescription && (
            <Text className="text-orange-500 text-sm font-medium ml-1 mt-1 mb-4">Voir plus</Text>
          )}
        </Pressable>

        {showFullDescription && (
          <>
            <View className="flex-row gap-3 mb-4 mt-3">
              <View className="flex-1">
                <Text className="text-xs font-semibold uppercase text-stone-400 dark:text-stone-500 mb-1">
                  Difficulté
                </Text>
                <Text className={`text-sm font-medium ${difficultyLabels[protocol.difficulty].color}`}>
                  {difficultyLabels[protocol.difficulty].label}
                </Text>
              </View>

              <View className="w-px bg-stone-200 dark:bg-stone-700" />

              <View className="flex-1">
                <Text className="text-xs font-semibold uppercase text-stone-400 dark:text-stone-500 mb-1">
                  Filière
                </Text>
                <Text className="text-sm font-medium text-stone-800 dark:text-stone-200">
                  {energySystemLabels[protocol.energySystem]}
                </Text>
              </View>

              <View className="w-px bg-stone-200 dark:bg-stone-700" />

              <View className="flex-1">
                <Text className="text-xs font-semibold uppercase text-stone-400 dark:text-stone-500 mb-1">
                  Cibles
                </Text>
                <Text className="text-sm font-medium text-stone-800 dark:text-stone-200">
                  {protocol.targetedQualities.join(', ')}
                </Text>
              </View>
            </View>
            <Pressable onPress={() => setShowFullDescription(false)}>
              <Text className="text-orange-500 text-sm font-medium ml-1 mb-4">Voir moins</Text>
            </Pressable>
          </>
        )}

        <TimerConfigForm config={config} onChange={setConfig} infoNotes={buildInfoNotes(protocol)} scrollViewRef={scrollViewRef} />

        {/* Advanced options divider */}
        <Pressable
          onPress={toggleAdvanced}
          onLayout={(e) => { advancedY.current = e.nativeEvent.layout.y; }}
          className="flex-row items-center gap-3 mb-4"
          accessibilityRole="button"
          accessibilityLabel={showAdvanced ? 'Masquer les options avancées' : 'Afficher les options avancées'}
          accessibilityState={{ expanded: showAdvanced }}
        >
          <View className="flex-1 h-px bg-stone-300 dark:bg-stone-700" />
          <View className="flex-row items-center gap-1.5">
            <Text className="text-stone-400 dark:text-stone-500 text-xs font-semibold uppercase tracking-wide">
              Options avancées
            </Text>
            <Ionicons
              name={showAdvanced ? 'chevron-up' : 'chevron-down'}
              size={14}
              color={colors.textMuted}
            />
          </View>
          <View className="flex-1 h-px bg-stone-300 dark:bg-stone-700" />
        </Pressable>

        {isAdvancedMounted && (
          <Animated.View entering={FadeInDown.duration(ADVANCED_ENTER_MS)} exiting={FadeOutUp.duration(ADVANCED_EXIT_MS)}>
            <GripConfigSection
              gripMode={gripMode}
              gripConfigs={gripConfigs}
              sets={config.sets}
              onChangeMode={setGripMode}
              onChangeConfigs={setGripConfigs}
              loadInfo={protocol.loadAdvice}
            />
          </Animated.View>
        )}

        {/* Collapsible progression tips */}
        <Pressable
          onPress={() => setShowTips(!showTips)}
          className="bg-stone-100 dark:bg-stone-800 rounded-2xl p-4 mb-6"
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Ionicons name="trending-up-outline" size={18} color="#F97316" style={{ marginRight: 8 }} />
              <Text className="text-stone-900 dark:text-stone-50 font-bold">Progression</Text>
            </View>
            <Ionicons
              name={showTips ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={colors.textSecondary}
            />
          </View>
          {showTips && (
            <View className="mt-3">
              {protocol.progressionTips.map((tip, index) => (
                <View key={index} className="flex-row items-start mb-2">
                  <Text className="text-orange-500 text-sm mr-2 mt-px">•</Text>
                  <Text className="text-stone-700 dark:text-stone-200 text-sm leading-5 flex-1">
                    {tip}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </Pressable>
      </ScrollView>

      {/* Sticky bottom button */}
      <View
        className="absolute bottom-0 left-0 right-0 bg-white dark:bg-stone-950 px-5 pt-3 border-t border-stone-200 dark:border-stone-800"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        <Pressable
          onPress={handleStart}
          style={({ pressed }) => ({
            transform: [{ scale: pressed ? 0.97 : 1 }],
          })}
          accessibilityRole="button"
          accessibilityLabel="Lancer la séance"
        >
          <View className="bg-orange-500 rounded-3xl py-4 items-center">
            <Text className="text-white text-xl font-bold">Lancer la séance</Text>
          </View>
        </Pressable>
      </View>
    </View>
  );
}
