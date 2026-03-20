# Suivi Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Renommer "Journal" en "Suivi", ajouter un dashboard de stats pertinentes, et rendre le calendrier swipeable avec transition fade et cellules heatmap hybrides.

**Architecture:** Étendre `JournalStats` avec des métriques calculées (temps suspension, taux réussite, grade moyen, tendances). Remplacer le calendrier `react-native-calendars` par un calendrier custom swipeable via `PanGestureHandler` + Reanimated fade. Conserver la vue liste et le quick log inchangés.

**Tech Stack:** React Native + Expo, NativeWind, Zustand (pas utilisé ici), react-native-gesture-handler, react-native-reanimated, AsyncStorage.

---

## Task 1: Étendre JournalStats et computeStats

**Files:**
- Modify: `types/index.ts` (lignes 212-217 — type JournalStats)
- Modify: `hooks/useJournalEntries.ts` (lignes 35-61 — computeStats)
- Modify: `constants/grades.ts` (ajouter helper averageGrade)

### Step 1: Mettre à jour le type JournalStats

`types/index.ts` — remplacer le type existant :

```typescript
export type JournalStats = {
  // Fréquence
  sessionsThisWeek: number;
  sessionsLastWeek: number;          // pour calcul tendance
  weekTrend: number;                 // delta sessions vs semaine précédente
  // Répartition mois (3 compteurs)
  hangboardThisMonth: number;
  blocThisMonth: number;
  voieThisMonth: number;
  // Volume poutre
  totalHangTimeWeek: number;         // secondes de suspension cette semaine
  // Escalade
  successRate: number;               // 0-100, % routes réussies ce mois
  averageGrade: string | null;       // grade moyen du mois (ex: "6a+") ou null si pas de données
};
```

### Step 2: Ajouter helper averageGrade

`constants/grades.ts` — ajouter en fin de fichier :

```typescript
export function averageGradeFromList(grades: string[]): string | null {
  if (grades.length === 0) return null;
  const indices = grades.map(gradeIndex).filter((i) => i >= 0);
  if (indices.length === 0) return null;
  const avg = Math.round(indices.reduce((a, b) => a + b, 0) / indices.length);
  return GRADES[Math.min(avg, GRADES.length - 1)];
}
```

### Step 3: Refondre computeStats dans useJournalEntries

`hooks/useJournalEntries.ts` — remplacer `computeStats()` :

```typescript
function computeStats(
  hangboard: SessionHistoryEntry[],
  climbing: ClimbingSession[]
): JournalStats {
  const now = new Date();
  const monday = getMonday(now);
  const lastMonday = new Date(monday);
  lastMonday.setDate(lastMonday.getDate() - 7);
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // Sessions cette semaine
  const mondayKey = getDateKey(monday);
  const lastMondayKey = getDateKey(lastMonday);

  const hbThisWeek = hangboard.filter((e) => e.date >= mondayKey);
  const climbThisWeek = climbing.filter((e) => e.date >= mondayKey);
  const sessionsThisWeek = hbThisWeek.length + climbThisWeek.length;

  // Sessions semaine dernière
  const hbLastWeek = hangboard.filter((e) => e.date >= lastMondayKey && e.date < mondayKey);
  const climbLastWeek = climbing.filter((e) => e.date >= lastMondayKey && e.date < mondayKey);
  const sessionsLastWeek = hbLastWeek.length + climbLastWeek.length;

  // Répartition mois
  const hangboardThisMonth = hangboard.filter((e) => e.date.startsWith(monthPrefix)).length;
  const blocThisMonth = climbing.filter((e) => e.date.startsWith(monthPrefix) && e.type === 'bloc').length;
  const voieThisMonth = climbing.filter((e) => e.date.startsWith(monthPrefix) && e.type === 'voie').length;

  // Temps total suspension semaine
  const totalHangTimeWeek = hbThisWeek.reduce((sum, e) => sum + (e.result?.totalDuration ?? 0), 0);

  // Taux de réussite (escalade ce mois)
  const climbThisMonth = climbing.filter((e) => e.date.startsWith(monthPrefix));
  let totalRoutes = 0;
  let successRoutes = 0;
  for (const session of climbThisMonth) {
    if (session.entries) {
      for (const entry of session.entries) {
        totalRoutes++;
        if (entry.success === true) successRoutes++;
      }
    }
  }
  const successRate = totalRoutes > 0 ? Math.round((successRoutes / totalRoutes) * 100) : 0;

  // Grade moyen (escalade ce mois)
  const allGrades: string[] = [];
  for (const session of climbThisMonth) {
    if (session.entries) {
      for (const entry of session.entries) {
        if (entry.grade) allGrades.push(entry.grade);
      }
    }
  }
  const averageGrade = averageGradeFromList(allGrades);

  return {
    sessionsThisWeek,
    sessionsLastWeek,
    weekTrend: sessionsThisWeek - sessionsLastWeek,
    hangboardThisMonth,
    blocThisMonth,
    voieThisMonth,
    totalHangTimeWeek,
    successRate,
    averageGrade,
  };
}
```

