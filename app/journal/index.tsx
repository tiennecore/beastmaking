import { useCallback, useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, ScrollView, Pressable, Alert, ActivityIndicator } from 'react-native';
import Animated, { SlideInLeft, SlideInRight } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColorScheme } from 'nativewind';
import BottomSheet, { BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { useJournalEntries } from '@/hooks/useJournalEntries';
import { deleteClimbingSession } from '@/lib/storage';
import { SegmentedControl } from '@/components/SegmentedControl';
import { formatGripConfig } from '@/constants/grips';
import {
  TYPE_COLORS,
  formatDuration,
} from '@/constants/climbing';
import { ToggleButton, DifficultyBadge, CalendarView } from '@/components/journal';
import type {
  JournalFilter,
  ClimbingSession as ClimbingSessionType,
  JournalStats,
  SessionHistoryEntry,
} from '@/types';

// --- View mode ---

type ViewMode = 'list' | 'calendar';

const VIEW_MODE_OPTIONS: Array<{ value: ViewMode; label: string }> = [
  { value: 'calendar', label: 'Calendrier' },
  { value: 'list', label: 'Liste' },
];

const VIEW_MODES: ViewMode[] = ['calendar', 'list'];
const SWIPE_THRESHOLD = 50;

// --- Filter pills ---

const FILTERS: { value: JournalFilter; label: string }[] = [
  { value: 'all', label: 'Tout' },
  { value: 'hangboard', label: 'Poutre' },
  { value: 'bloc', label: 'Bloc' },
  { value: 'voie', label: 'Voie' },
];

interface FilterPillsProps {
  active: JournalFilter;
  onChange: (f: JournalFilter) => void;
}

function FilterPills({ active, onChange }: FilterPillsProps) {
  return (
    <View className="flex-row gap-2 mb-4">
      {FILTERS.map((f) => (
        <ToggleButton
          key={f.value}
          value={f.value}
          selected={active === f.value}
          label={f.label}
          onPress={(v) => {
            Haptics.selectionAsync();
            onChange(v);
          }}
        />
      ))}
    </View>
  );
}

// --- Stats Dashboard ---

function StatsDashboard({ stats }: { stats: JournalStats }) {
  return (
    <View className="mb-4">
      {/* Row 1: Sessions semaine + tendance */}
      <View className="bg-stone-100 dark:bg-stone-800 rounded-2xl p-4 mb-3 border border-stone-300 dark:border-stone-700/50">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-stone-400 dark:text-stone-500 text-xs font-semibold uppercase">
              Sessions cette semaine
            </Text>
            <Text className="text-stone-900 dark:text-stone-50 text-3xl font-bold mt-1">
              {stats.sessionsThisWeek}
            </Text>
          </View>
          {stats.weekTrend !== 0 && (
            <View className={`flex-row items-center px-3 py-1.5 rounded-full ${
              stats.weekTrend > 0 ? 'bg-green-500/15' : 'bg-red-500/15'
            }`}>
              <Ionicons
                name={stats.weekTrend > 0 ? 'trending-up' : 'trending-down'}
                size={16}
                color={stats.weekTrend > 0 ? '#22C55E' : '#EF4444'}
              />
              <Text className={`text-sm font-semibold ml-1 ${
                stats.weekTrend > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
              }`}>
                {stats.weekTrend > 0 ? '+' : ''}{stats.weekTrend}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Row 2: Répartition 3 compteurs */}
      <View className="flex-row gap-3 mb-3">
        <View className="flex-1 bg-stone-100 dark:bg-stone-800 rounded-2xl px-3 py-2.5 border border-stone-300 dark:border-stone-700/50">
          <View className="flex-row items-center gap-2 mb-0.5">
            <View className="w-7 h-7 rounded-lg items-center justify-center" style={{ backgroundColor: '#818CF820' }}>
              <Ionicons name="hand-left-outline" size={15} color="#818CF8" />
            </View>
            <Text className="text-stone-900 dark:text-stone-50 text-xl font-bold">{stats.hangboardThisMonth}</Text>
          </View>
          <Text className="text-stone-400 dark:text-stone-500 text-xs">Poutre</Text>
        </View>
        <View className="flex-1 bg-stone-100 dark:bg-stone-800 rounded-2xl px-3 py-2.5 border border-stone-300 dark:border-stone-700/50">
          <View className="flex-row items-center gap-2 mb-0.5">
            <View className="w-7 h-7 rounded-lg items-center justify-center" style={{ backgroundColor: '#F9731620' }}>
              <Ionicons name="cube-outline" size={15} color="#F97316" />
            </View>
            <Text className="text-stone-900 dark:text-stone-50 text-xl font-bold">{stats.blocThisMonth}</Text>
          </View>
          <Text className="text-stone-400 dark:text-stone-500 text-xs">Bloc</Text>
        </View>
        <View className="flex-1 bg-stone-100 dark:bg-stone-800 rounded-2xl px-3 py-2.5 border border-stone-300 dark:border-stone-700/50">
          <View className="flex-row items-center gap-2 mb-0.5">
            <View className="w-7 h-7 rounded-lg items-center justify-center" style={{ backgroundColor: '#2563EB20' }}>
              <Ionicons name="trending-up-outline" size={15} color="#2563EB" />
            </View>
            <Text className="text-stone-900 dark:text-stone-50 text-xl font-bold">{stats.voieThisMonth}</Text>
          </View>
          <Text className="text-stone-400 dark:text-stone-500 text-xs">Voie</Text>
        </View>
      </View>

      {/* Row 3: Temps suspension + Taux réussite + Grade moyen */}
      <View className="flex-row gap-3">
        <View className="flex-1 bg-stone-100 dark:bg-stone-800 rounded-2xl p-3 border border-stone-300 dark:border-stone-700/50">
          <Text className="text-stone-400 dark:text-stone-500 text-xs font-semibold uppercase">Suspension</Text>
          <Text className="text-stone-900 dark:text-stone-50 text-lg font-bold mt-1">
            {(() => {
              const secs = Math.round(stats.totalHangTimeWeek);
              return secs >= 60
                ? `${Math.floor(secs / 60)}m${String(secs % 60).padStart(2, '0')}s`
                : `${secs}s`;
            })()}
          </Text>
          <Text className="text-stone-400 dark:text-stone-500 text-xs">cette semaine</Text>
        </View>
        <View className="flex-1 bg-stone-100 dark:bg-stone-800 rounded-2xl p-3 border border-stone-300 dark:border-stone-700/50">
          <Text className="text-stone-400 dark:text-stone-500 text-xs font-semibold uppercase">Réussite</Text>
          <Text className="text-stone-900 dark:text-stone-50 text-lg font-bold mt-1">
            {stats.successRate}%
          </Text>
          <Text className="text-stone-400 dark:text-stone-500 text-xs">ce mois</Text>
        </View>
        <View className="flex-1 bg-stone-100 dark:bg-stone-800 rounded-2xl p-3 border border-stone-300 dark:border-stone-700/50">
          <Text className="text-stone-400 dark:text-stone-500 text-xs font-semibold uppercase">Grade moy.</Text>
          <Text className="text-stone-900 dark:text-stone-50 text-lg font-bold mt-1">
            {stats.averageGrade ?? '—'}
          </Text>
          <Text className="text-stone-400 dark:text-stone-500 text-xs">ce mois</Text>
        </View>
      </View>
    </View>
  );
}

// --- Hangboard Entry Card ---

interface HangboardEntryCardProps {
  entry: SessionHistoryEntry;
}

function HangboardEntryCard({ entry }: HangboardEntryCardProps) {
  const router = useRouter();
  const { result } = entry;
  const { protocol, gripConfigs, totalDuration, completed } = result;

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push(`/journal/h-${entry.id}`);
      }}
      style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}
      className="bg-stone-100 dark:bg-stone-800 rounded-3xl p-4 mb-3 border border-stone-300 dark:border-stone-700/50"
      accessibilityRole="button"
      accessibilityLabel={`Séance ${protocol.name}, ${formatDuration(totalDuration)}`}
    >
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-stone-900 dark:text-stone-50 text-base font-bold flex-1 mr-2">
          {protocol.icon} {protocol.name}
        </Text>
        <Text className={completed ? 'text-green-500 text-sm font-medium' : 'text-yellow-500 text-sm font-medium'}>
          {completed ? 'Terminée' : 'Interrompue'}
        </Text>
      </View>

      <View className="flex-row flex-wrap gap-x-4 gap-y-1">
        <Text className="text-stone-600 dark:text-stone-300 text-sm">
          {formatDuration(totalDuration)}
        </Text>
        {gripConfigs.length > 0 && (
          <Text className="text-stone-600 dark:text-stone-300 text-sm">
            {formatGripConfig(gripConfigs[0])}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

// --- Climbing Entry Card ---

interface ClimbingEntryCardProps {
  session: ClimbingSessionType;
  onDelete: (id: string) => void;
}

function ClimbingEntryCard({ session, onDelete }: ClimbingEntryCardProps) {
  const router = useRouter();

  const routeCount =
    session.routeCount ??
    (session.entries ? session.entries.length : undefined);

  const successCount = session.entries
    ? session.entries.filter((e) => e.success).length
    : undefined;

  const typeColor = TYPE_COLORS[session.type];
  const typeLabel = session.type === 'bloc' ? 'Bloc' : 'Voie';

  const handleLongPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Supprimer cette séance ?',
      'Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => onDelete(session.id),
        },
      ],
    );
  }, [session.id, onDelete]);

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push(`/journal/c-${session.id}`);
      }}
      onLongPress={handleLongPress}
      style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}
      className="bg-stone-100 dark:bg-stone-800 rounded-3xl p-4 mb-3 border border-stone-300 dark:border-stone-700/50"
      accessibilityRole="button"
      accessibilityLabel={`Séance ${typeLabel}${session.location ? ` à ${session.location}` : ''}`}
      accessibilityHint="Appui long pour supprimer"
    >
      <View className="flex-row items-center justify-between mb-2">
        <View
          className="px-2 py-0.5 rounded-full"
          style={{ backgroundColor: typeColor + '22' }}
        >
          <Text className="text-xs font-bold" style={{ color: typeColor }}>
            {typeLabel}
          </Text>
        </View>
        {session.difficulty && (
          <DifficultyBadge level={session.difficulty} />
        )}
      </View>

      {session.location && (
        <View className="flex-row items-center gap-1 mb-1">
          <Ionicons name="location-outline" size={13} color="#78716c" />
          <Text className="text-stone-500 dark:text-stone-400 text-sm">
            {session.location}
          </Text>
        </View>
      )}

      {routeCount !== undefined && routeCount > 0 && (
        <Text className="text-stone-600 dark:text-stone-300 text-sm">
          {session.type === 'bloc'
            ? `${routeCount} bloc${routeCount > 1 ? 's' : ''}`
            : `${routeCount} voie${routeCount > 1 ? 's' : ''}`}
          {successCount !== undefined
            ? ` · ${successCount}/${routeCount} réussi${successCount > 1 ? 'es' : 'e'}`
            : ''}
        </Text>
      )}
    </Pressable>
  );
}


