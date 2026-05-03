import type {
  CoachInsightInput,
  CoachInsightOutput,
  CoachPatternType,
  CoachConfidenceLevel,
  DomainStatus,
  PlannedSessionType,
  RiskType,
  HrvTrendCategory,
  HrvConfidence,
  SleepQuality,
  SorenessLevel,
  PerceivedFatigue,
  TrainingLoadStatus,
  SessionCall,
} from '../types';
import {
  computeFullRiskScores,
  calculateSleepConcern,
  calculateHrvConcernAndSupport,
  type SharedRiskContext,
  type RiskScores,
} from './shared-risk';

function determinePatternType(
  input: CoachInsightInput,
  sleepConcern: number,
  hrvConcern: number,
  scores: RiskScores
): CoachPatternType {
  const cognitionDown = input.overallStatus !== 'green' && input.overallStatus !== null;

  const recoveryDown =
    sleepConcern >= 2 ||
    hrvConcern >= 1 ||
    input.illnessFlag ||
    input.perceivedFatigue === 'high' ||
    input.perceivedFatigue === 'very_high' ||
    input.trainingLoadStatus === 'very_high';

  let patternType: CoachPatternType;

  if (!cognitionDown && !recoveryDown) {
    patternType = 'stable_readiness';
  } else if (cognitionDown && !recoveryDown) {
    patternType = 'mental_strain';
  } else if (!cognitionDown && recoveryDown) {
    patternType = 'recovery_strain';
  } else if (cognitionDown && recoveryDown) {
    patternType = 'combined_strain';
  } else {
    patternType = 'unclear_pattern';
  }

  const hasAnyCognitiveImpairment =
    input.controlStatus !== 'green' ||
    input.adaptStatus !== 'green' ||
    input.focusStatus !== 'green';

  const demandingSessionTypes: PlannedSessionType[] = [
    'technical_session', 'group_ride_run', 'threshold', 'vo2_high_intensity', 'race_simulation', 'race_event'
  ];

  if (hasAnyCognitiveImpairment && input.plannedSessionType && demandingSessionTypes.includes(input.plannedSessionType)) {
    const maxRisk = Math.max(scores.pacing, scores.fueling, scores.complexity, scores.focus);
    if (maxRisk >= 3) {
      patternType = 'execution_risk';
    }
  }

  return patternType;
}

function determineConfidence(input: CoachInsightInput): CoachConfidenceLevel {
  const { history, hrvConfidence } = input;

  if (history.enoughHistory && (hrvConfidence === 'moderate' || hrvConfidence === 'high')) {
    return 'high';
  }

  if (hrvConfidence === 'none' && history.similarPatternCount < 2) {
    return 'low';
  }

  return 'moderate';
}

function generateInsightText(
  patternType: CoachPatternType,
  input: CoachInsightInput,
  primaryRisk: RiskType
): string {
  const { history, plannedSessionType } = input;

  switch (patternType) {
    case 'stable_readiness':
      return 'Readiness profile looks supportive. Current load and recovery appear well tolerated.';

    case 'mental_strain':
      if (history.repeatedLowFocusWithShortSleep && input.focusStatus !== 'green') {
        return 'Focus is down again alongside short sleep. This is a repeated pattern for this athlete.';
      }
      return 'Cognition is down more than recovery markers. This looks more like mental strain or decision overload than broad systemic fatigue.';

    case 'recovery_strain':
      if (history.repeatedPoorExecutionWithSuppressedHrv) {
        return 'Recovery context is drifting down even though cognitive function is holding. This athlete has previously executed poorly when HRV is suppressed.';
      }
      return 'Recovery context is drifting down even though cognitive function is holding. The athlete may still perform today, but tolerance may be narrowing.';

    case 'combined_strain':
      if (input.illnessFlag) {
        return 'Cognitive and recovery strain are both present alongside illness symptoms. Quality work is unlikely to produce good value today.';
      }
      return 'Cognitive and recovery strain are both present. The athlete is less likely to get good value from high-quality or high-complexity work today.';

    case 'execution_risk': {
      const sessionLabel = plannedSessionType ? plannedSessionType.replace(/_/g, ' ') : 'planned session';
      if (primaryRisk === 'pacing') {
        return `Main risk for the ${sessionLabel} is pacing. Cognitive impairment increases the chance of starting too hard or surging reactively.`;
      }
      if (primaryRisk === 'fueling') {
        return `Main risk for the ${sessionLabel} is fueling execution. The athlete may delay or forget intake when decision control or focus is down.`;
      }
      if (primaryRisk === 'complexity') {
        return `Main risk for the ${sessionLabel} is handling complexity. Cognitive flexibility is down, so variable or tactical demands may suffer.`;
      }
      if (primaryRisk === 'focus') {
        return `Main risk for the ${sessionLabel} is concentration and cue recognition. Focus is down, increasing the chance of late-session errors.`;
      }
      return 'Main issue today is not just fatigue. It is increased risk of poor execution under session demands.';
    }

    case 'unclear_pattern':
    default:
      return 'The pattern is mixed or low confidence. Avoid strong conclusions from this result alone.';
  }
}

