# Design — Écran "Suivi" (ex-Journal)

## Contexte
L'écran Journal est renommé "Suivi" et reçoit un dashboard de stats pertinentes, un calendrier swipeable avec animations, et un style visuel hybride heatmap + dots.

## Changements

### 1. Renommage
- "Journal" → **"Suivi"** dans : menu (index.tsx ITEMS), navigation, header, tous les labels

### 2. Stats dashboard

Remplace les 3 compteurs basiques (sessions semaine, activités mois, suspensions semaine) par :

| Stat | Source | Affichage |
|------|--------|-----------|
| Sessions semaine | hangboard + climbing cette semaine | Nombre + tendance ↑↓ vs semaine précédente |
| Répartition mois (3 compteurs) | hangboard, bloc, voie du mois | 3 compteurs côte à côte avec icônes colorées (indigo poutre, orange bloc, bleu voie) |
| Temps total suspension | somme des durées hangboard de la semaine | Format `Xh Xmin` |
| Taux de réussite | entries climbing avec success=true / total entries | Pourcentage du mois |
| Grade moyen | moyenne des grades des climbing entries du mois | Grade formaté (ex: "6a+") |

### 3. Calendrier

**Swipe navigation** : swipe gauche/droite pour changer de mois (remplace ou complète les boutons flèches).

**Transition** : fade cross-dissolve entre les mois (pas de slide).

**Cellules hybrides** :
- Fond coloré par intensité : 0 sessions = transparent, 1 session = teinte légère, 2+ = teinte plus foncée
- Dots colorés par type d'activité : orange (bloc), bleu (voie), indigo (poutre)
- Jour sélectionné : bordure orange

**Librairie** : remplacer react-native-calendars par un calendrier custom ou react-native-gesture-handler PanGestureHandler pour le swipe + Reanimated pour le fade.

### 4. Vue liste
Inchangée (filtres + cartes groupées par jour).

## Fichiers impactés
- `app/journal.tsx` → renommer en `app/suivi.tsx` (ou garder le fichier et changer le titre)
- `app/index.tsx` — ITEMS.journal label + href
- `hooks/useJournalEntries.ts` — nouvelles stats (temps suspension, taux réussite, grade moyen, tendance)
- `types/index.ts` — mettre à jour `JournalStats`
- `components/journal/CalendarView.tsx` — swipe + fade + heatmap cells
- `app/_layout.tsx` — route si renommage fichier

## Décisions
- Pas de streak : le repos entre sessions est prôné
- Stats adaptées : volume réel (temps suspension) plutôt que simple comptage
- Heatmap hybride : intensité du fond + dots colorés pour le type
- Fade transition : plus doux qu'un slide pour le changement de mois
