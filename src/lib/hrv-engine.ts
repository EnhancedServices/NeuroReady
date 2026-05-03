import type {
  HrvHistoryEntry,
  HrvTrendCategory,
  HrvConfidence,
  HrvInterpretation,
  HrvAnalysis,
  DomainStatus,
  SleepQuality,
  PerceivedFatigue,
  Session,
} from '../types';

interface HrvContext {
  sleepQuality: SleepQuality | null;
  sleepHours: number;
  perceivedFatigue: PerceivedFatigue | null;
  illnessSymptoms: boolean;
  travel: boolean;
  controlStatus: DomainStatus | null;
  adaptStatus: DomainStatus | null;
  focusStatus: DomainStatus | null;
  recentExecutionIssues: boolean;
}

const THRESHOLDS = {
  SWC_MULTIPLIER: 0.5,
  CLEAR_CHANGE_MULTIPLIER: 1.0,
  MIN_ENTRIES_MODERATE_CONFIDENCE: 3,
  MIN_ENTRIES_HIGH_CONFIDENCE: 5,
  BASELINE_DAYS: 28,
  BASELINE_MIN_ENTRIES: 14,
  BASELINE_FALLBACK_ENTRIES: 14,
  ROLLING_WINDOW_DAYS: 7,
};

function toLnRmssd(rmssdMs: number): number {
  if (rmssdMs <= 0) return 0;
  return Math.log(rmssdMs);
}

function getEntriesInDateRange(
  entries: HrvHistoryEntry[],
  endDate: Date,
  daysBack: number
): HrvHistoryEntry[] {
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - daysBack);

  return entries.filter((entry) => {
    if (!entry.hrv_value || entry.hrv_value <= 0) return false;
    const entryDate = new Date(entry.date);
    return entryDate >= startDate && entryDate <= endDate;
  });
}

function calculateLnRmssdAverage(entries: HrvHistoryEntry[]): number | null {
  const validEntries = entries.filter((e) => e.hrv_value !== null && e.hrv_value > 0);
  if (validEntries.length === 0) return null;

  const lnValues = validEntries.map((e) => toLnRmssd(e.hrv_value!));
  const sum = lnValues.reduce((acc, val) => acc + val, 0);
  return sum / lnValues.length;
}

function calculateLnRmssdStdDev(entries: HrvHistoryEntry[], mean: number): number {
  const validEntries = entries.filter((e) => e.hrv_value !== null && e.hrv_value > 0);
  if (validEntries.length < 2) return 0;

  const lnValues = validEntries.map((e) => toLnRmssd(e.hrv_value!));
  const squaredDiffs = lnValues.map((val) => Math.pow(val - mean, 2));
  const variance = squaredDiffs.reduce((acc, val) => acc + val, 0) / lnValues.length;
  return Math.sqrt(variance);
}

function determineConfidence(entriesLast7d: number): HrvConfidence {
  if (entriesLast7d >= THRESHOLDS.MIN_ENTRIES_HIGH_CONFIDENCE) return 'high';
  if (entriesLast7d >= THRESHOLDS.MIN_ENTRIES_MODERATE_CONFIDENCE) return 'moderate';
  if (entriesLast7d >= 1) return 'low';
  return 'none';
}

function determineTrendCategory(
  sdDiff: number | null,
  entriesLast7d: number
): HrvTrendCategory {
  if (entriesLast7d < THRESHOLDS.MIN_ENTRIES_MODERATE_CONFIDENCE) {
    return 'insufficient_data';
  }

  if (sdDiff === null) {
    return 'insufficient_data';
  }

  if (sdDiff > THRESHOLDS.CLEAR_CHANGE_MULTIPLIER) {
    return 'clearly_elevated';
  }

  if (sdDiff > THRESHOLDS.SWC_MULTIPLIER) {
    return 'mildly_elevated';
  }

  if (sdDiff < -THRESHOLDS.CLEAR_CHANGE_MULTIPLIER) {
    return 'clearly_suppressed';
  }

  if (sdDiff < -THRESHOLDS.SWC_MULTIPLIER) {
    return 'mildly_suppressed';
  }

  return 'stable';
}

