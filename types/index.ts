export type ProtocolFamily = 'force' | 'continuity' | 'pullups';
export type EnergySystem = 'alactic' | 'lactic' | 'aerobic';
export type GripType = 'open1' | 'open2' | 'open3' | 'open4' | 'halfCrimp' | 'fullCrimp' | 'fullCrimpThumb' | 'climbingHolds' | 'normalHands';
export type HoldType = 'flat' | 'crimp20' | 'crimp15' | 'crimp10' | 'crimp5' | 'round';

export type GripConfig = {
  grip: GripType;
  hold: HoldType;
  loadKg: number;
  angleDeg: number;
};

export type GripMode = 'session' | 'perSet';

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
  phaseColors?: Record<string, string>;
};

export type UsageGuideSection = {
  title: string;
  content: string;
};

export type InfoNotes = {
  sets?: string;
  restBetweenSets?: string;
  hangDuration?: string;
};

export type GripRecommendation = {
  mode: GripMode;
  description: string;
  defaultGrips?: GripType[];
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
  usageGuide?: UsageGuideSection[];
  gripRecommendation?: GripRecommendation;
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
  gripMode: GripMode;
  gripConfigs: GripConfig[];
  timerConfig: TimerConfig;
};

export type SessionResult = {
  protocol: Protocol;
  gripMode: GripMode;
  gripConfigs: GripConfig[];
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
  | { type: 'protocol'; protocolId: string; config: TimerConfig; gripMode: GripMode; gripConfigs: GripConfig[] }
  | { type: 'free'; name: string; config: TimerConfig; gripMode: GripMode; gripConfigs: GripConfig[] };

export type CustomWorkout = {
  id: string;
  name: string;
  icon: string;
  steps: WorkoutStep[];
  createdAt: string;
};

// --- Climbing Log ---

export type ClimbingType = 'bloc' | 'voie';
export type VoieMode = 'libre' | 'continuity-long' | 'continuity-short';
export type EffortIntensity = 'easy' | 'correct' | 'hard';
export type DifficultyLevel = 'easy' | 'medium' | 'hard' | 'max';
export type BoulderColor = 'yellow' | 'green' | 'blue' | 'pink' | 'red' | 'black' | 'violet';

export type ClimbEntry = {
  id: string;
  name?: string;
  grade?: string;
  color?: BoulderColor;
  success?: boolean;
  attempts?: number;
};

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

export type ClimbingSession = {
  id: string;
  date: string;
  type: ClimbingType;
  voieMode?: VoieMode;
  difficulty?: DifficultyLevel;
  location?: string;
  // Global details (exclusive with entries)
  routeCount?: number;
  grades?: string;
  duration?: number; // minutes
  notes?: string;
  // Route-by-route details (exclusive with global)
  entries?: ClimbEntry[];
  // Continuity-long fields
  rounds?: number;
  effortPerRound?: number; // minutes
  restBetweenRounds?: number; // minutes
  intensity?: EffortIntensity;
  // Continuity-short fields
  setsPerRound?: number;
  effortPerSet?: number; // seconds
  restBetweenSets?: number; // minutes
  fellFromRound?: number;
  roundDetails?: RoundDetail[];
};

// Training Plans
export type SessionMode = 'climbing' | 'climbing-exercise' | 'exercise';
export type ExerciseTiming = 'before' | 'after';
export type ClimbingActivity = 'bouldering' | 'route';

export type PlanGoal = 'force' | 'endurance' | 'mixed' | 'beginner';

export type PlannedSession = {
  id: string;
  mode: SessionMode;
  label: string;
  description: string;
  order: number;
  climbingActivity?: ClimbingActivity;
  protocolIds?: string[];
  exerciseTiming?: ExerciseTiming;
  restAfterHours?: number;
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
  progress?: number; // 0=not started, 1=partial (climbing-exercise), 2=done
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

// --- Journal ---

export type JournalFilter = 'all' | 'hangboard' | 'bloc' | 'voie';

export type JournalEntry =
  | { type: 'hangboard'; data: SessionHistoryEntry }
  | { type: 'climbing'; data: ClimbingSession };

export type GroupedJournalDay = {
  dateKey: string; // YYYY-MM-DD
  label: string;   // "Lundi 10 mars"
  entries: JournalEntry[];
};

export type JournalStats = {
  sessionsThisWeek: number;
  sessionsLastWeek: number;
  weekTrend: number;
  hangboardThisMonth: number;
  blocThisMonth: number;
  voieThisMonth: number;
  totalHangTimeWeek: number;
  successRate: number;
  averageGrade: string | null;
};
