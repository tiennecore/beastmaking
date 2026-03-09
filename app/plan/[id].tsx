import { useCallback, useRef, useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert, Animated, PanResponder } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  loadActivePlan,
  completeSessionInPlan,
  uncompleteSessionInPlan,
  advanceWeek,
  clearActivePlan,
} from '@/lib/storage';
import { ActivePlan, PlannedSession, PlanSessionType } from '@/types';

const SESSION_ICONS: Record<PlanSessionType, string> = {
  'hangboard-force': '⚡',
  'hangboard-endurance': '🌊',
  'hangboard-pullups': '🏋️',
  bouldering: '🧗',
  route: '🏔️',
  strength: '💪',
  rest: '😴',
  'active-recovery': '🧘',
};

const FRENCH_MONTHS = [
  'janv.', 'fév.', 'mars', 'avr.', 'mai', 'juin',
  'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.',
];

const RECOVERY_BADGES: Partial<Record<PlanSessionType, { emoji: string; text: string }>> = {
  'hangboard-force': { emoji: '⚠️', text: '48h de repos après cette séance' },
  'hangboard-endurance': { emoji: '💡', text: 'À faire après une séance de grimpe' },
  rest: { emoji: '🔋', text: 'Repos nécessaire pour la récupération' },
  strength: { emoji: '✅', text: 'Compatible avec toutes les séances' },
};

const RECOVERY_TIPS = [
  '48h minimum entre 2 séances de force',
  "L'endurance se fait après la grimpe, jamais avant la force",
  'Bloc et muscu peuvent se faire le même jour',
  '1 jour de repos complet minimum par semaine',
];

function getWeekDateRange(startDate: string, weekNumber: number): string {
  const start = new Date(startDate);
  const weekStart = new Date(start);
  weekStart.setDate(start.getDate() + (weekNumber - 1) * 7);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const startDay = weekStart.getDate();
  const endDay = weekEnd.getDate();
  const startMonth = FRENCH_MONTHS[weekStart.getMonth()];
  const endMonth = FRENCH_MONTHS[weekEnd.getMonth()];

  if (weekStart.getMonth() === weekEnd.getMonth()) {
    return `${startDay} – ${endDay} ${endMonth}`;
  }
  return `${startDay} ${startMonth} – ${endDay} ${endMonth}`;
}

function RecoveryTipsCard() {
  const [expanded, setExpanded] = useState(false);

  return (
    <Pressable
      onPress={() => setExpanded((prev) => !prev)}
      className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-2xl p-4 mb-4"
    >
      <View className="flex-row items-center justify-between">
        <Text className="text-amber-800 dark:text-amber-300 font-bold text-sm">
          Conseils 💡
        </Text>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color="#D97706"
        />
      </View>
      {expanded && (
        <View className="mt-3 gap-2">
          {RECOVERY_TIPS.map((tip, i) => (
            <View key={i} className="flex-row items-start gap-2">
              <Text className="text-amber-600 dark:text-amber-400 text-xs mt-0.5">•</Text>
              <Text className="text-amber-700 dark:text-amber-400 text-xs flex-1 leading-4">
                {tip}
              </Text>
            </View>
          ))}
        </View>
      )}
    </Pressable>
  );
}

function WeekNavigator({
  viewingWeek,
  totalWeeks,
  weekDateRange,
  onPrev,
  onNext,
}: {
  viewingWeek: number;
  totalWeeks: number;
  weekDateRange: string;
  onPrev: () => void;
  onNext: () => void;
}) {
  const isFirst = viewingWeek === 1;
  const isLast = viewingWeek === totalWeeks;

  return (
    <View className="flex-row items-center justify-between mb-4">
      <Pressable onPress={onPrev} disabled={isFirst} className="p-2" style={{ opacity: isFirst ? 0.3 : 1 }}>
        <Ionicons name="chevron-back" size={24} color="#F97316" />
      </Pressable>
      <View className="items-center flex-1">
        <Text className="text-stone-900 dark:text-stone-50 text-base font-bold">
          Semaine {viewingWeek}
        </Text>
        {weekDateRange ? (
          <Text className="text-stone-500 dark:text-stone-400 text-xs">{weekDateRange}</Text>
        ) : null}
      </View>
      <Pressable onPress={onNext} disabled={isLast} className="p-2" style={{ opacity: isLast ? 0.3 : 1 }}>
        <Ionicons name="chevron-forward" size={24} color="#F97316" />
      </Pressable>
    </View>
  );
}

