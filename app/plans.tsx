import { useCallback, useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import { getPlanTemplates } from '@/constants/plans';
import { loadActivePlan, saveActivePlan, clearActivePlan, loadSettings } from '@/lib/storage';
import { useThemeColors } from '@/lib/theme';
import { ActivePlan, SessionMode, TrainingPlanTemplate } from '@/types';

const SESSION_PILL_ICON: Record<SessionMode, keyof typeof Ionicons.glyphMap> = {
  climbing: 'body-outline',
  'climbing-exercise': 'flash-outline',
  exercise: 'barbell-outline',
};

function PlanCard({
  plan,
  onPress,
  active,
}: {
  plan: TrainingPlanTemplate;
  onPress: () => void;
  active: boolean;
}) {
  return (
    <Pressable
      className={`bg-stone-100 dark:bg-stone-800 rounded-3xl p-4 mb-3 ${
        active ? 'border-2 border-orange-500' : 'border border-stone-300 dark:border-stone-700/50'
      }`}
      onPress={onPress}
      style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}
      accessibilityRole="button"
      accessibilityLabel={`${plan.name}. ${plan.daysPerWeek} jours par semaine, ${plan.totalWeeks} semaines${active ? '. Plan actif' : ''}`}
    >
      <View className="flex-row items-center mb-2">
        <Text className="text-3xl mr-3">{plan.icon}</Text>
        <View className="flex-1">
          <Text className="text-stone-900 dark:text-stone-50 text-lg font-bold">
            {plan.name}
          </Text>
          <Text className="text-stone-500 dark:text-stone-400 text-sm">
            {plan.daysPerWeek} jours/sem · {plan.totalWeeks} semaines
          </Text>
        </View>
        {active && (
          <View className="bg-orange-500/15 rounded-full px-2.5 py-1">
            <Text className="text-orange-500 text-xs font-bold">Actif</Text>
          </View>
        )}
      </View>
      <Text className="text-stone-600 dark:text-stone-300 text-sm" numberOfLines={2}>
        {plan.description}
      </Text>
      <View className="flex-row flex-wrap gap-1.5 mt-2">
        {plan.sessions.map((s) => (
          <View key={s.id} className="bg-stone-200 dark:bg-stone-700 rounded-full px-2.5 py-0.5 flex-row items-center gap-1">
            <Ionicons name={SESSION_PILL_ICON[s.mode]} size={11} color="#78716c" />
            <Text className="text-stone-600 dark:text-stone-300 text-xs">{s.label}</Text>
          </View>
        ))}
      </View>
    </Pressable>
  );
}

export default function PlansScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const [activePlan, setActivePlan] = useState<ActivePlan | null>(null);
  const [hasHomeHangboard, setHasHomeHangboard] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadActivePlan().then(setActivePlan);
      loadSettings().then((saved) => {
        setHasHomeHangboard(saved?.hasHomeHangboard ?? false);
      });
    }, [])
  );

  const planTemplates = getPlanTemplates(hasHomeHangboard);

  const startPlan = (template: TrainingPlanTemplate) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (activePlan) {
      Alert.alert(
        'Plan en cours',
        `Vous avez déjà "${activePlan.plan.name}" en cours. Le remplacer ?`,
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Remplacer',
            style: 'destructive',
            onPress: () => activatePlan(template),
          },
        ]
      );
    } else {
      activatePlan(template);
    }
  };

  const activatePlan = async (template: TrainingPlanTemplate) => {
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
    setActivePlan(active);
    router.push(`/plan/${active.id}`);
  };

  const goToActivePlan = () => {
    if (!activePlan) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/plan/${activePlan.id}`);
  };

  return (
    <ScrollView className="flex-1 bg-white dark:bg-stone-950 px-5 pt-4">
      {activePlan && (
        <Pressable
          className="bg-orange-500/10 border border-orange-500/30 rounded-3xl p-4 mb-6"
          onPress={goToActivePlan}
          style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
              <Text className="text-2xl">{activePlan.plan.icon}</Text>
              <View>
                <Text className="text-orange-500 text-xs font-semibold uppercase">Plan actif</Text>
                <Text className="text-stone-900 dark:text-stone-50 text-base font-bold">
                  {activePlan.plan.name}
                </Text>
                <Text className="text-stone-500 dark:text-stone-400 text-sm">
                  Semaine {activePlan.currentWeek}/{activePlan.plan.totalWeeks}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.chevron} />
          </View>
        </Pressable>
      )}

      <Text className="text-stone-500 dark:text-stone-400 text-xs font-semibold uppercase tracking-widest mb-1 ml-1">
        Plans recommandés
      </Text>
      <Text className="text-stone-400 dark:text-stone-500 text-xs mb-3 ml-1">
        Basés sur le livre Beastmaking
      </Text>

      {planTemplates.length === 0 && (
        <View className="items-center justify-center py-16">
          <Ionicons name="calendar-outline" size={48} color="#a8a29e" />
          <Text className="text-stone-400 dark:text-stone-500 text-base mt-4">Aucun plan disponible</Text>
        </View>
      )}

      {planTemplates.map((template) => (
        <PlanCard
          key={template.id}
          plan={template}
          active={activePlan?.plan.id === template.id}
          onPress={() => startPlan(template)}
        />
      ))}

      <Pressable
        className="border border-dashed border-stone-300 dark:border-stone-600 rounded-3xl p-4 mb-3 items-center"
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push('/create-plan');
        }}
        accessibilityRole="button"
        accessibilityLabel="Créer un plan personnalisé"
      >
        <Ionicons name="add-circle-outline" size={28} color={colors.textMuted} />
        <Text className="text-stone-500 dark:text-stone-400 text-sm mt-1">Créer un plan personnalisé</Text>
      </Pressable>

      <View className="h-20" />
    </ScrollView>
  );
}
