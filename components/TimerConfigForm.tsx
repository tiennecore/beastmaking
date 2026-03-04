import { Text, View, Pressable } from 'react-native';
import { useRef, useCallback, useState } from 'react';
import { TimerConfig, TimerPhase } from '@/types';
import { PHASE_COLORS } from '@/constants/colors';
import { COLOR_PALETTE } from '@/constants/colors';

type Props = {
  config: TimerConfig;
  onChange: (config: TimerConfig) => void;
};

function RepeatButton({
  label,
  onStep,
}: {
  label: string;
  onStep: () => void;
}) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const speedRef = useRef(300);

  const startRepeat = useCallback(() => {
    onStep();
    speedRef.current = 300;

    const tick = () => {
      onStep();
      speedRef.current = Math.max(50, speedRef.current * 0.85);
      timerRef.current = setTimeout(tick, speedRef.current);
    };

    timerRef.current = setTimeout(tick, 400);
  }, [onStep]);

  const stopRepeat = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    timerRef.current = null;
    intervalRef.current = null;
  }, []);

  return (
    <Pressable
      className="bg-stone-700 rounded-lg w-10 h-10 items-center justify-center active:bg-stone-600"
      onPressIn={startRepeat}
      onPressOut={stopRepeat}
    >
      <Text className="text-stone-50 font-bold text-lg">{label}</Text>
    </Pressable>
  );
}

function StepButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      className="bg-stone-700 rounded-lg w-9 h-9 items-center justify-center active:bg-stone-600"
      onPress={onPress}
    >
      <Text className="text-stone-50 font-bold text-sm">{label}</Text>
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
  return (
    <View className="flex-row flex-wrap gap-2 mt-2">
      {COLOR_PALETTE.map((color) => (
        <Pressable
          key={color}
          onPress={() => onSelect(color)}
          className="w-8 h-8 rounded-full items-center justify-center"
          style={[
            { backgroundColor: color },
            current === color && {
              borderWidth: 2,
              borderColor: '#F5F5F4',
            },
          ]}
        >
          {current === color && (
            <Text className="text-white text-xs font-bold">✓</Text>
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

type DurationField = {
  key: keyof TimerConfig;
  phase: TimerPhase;
  label: string;
  emoji: string;
};

const DURATION_CARDS: DurationField[] = [
  { key: 'prepDuration', phase: 'prep', label: 'Preparation', emoji: '⏳' },
  { key: 'hangDuration', phase: 'hang', label: 'Suspension', emoji: '🤚' },
  { key: 'restBetweenReps', phase: 'restRep', label: 'Repos repetition', emoji: '💨' },
  { key: 'restBetweenSets', phase: 'restSet', label: 'Repos serie', emoji: '😮‍💨' },
  { key: 'restBetweenRounds', phase: 'restRound', label: 'Repos tour', emoji: '🧘' },
];

const VOLUME_FIELDS = [
  { key: 'reps' as keyof TimerConfig, label: 'Repetitions par serie' },
  { key: 'sets' as keyof TimerConfig, label: 'Nombre de series' },
  { key: 'rounds' as keyof TimerConfig, label: 'Nombre de tours' },
];

export function TimerConfigForm({ config, onChange }: Props) {
  const [expandedColor, setExpandedColor] = useState<string | null>(null);

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
      <Text className="text-stone-50 text-lg font-bold mb-3">Parametres</Text>

      {volumeVisible.length > 0 && (
        <View className="mb-4">
          <Text className="text-stone-500 text-xs font-semibold uppercase tracking-wide mb-2">
            Volume
          </Text>
          <View className="bg-stone-800 rounded-2xl overflow-hidden border border-stone-700">
            {volumeVisible.map((field, i) => (
              <View
                key={field.key}
                className={`px-4 py-3 ${
                  i < volumeVisible.length - 1 ? 'border-b border-stone-700' : ''
                }`}
              >
                <Text className="text-stone-300 mb-2">{field.label}</Text>
                <View className="flex-row items-center justify-center gap-2">
                  <StepButton label="-2" onPress={() => adjust(field.key, -2, 1)} />
                  <StepButton label="-1" onPress={() => adjust(field.key, -1, 1)} />
                  <Text className="text-stone-50 text-xl font-bold w-12 text-center">
                    {config[field.key] as number}
                  </Text>
                  <StepButton label="+1" onPress={() => adjust(field.key, 1, 1)} />
                  <StepButton label="+2" onPress={() => adjust(field.key, 2, 1)} />
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {durationVisible.length > 0 && (
        <View className="mb-4">
          <Text className="text-stone-500 text-xs font-semibold uppercase tracking-wide mb-2">
            Durees
          </Text>
          <View className="flex-row flex-wrap gap-3">
            {durationVisible.map((field) => {
              const color = getColor(field.phase);
              const value = (config[field.key] ?? 0) as number;
              const isColorOpen = expandedColor === field.key;

              return (
                <View
                  key={field.key}
                  className="bg-stone-800 rounded-2xl p-3 flex-1 border border-stone-700"
                  style={{
                    borderLeftWidth: 3,
                    borderLeftColor: color,
                    minWidth: '45%',
                  }}
                >
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-stone-400 text-xs font-semibold">
                      {field.emoji} {field.label}
                    </Text>
                    <Pressable
                      onPress={() =>
                        setExpandedColor(isColorOpen ? null : field.key)
                      }
                      className="w-5 h-5 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                  </View>

                  <Text className="text-stone-50 text-2xl font-bold text-center mb-2">
                    {formatSeconds(value)}
                  </Text>

                  <View className="flex-row items-center justify-center gap-3">
                    <RepeatButton
                      label="−"
                      onStep={() => adjust(field.key, -1, 0)}
                    />
                    <RepeatButton
                      label="+"
                      onStep={() => adjust(field.key, 1, 0)}
                    />
                  </View>

                  {isColorOpen && (
                    <ColorPicker
                      current={color}
                      onSelect={(c) => {
                        setColor(field.phase, c);
                        setExpandedColor(null);
                      }}
                    />
                  )}
                </View>
              );
            })}
          </View>
        </View>
      )}

      <View className="mb-4">
        <Text className="text-stone-500 text-xs font-semibold uppercase tracking-wide mb-2">
          Charge
        </Text>
        <View className="bg-stone-800 rounded-2xl px-4 py-3 border border-stone-700">
          <View className="flex-row items-center justify-center gap-2">
            <StepButton label="-10" onPress={() => adjust('loadKg', -10, 0)} />
            <StepButton label="-5" onPress={() => adjust('loadKg', -5, 0)} />
            <StepButton label="-1" onPress={() => adjust('loadKg', -1, 0)} />
            <Text className="text-stone-50 text-xl font-bold w-16 text-center">
              {config.loadKg ?? 0} kg
            </Text>
            <StepButton label="+1" onPress={() => adjust('loadKg', 1, 0)} />
            <StepButton label="+5" onPress={() => adjust('loadKg', 5, 0)} />
            <StepButton label="+10" onPress={() => adjust('loadKg', 10, 0)} />
          </View>
        </View>
      </View>
    </View>
  );
}
