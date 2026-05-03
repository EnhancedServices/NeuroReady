import type {
  RiskType,
  DomainStatus,
  PlannedSessionType,
  HrvTrendCategory,
  HrvConfidence,
  SleepQuality,
  SorenessLevel,
  PerceivedFatigue,
  TrainingLoadStatus,
  AthleteHistoryIndicators,
} from '../types';

export interface RiskScores {
  pacing: number;
  fueling: number;
  focus: number;
  complexity: number;
  recovery: number;
}

export interface SharedRiskContext {
  controlStatus: DomainStatus | null;
  adaptStatus: DomainStatus | null;
  focusStatus: DomainStatus | null;
  overallStatus: DomainStatus | null;
  plannedSessionType: PlannedSessionType | null;
  sleepHours: number | null;
  sleepQuality: SleepQuality | null;
  sorenessLevel: SorenessLevel | null;
  perceivedFatigue: PerceivedFatigue | null;
  trainingLoadStatus: TrainingLoadStatus | null;
  hrvTrendCategory: HrvTrendCategory | null;
  hrvConfidence: HrvConfidence | null;
  illnessFlag: boolean;
  travelFlag: boolean;
  history: AthleteHistoryIndicators;
}

export function createEmptyScores(): RiskScores {
  return { pacing: 0, fueling: 0, focus: 0, complexity: 0, recovery: 0 };
}

export function calculateCognitiveRiskScores(ctx: SharedRiskContext): RiskScores {
  const scores = createEmptyScores();

  if (ctx.controlStatus === 'amber') {
    scores.pacing += 2;
    scores.fueling += 1;
  } else if (ctx.controlStatus === 'red') {
    scores.pacing += 3;
    scores.fueling += 2;
  }

  if (ctx.adaptStatus === 'amber') {
    scores.complexity += 2;
  } else if (ctx.adaptStatus === 'red') {
    scores.complexity += 3;
  }

  if (ctx.focusStatus === 'amber') {
    scores.focus += 2;
    scores.fueling += 1;
  } else if (ctx.focusStatus === 'red') {
    scores.focus += 3;
    scores.fueling += 2;
  }

  return scores;
}

export function applySessionTypeModifiers(scores: RiskScores, sessionType: PlannedSessionType | null): void {
  if (!sessionType) return;

  const highIntensityTypes: PlannedSessionType[] = ['threshold', 'vo2_high_intensity', 'race_simulation', 'race_event'];
  const technicalGroupTypes: PlannedSessionType[] = ['technical_session', 'group_ride_run'];
  const complexTypes: PlannedSessionType[] = ['race_simulation', 'technical_session', 'group_ride_run', 'vo2_high_intensity'];
  const fuelingCriticalTypes: PlannedSessionType[] = ['long_endurance', 'threshold', 'vo2_high_intensity', 'race_event', 'race_simulation'];

  if (highIntensityTypes.includes(sessionType)) {
    scores.pacing += 1;
    scores.recovery += 1;
  }

  if (technicalGroupTypes.includes(sessionType)) {
    scores.focus += 1;
    scores.pacing += 1;
  }

  if (complexTypes.includes(sessionType)) {
    scores.complexity += 1;
  }

  if (fuelingCriticalTypes.includes(sessionType)) {
    scores.fueling += 1;
  }
}

export function calculateSleepConcern(sleepHours: number | null, sleepQuality: SleepQuality | null): number {
  let concern = 0;

  if (sleepHours !== null) {
    if (sleepHours < 6) concern += 2;
    else if (sleepHours < 7) concern += 1;
  }

  if (sleepQuality === 'poor') concern += 2;
  else if (sleepQuality === 'fair') concern += 1;

  return concern;
}

export function calculateHrvConcernAndSupport(
  trendCategory: HrvTrendCategory | null,
  confidence: HrvConfidence | null
): { concern: number; support: number } {
  let concern = 0;
  let support = 0;

  if (!trendCategory || trendCategory === 'insufficient_data') {
    return { concern: 0, support: 0 };
  }

  const lowConfidence = confidence === 'none' || confidence === 'low';

  if (lowConfidence) {
    if (trendCategory === 'clearly_suppressed') concern += 1;
    else if (trendCategory === 'mildly_suppressed') concern += 0.5;
    else if (trendCategory === 'stable') support += 0.5;
  } else {
    if (trendCategory === 'clearly_suppressed') concern += 2;
    else if (trendCategory === 'mildly_suppressed') concern += 1;
    else if (trendCategory === 'stable') support += 1;
    else if (trendCategory === 'mildly_elevated') support += 0.5;
    else if (trendCategory === 'clearly_elevated') support += 0.5;
  }

  return { concern, support };
}

