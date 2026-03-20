import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '@/lib/theme';
import { loadHistory, loadClimbingSessions, updateClimbingSession, loadSettings } from '@/lib/storage';
import { formatGripConfig } from '@/constants/grips';
import {
  CLIMBING_TYPES,
  DIFFICULTY_LEVELS,
  TYPE_COLORS,
  DIFFICULTY_LABELS,
  formatClimbingDate,
  extractUniqueLocations,
  newClimbEntry,
  todayIso,
  formatDuration,
} from '@/constants/climbing';
import { DEFAULT_GRADE } from '@/constants/grades';
import {
  GradeStepper,
  NativeDatePicker,
  LocationInput,
  DifficultyBadge,
  ClimbEntryCard,
  ToggleButton,
} from '@/components/journal';
import type {
  SessionHistoryEntry,
  ClimbingSession,
  ClimbEntry,
  ClimbingType,
  DifficultyLevel,
} from '@/types';

// --- Helpers ---

function formatHangboardDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

// --- Sub-components ---

interface StatCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  color?: string;
}

function StatCard({ icon, label, value, color }: StatCardProps) {
  const colors = useThemeColors();
  const iconColor = color ?? colors.textSecondary;
  return (
    <View
      className="bg-stone-100 dark:bg-stone-800 border border-stone-300 dark:border-stone-700/50 rounded-3xl p-4 flex-1"
      accessible
      accessibilityLabel={`${label} : ${value}`}
    >
      <View
        className="w-10 h-10 rounded-xl items-center justify-center mb-3"
        style={{ backgroundColor: iconColor + '20' }}
      >
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <Text className="text-stone-900 dark:text-stone-50 text-xl font-bold">{value}</Text>
      <Text className="text-stone-400 dark:text-stone-500 text-xs mt-1">{label}</Text>
    </View>
  );
}

interface ConfigRowProps {
  label: string;
  value: string;
}

function ConfigRow({ label, value }: ConfigRowProps) {
  return (
    <View className="flex-row items-center justify-between py-2">
      <Text className="text-stone-500 dark:text-stone-400 text-sm">{label}</Text>
      <Text className="text-stone-900 dark:text-stone-50 text-sm font-semibold">{value}</Text>
    </View>
  );
}

// --- Hangboard Detail ---

interface HangboardDetailProps {
  entry: SessionHistoryEntry;
}

