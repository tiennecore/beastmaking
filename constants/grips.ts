import { GripInfo, HoldType, GripConfig } from '@/types';

export const GRIPS: GripInfo[] = [
  {
    id: 'open1',
    name: 'Tendu 1 doigt',
    type: 'passive',
    description: 'Un seul doigt en extension, charge maximale sur un seul tendon.',
    keyPoints: 'Exercice avancé. Utile pour rééquilibrer la force digitale.',
    warning: 'Très agressif. Réservé aux grimpeurs expérimentés.',
  },
  {
    id: 'open2',
    name: 'Tendu 2 doigts',
    type: 'passive',
    description: 'Deux doigts en extension, souvent majeur + annulaire.',
    keyPoints: 'Renforce les doigts faibles. Progression avant open3.',
    warning: 'Charge élevée par doigt. Progresser avec prudence.',
  },
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
  {
    id: 'climbingHolds',
    name: 'Prises d\'escalade',
    type: 'passive',
    description: 'Entraînement sur prises de mur plutôt que sur poutre.',
    keyPoints: 'Idéal pour varier les stimuli et simuler les conditions réelles.',
  },
  {
    id: 'normalHands',
    name: 'Mains normales',
    type: 'passive',
    description: 'Prise à pleines mains, sans position de doigts spécifique.',
    keyPoints: 'Adapté aux débutants ou pour le travail de force globale.',
  },
];

export const getGripById = (id: string): GripInfo | undefined =>
  GRIPS.find((g) => g.id === id);

export type HoldInfo = {
  id: HoldType;
  name: string;
  shortName: string;
};

export const HOLDS: HoldInfo[] = [
  { id: 'flat', name: 'Plat', shortName: 'Plat' },
  { id: 'crimp20', name: 'Réglette 20mm', shortName: '20mm' },
  { id: 'crimp15', name: 'Réglette 15mm', shortName: '15mm' },
  { id: 'crimp10', name: 'Réglette 10mm', shortName: '10mm' },
  { id: 'crimp5', name: 'Réglette 5mm', shortName: '5mm' },
  { id: 'round', name: 'Prise ronde', shortName: 'Ronde' },
];

export function getHoldById(id: HoldType): HoldInfo | undefined {
  return HOLDS.find(h => h.id === id);
}

export const ANGLES = [0, 5, 10, 15, 20, 25, 30] as const;
export type AngleDeg = (typeof ANGLES)[number];

export function formatGripConfig(gc: GripConfig): string {
  const grip = getGripById(gc.grip);
  const hold = getHoldById(gc.hold);
  const parts = [grip?.name, hold?.name];
  if (gc.angleDeg > 0) parts.push(`${gc.angleDeg}°`);
  if (gc.loadKg > 0) parts.push(`+${gc.loadKg}kg`);
  if (gc.loadKg < 0) parts.push(`${gc.loadKg}kg`);
  return parts.filter(Boolean).join(' · ');
}

export const MAX_GRIPS_PER_SESSION = 3;