Ajouter l'import en haut : `import { averageGradeFromList } from '@/constants/grades';`

### Step 4: Vérifier compilation

```bash
npx tsc --noEmit
```

### Step 5: Commit

```bash
git add types/index.ts hooks/useJournalEntries.ts constants/grades.ts
git commit -m "feat: extend JournalStats with hang time, success rate, grade average and trends"
```

---

## Task 2: Renommer Journal → Suivi

**Files:**
- Modify: `app/index.tsx` (ITEMS.journal — lignes 52-58)
- Modify: `app/_layout.tsx` (Stack.Screen title)
- Modify: `app/journal.tsx` (header si affiché)

### Step 1: Mettre à jour le menu

`app/index.tsx` — modifier ITEMS.journal :

```typescript
journal: {
  title: 'Suivi',
  subtitle: 'Poutre, bloc, voie',
  icon: 'stats-chart-outline',   // icône plus adaptée au suivi/analytics
  href: '/journal',
  color: '#818CF8',
},
```

Note : le fichier reste `app/journal.tsx` (pas de renommage de fichier pour éviter de casser les routes existantes et les liens deep).

### Step 2: Mettre à jour le titre dans le layout

`app/_layout.tsx` — modifier le Stack.Screen :

```typescript
<Stack.Screen name="journal" options={{ title: 'Suivi' }} />
```

### Step 3: Commit

```bash
git add app/index.tsx app/_layout.tsx
git commit -m "feat: rename Journal to Suivi in menu and navigation"
```

---

## Task 3: Refondre le dashboard de stats

**Files:**
- Modify: `app/journal.tsx` (section stats, lignes 84-107)

### Step 1: Remplacer les 3 stats par le nouveau dashboard

Remplacer la section stats actuelle dans `app/journal.tsx` par :