// --- Day label helpers ---

const DAY_NAMES = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const MONTH_NAMES_SHORT = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

function formatDayLabel(dateKey: string): string {
  const date = new Date(dateKey + 'T00:00:00');
  return `${DAY_NAMES[date.getDay()]} ${date.getDate()} ${MONTH_NAMES_SHORT[date.getMonth()]}`;
}

// --- Empty State ---

function EmptyState() {
  const router = useRouter();

  return (
    <View className="items-center py-20">
      <Ionicons name="journal-outline" size={48} color="#a8a29e" style={{ marginBottom: 12 }} />
      <Text className="text-stone-500 dark:text-stone-400 text-lg text-center mb-4">
        Aucune séance enregistrée
      </Text>
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push('/protocols');
        }}
        className="bg-orange-500 rounded-2xl px-6 py-3"
        style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}
        accessibilityRole="button"
        accessibilityLabel="Commencer un protocole"
      >
        <Text className="text-white font-bold">Commencer un protocole</Text>
      </Pressable>
    </View>
  );
}

// --- Main Screen ---

export default function JournalScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [filter, setFilter] = useState<JournalFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const dayDetailSheetRef = useRef<BottomSheet>(null);

  const { days, stats, allEntries, loading, reload } = useJournalEntries(filter);

  const selectedDayEntries = useMemo(
    () => selectedDay
      ? allEntries.filter(e => e.data.date.slice(0, 10) === selectedDay)
      : [],
    [selectedDay, allEntries],
  );

  const handleDeleteClimbing = useCallback(async (id: string) => {
    await deleteClimbingSession(id);
    await reload();
  }, [reload]);

  const handleSelectDay = useCallback((dateKey: string) => {
    setSelectedDay((prev) => {
      if (prev === dateKey) {
        dayDetailSheetRef.current?.close();
        return null;
      }
      return dateKey;
    });
  }, []);

  useEffect(() => {
    if (selectedDay && selectedDayEntries.length > 0) {
      dayDetailSheetRef.current?.expand();
    }
  }, [selectedDay, selectedDayEntries.length]);

  const handleViewModeChange = useCallback(
    (m: ViewMode) => {
      const newIndex = VIEW_MODES.indexOf(m);
      const currentIndex = VIEW_MODES.indexOf(viewMode);
      setSlideDirection(newIndex > currentIndex ? 'right' : 'left');
      setViewMode(m);
      setSelectedDay(null);
    },
    [viewMode],
  );

  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .failOffsetY([-10, 10])
    .onEnd((event) => {
      const currentIndex = VIEW_MODES.indexOf(viewMode);
      if (event.translationX < -SWIPE_THRESHOLD && currentIndex < VIEW_MODES.length - 1) {
        setSlideDirection('right');
        setSelectedDay(null);
        setViewMode(VIEW_MODES[currentIndex + 1]);
      } else if (event.translationX > SWIPE_THRESHOLD && currentIndex > 0) {
        setSlideDirection('left');
        setSelectedDay(null);
        setViewMode(VIEW_MODES[currentIndex - 1]);
      }
    })
    .runOnJS(true);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
    ),
    [],
  );

  const hasAnyEntries = days.length > 0;

  return (
    <>
      <GestureDetector gesture={swipeGesture}>
      <ScrollView className="flex-1 bg-white dark:bg-stone-950 px-5 pt-4">
        <View className="mb-4">
          <SegmentedControl
            options={VIEW_MODE_OPTIONS}
            value={viewMode}
            onChange={handleViewModeChange}
          />
        </View>

        <StatsDashboard stats={stats} />

        {viewMode === 'list' && (
          <FilterPills active={filter} onChange={setFilter} />
        )}

        {viewMode === 'calendar' ? (
          <Animated.View
            key="calendar"
            entering={(slideDirection === 'right' ? SlideInRight : SlideInLeft).duration(250)}
          >
            {loading ? (
              <View className="items-center py-20">
                <ActivityIndicator color="#f97316" />
              </View>
            ) : (
              <CalendarView
                entries={allEntries}
                onSelectDay={handleSelectDay}
                selectedDay={selectedDay}
              />
            )}
          </Animated.View>
        ) : (
          <Animated.View
            key="list"
            entering={(slideDirection === 'right' ? SlideInRight : SlideInLeft).duration(250)}
          >
            {loading ? (
              <View className="items-center py-20">
                <ActivityIndicator color="#f97316" />
              </View>
            ) : !hasAnyEntries && filter === 'all' ? (
              <EmptyState />
            ) : !hasAnyEntries ? (
              <View className="items-center py-20">
                <Text className="text-stone-500 dark:text-stone-400 text-lg text-center">
                  Aucune séance pour ce filtre
                </Text>
              </View>
            ) : (
              days.map((day) => (
                <View key={day.dateKey} className="mb-5">
                  <Text
                    className="text-stone-500 dark:text-stone-400 text-sm font-bold uppercase mb-2"
                    accessibilityRole="header"
                  >
                    {day.label}
                  </Text>
                  {day.entries.map((entry) =>
                    entry.type === 'hangboard' ? (
                      <HangboardEntryCard key={entry.data.id} entry={entry.data} />
                    ) : (
                      <ClimbingEntryCard
                        key={entry.data.id}
                        session={entry.data}
                        onDelete={handleDeleteClimbing}
                      />
                    ),
                  )}
                </View>
              ))
            )}
          </Animated.View>
        )}

        <View className="h-28" />
      </ScrollView>
      </GestureDetector>

      <View
        style={{
          position: 'absolute',
          bottom: Math.max(insets.bottom, 16) + 8,
          right: 20,
        }}
      >
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push('/journal/add' as any);
          }}
          className="bg-orange-500 rounded-3xl px-5 py-4 flex-row items-center gap-2"
          style={({ pressed }) => ({
            transform: [{ scale: pressed ? 0.97 : 1 }],
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 4,
            elevation: 5,
          })}
          accessibilityRole="button"
          accessibilityLabel="Ajouter une activité"
        >
          <Ionicons name="add" size={20} color="white" />
          <Text className="text-white font-bold text-base">Ajouter une activité</Text>
        </Pressable>
      </View>

      <BottomSheet
        ref={dayDetailSheetRef}
        index={-1}
        snapPoints={['50%']}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: isDark ? '#1c1917' : '#ffffff' }}
        handleIndicatorStyle={{ backgroundColor: isDark ? '#57534e' : '#d6d3d1' }}
        onChange={(index) => {
          if (index === -1) {
            setSelectedDay(null);
          }
        }}
      >
        <BottomSheetView className="px-5 pb-10">
          {selectedDay && (
            <>
              <Text className="text-stone-900 dark:text-stone-50 text-lg font-bold mb-4">
                {formatDayLabel(selectedDay)}
              </Text>

              {selectedDayEntries.map((entry) => {
                const dotColor =
                  entry.type === 'hangboard'
                    ? '#818CF8'
                    : entry.data.type === 'bloc'
                      ? '#F97316'
                      : '#2563EB';
                return (
                  <View key={entry.data.id} className="flex-row items-start gap-3 mb-3">
                    <View className="mt-5 w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: dotColor }} />
                    <View className="flex-1">
                      {entry.type === 'hangboard' ? (
                        <HangboardEntryCard entry={entry.data} />
                      ) : (
                        <ClimbingEntryCard
                          session={entry.data}
                          onDelete={handleDeleteClimbing}
                        />
                      )}
                    </View>
                  </View>
                );
              })}

            </>
          )}
        </BottomSheetView>
      </BottomSheet>
    </>
  );
}
