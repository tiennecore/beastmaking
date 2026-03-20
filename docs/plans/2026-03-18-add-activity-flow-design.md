# Design — Flow "Ajouter une activité"

## Contexte
Le bouton "Ajouter une grimpe" sur l'écran Suivi ouvre actuellement un BottomSheet avec un formulaire rapide (type bloc/voie, compteur, difficulté). On le remplace par un flow en 2 étapes : écran de choix d'activité → page dédiée par type.

## Écran 1 — Choix d'activité (`/journal/add`)
3 grosses cartes empilées verticalement (style cards du menu principal) :
- **Bloc** (icône orange) → navigue vers `/journal/add-bloc`
- **Voie** (icône bleu) → navigue vers `/journal/add-voie`
- **Hangboard** (icône indigo) → navigue vers `/journal/add-hangboard`

Le bouton sur l'écran Suivi est renommé "Ajouter une activité".

## Page Bloc (`/journal/add-bloc`)
Formulaire détaillé route par route :
- Date
- Entrées route par route : grade/couleur, réussi/échoué, tentatives
- Notes optionnelles

## Page Voie (`/journal/add-voie`)
SegmentedControl en haut : **Libre** | **Continuité longue** | **Continuité courte** (défaut : Libre)

### Mode Libre
Identique au bloc — date + routes par route (grade, réussi/échoué, tentatives, notes).

### Mode Continuité longue
- Nombre de tours (1-3)
- Durée d'effort par tour (minutes)
- Repos entre tours (minutes)
- Intensité ressentie (facile / correct / dur)
- Notes optionnelles

### Mode Continuité courte
- Nombre de tours (4-5)
- Nombre de séries par tour
- Durée d'effort par série
- Repos entre séries (minutes)
- Tombé à partir du tour X
- Notes optionnelles

## Page Hangboard (`/journal/add-hangboard`)
2 sections sur une seule page :
- **Protocoles** : les 9 protocoles Beastmaking (tap → page config `/protocol/[id]` → timer)
- **Mes workouts** : workouts perso (tap → lance le timer)

## Navigation
| Action | Route |
|--------|-------|
| Bouton "Ajouter une activité" | `/journal/add` |
| Choix Bloc | `/journal/add-bloc` |
| Choix Voie | `/journal/add-voie` |
| Choix Hangboard | `/journal/add-hangboard` |

## Décisions
- Pas de muscu : hors scope pour l'instant
- SegmentedControl pour les sous-types voie (pas d'écran intermédiaire) — pattern existant dans l'app
- Hangboard regroupe protocoles + workouts perso sur une seule page (raccourci vers les écrans existants)
- Formulaires continuité adaptés à la réalité du training : volume/durée/fatigue plutôt que routes individuelles
- Libre est le mode par défaut en voie
