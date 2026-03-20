import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useThemeColors } from '@/lib/theme';
import { saveClimbingSession, tryAutoCompletePlanSession } from '@/lib/storage';
import { useTimerStore } from '@/stores/timer-store';
import type { TimerConfig, Protocol } from '@/types';
import {
  todayIso,
  newClimbEntry,
  isoToDate,
  dateToIso,
  formatClimbingDate,
  VOIE_MODES,
  EFFORT_INTENSITIES,
} from '@/constants/climbing';
import { GRADES, DEFAULT_GRADE, gradeIndex, nextGrade, prevGrade } from '@/constants/grades';
import { SegmentedControl } from '@/components/SegmentedControl';
import type { ClimbEntry, VoieMode, EffortIntensity } from '@/types';

// ---------------------------------------------------------------------------
// NumericRow
// ---------------------------------------------------------------------------

interface NumericRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (value: number) => void;
}

function NumericRow({ label, value, min, max, step = 1, suffix, onChange }: NumericRowProps) {
  const handleDecrement = () => {
    if (value - step >= min) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onChange(value - step);
    }
  };

  const handleIncrement = () => {
    if (value + step <= max) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onChange(value + step);
    }
  };

  const atMin = value <= min;
  const atMax = value >= max;

  return (
    <View className="flex-row items-center justify-between py-3">
      <Text className="text-stone-900 dark:text-stone-100 text-base font-medium flex-1">
        {label}
      </Text>
      <View className="flex-row items-center gap-3">
        <Pressable
          onPress={handleDecrement}
          disabled={atMin}
          className={`w-11 h-11 rounded-xl items-center justify-center ${
            atMin
              ? 'bg-stone-100 dark:bg-stone-800'
              : 'bg-stone-200 dark:bg-stone-700'
          }`}
          accessibilityLabel={`Diminuer ${label}`}
          accessibilityRole="button"
        >
          <Ionicons
            name="remove"
            size={18}
            color={atMin ? '#a8a29e' : '#1c1917'}
          />
        </Pressable>

        <Text className="text-stone-900 dark:text-stone-100 text-base font-semibold w-14 text-center">
          {value}{suffix ? ` ${suffix}` : ''}
        </Text>

        <Pressable
          onPress={handleIncrement}
          disabled={atMax}
          className={`w-11 h-11 rounded-xl items-center justify-center ${
            atMax
              ? 'bg-stone-100 dark:bg-stone-800'
              : 'bg-stone-200 dark:bg-stone-700'
          }`}
          accessibilityLabel={`Augmenter ${label}`}
          accessibilityRole="button"
        >
          <Ionicons
            name="add"
            size={18}
            color={atMax ? '#a8a29e' : '#1c1917'}
          />
        </Pressable>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// EntryRow (mode Libre)
// ---------------------------------------------------------------------------

interface EntryRowProps {
  entry: ClimbEntry;
  onUpdate: (updated: ClimbEntry) => void;
  onRemove: () => void;
}

function EntryRow({ entry, onUpdate, onRemove }: EntryRowProps) {
  const grade = entry.grade ?? DEFAULT_GRADE;
  const success = entry.success ?? false;
  const attempts = entry.attempts ?? 1;

  const handlePrevGrade = () => {
    const prev = prevGrade(grade);
    if (prev !== grade) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onUpdate({ ...entry, grade: prev });
    }
  };

  const handleNextGrade = () => {
    const next = nextGrade(grade);
    if (next !== grade) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onUpdate({ ...entry, grade: next });
    }
  };

  const handleToggleSuccess = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onUpdate({ ...entry, success: !success });
  };

  const handleDecrementAttempts = () => {
    if (attempts > 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onUpdate({ ...entry, attempts: attempts - 1 });
    }
  };

  const handleIncrementAttempts = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onUpdate({ ...entry, attempts: attempts + 1 });
  };

  const atMinGrade = gradeIndex(grade) <= 0;
  const atMaxGrade = gradeIndex(grade) >= GRADES.length - 1;

  return (
    <View className="bg-stone-100 dark:bg-stone-800 rounded-2xl border border-stone-300 dark:border-stone-700/50 p-4 gap-3">
      <View className="flex-row items-center justify-between">
        {/* Grade stepper */}
        <View className="flex-row items-center gap-2">
          <Pressable
            onPress={handlePrevGrade}
            disabled={atMinGrade}
            className={`w-11 h-11 rounded-xl items-center justify-center ${
              atMinGrade ? 'bg-stone-200 dark:bg-stone-700' : 'bg-stone-200 dark:bg-stone-700'
            }`}
            accessibilityLabel="Cotation inférieure"
            accessibilityRole="button"
          >
            <Ionicons
              name="chevron-down"
              size={18}
              color={atMinGrade ? '#a8a29e' : '#1c1917'}
            />
          </Pressable>
          <Text className="text-stone-900 dark:text-stone-100 text-lg font-bold w-12 text-center">
            {grade}
          </Text>
          <Pressable
            onPress={handleNextGrade}
            disabled={atMaxGrade}
            className={`w-11 h-11 rounded-xl items-center justify-center bg-stone-200 dark:bg-stone-700`}
            accessibilityLabel="Cotation supérieure"
            accessibilityRole="button"
          >
            <Ionicons
              name="chevron-up"
              size={18}
              color={atMaxGrade ? '#a8a29e' : '#1c1917'}
            />
          </Pressable>
        </View>

        {/* Success toggle */}
        <Pressable
          onPress={handleToggleSuccess}
          className={`px-3 py-1.5 rounded-xl ${
            success ? 'bg-green-500' : 'bg-stone-200 dark:bg-stone-700'
          }`}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: success }}
          accessibilityLabel="Réussie"
        >
          <Text
            className={`text-sm font-semibold ${
              success ? 'text-white' : 'text-stone-500 dark:text-stone-400'
            }`}
          >
            {success ? 'Réussie' : 'Échouée'}
          </Text>
        </Pressable>

        {/* Remove button */}
        <Pressable
          onPress={onRemove}
          className="w-11 h-11 rounded-xl items-center justify-center bg-stone-200 dark:bg-stone-700"
          accessibilityLabel="Supprimer cette voie"
          accessibilityRole="button"
        >
          <Ionicons name="trash-outline" size={16} color="#ef4444" />
        </Pressable>
      </View>

      {/* Attempts */}
      <View className="flex-row items-center gap-2">
        <Text className="text-stone-500 dark:text-stone-400 text-sm">Essais :</Text>
        <Pressable
          onPress={handleDecrementAttempts}
          disabled={attempts <= 1}
          className="w-11 h-11 rounded-lg items-center justify-center bg-stone-200 dark:bg-stone-700"
          accessibilityLabel="Diminuer les essais"
          accessibilityRole="button"
        >
          <Ionicons name="remove" size={16} color={attempts <= 1 ? '#a8a29e' : '#1c1917'} />
        </Pressable>
        <Text className="text-stone-900 dark:text-stone-100 text-sm font-semibold w-6 text-center">
          {attempts}
        </Text>
        <Pressable
          onPress={handleIncrementAttempts}
          className="w-11 h-11 rounded-lg items-center justify-center bg-stone-200 dark:bg-stone-700"
          accessibilityLabel="Augmenter les essais"
          accessibilityRole="button"
        >
          <Ionicons name="add" size={16} color="#1c1917" />
        </Pressable>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// LibreForm
