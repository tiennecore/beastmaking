import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ScrollView,
  Text,
  View,
  TextInput,
  Pressable,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PROTOCOLS } from '@/constants/protocols';
import { GripConfigSection } from '@/components/GripConfigSection';
import { SegmentedControl } from '@/components/SegmentedControl';
import { saveCustomWorkout, loadCustomWorkouts, updateCustomWorkout } from '@/lib/storage';
import { useThemeColors } from '@/lib/theme';
import type { CustomWorkout, WorkoutStep, TimerConfig, GripMode, GripConfig } from '@/types';

type Mode = 'compose' | 'free';

const MODE_OPTIONS: Array<{ value: Mode; label: string }> = [
  { value: 'compose', label: 'Composer' },
  { value: 'free', label: 'Timer libre' },
];

const DEFAULT_PREP_DURATION = 5;

const ICONS: Array<keyof typeof Ionicons.glyphMap> = [
  'barbell-outline',
  'flame-outline',
  'flash-outline',
  'body-outline',
  'fitness-outline',
  'heart-outline',
  'trophy-outline',
  'rocket-outline',
];

const FREE_DEFAULTS: TimerConfig = {
  prepDuration: 5,
  hangDuration: 7,
  restBetweenReps: 3,
  reps: 6,
  sets: 3,
  restBetweenSets: 120,
};

type ComposeStep = {
  protocolId: string;
  config: TimerConfig;
  gripMode: GripMode;
  gripConfigs: GripConfig[];
};

type FreeStep = {
  name: string;
  config: TimerConfig;
  gripMode: GripMode;
  gripConfigs: GripConfig[];
};

// --- Duration input row (unified total seconds) ---

function DurationRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  const minusRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const plusRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onChangeRef = useRef(onChange);
  const valueRef = useRef(value);
  onChangeRef.current = onChange;
  valueRef.current = value;

  const getStep = () => {
    const v = valueRef.current;
    return v > 120 ? 10 : v > 60 ? 5 : 1;
  };

  const startRepeat = useCallback((direction: 1 | -1, timerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>) => {
    Haptics.selectionAsync();
    onChangeRef.current(Math.max(0, valueRef.current + direction * getStep()));
    let speed = 300;

    const tick = () => {
      const s = valueRef.current > 120 ? 10 : valueRef.current > 60 ? 5 : 1;
      onChangeRef.current(Math.max(0, valueRef.current + direction * s));
      speed = Math.max(50, speed * 0.85);
      timerRef.current = setTimeout(tick, speed);
    };

    timerRef.current = setTimeout(tick, 400);
  }, []);

  const stopRepeat = useCallback((timerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  const formatDuration = (s: number): string => {
    const min = Math.floor(s / 60);
    const sec = s % 60;
    if (min === 0) return `${sec}s`;
    return sec > 0 ? `${min}m${sec.toString().padStart(2, '0')}s` : `${min}m`;
  };

  return (
    <View className="flex-row items-center justify-between py-2">
      <Text className="text-stone-600 dark:text-stone-300 flex-1">{label}</Text>
      <View className="flex-row items-center gap-2">
        <Pressable
          className="bg-stone-200 dark:bg-stone-700 rounded-xl w-12 h-12 items-center justify-center active:bg-stone-300 dark:active:bg-stone-600"
          onPressIn={() => startRepeat(-1, minusRef)}
          onPressOut={() => stopRepeat(minusRef)}
          disabled={value <= 0}
          style={value <= 0 ? { opacity: 0.4 } : undefined}
          accessibilityRole="button"
          accessibilityLabel={`Réduire ${label}`}
        >
          <Text className="text-stone-900 dark:text-stone-50 font-bold">−</Text>
        </Pressable>
        <View className="bg-stone-200 dark:bg-stone-700 rounded-xl min-w-[64px] h-12 items-center justify-center px-2">
          <Text className="text-stone-900 dark:text-stone-50 font-bold">{formatDuration(value)}</Text>
        </View>
        <Pressable
          className="bg-stone-200 dark:bg-stone-700 rounded-xl w-12 h-12 items-center justify-center active:bg-stone-300 dark:active:bg-stone-600"
          onPressIn={() => startRepeat(1, plusRef)}
          onPressOut={() => stopRepeat(plusRef)}
          accessibilityRole="button"
          accessibilityLabel={`Augmenter ${label}`}
        >
          <Text className="text-stone-900 dark:text-stone-50 font-bold">+</Text>
        </Pressable>
      </View>
    </View>
  );
}

// --- Numeric input row ---

function NumericRow({
  label,
  value,
  onChange,
  min = 0,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
}) {
  const minusRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const plusRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onChangeRef = useRef(onChange);
  const valueRef = useRef(value);
  onChangeRef.current = onChange;
  valueRef.current = value;

  const startRepeat = useCallback((delta: number, timerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>) => {
    Haptics.selectionAsync();
    const newVal = Math.max(min, valueRef.current + delta);
    onChangeRef.current(newVal);
    let speed = 300;

    const tick = () => {
      const next = Math.max(min, valueRef.current + delta);
      onChangeRef.current(next);
      speed = Math.max(50, speed * 0.85);
      timerRef.current = setTimeout(tick, speed);
    };

    timerRef.current = setTimeout(tick, 400);
  }, [min]);

  const stopRepeat = useCallback((timerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  return (
    <View className="flex-row items-center justify-between py-2">
      <Text className="text-stone-600 dark:text-stone-300 flex-1">{label}</Text>
      <View className="flex-row items-center gap-2">
        <Pressable
          className="bg-stone-200 dark:bg-stone-700 rounded-xl w-12 h-12 items-center justify-center active:bg-stone-300 dark:active:bg-stone-600"
          onPressIn={() => startRepeat(-1, minusRef)}
          onPressOut={() => stopRepeat(minusRef)}
          style={value <= min ? { opacity: 0.4 } : undefined}
          disabled={value <= min}
          accessibilityRole="button"
          accessibilityLabel={`Réduire ${label}`}
        >
          <Text className="text-stone-900 dark:text-stone-50 font-bold">−</Text>
        </Pressable>
        <TextInput
          className="bg-stone-200 dark:bg-stone-700 rounded-md text-stone-900 dark:text-stone-50 text-center font-bold w-14 h-12 px-1"
          value={String(value)}
          onChangeText={(t) => {
            const n = parseInt(t, 10);
            if (!isNaN(n) && n >= min) onChange(n);
          }}
          keyboardType="numeric"
          selectTextOnFocus
        />
        <Pressable
          className="bg-stone-200 dark:bg-stone-700 rounded-xl w-12 h-12 items-center justify-center active:bg-stone-300 dark:active:bg-stone-600"
          onPressIn={() => startRepeat(1, plusRef)}
          onPressOut={() => stopRepeat(plusRef)}
          accessibilityRole="button"
          accessibilityLabel={`Augmenter ${label}`}
        >
          <Text className="text-stone-900 dark:text-stone-50 font-bold">+</Text>
        </Pressable>
      </View>
    </View>
  );
}

// --- Main screen ---

export default function CreateWorkoutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { editId } = useLocalSearchParams<{ editId?: string }>();
  const isEditing = Boolean(editId);

  const [mode, setMode] = useState<Mode>('compose');
  const [name, setName] = useState('');
  const [icon, setIcon] = useState<keyof typeof Ionicons.glyphMap>(ICONS[0]);
  const colors = useThemeColors();
  const [saving, setSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Global prep duration (applied to first step)
  const [globalPrepDuration, setGlobalPrepDuration] = useState(DEFAULT_PREP_DURATION);

  // Accordion state
  const [expandedStep, setExpandedStep] = useState<number | null>(0);

  // Compose mode state
  const [composeSteps, setComposeSteps] = useState<ComposeStep[]>([]);
  const [showProtocolPicker, setShowProtocolPicker] = useState(false);

  // Free mode state
  const [freeSteps, setFreeSteps] = useState<FreeStep[]>([]);

  // Clear validation error when user makes changes
  useEffect(() => {
    setValidationError(null);
  }, [name, freeSteps, composeSteps]);

  // Edit mode: load existing workout and pre-fill form
  useEffect(() => {
    if (!editId) return;

    loadCustomWorkouts().then((workouts) => {
      const workout = workouts.find((w) => w.id === editId);
      if (!workout) return;

      setName(workout.name);
      setIcon(workout.icon as keyof typeof Ionicons.glyphMap);

      const firstStep = workout.steps[0];
      if (firstStep) {
        setGlobalPrepDuration(firstStep.config.prepDuration ?? DEFAULT_PREP_DURATION);
      }

      const hasProtocolStep = workout.steps.some((s) => s.type === 'protocol');
      const detectedMode: Mode = hasProtocolStep ? 'compose' : 'free';
      setMode(detectedMode);

      if (detectedMode === 'compose') {
        setComposeSteps(
          workout.steps
            .filter((s): s is WorkoutStep & { type: 'protocol' } => s.type === 'protocol')
            .map((s) => ({
              protocolId: s.protocolId,
              config: s.config,
              gripMode: s.gripMode ?? 'session',
              gripConfigs: s.gripConfigs ?? [],
            }))
        );
      } else {
        setFreeSteps(
          workout.steps
            .filter((s): s is WorkoutStep & { type: 'free' } => s.type === 'free')
            .map((s) => ({
              name: s.name,
              config: s.config,
              gripMode: s.gripMode ?? 'session',
              gripConfigs: s.gripConfigs ?? [],
            }))
        );
      }
    });
  }, [editId]);

  // --- Compose helpers ---

  const addProtocolStep = (protocolId: string) => {
    const protocol = PROTOCOLS.find((p) => p.id === protocolId);
    if (!protocol) return;
    setComposeSteps((prev) => {
      const next = [
        ...prev,
        {
          protocolId,
          config: { ...protocol.defaults },
          gripMode: 'session' as GripMode,
          gripConfigs: [{ grip: 'halfCrimp' as const, hold: 'crimp20' as const, loadKg: 0, angleDeg: 0 }],
        },
      ];
      setExpandedStep(next.length - 1);
      return next;
    });
    setShowProtocolPicker(false);
  };

  const updateComposeStep = (index: number, partial: Partial<ComposeStep>) => {
    setComposeSteps((prev) =>
      prev.map((s, i) => (i === index ? { ...s, ...partial } : s))
    );
  };

  const updateComposeConfig = (index: number, key: keyof TimerConfig, value: number) => {
    setComposeSteps((prev) =>
      prev.map((s, i) =>
        i === index ? { ...s, config: { ...s.config, [key]: value } } : s
      )
    );
  };

  const moveComposeStep = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= composeSteps.length) return;
    setComposeSteps((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setExpandedStep(target);
  };

  const removeComposeStep = (index: number) => {
    setComposeSteps((prev) => prev.filter((_, i) => i !== index));
    setExpandedStep((prev) => {
      if (prev === null) return null;
      if (prev === index) return null;
      if (prev > index) return prev - 1;
      return prev;
    });
  };

  const confirmRemoveComposeStep = (index: number) => {
    Alert.alert(
      "Supprimer l'étape ?",
      'Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: () => removeComposeStep(index) },
      ]
    );
  };

  // --- Free helpers ---

  const addFreeStep = () => {
    setFreeSteps((prev) => {
      const next = [
        ...prev,
        {
          name: '',
          config: { ...FREE_DEFAULTS },
          gripMode: 'session' as GripMode,
          gripConfigs: [{ grip: 'halfCrimp' as const, hold: 'crimp20' as const, loadKg: 0, angleDeg: 0 }],
        },
      ];
      setExpandedStep(next.length - 1);
      return next;
    });
  };

  const updateFreeStep = (index: number, partial: Partial<FreeStep>) => {
    setFreeSteps((prev) =>
      prev.map((s, i) => (i === index ? { ...s, ...partial } : s))
    );
  };

  const updateFreeConfig = (index: number, key: keyof TimerConfig, value: number) => {
    setFreeSteps((prev) =>
      prev.map((s, i) =>
        i === index ? { ...s, config: { ...s.config, [key]: value } } : s
      )
    );
  };

  const moveFreeStep = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= freeSteps.length) return;
    setFreeSteps((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setExpandedStep(target);
  };

  const removeFreeStep = (index: number) => {
    setFreeSteps((prev) => prev.filter((_, i) => i !== index));
    setExpandedStep((prev) => {
      if (prev === null) return null;
      if (prev === index) return null;
      if (prev > index) return prev - 1;
      return prev;
    });
  };

  const confirmRemoveFreeStep = (index: number) => {
    Alert.alert(
      "Supprimer l'étape ?",
      'Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: () => removeFreeStep(index) },
      ]
    );
  };

  // --- Save ---

  const currentSteps = mode === 'compose' ? composeSteps : freeSteps;
  const canSave = name.trim().length > 0 && currentSteps.length > 0;

  const handleSave = async () => {
    if (!canSave || saving) return;

    // Validate free step names
    if (mode === 'free') {
      const emptyName = freeSteps.find((s) => !s.name.trim());
      if (emptyName) {
        setValidationError('Chaque étape doit avoir un nom');
        return;
      }
    }

    setValidationError(null);
    setSaving(true);

    const applyPrepToFirst = (config: TimerConfig, index: number): TimerConfig =>
      index === 0 ? { ...config, prepDuration: globalPrepDuration } : config;

    const steps: WorkoutStep[] =
      mode === 'compose'
        ? composeSteps.map((s, i) => ({
            type: 'protocol' as const,
            protocolId: s.protocolId,
            config: applyPrepToFirst(s.config, i),
            gripMode: s.gripMode,
            gripConfigs: s.gripConfigs,
          }))
        : freeSteps.map((s, i) => ({
            type: 'free' as const,
            name: s.name.trim(),
            config: applyPrepToFirst(s.config, i),
            gripMode: s.gripMode,
            gripConfigs: s.gripConfigs,
          }));

    if (isEditing && editId) {
      const existingWorkouts = await loadCustomWorkouts();
      const existing = existingWorkouts.find((w) => w.id === editId);
      if (!existing) {
        setSaving(false);
        return;
      }
      const updated: CustomWorkout = {
        id: existing.id,
        name: name.trim(),
        icon,
        steps,
        createdAt: existing.createdAt,
      };
      await updateCustomWorkout(updated);
    } else {
      const workout: CustomWorkout = {
        id: Date.now().toString(),
        name: name.trim(),
        icon,
        steps,
        createdAt: new Date().toISOString(),
      };
      await saveCustomWorkout(workout);
    }

    setSaving(false);
    router.back();
  };

  // --- Render ---

  return (
    <View className="flex-1 bg-white dark:bg-stone-950">
      <ScrollView className="flex-1 px-5 pt-4" contentContainerStyle={{ paddingBottom: 100 }}>
        <Text className="text-stone-900 dark:text-stone-50 text-2xl font-bold mb-6">
          {isEditing ? "Modifier l'entraînement" : 'Créer un entraînement'}
        </Text>

        {/* Mode toggle */}
        <View className="mb-1">
          <SegmentedControl
            options={MODE_OPTIONS}
            value={mode}
            onChange={(m) => {
              setMode(m);
              setExpandedStep(0);
            }}
          />
        </View>

        {/* Mode description */}
        <Text className="text-stone-400 dark:text-stone-500 text-xs text-center mb-6 mt-1">
          {mode === 'compose'
            ? 'Enchaîner des protocoles existants'
            : 'Créer tes propres séquences de timer'}
        </Text>

        {/* Workout name */}
        <Text className="text-stone-400 dark:text-stone-500 text-xs font-semibold uppercase tracking-wide mb-2">
          Nom
        </Text>
        <TextInput
          className="bg-stone-100 dark:bg-stone-800 border border-stone-300 dark:border-stone-700/50 rounded-lg px-4 py-3 text-stone-900 dark:text-stone-50 mb-6"
          placeholder="Nom de l'entraînement"
          placeholderTextColor={colors.textMuted}
          value={name}
          onChangeText={setName}
          accessibilityLabel="Nom de l'entraînement"
        />

        {/* ==================== ICON PICKER ==================== */}
        <Text className="text-stone-400 dark:text-stone-500 text-xs font-semibold uppercase tracking-wide mb-2">
          Icône
        </Text>
        <View className="flex-row flex-wrap gap-3 mb-6">
          {ICONS.map((iconName) => (
            <Pressable
              key={iconName}
              onPress={() => setIcon(iconName)}
              className={`w-12 h-12 rounded-xl items-center justify-center ${
                icon === iconName ? 'bg-orange-500' : 'bg-stone-100 dark:bg-stone-800 border border-stone-300 dark:border-stone-700/50'
              }`}
              style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}
              accessibilityRole="button"
              accessibilityLabel={`Icône ${iconName}`}
              accessibilityState={{ selected: icon === iconName }}
            >
              <Ionicons
                name={iconName}
                size={24}
                color={icon === iconName ? '#fff' : colors.textSecondary}
              />
            </Pressable>
          ))}
        </View>

        {/* ==================== PREP DURATION ==================== */}
        <Text className="text-stone-400 dark:text-stone-500 text-xs font-semibold uppercase tracking-wide mb-2">
          Préparation
        </Text>
        <View className="bg-stone-100 dark:bg-stone-800 border border-stone-300 dark:border-stone-700/50 rounded-2xl px-4 py-3 mb-6">
          <NumericRow
            label="Temps de préparation (s)"
            value={globalPrepDuration}
            onChange={(v) => setGlobalPrepDuration(v)}
            min={0}
          />
        </View>

        {/* ==================== COMPOSE MODE ==================== */}
        {mode === 'compose' && (
          <View className="mb-6">
            <Text className="text-stone-400 dark:text-stone-500 text-xs font-semibold uppercase tracking-wide mb-3">
              Étapes
            </Text>

            {composeSteps.map((step, index) => {
              const protocol = PROTOCOLS.find((p) => p.id === step.protocolId);
              if (!protocol) return null;
              const isExpanded = expandedStep === index;

              return (
                <View
                  key={`compose-${index}`}
                  className="bg-stone-100 dark:bg-stone-800 border border-stone-300 dark:border-stone-700/50 rounded-3xl p-4 mb-3"
                >
                  {/* Collapsible header */}
                  <Pressable
                    onPress={() => setExpandedStep(isExpanded ? null : index)}
                    accessibilityRole="button"
                    accessibilityLabel={`${protocol.name} — ${isExpanded ? 'Réduire' : 'Développer'}`}
                    accessibilityState={{ expanded: isExpanded }}
                  >
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center flex-1">
                        <Text className="text-2xl mr-2">{protocol.icon}</Text>
                        <Text className="text-stone-900 dark:text-stone-50 font-bold flex-1" numberOfLines={1}>
                          {protocol.name}
                        </Text>
                      </View>
                      <Ionicons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={18}
                        color={colors.textSecondary}
                      />
                    </View>
                  </Pressable>

                  {/* Expanded content */}
                  {isExpanded && (
                    <>
                      {/* Move/delete actions */}
                      <View className="flex-row items-center justify-end gap-1 mt-3 mb-1">
                        <Pressable
                          className="bg-stone-200 dark:bg-stone-700 rounded-xl w-11 h-11 items-center justify-center"
                          onPress={() => moveComposeStep(index, -1)}
                          disabled={index === 0}
                          accessibilityRole="button"
                          accessibilityLabel="Monter l'étape"
                        >
                          <Ionicons
                            name="chevron-up"
                            size={18}
                            color={index === 0 ? colors.textMuted : colors.text}
                          />
                        </Pressable>
                        <Pressable
                          className="bg-stone-200 dark:bg-stone-700 rounded-xl w-11 h-11 items-center justify-center"
                          onPress={() => moveComposeStep(index, 1)}
                          disabled={index === composeSteps.length - 1}
                          accessibilityRole="button"
                          accessibilityLabel="Descendre l'étape"
                        >
                          <Ionicons
                            name="chevron-down"
                            size={18}
                            color={index === composeSteps.length - 1 ? colors.textMuted : colors.text}
                          />
                        </Pressable>
                        <Pressable
                          className="bg-stone-200 dark:bg-stone-700 rounded-xl w-11 h-11 items-center justify-center"
                          onPress={() => confirmRemoveComposeStep(index)}
                          style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}
                          accessibilityRole="button"
                          accessibilityLabel="Supprimer l'étape"
                        >
                          <Ionicons name="close-circle-outline" size={20} color="#FB923C" />
                        </Pressable>
                      </View>

                      {/* Config */}
                      <NumericRow
                        label="Suspension (s)"
                        value={step.config.hangDuration}
                        onChange={(v) => updateComposeConfig(index, 'hangDuration', v)}
                        min={1}
                      />
                      <DurationRow
                        label="Repos rép."
                        value={step.config.restBetweenReps}
                        onChange={(v) => updateComposeConfig(index, 'restBetweenReps', v)}
                      />
                      <NumericRow
                        label="Répétitions"
                        value={step.config.reps}
                        onChange={(v) => updateComposeConfig(index, 'reps', v)}
                        min={1}
                      />
                      <NumericRow
                        label="Séries"
                        value={step.config.sets}
                        onChange={(v) => updateComposeConfig(index, 'sets', v)}
                        min={1}
                      />
                      <DurationRow
                        label="Repos séries"
                        value={step.config.restBetweenSets}
                        onChange={(v) => updateComposeConfig(index, 'restBetweenSets', v)}
                      />
                      {step.config.rounds !== undefined && (
                        <>
                          <NumericRow
                            label="Tours"
                            value={step.config.rounds}
                            onChange={(v) => updateComposeConfig(index, 'rounds', v)}
                            min={1}
                          />
                          {step.config.restBetweenRounds !== undefined && (
                            <DurationRow
                              label="Repos tours"
                              value={step.config.restBetweenRounds}
                              onChange={(v) => updateComposeConfig(index, 'restBetweenRounds', v)}
                            />
                          )}
                        </>
                      )}

                      {/* Grip config */}
                      <GripConfigSection
                        gripMode={step.gripMode}
                        gripConfigs={step.gripConfigs}
                        sets={step.config.sets}
                        onChangeMode={(m) => updateComposeStep(index, { gripMode: m })}
                        onChangeConfigs={(configs) => updateComposeStep(index, { gripConfigs: configs })}
                      />
                    </>
                  )}
                </View>
              );
            })}

            {/* Add protocol button */}
            <Pressable
              className="border border-dashed border-stone-600 rounded-xl py-4 items-center"
              onPress={() => {
                setShowProtocolPicker(true);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}
            >
              <Text className="text-stone-500 dark:text-stone-400 font-semibold">
                + Ajouter un protocole
              </Text>
            </Pressable>
          </View>
        )}

        {/* ==================== FREE MODE ==================== */}
        {mode === 'free' && (
          <View className="mb-6">
            <Text className="text-stone-400 dark:text-stone-500 text-xs font-semibold uppercase tracking-wide mb-3">
              Étapes
            </Text>

            {freeSteps.map((step, index) => {
              const isExpanded = expandedStep === index;
              const stepLabel = step.name.trim() || `Étape ${index + 1}`;
              const hasNameError = validationError !== null && !step.name.trim();

              return (
                <View
                  key={`free-${index}`}
                  className="bg-stone-100 dark:bg-stone-800 border border-stone-300 dark:border-stone-700/50 rounded-3xl p-4 mb-3"
                >
                  {/* Collapsible header */}
                  <Pressable
                    onPress={() => setExpandedStep(isExpanded ? null : index)}
                    accessibilityRole="button"
                    accessibilityLabel={`${stepLabel} — ${isExpanded ? 'Réduire' : 'Développer'}`}
                    accessibilityState={{ expanded: isExpanded }}
                  >
                    <View className="flex-row items-center justify-between">
                      <Text className="text-stone-900 dark:text-stone-50 font-bold flex-1" numberOfLines={1}>
                        {stepLabel}
                      </Text>
                      <Ionicons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={18}
                        color={colors.textSecondary}
                      />
                    </View>
                  </Pressable>

                  {/* Expanded content */}
                  {isExpanded && (
                    <>
                      {/* Move/delete actions */}
                      <View className="flex-row items-center justify-end gap-1 mt-3 mb-1">
                        <Pressable
                          className="bg-stone-200 dark:bg-stone-700 rounded-xl w-11 h-11 items-center justify-center"
                          onPress={() => moveFreeStep(index, -1)}
                          disabled={index === 0}
                          accessibilityRole="button"
                          accessibilityLabel="Monter l'étape"
                        >
                          <Ionicons
                            name="chevron-up"
                            size={18}
                            color={index === 0 ? colors.textMuted : colors.text}
                          />
                        </Pressable>
                        <Pressable
                          className="bg-stone-200 dark:bg-stone-700 rounded-xl w-11 h-11 items-center justify-center"
                          onPress={() => moveFreeStep(index, 1)}
                          disabled={index === freeSteps.length - 1}
                          accessibilityRole="button"
                          accessibilityLabel="Descendre l'étape"
                        >
                          <Ionicons
                            name="chevron-down"
                            size={18}
                            color={index === freeSteps.length - 1 ? colors.textMuted : colors.text}
                          />
                        </Pressable>
                        <Pressable
                          className="bg-stone-200 dark:bg-stone-700 rounded-xl w-11 h-11 items-center justify-center"
                          onPress={() => confirmRemoveFreeStep(index)}
                          style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}
                          accessibilityRole="button"
                          accessibilityLabel="Supprimer l'étape"
                        >
                          <Ionicons name="close-circle-outline" size={20} color="#FB923C" />
                        </Pressable>
                      </View>

                      {/* Step name */}
                      <TextInput
                        className={`bg-stone-200 dark:bg-stone-700 border rounded-lg px-3 py-2 text-stone-900 dark:text-stone-50 mb-3 ${
                          hasNameError ? 'border-red-500' : 'border-stone-600/50'
                        }`}
                        placeholder="Nom de l'étape"
                        placeholderTextColor={colors.textMuted}
                        value={step.name}
                        onChangeText={(t) => updateFreeStep(index, { name: t })}
                        accessibilityLabel="Nom de l'étape"
                      />

                      {/* Numeric configs */}
                      <NumericRow
                        label="Suspension (s)"
                        value={step.config.hangDuration}
                        onChange={(v) => updateFreeConfig(index, 'hangDuration', v)}
                        min={1}
                      />
                      <DurationRow
                        label="Repos rép."
                        value={step.config.restBetweenReps}
                        onChange={(v) => updateFreeConfig(index, 'restBetweenReps', v)}
                      />
                      <NumericRow
                        label="Répétitions"
                        value={step.config.reps}
                        onChange={(v) => updateFreeConfig(index, 'reps', v)}
                        min={1}
                      />
                      <NumericRow
                        label="Séries"
                        value={step.config.sets}
                        onChange={(v) => updateFreeConfig(index, 'sets', v)}
                        min={1}
                      />
                      <DurationRow
                        label="Repos séries"
                        value={step.config.restBetweenSets}
                        onChange={(v) => updateFreeConfig(index, 'restBetweenSets', v)}
                      />

                      {/* Grip config */}
                      <GripConfigSection
                        gripMode={step.gripMode}
                        gripConfigs={step.gripConfigs}
                        sets={step.config.sets}
                        onChangeMode={(m) => updateFreeStep(index, { gripMode: m })}
                        onChangeConfigs={(configs) => updateFreeStep(index, { gripConfigs: configs })}
                      />
                    </>
                  )}
                </View>
              );
            })}

            <Pressable
              className="border border-dashed border-stone-600 rounded-xl py-4 items-center"
              onPress={() => {
                addFreeStep();
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}
            >
              <Text className="text-stone-500 dark:text-stone-400 font-semibold">
                + Ajouter une étape
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* ==================== STICKY SAVE BUTTON ==================== */}
      <View
        className="absolute bottom-0 left-0 right-0 bg-white dark:bg-stone-950 px-5 pt-3 border-t border-stone-200 dark:border-stone-800"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        {validationError && (
          <Text className="text-red-500 text-sm text-center mb-2">{validationError}</Text>
        )}
        <Pressable
          className={`rounded-xl py-4 items-center ${
            canSave && !saving ? 'bg-orange-500' : 'bg-stone-200 dark:bg-stone-700'
          }`}
          onPress={() => {
            handleSave();
            if (canSave && !saving) {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
          }}
          disabled={!canSave || saving}
          style={({ pressed }) => ({ transform: [{ scale: pressed && (canSave && !saving) ? 0.97 : 1 }] })}
          accessibilityRole="button"
          accessibilityLabel="Enregistrer l'entraînement"
          accessibilityState={{ disabled: !canSave }}
        >
          <Text className="text-white text-xl font-bold">
            {saving
              ? 'Enregistrement...'
              : isEditing
                ? 'Enregistrer les modifications'
                : 'Enregistrer'}
          </Text>
        </Pressable>
      </View>

      {/* ==================== PROTOCOL PICKER MODAL ==================== */}
      <Modal
        visible={showProtocolPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowProtocolPicker(false)}
      >
        <Pressable
          className="flex-1 bg-black/50 justify-end"
          onPress={() => setShowProtocolPicker(false)}
        >
          <Pressable
            className="bg-white dark:bg-stone-900 rounded-t-3xl px-5 pt-4"
            style={{ paddingBottom: insets.bottom + 20, maxHeight: '70%' }}
          >
            <View className="w-10 h-1 bg-stone-300 dark:bg-stone-600 rounded-full self-center mb-4" />
            <Text className="text-stone-900 dark:text-stone-50 font-bold text-lg mb-3">
              Choisir un protocole
            </Text>
            <ScrollView>
              {PROTOCOLS.map((p) => (
                <Pressable
                  key={p.id}
                  className="flex-row items-center py-3 border-b border-stone-200 dark:border-stone-700/50"
                  onPress={() => addProtocolStep(p.id)}
                  style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}
                  accessibilityRole="button"
                  accessibilityLabel={p.name}
                >
                  <Text className="text-2xl mr-3">{p.icon}</Text>
                  <View className="flex-1">
                    <Text className="text-stone-900 dark:text-stone-50 font-semibold">{p.name}</Text>
                    <Text className="text-stone-500 dark:text-stone-400 text-xs" numberOfLines={1}>
                      {p.summary}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