function generateDiscussionPrompt(
  patternType: CoachPatternType,
  input: CoachInsightInput,
  primaryRisk: RiskType
): string {
  const { history } = input;

  switch (patternType) {
    case 'stable_readiness':
      return 'What routines helped keep readiness stable this week?';

    case 'mental_strain':
      if (history.repeatedLowFocusWithShortSleep) {
        return 'Has the athlete noticed the link between short sleep and reduced focus?';
      }
      return 'What felt mentally heavy this week outside training?';

    case 'recovery_strain':
      return 'Are they feeling normal, or just pushing through?';

    case 'combined_strain':
      if (input.illnessFlag) {
        return 'Is the illness mild and passing, or does the athlete need a proper recovery break?';
      }
      return 'What changed in sleep, stress, fueling, or training load?';

    case 'execution_risk':
      if (primaryRisk === 'pacing') {
        return 'Does this athlete tend to start too hard or get pulled into surges on mentally heavy days?';
      }
      if (primaryRisk === 'fueling') {
        if (history.repeatedMissedFuelingOnLowControl) {
          return 'This athlete has missed fueling before on low-control days. What would help them stay on track?';
        }
        return 'Is the athlete forgetting to fuel, delaying the start, or choosing poor options?';
      }
      if (primaryRisk === 'complexity') {
        return 'Does this athlete perform better when structure is locked in on low-adapt days?';
      }
      if (primaryRisk === 'focus') {
        return 'Has the athlete noticed slower reactions or delayed fueling when sleep is short?';
      }
      return 'Where does this athlete usually come undone on days like this: pacing, fueling, focus, or complexity?';

    case 'unclear_pattern':
    default:
      return 'Has this mismatch shown up before, and how did the session actually go?';
  }
}

function generateNextStep(
  patternType: CoachPatternType,
  input: CoachInsightInput,
  primaryRisk: RiskType
): string {
  const { history } = input;

  switch (patternType) {
    case 'stable_readiness':
      return 'Continue the planned structure and reinforce the habits supporting consistency.';

    case 'mental_strain':
      return 'Keep training if appropriate, but reduce complexity, automate fueling, and use fixed pacing.';

    case 'recovery_strain':
      if (history.repeatedPoorExecutionWithSuppressedHrv) {
        return 'Given past outcomes with suppressed HRV, consider protecting the session or adding stronger guardrails.';
      }
      return 'Keep today\'s key work only if warm-up response is normal. Reduce later-week density if this pattern persists.';

    case 'combined_strain':
      return 'Downgrade to steady or easy work, reduce decision load, and address recovery inputs before the next key session.';

    case 'execution_risk':
      if (primaryRisk === 'pacing') {
        return 'Cap the first 20-30 minutes and use fixed pace or power targets.';
      }
      if (primaryRisk === 'fueling') {
        if (history.repeatedMissedFuelingOnLowControl) {
          return 'Set fixed fuel prompts, standardise carry options, and start intake in the first 10 minutes.';
        }
        return 'Start fueling in the first 10 minutes and set 20-minute reminders.';
      }
      if (primaryRisk === 'complexity') {
        return 'Replace variable work with steady blocks and pre-commit intervals and recovery.';
      }
      if (primaryRisk === 'focus') {
        return 'Keep the route simple and lower risk. Avoid technical or high-risk environments.';
      }
      return 'Modify the session to reduce the main decision risk rather than automatically removing all training stress.';

    case 'unclear_pattern':
    default:
      return 'Use conservative guardrails, collect more data, and review the outcome before changing the block.';
  }
}

function generateWhyItMatters(
  patternType: CoachPatternType,
  input: CoachInsightInput,
  primaryRisk: RiskType
): string {
  const { history } = input;

  switch (patternType) {
    case 'stable_readiness':
      return 'Stable readiness suggests the athlete is absorbing training without obvious execution or recovery compromise.';

    case 'mental_strain':
      if (history.repeatedLowFocusWithShortSleep) {
        return 'This pattern has shown up before. Addressing sleep may be more effective than modifying training.';
      }
      return 'These are the days athletes can often complete training, but execute it poorly through pacing, fueling, or concentration errors.';

    case 'recovery_strain':
      if (history.repeatedPoorExecutionWithSuppressedHrv) {
        return 'This athlete has previously performed poorly when HRV is suppressed, so the warning deserves more weight.';
      }
      return 'This is often an early warning stage before execution quality, repeatability, or freshness begins to drop.';

    case 'combined_strain':
      return 'Forcing quality in this state often increases cost more than adaptation.';

    case 'execution_risk':
      if (primaryRisk === 'pacing') {
        return 'This pattern can turn a manageable session into an unnecessarily costly one.';
      }
      if (primaryRisk === 'fueling') {
        if (history.repeatedMissedFuelingOnLowControl) {
          return 'Fueling errors have been a repeated issue. Better fueling may solve more of the problem than changing the session.';
        }
        return 'Fueling errors can cascade into pacing and concentration problems later in the session.';
      }
      if (primaryRisk === 'complexity') {
        return 'Reduced complexity often preserves session quality better than forcing the original design.';
      }
      if (primaryRisk === 'focus') {
        return 'This combination is a common setup for late-session errors even when motivation is still high.';
      }
      return 'Better execution usually gives more value than simply pushing through the original prescription.';

    case 'unclear_pattern':
    default:
      return 'This protects against overinterpreting noise as a real trend.';
  }
}

