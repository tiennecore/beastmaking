import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { loadHistory, loadClimbingSessions } from '@/lib/storage';
import { averageGradeFromList } from '@/constants/grades';
import { GRIPS } from '@/constants/grips';
import type { SessionHistoryEntry, ClimbingSession, GripType } from '@/types';

// --- Public types ---

export type WeeklyBar = {
  weekLabel: string;
  value: number;
};

export type GeneralStats = {
  weeklySessionCounts: WeeklyBar[];
  totalPoutre: number;
  totalBloc: number;
  totalVoie: number;
  currentStreak: number;
};

export type GripProgression = {
  gripName: string;
  currentMax: number;
  previousMax: number;
};

export type ProtocolUsage = {
  protocolName: string;
  count: number;
};

export type PoutreStats = {
  gripProgressions: GripProgression[];
  weeklyHangTime: WeeklyBar[];
  topProtocols: ProtocolUsage[];
};

export type EscaladeStats = {
  currentAvgGrade: string | null;
  previousAvgGrade: string | null;
  successRateMonth: number;
  successRatePrevMonth: number;
  weeklyVolume: { weekLabel: string; bloc: number; voie: number }[];
  continuityAvgPassages: number | null;
  continuityPrevAvgPassages: number | null;
};

export type DayActivity = {
  dateKey: string;
  count: number;
  hasHangboard: boolean;
  hasBloc: boolean;
  hasVoie: boolean;
};

// --- Default values ---

const DEFAULT_GENERAL: GeneralStats = {
  weeklySessionCounts: [],
  totalPoutre: 0,
  totalBloc: 0,
  totalVoie: 0,
  currentStreak: 0,
};

const DEFAULT_POUTRE: PoutreStats = {
  gripProgressions: [],
  weeklyHangTime: [],
  topProtocols: [],
};

const DEFAULT_ESCALADE: EscaladeStats = {
  currentAvgGrade: null,
  previousAvgGrade: null,
  successRateMonth: 0,
  successRatePrevMonth: 0,
  weeklyVolume: [],
  continuityAvgPassages: null,
  continuityPrevAvgPassages: null,
};

// --- Date helpers ---

function getDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getISOWeekNumber(dateKey: string): number {
  const date = new Date(`${dateKey}T12:00:00`);
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayOfWeek = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayOfWeek);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function getMondayOfWeek(weeksAgo: number): Date {
  const now = new Date();
  const day = now.getDay() || 7;
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(now.getDate() - (day - 1) - weeksAgo * 7);
  return monday;
}

function getWeekBounds(weeksAgo: number): { start: string; end: string } {
  const monday = getMondayOfWeek(weeksAgo);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { start: getDateKey(monday), end: getDateKey(sunday) };
}

function buildEightWeekBars(): { start: string; end: string; label: string }[] {
  const bars: { start: string; end: string; label: string }[] = [];
  for (let i = 7; i >= 0; i--) {
    const { start, end } = getWeekBounds(i);
    const weekNum = getISOWeekNumber(start);
    bars.push({ start, end, label: `S${weekNum}` });
  }
  return bars;
}

function isInWeek(dateKey: string, start: string, end: string): boolean {
  return dateKey >= start && dateKey <= end;
}

// --- Computation helpers ---

function computeGeneral(
  history: SessionHistoryEntry[],
  climbing: ClimbingSession[],
): GeneralStats {
  const now = new Date();
  const trimesterStart = new Date(now);
  trimesterStart.setMonth(now.getMonth() - 3);
  const trimesterKey = getDateKey(trimesterStart);

  const totalPoutre = history.filter((e) => e.date.slice(0, 10) >= trimesterKey).length;
  const totalBloc = climbing.filter(
    (s) => s.date.slice(0, 10) >= trimesterKey && s.type === 'bloc',
  ).length;
  const totalVoie = climbing.filter(
    (s) => s.date.slice(0, 10) >= trimesterKey && s.type === 'voie',
  ).length;

  const weeks = buildEightWeekBars();

  const weeklySessionCounts: WeeklyBar[] = weeks.map(({ start, end, label }) => {
    const hbCount = history.filter((e) => isInWeek(e.date.slice(0, 10), start, end)).length;
    const clCount = climbing.filter((s) => isInWeek(s.date.slice(0, 10), start, end)).length;
    return { weekLabel: label, value: hbCount + clCount };
  });

  let currentStreak = 0;
  for (let i = 0; i < weeks.length; i++) {
    const { start, end } = weeks[weeks.length - 1 - i];
    const hasSession =
      history.some((e) => isInWeek(e.date.slice(0, 10), start, end)) ||
      climbing.some((s) => isInWeek(s.date.slice(0, 10), start, end));
    if (hasSession) {
      currentStreak++;
    } else {
      break;
    }
  }

  return { weeklySessionCounts, totalPoutre, totalBloc, totalVoie, currentStreak };
}