function determineInterpretation(
  trendCategory: HrvTrendCategory,
  context: HrvContext
): HrvInterpretation {
  const hasPoorSleep = context.sleepQuality === 'poor' || context.sleepHours < 5;
  const hasHighFatigue = context.perceivedFatigue === 'high' || context.perceivedFatigue === 'very_high';
  const hasIllness = context.illnessSymptoms;
  const hasRedCognition =
    context.controlStatus === 'red' ||
    context.adaptStatus === 'red' ||
    context.focusStatus === 'red';
  const hasAmberCognition =
    context.controlStatus === 'amber' ||
    context.adaptStatus === 'amber' ||
    context.focusStatus === 'amber';

  if (trendCategory === 'insufficient_data') {
    return 'recovery_context_unclear';
  }

  if (trendCategory === 'clearly_elevated') {
    if (hasHighFatigue || context.recentExecutionIssues || hasPoorSleep || hasIllness) {
      return 'recovery_context_caution_despite_elevation';
    }
    if (hasRedCognition || hasAmberCognition) {
      return 'recovery_context_caution_despite_elevation';
    }
    return 'recovery_context_supportive';
  }

  if (trendCategory === 'mildly_elevated') {
    if (hasIllness || hasRedCognition || hasHighFatigue || context.recentExecutionIssues) {
      return 'recovery_context_caution_despite_elevation';
    }
    if (hasPoorSleep || hasAmberCognition) {
      return 'recovery_context_mildly_concerning';
    }
    return 'recovery_context_supportive';
  }

  if (trendCategory === 'stable') {
    if (hasIllness || (hasPoorSleep && hasRedCognition)) {
      return 'recovery_context_mildly_concerning';
    }
    return 'recovery_context_supportive';
  }

  if (trendCategory === 'mildly_suppressed') {
    if (hasIllness || hasRedCognition || (hasPoorSleep && hasHighFatigue)) {
      return 'recovery_context_concerning';
    }
    if (hasPoorSleep || hasHighFatigue || hasAmberCognition) {
      return 'recovery_context_mildly_concerning';
    }
    return 'recovery_context_mildly_concerning';
  }

  if (trendCategory === 'clearly_suppressed') {
    if (hasIllness || hasRedCognition || hasPoorSleep) {
      return 'recovery_context_concerning';
    }
    return 'recovery_context_concerning';
  }

  return 'recovery_context_unclear';
}

function generateAthleteFacingTrend(trendCategory: HrvTrendCategory): string {
  switch (trendCategory) {
    case 'stable':
      return 'Your 7-day HRV trend is close to your normal range.';
    case 'mildly_suppressed':
      return 'Your 7-day HRV trend is a little below your normal range.';
    case 'clearly_suppressed':
      return 'Your 7-day HRV trend is well below your normal range this week.';
    case 'mildly_elevated':
      return 'Your 7-day HRV trend is above your normal range this week.';
    case 'clearly_elevated':
      return 'Your 7-day HRV trend is well above your normal range this week.';
    case 'insufficient_data':
      return 'Not enough HRV data this week to interpret a trend confidently.';
    default:
      return 'HRV data is being analyzed.';
  }
}

function generateAthleteFacingMeaning(
  trendCategory: HrvTrendCategory,
  interpretation: HrvInterpretation
): string {
  if (trendCategory === 'insufficient_data') {
    return 'We need more HRV entries to provide meaningful recovery insights.';
  }

  switch (interpretation) {
    case 'recovery_context_supportive':
      return 'Recovery context looks broadly stable.';
    case 'recovery_context_mildly_concerning':
      return 'Your recovery state may be slightly below normal this week.';
    case 'recovery_context_concerning':
      return 'Multiple signals suggest recovery may need attention.';
    case 'recovery_context_caution_despite_elevation':
      return 'Your HRV is up, but other factors suggest caution is still wise.';
    case 'recovery_context_unclear':
      return 'Recovery context is unclear with current data.';
    default:
      return '';
  }
}

