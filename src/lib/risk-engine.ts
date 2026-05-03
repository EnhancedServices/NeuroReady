import type {
  RiskType,
  SessionCall,
  DomainStatus,
  SessionResult,
  PreTestContext,
  Session,
  HrvHistoryEntry,
  HrvAnalysis,
  HrvConfidence,
  AthleteHistoryIndicators,
} from '../types';
import { selectActions } from './actions';
import type { BatteryScore } from './scoring';
import { analyzeHrv, analyzeHrvFromStatus } from './hrv-engine';
import { analyzeAthleteHistory } from './athlete-history';
import {
  computeFullRiskScores,
  getOverallStatus,
  type SharedRiskContext,
} from './shared-risk';

function determineSessionCall(overallStatus: DomainStatus, recoveryRisk: number, illnessFlag: boolean): SessionCall {
  if (illnessFlag && (overallStatus === 'red' || recoveryRisk >= 4)) {
    return 'recovery_day_preferred';
  }

  if (overallStatus === 'red' && recoveryRisk >= 3) {
    return 'recovery_day_preferred';
  }

  if (overallStatus === 'red') {
    return 'better_suited_to_steady_work';
  }

  if (overallStatus === 'amber' && recoveryRisk >= 3) {
    return 'better_suited_to_steady_work';
  }

  if (overallStatus === 'amber') {
    return 'ready_with_guardrails';
  }

  if (overallStatus === 'green' && recoveryRisk >= 3) {
    return 'ready_with_guardrails';
  }

  return 'ready_for_quality';
}

function generateWhatChangedText(
  controlStatus: DomainStatus,
  adaptStatus: DomainStatus,
  focusStatus: DomainStatus
): string {
  const issues: string[] = [];

  if (controlStatus === 'red') {
    issues.push('impulse control is significantly reduced');
  } else if (controlStatus === 'amber') {
    issues.push('impulse control is slightly lower than normal');
  }

  if (adaptStatus === 'red') {
    issues.push('cognitive flexibility is significantly reduced');
  } else if (adaptStatus === 'amber') {
    issues.push('adaptability is slightly lower than normal');
  }

  if (focusStatus === 'red') {
    issues.push('attention and vigilance are significantly reduced');
  } else if (focusStatus === 'amber') {
    issues.push('focus is slightly lower than normal');
  }

  if (issues.length === 0) {
    return 'Your cognitive performance is tracking at baseline levels.';
  }

  if (issues.length === 1) {
    return `Today, ${issues[0]}.`;
  }

  return `Today, ${issues.slice(0, -1).join(', ')} and ${issues[issues.length - 1]}.`;
}

function generateWhatItMeansText(primaryRisk: RiskType, secondaryRisk: RiskType | null): string {
  const meanings: Record<RiskType, string> = {
    pacing: 'You may be more likely to make impulsive pacing decisions, especially in the first part of the session or during surges.',
    fueling: 'You may be more likely to miss fueling cues or delay intake, especially in longer or harder efforts.',
    focus: 'You may be more likely to miss environmental cues or have attention drift during the session.',
    complexity: 'You may find it harder to adapt to changing conditions or execute complex interval structures.',
    recovery: 'Your body and mind are showing signs that suggest prioritizing recovery over training stress.',
  };

  let text = meanings[primaryRisk];

  if (secondaryRisk && secondaryRisk !== primaryRisk) {
    const secondaryMeanings: Record<RiskType, string> = {
      pacing: 'Also watch for reactive pacing.',
      fueling: 'Also stay ahead of fueling.',
      focus: 'Also set regular attention check-ins.',
      complexity: 'Also keep the session structure simple.',
      recovery: '',
    };
    const secondary = secondaryMeanings[secondaryRisk];
    if (secondary) {
      text += ' ' + secondary;
    }
  }

  return text;
}

function generateWhyThisMattersText(primaryRisk: RiskType): string {
  const generic: Record<RiskType, string> = {
    pacing: 'Research shows that impaired inhibitory control is linked to poor pacing decisions, especially early in exercise.',
    fueling: 'Studies show that cognitive fatigue reduces awareness of internal cues, making fueling timing errors more likely.',
    focus: 'Reduced vigilance increases the risk of missed cues and reactive errors during training.',
    complexity: 'Lower cognitive flexibility makes it harder to adjust plans mid-session without execution breakdown.',
    recovery: 'When multiple systems are stressed, forcing training intensity often leads to poor adaptation and injury risk.',
  };

  return generic[primaryRisk];
}

