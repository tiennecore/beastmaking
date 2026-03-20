import { useCallback, useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import { generatePlan } from '@/lib/plan-generator';
import { saveActivePlan, loadSettings } from '@/lib/storage';
import { PlanGoal, ActivePlan } from '@/types';

type ActivityKey = 'hangboard' | 'bouldering' | 'route' | 'strength';

type Step = 1 | 2 | 3;

const GOALS: { key: PlanGoal; label: string; icon: string; desc: string }[] = [
  { key: 'beginner', label: 'Débutant', icon: '🌱', desc: 'Initiation progressive, faible risque' },
  { key: 'force', label: 'Force', icon: '⚡', desc: 'Force maximale des doigts' },
  { key: 'endurance', label: 'Endurance', icon: '🌊', desc: 'Enchaîner sans faiblir' },
  { key: 'mixed', label: 'Complet', icon: '🎯', desc: 'Équilibre force + endurance' },
];

const DAYS = [3, 4, 5, 6];

const ALL_ACTIVITIES: { key: ActivityKey; label: string; icon: string; requiresHomeHangboard?: boolean }[] = [
  { key: 'hangboard', label: 'Poutre', icon: '🤏' },
  { key: 'bouldering', label: 'Bloc', icon: '🧗' },
  { key: 'route', label: 'Voie', icon: '🏔️' },
  { key: 'strength', label: 'Muscu', icon: '🏋️' },
];

function OptionCard({
  selected,
  onPress,
  children,
}: {
  selected: boolean;
  onPress: () => void;
  children: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-2xl p-4 mb-3 border ${
        selected
          ? 'bg-orange-500/10 border-orange-500'
          : 'bg-stone-100 dark:bg-stone-800 border-stone-300 dark:border-stone-700/50'
      }`}
      style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      {children}
    </Pressable>
  );
}

export default function CreatePlanScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [goal, setGoal] = useState<PlanGoal>('mixed');
  const [days, setDays] = useState(4);
  const [activities, setActivities] = useState<ActivityKey[]>(['bouldering', 'route']);
  const [hasHomeHangboard, setHasHomeHangboard] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadSettings().then((saved) => {
        const homeHangboard = saved?.hasHomeHangboard ?? false;
        setHasHomeHangboard(homeHangboard);
        setActivities((prev) => {
          if (homeHangboard && !prev.includes('hangboard')) {
            return ['hangboard', ...prev];
          }
          if (!homeHangboard) {
            return prev.filter((a) => a !== 'hangboard');
          }
          return prev;
        });
      });
    }, [])
  );

  const availableActivities = ALL_ACTIVITIES.filter((a) => {
    if (a.key === 'hangboard' && !hasHomeHangboard) return false;
    return true;
  });

  const toggleActivity = (key: ActivityKey) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActivities((prev) =>
      prev.includes(key) ? prev.filter((a) => a !== key) : [...prev, key]
    );
  };

  const handleGenerate = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const template = generatePlan({ goal, daysPerWeek: days, activities, hasHomeHangboard });
    const active: ActivePlan = {
      id: Date.now().toString(),
      plan: template,
      currentWeek: 1,
      startDate: new Date().toISOString(),
      weekHistory: [
        { weekNumber: 1, startDate: new Date().toISOString(), completions: [] },
      ],
    };
    await saveActivePlan(active);
    router.replace(`/plan/${active.id}`);
  };

  const titles = { 1: 'Objectif', 2: 'Jours par semaine', 3: 'Activités accessibles' };

  return (
    <ScrollView className="flex-1 bg-white dark:bg-stone-950 px-5 pt-4">
      <View className="flex-row items-center gap-2 mb-6">
        {[1, 2, 3].map((s) => (
          <View
            key={s}
            className={`flex-1 h-1 rounded-full ${
              s <= step ? 'bg-orange-500' : 'bg-stone-200 dark:bg-stone-700'
            }`}
          />
        ))}
      </View>

      <Text className="text-stone-900 dark:text-stone-50 text-2xl font-bold mb-1">
        {titles[step]}
      </Text>
      <Text className="text-stone-500 dark:text-stone-400 text-sm mb-6">
        {step === 1 && 'Que voulez-vous travailler en priorité ?'}
        {step === 2 && "Combien de jours pouvez-vous vous entraîner ?"}
        {step === 3 && 'Quelles activités avez-vous à disposition ?'}
      </Text>

      {step === 1 &&
        GOALS.map((g) => (
          <OptionCard
            key={g.key}
            selected={goal === g.key}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setGoal(g.key);
            }}
          >
            <View className="flex-row items-center gap-3">
              <Text className="text-2xl">{g.icon}</Text>
              <View>
                <Text className="text-stone-900 dark:text-stone-50 text-base font-bold">{g.label}</Text>
                <Text className="text-stone-500 dark:text-stone-400 text-sm">{g.desc}</Text>
              </View>
            </View>
          </OptionCard>
        ))}

      {step === 2 && (
        <View className="flex-row gap-3">
          {DAYS.map((d) => (
            <Pressable
              key={d}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setDays(d);
              }}
              className={`flex-1 rounded-2xl py-6 items-center border ${
                days === d
                  ? 'bg-orange-500/10 border-orange-500'
                  : 'bg-stone-100 dark:bg-stone-800 border-stone-300 dark:border-stone-700/50'
              }`}
              accessibilityRole="button"
              accessibilityLabel={`${d} jours par semaine`}
              accessibilityState={{ selected: days === d }}
            >
              <Text className="text-stone-900 dark:text-stone-50 text-2xl font-bold">{d}</Text>
              <Text className="text-stone-500 dark:text-stone-400 text-xs mt-1">jours</Text>
            </Pressable>
          ))}
        </View>
      )}

      {step === 3 && (
        <View className="gap-3">
          {!hasHomeHangboard && (
            <View className="bg-stone-100 dark:bg-stone-800 border border-stone-300 dark:border-stone-700/50 rounded-2xl p-3 mb-1">
              <Text className="text-stone-500 dark:text-stone-400 text-xs">
                La poutre n'est disponible qu'associée à une séance en salle. Activez "Poutre à la maison" dans les réglages pour des séances poutre autonomes.
              </Text>
            </View>
          )}
          {availableActivities.map((a) => (
            <OptionCard
              key={a.key}
              selected={activities.includes(a.key)}
              onPress={() => toggleActivity(a.key)}
            >
              <View className="flex-row items-center gap-3">
                <Text className="text-2xl">{a.icon}</Text>
                <Text className="text-stone-900 dark:text-stone-50 text-base font-bold">{a.label}</Text>
              </View>
            </OptionCard>
          ))}
          {hasHomeHangboard && (
            <View className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-3 mt-1">
              <Text className="text-orange-600 dark:text-orange-400 text-xs">
                Poutre à la maison activée : des séances poutre seules seront générées en plus des séances en salle.
              </Text>
            </View>
          )}
        </View>
      )}

      <View className="flex-row gap-3 mt-8 mb-8">
        {step > 1 && (
          <Pressable
            className="flex-1 bg-stone-200 dark:bg-stone-700 rounded-2xl py-4 items-center"
            onPress={() => setStep((step - 1) as Step)}
            style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.97 : 1 }] }]}
            accessibilityRole="button"
            accessibilityLabel="Étape précédente"
          >
            <Text className="text-stone-900 dark:text-stone-50 font-bold">Retour</Text>
          </Pressable>
        )}
        <Pressable
          className="flex-1 bg-orange-500 rounded-2xl py-4 items-center"
          onPress={() => {
            if (step < 3) setStep((step + 1) as Step);
            else handleGenerate();
          }}
          style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.97 : 1 }] }]}
          accessibilityRole="button"
          accessibilityLabel={step < 3 ? 'Étape suivante' : 'Générer le plan'}
        >
          <Text className="text-white font-bold text-base">
            {step < 3 ? 'Suivant' : 'Générer le plan'}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