export function applyRecoveryContextModifiers(
  scores: RiskScores,
  ctx: SharedRiskContext,
  sleepConcern: number,
  hrvConcern: number,
  hrvSupport: number
): void {
  if (ctx.illnessFlag) scores.recovery += 3;
  if (ctx.travelFlag) scores.focus += 1;

  if (ctx.sorenessLevel === 'severe') scores.recovery += 1;

  if (ctx.perceivedFatigue === 'very_high') scores.recovery += 2;
  else if (ctx.perceivedFatigue === 'high') scores.recovery += 2;
  else if (ctx.perceivedFatigue === 'moderate') scores.recovery += 1;

  if (ctx.trainingLoadStatus === 'very_high') scores.recovery += 2;
  else if (ctx.trainingLoadStatus === 'high') scores.recovery += 1;

  scores.recovery += sleepConcern;
  scores.recovery += hrvConcern;
  scores.recovery -= hrvSupport;
}

export function applyHistoryModifiers(scores: RiskScores, ctx: SharedRiskContext): void {
  const { history } = ctx;

  if (history.repeatedLowFocusWithShortSleep && ctx.focusStatus !== 'green') {
    scores.focus += 1;
    scores.recovery += 1;
  }

  if (history.repeatedFailedQualityOnLowReadiness && ctx.overallStatus !== 'green') {
    scores.recovery += 1;
    scores.pacing += 1;
  }

  if (history.repeatedMissedFuelingOnLowControl && ctx.controlStatus !== 'green') {
    scores.fueling += 2;
  }

  const hrvSuppressed = ctx.hrvTrendCategory === 'mildly_suppressed' || ctx.hrvTrendCategory === 'clearly_suppressed';
  if (history.repeatedPoorExecutionWithSuppressedHrv && hrvSuppressed) {
    scores.recovery += 1;
  }
}

export function rankRisks(scores: RiskScores): { type: RiskType; score: number }[] {
  const riskList: { type: RiskType; score: number }[] = [
    { type: 'pacing', score: scores.pacing },
    { type: 'fueling', score: scores.fueling },
    { type: 'focus', score: scores.focus },
    { type: 'complexity', score: scores.complexity },
    { type: 'recovery', score: scores.recovery },
  ];

  return riskList.sort((a, b) => b.score - a.score);
}

export function getOverallStatus(
  controlStatus: DomainStatus | null,
  adaptStatus: DomainStatus | null,
  focusStatus: DomainStatus | null
): DomainStatus {
  if (controlStatus === 'red' || adaptStatus === 'red' || focusStatus === 'red') {
    return 'red';
  }
  if (controlStatus === 'amber' || adaptStatus === 'amber' || focusStatus === 'amber') {
    return 'amber';
  }
  return 'green';
}

export function computeFullRiskScores(ctx: SharedRiskContext): {
  scores: RiskScores;
  sleepConcern: number;
  hrvConcern: number;
  hrvSupport: number;
  ranked: { type: RiskType; score: number }[];
  primaryRisk: RiskType;
  secondaryRisk: RiskType | null;
} {
  const scores = calculateCognitiveRiskScores(ctx);
  applySessionTypeModifiers(scores, ctx.plannedSessionType);

  const sleepConcern = calculateSleepConcern(ctx.sleepHours, ctx.sleepQuality);
  const { concern: hrvConcern, support: hrvSupport } = calculateHrvConcernAndSupport(
    ctx.hrvTrendCategory,
    ctx.hrvConfidence
  );

  applyRecoveryContextModifiers(scores, ctx, sleepConcern, hrvConcern, hrvSupport);
  applyHistoryModifiers(scores, ctx);

  const ranked = rankRisks(scores);
  const primaryRisk = ranked[0].type;
  const secondaryRisk = ranked[1].score > 0 ? ranked[1].type : null;

  return { scores, sleepConcern, hrvConcern, hrvSupport, ranked, primaryRisk, secondaryRisk };
}