```tsx
{/* Stats dashboard */}
<View className="mb-4">
  {/* Row 1: Sessions semaine + tendance */}
  <View className="bg-stone-100 dark:bg-stone-800 rounded-2xl p-4 mb-3 border border-stone-300 dark:border-stone-700/50">
    <View className="flex-row items-center justify-between">
      <View>
        <Text className="text-stone-400 dark:text-stone-500 text-xs font-semibold uppercase">
          Sessions cette semaine
        </Text>
        <Text className="text-stone-900 dark:text-stone-50 text-3xl font-bold mt-1">
          {stats.sessionsThisWeek}
        </Text>
      </View>
      {stats.weekTrend !== 0 && (
        <View className={`flex-row items-center px-3 py-1.5 rounded-full ${
          stats.weekTrend > 0 ? 'bg-green-500/15' : 'bg-red-500/15'
        }`}>
          <Ionicons
            name={stats.weekTrend > 0 ? 'trending-up' : 'trending-down'}
            size={16}
            color={stats.weekTrend > 0 ? '#22C55E' : '#EF4444'}
          />
          <Text className={`text-sm font-semibold ml-1 ${
            stats.weekTrend > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
          }`}>
            {stats.weekTrend > 0 ? '+' : ''}{stats.weekTrend}
          </Text>
        </View>
      )}
    </View>
  </View>

  {/* Row 2: Répartition 3 compteurs */}
  <View className="flex-row gap-3 mb-3">
    <View className="flex-1 bg-stone-100 dark:bg-stone-800 rounded-2xl p-3 border border-stone-300 dark:border-stone-700/50 items-center">
      <View className="w-9 h-9 rounded-xl items-center justify-center mb-1" style={{ backgroundColor: '#818CF820' }}>
        <Ionicons name="hand-left-outline" size={18} color="#818CF8" />
      </View>
      <Text className="text-stone-900 dark:text-stone-50 text-xl font-bold">{stats.hangboardThisMonth}</Text>
      <Text className="text-stone-400 dark:text-stone-500 text-xs">Poutre</Text>
    </View>
    <View className="flex-1 bg-stone-100 dark:bg-stone-800 rounded-2xl p-3 border border-stone-300 dark:border-stone-700/50 items-center">
      <View className="w-9 h-9 rounded-xl items-center justify-center mb-1" style={{ backgroundColor: '#F9731620' }}>
        <Ionicons name="cube-outline" size={18} color="#F97316" />
      </View>
      <Text className="text-stone-900 dark:text-stone-50 text-xl font-bold">{stats.blocThisMonth}</Text>
      <Text className="text-stone-400 dark:text-stone-500 text-xs">Bloc</Text>
    </View>
    <View className="flex-1 bg-stone-100 dark:bg-stone-800 rounded-2xl p-3 border border-stone-300 dark:border-stone-700/50 items-center">
      <View className="w-9 h-9 rounded-xl items-center justify-center mb-1" style={{ backgroundColor: '#2563EB20' }}>
        <Ionicons name="trending-up-outline" size={18} color="#2563EB" />
      </View>
      <Text className="text-stone-900 dark:text-stone-50 text-xl font-bold">{stats.voieThisMonth}</Text>
      <Text className="text-stone-400 dark:text-stone-500 text-xs">Voie</Text>
    </View>
  </View>

  {/* Row 3: Temps suspension + Taux réussite + Grade moyen */}
  <View className="flex-row gap-3">
    <View className="flex-1 bg-stone-100 dark:bg-stone-800 rounded-2xl p-3 border border-stone-300 dark:border-stone-700/50">
      <Text className="text-stone-400 dark:text-stone-500 text-xs font-semibold uppercase">Suspension</Text>
      <Text className="text-stone-900 dark:text-stone-50 text-lg font-bold mt-1">
        {Math.floor(stats.totalHangTimeWeek / 60)}m{(stats.totalHangTimeWeek % 60).toString().padStart(2, '0')}s
      </Text>
      <Text className="text-stone-400 dark:text-stone-500 text-xs">cette semaine</Text>
    </View>
    <View className="flex-1 bg-stone-100 dark:bg-stone-800 rounded-2xl p-3 border border-stone-300 dark:border-stone-700/50">
      <Text className="text-stone-400 dark:text-stone-500 text-xs font-semibold uppercase">Réussite</Text>
      <Text className="text-stone-900 dark:text-stone-50 text-lg font-bold mt-1">
        {stats.successRate}%
      </Text>
      <Text className="text-stone-400 dark:text-stone-500 text-xs">ce mois</Text>
    </View>
    <View className="flex-1 bg-stone-100 dark:bg-stone-800 rounded-2xl p-3 border border-stone-300 dark:border-stone-700/50">
      <Text className="text-stone-400 dark:text-stone-500 text-xs font-semibold uppercase">Grade moy.</Text>
      <Text className="text-stone-900 dark:text-stone-50 text-lg font-bold mt-1">
        {stats.averageGrade ?? '—'}
      </Text>
      <Text className="text-stone-400 dark:text-stone-500 text-xs">ce mois</Text>
    </View>
  </View>
</View>
```

### Step 2: Supprimer les anciennes stats

Supprimer les anciens `StatCard` et leur `View` container (lignes 84-107 environ).

### Step 3: Vérifier compilation

```bash
npx tsc --noEmit
```

### Step 4: Commit

```bash
git add app/journal.tsx
git commit -m "feat: replace basic stats with rich dashboard (trends, hang time, success rate, grade)"
```

---

## Task 4: Calendrier custom swipeable avec heatmap

**Files:**
- Modify: `components/journal/CalendarView.tsx` (remplacement complet)

### Step 1: Réécrire CalendarView avec swipe + fade + heatmap

Remplacer entièrement `CalendarView.tsx`. Le nouveau composant :
- N'utilise plus `react-native-calendars`
- Grille custom 7 colonnes (Lun-Dim)
- PanGestureHandler pour swipe horizontal
- Reanimated fade cross-dissolve pour transition
- Cellules : fond coloré par intensité + dots colorés par type