function HangboardDetail({ entry }: HangboardDetailProps) {
  const { result } = entry;
  const { protocol, config, completedSets, completedRounds, totalDuration, completed } = result;

  return (
    <ScrollView className="flex-1 bg-white dark:bg-stone-950 px-5 pt-4" showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View className="items-center mb-6">
        <Text className="text-5xl mb-3">{protocol.icon}</Text>
        <Text className="text-stone-900 dark:text-stone-50 text-2xl font-bold text-center mb-1">
          {protocol.name}
        </Text>
        <Text className="text-stone-500 dark:text-stone-400 text-sm">
          {formatHangboardDate(entry.date)}
        </Text>
      </View>

      {/* Status badge */}
      <View className="items-center mb-6">
        <View
          className={`px-4 py-1.5 rounded-full ${
            completed ? 'bg-lime-500/20' : 'bg-amber-500/20'
          }`}
        >
          <Text
            className={`text-sm font-semibold ${
              completed ? 'text-lime-600 dark:text-lime-400' : 'text-amber-600 dark:text-amber-400'
            }`}
          >
            {completed ? 'Terminée' : 'Interrompue'}
          </Text>
        </View>
      </View>

      {/* Stats row */}
      <View className="flex-row gap-3 mb-4">
        <StatCard
          icon="time-outline"
          label="Durée"
          value={formatDuration(totalDuration)}
          color="#F97316"
        />
        <StatCard
          icon="repeat-outline"
          label={completedSets > 1 ? 'Séries' : 'Série'}
          value={String(completedSets)}
          color="#818CF8"
        />
      </View>

      {/* Config card */}
      <View className="bg-stone-100 dark:bg-stone-800 border border-stone-300 dark:border-stone-700/50 rounded-3xl p-4 mb-4">
        <Text className="text-stone-900 dark:text-stone-50 font-semibold mb-2">Configuration</Text>
        <ConfigRow label="Suspension" value={`${config.hangDuration}s`} />
        <View className="h-px bg-stone-200 dark:bg-stone-700" />
        <ConfigRow label="Repos entre reps" value={`${config.restBetweenReps}s`} />
        <View className="h-px bg-stone-200 dark:bg-stone-700" />
        <ConfigRow label="Repos entre series" value={`${config.restBetweenSets}s`} />
        <View className="h-px bg-stone-200 dark:bg-stone-700" />
        <ConfigRow label="Reps par serie" value={String(config.reps)} />
        <View className="h-px bg-stone-200 dark:bg-stone-700" />
        <ConfigRow label="Nombre de series" value={String(config.sets)} />
        {config.rounds && config.rounds > 1 && (
          <>
            <View className="h-px bg-stone-200 dark:bg-stone-700" />
            <ConfigRow label="Rounds" value={String(completedRounds)} />
            <View className="h-px bg-stone-200 dark:bg-stone-700" />
            <ConfigRow label="Repos entre rounds" value={`${config.restBetweenRounds ?? 0}s`} />
          </>
        )}
      </View>

      {/* Grips section */}
      {result.gripConfigs.length > 0 && (
        <View className="bg-stone-100 dark:bg-stone-800 border border-stone-300 dark:border-stone-700/50 rounded-3xl p-4 mb-4">
          <Text className="text-stone-900 dark:text-stone-50 font-semibold mb-2">Prehensions</Text>
          {result.gripConfigs.map((gc, index) => (
            <View key={index}>
              {index > 0 && <View className="h-px bg-stone-200 dark:bg-stone-700 my-2" />}
              <View className="flex-row items-center gap-2">
                <View className="w-6 h-6 rounded-full bg-orange-500/20 items-center justify-center">
                  <Text className="text-orange-500 text-xs font-bold">{index + 1}</Text>
                </View>
                <Text className="text-stone-700 dark:text-stone-300 text-sm flex-1">
                  {formatGripConfig(gc)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      <View className="h-8" />
    </ScrollView>
  );
}

// --- Climbing Detail ---

interface ClimbingDetailProps {
  session: ClimbingSession;
  defaultGrade: string;
  knownLocations: string[];
  onSaved: () => void;
}

function ClimbingDetail({ session, defaultGrade, knownLocations, onSaved }: ClimbingDetailProps) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  const [editing, setEditing] = useState(false);
  const [localType, setLocalType] = useState<ClimbingType>(session.type);
  const [localDate, setLocalDate] = useState(session.date ?? todayIso());
  const [localLocation, setLocalLocation] = useState(session.location ?? '');
  const [localDifficulty, setLocalDifficulty] = useState<DifficultyLevel | undefined>(
    session.difficulty
  );
  const [localEntries, setLocalEntries] = useState<ClimbEntry[]>(session.entries ?? []);
  const [localRouteCount, setLocalRouteCount] = useState(session.routeCount ?? 0);

  const routeCount = localEntries.length > 0 ? localEntries.length : localRouteCount;
  const typeColor = TYPE_COLORS[localType];

  function toggleDifficulty(level: DifficultyLevel) {
    setLocalDifficulty((prev) => (prev === level ? undefined : level));
    Haptics.selectionAsync();
  }

  function updateEntry(index: number, updated: ClimbEntry) {
    setLocalEntries((prev) => {
      const next = [...prev];
      next[index] = updated;
      return next;
    });
  }

  function deleteEntry(index: number) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLocalEntries((prev) => prev.filter((_, i) => i !== index));
  }

  function addEntry() {
    Haptics.selectionAsync();
    setLocalEntries((prev) => [...prev, newClimbEntry(defaultGrade)]);
  }

  async function handleSave() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const updated: ClimbingSession = {
      ...session,
      type: localType,
      date: localDate,
      location: localLocation || undefined,
      difficulty: localDifficulty,
      entries: localEntries.length > 0 ? localEntries : undefined,
      routeCount: localEntries.length > 0 ? localEntries.length : localRouteCount,
    };
    await updateClimbingSession(updated);
    onSaved();
  }

  return (
    <ScrollView
      className="flex-1 bg-white dark:bg-stone-950"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32 }}
    >
      {/* Metadata header */}
      <View className="bg-stone-100 dark:bg-stone-800 border border-stone-300 dark:border-stone-700/50 rounded-3xl p-4 mb-4">
        <View className="flex-row items-center justify-between mb-3">
          <View className="px-3 py-1 rounded-full" style={{ backgroundColor: typeColor + '20' }}>
            <Text className="text-sm font-semibold" style={{ color: typeColor }}>
              {localType === 'bloc' ? 'Bloc' : 'Voie'}
            </Text>
          </View>
          <Pressable
            onPress={() => {
              setEditing((v) => !v);
              Haptics.selectionAsync();
            }}
            hitSlop={8}
            style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}
            accessibilityRole="button"
            accessibilityLabel={editing ? 'Fermer la modification' : 'Modifier les informations'}
          >
            <Ionicons
              name={editing ? 'checkmark-outline' : 'create-outline'}
              size={20}
              color={editing ? '#F97316' : colors.textSecondary}
            />
          </Pressable>
        </View>

        {editing ? (
          <View className="gap-3">
            {/* Type toggle */}
            <View className="flex-row gap-2">
              {CLIMBING_TYPES.map((ct) => (
                <ToggleButton<ClimbingType>
                  key={ct.value}
                  value={ct.value}
                  selected={localType === ct.value}
                  label={ct.label}
                  onPress={(v) => {
                    setLocalType(v);
                    Haptics.selectionAsync();
                  }}
                />
              ))}
            </View>

            {/* Date picker */}
            <NativeDatePicker isoDate={localDate} onChange={setLocalDate} />

            {/* Location input */}
            <LocationInput
              value={localLocation}
              suggestions={knownLocations}
              onChangeText={setLocalLocation}
              onSelectSuggestion={setLocalLocation}
            />

            {/* Difficulty toggles */}
            <View className="flex-row flex-wrap gap-2">
              {DIFFICULTY_LEVELS.map((dl) => (
                <ToggleButton<DifficultyLevel>
                  key={dl.value}
                  value={dl.value}
                  selected={localDifficulty === dl.value}
                  label={dl.label}
                  onPress={toggleDifficulty}
                />
              ))}
            </View>
          </View>
        ) : (
          <View className="gap-1">
            <Text className="text-stone-900 dark:text-stone-50 font-semibold">
              {formatClimbingDate(localDate)}
            </Text>
            {localLocation ? (
              <View className="flex-row items-center gap-1">
                <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
                <Text className="text-stone-500 dark:text-stone-400 text-sm">{localLocation}</Text>
              </View>
            ) : null}
            {localDifficulty ? (
              <View className="mt-1">
                <DifficultyBadge level={localDifficulty} />
              </View>
            ) : null}
            {routeCount > 0 && (
              <Text className="text-stone-500 dark:text-stone-400 text-sm">
                {routeCount} {localType === 'bloc' ? 'bloc' : 'voie'}{routeCount > 1 ? 's' : ''}
              </Text>
            )}
          </View>
        )}
      </View>

      {/* Entries section */}
      {localEntries.map((entry, index) => (
        <ClimbEntryCard
          key={entry.id}
          entry={entry}
          sessionType={localType}
          onUpdate={(updated) => updateEntry(index, updated)}
          onDelete={() => deleteEntry(index)}
        />
      ))}

      {/* Add entry button */}
      <Pressable
        onPress={addEntry}
        className="border-2 border-dashed border-stone-300 dark:border-stone-600 rounded-2xl py-4 items-center mb-4"
        style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}
        accessibilityRole="button"
        accessibilityLabel={`Ajouter un ${localType === 'bloc' ? 'bloc' : 'une voie'}`}
      >
        <View className="flex-row items-center gap-2">
          <Ionicons name="add-circle-outline" size={18} color={colors.textMuted} />
          <Text className="text-stone-400 dark:text-stone-500 text-sm font-medium">
            Ajouter un {localType === 'bloc' ? 'bloc' : 'une voie'}
          </Text>
        </View>
      </Pressable>

      {/* Save button */}
      <Pressable
        onPress={handleSave}
        className="bg-orange-500 rounded-2xl py-4 items-center"
        style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}
        accessibilityRole="button"
        accessibilityLabel="Enregistrer les modifications"
      >
        <Text className="text-white text-base font-semibold">Enregistrer</Text>
      </Pressable>
    </ScrollView>
  );
}

