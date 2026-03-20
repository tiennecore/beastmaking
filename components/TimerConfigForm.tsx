import { Text, View, Pressable, ScrollView, findNodeHandle } from 'react-native';
import { useRef, useCallback, useState, useEffect } from 'react';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { TimerConfig, TimerPhase, InfoNotes } from '@/types';
import { PHASE_COLORS } from '@/constants/colors';
import { COLOR_PALETTE } from '@/constants/colors';
import { useThemeColors } from '@/lib/theme';
import { InfoButton } from '@/components/InfoButton';

export type { InfoNotes };

type Props = {
  config: TimerConfig;
  onChange: (config: TimerConfig) => void;
  infoNotes?: InfoNotes;
  scrollViewRef?: React.RefObject<ScrollView | null>;
};

function RepeatButton({
  label,
  onStep,
  disabled,
}: {
  label: string;
  onStep: () => void;
  disabled?: boolean;
}) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speedRef = useRef(300);
  const onStepRef = useRef(onStep);
  onStepRef.current = onStep;

  const startRepeat = useCallback(() => {
    if (disabled) return;
    Haptics.selectionAsync();
    onStepRef.current();
    speedRef.current = 300;

    const tick = () => {
      onStepRef.current();
      speedRef.current = Math.max(50, speedRef.current * 0.85);
      timerRef.current = setTimeout(tick, speedRef.current);
    };

    timerRef.current = setTimeout(tick, 400);
  }, [disabled]);

  const stopRepeat = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  return (
    <Pressable
      className="bg-stone-200 dark:bg-stone-700 rounded-xl w-11 h-11 items-center justify-center active:bg-stone-300 dark:active:bg-stone-600"
      style={disabled ? { opacity: 0.4 } : undefined}
      onPressIn={startRepeat}
      onPressOut={stopRepeat}
      accessibilityRole="button"
      accessibilityLabel={label === '−' ? 'Réduire la durée' : 'Augmenter la durée'}
      accessibilityState={{ disabled: !!disabled }}
    >
      <Text className="text-stone-900 dark:text-stone-50 font-bold text-base">{label}</Text>
    </Pressable>
  );
}

function StepButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      className="bg-stone-200 dark:bg-stone-700 rounded-xl w-11 h-11 items-center justify-center active:bg-stone-300 dark:active:bg-stone-600"
      style={disabled ? { opacity: 0.4 } : undefined}
      onPress={disabled ? undefined : onPress}
      accessibilityRole="button"
      accessibilityLabel={label.startsWith('-') ? `Réduire de ${label.slice(1)}` : `Augmenter de ${label.slice(1)}`}
      accessibilityState={{ disabled: !!disabled }}
    >
      <Text className="text-stone-900 dark:text-stone-50 font-bold text-sm">{label}</Text>
    </Pressable>
  );
}