// ---------------------------------------------------------------------------

interface LibreFormProps {
  entries: ClimbEntry[];
  onEntriesChange: (entries: ClimbEntry[]) => void;
}

function LibreForm({ entries, onEntriesChange }: LibreFormProps) {
  const handleUpdate = useCallback(
    (index: number, updated: ClimbEntry) => {
      const next = [...entries];
      next[index] = updated;
      onEntriesChange(next);
    },
    [entries, onEntriesChange]
  );

  const handleRemove = useCallback(
    (index: number) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onEntriesChange(entries.filter((_, i) => i !== index));
    },
    [entries, onEntriesChange]
  );

  const handleAdd = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onEntriesChange([...entries, newClimbEntry(DEFAULT_GRADE)]);
  };

  return (
    <View className="gap-3">
      {entries.map((entry, index) => (
        <EntryRow
          key={entry.id}
          entry={entry}
          onUpdate={(updated) => handleUpdate(index, updated)}
          onRemove={() => handleRemove(index)}
        />
      ))}

      <Pressable
        onPress={handleAdd}
        className="bg-blue-600 rounded-2xl py-4 items-center"
        style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
        accessibilityRole="button"
        accessibilityLabel="Ajouter une voie"
      >
        <View className="flex-row items-center gap-2">
          <Ionicons name="add" size={20} color="#fff" />
          <Text className="text-white font-semibold text-base">Ajouter une voie</Text>
        </View>
      </Pressable>
    </View>
  );
}

