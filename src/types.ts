export type UserRole = 'athlete' | 'admin';

export type TestReason =
  | 'key_session'
  | 'feel_off'
  | 'race_prep'
  | 'coach_requested'
  | 'return_after_disruption';

export type PlannedSessionType =
  | 'recovery'
  | 'easy_aerobic'
  | 'long_endurance'
  | 'threshold'
  | 'vo2_high_intensity'
  | 'race_simulation'
  | 'technical_session'
  | 'group_ride_run'
  | 'race_event'
  | 'other';

export type SleepQuality = 'poor' | 'fair' | 'good' | 'excellent';

export type SorenessLevel = 'none' | 'mild' | 'moderate' | 'severe';

export type PerceivedFatigue = 'low' | 'moderate' | 'high' | 'very_high';

export type TrainingLoadStatus = 'normal' | 'high' | 'very_high';

export type HrvStatus = 'normal' | 'slightly_down' | 'clearly_down' | 'elevated' | 'unknown';

export type HrvTrendCategory =
  | 'stable'
  | 'mildly_suppressed'
  | 'clearly_suppressed'
  | 'mildly_elevated'
  | 'clearly_elevated'
  | 'insufficient_data';

export type HrvConfidence = 'high' | 'moderate' | 'low' | 'none';

export type HrvInterpretation =
  | 'recovery_context_supportive'
  | 'recovery_context_mildly_concerning'
  | 'recovery_context_concerning'
  | 'recovery_context_unclear'
  | 'recovery_context_caution_despite_elevation';

export type SessionCall =
  | 'ready_for_quality'
  | 'ready_with_guardrails'
  | 'better_suited_to_steady_work'
  | 'recovery_day_preferred';

export type RiskType = 'pacing' | 'fueling' | 'focus' | 'complexity' | 'recovery';

export type DomainStatus = 'green' | 'amber' | 'red';

export type SessionCompleted = 'completed_as_planned' | 'modified' | 'abandoned';

export type FuelingCompliance = 'hit' | 'missed';

export type PacingExecution = 'good' | 'poor';

export type RpeOutcome = 'easier' | 'as_expected' | 'harder';

export type HrDriftFlag = 'yes' | 'no' | 'unknown';

export type ExecutionQuality = 'good' | 'fair' | 'poor';

export type ReadinessCallMatched = 'yes' | 'partially' | 'no';

export type FlagType =
  | 'repeated_red_outcomes'
  | 'low_focus_poor_sleep'
  | 'readiness_mismatch'
  | 'missed_fueling_pattern'
  | 'red_cognition_hrv_down';

export type CoachPatternType =
  | 'stable_readiness'
  | 'mental_strain'
  | 'recovery_strain'
  | 'combined_strain'
  | 'execution_risk'
  | 'unclear_pattern';

export type CoachConfidenceLevel = 'high' | 'moderate' | 'low';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  timezone: string;
  onboarding_complete: boolean;
  baseline_sessions_count: number;
  shared_athlete_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: string;
  athlete_id: string;
  date: string;
  time_of_day: string | null;
  stroop_interference_ms: number | null;
  stroop_errors: number | null;
  switch_cost_ms: number | null;
  switch_errors: number | null;
  pvt_median_rt_ms: number | null;
  pvt_lapses: number | null;
  pvt_false_starts: number | null;
  sleep_hours: number | null;
  hard_training_24h: boolean | null;
  illness_symptoms: boolean | null;
  travel: boolean | null;
  is_baseline: boolean;
  test_quality_flag: boolean;
  created_at: string;
  test_reason: TestReason | null;
  planned_session_type: PlannedSessionType | null;
  sleep_quality: SleepQuality | null;
  soreness_level: SorenessLevel | null;
  perceived_fatigue: PerceivedFatigue | null;
  training_load_status: TrainingLoadStatus | null;
  hrv_7day_avg: number | null;
  hrv_status: HrvStatus | null;
  session_call: SessionCall | null;
  primary_risk: RiskType | null;
  secondary_risk: RiskType | null;
  action_1: string | null;
  action_2: string | null;
  what_changed_text: string | null;
  what_it_means_text: string | null;
  why_this_matters_text: string | null;
  control_status: DomainStatus | null;
  adapt_status: DomainStatus | null;
  focus_status: DomainStatus | null;
  actual_session_type: PlannedSessionType | null;
  session_completed: SessionCompleted | null;
  fueling_compliance: FuelingCompliance | null;
  pacing_execution: PacingExecution | null;
  rpe_outcome: RpeOutcome | null;
  athlete_note: string | null;
  athlete_outcome_at: string | null;
  hr_drift_flag: HrDriftFlag | null;
  execution_quality: ExecutionQuality | null;
  readiness_call_matched: ReadinessCallMatched | null;
  coach_note: string | null;
  coach_outcome_at: string | null;
  coach_outcome_by: string | null;
  hrv_entries_last_7d: number | null;
  hrv_baseline_avg: number | null;
  hrv_pct_diff_from_baseline: number | null;
  hrv_trend_category: HrvTrendCategory | null;
  hrv_confidence: HrvConfidence | null;
  hrv_interpretation: HrvInterpretation | null;
  hrv_supports_readiness: boolean | null;
  hrv_concerns_recovery: boolean | null;
  hrv_text_summary: string | null;
  coach_pattern_type: CoachPatternType | null;
  coach_insight_text: string | null;
  coach_discussion_prompt: string | null;
  coach_next_step: string | null;
  coach_why_it_matters: string | null;
  coach_confidence_level: CoachConfidenceLevel | null;
  coach_sleep_override_hours: number | null;
  coach_sleep_override_quality: SleepQuality | null;
  coach_hrv_override_category: HrvTrendCategory | null;
  coach_insight_generated_at: string | null;
}

