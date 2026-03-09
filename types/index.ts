export type ProtocolFamily = 'force' | 'continuity' | 'pullups';
export type EnergySystem = 'alactic' | 'lactic' | 'aerobic';
export type GripType = 'open3' | 'open4' | 'halfCrimp' | 'fullCrimp' | 'fullCrimpThumb' | 'climbingHolds' | 'normalHands';
export type TimerPhase = 'idle' | 'prep' | 'hang' | 'restRep' | 'restSet' | 'restRound' | 'done';
export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

export type TimerConfig = {
  prepDuration: number;
  hangDuration: number;
  restBetweenReps: number;
  reps: number;
  sets: number;
  restBetweenSets: number;
  rounds?: number;
  restBetweenRounds?: number;
  loadKg?: number;
  phaseColors?: Record<string, string>;
};

export type Protocol = {
  id: string;
  name: string;
  family: ProtocolFamily;
  energySystem: EnergySystem;
  icon: string;
  summary: string;
  description: string;
  difficulty: Difficulty;
  progressionTips: string[];
  targetedQualities: string[];
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

// --- History ---

export type SessionHistoryEntry = {
  id: string;
  date: string; // ISO string
  result: SessionResult;
  customWorkoutId?: string;
};

// --- Custom Workouts ---

export type WorkoutStep =
  | { type: 'protocol'; protocolId: string; config: TimerConfig; grips: GripType[] }
  | { type: 'free'; name: string; config: TimerConfig };

export type CustomWorkout = {
  id: string;
  name: string;
  icon: string;
  steps: WorkoutStep[];
  createdAt: string;
};

// --- Climbing Log ---

export type ClimbingType = 'bloc' | 'voie' | 'renfo';
export type EffortType = 'aerobic' | 'force' | 'resistance' | 'power' | 'technique';
export type DifficultyLevel = 'easy' | 'medium' | 'hard' | 'max';

export type ClimbingSession = {
  id: string;
  date: string;
  type: ClimbingType;
  effortType: EffortType;
  difficulty: DifficultyLevel;
  // Optional details
  routeCount?: number;
  grades?: string;
  duration?: number; // minutes
  notes?: string;
};

// Training Plans
export type PlanSessionType =
  | 'hangboard-force'
  | 'hangboard-endurance'
  | 'hangboard-pullups'
  | 'bouldering'
  | 'route'
  | 'strength'
  | 'rest'
  | 'active-recovery';

export type PlanGoal = 'force' | 'endurance' | 'mixed' | 'beginner';

export type PlannedSession = {
  id: string;
  type: PlanSessionType;
  label: string;
  description: string;
  protocolIds?: string[];
  order: number;
};

export type TrainingPlanTemplate = {
  id: string;
  name: string;
  description: string;
  goal: PlanGoal;
  icon: string;
  daysPerWeek: number;
  totalWeeks: number;
  sessions: PlannedSession[];
};

export type SessionCompletion = {
  sessionId: string;
  completed: boolean;
  skipped: boolean;
  completedAt?: string;
  durationMinutes?: number;
};

export type WeekHistory = {
  weekNumber: number;
  startDate: string;
  completions: SessionCompletion[];
};

export type ActivePlan = {
  id: string;
  plan: TrainingPlanTemplate;
  currentWeek: number;
  startDate: string;
  weekHistory: WeekHistory[];
};
