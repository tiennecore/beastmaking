import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { loadHistory, loadClimbingSessions } from '@/lib/storage';
import { averageGradeFromList } from '@/constants/grades';
import type {
  SessionHistoryEntry,
  ClimbingSession,
  JournalEntry,
  JournalFilter,
  GroupedJournalDay,
  JournalStats,
} from '@/types';

function getDateKey(isoDate: string): string {
  return isoDate.slice(0, 10);
}

function formatDayLabel(dateKey: string): string {
  const date = new Date(`${dateKey}T12:00:00`);
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function computeStats(
  history: SessionHistoryEntry[],
  climbing: ClimbingSession[],
): JournalStats {
  const now = new Date();
  const monday = getMonday(now);
  const lastMonday = new Date(monday);
  lastMonday.setDate(lastMonday.getDate() - 7);
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const mondayKey = getDateKey(monday.toISOString());
  const lastMondayKey = getDateKey(lastMonday.toISOString());

  const hbThisWeek = history.filter((e) => getDateKey(e.date) >= mondayKey);
  const climbThisWeek = climbing.filter((e) => getDateKey(e.date) >= mondayKey);
  const sessionsThisWeek = hbThisWeek.length + climbThisWeek.length;

  const hbLastWeek = history.filter(
    (e) => getDateKey(e.date) >= lastMondayKey && getDateKey(e.date) < mondayKey,
  );
  const climbLastWeek = climbing.filter(
    (e) => getDateKey(e.date) >= lastMondayKey && getDateKey(e.date) < mondayKey,
  );
  const sessionsLastWeek = hbLastWeek.length + climbLastWeek.length;

  const hangboardThisMonth = history.filter((e) =>
    getDateKey(e.date).startsWith(monthPrefix),
  ).length;
  const blocThisMonth = climbing.filter(
    (e) => getDateKey(e.date).startsWith(monthPrefix) && e.type === 'bloc',
  ).length;
  const voieThisMonth = climbing.filter(
    (e) => getDateKey(e.date).startsWith(monthPrefix) && e.type === 'voie',
  ).length;

  const totalHangTimeWeek = hbThisWeek.reduce(
    (sum, e) => sum + (e.result?.totalDuration ?? 0),
    0,
  );

  const climbThisMonth = climbing.filter((e) =>
    getDateKey(e.date).startsWith(monthPrefix),
  );
  let totalRoutes = 0;
  let successRoutes = 0;
  const allGrades: string[] = [];
  for (const session of climbThisMonth) {
    if (session.entries) {
      for (const entry of session.entries) {
        totalRoutes++;
        if (entry.success === true) successRoutes++;
        if (entry.grade) allGrades.push(entry.grade);
      }
    }
  }
  const successRate =
    totalRoutes > 0 ? Math.round((successRoutes / totalRoutes) * 100) : 0;

  return {
    sessionsThisWeek,
    sessionsLastWeek,
    weekTrend: sessionsThisWeek - sessionsLastWeek,
    hangboardThisMonth,
    blocThisMonth,
    voieThisMonth,
    totalHangTimeWeek,
    successRate,
    averageGrade: averageGradeFromList(allGrades),
  };
}

function applyFilter(entries: JournalEntry[], filter: JournalFilter): JournalEntry[] {
  if (filter === 'all') return entries;
  if (filter === 'hangboard') return entries.filter((e) => e.type === 'hangboard');
  return entries.filter(
    (e) => e.type === 'climbing' && e.data.type === filter,
  );
}

function groupByDay(entries: JournalEntry[]): GroupedJournalDay[] {
  const map = new Map<string, JournalEntry[]>();

  for (const entry of entries) {
    const dateKey = getDateKey(entry.data.date);
    const bucket = map.get(dateKey) ?? [];
    bucket.push(entry);
    map.set(dateKey, bucket);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([dateKey, dayEntries]) => ({
      dateKey,
      label: formatDayLabel(dateKey),
      entries: dayEntries,
    }));
}

export function useJournalEntries(filter: JournalFilter = 'all'): {
  days: GroupedJournalDay[];
  allEntries: JournalEntry[];
  stats: JournalStats;
  loading: boolean;
  reload: () => Promise<void>;
} {
  const [history, setHistory] = useState<SessionHistoryEntry[]>([]);
  const [climbing, setClimbing] = useState<ClimbingSession[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [h, c] = await Promise.all([loadHistory(), loadClimbingSessions()]);
      setHistory(h);
      setClimbing(c);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const stats = useMemo(() => computeStats(history, climbing), [history, climbing]);

  const allEntries = useMemo(
    (): JournalEntry[] => [
      ...history.map((data): JournalEntry => ({ type: 'hangboard', data })),
      ...climbing.map((data): JournalEntry => ({ type: 'climbing', data })),
    ],
    [history, climbing],
  );

  const days = useMemo(() => {
    const filtered = applyFilter(allEntries, filter);
    return groupByDay(filtered);
  }, [allEntries, filter]);

  return { days, allEntries, stats, loading, reload };
}