```tsx
import { useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, Dimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  FadeIn,
  FadeOut,
  useSharedValue,
  withTiming,
  useAnimatedStyle,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useThemeColors } from '@/lib/theme';
import type { JournalEntry } from '@/types';

const DAYS_HEADER = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const SWIPE_THRESHOLD = 50;

type Props = {
  entries: JournalEntry[];
  onSelectDay: (dateKey: string) => void;
  selectedDay: string | null;
};

type DayData = {
  date: number;
  dateKey: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  types: Set<'hangboard' | 'bloc' | 'voie'>;
  count: number;
};

function getDaysForMonth(year: number, month: number): DayData[] {
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const firstDay = new Date(year, month, 1);
  // Monday = 0, Sunday = 6
  let startDow = firstDay.getDay() - 1;
  if (startDow < 0) startDow = 6;

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const days: DayData[] = [];

  // Previous month padding
  for (let i = startDow - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    const m = month === 0 ? 12 : month;
    const y = month === 0 ? year - 1 : year;
    const dateKey = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    days.push({ date: d, dateKey, isCurrentMonth: false, isToday: false, types: new Set(), count: 0 });
  }

  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    days.push({ date: d, dateKey, isCurrentMonth: true, isToday: dateKey === todayKey, types: new Set(), count: 0 });
  }

  // Next month padding (fill to complete weeks)
  const remaining = 7 - (days.length % 7);
  if (remaining < 7) {
    for (let d = 1; d <= remaining; d++) {
      const m = month + 2 > 12 ? 1 : month + 2;
      const y = month + 2 > 12 ? year + 1 : year;
      const dateKey = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ date: d, dateKey, isCurrentMonth: false, isToday: false, types: new Set(), count: 0 });
    }
  }

  return days;
}

function getIntensityColor(count: number, isDark: boolean): string {
  if (count === 0) return 'transparent';
  if (count === 1) return isDark ? 'rgba(129,140,248,0.15)' : 'rgba(129,140,248,0.12)';
  return isDark ? 'rgba(129,140,248,0.30)' : 'rgba(129,140,248,0.22)';
}

const DOT_COLORS = {
  hangboard: '#818CF8',
  bloc: '#F97316',
  voie: '#2563EB',
};

const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

export function CalendarView({ entries, onSelectDay, selectedDay }: Props) {
  const colors = useThemeColors();
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [fadeKey, setFadeKey] = useState(0);

  // Build entry map
  const entryMap = useMemo(() => {
    const map: Record<string, { types: Set<string>; count: number }> = {};
    for (const entry of entries) {
      const dateKey = entry.type === 'hangboard' ? entry.data.date.slice(0, 10) : entry.data.date.slice(0, 10);
      if (!map[dateKey]) map[dateKey] = { types: new Set(), count: 0 };
      map[dateKey].count++;
      if (entry.type === 'hangboard') {
        map[dateKey].types.add('hangboard');
      } else {
        map[dateKey].types.add(entry.data.type); // 'bloc' or 'voie'
      }
    }
    return map;
  }, [entries]);

  // Days grid
  const days = useMemo(() => {
    const grid = getDaysForMonth(currentMonth.year, currentMonth.month);
    for (const day of grid) {
      const data = entryMap[day.dateKey];
      if (data) {
        day.types = data.types as Set<'hangboard' | 'bloc' | 'voie'>;
        day.count = data.count;
      }
    }
    return grid;
  }, [currentMonth, entryMap]);

  const isDark = colors.bg === '#0c0a09'; // from theme

  const navigateMonth = useCallback((delta: number) => {
    Haptics.selectionAsync();
    setCurrentMonth((prev) => {
      let m = prev.month + delta;
      let y = prev.year;
      if (m < 0) { m = 11; y--; }
      if (m > 11) { m = 0; y++; }
      return { year: y, month: m };
    });
    setFadeKey((k) => k + 1);
  }, []);

  // Swipe gesture
  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-SWIPE_THRESHOLD, SWIPE_THRESHOLD])
    .onEnd((e) => {
      if (e.translationX < -SWIPE_THRESHOLD) {
        runOnJS(navigateMonth)(1);
      } else if (e.translationX > SWIPE_THRESHOLD) {
        runOnJS(navigateMonth)(-1);
      }
    });

  return (
    <View>
      {/* Month header */}
      <View className="flex-row items-center justify-between mb-3 px-1">
        <Pressable onPress={() => navigateMonth(-1)} className="w-10 h-10 items-center justify-center">
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </Pressable>
        <Text className="text-stone-900 dark:text-stone-50 text-lg font-bold">
          {MONTH_NAMES[currentMonth.month]} {currentMonth.year}
        </Text>
        <Pressable onPress={() => navigateMonth(1)} className="w-10 h-10 items-center justify-center">
          <Ionicons name="chevron-forward" size={20} color={colors.text} />
        </Pressable>
      </View>

      {/* Legend */}
      <View className="flex-row justify-center gap-4 mb-3">
        {(['hangboard', 'bloc', 'voie'] as const).map((type) => (
          <View key={type} className="flex-row items-center gap-1">
            <View className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: DOT_COLORS[type] }} />
            <Text className="text-stone-400 dark:text-stone-500 text-xs capitalize">{type === 'hangboard' ? 'Poutre' : type}</Text>
          </View>
        ))}
      </View>

      {/* Calendar grid with swipe */}
      <GestureDetector gesture={swipeGesture}>
        <Animated.View key={fadeKey} entering={FadeIn.duration(250)} exiting={FadeOut.duration(150)}>
          {/* Day headers */}
          <View className="flex-row mb-1">
            {DAYS_HEADER.map((d) => (
              <View key={d} className="flex-1 items-center">
                <Text className="text-stone-400 dark:text-stone-500 text-xs font-semibold">{d}</Text>
              </View>
            ))}
          </View>

          {/* Day cells */}
          {Array.from({ length: Math.ceil(days.length / 7) }, (_, weekIdx) => (
            <View key={weekIdx} className="flex-row">
              {days.slice(weekIdx * 7, weekIdx * 7 + 7).map((day) => {
                const isSelected = day.dateKey === selectedDay;
                const dotTypes = Array.from(day.types);
                return (
                  <Pressable
                    key={day.dateKey}
                    className="flex-1 items-center py-1.5"
                    onPress={() => {
                      if (day.isCurrentMonth) {
                        Haptics.selectionAsync();
                        onSelectDay(day.dateKey);
                      }
                    }}
                    disabled={!day.isCurrentMonth}
                  >
                    <View
                      className="w-9 h-9 rounded-full items-center justify-center"
                      style={{
                        backgroundColor: isSelected ? '#F97316' : getIntensityColor(day.count, isDark),
                        borderWidth: day.isToday && !isSelected ? 1.5 : 0,
                        borderColor: '#F97316',
                      }}
                    >
                      <Text
                        className={`text-sm font-medium ${
                          isSelected
                            ? 'text-white'
                            : day.isCurrentMonth
                              ? 'text-stone-900 dark:text-stone-50'
                              : 'text-stone-300 dark:text-stone-600'
                        }`}
                      >
                        {day.date}
                      </Text>
                    </View>
                    {/* Activity dots */}
                    <View className="flex-row gap-0.5 mt-0.5 h-2">
                      {dotTypes.slice(0, 3).map((type) => (
                        <View
                          key={type}
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: DOT_COLORS[type] }}
                        />
                      ))}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}
```

