import { Text, View, TextInput } from 'react-native';
import { TimerConfig } from '@/types';

type Props = {
  config: TimerConfig;
  onChange: (config: TimerConfig) => void;
};

type Field = {
  key: keyof TimerConfig;
  label: string;
  unit: string;
};

const FIELDS: Field[] = [
  { key: 'hangDuration', label: 'Duree de suspension', unit: 's' },
  { key: 'restBetweenReps', label: 'Repos inter-repetition', unit: 's' },
  { key: 'reps', label: 'Repetitions par serie', unit: '' },
  { key: 'sets', label: 'Nombre de series', unit: '' },
  { key: 'restBetweenSets', label: 'Repos inter-serie', unit: 's' },
  { key: 'rounds', label: 'Nombre de tours', unit: '' },
  { key: 'restBetweenRounds', label: 'Repos inter-tour', unit: 's' },
];

export function TimerConfigForm({ config, onChange }: Props) {
  const visibleFields = FIELDS.filter((f) => config[f.key] !== undefined);

  return (
    <View className="mb-6">
      <Text className="text-white text-lg font-bold mb-3">Parametres</Text>
      {visibleFields.map((field) => (
        <View key={field.key} className="flex-row items-center justify-between mb-3">
          <Text className="text-neutral-300 flex-1">{field.label}</Text>
          <View className="flex-row items-center">
            <TextInput
              className="bg-neutral-800 text-white text-center rounded-lg px-3 py-2 w-20 border border-neutral-600"
              keyboardType="numeric"
              value={String(config[field.key] ?? '')}
              onChangeText={(text) => {
                const value = parseInt(text, 10);
                if (!isNaN(value) && value >= 0) {
                  onChange({ ...config, [field.key]: value });
                }
              }}
            />
            {field.unit && (
              <Text className="text-neutral-400 ml-2 w-8">{field.unit}</Text>
            )}
          </View>
        </View>
      ))}
    </View>
  );
}