function generateAthleteFacingImpact(
  trendCategory: HrvTrendCategory,
  interpretation: HrvInterpretation,
  cognitionImpaired: boolean
): string {
  if (trendCategory === 'insufficient_data') {
    return 'HRV is not factoring strongly into today\'s recommendation due to limited data.';
  }

  if (interpretation === 'recovery_context_supportive') {
    if (cognitionImpaired) {
      return 'HRV looks okay, so the cognitive changes are more likely related to mental load or sleep.';
    }
    return 'If today\'s cognitive score is also normal, the planned session is more likely to go well.';
  }

  if (interpretation === 'recovery_context_mildly_concerning') {
    return 'This adds weight to simplifying today\'s session if your cognitive score is also down.';
  }

  if (interpretation === 'recovery_context_concerning') {
    return 'This supports protecting intensity and prioritizing recovery today.';
  }

  if (interpretation === 'recovery_context_caution_despite_elevation') {
    return 'Despite elevated HRV, other signals suggest caution with demanding efforts.';
  }

  return 'HRV context is being considered alongside other factors.';
}

function generateAthleteFacingConfidence(confidence: HrvConfidence, entriesLast7d: number): string {
  switch (confidence) {
    case 'high':
      return `High confidence based on ${entriesLast7d} HRV entries this week.`;
    case 'moderate':
      return `Moderate confidence based on ${entriesLast7d} HRV entries this week.`;
    case 'low':
      return `Limited confidence based on only ${entriesLast7d} HRV ${entriesLast7d === 1 ? 'entry' : 'entries'} this week.`;
    case 'none':
      return 'No HRV entries available this week.';
    default:
      return '';
  }
}

function generateCoachTextSummary(
  trendCategory: HrvTrendCategory,
  confidence: HrvConfidence,
  sdDiff: number | null,
  percentDiff: number | null,
  interpretation: HrvInterpretation,
  context: HrvContext
): string {
  if (trendCategory === 'insufficient_data') {
    return 'HRV interpretation limited by sparse weekly sampling.';
  }

  const sdText = sdDiff !== null ? `${sdDiff > 0 ? '+' : ''}${sdDiff.toFixed(2)} SD from baseline` : '';
  const pctText = percentDiff !== null ? `${percentDiff > 0 ? '+' : ''}${percentDiff.toFixed(1)}%` : '';
  const confidenceText = confidence === 'high' ? 'adequate data density' : confidence === 'moderate' ? 'moderate data density' : 'limited data';

  let alignmentText = '';
  if (context.controlStatus === 'red' || context.adaptStatus === 'red' || context.focusStatus === 'red') {
    if (trendCategory === 'clearly_suppressed' || trendCategory === 'mildly_suppressed') {
      alignmentText = ' aligned with red cognition';
    } else if (trendCategory === 'stable' || trendCategory === 'mildly_elevated' || trendCategory === 'clearly_elevated') {
      alignmentText = ' divergent from red cognition';
    }
  }

  if (context.sleepQuality === 'poor' && (trendCategory === 'clearly_suppressed' || trendCategory === 'mildly_suppressed')) {
    alignmentText += alignmentText ? ' and poor sleep' : ' aligned with poor sleep';
  }

  const trendLabel = trendCategory.replace(/_/g, ' ');
  const trendText = (trendCategory === 'mildly_elevated' || trendCategory === 'clearly_elevated') && context.recentExecutionIssues
    ? `HRV ${trendLabel} with recent execution issues`
    : `HRV ${trendLabel}`;

  return `${trendText} (${sdText}, ${pctText}, ${confidenceText})${alignmentText}.`;
}

