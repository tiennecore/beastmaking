import { useState } from 'react';
import {
  ScrollView,
  Text,
  View,
  TextInput,
  Pressable,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { PROTOCOLS } from '@/constants/protocols';
import { GRIPS } from '@/constants/grips';
import { saveCustomWorkout } from '@/lib/storage';
import { useThemeColors } from '@/lib/theme';
import type { CustomWorkout, WorkoutStep, TimerConfig, GripType } from '@/types';

type Mode = 'compose' | 'free';

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
  loadKg: 0,
};

type ComposeStep = {
  protocolId: string;
  config: TimerConfig;
  grips: GripType[];
};

type FreeStep = {
  name: string;
  config: TimerConfig;
};

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
  return (
    <View className="flex-row items-center justify-between py-2">
      <Text className="text-stone-600 dark:text-stone-300 flex-1">{label}</Text>
      <View className="flex-row items-center gap-2">
        <Pressable
          className="bg-stone-200 dark:bg-stone-700 rounded-md w-11 h-11 items-center justify-center active:bg-stone-600"
          onPress={() => onChange(Math.max(min, value - 1))}
          accessibilityRole="button"
          accessibilityLabel={`Réduire ${label}`}
        >
          <Text className="text-stone-900 dark:text-stone-50 font-bold">-</Text>
        </Pressable>
        <TextInput
          className="bg-stone-200 dark:bg-stone-700 rounded-md text-stone-900 dark:text-stone-50 text-center font-bold w-14 h-11 px-1"
          value={String(value)}
          onChangeText={(t) => {
            const n = parseInt(t, 10);
            if (!isNaN(n) && n >= min) onChange(n);
          }}
          keyboardType="numeric"
        />
        <Pressable
          className="bg-stone-200 dark:bg-stone-700 rounded-md w-11 h-11 items-center justify-center active:bg-stone-600"
          onPress={() => onChange(value + 1)}
          accessibilityRole="button"
          accessibilityLabel={`Augmenter ${label}`}
        >
          <Text className="text-stone-900 dark:text-stone-50 font-bold">+</Text>
        </Pressable>
      </View>
    </View>
  );
}

// --- Grip picker for compose step ---

