import type { Session, AthleteHistoryIndicators, DomainStatus, HrvTrendCategory, CoachPatternType } from '../types';

const MIN_SESSIONS_FOR_HISTORY = 5;
const LOOKBACK_DAYS = 30;

function isWithinLookback(sessionDate: string): boolean {
  const date = new Date(sessionDate);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - LOOKBACK_DAYS);
  return date >= cutoff;
}

function getOverallStatus(session: Session): DomainStatus | null {
  const statuses = [session.control_status, session.adapt_status, session.focus_status].filter(Boolean) as DomainStatus[];
  if (statuses.length === 0) return null;
  if (statuses.includes('red')) return 'red';
  if (statuses.includes('amber')) return 'amber';
  return 'green';
}

export function analyzeAthleteHistory(sessions: Session[], currentSessionId?: string): AthleteHistoryIndicators {
  const recentSessions = sessions
    .filter(s => !s.is_baseline && s.id !== currentSessionId && isWithinLookback(s.date))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const enoughHistory = recentSessions.length >= MIN_SESSIONS_FOR_HISTORY;

  let lowFocusShortSleepCount = 0;
  let failedQualityLowReadinessCount = 0;
  let missedFuelingLowControlCount = 0;
  let poorExecutionSuppressedHrvCount = 0;
  let goodExecutionMildFlagsCount = 0;

  for (const session of recentSessions) {
    const sleepHours = session.coach_sleep_override_hours ?? session.sleep_hours;
    const focusStatus = session.focus_status;
    const controlStatus = session.control_status;
    const overallStatus = getOverallStatus(session);
    const hrvCategory = (session.coach_hrv_override_category ?? session.hrv_trend_category) as HrvTrendCategory | null;
    const executionQuality = session.execution_quality;
    const fuelingCompliance = session.fueling_compliance;

    if (focusStatus && focusStatus !== 'green' && sleepHours !== null && sleepHours < 6.5) {
      lowFocusShortSleepCount++;
    }

    if (overallStatus && overallStatus !== 'green' && executionQuality === 'poor') {
      failedQualityLowReadinessCount++;
    }

    if (controlStatus && controlStatus !== 'green' && fuelingCompliance === 'missed') {
      missedFuelingLowControlCount++;
    }

    const hrvSuppressed = hrvCategory === 'mildly_suppressed' || hrvCategory === 'clearly_suppressed';
    if (hrvSuppressed && executionQuality === 'poor') {
      poorExecutionSuppressedHrvCount++;
    }

    const mildFlags = overallStatus === 'amber' || (hrvCategory === 'mildly_suppressed');
    if (mildFlags && (executionQuality === 'good' || executionQuality === 'fair')) {
      goodExecutionMildFlagsCount++;
    }
  }

  return {
    repeatedLowFocusWithShortSleep: lowFocusShortSleepCount >= 3,
    repeatedFailedQualityOnLowReadiness: failedQualityLowReadinessCount >= 2,
    repeatedMissedFuelingOnLowControl: missedFuelingLowControlCount >= 3,
    repeatedPoorExecutionWithSuppressedHrv: poorExecutionSuppressedHrvCount >= 2,
    repeatedGoodExecutionDespiteMildFlags: goodExecutionMildFlagsCount >= 3,
    similarPatternCount: 0,
    enoughHistory,
  };
}

export function countSimilarPatterns(sessions: Session[], patternType: CoachPatternType): number {
  const recentSessions = sessions
    .filter(s => !s.is_baseline && isWithinLookback(s.date))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  let count = 0;
  for (const session of recentSessions) {
    if (session.coach_pattern_type === patternType) {
      count++;
    }
  }
  return count;
}