Note : ajouter `import { Ionicons } from '@expo/vector-icons';` en haut du fichier.

### Step 2: Vérifier compilation

```bash
npx tsc --noEmit
```

### Step 3: Tester sur device

- Swipe gauche → mois suivant avec fade
- Swipe droite → mois précédent avec fade
- Boutons flèches fonctionnent toujours
- Dots colorés par type d'activité
- Fond des cellules coloré par intensité (0/1/2+ sessions)
- Jour actuel = bordure orange
- Jour sélectionné = fond orange plein

### Step 4: Commit

```bash
git add components/journal/CalendarView.tsx
git commit -m "feat: replace react-native-calendars with custom swipeable calendar + heatmap cells"
```

---

## Task 5: Nettoyage et vérification finale

**Files:**
- Modify: `package.json` (optionnel — supprimer react-native-calendars si plus utilisé ailleurs)
- Verify: all modified files compile

### Step 1: Vérifier si react-native-calendars est utilisé ailleurs

```bash
grep -r "react-native-calendars" --include="*.ts" --include="*.tsx" .
```

Si uniquement dans CalendarView.tsx (maintenant supprimé), retirer la dépendance :

```bash
npm uninstall react-native-calendars
```

### Step 2: Vérification complète

```bash
npx tsc --noEmit
```

### Step 3: Commit final

```bash
git add -A
git commit -m "chore: remove react-native-calendars dependency, cleanup"
```

---

## Résumé des tâches

| Task | Description | Fichiers |
|------|-------------|----------|
| 1 | Étendre JournalStats + computeStats | types, hooks, constants/grades |
| 2 | Renommer Journal → Suivi | index, _layout |
| 3 | Nouveau dashboard de stats | journal.tsx |
| 4 | Calendrier custom swipeable + heatmap | CalendarView.tsx |
| 5 | Nettoyage + vérification | package.json |

Dépendances : Task 1 avant Task 3. Tasks 2, 4 sont indépendantes.