function computePoutre(history: SessionHistoryEntry[]): PoutreStats {
  const now = new Date();
  const weeks = buildEightWeekBars();

  const weeklyHangTime: WeeklyBar[] = weeks.map(({ start, end, label }) => {
    const value = history
      .filter((e) => isInWeek(e.date.slice(0, 10), start, end))
      .reduce((sum, e) => sum + (e.result?.totalDuration ?? 0), 0);
    return { weekLabel: label, value };
  });

  const threeMonthsAgo = new Date(now);
  threeMonthsAgo.setMonth(now.getMonth() - 3);
  const threeMonthsKey = getDateKey(threeMonthsAgo);
  const recentHistory = history.filter((e) => e.date.slice(0, 10) >= threeMonthsKey);

  const protocolCounts = new Map<string, number>();
  for (const entry of recentHistory) {
    const name = entry.result?.protocol?.name;
    if (name) {
      protocolCounts.set(name, (protocolCounts.get(name) ?? 0) + 1);
    }
  }
  const topProtocols: ProtocolUsage[] = Array.from(protocolCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([protocolName, count]) => ({ protocolName, count }));

  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const currentMonthKey = getDateKey(currentMonthStart);
  const prevMonthKey = getDateKey(prevMonthStart);

  const gripMaxCurrent = new Map<GripType, number>();
  const gripMaxPrev = new Map<GripType, number>();

  for (const entry of history) {
    const dateKey = entry.date.slice(0, 10);
    const gripConfigs = entry.result?.gripConfigs ?? [];

    for (const gc of gripConfigs) {
      const isCurrentMonth = dateKey >= currentMonthKey;
      const isPrevMonth = dateKey >= prevMonthKey && dateKey < currentMonthKey;

      if (isCurrentMonth) {
        const prev = gripMaxCurrent.get(gc.grip) ?? -Infinity;
        if (gc.loadKg > prev) gripMaxCurrent.set(gc.grip, gc.loadKg);
      } else if (isPrevMonth) {
        const prev = gripMaxPrev.get(gc.grip) ?? -Infinity;
        if (gc.loadKg > prev) gripMaxPrev.set(gc.grip, gc.loadKg);
      }
    }
  }

  const allGripTypes = new Set<GripType>([
    ...gripMaxCurrent.keys(),
    ...gripMaxPrev.keys(),
  ]);

  const gripProgressions: GripProgression[] = Array.from(allGripTypes).map((gripType) => {
    const grip = GRIPS.find((g) => g.id === gripType);
    return {
      gripName: grip?.name ?? gripType,
      currentMax: gripMaxCurrent.get(gripType) ?? 0,
      previousMax: gripMaxPrev.get(gripType) ?? 0,
    };
  });

  return { gripProgressions, weeklyHangTime, topProtocols };
}

function computeAveragePassages(sessions: ClimbingSession[]): number | null {
  const sessionsWithRounds = sessions.filter(
    (s) => s.roundDetails && s.roundDetails.length > 0,
  );
  if (sessionsWithRounds.length === 0) return null;

  const latest = sessionsWithRounds[0];
  if (!latest.roundDetails || latest.roundDetails.length === 0) return null;

  const allPassages = latest.roundDetails.flatMap((r) => r.routes.map((rt) => rt.passages));
  if (allPassages.length === 0) return null;

  const total = allPassages.reduce((a, b) => a + b, 0);
  return Math.round((total / allPassages.length) * 10) / 10;
}

function computeSuccessRate(sessions: ClimbingSession[]): number {
  let total = 0;
  let success = 0;
  for (const session of sessions) {
    if (session.entries) {
      for (const entry of session.entries) {
        total++;
        if (entry.success === true) success++;
      }
    }
  }
  return total > 0 ? Math.round((success / total) * 100) : 0;
}

