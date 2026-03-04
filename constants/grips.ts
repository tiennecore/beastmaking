import { GripInfo } from '@/types';

export const GRIPS: GripInfo[] = [
  {
    id: 'open3',
    name: 'Tendu 3 doigts',
    type: 'passive',
    description: 'Flexion IPD, frottement des coussinets. Grande allonge.',
    keyPoints: 'Efficace sur à-plats. Moins utile en dévers.',
  },
  {
    id: 'open4',
    name: 'Tendu 4 doigts',
    type: 'passive',
    description: 'Index droit, 2 doigts centraux fléchis, auriculaire tendu.',
    keyPoints: 'Bonne pour réglettes. Mobilité poignet limitée.',
  },
  {
    id: 'halfCrimp',
    name: 'Semi-arqué',
    type: 'semi-active',
    description: 'Au moins 2 premières phalanges fléchies.',
    keyPoints: 'La plus courante. Polyvalente, bonne liberté de mouvement.',
  },
  {
    id: 'fullCrimp',
    name: 'Arqué',
    type: 'active',
    description: 'Toutes articulations IPP à angle droit + pouce.',
    keyPoints: "Puissante, contrôle maximal. S'apprend progressivement.",
    warning: 'Position agressive. À apprendre en 3 étapes (voir bibliothèque).',
  },
  {
    id: 'fullCrimpThumb',
    name: 'Arqué + verrou du pouce',
    type: 'very-active',
    description: "Arqué avec le pouce qui couvre l'index.",
    keyPoints: 'La plus agressive. Forte charge sur les articulations.',
    warning: 'À limiter. Risque articulaire élevé si mal maîtrisé.',
  },
];

export const getGripById = (id: string): GripInfo | undefined =>
  GRIPS.find((g) => g.id === id);

export const MAX_GRIPS_PER_SESSION = 3;
