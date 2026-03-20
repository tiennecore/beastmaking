# Deep-dive — Journal unifié

## Contexte

L'écran Journal remplace les anciens écrans `history.tsx` (historique hangboard) et `climbing.tsx` (séances d'escalade) par une interface unifiée. Les deux stores AsyncStorage sont conservés tels quels — la fusion se fait uniquement à l'affichage.

---

## Dépendances externes

| Package | Usage |
|---------|-------|
| `@gorhom/bottom-sheet` | Bottom sheets natifs basés sur les gestes |

> `react-native-calendars` a été supprimé. Le calendrier est désormais un composant custom (`components/journal/CalendarView.tsx`) basé sur `react-native-gesture-handler` + `react-native-reanimated`.

`@gorhom/bottom-sheet` requiert `GestureHandlerRootView` au niveau du root layout (`app/_layout.tsx`).

---

## Fichiers concernés

| Fichier | Rôle |
|---------|------|
| `app/journal.tsx` | Ecran principal (toggle vue, stats, bottom sheet QuickLog) |
| `app/journal/[id].tsx` | Detail / edition d'une entree |
| `hooks/useJournalEntries.ts` | Hook de données unifiées |
| `components/journal/CalendarView.tsx` | Vue calendrier |
| `components/journal/GradeStepper.tsx` | Stepper de cotation |
| `components/journal/ClimbEntryCard.tsx` | Carte d'une voie / bloc |
| `components/journal/LocationInput.tsx` | Input lieu avec autocomplete |
| `components/journal/DifficultyBadge.tsx` | Badge de difficulte |
| `components/journal/NativeDatePicker.tsx` | Wrapper date picker natif |
| `components/journal/ToggleButton.tsx` | Pill toggle generique |
| `constants/climbing.ts` | Constantes et helpers (types, couleurs, dates) |
| `types/index.ts` | Types `JournalEntry`, `JournalStats`, `JournalFilter`, `GroupedJournalDay` |

---

## Types (`types/index.ts`)

```typescript
type JournalFilter = 'all' | 'hangboard' | 'bloc' | 'voie';

type JournalEntry =
  | { type: 'hangboard'; data: SessionHistoryEntry }
  | { type: 'climbing'; data: ClimbingSession };

type GroupedJournalDay = {
  dateKey: string;   // YYYY-MM-DD
  label: string;     // "Lundi 10 mars"
  entries: JournalEntry[];
};

// Anciennement WeeklyStats — renomme en JournalStats
type JournalStats = {
  sessionsThisWeek: number;
  activitiesThisMonth: number;
  hangboardSessionsThisWeek: number;
};
```

> Le type `WeeklyStats` a été renommé en `JournalStats` lors du refactor du Journal.

---

## Hook `useJournalEntries`

```
hooks/useJournalEntries.ts
```

Charge les deux stores en parallèle (`Promise.all`), fusionne les entrées, trie par date décroissante, groupe par jour et calcule les stats. Se recharge automatiquement au focus de l'écran via `useFocusEffect`.

```typescript
function useJournalEntries(filter?: JournalFilter): {
  days: GroupedJournalDay[];
  stats: JournalStats;
  loading: boolean;
  reload: () => Promise<void>;
}
```

**Calcul des stats :**
- `sessionsThisWeek` : toutes les entrées (hangboard + escalade) depuis le lundi de la semaine courante
- `activitiesThisMonth` : toutes les entrées du mois civil en cours
- `hangboardSessionsThisWeek` : entrées hangboard de la semaine courante

---

## Ecran `app/journal.tsx`

### Mode d'affichage

`ViewModeToggle` (Calendrier / Liste) remplace le titre dans le header. Le mode calendrier est l'affichage par défaut. La bascule entre les deux vues est également déclenchable par un swipe horizontal sur le contenu principal (`GestureDetector` + `Gesture.Pan`).

### Stats row

Trois compteurs compacts en ligne horizontale :
- **Semaine** — nombre de séances cette semaine (`sessionsThisWeek`)
- **Mois** — activités ce mois (`activitiesThisMonth`)
- **Suspensions** — séances hangboard cette semaine (`hangboardSessionsThisWeek`)

### Vue Calendrier (`components/journal/CalendarView.tsx`)

Composant custom basé sur `react-native-gesture-handler` + `react-native-reanimated` (remplace `react-native-calendars`) :

- Navigation entre mois par swipe horizontal (`GestureDetector` + `Gesture.Pan`) ou via les flèches de header
- Transition animée entre mois : `fade` via `Reanimated`
- Cellules heatmap : intensité de couleur proportionnelle au volume de la journée
- Dots colorés par type d'activité : hangboard (orange), bloc (orange foncé), voie (bleu)
- Section légende sous le calendrier

### QuickLog Bottom Sheet

`@gorhom/bottom-sheet` remplace la `Modal` du design initial. Contient le formulaire de saisie rapide d'une séance d'escalade :
- Toggle Bloc / Voie
- Compteur de voies / blocs
- Sélecteur de difficulté (4 niveaux)
- Bouton "Enregistrer"
- Lien "Ajouter des détails →" (sauvegarde et navigue vers `journal/[id]` en mode édition)

### Day detail

Le panneau de détail du jour sélectionné est affiché en bottom sheet (suppression du `SelectedDayPanel` inline du design initial).

### Ouverture automatique QuickLog

Le paramètre de requête `?quicklog=true` (depuis `app/recap.tsx`) ouvre automatiquement le bottom sheet au montage de l'écran.

---

## Ecran `app/journal/[id].tsx`

Le paramètre `id` utilise un préfixe pour distinguer la source :
- `h-{id}` — entrée hangboard (lecture seule)
- `c-{id}` — séance escalade (éditable)

**Vue hangboard** : protocole, date, durée, statut, résumé config, liste des grips.

**Vue escalade** : header avec crayon pour basculer en mode édition des métadonnées, liste des `ClimbEntryCard` toujours éditable inline, bouton "Enregistrer".

---

## Modèle de données

Aucune migration — les deux clés AsyncStorage restent identiques :

```
beastmaking:history          → SessionHistoryEntry[]
beastmaking:climbing-sessions → ClimbingSession[]
```

Le type union `JournalEntry` existe uniquement en mémoire pour le rendu.

---

## `app/_layout.tsx`

Enveloppé dans `GestureHandlerRootView` (requis par `@gorhom/bottom-sheet`). Routes ajoutées :

```typescript
<Stack.Screen name="journal" options={{ title: 'Journal' }} />
<Stack.Screen name="journal/[id]" options={{ title: 'Détail' }} />
```

Les anciennes routes `history` et `climbing` ont été supprimées.