function SessionCard({
  session,
  dayNumber,
  completed,
  onToggle,
}: {
  session: PlannedSession;
  dayNumber: number;
  completed: boolean;
  onToggle: () => void;
}) {
  const badge = RECOVERY_BADGES[session.type];

  return (
    <View
      className={`rounded-2xl p-4 mb-3 border ${
        completed
          ? 'bg-green-500/10 border-green-500/30'
          : 'bg-stone-100 dark:bg-stone-800 border-stone-300 dark:border-stone-700/50'
      }`}
    >
      {/* Day label */}
      <Text className="text-stone-400 dark:text-stone-500 text-[10px] font-semibold uppercase tracking-wider mb-2">
        Jour {dayNumber}
      </Text>

      <View className="flex-row items-center">
        <Text className="text-2xl mr-3">{SESSION_ICONS[session.type]}</Text>
        <View className="flex-1">
          <Text className="text-stone-900 dark:text-stone-50 text-base font-bold">
            {session.label}
          </Text>
          <Text className="text-stone-500 dark:text-stone-400 text-sm" numberOfLines={2}>
            {session.description}
          </Text>
        </View>
      </View>

      {/* Recovery badge */}
      {badge && (
        <View className="bg-stone-200/60 dark:bg-stone-700/40 rounded-lg px-3 py-1.5 mt-2 self-start">
          <Text className="text-stone-600 dark:text-stone-400 text-xs">
            {badge.emoji} {badge.text}
          </Text>
        </View>
      )}

      {/* Toggle button */}
      <View className="flex-row gap-2 mt-3">
        <Pressable
          onPress={onToggle}
          className={`flex-row items-center rounded-full px-4 py-2 gap-1.5 ${
            completed
              ? 'bg-red-500/15'
              : 'bg-green-500/15'
          }`}
        >
          <Ionicons
            name={completed ? 'close' : 'checkmark'}
            size={16}
            color={completed ? '#EF4444' : '#22C55E'}
          />
          <Text
            className={`text-sm font-semibold ${
              completed
                ? 'text-red-500 dark:text-red-400'
                : 'text-green-600 dark:text-green-400'
            }`}
          >
            {completed ? 'Annuler' : 'Valider'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function PlanViewScreen() {
  const router = useRouter();
  const [activePlan, setActivePlan] = useState<ActivePlan | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const animateSlide = (direction: 'left' | 'right') => {
    slideAnim.setValue(direction === 'left' ? 300 : -300);
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 60,
      friction: 10,
    }).start();
  };

  const viewingWeekRef = useRef(0);
  const totalWeeksRef = useRef(1);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only capture horizontal gestures (avoid conflicting with vertical scroll)
        return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 10;
      },
      onPanResponderMove: (_, gestureState) => {
        // Follow the finger
        slideAnim.setValue(gestureState.dx);
      },
      onPanResponderRelease: (_, gestureState) => {
        const SWIPE_THRESHOLD = 60;
        const week = viewingWeekRef.current;
        const total = totalWeeksRef.current;

        if (gestureState.dx < -SWIPE_THRESHOLD && week < total) {
          // Swipe left → next week
          // Animate out to the left, then set new week and animate in from right
          Animated.timing(slideAnim, {
            toValue: -400,
            duration: 150,
            useNativeDriver: true,
          }).start(() => {
            setSelectedWeek(week + 1);
            slideAnim.setValue(400);
            Animated.spring(slideAnim, {
              toValue: 0,
              useNativeDriver: true,
              tension: 60,
              friction: 10,
            }).start();
          });
        } else if (gestureState.dx > SWIPE_THRESHOLD && week > 1) {
          // Swipe right → prev week
          Animated.timing(slideAnim, {
            toValue: 400,
            duration: 150,
            useNativeDriver: true,
          }).start(() => {
            setSelectedWeek(week - 1);
            slideAnim.setValue(-400);
            Animated.spring(slideAnim, {
              toValue: 0,
              useNativeDriver: true,
              tension: 60,
              friction: 10,
            }).start();
          });
        } else {
          // Snap back
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
            tension: 80,
            friction: 10,
          }).start();
        }
      },
    })
  ).current;

  const reload = useCallback(() => {
    loadActivePlan().then(setActivePlan);
  }, []);

  useFocusEffect(reload);

  if (!activePlan) {
    return (
      <View className="flex-1 bg-white dark:bg-stone-950 items-center justify-center">
        <Text className="text-stone-500 dark:text-stone-400">Aucun plan actif</Text>
      </View>
    );
  }

  const { plan, currentWeek, weekHistory, startDate } = activePlan;
  const viewingWeek = selectedWeek ?? currentWeek;
  viewingWeekRef.current = viewingWeek;
  totalWeeksRef.current = plan.totalWeeks;
  const viewingWeekHistory = weekHistory.find((w) => w.weekNumber === viewingWeek);
  const completions = viewingWeekHistory?.completions ?? [];

  const completedCount = completions.filter((c) => c.completed).length;
  const totalSessions = plan.sessions.length;
  const completionRate = totalSessions > 0 ? Math.round((completedCount / totalSessions) * 100) : 0;

  // Global progress: weeks fully past (completed or not)
  const weeksCompleted = Math.max(0, currentWeek - 1);
  const globalProgress = plan.totalWeeks > 0 ? Math.round((weeksCompleted / plan.totalWeeks) * 100) : 0;

  // Week date range
  const weekDateRange = startDate ? getWeekDateRange(startDate, viewingWeek) : '';

  // Streak: consecutive weeks with >= 80% completion
  const streak = weekHistory
    .filter((w) => w.weekNumber < currentWeek)
    .reverse()
    .reduce((count, w) => {
      const done = w.completions.filter((c) => c.completed).length;
      return done / totalSessions >= 0.8 ? count + 1 : -1;
    }, 0);
  const streakCount = Math.max(0, streak);

  const handleToggle = async (sessionId: string) => {
    const completion = completions.find((c) => c.sessionId === sessionId);
    if (completion?.completed) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await uncompleteSessionInPlan(sessionId, viewingWeek);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await completeSessionInPlan(sessionId, undefined, viewingWeek);
    }
    reload();
  };

  const handleNextWeek = () => {
    if (currentWeek >= plan.totalWeeks) {
      Alert.alert('Plan terminé', 'Félicitations ! Vous avez terminé le plan.', [
        { text: 'OK', onPress: () => clearActivePlan().then(() => router.back()) },
      ]);
      return;
    }
    Alert.alert('Semaine suivante', `Passer à la semaine ${currentWeek + 1} ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Confirmer',
        onPress: async () => {
          await advanceWeek();
          reload();
        },
      },
    ]);
  };

  const handleQuit = () => {
    Alert.alert('Arrêter le plan', 'Voulez-vous arrêter ce plan ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Arrêter',
        style: 'destructive',
        onPress: async () => {
          await clearActivePlan();
          router.back();
        },
      },
    ]);
  };

  return (
    <ScrollView className="flex-1 bg-white dark:bg-stone-950 px-5 pt-4">
      {/* Header */}
      <View className="flex-row items-center mb-2">
        <Text className="text-3xl mr-3">{plan.icon}</Text>
        <View className="flex-1">
          <Text className="text-stone-900 dark:text-stone-50 text-xl font-bold">{plan.name}</Text>
          <Text className="text-stone-500 dark:text-stone-400 text-sm">
            Semaine {viewingWeek}/{plan.totalWeeks}
            {weekDateRange ? ` · ${weekDateRange}` : ''}
          </Text>
        </View>
      </View>

      {/* Recovery tips (collapsible) */}
      <RecoveryTipsCard />

      {/* Global plan progress bar (thin) */}
      <View className="mb-1">
        <Text className="text-stone-400 dark:text-stone-500 text-[10px] mb-1">
          Progression globale · {weeksCompleted}/{plan.totalWeeks} semaines
        </Text>
        <View className="bg-stone-200 dark:bg-stone-700 rounded-full h-1.5">
          <View
            className="bg-stone-500 dark:bg-stone-400 rounded-full h-1.5"
            style={{ width: `${globalProgress}%` }}
          />
        </View>
      </View>

      {/* Weekly progress bar */}
      <View className="bg-stone-200 dark:bg-stone-700 rounded-full h-2 mb-2 mt-2">
        <View
          className="bg-orange-500 rounded-full h-2"
          style={{ width: `${completionRate}%` }}
        />
      </View>
      <Text className="text-stone-500 dark:text-stone-400 text-xs mb-6">
        {completedCount}/{totalSessions} séances · {completionRate}%
      </Text>

      {/* Stats row */}
      <View className="flex-row gap-3 mb-4">
        <View className="flex-1 bg-stone-100 dark:bg-stone-800 rounded-2xl p-3 items-center">
          <Text className="text-orange-500 text-xl font-bold">{completedCount}</Text>
          <Text className="text-stone-500 dark:text-stone-400 text-xs">Faites</Text>
        </View>
        <View className="flex-1 bg-stone-100 dark:bg-stone-800 rounded-2xl p-3 items-center">
          <Text className="text-stone-900 dark:text-stone-50 text-xl font-bold">{totalSessions - completedCount}</Text>
          <Text className="text-stone-500 dark:text-stone-400 text-xs">Restantes</Text>
        </View>
        <View className="flex-1 bg-stone-100 dark:bg-stone-800 rounded-2xl p-3 items-center">
          <Text className="text-amber-600 dark:text-amber-400 text-xl font-bold">{streakCount}</Text>
          <Text className="text-stone-500 dark:text-stone-400 text-xs">Streak</Text>
        </View>
      </View>

      {/* Week navigator */}
      <WeekNavigator
        viewingWeek={viewingWeek}
        totalWeeks={plan.totalWeeks}
        weekDateRange={weekDateRange}
        onPrev={() => { setSelectedWeek(viewingWeek - 1); animateSlide('right'); }}
        onNext={() => { setSelectedWeek(viewingWeek + 1); animateSlide('left'); }}
      />

      {/* Session cards */}
      <Animated.View
        {...panResponder.panHandlers}
        style={{ transform: [{ translateX: slideAnim }] }}
      >
        <Text className="text-stone-500 dark:text-stone-400 text-xs font-semibold uppercase tracking-widest mb-3 ml-1">
          Séances de la semaine
        </Text>

        {plan.sessions.map((session, index) => {
          const completion = completions.find((c) => c.sessionId === session.id);
          return (
            <SessionCard
              key={session.id}
              session={session}
              dayNumber={index + 1}
              completed={completion?.completed ?? false}
              onToggle={() => handleToggle(session.id)}
            />
          );
        })}
      </Animated.View>

      {/* Actions */}
      <View className="gap-3 mt-4 mb-8">
        <Pressable
          className="bg-orange-500 rounded-2xl py-4 items-center"
          onPress={handleNextWeek}
        >
          <Text className="text-white font-bold text-base">
            {currentWeek >= plan.totalWeeks ? 'Terminer le plan' : 'Semaine suivante →'}
          </Text>
        </Pressable>
        <Pressable
          className="bg-stone-200 dark:bg-stone-700 rounded-2xl py-3 items-center"
          onPress={handleQuit}
        >
          <Text className="text-red-500 dark:text-red-400 font-bold text-sm">Arrêter le plan</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