export function analyzeHrv(
  hrvHistory: HrvHistoryEntry[],
  sessions: Session[] = [],
  referenceDate: Date = new Date()
): HrvAnalysis {
  const last7dEntries = getEntriesInDateRange(hrvHistory, referenceDate, THRESHOLDS.ROLLING_WINDOW_DAYS);
  const entriesLast7d = last7dEntries.length;

  const lnAvg7day = calculateLnRmssdAverage(last7dEntries);

  let baselineEntries = getEntriesInDateRange(hrvHistory, referenceDate, THRESHOLDS.BASELINE_DAYS);

  if (baselineEntries.length < THRESHOLDS.BASELINE_MIN_ENTRIES) {
    const allValidEntries = hrvHistory
      .filter((e) => e.hrv_value !== null && e.hrv_value > 0)
      .slice(0, THRESHOLDS.BASELINE_FALLBACK_ENTRIES);
    baselineEntries = allValidEntries;
  }

  const lnBaselineAvg = calculateLnRmssdAverage(baselineEntries);
  const lnBaselineStdDev = lnBaselineAvg !== null ? calculateLnRmssdStdDev(baselineEntries, lnBaselineAvg) : null;

  let sdDiffFromBaseline: number | null = null;
  let percentDiff: number | null = null;

  if (lnAvg7day !== null && lnBaselineAvg !== null && lnBaselineStdDev !== null && lnBaselineStdDev > 0) {
    sdDiffFromBaseline = (lnAvg7day - lnBaselineAvg) / lnBaselineStdDev;
  }

  const rawAvg7day = last7dEntries.length > 0
    ? last7dEntries.reduce((sum, e) => sum + (e.hrv_value || 0), 0) / last7dEntries.length
    : null;
  const rawBaselineAvg = baselineEntries.length > 0
    ? baselineEntries.reduce((sum, e) => sum + (e.hrv_value || 0), 0) / baselineEntries.length
    : null;

  if (rawAvg7day !== null && rawBaselineAvg !== null && rawBaselineAvg > 0) {
    percentDiff = ((rawAvg7day - rawBaselineAvg) / rawBaselineAvg) * 100;
  }

  const confidence = determineConfidence(entriesLast7d);
  const trendCategory = determineTrendCategory(sdDiffFromBaseline, entriesLast7d);

  const recentExecutionIssues = checkRecentExecutionIssues(sessions);

  const defaultContext: HrvContext = {
    sleepQuality: null,
    sleepHours: 7,
    perceivedFatigue: null,
    illnessSymptoms: false,
    travel: false,
    controlStatus: null,
    adaptStatus: null,
    focusStatus: null,
    recentExecutionIssues,
  };

  const interpretation = determineInterpretation(trendCategory, defaultContext);

  const supportsReadiness =
    interpretation === 'recovery_context_supportive' && confidence !== 'none' && confidence !== 'low';

  const concernsRecovery =
    interpretation === 'recovery_context_concerning' ||
    (interpretation === 'recovery_context_mildly_concerning' && confidence === 'high');

  const cognitionImpaired = false;

  const athleteFacingTrend = generateAthleteFacingTrend(trendCategory);
  const athleteFacingMeaning = generateAthleteFacingMeaning(trendCategory, interpretation);
  const athleteFacingImpact = generateAthleteFacingImpact(trendCategory, interpretation, cognitionImpaired);
  const athleteFacingConfidence = generateAthleteFacingConfidence(confidence, entriesLast7d);
  const textSummary = generateCoachTextSummary(trendCategory, confidence, sdDiffFromBaseline, percentDiff, interpretation, defaultContext);

  return {
    entriesLast7d,
    avg7day: rawAvg7day,
    baselineAvg: rawBaselineAvg,
    baselineStdDev: lnBaselineStdDev,
    sdDiffFromBaseline,
    percentDiff,
    trendCategory,
    confidence,
    interpretation,
    supportsReadiness,
    concernsRecovery,
    textSummary,
    athleteFacingTrend,
    athleteFacingMeaning,
    athleteFacingImpact,
    athleteFacingConfidence,
  };
}