// --- Main screen ---

export default function JournalDetailScreen() {
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const id = Array.isArray(rawId) ? rawId[0] : rawId ?? '';
  const router = useRouter();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  const isHangboard = id.startsWith('h-');
  const realId = id.slice(2);

  const [loading, setLoading] = useState(true);
  const [hangboardEntry, setHangboardEntry] = useState<SessionHistoryEntry | null>(null);
  const [climbingSession, setClimbingSession] = useState<ClimbingSession | null>(null);
  const [defaultGrade, setDefaultGrade] = useState(DEFAULT_GRADE);
  const [knownLocations, setKnownLocations] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      try {
        if (isHangboard) {
          const history = await loadHistory();
          const found = history.find((e) => e.id === realId) ?? null;
          if (!cancelled) setHangboardEntry(found);
        } else {
          const [sessions, settings] = await Promise.all([
            loadClimbingSessions(),
            loadSettings(),
          ]);
          const found = sessions.find((s) => s.id === realId) ?? null;
          if (!cancelled) {
            setClimbingSession(found);
            setKnownLocations(extractUniqueLocations(sessions));
            if (settings?.defaultGrade) setDefaultGrade(settings.defaultGrade);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();
    return () => { cancelled = true; };
  }, [isHangboard, realId]);

  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  }, [router]);

  const handleSaved = useCallback(() => {
    router.back();
  }, [router]);

  const title = isHangboard ? 'Seance poutre' : 'Seance escalade';
  const notFoundLabel = 'Seance introuvable';

  return (
    <View className="flex-1 bg-white dark:bg-stone-950" style={{ paddingTop: insets.top }}>
      {/* Navigation header */}
      <View className="flex-row items-center px-5 py-3 border-b border-stone-200 dark:border-stone-800">
        <Pressable
          onPress={handleBack}
          hitSlop={8}
          style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}
          accessibilityRole="button"
          accessibilityLabel="Retour"
        >
          <Ionicons name="arrow-back-outline" size={24} color={colors.text} />
        </Pressable>
        <Text className="text-stone-900 dark:text-stone-50 text-lg font-semibold ml-3 flex-1">
          {title}
        </Text>
      </View>

      {/* Content */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#F97316" />
          <Text className="text-stone-400 dark:text-stone-500 text-sm mt-3">Chargement...</Text>
        </View>
      ) : isHangboard ? (
        hangboardEntry ? (
          <HangboardDetail entry={hangboardEntry} />
        ) : (
          <NotFound label={notFoundLabel} onBack={handleBack} />
        )
      ) : climbingSession ? (
        <ClimbingDetail
          session={climbingSession}
          defaultGrade={defaultGrade}
          knownLocations={knownLocations}
          onSaved={handleSaved}
        />
      ) : (
        <NotFound label={notFoundLabel} onBack={handleBack} />
      )}
    </View>
  );
}

interface NotFoundProps {
  label: string;
  onBack: () => void;
}

function NotFound({ label, onBack }: NotFoundProps) {
  return (
    <View className="flex-1 items-center justify-center px-8">
      <Ionicons name="search-outline" size={48} color="#a8a29e" />
      <Text className="text-stone-900 dark:text-stone-50 text-xl font-bold mt-4 text-center">
        {label}
      </Text>
      <Pressable
        onPress={onBack}
        className="mt-6 px-6 py-3 bg-orange-500 rounded-2xl"
        style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}
        accessibilityRole="button"
        accessibilityLabel="Retour"
      >
        <Text className="text-white font-semibold">Retour</Text>
      </Pressable>
    </View>
  );
}