function computeSessionCallConfidence(
  baselineSessionCount: number,
  hrvConfidence: HrvConfidence | null,
  hasOutcomeHistory: boolean,
  dataCompleteness: number
): { level: 'high' | 'moderate' | 'low'; reason: string } {
  let score = 0;
  const gaps: string[] = [];

  if (baselineSessionCount >= 7) {
    score += 3;
  } else if (baselineSessionCount >= 5) {
    score += 2;
  } else if (baselineSessionCount >= 3) {
    score += 1;
  } else {
    gaps.push('thin baseline');
  }

  if (hrvConfidence === 'high') {
    score += 2;
  } else if (hrvConfidence === 'moderate') {
    score += 1;
  } else if (!hrvConfidence || hrvConfidence === 'none' || hrvConfidence === 'low') {
    gaps.push('limited HRV data');
  }

  if (hasOutcomeHistory) {
    score += 1;
  }

  if (dataCompleteness >= 0.9) {
    score += 1;
  } else {
    gaps.push('incomplete context');
  }

  let level: 'high' | 'moderate' | 'low';
  if (score >= 5) {
    level = 'high';
  } else if (score >= 3) {
    level = 'moderate';
  } else {
    level = 'low';
  }

  const reason = gaps.length > 0
    ? `Confidence limited by: ${gaps.join(', ')}.`
    : 'Sufficient baseline, HRV data, and context available.';

  return { level, reason };
}

export function generateSessionResult(
  batteryScore: BatteryScore,
  preTestContext: PreTestContext,
  historicalPatterns: AthleteHistoryIndicators,
  hrvHistory: HrvHistoryEntry[],
  allSessions: Session[]
): SessionResult {
  const controlStatus = batteryScore.tests.find(t => t.name === 'stroop')?.light || 'green';
  const adaptStatus = batteryScore.tests.find(t => t.name === 'taskSwitch')?.light || 'green';
  const focusStatus = batteryScore.tests.find(t => t.name === 'pvt3')?.light || 'green';
  const overallStatus = getOverallStatus(controlStatus, adaptStatus, focusStatus);

  const hrvContext = {
    sleepQuality: preTestContext.sleepQuality,
    sleepHours: preTestContext.sleepHours,
    perceivedFatigue: preTestContext.perceivedFatigue,
    illnessSymptoms: preTestContext.illnessSymptoms,
    travel: preTestContext.travel,
    controlStatus,
    adaptStatus,
    focusStatus,
    recentExecutionIssues: historicalPatterns.repeatedPoorExecutionWithSuppressedHrv,
  };

  let hrvAnalysis: HrvAnalysis | null = null;

  if (hrvHistory.length > 0) {
    hrvAnalysis = analyzeHrv(hrvHistory, hrvContext);
  } else if (preTestContext.hrvStatus && preTestContext.hrvStatus !== 'unknown') {
    hrvAnalysis = analyzeHrvFromStatus(preTestContext.hrvStatus, hrvContext);
  }

  const hrvTrendCategory = hrvAnalysis?.trendCategory || null;
  const hrvConfidence = hrvAnalysis?.confidence || null;

  const riskCtx: SharedRiskContext = {
    controlStatus,
    adaptStatus,
    focusStatus,
    overallStatus,
    plannedSessionType: preTestContext.plannedSessionType,
    sleepHours: preTestContext.sleepHours,
    sleepQuality: preTestContext.sleepQuality,
    sorenessLevel: preTestContext.sorenessLevel,
    perceivedFatigue: preTestContext.perceivedFatigue,
    trainingLoadStatus: preTestContext.trainingLoadStatus,
    hrvTrendCategory,
    hrvConfidence,
    illnessFlag: preTestContext.illnessSymptoms,
    travelFlag: preTestContext.travel,
    history: historicalPatterns,
  };

  const { scores, primaryRisk, secondaryRisk } = computeFullRiskScores(riskCtx);

  const sessionCall = determineSessionCall(overallStatus, scores.recovery, preTestContext.illnessSymptoms);

  const { action1, action2 } = selectActions({
    primaryRisk,
    secondaryRisk,
    plannedSessionType: preTestContext.plannedSessionType,
    controlStatus,
    adaptStatus,
    focusStatus,
    sessionCall,
  });

  const whatChangedText = generateWhatChangedText(controlStatus, adaptStatus, focusStatus);
  const whatItMeansText = generateWhatItMeansText(primaryRisk, secondaryRisk);
  const whyThisMattersText = generateWhyThisMattersText(primaryRisk);

  const contextFields = [
    preTestContext.sleepHours,
    preTestContext.sleepQuality,
    preTestContext.sorenessLevel,
    preTestContext.perceivedFatigue,
    preTestContext.trainingLoadStatus,
    preTestContext.plannedSessionType,
  ];
  const filledFields = contextFields.filter(v => v !== null && v !== undefined).length;
  const dataCompleteness = filledFields / contextFields.length;

  const hasOutcomeHistory = allSessions.filter(s => s.session_completed !== null).length >= 3;

  const callConfidence = computeSessionCallConfidence(
    allSessions.filter(s => s.is_baseline).length,
    hrvConfidence,
    hasOutcomeHistory,
    dataCompleteness
  );

  return {
    sessionCall,
    primaryRisk,
    secondaryRisk,
    action1,
    action2,
    whatChangedText,
    whatItMeansText,
    whyThisMattersText,
    controlStatus,
    adaptStatus,
    focusStatus,
    hrvAnalysis,
    callConfidence,
  };
}

export function analyzeHistoricalPatterns(sessions: Session[]): AthleteHistoryIndicators {
  return analyzeAthleteHistory(sessions);
}