export interface HrvHistoryEntry {
  id: string;
  athlete_id: string;
  date: string;
  hrv_value: number | null;
  hrv_status: HrvStatus;
  source_note: string | null;
  entered_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AthleteFlag {
  id: string;
  athlete_id: string;
  flag_type: FlagType;
  trigger_data: Record<string, unknown>;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
}

export interface TestResult {
  stroopInterferenceMs?: number;
  stroopErrors?: number;
  switchCostMs?: number;
  switchErrors?: number;
  pvtMedianRtMs?: number;
  pvtLapses?: number;
  pvtFalseStarts?: number;
}

export interface PreTestContext {
  testReason: TestReason;
  plannedSessionType: PlannedSessionType;
  sleepHours: number;
  sleepQuality: SleepQuality;
  sorenessLevel: SorenessLevel;
  illnessSymptoms: boolean;
  travel: boolean;
  perceivedFatigue: PerceivedFatigue;
  trainingLoadStatus: TrainingLoadStatus;
  hrvTracking: boolean;
  hrv7dayAvg: number | null;
  hrvStatus: HrvStatus | null;
}

export interface SessionContext {
  sleepHours?: number;
  hardTraining24h?: boolean;
  illnessSymptoms?: boolean;
  travel?: boolean;
}

export interface AthleteOutcome {
  sessionCompleted: SessionCompleted;
  fuelingCompliance: FuelingCompliance;
  pacingExecution: PacingExecution;
  rpeOutcome: RpeOutcome;
  athleteNote: string;
}

export interface CoachOutcome {
  hrDriftFlag: HrDriftFlag;
  executionQuality: ExecutionQuality;
  readinessCallMatched: ReadinessCallMatched;
  coachNote: string;
}

export interface HrvAnalysis {
  entriesLast7d: number;
  avg7day: number | null;
  baselineAvg: number | null;
  baselineStdDev: number | null;
  sdDiffFromBaseline: number | null;
  percentDiff: number | null;
  trendCategory: HrvTrendCategory;
  confidence: HrvConfidence;
  interpretation: HrvInterpretation;
  supportsReadiness: boolean;
  concernsRecovery: boolean;
  textSummary: string;
  athleteFacingTrend: string;
  athleteFacingMeaning: string;
  athleteFacingImpact: string;
  athleteFacingConfidence: string;
}

export interface SessionResult {
  sessionCall: SessionCall;
  primaryRisk: RiskType;
  secondaryRisk: RiskType | null;
  action1: string;
  action2: string | null;
  whatChangedText: string;
  whatItMeansText: string;
  whyThisMattersText: string;
  controlStatus: DomainStatus;
  adaptStatus: DomainStatus;
  focusStatus: DomainStatus;
  hrvAnalysis: HrvAnalysis | null;
  callConfidence: {
    level: 'high' | 'moderate' | 'low';
    reason: string;
  } | null;
}

export const TEST_REASON_LABELS: Record<TestReason, string> = {
  key_session: 'Before a key session',
  feel_off: 'Something feels off',
  race_prep: 'Race preparation',
  coach_requested: 'Coach requested',
  return_after_disruption: 'Returning after disruption',
};

export const PLANNED_SESSION_LABELS: Record<PlannedSessionType, string> = {
  recovery: 'Recovery',
  easy_aerobic: 'Easy aerobic',
  long_endurance: 'Long endurance',
  threshold: 'Threshold',
  vo2_high_intensity: 'VO2 / High intensity',
  race_simulation: 'Race simulation',
  technical_session: 'Technical session',
  group_ride_run: 'Group ride/run',
  race_event: 'Race event',
  other: 'Other',
};

export const SESSION_CALL_LABELS: Record<SessionCall, string> = {
  ready_for_quality: 'Ready for quality',
  ready_with_guardrails: 'Ready with guardrails',
  better_suited_to_steady_work: 'Better suited to steady work',
  recovery_day_preferred: 'Recovery day preferred',
};

export const RISK_TYPE_LABELS: Record<RiskType, string> = {
  pacing: 'Pacing',
  fueling: 'Fueling',
  focus: 'Focus',
  complexity: 'Complexity',
  recovery: 'Recovery',
};

export const FLAG_TYPE_LABELS: Record<FlagType, string> = {
  repeated_red_outcomes: '2+ red outcomes in 14 days',
  low_focus_poor_sleep: 'Repeated low focus with poor sleep',
  readiness_mismatch: 'Readiness warnings not matching outcomes',
  missed_fueling_pattern: 'Repeated missed fueling',
  red_cognition_hrv_down: 'Red cognition + HRV down pattern',
};

export const HRV_TREND_LABELS: Record<HrvTrendCategory, string> = {
  stable: 'Stable',
  mildly_suppressed: 'Mildly suppressed',
  clearly_suppressed: 'Clearly suppressed',
  mildly_elevated: 'Mildly elevated',
  clearly_elevated: 'Clearly elevated',
  insufficient_data: 'Insufficient data',
};

export const HRV_CONFIDENCE_LABELS: Record<HrvConfidence, string> = {
  high: 'High confidence',
  moderate: 'Moderate confidence',
  low: 'Low confidence',
  none: 'No confidence',
};

export const HRV_INTERPRETATION_LABELS: Record<HrvInterpretation, string> = {
  recovery_context_supportive: 'Recovery context supportive',
  recovery_context_mildly_concerning: 'Recovery context mildly concerning',
  recovery_context_concerning: 'Recovery context concerning',
  recovery_context_unclear: 'Recovery context unclear',
  recovery_context_caution_despite_elevation: 'Recovery context requires caution despite elevation',
};

export const COACH_PATTERN_LABELS: Record<CoachPatternType, string> = {
  stable_readiness: 'Stable Readiness',
  mental_strain: 'Mental Strain',
  recovery_strain: 'Recovery Strain',
  combined_strain: 'Combined Strain',
  execution_risk: 'Execution Risk',
  unclear_pattern: 'Unclear Pattern',
};

export const COACH_CONFIDENCE_LABELS: Record<CoachConfidenceLevel, string> = {
  high: 'High',
  moderate: 'Moderate',
  low: 'Low',
};

export interface AthleteHistoryIndicators {
  repeatedLowFocusWithShortSleep: boolean;
  repeatedFailedQualityOnLowReadiness: boolean;
  repeatedMissedFuelingOnLowControl: boolean;
  repeatedPoorExecutionWithSuppressedHrv: boolean;
  repeatedGoodExecutionDespiteMildFlags: boolean;
  similarPatternCount: number;
  enoughHistory: boolean;
}

export interface CoachInsightInput {
  controlStatus: DomainStatus | null;
  adaptStatus: DomainStatus | null;
  focusStatus: DomainStatus | null;
  overallStatus: DomainStatus | null;
  plannedSessionType: PlannedSessionType | null;
  testReason: TestReason | null;
  sleepHours: number | null;
  sleepQuality: SleepQuality | null;
  hrvTrendCategory: HrvTrendCategory | null;
  hrvConfidence: HrvConfidence | null;
  illnessFlag: boolean;
  travelFlag: boolean;
  sorenessLevel: SorenessLevel | null;
  perceivedFatigue: PerceivedFatigue | null;
  trainingLoadStatus: TrainingLoadStatus | null;
  sessionCall: SessionCall | null;
  primaryRisk: RiskType | null;
  secondaryRisk: RiskType | null;
  history: AthleteHistoryIndicators;
}

export interface CoachInsightOutput {
  patternType: CoachPatternType;
  insightText: string;
  discussionPrompt: string;
  nextStep: string;
  whyItMatters: string;
  confidence: CoachConfidenceLevel;
}
