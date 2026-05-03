import { supabase } from './supabase';
import type { Session, FlagType } from '../types';

interface FlagCheckResult {
  shouldFlag: boolean;
  flagType: FlagType;
  triggerData: Record<string, unknown>;
}

function checkRepeatedRedOutcomes(sessions: Session[]): FlagCheckResult | null {
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const recentSessions = sessions.filter(
    (s) => new Date(s.date) >= fourteenDaysAgo && !s.is_baseline
  );

  const redOutcomes = recentSessions.filter(
    (s) =>
      s.session_completed === 'abandoned' ||
      (s.session_completed === 'modified' && s.execution_quality === 'poor') ||
      s.readiness_call_matched === 'no'
  );

  if (redOutcomes.length >= 2) {
    return {
      shouldFlag: true,
      flagType: 'repeated_red_outcomes',
      triggerData: {
        count: redOutcomes.length,
        dates: redOutcomes.map((s) => s.date),
      },
    };
  }

  return null;
}

function checkLowFocusPoorSleep(sessions: Session[]): FlagCheckResult | null {
  const recentSessions = sessions.filter((s) => !s.is_baseline).slice(0, 14);

  const lowFocusPoorSleep = recentSessions.filter(
    (s) =>
      s.focus_status === 'red' &&
      (s.sleep_quality === 'poor' || (s.sleep_hours !== null && s.sleep_hours < 5))
  );

  if (lowFocusPoorSleep.length >= 3) {
    return {
      shouldFlag: true,
      flagType: 'low_focus_poor_sleep',
      triggerData: {
        count: lowFocusPoorSleep.length,
        dates: lowFocusPoorSleep.map((s) => s.date),
      },
    };
  }

  return null;
}

function checkReadinessMismatch(sessions: Session[]): FlagCheckResult | null {
  const recentSessions = sessions.filter((s) => !s.is_baseline && s.session_call).slice(0, 10);

  const mismatches = recentSessions.filter((s) => {
    const hadWarning =
      s.session_call === 'better_suited_to_steady_work' ||
      s.session_call === 'recovery_day_preferred';
    const hadPoorOutcome =
      s.session_completed === 'abandoned' ||
      s.execution_quality === 'poor' ||
      s.readiness_call_matched === 'no';

    return hadWarning && hadPoorOutcome;
  });

  if (mismatches.length >= 2) {
    return {
      shouldFlag: true,
      flagType: 'readiness_mismatch',
      triggerData: {
        count: mismatches.length,
        dates: mismatches.map((s) => s.date),
        details: mismatches.map((s) => ({
          date: s.date,
          call: s.session_call,
          outcome: s.session_completed,
        })),
      },
    };
  }

  return null;
}

function checkMissedFuelingPattern(sessions: Session[]): FlagCheckResult | null {
  const recentSessions = sessions.filter((s) => !s.is_baseline).slice(0, 10);

  const missedFueling = recentSessions.filter(
    (s) =>
      s.fueling_compliance === 'missed' &&
      (s.focus_status === 'red' ||
        s.focus_status === 'amber' ||
        s.control_status === 'red' ||
        s.control_status === 'amber')
  );

  if (missedFueling.length >= 3) {
    return {
      shouldFlag: true,
      flagType: 'missed_fueling_pattern',
      triggerData: {
        count: missedFueling.length,
        dates: missedFueling.map((s) => s.date),
      },
    };
  }

  return null;
}

function checkRedCognitionHrvDown(sessions: Session[]): FlagCheckResult | null {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const recentSessions = sessions.filter(
    (s) => new Date(s.date) >= sevenDaysAgo && !s.is_baseline
  );

  const redCognitionHrvDown = recentSessions.filter((s) => {
    const hasRedCognition =
      s.control_status === 'red' || s.adapt_status === 'red' || s.focus_status === 'red';
    const hrvDown = s.hrv_status === 'clearly_down' || s.hrv_status === 'slightly_down';

    return hasRedCognition && hrvDown;
  });

  if (redCognitionHrvDown.length >= 2) {
    return {
      shouldFlag: true,
      flagType: 'red_cognition_hrv_down',
      triggerData: {
        count: redCognitionHrvDown.length,
        dates: redCognitionHrvDown.map((s) => s.date),
      },
    };
  }

  return null;
}

export async function checkAndCreateFlags(athleteId: string): Promise<void> {
  const { data: sessions, error: sessionsError } = await supabase
    .from('neuro_sessions')
    .select('*')
    .eq('athlete_id', athleteId)
    .order('date', { ascending: false })
    .limit(30);

  if (sessionsError || !sessions) {
    console.error('Error loading sessions for flag check:', sessionsError);
    return;
  }

  const { data: existingFlags, error: flagsError } = await supabase
    .from('neuro_athlete_flags')
    .select('flag_type')
    .eq('athlete_id', athleteId)
    .is('resolved_at', null);

  if (flagsError) {
    console.error('Error loading existing flags:', flagsError);
    return;
  }

  const existingFlagTypes = new Set((existingFlags || []).map((f) => f.flag_type));

  const checks = [
    checkRepeatedRedOutcomes,
    checkLowFocusPoorSleep,
    checkReadinessMismatch,
    checkMissedFuelingPattern,
    checkRedCognitionHrvDown,
  ];

  for (const check of checks) {
    const result = check(sessions);
    if (result && result.shouldFlag && !existingFlagTypes.has(result.flagType)) {
      const { error } = await supabase.from('neuro_athlete_flags').insert({
        athlete_id: athleteId,
        flag_type: result.flagType,
        trigger_data: result.triggerData,
      });

      if (error) {
        console.error('Error creating flag:', error);
      }
    }
  }
}

export async function runFlagCheckForAllAthletes(): Promise<void> {
  const { data: athletes, error } = await supabase
    .from('neuro_profiles')
    .select('id')
    .eq('role', 'athlete');

  if (error || !athletes) {
    console.error('Error loading athletes for flag check:', error);
    return;
  }

  for (const athlete of athletes) {
    await checkAndCreateFlags(athlete.id);
  }
}
