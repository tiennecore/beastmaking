import { useState } from 'react';
import { View, Text, Pressable, Modal, ScrollView, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { GripType, HoldType, GripConfig, GripMode } from '@/types';
import { GRIPS, HOLDS, ANGLES, getGripById, getHoldById } from '@/constants/grips';
import { useThemeColors } from '@/lib/theme';
import { InfoButton } from '@/components/InfoButton';

type Props = {
  gripMode: GripMode;
  gripConfigs: GripConfig[];
  sets: number;
  onChangeMode: (mode: GripMode) => void;
  onChangeConfigs: (configs: GripConfig[]) => void;
  loadInfo?: string;
};

const DEFAULT_CONFIG: GripConfig = { grip: 'halfCrimp', hold: 'crimp20', loadKg: 0, angleDeg: 0 };

function syncConfigsWithSets(configs: GripConfig[], sets: number): GripConfig[] {
  if (configs.length === sets) return configs;
  if (configs.length < sets) {
    const base = configs[0] ?? DEFAULT_CONFIG;
    return [...configs, ...Array.from({ length: sets - configs.length }, () => ({ ...base }))];
  }
  return configs.slice(0, sets);
}

function StepButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      className="bg-stone-200 dark:bg-stone-700 rounded-lg w-11 h-11 items-center justify-center active:bg-stone-300 dark:active:bg-stone-600"
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label.startsWith('-') ? `Réduire de ${label.slice(1)} kg` : `Augmenter de ${label.slice(1)} kg`}
    >
      <Text className="text-stone-900 dark:text-stone-50 font-bold text-sm">{label}</Text>
    </Pressable>
  );
}

type PickerItem = { id: string; name: string; warning?: string };

type PickerModalProps = {
  visible: boolean;
  title: string;
  items: PickerItem[];
  selectedId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
};