export function generateCoachInsight(input: CoachInsightInput): CoachInsightOutput {
  const riskCtx: SharedRiskContext = {
    controlStatus: input.controlStatus,
    adaptStatus: input.adaptStatus,
    focusStatus: input.focusStatus,
    overallStatus: input.overallStatus,
    plannedSessionType: input.plannedSessionType,
    sleepHours: input.sleepHours,
    sleepQuality: input.sleepQuality,
    sorenessLevel: input.sorenessLevel,
    perceivedFatigue: input.perceivedFatigue,
    trainingLoadStatus: input.trainingLoadStatus,
    hrvTrendCategory: input.hrvTrendCategory,
    hrvConfidence: input.hrvConfidence,
    illnessFlag: input.illnessFlag,
    travelFlag: input.travelFlag,
    history: input.history,
  };

  const { scores, primaryRisk } = computeFullRiskScores(riskCtx);

  const sleepConcern = calculateSleepConcern(input.sleepHours, input.sleepQuality);
  const { concern: hrvConcern } = calculateHrvConcernAndSupport(input.hrvTrendCategory, input.hrvConfidence);

  const patternType = determinePatternType(input, sleepConcern, hrvConcern, scores);
  const confidence = determineConfidence(input);

  const insightText = generateInsightText(patternType, input, primaryRisk);
  const discussionPrompt = generateDiscussionPrompt(patternType, input, primaryRisk);
  const nextStep = generateNextStep(patternType, input, primaryRisk);
  const whyItMatters = generateWhyItMatters(patternType, input, primaryRisk);

  return {
    patternType,
    insightText,
    discussionPrompt,
    nextStep,
    whyItMatters,
    confidence,
  };
}

export function buildCoachInsightInput(
  session: {
    control_status: DomainStatus | null;
    adapt_status: DomainStatus | null;
    focus_status: DomainStatus | null;
    planned_session_type: PlannedSessionType | null;
    test_reason: string | null;
    sleep_hours: number | null;
    sleep_quality: SleepQuality | null;
    hrv_trend_category: HrvTrendCategory | null;
    hrv_confidence: HrvConfidence | null;
    illness_symptoms: boolean | null;
    travel: boolean | null;
    soreness_level: SorenessLevel | null;
    perceived_fatigue: PerceivedFatigue | null;
    training_load_status: TrainingLoadStatus | null;
    session_call: SessionCall | null;
    primary_risk: RiskType | null;
    secondary_risk: RiskType | null;
    coach_sleep_override_hours?: number | null;
    coach_sleep_override_quality?: SleepQuality | null;
    coach_hrv_override_category?: HrvTrendCategory | null;
  },
  history: {
    repeatedLowFocusWithShortSleep: boolean;
    repeatedFailedQualityOnLowReadiness: boolean;
    repeatedMissedFuelingOnLowControl: boolean;
    repeatedPoorExecutionWithSuppressedHrv: boolean;
    repeatedGoodExecutionDespiteMildFlags: boolean;
    similarPatternCount: number;
    enoughHistory: boolean;
  }
): CoachInsightInput {
  const statuses = [session.control_status, session.adapt_status, session.focus_status].filter(Boolean) as DomainStatus[];
  let overallStatus: DomainStatus | null = null;
  if (statuses.length > 0) {
    if (statuses.includes('red')) overallStatus = 'red';
    else if (statuses.includes('amber')) overallStatus = 'amber';
    else overallStatus = 'green';
  }

  const effectiveSleepHours = session.coach_sleep_override_hours ?? session.sleep_hours;
  const effectiveSleepQuality = session.coach_sleep_override_quality ?? session.sleep_quality;
  const effectiveHrvCategory = session.coach_hrv_override_category ?? session.hrv_trend_category;

  return {
    controlStatus: session.control_status,
    adaptStatus: session.adapt_status,
    focusStatus: session.focus_status,
    overallStatus,
    plannedSessionType: session.planned_session_type,
    testReason: session.test_reason as any,
    sleepHours: effectiveSleepHours,
    sleepQuality: effectiveSleepQuality,
    hrvTrendCategory: effectiveHrvCategory,
    hrvConfidence: session.hrv_confidence,
    illnessFlag: session.illness_symptoms ?? false,
    travelFlag: session.travel ?? false,
    sorenessLevel: session.soreness_level,
    perceivedFatigue: session.perceived_fatigue,
    trainingLoadStatus: session.training_load_status,
    sessionCall: session.session_call,
    primaryRisk: session.primary_risk,
    secondaryRisk: session.secondary_risk,
    history,
  };
}