function computeEscalade(climbing: ClimbingSession[]): EscaladeStats {
  const now = new Date();
  const weeks = buildEightWeekBars();

  const weeklyVolume = weeks.map(({ start, end, label }) => {
    const bloc = climbing.filter(
      (s) => s.type === 'bloc' && isInWeek(s.date.slice(0, 10), start, end),
    ).length;
    const voie = climbing.filter(
      (s) => s.type === 'voie' && isInWeek(s.date.slice(0, 10), start, end),
    ).length;
    return { weekLabel: label, bloc, voie };
  });

  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const currentMonthKey = getDateKey(currentMonthStart);
  const prevMonthKey = getDateKey(prevMonthStart);

  const currentMonthSessions = climbing.filter((s) => s.date.slice(0, 10) >= currentMonthKey);
  const prevMonthSessions = climbing.filter(
    (s) => s.date.slice(0, 10) >= prevMonthKey && s.date.slice(0, 10) < currentMonthKey,
  );

  const currentGrades: string[] = [];
  const prevGrades: string[] = [];

  for (const session of currentMonthSessions) {
    if (session.entries) {
      for (const entry of session.entries) {
        if (entry.grade) currentGrades.push(entry.grade);
      }
    }
  }
  for (const session of prevMonthSessions) {
    if (session.entries) {
      for (const entry of session.entries) {
        if (entry.grade) prevGrades.push(entry.grade);
      }
    }
  }

  const voieSessions = climbing
    .filter((s) => s.type === 'voie' && s.roundDetails && s.roundDetails.length > 0)
    .sort((a, b) => b.date.localeCompare(a.date));

  const continuityAvgPassages = computeAveragePassages(voieSessions);
  const continuityPrevAvgPassages =
    voieSessions.length > 1 ? computeAveragePassages(voieSessions.slice(1)) : null;

  return {
    currentAvgGrade: averageGradeFromList(currentGrades),
    previousAvgGrade: averageGradeFromList(prevGrades),
    successRateMonth: computeSuccessRate(currentMonthSessions),
    successRatePrevMonth: computeSuccessRate(prevMonthSessions),
    weeklyVolume,
    continuityAvgPassages,
    continuityPrevAvgPassages,
  };
}

function buildDayActivities(
  history: SessionHistoryEntry[],
  climbing: ClimbingSession[],
): Map<string, DayActivity> {
  const map = new Map<string, DayActivity>();

  const upsert = (dateKey: string): DayActivity => {
    const existing = map.get(dateKey);
    if (existing) return existing;
    const activity: DayActivity = {
      dateKey,
      count: 0,
      hasHangboard: false,
      hasBloc: false,
      hasVoie: false,
    };
    map.set(dateKey, activity);
    return activity;
  };

  for (const entry of history) {
    const dateKey = entry.date.slice(0, 10);
    const activity = upsert(dateKey);
    activity.count++;
    activity.hasHangboard = true;
  }

  for (const session of climbing) {
    const dateKey = session.date.slice(0, 10);
    const activity = upsert(dateKey);
    activity.count++;
    if (session.type === 'bloc') activity.hasBloc = true;
    if (session.type === 'voie') activity.hasVoie = true;
  }

  return map;
}

// --- Hook ---

export function useStatistics(): {
  loading: boolean;
  general: GeneralStats;
  poutre: PoutreStats;
  escalade: EscaladeStats;
  dayActivities: Map<string, DayActivity>;
} {
  const [loading, setLoading] = useState(true);
  const [general, setGeneral] = useState<GeneralStats>(DEFAULT_GENERAL);
  const [poutre, setPoutre] = useState<PoutreStats>(DEFAULT_POUTRE);
  const [escalade, setEscalade] = useState<EscaladeStats>(DEFAULT_ESCALADE);
  const [dayActivities, setDayActivities] = useState<Map<string, DayActivity>>(new Map());

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [history, climbing] = await Promise.all([
        loadHistory(),
        loadClimbingSessions(),
      ]);
      setGeneral(computeGeneral(history, climbing));
      setPoutre(computePoutre(history));
      setEscalade(computeEscalade(climbing));
      setDayActivities(buildDayActivities(history, climbing));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, [loadAll]),
  );

  return { loading, general, poutre, escalade, dayActivities };
}
