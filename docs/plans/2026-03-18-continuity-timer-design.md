# Design — Timer continuité + Recap par tour

## Contexte
Les séances de voie en continuité (longue et courte) ont des durées d'effort et de repos bien définies. On ajoute un timer optionnel dans le formulaire de création, suivi d'un recap permettant de noter les voies faites par période de travail (tour).

## Timer
Réutilisation du timer existant avec mapping des paramètres de continuité vers TimerConfig :

### Continuité longue
- effort par tour → `hangDuration` (converti en secondes)
- repos entre tours → `restBetweenSets` (converti en secondes)
- nombre de tours → `sets`
- `reps: 1`
- pas de `restBetweenReps`

### Continuité courte
- effort par série → `hangDuration` (converti en secondes)
- repos entre séries → `restBetweenReps` (converti en secondes)
- séries par tour → `reps`
- repos entre tours (repos × 2) → `restBetweenSets`
- nombre de tours → `sets`

## Flow
1. Formulaire voie (continuité longue ou courte) → bouton "Lancer le timer" visible
2. Timer se lance avec la config mappée
3. Recap s'affiche à la fin avec un formulaire par tour
4. L'utilisateur note ses voies et passages par tour
5. Bouton "Enregistrer dans Suivi" → sauvegarde la séance complète (ClimbingSession avec roundDetails)

## Recap par tour
Pour chaque tour, un bloc dépliable avec :
- Bouton "Ajouter une voie"
- Par voie : grade (stepper) + nombre de passages (compteur) + réussi optionnel
- Exemple :
  - Tour 1 : 5c × 3 passages, 6a × 2 passages, 5b+ × 4 passages
  - Tour 2 : 5c × 2 passages, 6a × 1 passage, 5b+ × 3 passages

## Types

Nouveaux types :
```typescript
export type RoundRoute = {
  id: string;
  grade?: string;
  name?: string;
  passages: number;
  success?: boolean;
};

export type RoundDetail = {
  roundNumber: number;
  routes: RoundRoute[];
};
```

Champ ajouté à `ClimbingSession` :
```typescript
roundDetails?: RoundDetail[];
```

## Fichiers impactés
- `types/index.ts` — RoundDetail, RoundRoute, champ roundDetails dans ClimbingSession
- `app/journal/add-voie.tsx` — bouton "Lancer le timer" pour les modes continuité
- `app/recap.tsx` — détecter si c'est un recap continuité, afficher formulaire par tour
- `lib/storage.ts` — pas de changement

## Décisions
- Réutilisation du timer engine existant (pas de nouveau timer)
- Timer optionnel (l'utilisateur peut aussi sauvegarder sans timer)
- Recap par tour pour mesurer la progression semaine après semaine
- Le formulaire voie "Libre" ne change pas
- Le recap hangboard classique ne change pas