// ---------------------------------------------------------------------------
// ContinuityLongForm
// ---------------------------------------------------------------------------

interface ContinuityLongState {
  rounds: number;
  effortPerRound: number;
  restBetweenRounds: number;
  intensity: EffortIntensity;
}

interface ContinuityLongFormProps {
  state: ContinuityLongState;
  onChange: (state: ContinuityLongState) => void;
}

function ContinuityLongForm({ state, onChange }: ContinuityLongFormProps) {
  return (
    <View className="bg-stone-100 dark:bg-stone-800 rounded-2xl border border-stone-300 dark:border-stone-700/50 px-4">
      <NumericRow
        label="Tours"
        value={state.rounds}
        min={1}
        max={5}
        onChange={(v) => onChange({ ...state, rounds: v })}
      />
      <View className="h-px bg-stone-200 dark:bg-stone-700" />
      <NumericRow
        label="Effort / tour"
        value={state.effortPerRound}
        min={1}
        max={30}
        suffix="min"
        onChange={(v) => onChange({ ...state, effortPerRound: v })}
      />
      <View className="h-px bg-stone-200 dark:bg-stone-700" />
      <NumericRow
        label="Repos entre tours"
        value={state.restBetweenRounds}
        min={1}
        max={20}
        suffix="min"
        onChange={(v) => onChange({ ...state, restBetweenRounds: v })}
      />
      <View className="h-px bg-stone-200 dark:bg-stone-700" />
      <View className="py-3 gap-2">
        <Text className="text-stone-900 dark:text-stone-100 text-base font-medium">
          Intensité ressentie
        </Text>
        <SegmentedControl
          options={EFFORT_INTENSITIES}
          value={state.intensity}
          onChange={(v) => onChange({ ...state, intensity: v })}
        />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// ContinuityShortForm
// ---------------------------------------------------------------------------

interface ContinuityShortState {
  rounds: number;
  setsPerRound: number;
  effortPerSet: number;
  restBetweenSets: number;
  fellFromRound: number;
}

interface ContinuityShortFormProps {
  state: ContinuityShortState;
  onChange: (state: ContinuityShortState) => void;
}

function ContinuityShortForm({ state, onChange }: ContinuityShortFormProps) {
  return (
    <View className="bg-stone-100 dark:bg-stone-800 rounded-2xl border border-stone-300 dark:border-stone-700/50 px-4">
      <NumericRow
        label="Tours"
        value={state.rounds}
        min={1}
        max={8}
        onChange={(v) =>
          onChange({
            ...state,
            rounds: v,
            fellFromRound: Math.min(state.fellFromRound, v),
          })
        }
      />
      <View className="h-px bg-stone-200 dark:bg-stone-700" />
      <NumericRow
        label="Séries / tour"
        value={state.setsPerRound}
        min={1}
        max={8}
        onChange={(v) => onChange({ ...state, setsPerRound: v })}
      />
      <View className="h-px bg-stone-200 dark:bg-stone-700" />
      <NumericRow
        label="Effort / série"
        value={state.effortPerSet}
        min={1}
        max={15}
        suffix="min"
        onChange={(v) => onChange({ ...state, effortPerSet: v })}
      />
      <View className="h-px bg-stone-200 dark:bg-stone-700" />
      <NumericRow
        label="Repos entre séries"
        value={state.restBetweenSets}
        min={1}
        max={10}
        suffix="min"
        onChange={(v) => onChange({ ...state, restBetweenSets: v })}
      />
      <View className="h-px bg-stone-200 dark:bg-stone-700" />
      <NumericRow
        label="Tombé au tour"
        value={state.fellFromRound}
        min={0}
        max={state.rounds}
        onChange={(v) => onChange({ ...state, fellFromRound: v })}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// AddVoieScreen
// ---------------------------------------------------------------------------

const DEFAULT_CONTINUITY_LONG: ContinuityLongState = {
  rounds: 2,
  effortPerRound: 15,
  restBetweenRounds: 10,
  intensity: 'correct',
};

const DEFAULT_CONTINUITY_SHORT: ContinuityShortState = {
  rounds: 4,
  setsPerRound: 4,
  effortPerSet: 3,
  restBetweenSets: 3,
  fellFromRound: 0,
};

export default function AddVoieScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();

  const [mode, setMode] = useState<VoieMode>('libre');
  const [dateIso, setDateIso] = useState(todayIso());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [entries, setEntries] = useState<ClimbEntry[]>([newClimbEntry(DEFAULT_GRADE)]);
  const [continuityLong, setContinuityLong] = useState<ContinuityLongState>(DEFAULT_CONTINUITY_LONG);
  const [continuityShort, setContinuityShort] = useState<ContinuityShortState>(DEFAULT_CONTINUITY_SHORT);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleDateChange = (_: unknown, selected?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selected) {
      setDateIso(dateToIso(selected));
    }
  };

  const buildSession = () => {
    const base = {
      id: Date.now().toString(),
      date: dateIso,
      type: 'voie' as const,
      voieMode: mode,
      notes: notes.trim() || undefined,
    };

    if (mode === 'libre') {
      return { ...base, entries };
    }

    if (mode === 'continuity-long') {
      return {
        ...base,
        rounds: continuityLong.rounds,
        effortPerRound: continuityLong.effortPerRound,
        restBetweenRounds: continuityLong.restBetweenRounds,
        intensity: continuityLong.intensity,
      };
    }

    return {
      ...base,
      rounds: continuityShort.rounds,
      setsPerRound: continuityShort.setsPerRound,
      effortPerSet: continuityShort.effortPerSet,
      restBetweenSets: continuityShort.restBetweenSets,
      fellFromRound: continuityShort.fellFromRound === 0 ? undefined : continuityShort.fellFromRound,
    };
  };

  const handleLaunchTimer = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    let timerConfig: TimerConfig;

    if (mode === 'continuity-long') {
      timerConfig = {
        prepDuration: 10,
        hangDuration: continuityLong.effortPerRound * 60,
        restBetweenReps: 0,
        reps: 1,
        sets: continuityLong.rounds,
        restBetweenSets: continuityLong.restBetweenRounds * 60,
      };
    } else {
      timerConfig = {
        prepDuration: 10,
        hangDuration: continuityShort.effortPerSet * 60,
        restBetweenReps: continuityShort.restBetweenSets * 60,
        reps: continuityShort.setsPerRound,
        sets: continuityShort.rounds,
        restBetweenSets: continuityShort.restBetweenSets * 60 * 2,
      };
    }

    const pseudoProtocol = {
      id: `continuity-${mode}`,
      name: mode === 'continuity-long' ? 'Continuité longue' : 'Continuité courte',
    } as Protocol;

    useTimerStore.getState().setup(pseudoProtocol, 'session', [], timerConfig);
    useTimerStore.getState().setContinuityMeta({
      mode: mode as 'continuity-long' | 'continuity-short',
      voieSessionData: buildSession(),
    });

    router.push('/timer' as any);
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await saveClimbingSession(buildSession());
      await tryAutoCompletePlanSession({ type: 'climbing', climbingType: 'voie' });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch {
      setSaving(false);
    }
  };

  return (
    <View className="flex-1 bg-white dark:bg-stone-950">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: insets.bottom + 100,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Mode selector */}
        <SegmentedControl
          options={VOIE_MODES}
          value={mode}
          onChange={setMode}
        />

        {/* Date picker */}
        <Pressable
          onPress={() => setShowDatePicker(true)}
          className="mt-4 bg-stone-100 dark:bg-stone-800 rounded-2xl border border-stone-300 dark:border-stone-700/50 px-4 py-3 flex-row items-center justify-between"
          accessibilityRole="button"
          accessibilityLabel={`Date : ${formatClimbingDate(dateIso)}`}
        >
          <View className="flex-row items-center gap-3">
            <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
            <Text className="text-stone-900 dark:text-stone-100 text-base font-medium">
              {formatClimbingDate(dateIso)}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.chevron} />
        </Pressable>

        {showDatePicker && (
          <DateTimePicker
            value={isoToDate(dateIso)}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateChange}
            maximumDate={new Date()}
          />
        )}

        {/* Form per mode */}
        <View className="mt-4">
          {mode === 'libre' && (
            <LibreForm entries={entries} onEntriesChange={setEntries} />
          )}
          {mode === 'continuity-long' && (
            <ContinuityLongForm state={continuityLong} onChange={setContinuityLong} />
          )}
          {mode === 'continuity-short' && (
            <ContinuityShortForm state={continuityShort} onChange={setContinuityShort} />
          )}
        </View>

        {/* Notes */}
        <View className="mt-4 bg-stone-100 dark:bg-stone-800 rounded-2xl border border-stone-300 dark:border-stone-700/50 px-4 py-3">
          <Text className="text-stone-500 dark:text-stone-400 text-xs font-medium mb-2 uppercase tracking-wide">
            Notes
          </Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Observations, ressentis..."
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={3}
            className="text-stone-900 dark:text-stone-100 text-base"
            style={{ minHeight: 72, textAlignVertical: 'top' }}
            accessibilityLabel="Notes optionnelles"
          />
        </View>
      </ScrollView>

      {/* Sticky save button */}
      <View
        className="absolute bottom-0 left-0 right-0 bg-white dark:bg-stone-950 border-t border-stone-200 dark:border-stone-800 px-5"
        style={{ paddingBottom: insets.bottom + 12, paddingTop: 12 }}
      >
        {(mode === 'continuity-long' || mode === 'continuity-short') && (
          <Pressable
            onPress={handleLaunchTimer}
            className="bg-stone-100 dark:bg-stone-800 rounded-2xl py-4 items-center flex-row justify-center gap-2 mb-2 border border-stone-300 dark:border-stone-700/50"
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            accessibilityRole="button"
            accessibilityLabel="Lancer le timer"
          >
            <Ionicons name="timer-outline" size={20} color="#2563EB" />
            <Text className="text-blue-600 font-bold text-base">Lancer le timer</Text>
          </Pressable>
        )}
        <Pressable
          onPress={handleSave}
          disabled={saving}
          className="bg-blue-600 rounded-2xl py-4 items-center"
          style={({ pressed }) => ({ opacity: pressed || saving ? 0.7 : 1 })}
          accessibilityRole="button"
          accessibilityLabel="Enregistrer la séance"
        >
          <Text className="text-white font-bold text-base">
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