function StepGripPicker({
  selected,
  onToggle,
}: {
  selected: GripType[];
  onToggle: (g: GripType) => void;
}) {
  return (
    <View className="mt-2">
      <Text className="text-stone-400 dark:text-stone-500 text-xs uppercase mb-1">
        Prehension
      </Text>
      <View className="flex-row flex-wrap gap-2">
        {GRIPS.map((grip) => {
          const active = selected.includes(grip.id);
          return (
            <Pressable
              key={grip.id}
              onPress={() => onToggle(grip.id)}
              className={`px-3 py-1 rounded-full border ${
                active
                  ? 'bg-orange-500 border-orange-500'
                  : 'bg-stone-100 dark:bg-stone-800 border-stone-300 dark:border-stone-700/50'
              }`}
              style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}
            >
              <Text className={`text-xs ${active ? 'text-white font-bold' : 'text-stone-600 dark:text-stone-300'}`}>
                {grip.name}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// --- Main screen ---

export default function CreateWorkoutScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('compose');
  const [name, setName] = useState('');
  const [icon, setIcon] = useState<keyof typeof Ionicons.glyphMap>(ICONS[0]);
  const colors = useThemeColors();
  const [saving, setSaving] = useState(false);

  // Compose mode state
  const [composeSteps, setComposeSteps] = useState<ComposeStep[]>([]);
  const [showProtocolPicker, setShowProtocolPicker] = useState(false);

  // Free mode state
  const [freeSteps, setFreeSteps] = useState<FreeStep[]>([]);

  // --- Compose helpers ---

  const addProtocolStep = (protocolId: string) => {
    const protocol = PROTOCOLS.find((p) => p.id === protocolId);
    if (!protocol) return;
    setComposeSteps((prev) => [
      ...prev,
      { protocolId, config: { ...protocol.defaults }, grips: [] },
    ]);
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

  const toggleComposeGrip = (index: number, grip: GripType) => {
    setComposeSteps((prev) =>
      prev.map((s, i) => {
        if (i !== index) return s;
        const grips = s.grips.includes(grip)
          ? s.grips.filter((g) => g !== grip)
          : [...s.grips, grip];
        return { ...s, grips };
      })
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
  };

  const removeComposeStep = (index: number) => {
    setComposeSteps((prev) => prev.filter((_, i) => i !== index));
  };

  // --- Free helpers ---

  const addFreeStep = () => {
    setFreeSteps((prev) => [
      ...prev,
      { name: '', config: { ...FREE_DEFAULTS } },
    ]);
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

  const removeFreeStep = (index: number) => {
    setFreeSteps((prev) => prev.filter((_, i) => i !== index));
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
        Alert.alert('Erreur', 'Chaque etape doit avoir un nom.');
        return;
      }
    }

    setSaving(true);

    const steps: WorkoutStep[] =
      mode === 'compose'
        ? composeSteps.map((s) => ({
            type: 'protocol' as const,
            protocolId: s.protocolId,
            config: s.config,
            grips: s.grips,
          }))
        : freeSteps.map((s) => ({
            type: 'free' as const,
            name: s.name.trim(),
            config: s.config,
          }));

    const workout: CustomWorkout = {
      id: Date.now().toString(),
      name: name.trim(),
      icon,
      steps,
      createdAt: new Date().toISOString(),
    };

    await saveCustomWorkout(workout);
    setSaving(false);
    router.back();
  };

  // --- Render ---

  return (
    <ScrollView className="flex-1 bg-white dark:bg-stone-950 px-5 pt-4">
      <Text className="text-stone-900 dark:text-stone-50 text-2xl font-bold mb-6">
        Creer un entrainement
      </Text>

      {/* Mode toggle */}
      <View className="flex-row bg-stone-100 dark:bg-stone-800 rounded-xl p-1 mb-6">
        <Pressable
          className={`flex-1 py-3 rounded-lg items-center ${
            mode === 'compose' ? 'bg-orange-500' : ''
          }`}
          onPress={() => {
            setMode('compose');
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
          style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}
          accessibilityRole="tab"
          accessibilityState={{ selected: mode === 'compose' }}
          accessibilityLabel="Composer"
        >
          <Text className={`font-semibold ${mode === 'compose' ? 'text-white' : 'text-stone-500 dark:text-stone-400'}`}>Composer</Text>
        </Pressable>
        <Pressable
          className={`flex-1 py-3 rounded-lg items-center ${
            mode === 'free' ? 'bg-orange-500' : ''
          }`}
          onPress={() => {
            setMode('free');
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
          style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}
          accessibilityRole="tab"
          accessibilityState={{ selected: mode === 'free' }}
          accessibilityLabel="Timer libre"
        >
          <Text className={`font-semibold ${mode === 'free' ? 'text-white' : 'text-stone-500 dark:text-stone-400'}`}>Timer libre</Text>
        </Pressable>
      </View>

      {/* Workout name */}
      <Text className="text-stone-400 dark:text-stone-500 text-xs font-semibold uppercase tracking-wide mb-2">
        Nom
      </Text>
      <TextInput
        className="bg-stone-100 dark:bg-stone-800 border border-stone-300 dark:border-stone-700/50 rounded-lg px-4 py-3 text-stone-900 dark:text-stone-50 mb-6"
        placeholder="Nom de l'entrainement"
        placeholderTextColor={colors.textMuted}
        value={name}
        onChangeText={setName}
        accessibilityLabel="Nom de l'entraînement"
      />

      {/* ==================== COMPOSE MODE ==================== */}
      {mode === 'compose' && (
        <View className="mb-6">
          <Text className="text-stone-400 dark:text-stone-500 text-xs font-semibold uppercase tracking-wide mb-3">
            Etapes
          </Text>

          {composeSteps.map((step, index) => {
            const protocol = PROTOCOLS.find((p) => p.id === step.protocolId);
            if (!protocol) return null;

            return (
              <View
                key={`compose-${index}`}
                className="bg-stone-100 dark:bg-stone-800 border border-stone-300 dark:border-stone-700/50 rounded-3xl p-4 mb-3"
              >
                {/* Header */}
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-row items-center flex-1">
                    <Text className="text-lg mr-2">{protocol.icon}</Text>
                    <Text className="text-stone-900 dark:text-stone-50 font-bold flex-1" numberOfLines={1}>
                      {protocol.name}
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-1">
                    <Pressable
                      className="bg-stone-200 dark:bg-stone-700 rounded-md w-11 h-11 items-center justify-center"
                      onPress={() => moveComposeStep(index, -1)}
                      disabled={index === 0}
                      accessibilityRole="button"
                      accessibilityLabel="Monter l'étape"
                    >
                      <Ionicons
                        name="chevron-up"
                        size={18}
                        color={index === 0 ? '#78716C' : colors.text}
                      />
                    </Pressable>
                    <Pressable
                      className="bg-stone-200 dark:bg-stone-700 rounded-md w-11 h-11 items-center justify-center"
                      onPress={() => moveComposeStep(index, 1)}
                      disabled={index === composeSteps.length - 1}
                      accessibilityRole="button"
                      accessibilityLabel="Descendre l'étape"
                    >
                      <Ionicons
                        name="chevron-down"
                        size={18}
                        color={index === composeSteps.length - 1 ? '#78716C' : colors.text}
                      />
                    </Pressable>
                    <Pressable
                      className="bg-stone-200 dark:bg-stone-700 rounded-md w-11 h-11 items-center justify-center"
                      onPress={() => removeComposeStep(index)}
                      style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}
                      accessibilityRole="button"
                      accessibilityLabel="Supprimer l'étape"
                    >
                      <Ionicons name="close-circle-outline" size={20} color="#FB923C" />
                    </Pressable>
                  </View>
                </View>

                {/* Config */}
                <NumericRow
                  label="Repetitions"
                  value={step.config.reps}
                  onChange={(v) => updateComposeConfig(index, 'reps', v)}
                  min={1}
                />
                <NumericRow
                  label="Series"
                  value={step.config.sets}
                  onChange={(v) => updateComposeConfig(index, 'sets', v)}
                  min={1}
                />

                {/* Grip picker */}
                <StepGripPicker
                  selected={step.grips}
                  onToggle={(g) => toggleComposeGrip(index, g)}
                />
              </View>
            );
          })}

          {/* Protocol picker */}
          {showProtocolPicker ? (
            <View className="bg-stone-100 dark:bg-stone-800 border border-stone-300 dark:border-stone-700/50 rounded-3xl p-3 mb-3">
              <Text className="text-stone-500 dark:text-stone-400 text-sm mb-2">
                Choisir un protocole :
              </Text>
              {PROTOCOLS.map((p) => (
                <Pressable
                  key={p.id}
                  className="flex-row items-center py-3 border-b border-stone-300 dark:border-stone-700/50"
                  onPress={() => addProtocolStep(p.id)}
                  style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}
                >
                  <Text className="text-lg mr-3">{p.icon}</Text>
                  <View className="flex-1">
                    <Text className="text-stone-900 dark:text-stone-50 font-semibold">{p.name}</Text>
                    <Text className="text-stone-500 dark:text-stone-400 text-xs" numberOfLines={1}>
                      {p.summary}
                    </Text>
                  </View>
                </Pressable>
              ))}
              <Pressable
                className="mt-2 items-center py-2"
                onPress={() => setShowProtocolPicker(false)}
                style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}
              >
                <Text className="text-stone-500 dark:text-stone-400 font-semibold">Annuler</Text>
              </Pressable>
            </View>
          ) : (
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
          )}
        </View>
      )}

      {/* ==================== FREE MODE ==================== */}
      {mode === 'free' && (
        <View className="mb-6">
          <Text className="text-stone-400 dark:text-stone-500 text-xs font-semibold uppercase tracking-wide mb-3">
            Etapes
          </Text>

          {freeSteps.map((step, index) => (
            <View
              key={`free-${index}`}
              className="bg-stone-100 dark:bg-stone-800 border border-stone-300 dark:border-stone-700/50 rounded-3xl p-4 mb-3"
            >
              {/* Header with remove */}
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-stone-500 dark:text-stone-400 text-xs font-semibold uppercase">
                  Etape {index + 1}
                </Text>
                <Pressable
                  className="bg-stone-200 dark:bg-stone-700 rounded-md w-11 h-11 items-center justify-center"
                  onPress={() => removeFreeStep(index)}
                  style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}
                  accessibilityRole="button"
                  accessibilityLabel="Supprimer l'étape"
                >
                  <Ionicons name="close-circle-outline" size={20} color="#FB923C" />
                </Pressable>
              </View>

              {/* Step name */}
              <TextInput
                className="bg-stone-200 dark:bg-stone-700 border border-stone-600/50 rounded-lg px-3 py-2 text-stone-900 dark:text-stone-50 mb-3"
                placeholder="Nom de l'etape"
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
              <NumericRow
                label="Repos rep. (s)"
                value={step.config.restBetweenReps}
                onChange={(v) => updateFreeConfig(index, 'restBetweenReps', v)}
              />
              <NumericRow
                label="Repetitions"
                value={step.config.reps}
                onChange={(v) => updateFreeConfig(index, 'reps', v)}
                min={1}
              />
              <NumericRow
                label="Series"
                value={step.config.sets}
                onChange={(v) => updateFreeConfig(index, 'sets', v)}
                min={1}
              />
              <NumericRow
                label="Repos series (s)"
                value={step.config.restBetweenSets}
                onChange={(v) => updateFreeConfig(index, 'restBetweenSets', v)}
              />
            </View>
          ))}

          <Pressable
            className="border border-dashed border-stone-600 rounded-xl py-4 items-center"
            onPress={() => {
              addFreeStep();
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}
          >
            <Text className="text-stone-500 dark:text-stone-400 font-semibold">
              + Ajouter une etape
            </Text>
          </Pressable>
        </View>
      )}

      {/* ==================== ICON PICKER ==================== */}
      <Text className="text-stone-400 dark:text-stone-500 text-xs font-semibold uppercase tracking-wide mb-2">
        Icone
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

      {/* ==================== SAVE BUTTON ==================== */}
      <Pressable
        className={`rounded-xl py-4 items-center mb-8 ${
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
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </Text>
      </Pressable>

      <View className="h-8" />
    </ScrollView>
  );
}
