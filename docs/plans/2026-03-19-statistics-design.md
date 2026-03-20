# Design — Écran Statistiques

## Contexte
Ajout d'un écran Statistiques accessible depuis le menu principal pour visualiser l'évolution des entraînements. 3 vues via SegmentedControl + calendrier 3 mois sur chaque vue.

## Navigation
Nouvel item dans le menu principal (index.tsx), nouvelle route `/statistics`.

## Structure
SegmentedControl en haut : **Général** | **Poutre** | **Escalade**

Chaque vue contient :
1. Un calendrier heatmap 3 mois glissants avec sélecteur d'année
2. Des graphiques/stats spécifiques à la vue

## Calendrier 3 mois (commun aux 3 vues)
- Affiche les 3 derniers mois par défaut
- Sélecteur d'année en haut (2025 ← → 2026)
- Quand on change d'année, affiche les 3 derniers mois de cette année (ou les 3 premiers si année passée)
- Heatmap : intensité de couleur selon le nombre de séances du jour
- Filtré par type selon la vue active :
  - Général : toutes les séances
  - Poutre : séances hangboard uniquement
  - Escalade : séances bloc + voie uniquement

## Vue Général
- **Séances/semaine** : graphe en barres sur 8 dernières semaines
- **Répartition par type** : 3 compteurs (poutre/bloc/voie) du trimestre avec proportions
- **Calendrier heatmap 3 mois** (toutes séances)
- **Streak actuel** : nombre de semaines consécutives avec au moins 1 séance

## Vue Poutre
- **Charge max par préhension** : liste des préhensions utilisées avec la charge max atteinte (progression vs mois précédent avec flèche ↑↓)
- **Temps total suspension/semaine** : barres sur 8 semaines
- **Protocoles favoris** : top 3 protocoles les plus utilisés avec nombre de séances
- **Calendrier heatmap 3 mois** (séances hangboard)

## Vue Escalade
- **Grade moyen** : évolution sur les 3 derniers mois (valeur + tendance ↑↓)
- **Taux de réussite** : % blocs/voies envoyés sur le mois, évolution vs mois précédent
- **Volume** : nombre de blocs + voies par semaine (barres empilées 8 semaines)
- **Continuité** : si des séances continuité existent, moyenne passages/tour (dernière séance vs précédente)
- **Calendrier heatmap 3 mois** (séances bloc + voie)

## Fichiers à créer
- `app/statistics.tsx` — écran principal
- `components/statistics/StatsCalendar.tsx` — calendrier heatmap 3 mois réutilisable
- `components/statistics/GeneralView.tsx` — vue Général
- `components/statistics/PoutreView.tsx` — vue Poutre
- `components/statistics/EscaladeView.tsx` — vue Escalade
- `hooks/useStatistics.ts` — hook qui charge et agrège les données

## Fichiers à modifier
- `app/index.tsx` — ajouter item menu "Statistiques"
- `app/_layout.tsx` — ajouter route

## Style
- Graphes en barres : composants custom NativeWind (View avec hauteur proportionnelle), pas de lib externe
- Couleurs : orange (général), indigo (poutre), bleu (escalade)
- Cards arrondies avec le style stone habituel
- Animations Reanimated pour les entrées de stats
- Dark mode complet

## Décisions
- Pas de lib de graphiques externe — composants custom simples (barres, compteurs)
- Calendrier 3 mois réutilisable basé sur le pattern de CalendarView existant
- Les données viennent d'AsyncStorage via le hook useStatistics
- Le sélecteur d'année est un simple bouton ← année → avec animation