export function analyzeHrvWithContext(
  hrvHistory: HrvHistoryEntry[],
  context: HrvContext,
  sessions: Session[] = [],
  referenceDate: Date = new Date()
): HrvAnalysis {
  const last7dEntries = getEntriesInDateRange(hrvHistory, referenceDate, THRESHOLDS.ROLLING_WINDOW_DAYS);
  const entriesLast7d = last7dEntries.length;

  const lnAvg7day = calculateLnRmssdAverage(last7dEntries);

  let baselineEntries = getEntriesInDateRange(hrvHistory, referenceDate, THRESHOLDS.BASELINE_DAYS);

  if (baselineEntries.length < THRESHOLDS.BASELINE_MIN_ENTRIES) {
    const allValidEntries = hrvHistory
      .filter((e) => e.hrv_value !== null && e.hrv_value > 0)
      .slice(0, THRESHOLDS.BASELINE_FALLBACK_ENTRIES);
    baselineEntries = allValidEntries;
  }

  const lnBaselineAvg = calculateLnRmssdAverage(baselineEntries);
  const lnBaselineStdDev = lnBaselineAvg !== null ? calculateLnRmssdStdDev(baselineEntries, lnBaselineAvg) : null;

  let sdDiffFromBaseline: number | null = null;
  let percentDiff: number | null = null;

  if (lnAvg7day !== null && lnBaselineAvg !== null && lnBaselineStdDev !== null && lnBaselineStdDev > 0) {
    sdDiffFromBaseline = (lnAvg7day - lnBaselineAvg) / lnBaselineStdDev;
  }

  const rawAvg7day = last7dEntries.length > 0
    ? last7dEntries.reduce((sum, e) => sum + (e.hrv_value || 0), 0) / last7dEntries.length
    : null;
  const rawBaselineAvg = baselineEntries.length > 0
    ? baselineEntries.reduce((sum, e) => sum + (e.hrv_value || 0), 0) / baselineEntries.length
    : null;

  if (rawAvg7day !== null && rawBaselineAvg !== null && rawBaselineAvg > 0) {
    percentDiff = ((rawAvg7day - rawBaselineAvg) / rawBaselineAvg) * 100;
  }

  const confidence = determineConfidence(entriesLast7d);
  const trendCategory = determineTrendCategory(sdDiffFromBaseline, entriesLast7d);
  const interpretation = determineInterpretation(trendCategory, context);

  const supportsReadiness =
    interpretation === 'recovery_context_supportive' && confidence !== 'none' && confidence !== 'low';

  const concernsRecovery =
    interpretation === 'recovery_context_concerning' ||
    (interpretation === 'recovery_context_mildly_concerning' && confidence === 'high');

  const cognitionImpaired =
    context.controlStatus === 'red' ||
    context.controlStatus === 'amber' ||
    context.adaptStatus === 'red' ||
    context.adaptStatus === 'amber' ||
    context.focusStatus === 'red' ||
    context.focusStatus === 'amber';

  const athleteFacingTrend = generateAthleteFacingTrend(trendCategory);
  const athleteFacingMeaning = generateAthleteFacingMeaning(trendCategory, interpretation);
  const athleteFacingImpact = generateAthleteFacingImpact(trendCategory, interpretation, cognitionImpaired);
  const athleteFacingConfidence = generateAthleteFacingConfidence(confidence, entriesLast7d);
  const textSummary = generateCoachTextSummary(trendCategory, confidence, sdDiffFromBaseline, percentDiff, interpretation, context);

  return {
    entriesLast7d,
    avg7day: rawAvg7day,
    baselineAvg: rawBaselineAvg,
    baselineStdDev: lnBaselineStdDev,
    sdDiffFromBaseline,
    percentDiff,
    trendCategory,
    confidence,
    interpretation,
    supportsReadiness,
    concernsRecovery,
    textSummary,
    athleteFacingTrend,
    athleteFacingMeaning,
    athleteFacingImpact,
    athleteFacingConfidence,
  };
}

export function analyzeHrvFromStatus(
  hrvStatus: string | null,
  context: HrvContext
): HrvAnalysis {
  let trendCategory: HrvTrendCategory = 'insufficient_data';

  if (hrvStatus === 'normal') {
    trendCategory = 'stable';
  } else if (hrvStatus === 'slightly_down') {
    trendCategory = 'mildly_suppressed';
  } else if (hrvStatus === 'clearly_down') {
    trendCategory = 'clearly_suppressed';
  } else if (hrvStatus === 'elevated') {
    trendCategory = 'mildly_elevated';
  }

  const confidence: HrvConfidence = hrvStatus && hrvStatus !== 'unknown' ? 'low' : 'none';
  const interpretation = determineInterpretation(trendCategory, context);

  const supportsReadiness = interpretation === 'recovery_context_supportive';
  const concernsRecovery = interpretation === 'recovery_context_concerning';

  const cognitionImpaired =
    context.controlStatus === 'red' ||
    context.controlStatus === 'amber' ||
    context.adaptStatus === 'red' ||
    context.adaptStatus === 'amber' ||
    context.focusStatus === 'red' ||
    context.focusStatus === 'amber';

  const athleteFacingTrend = generateAthleteFacingTrend(trendCategory);
  const athleteFacingMeaning = generateAthleteFacingMeaning(trendCategory, interpretation);
  const athleteFacingImpact = generateAthleteFacingImpact(trendCategory, interpretation, cognitionImpaired);
  const athleteFacingConfidence = 'Based on self-reported HRV status (limited precision).';

  const textSummary =
    trendCategory === 'insufficient_data'
      ? 'No HRV status provided.'
      : `HRV status self-reported as ${hrvStatus}, interpretation limited by lack of numerical data.`;

  return {
    entriesLast7d: 0,
    avg7day: null,
    baselineAvg: null,
    baselineStdDev: null,
    sdDiffFromBaseline: null,
    percentDiff: null,
    trendCategory,
    confidence,
    interpretation,
    supportsReadiness,
    concernsRecovery,
    textSummary,
    athleteFacingTrend,
    athleteFacingMeaning,
    athleteFacingImpact,
    athleteFacingConfidence,
  };
}

