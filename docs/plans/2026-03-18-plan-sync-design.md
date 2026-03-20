# Design — Synchronisation Plans ↔ Séances

## Contexte
Les plans d'entraînement ont des sessions planifiées par semaine. Actuellement la complétion est manuelle (bouton "Valider"). On ajoute l'auto-complétion : quand l'utilisateur logue une séance, elle valide automatiquement la session planifiée correspondante.

## Matching

| Type planifié | Mode | Match avec |
|---|---|---|
| `climbing` + `bouldering` | Séance bloc loguée | `ClimbingSession.type === 'bloc'` |
| `climbing` + `route` | Séance voie loguée | `ClimbingSession.type === 'voie'` |
| `exercise` + `protocolIds` | Séance hangboard loguée | `SessionHistoryEntry` avec protocol matching |
| `climbing-exercise` | Mixte | Nécessite les 2 types → progression ½ puis ✓ |

## Quantité, pas jours
Si le plan prévoit 2 séances de bloc dans la semaine, il faut en loguer 2. Chaque séance loguée valide la prochaine session non-complétée dans l'ordre du plan.

## Sessions mixtes (`climbing-exercise`) — Progression 2 étapes
- 0/2 : rien logué → gris
- 1/2 : un des deux types logué (climbing OU exercise) → orange
- 2/2 : les deux logués → vert

Le type `SessionCompletion` est étendu avec `progress?: number` (0, 1, 2).

## Timing
Vérification au moment du save : après `saveClimbingSession()` ou après le recap hangboard, appel de `tryAutoCompletePlanSession()`.

## Indicateur visuel
Le checkmark sur chaque session dans la page plan change de couleur :
- Gris : pas fait
- Orange : en cours (1/2 pour climbing-exercise)
- Vert : complété

## Logique de `tryAutoCompletePlanSession()`
1. Charger activePlan
2. Si pas de plan actif → return
3. Trouver la semaine en cours dans weekHistory
4. Pour chaque PlannedSession non-complétée (dans l'ordre) :
   a. Si mode='climbing' et climbingActivity matche le type logué → compléter
   b. Si mode='exercise' et protocolIds matche → compléter
   c. Si mode='climbing-exercise' → incrémenter progress (1 puis 2)
5. Sauvegarder le plan

## Fichiers impactés
- `types/index.ts` — ajouter `progress?: number` à `SessionCompletion`
- `lib/storage.ts` — nouvelle fonction `tryAutoCompletePlanSession()`
- `app/journal/add-bloc.tsx` — appeler tryAutoComplete après save
- `app/journal/add-voie.tsx` — idem
- `app/recap.tsx` — idem (après save hangboard)
- `app/plan/[id].tsx` — affichage couleur du checkmark (gris/orange/vert)

## Décisions
- Matching par quantité, pas par jour de la semaine
- Première session non-complétée dans l'ordre du plan est validée
- Sessions mixtes: progression en 2 étapes (climbing + exercise)
- Vérification immédiate au save, pas à la lecture du plan
- Le toggle manuel reste disponible comme fallback