function ColorPicker({
  current,
  onSelect,
}: {
  current: string;
  onSelect: (color: string) => void;
}) {
  const colors = useThemeColors();
  return (
    <View className="flex-row flex-wrap gap-2 mt-2">
      {COLOR_PALETTE.map((color) => (
        <Pressable
          key={color}
          onPress={() => onSelect(color)}
          className="w-10 h-10 rounded-full items-center justify-center"
          style={[
            { backgroundColor: color },
            current === color && {
              borderWidth: 2,
              borderColor: colors.text,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.3,
              shadowRadius: 2,
              elevation: 3,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Couleur ${color}`}
          accessibilityState={{ selected: current === color }}
        >
          {current === color && (
            <Ionicons name="checkmark" size={18} color="#fff" />
          )}
        </Pressable>
      ))}
    </View>
  );
}

function formatSeconds(s: number): string {
  const min = Math.floor(s / 60);
  const sec = s % 60;
  if (min === 0) return `${sec}s`;
  return sec > 0 ? `${min}m${sec.toString().padStart(2, '0')}s` : `${min}m`;
}

function adaptiveStep(value: number): number {
  if (value > 120) return 10;
  if (value > 60) return 5;
  return 1;
}

type DurationField = {
  key: keyof TimerConfig;
  phase: TimerPhase;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  infoKey?: keyof InfoNotes;
};

const DURATION_CARDS: DurationField[] = [
  { key: 'prepDuration', phase: 'prep', label: 'Préparation', icon: 'hourglass-outline' },
  { key: 'hangDuration', phase: 'hang', label: 'Suspension', icon: 'hand-left-outline', infoKey: 'hangDuration' },
  { key: 'restBetweenReps', phase: 'restRep', label: 'Repos répétition', icon: 'flash-outline' },
  { key: 'restBetweenSets', phase: 'restSet', label: 'Repos série', icon: 'pause-outline', infoKey: 'restBetweenSets' },
  { key: 'restBetweenRounds', phase: 'restRound', label: 'Repos tour', icon: 'bed-outline' },
];

type VolumeField = {
  key: keyof TimerConfig;
  label: string;
  infoKey?: keyof InfoNotes;
};

const VOLUME_FIELDS: VolumeField[] = [
  { key: 'reps', label: 'Répétitions par série' },
  { key: 'sets', label: 'Nombre de séries', infoKey: 'sets' },
  { key: 'rounds', label: 'Nombre de tours' },
];

export function TimerConfigForm({ config, onChange, infoNotes, scrollViewRef }: Props) {
  const [expandedColor, setExpandedColor] = useState<string | null>(null);
  const [mountedPicker, setMountedPicker] = useState(false);
  const colorPickerRef = useRef<View>(null);
  const lastExpandedColor = useRef<string | null>(null);
  const colors = useThemeColors();

  useEffect(() => {
    if (expandedColor) {
      lastExpandedColor.current = expandedColor;
    }
  }, [expandedColor]);

  useEffect(() => {
    if (expandedColor) {
      setMountedPicker(true);
    } else {
      const timer = setTimeout(() => setMountedPicker(false), 150);
      return () => clearTimeout(timer);
    }
  }, [expandedColor]);

  useEffect(() => {
    if (!mountedPicker || !expandedColor || !scrollViewRef?.current || !colorPickerRef.current) return;

    const scrollNode = findNodeHandle(scrollViewRef.current);
    if (!scrollNode) return;

    const timer = setTimeout(() => {
      colorPickerRef.current?.measureLayout(
        scrollNode,
        (_x, y) => {
          scrollViewRef.current?.scrollTo({ y: y - 60, animated: true });
        },
        () => {},
      );
    }, 300);

    return () => clearTimeout(timer);
  }, [mountedPicker, expandedColor, scrollViewRef]);

  const adjust = (key: keyof TimerConfig, delta: number, min = 0) => {
    const current = (config[key] ?? 0) as number;
    const next = Math.max(min, current + delta);
    onChange({ ...config, [key]: next });
  };

  const getColor = (phase: TimerPhase): string => {
    return config.phaseColors?.[phase] ?? PHASE_COLORS[phase];
  };

  const setColor = (phase: TimerPhase, color: string) => {
    onChange({
      ...config,
      phaseColors: { ...config.phaseColors, [phase]: color },
    });
  };

  const volumeVisible = VOLUME_FIELDS.filter((f) => config[f.key] !== undefined);
  const durationVisible = DURATION_CARDS.filter((f) => config[f.key] !== undefined);

  return (
    <View className="mb-6">
      <Text className="text-stone-900 dark:text-stone-50 text-lg font-bold mb-3">Paramètres</Text>

      {volumeVisible.length > 0 && (
        <View className="mb-4">
          <Text className="text-stone-400 dark:text-stone-500 text-xs font-semibold uppercase tracking-wide mb-2">
            Volume
          </Text>
          <View className="bg-stone-100 dark:bg-stone-800 rounded-3xl overflow-hidden border border-stone-300 dark:border-stone-700/50">
            {volumeVisible.map((field, i) => {
              const value = config[field.key] as number;
              return (
                <View
                  key={field.key}
                  className={`px-4 py-3 ${
                    i < volumeVisible.length - 1 ? 'border-b border-stone-300 dark:border-stone-700/50' : ''
                  }`}
                >
                  <View className="flex-row items-center gap-1.5 mb-2">
                    <Text className="text-stone-600 dark:text-stone-300">{field.label}</Text>
                    {field.infoKey && infoNotes?.[field.infoKey] && (
                      <InfoButton info={infoNotes[field.infoKey]!} />
                    )}
                  </View>
                  <View className="flex-row items-center justify-center gap-2">
                    <StepButton label="-2" onPress={() => adjust(field.key, -2, 1)} disabled={value <= 2} />
                    <StepButton label="-1" onPress={() => adjust(field.key, -1, 1)} disabled={value <= 1} />
                    <Text className="text-stone-900 dark:text-stone-50 text-xl font-bold w-12 text-center">
                      {value}
                    </Text>
                    <StepButton label="+1" onPress={() => adjust(field.key, 1, 1)} />
                    <StepButton label="+2" onPress={() => adjust(field.key, 2, 1)} />
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {durationVisible.length > 0 && (
        <View className="mb-4">
          <Text className="text-stone-400 dark:text-stone-500 text-xs font-semibold uppercase tracking-wide mb-2">
            Durées
          </Text>
          <View className="flex-row flex-wrap gap-3">
            {durationVisible.map((field) => {
              const color = getColor(field.phase);
              const value = (config[field.key] ?? 0) as number;
              const isColorOpen = expandedColor === field.key;
              const step = adaptiveStep(value);

              return (
                <View
                  key={field.key}
                  className="bg-stone-100 dark:bg-stone-800 rounded-3xl p-3 flex-1 border border-stone-300 dark:border-stone-700/50"
                  style={{
                    borderLeftWidth: 3,
                    borderLeftColor: color,
                    minWidth: '45%',
                  }}
                >
                  <View className="flex-row items-center justify-between mb-2" style={{ height: 32 }}>
                    <View className="flex-row items-center gap-1 flex-1 overflow-hidden">
                      <Ionicons name={field.icon} size={14} color={colors.textSecondary} />
                      <Text className="text-stone-500 dark:text-stone-400 text-xs font-semibold" numberOfLines={1}>
                        {field.label}
                      </Text>
                      {field.infoKey && infoNotes?.[field.infoKey] && (
                        <InfoButton info={infoNotes[field.infoKey]!} />
                      )}
                    </View>
                    <Pressable
                      onPress={() => setExpandedColor(isColorOpen ? null : field.key)}
                      className="w-8 h-8 rounded-full"
                      style={{ backgroundColor: color }}
                      accessibilityRole="button"
                      accessibilityLabel={`Choisir la couleur de ${field.label}`}
                      accessibilityState={{ selected: isColorOpen }}
                    >
                      {!isColorOpen && (
                        <View
                          className="absolute -bottom-0.5 -right-0.5 bg-stone-200 dark:bg-stone-700 rounded-full w-4 h-4 items-center justify-center"
                        >
                          <Ionicons name="color-palette-outline" size={10} color={colors.textSecondary} />
                        </View>
                      )}
                    </Pressable>
                  </View>

                  <View className="flex-row items-center justify-between mt-1">
                    <RepeatButton
                      label="−"
                      onStep={() => adjust(field.key, -step, 0)}
                      disabled={value <= 0}
                    />
                    <Text
                      className="text-stone-900 dark:text-stone-50 text-lg font-bold text-center flex-1"
                      numberOfLines={1}
                      adjustsFontSizeToFit
                    >
                      {formatSeconds(value)}
                    </Text>
                    <RepeatButton
                      label="+"
                      onStep={() => adjust(field.key, step, 0)}
                    />
                  </View>

                </View>
              );
            })}
          </View>

          {mountedPicker && (() => {
            const activeColorKey = expandedColor ?? lastExpandedColor.current;
            const activeField = activeColorKey ? durationVisible.find((f) => f.key === activeColorKey) : undefined;
            if (!activeField) return null;
            return (
              <View ref={colorPickerRef}>
                <Animated.View
                  entering={FadeInDown.duration(250)}
                  exiting={FadeOutUp.duration(150)}
                  className="bg-stone-100 dark:bg-stone-800 rounded-2xl p-3 mt-2 border border-stone-300 dark:border-stone-700/50"
                >
                  <Text className="text-stone-500 dark:text-stone-400 text-xs font-semibold mb-2">
                    Couleur — {activeField.label}
                  </Text>
                  <ColorPicker
                    current={getColor(activeField.phase)}
                    onSelect={(c) => {
                      setColor(activeField.phase, c);
                      setExpandedColor(null);
                    }}
                  />
                </Animated.View>
              </View>
            );
          })()}
        </View>
      )}

    </View>
  );
}
