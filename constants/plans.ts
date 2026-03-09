import { TrainingPlanTemplate } from '@/types';

function session(
  id: string,
  type: TrainingPlanTemplate['sessions'][0]['type'],
  label: string,
  description: string,
  order: number,
  protocolIds?: string[]
) {
  return { id, type, label, description, order, protocolIds };
}

export const PLAN_TEMPLATES: TrainingPlanTemplate[] = [
  {
    id: 'beginner-3',
    name: 'Débutant',
    description: 'Initiation à la poutre et à la grimpe régulière. Faible risque de blessure, idéal pour commencer.',
    goal: 'beginner',
    icon: '🌱',
    daysPerWeek: 3,
    totalWeeks: 8,
    sessions: [
      session('s1', 'bouldering', 'Bloc', 'Séance bloc en salle', 1),
      session('s2', 'hangboard-force', 'Poutre — Intermittentes', 'Suspensions intermittentes 7s/3s. Faible risque, idéal pour débuter.', 2, ['intermittent']),
      session('s3', 'route', 'Voie', 'Séance voie en salle ou falaise', 3),
    ],
  },
  {
    id: 'force-4',
    name: 'Force',
    description: 'Développez la force maximale de vos doigts. Alternance max courtes et max longues avec 48h de repos entre chaque.',
    goal: 'force',
    icon: '⚡',
    daysPerWeek: 4,
    totalWeeks: 8,
    sessions: [
      session('s1', 'hangboard-force', 'Poutre — Max courtes', 'Adaptations neuromusculaires rapides. Travaillez frais.', 1, ['max-short']),
      session('s2', 'bouldering', 'Bloc', 'Séance bloc en salle', 2),
      session('s3', 'rest', 'Repos', 'Repos complet — récupération force', 3),
      session('s4', 'hangboard-force', 'Poutre — Max longues', 'Hypertrophie des avant-bras. Gains lents mais durables.', 4, ['max-long']),
    ],
  },
  {
    id: 'endurance-4',
    name: 'Endurance',
    description: 'Améliorez votre capacité à enchaîner. Continuité longue (aérobie) et courte (lactique) sur poutre.',
    goal: 'endurance',
    icon: '🌊',
    daysPerWeek: 4,
    totalWeeks: 10,
    sessions: [
      session('s1', 'route', 'Voie', 'Séance voie — travail volume', 1),
      session('s2', 'hangboard-endurance', 'Poutre — Continuité longue', 'Endurance aérobie, 3 tours de 10 séries. Après la grimpe.', 2, ['continuity-long']),
      session('s3', 'bouldering', 'Bloc', 'Séance bloc en salle', 3),
      session('s4', 'hangboard-endurance', 'Poutre — Continuité courte', 'Anaérobie lactique. Vous devez chuter en fin de séance.', 4, ['continuity-short']),
    ],
  },
  {
    id: 'complete-5',
    name: 'Complet',
    description: 'Programme équilibré : force, endurance et grimpe. Pour grimpeurs réguliers visant une progression globale.',
    goal: 'mixed',
    icon: '🎯',
    daysPerWeek: 5,
    totalWeeks: 8,
    sessions: [
      session('s1', 'hangboard-force', 'Poutre — Force', 'Max courtes ou intermittentes. Travaillez frais.', 1, ['max-short', 'intermittent']),
      session('s2', 'bouldering', 'Bloc', 'Séance bloc en salle', 2),
      session('s3', 'rest', 'Repos', 'Repos complet — récupération', 3),
      session('s4', 'hangboard-endurance', 'Poutre — Endurance', 'Continuité longue après un jour de repos.', 4, ['continuity-long']),
      session('s5', 'route', 'Voie', 'Séance voie — volume et technique', 5),
    ],
  },
];

export const getPlanTemplateById = (id: string) =>
  PLAN_TEMPLATES.find((p) => p.id === id);
