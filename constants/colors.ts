import { TimerPhase } from '@/types';

export const PHASE_COLORS: Record<TimerPhase, string> = {
  idle: '#1C1917',      // stone-950
  prep: '#FBBF24',      // amber-400
  hang: '#F97316',      // orange-500 (Beastmaker signature)
  restRep: '#22D3EE',   // cyan-400
  restSet: '#818CF8',   // indigo-400
  restRound: '#A3E635', // lime-400
  done: '#1C1917',      // stone-950
};

export const PHASE_LABELS: Record<TimerPhase, string> = {
  idle: '',
  prep: 'PRET',
  hang: 'SUSPENDU',
  restRep: 'REPOS',
  restSet: 'REPOS SERIE',
  restRound: 'REPOS TOUR',
  done: 'TERMINE',
};

export const COLOR_PALETTE = [
  '#F97316', // orange (accent)
  '#FBBF24', // amber
  '#A3E635', // lime
  '#22D3EE', // cyan
  '#818CF8', // indigo
  '#EC4899', // pink
  '#EF4444', // red
  '#06B6D4', // teal
  '#8B5CF6', // violet
  '#78716C', // stone
];
