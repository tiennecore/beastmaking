import { BoulderColor, ClimbEntry, ClimbingSession, ClimbingType, DifficultyLevel, EffortIntensity, VoieMode } from '@/types';
import { DEFAULT_GRADE } from '@/constants/grades';

export const CLIMBING_TYPES: { value: ClimbingType; label: string }[] = [
  { value: 'bloc', label: 'Bloc' },
  { value: 'voie', label: 'Voie' },
];

export const VOIE_MODES: { value: VoieMode; label: string }[] = [
  { value: 'libre', label: 'Libre' },
  { value: 'continuity-long', label: 'Continuité longue' },
  { value: 'continuity-short', label: 'Continuité courte' },
];

export const EFFORT_INTENSITIES: { value: EffortIntensity; label: string }[] = [
  { value: 'easy', label: 'Facile' },
  { value: 'correct', label: 'Correct' },
  { value: 'hard', label: 'Dur' },
];

export const DIFFICULTY_LEVELS: { value: DifficultyLevel; label: string }[] = [
  { value: 'easy', label: 'Facile' },
  { value: 'medium', label: 'Moyen' },
  { value: 'hard', label: 'Dur' },
  { value: 'max', label: 'Max' },
];

export const TYPE_COLORS: Record<ClimbingType, string> = {
  bloc: '#F97316',
  voie: '#2563EB',
};

export const DIFFICULTY_LABELS: Record<DifficultyLevel, string> = {
  easy: 'Facile',
  medium: 'Moyen',
  hard: 'Dur',
  max: 'Max',
};

export const BOULDER_COLORS: { value: BoulderColor; label: string; hex: string }[] = [
  { value: 'yellow', label: 'Jaune', hex: '#EAB308' },
  { value: 'green', label: 'Vert', hex: '#22C55E' },
  { value: 'blue', label: 'Bleu', hex: '#3B82F6' },
  { value: 'pink', label: 'Rose', hex: '#EC4899' },
  { value: 'red', label: 'Rouge', hex: '#EF4444' },
  { value: 'black', label: 'Noir', hex: '#1C1917' },
  { value: 'violet', label: 'Violet', hex: '#8B5CF6' },
];

export function todayIso(): string {
  return new Date().toISOString().split('T')[0];
}

export function formatClimbingDate(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function isoToDate(iso: string): Date {
  return new Date(iso + 'T12:00:00');
}

export function dateToIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function extractUniqueLocations(sessions: ClimbingSession[]): string[] {
  return [...new Set(sessions.filter((s) => s.location).map((s) => s.location!))];
}

export function newClimbEntry(defaultGrade?: string): ClimbEntry {
  return {
    id: Date.now().toString() + Math.random().toString(36).slice(2),
    ...(defaultGrade ? { grade: defaultGrade } : {}),
  };
}

export function formatDuration(seconds: number): string {
  const total = Math.round(seconds);
  const min = Math.floor(total / 60);
  const sec = total % 60;
  if (min === 0) return `${sec}s`;
  return sec > 0 ? `${min}min ${sec}s` : `${min}min`;
}
