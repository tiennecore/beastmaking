import { TimerPhase } from '@/types';

export const PHASE_COLORS: Record<TimerPhase, string> = {
  idle: '#1a1a1a',
  prep: '#EAB308',
  hang: '#DC2626',
  restRep: '#2563EB',
  restSet: '#9333EA',
  restRound: '#16A34A',
  done: '#1a1a1a',
};

export const PHASE_LABELS: Record<TimerPhase, string> = {
  idle: '',
  prep: 'PRÊT',
  hang: 'SUSPENDU',
  restRep: 'REPOS',
  restSet: 'REPOS SÉRIE',
  restRound: 'REPOS TOUR',
  done: 'TERMINÉ',
};
