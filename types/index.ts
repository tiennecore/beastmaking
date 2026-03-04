export type ProtocolFamily = 'force' | 'continuity' | 'pullups';
export type EnergySystem = 'alactic' | 'lactic' | 'aerobic';
export type GripType = 'open3' | 'open4' | 'halfCrimp' | 'fullCrimp' | 'fullCrimpThumb';
export type TimerPhase = 'idle' | 'prep' | 'hang' | 'restRep' | 'restSet' | 'restRound' | 'done';

export type TimerConfig = {
  hangDuration: number;
  restBetweenReps: number;
  reps: number;
  sets: number;
  restBetweenSets: number;
  rounds?: number;
  restBetweenRounds?: number;
};

export type Protocol = {
  id: string;
  name: string;
  family: ProtocolFamily;
  energySystem: EnergySystem;
  icon: string;
  summary: string;
  defaults: TimerConfig;
  loadAdvice: string;
  recoveryAdvice: string;
  frequencyAdvice: string;
};

export type GripInfo = {
  id: GripType;
  name: string;
  type: 'passive' | 'semi-active' | 'active' | 'very-active';
  description: string;
  keyPoints: string;
  warning?: string;
};

export type SessionConfig = {
  protocol: Protocol;
  grips: GripType[];
  timerConfig: TimerConfig;
};

export type SessionResult = {
  protocol: Protocol;
  grips: GripType[];
  config: TimerConfig;
  completedSets: number;
  completedRounds: number;
  totalDuration: number;
  completed: boolean;
};