export function checkRecentExecutionIssues(sessions: Session[]): boolean {
  const recentSessions = sessions.slice(0, 5);
  const poorExecutions = recentSessions.filter(
    (s) =>
      s.execution_quality === 'poor' ||
      s.session_completed === 'abandoned' ||
      s.readiness_call_matched === 'no'
  );
  return poorExecutions.length >= 2;
}

export function getHrvWeight(confidence: HrvConfidence): number {
  switch (confidence) {
    case 'high':
      return 0.6;
    case 'moderate':
      return 0.4;
    case 'low':
      return 0.2;
    case 'none':
      return 0;
    default:
      return 0;
  }
}

export function generatePatternInsights(
  sessions: Session[],
  hrvHistory: HrvHistoryEntry[]
): string[] {
  const insights: string[] = [];
  const recentSessions = sessions.filter((s) => !s.is_baseline).slice(0, 20);

  const lowFocusSuppressedHrv = recentSessions.filter(
    (s) =>
      s.focus_status === 'red' &&
      (s.hrv_trend_category === 'clearly_suppressed' || s.hrv_trend_category === 'mildly_suppressed')
  );
  if (lowFocusSuppressedHrv.length >= 3) {
    insights.push('Low focus days are more common when 7-day HRV is suppressed.');
  }

  const thresholdFailures = recentSessions.filter(
    (s) =>
      (s.planned_session_type === 'threshold' || s.planned_session_type === 'vo2_high_intensity') &&
      (s.session_completed === 'modified' || s.session_completed === 'abandoned') &&
      (s.hrv_trend_category === 'clearly_suppressed' || s.hrv_trend_category === 'mildly_suppressed')
  );
  if (thresholdFailures.length >= 2) {
    insights.push('Threshold/VO2 session issues are more likely when HRV is suppressed.');
  }

  const mildSuppressionSuccess = recentSessions.filter(
    (s) =>
      s.hrv_trend_category === 'mildly_suppressed' &&
      s.session_completed === 'completed_as_planned' &&
      s.execution_quality === 'good' &&
      (s.control_status === 'green' || s.adapt_status === 'green' || s.focus_status === 'green')
  );
  if (mildSuppressionSuccess.length >= 3) {
    insights.push('This athlete often tolerates mild HRV suppression when cognition remains normal.');
  }

  const missedFuelingLowControl = recentSessions.filter(
    (s) =>
      s.fueling_compliance === 'missed' &&
      (s.control_status === 'red' || s.control_status === 'amber') &&
      (s.hrv_trend_category === 'stable' || s.hrv_trend_category === 'mildly_elevated' || s.hrv_trend_category === 'clearly_elevated')
  );
  if (missedFuelingLowControl.length >= 2) {
    insights.push('Missed fueling has occurred during low-control days despite stable HRV.');
  }

  const elevatedHrvPoorExecution = recentSessions.filter(
    (s) =>
      (s.hrv_trend_category === 'mildly_elevated' || s.hrv_trend_category === 'clearly_elevated') &&
      (s.execution_quality === 'poor' || s.session_completed === 'abandoned')
  );
  if (elevatedHrvPoorExecution.length >= 2) {
    insights.push('Elevated HRV has not reliably predicted strong execution in this athlete.');
  }

  return insights;
}
