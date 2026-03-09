import { useCallback, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { loadHistory } from '@/lib/storage';
import { SessionHistoryEntry } from '@/types';
import { getGripById } from '@/constants/grips';

type ViewMode = 'week' | 'month';

function formatDuration(seconds: number): string {
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  if (min === 0) return `${sec}s`;
  return sec > 0 ? `${min}min ${sec}s` : `${min}min`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function getDayKey(iso: string): string {
  return iso.slice(0, 10); // YYYY-MM-DD
}

function getWeekKey(iso: string): string {
  const d = new Date(iso);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday start
  const monday = new Date(d);
  monday.setDate(diff);
  return monday.toISOString().slice(0, 10);
}

function formatWeekLabel(mondayKey: string): string {
  const monday = new Date(mondayKey);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  return `${fmt(monday)} — ${fmt(sunday)}`;
}

function groupBy<T>(items: T[], keyFn: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    const group = map.get(key);
    if (group) {
      group.push(item);
    } else {
      map.set(key, [item]);
    }
  }
  return map;
}

function EntryCard({ entry }: { entry: SessionHistoryEntry }) {
  const { result } = entry;
  const { protocol, grips, totalDuration, completed, config } = result;

  return (
    <View className="bg-stone-100 dark:bg-stone-800 rounded-3xl p-4 mb-3">
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-stone-900 dark:text-stone-50 text-base font-bold">
          {protocol.icon} {protocol.name}
        </Text>
        <Text className={completed ? 'text-green-400 text-sm' : 'text-yellow-400 text-sm'}>
          {completed ? 'Terminée' : 'Interrompue'}
        </Text>
      </View>

      <Text className="text-stone-500 dark:text-stone-400 text-sm mb-1">{formatDate(entry.date)}</Text>

      <View className="flex-row flex-wrap gap-x-4 gap-y-1 mt-1">
        <Text className="text-stone-600 dark:text-stone-300 text-sm">
          {formatDuration(totalDuration)}
        </Text>
        {grips.length > 0 && (
          <Text className="text-stone-600 dark:text-stone-300 text-sm">
            {grips.map((g) => getGripById(g)?.name ?? g).join(', ')}
          </Text>
        )}
        {config.loadKg != null && config.loadKg > 0 && (
          <Text className="text-stone-600 dark:text-stone-300 text-sm">
            +{config.loadKg} kg
          </Text>
        )}
      </View>
    </View>
  );
}

export default function HistoryScreen() {
  const [history, setHistory] = useState<SessionHistoryEntry[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('week');

  useFocusEffect(
    useCallback(() => {
      loadHistory().then(setHistory);
    }, [])
  );

  const { filtered, grouped, sortedKeys } = useMemo(() => {
    const now = Date.now();
    const cutoffDays = viewMode === 'week' ? 7 : 30;
    const cutoff = now - cutoffDays * 24 * 60 * 60 * 1000;
    const filtered = history.filter((e) => new Date(e.date).getTime() >= cutoff);

    const grouped =
      viewMode === 'week'
        ? groupBy(filtered, (e) => getDayKey(e.date))
        : groupBy(filtered, (e) => getWeekKey(e.date));

    const sortedKeys = [...grouped.keys()].sort((a, b) => b.localeCompare(a));

    return { filtered, grouped, sortedKeys };
  }, [history, viewMode]);

  return (
    <ScrollView className="flex-1 bg-white dark:bg-stone-950 px-5 pt-4">
      <Text className="text-stone-900 dark:text-stone-50 text-2xl font-bold mb-4">Historique</Text>

      <View className="flex-row bg-stone-100 dark:bg-stone-800 rounded-xl p-1 mb-6">
        <Pressable
          className={`flex-1 py-2 rounded-lg items-center ${viewMode === 'week' ? 'bg-orange-500' : ''}`}
          onPress={() => {
            setViewMode('week');
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
          style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}
          accessibilityRole="tab"
          accessibilityState={{ selected: viewMode === 'week' }}
          accessibilityLabel="7 derniers jours"
        >
          <Text className={`font-bold ${viewMode === 'week' ? 'text-white' : 'text-stone-500 dark:text-stone-400'}`}>
            Semaine
          </Text>
        </Pressable>
        <Pressable
          className={`flex-1 py-2 rounded-lg items-center ${viewMode === 'month' ? 'bg-orange-500' : ''}`}
          onPress={() => {
            setViewMode('month');
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
          style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}
          accessibilityRole="tab"
          accessibilityState={{ selected: viewMode === 'month' }}
          accessibilityLabel="30 derniers jours"
        >
          <Text className={`font-bold ${viewMode === 'month' ? 'text-white' : 'text-stone-500 dark:text-stone-400'}`}>
            Mois
          </Text>
        </Pressable>
      </View>

      {filtered.length === 0 ? (
        <View className="items-center justify-center py-20">
          <Text className="text-stone-500 dark:text-stone-400 text-lg">Aucune séance enregistrée</Text>
        </View>
      ) : (
        sortedKeys.map((key) => {
          const entries = grouped.get(key)!;
          const label =
            viewMode === 'week'
              ? formatDate(key)
              : formatWeekLabel(key);

          return (
            <View key={key} className="mb-5">
              <Text
                className="text-stone-500 dark:text-stone-400 text-sm font-bold uppercase mb-2"
                accessibilityRole="header"
              >
                {label}
              </Text>
              {entries.map((entry) => (
                <EntryCard key={entry.id} entry={entry} />
              ))}
            </View>
          );
        })
      )}

      <View className="h-8" />
    </ScrollView>
  );
}