function PickerModal({ visible, title, items, selectedId, onSelect, onClose }: PickerModalProps) {
  const colors = useThemeColors();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent={Platform.OS === 'android'}
    >
      <Pressable
        className="flex-1 bg-black/60 justify-end"
        onPress={onClose}
        accessibilityLabel="Fermer le sélecteur"
        accessibilityRole="button"
      >
        <Pressable
          className="bg-white dark:bg-stone-900 rounded-t-3xl px-5 pt-4 pb-8"
          onPress={() => {}}
        >
          <View className="w-10 h-1 bg-stone-300 dark:bg-stone-600 rounded-full self-center mb-4" />
          <Text className="text-stone-900 dark:text-stone-50 text-lg font-bold mb-4">{title}</Text>
          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 360 }}>
            {items.map((item) => {
              const isSelected = item.id === selectedId;
              return (
                <Pressable
                  key={item.id}
                  className={`flex-row items-center justify-between py-3 px-4 rounded-xl mb-2 ${
                    isSelected
                      ? 'bg-orange-500'
                      : 'bg-stone-100 dark:bg-stone-800 active:bg-stone-200 dark:active:bg-stone-700'
                  }`}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onSelect(item.id);
                    onClose();
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: isSelected }}
                  accessibilityLabel={item.name}
                >
                  <View className="flex-1 mr-2">
                    <Text
                      className={`font-semibold ${isSelected ? 'text-white' : 'text-stone-900 dark:text-stone-50'}`}
                    >
                      {item.name}
                    </Text>
                    {item.warning && (
                      <Text className={`text-xs mt-0.5 ${isSelected ? 'text-orange-100' : 'text-amber-600 dark:text-amber-400'}`}>
                        {item.warning}
                      </Text>
                    )}
                  </View>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={20} color="white" />
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

type GripConfigRowProps = {
  config: GripConfig;
  label?: string;
  loadInfo?: string;
  onChange: (config: GripConfig) => void;
};

function GripConfigRow({ config, label, loadInfo, onChange }: GripConfigRowProps) {
  const colors = useThemeColors();
  const [gripModalOpen, setGripModalOpen] = useState(false);
  const [holdModalOpen, setHoldModalOpen] = useState(false);

  const grip = getGripById(config.grip);
  const hold = getHoldById(config.hold);

  const adjustLoad = (delta: number) => {
    Haptics.selectionAsync();
    onChange({ ...config, loadKg: Math.max(0, config.loadKg + delta) });
  };

  const gripItems: PickerItem[] = GRIPS.map((g) => ({
    id: g.id,
    name: g.name,
    warning: g.warning,
  }));

  const holdItems: PickerItem[] = HOLDS.map((h) => ({
    id: h.id,
    name: h.name,
  }));

  return (
    <View className="bg-stone-100 dark:bg-stone-800 rounded-3xl p-4 mb-3 border border-stone-300 dark:border-stone-700/50">
      {label && (
        <Text className="text-stone-500 dark:text-stone-400 text-xs font-semibold uppercase tracking-wide mb-3">
          {label}
        </Text>
      )}

      <View className="flex-row gap-2 mb-3">
        <Pressable
          className="flex-1 bg-stone-200 dark:bg-stone-700 rounded-xl px-4 py-3 active:bg-stone-300 dark:active:bg-stone-600"
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setGripModalOpen(true);
          }}
          accessibilityRole="button"
          accessibilityLabel={`Préhension : ${grip?.name ?? config.grip}`}
        >
          <Text className="text-stone-500 dark:text-stone-400 text-xs mb-1">Préhension</Text>
          <Text className="text-stone-900 dark:text-stone-50 font-semibold text-sm" numberOfLines={1}>
            {grip?.name ?? config.grip}
          </Text>
        </Pressable>

        <Pressable
          className="flex-1 bg-stone-200 dark:bg-stone-700 rounded-xl px-4 py-3 active:bg-stone-300 dark:active:bg-stone-600"
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setHoldModalOpen(true);
          }}
          accessibilityRole="button"
          accessibilityLabel={`Réglette : ${hold?.name ?? config.hold}`}
        >
          <Text className="text-stone-500 dark:text-stone-400 text-xs mb-1">Réglette</Text>
          <Text className="text-stone-900 dark:text-stone-50 font-semibold text-sm" numberOfLines={1}>
            {hold?.name ?? config.hold}
          </Text>
        </Pressable>
      </View>

      <View className="mb-3">
        <View className="flex-row items-center gap-1.5 mb-2">
          <Text className="text-stone-500 dark:text-stone-400 text-xs">Inclinaison</Text>
          <InfoButton
            info="L'inclinaison de la réglette : 0° = réglette plate (plus facile), 20°+ = réglette très inclinée (beaucoup plus dur). Commencez à 0° ou 10° si vous débutez."
            accessibilityLabel="Afficher l'explication des angles d'inclinaison"
          />
        </View>
        <View className="flex-row flex-wrap gap-1.5">
          {ANGLES.map((angle) => {
            const isSelected = config.angleDeg === angle;
            return (
              <Pressable
                key={angle}
                className={`px-3 py-2 rounded-lg ${
                  isSelected
                    ? 'bg-orange-500'
                    : 'bg-stone-200 dark:bg-stone-700 active:bg-stone-300 dark:active:bg-stone-600'
                }`}
                onPress={() => {
                  Haptics.selectionAsync();
                  onChange({ ...config, angleDeg: angle });
                }}
                accessibilityRole="radio"
                accessibilityState={{ checked: isSelected }}
                accessibilityLabel={`Inclinaison ${angle} degrés`}
              >
                <Text
                  className={`text-sm font-semibold ${
                    isSelected ? 'text-white' : 'text-stone-900 dark:text-stone-50'
                  }`}
                >
                  {angle}°
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {grip?.warning && (
        <View className="flex-row items-start gap-2 mb-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl px-3 py-2">
          <Ionicons name="warning-outline" size={16} color="#d97706" style={{ marginTop: 1 }} />
          <Text className="text-amber-700 dark:text-amber-400 text-xs flex-1">{grip.warning}</Text>
        </View>
      )}

      <View>
        <View className="flex-row items-center gap-1.5 mb-2">
          <Text className="text-stone-500 dark:text-stone-400 text-xs">Charge additionnelle</Text>
          {loadInfo && <InfoButton info={loadInfo} accessibilityLabel="Afficher le conseil de charge" />}
        </View>
        <View className="flex-row items-center justify-center gap-2">
          <StepButton label="-5" onPress={() => adjustLoad(-5)} />
          <StepButton label="-1" onPress={() => adjustLoad(-1)} />
          <Text className="text-stone-900 dark:text-stone-50 text-xl font-bold w-16 text-center">
            {config.loadKg} kg
          </Text>
          <StepButton label="+1" onPress={() => adjustLoad(1)} />
          <StepButton label="+5" onPress={() => adjustLoad(5)} />
        </View>
      </View>

      <PickerModal
        visible={gripModalOpen}
        title="Choisir une préhension"
        items={gripItems}
        selectedId={config.grip}
        onSelect={(id) => onChange({ ...config, grip: id as GripType })}
        onClose={() => setGripModalOpen(false)}
      />

      <PickerModal
        visible={holdModalOpen}
        title="Choisir une réglette"
        items={holdItems}
        selectedId={config.hold}
        onSelect={(id) => onChange({ ...config, hold: id as HoldType })}
        onClose={() => setHoldModalOpen(false)}
      />
    </View>
  );
}

export function GripConfigSection({
  gripMode,
  gripConfigs,
  sets,
  onChangeMode,
  onChangeConfigs,
  loadInfo,
}: Props) {
  const synced = syncConfigsWithSets(gripConfigs, gripMode === 'session' ? 1 : sets);

  const handleModeChange = (mode: GripMode) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = syncConfigsWithSets(synced, mode === 'session' ? 1 : sets);
    onChangeMode(mode);
    onChangeConfigs(next);
  };

  const handleConfigChange = (index: number, config: GripConfig) => {
    const next = synced.map((c, i) => (i === index ? config : c));
    onChangeConfigs(next);
  };

  return (
    <View className="mb-6">
      <Text className="text-stone-900 dark:text-stone-50 text-lg font-bold mb-3">Préhension</Text>

      <View className="flex-row bg-stone-100 dark:bg-stone-800 rounded-xl p-1 mb-4 border border-stone-300 dark:border-stone-700/50">
        <Pressable
          className={`flex-1 py-2 rounded-lg items-center ${gripMode === 'session' ? 'bg-orange-500' : ''}`}
          onPress={() => handleModeChange('session')}
          style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}
          accessibilityRole="tab"
          accessibilityState={{ selected: gripMode === 'session' }}
          accessibilityLabel="Même préhension pour toute la séance"
        >
          <Text
            className={`font-bold text-sm ${
              gripMode === 'session' ? 'text-white' : 'text-stone-500 dark:text-stone-400'
            }`}
          >
            Séance complète
          </Text>
        </Pressable>
        <Pressable
          className={`flex-1 py-2 rounded-lg items-center ${gripMode === 'perSet' ? 'bg-orange-500' : ''}`}
          onPress={() => handleModeChange('perSet')}
          style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}
          accessibilityRole="tab"
          accessibilityState={{ selected: gripMode === 'perSet' }}
          accessibilityLabel="Préhension différente par série"
        >
          <Text
            className={`font-bold text-sm ${
              gripMode === 'perSet' ? 'text-white' : 'text-stone-500 dark:text-stone-400'
            }`}
          >
            Par série
          </Text>
        </Pressable>
      </View>

      {gripMode === 'session' ? (
        <GripConfigRow
          config={synced[0] ?? DEFAULT_CONFIG}
          loadInfo={loadInfo}
          onChange={(config) => handleConfigChange(0, config)}
        />
      ) : (
        synced.map((config, index) => (
          <GripConfigRow
            key={`set-${index}`}
            config={config}
            label={`Série ${index + 1}`}
            loadInfo={loadInfo}
            onChange={(c) => handleConfigChange(index, c)}
          />
        ))
      )}
    </View>
  );
}
