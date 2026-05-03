import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Activity, Moon, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, MessageSquare, Minus, Info, Brain, RefreshCw } from 'lucide-react';
import type { Profile, Session, HrvHistoryEntry, AthleteFlag, DomainStatus, HrvAnalysis, SleepQuality, HrvTrendCategory, CoachPatternType, CoachConfidenceLevel } from '../types';
import { SESSION_CALL_LABELS, PLANNED_SESSION_LABELS, FLAG_TYPE_LABELS, COACH_PATTERN_LABELS } from '../types';
import { HrvHistoryEditor } from './HrvHistoryEditor';
import { SleepHistoryEditor } from './SleepHistoryEditor';
import { CoachOutcomePanel } from './CoachOutcomePanel';
import { CoachInsightPanel } from './CoachInsightPanel';
import { CoachContextEditor } from './CoachContextEditor';
import { analyzeHrv, generatePatternInsights } from '../lib/hrv-engine';
import { analyzeAthleteHistory } from '../lib/athlete-history';
import { generateCoachInsight, buildCoachInsightInput } from '../lib/coach-insight-engine';
import { ReadinessAssessment } from './ReadinessAssessment';
import { CoachTimeline } from './CoachTimeline';

interface AthleteDeepInsightProps {
  athlete: Profile;
  onBack: () => void;
}

function DomainIndicator({ status }: { status: DomainStatus | null }) {
  if (!status) return <span className="w-3 h-3 rounded-full bg-gray-600" />;

  const colors: Record<DomainStatus, string> = {
    green: 'bg-green-500',
    amber: 'bg-yellow-500',
    red: 'bg-red-500',
  };

  return <span className={`w-3 h-3 rounded-full ${colors[status]}`} />;
}

function SessionCallBadge({ call }: { call: string | null }) {
  if (!call) return null;

  const colors: Record<string, string> = {
    ready_for_quality: 'bg-green-500/20 text-green-400',
    ready_with_guardrails: 'bg-blue-500/20 text-blue-400',
    better_suited_to_steady_work: 'bg-yellow-500/20 text-yellow-400',
    recovery_day_preferred: 'bg-red-500/20 text-red-400',
  };

  const label = SESSION_CALL_LABELS[call as keyof typeof SESSION_CALL_LABELS] || call;

  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded ${colors[call] || 'bg-gray-700 text-gray-300'}`}>
      {label}
    </span>
  );
}

function HrvTrendIcon({ category }: { category: string }) {
  if (category === 'mildly_elevated') {
    return <TrendingUp className="w-5 h-5 text-blue-400" />;
  }
  if (category === 'clearly_elevated') {
    return <TrendingUp className="w-5 h-5 text-blue-500" />;
  }
  if (category === 'stable') {
    return <Minus className="w-5 h-5 text-green-400" />;
  }
  if (category === 'mildly_suppressed') {
    return <TrendingDown className="w-5 h-5 text-yellow-400" />;
  }
  if (category === 'clearly_suppressed') {
    return <TrendingDown className="w-5 h-5 text-red-400" />;
  }
  return <Info className="w-5 h-5 text-gray-400" />;
}

const TREND_CATEGORY_LABELS: Record<string, string> = {
  stable: 'Stable',
  mildly_suppressed: 'Mildly Suppressed',
  clearly_suppressed: 'Clearly Suppressed',
  mildly_elevated: 'Mildly Elevated',
  clearly_elevated: 'Clearly Elevated',
  insufficient_data: 'Insufficient Data',
};

const CONFIDENCE_LABELS: Record<string, { label: string; color: string }> = {
  high: { label: 'High', color: 'text-green-400' },
  moderate: { label: 'Moderate', color: 'text-yellow-400' },
  low: { label: 'Low', color: 'text-orange-400' },
  none: { label: 'None', color: 'text-gray-500' },
};

const INTERPRETATION_LABELS: Record<string, { label: string; color: string }> = {
  recovery_context_supportive: { label: 'Supportive', color: 'text-green-400' },
  recovery_context_mildly_concerning: { label: 'Mildly Concerning', color: 'text-yellow-400' },
  recovery_context_concerning: { label: 'Concerning', color: 'text-red-400' },
  recovery_context_unclear: { label: 'Unclear', color: 'text-gray-400' },
  recovery_context_caution_despite_elevation: { label: 'Caution (Elevated)', color: 'text-amber-400' },
};

function CoachHrvInsightPanel({ analysis, sessions }: { analysis: HrvAnalysis; sessions: Session[] }) {
  const patterns = generatePatternInsights(sessions);
  const confInfo = CONFIDENCE_LABELS[analysis.confidence] || CONFIDENCE_LABELS.none;
  const interpInfo = INTERPRETATION_LABELS[analysis.interpretation] || INTERPRETATION_LABELS.recovery_context_unclear;

  return (
    <div className="bg-gray-900 rounded-xl p-6 border border-teal-500/30">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-full bg-teal-500/20 flex items-center justify-center">
          <HrvTrendIcon category={analysis.trendCategory} />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">HRV Analysis</h2>
          <p className="text-sm text-gray-400">Coach-facing details</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-5">
        <div className="p-4 bg-gray-800/50 rounded-lg">
          <p className="text-xs text-gray-500 mb-1">7-day Average</p>
          <p className="text-xl font-bold text-white">
            {analysis.avg7day !== null ? `${Math.round(analysis.avg7day)} ms` : 'N/A'}
          </p>
        </div>
        <div className="p-4 bg-gray-800/50 rounded-lg">
          <p className="text-xs text-gray-500 mb-1">Baseline Average</p>
          <p className="text-xl font-bold text-white">
            {analysis.baselineAvg !== null ? `${Math.round(analysis.baselineAvg)} ms` : 'N/A'}
          </p>
        </div>
        <div className="p-4 bg-gray-800/50 rounded-lg">
          <p className="text-xs text-gray-500 mb-1">Difference from Baseline</p>
          <p className={`text-xl font-bold ${
            analysis.percentDiff === null ? 'text-gray-500' :
            analysis.percentDiff >= 0 ? 'text-green-400' : 'text-red-400'
          }`}>
            {analysis.percentDiff !== null
              ? `${analysis.percentDiff >= 0 ? '+' : ''}${analysis.percentDiff.toFixed(1)}%`
              : 'N/A'}
          </p>
        </div>
        <div className="p-4 bg-gray-800/50 rounded-lg">
          <p className="text-xs text-gray-500 mb-1">Entries (Last 7d)</p>
          <p className="text-xl font-bold text-white">{analysis.entriesLast7d}</p>
        </div>
      </div>

      <div className="space-y-3 mb-5">
        <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
          <span className="text-gray-400">Trend Category</span>
          <div className="flex items-center gap-2">
            <HrvTrendIcon category={analysis.trendCategory} />
            <span className="text-white font-medium">
              {TREND_CATEGORY_LABELS[analysis.trendCategory] || analysis.trendCategory}
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
          <span className="text-gray-400">Confidence</span>
          <span className={`font-medium ${confInfo.color}`}>{confInfo.label}</span>
        </div>
        <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
          <span className="text-gray-400">Recovery Context</span>
          <span className={`font-medium ${interpInfo.color}`}>{interpInfo.label}</span>
        </div>
        <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
          <span className="text-gray-400">Supports Readiness</span>
          <span className={analysis.supportsReadiness ? 'text-green-400' : 'text-gray-500'}>
            {analysis.supportsReadiness ? 'Yes' : 'No'}
          </span>
        </div>
        <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
          <span className="text-gray-400">Concerns Recovery</span>
          <span className={analysis.concernsRecovery ? 'text-red-400' : 'text-gray-500'}>
            {analysis.concernsRecovery ? 'Yes' : 'No'}
          </span>
        </div>
      </div>

      <div className="p-4 bg-gray-800/50 rounded-lg mb-5">
        <p className="text-xs text-gray-500 mb-2">Technical Summary</p>
        <p className="text-gray-300 text-sm leading-relaxed">{analysis.textSummary}</p>
      </div>

      {patterns.length > 0 && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          <p className="text-xs text-amber-400 mb-2 font-medium">Pattern Insights</p>
          <ul className="space-y-1">
            {patterns.map((p, i) => (
              <li key={i} className="text-gray-300 text-sm flex items-start gap-2">
                <span className="text-amber-400 mt-1">-</span>
                {p}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

interface SleepHistoryEntry {
  id: string;
  athlete_id: string;
  date: string;
  sleep_hours: number | null;
  sleep_quality: SleepQuality | null;
}

export function AthleteDeepInsight({ athlete, onBack }: AthleteDeepInsightProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [hrvHistory, setHrvHistory] = useState<HrvHistoryEntry[]>([]);
  const [sleepHistory, setSleepHistory] = useState<SleepHistoryEntry[]>([]);
  const [flags, setFlags] = useState<AthleteFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHrvEditor, setShowHrvEditor] = useState(false);
  const [showSleepEditor, setShowSleepEditor] = useState(false);
  const [reviewSession, setReviewSession] = useState<Session | null>(null);
  const [selectedInsightSession, setSelectedInsightSession] = useState<Session | null>(null);
  const [savingContext, setSavingContext] = useState(false);
  const [generatingInsight, setGeneratingInsight] = useState(false);

  useEffect(() => {
    loadData();
  }, [athlete.id]);

  const loadData = async () => {
    setLoading(true);

    const [sessionsRes, hrvRes, sleepRes, flagsRes] = await Promise.all([
      supabase
        .from('neuro_sessions')
        .select('*')
        .eq('athlete_id', athlete.id)
        .order('date', { ascending: false })
        .limit(60),
      supabase
        .from('neuro_hrv_history')
        .select('*')
        .eq('athlete_id', athlete.id)
        .order('date', { ascending: false })
        .limit(60),
      supabase
        .from('neuro_sleep_history')
        .select('*')
        .eq('athlete_id', athlete.id)
        .order('date', { ascending: false })
        .limit(30),
      supabase
        .from('neuro_athlete_flags')
        .select('*')
        .eq('athlete_id', athlete.id)
        .is('resolved_at', null)
        .order('created_at', { ascending: false }),
    ]);

    if (!sessionsRes.error) setSessions(sessionsRes.data || []);
    if (!hrvRes.error) setHrvHistory(hrvRes.data || []);
    if (!sleepRes.error) setSleepHistory(sleepRes.data || []);
    if (!flagsRes.error) setFlags(flagsRes.data || []);

    setLoading(false);
  };

  const resolveFlag = async (flagId: string) => {
    const { error } = await supabase
      .from('neuro_athlete_flags')
      .update({ resolved_at: new Date().toISOString() })
      .eq('id', flagId);

    if (!error) {
      setFlags(flags.filter((f) => f.id !== flagId));
    }
  };

  const generateAndSaveInsight = async (session: Session) => {
    setGeneratingInsight(true);
    try {
      const history = analyzeAthleteHistory(sessions, session.id);
      const input = buildCoachInsightInput(session, history);
      const insight = generateCoachInsight(input);

      const { error } = await supabase
        .from('neuro_sessions')
        .update({
          coach_pattern_type: insight.patternType,
          coach_insight_text: insight.insightText,
          coach_discussion_prompt: insight.discussionPrompt,
          coach_next_step: insight.nextStep,
          coach_why_it_matters: insight.whyItMatters,
          coach_confidence_level: insight.confidence,
          coach_insight_generated_at: new Date().toISOString(),
        })
        .eq('id', session.id);

      if (!error) {
        await loadData();
        const updatedSession = sessions.find(s => s.id === session.id);
        if (updatedSession) {
          setSelectedInsightSession({
            ...updatedSession,
            coach_pattern_type: insight.patternType,
            coach_insight_text: insight.insightText,
            coach_discussion_prompt: insight.discussionPrompt,
            coach_next_step: insight.nextStep,
            coach_why_it_matters: insight.whyItMatters,
            coach_confidence_level: insight.confidence,
          });
        }
      }
    } finally {
      setGeneratingInsight(false);
    }
  };

  const handleSaveContextOverrides = async (
    updates: {
      coach_sleep_override_hours: number | null;
      coach_sleep_override_quality: SleepQuality | null;
      coach_hrv_override_category: HrvTrendCategory | null;
    }
  ) => {
    if (!selectedInsightSession) return;

    setSavingContext(true);
    try {
      const { error } = await supabase
        .from('neuro_sessions')
        .update(updates)
        .eq('id', selectedInsightSession.id);

      if (!error) {
        const updatedSession = {
          ...selectedInsightSession,
          coach_sleep_override_hours: updates.coach_sleep_override_hours,
          coach_sleep_override_quality: updates.coach_sleep_override_quality,
          coach_hrv_override_category: updates.coach_hrv_override_category,
        };
        setSelectedInsightSession(updatedSession);
        await generateAndSaveInsight(updatedSession);
        await loadData();
      }
    } finally {
      setSavingContext(false);
    }
  };

  const handleSelectSession = async (session: Session) => {
    setSelectedInsightSession(session);
    if (!session.coach_pattern_type || !session.coach_insight_text) {
      await generateAndSaveInsight(session);
    }
  };

  const latestSession = sessions[0];
  const baselineSessions = sessions.filter((s) => s.is_baseline);
  const recentNonBaseline = sessions.filter((s) => !s.is_baseline).slice(0, 10);

  const sessionCallCounts = recentNonBaseline.reduce(
    (acc, s) => {
      if (s.session_call) {
        acc[s.session_call] = (acc[s.session_call] || 0) + 1;
      }
      return acc;
    },
    {} as Record<string, number>
  );

  const outcomeStats = {
    completed: recentNonBaseline.filter((s) => s.session_completed === 'completed_as_planned').length,
    modified: recentNonBaseline.filter((s) => s.session_completed === 'modified').length,
    abandoned: recentNonBaseline.filter((s) => s.session_completed === 'abandoned').length,
    fuelingHit: recentNonBaseline.filter((s) => s.fueling_compliance === 'hit').length,
    fuelingMissed: recentNonBaseline.filter((s) => s.fueling_compliance === 'missed').length,
    pacingGood: recentNonBaseline.filter((s) => s.pacing_execution === 'good').length,
    pacingPoor: recentNonBaseline.filter((s) => s.pacing_execution === 'poor').length,
  };

  const sleepEntriesWithHours = sleepHistory.filter((s) => s.sleep_hours !== null && s.sleep_hours > 0);
  const avgSleep = sleepEntriesWithHours.length > 0
    ? sleepEntriesWithHours.reduce((sum, s) => sum + (s.sleep_hours || 0), 0) / sleepEntriesWithHours.length
    : 0;

  const hrvAnalysis = useMemo(() => {
    if (hrvHistory.length === 0) return null;
    return analyzeHrv(hrvHistory, sessions);
  }, [hrvHistory, sessions]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      {showHrvEditor && (
        <HrvHistoryEditor
          athleteId={athlete.id}
          athleteName={athlete.full_name || athlete.email}
          onClose={() => {
            setShowHrvEditor(false);
            loadData();
          }}
        />
      )}

      {showSleepEditor && (
        <SleepHistoryEditor
          athleteId={athlete.id}
          athleteName={athlete.full_name || athlete.email}
          onClose={() => {
            setShowSleepEditor(false);
            loadData();
          }}
        />
      )}

      {reviewSession && (
        <CoachOutcomePanel
          session={reviewSession}
          onClose={() => setReviewSession(null)}
          onUpdate={loadData}
        />
      )}

      <div className="max-w-6xl mx-auto">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to athletes
        </button>

        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              {athlete.full_name || athlete.email}
            </h1>
            <p className="text-gray-400">{athlete.email}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Baseline sessions</p>
            <p className="text-2xl font-bold text-blue-400">{baselineSessions.length}</p>
          </div>
        </div>

        {flags.length > 0 && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-5 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <h2 className="text-lg font-semibold text-white">Active flags ({flags.length})</h2>
            </div>
            <div className="space-y-3">
              {flags.map((flag) => (
                <div
                  key={flag.id}
                  className="flex items-center justify-between p-3 bg-red-500/5 rounded-lg border border-red-500/20"
                >
                  <div>
                    <p className="text-white font-medium">{FLAG_TYPE_LABELS[flag.flag_type]}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(flag.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => resolveFlag(flag.id)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition-colors"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Resolve
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-400" />
                Latest session
              </h2>
              {latestSession && (
                <span className="text-sm text-gray-500">
                  {new Date(latestSession.date).toLocaleDateString()}
                </span>
              )}
            </div>
            {latestSession ? (
              <div className="space-y-3">
                <SessionCallBadge call={latestSession.session_call} />
                <div className="grid grid-cols-3 gap-2 mt-3">
                  <div className="flex items-center gap-2">
                    <DomainIndicator status={latestSession.control_status} />
                    <span className="text-xs text-gray-400">Control</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DomainIndicator status={latestSession.adapt_status} />
                    <span className="text-xs text-gray-400">Adapt</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DomainIndicator status={latestSession.focus_status} />
                    <span className="text-xs text-gray-400">Focus</span>
                  </div>
                </div>
                {latestSession.primary_risk && (
                  <p className="text-sm text-gray-400">
                    Risk: <span className="text-white">{latestSession.primary_risk}</span>
                  </p>
                )}
              </div>
            ) : (
              <p className="text-gray-500">No sessions yet</p>
            )}
          </div>

          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-400" />
                HRV status
              </h2>
              <button
                onClick={() => setShowHrvEditor(true)}
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                Edit
              </button>
            </div>
            {hrvHistory.length > 0 ? (
              <div className="space-y-2">
                {hrvHistory.slice(0, 5).map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">
                      {new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    <div className="flex items-center gap-2">
                      {entry.hrv_value && (
                        <span className="text-white font-medium">{entry.hrv_value}</span>
                      )}
                      <span
                        className={`px-2 py-0.5 text-xs rounded ${
                          entry.hrv_status === 'normal'
                            ? 'bg-green-500/20 text-green-400'
                            : entry.hrv_status === 'slightly_down'
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : entry.hrv_status === 'clearly_down'
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-gray-700 text-gray-400'
                        }`}
                      >
                        {entry.hrv_status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-500 mb-2">No HRV data</p>
                <button
                  onClick={() => setShowHrvEditor(true)}
                  className="text-sm text-blue-400 hover:text-blue-300"
                >
                  Add HRV history
                </button>
              </div>
            )}
          </div>

          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Moon className="w-5 h-5 text-blue-400" />
                Sleep status
              </h2>
              <button
                onClick={() => setShowSleepEditor(true)}
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                Edit
              </button>
            </div>
            {sleepHistory.length > 0 ? (
              <div className="space-y-2">
                {sleepHistory.slice(0, 5).map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">
                      {new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    <div className="flex items-center gap-2">
                      {entry.sleep_hours && (
                        <span className="text-white font-medium">{entry.sleep_hours}h</span>
                      )}
                      {entry.sleep_quality && (
                        <span
                          className={`px-2 py-0.5 text-xs rounded ${
                            entry.sleep_quality === 'excellent'
                              ? 'bg-green-500/20 text-green-400'
                              : entry.sleep_quality === 'good'
                              ? 'bg-blue-500/20 text-blue-400'
                              : entry.sleep_quality === 'fair'
                              ? 'bg-yellow-500/20 text-yellow-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}
                        >
                          {entry.sleep_quality}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                <div className="pt-2 border-t border-gray-800 mt-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Avg (last {sleepEntriesWithHours.length})</span>
                    <span className="text-white font-medium">
                      {avgSleep > 0 ? `${avgSleep.toFixed(1)}h` : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-500 mb-2">No sleep data</p>
                <button
                  onClick={() => setShowSleepEditor(true)}
                  className="text-sm text-blue-400 hover:text-blue-300"
                >
                  Add sleep history
                </button>
              </div>
            )}
          </div>
        </div>

        <CoachTimeline
          sessions={sessions}
          hrvHistory={hrvHistory}
          sleepHistory={sleepHistory}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <h2 className="text-lg font-semibold text-white mb-4">Readiness distribution</h2>
            <div className="space-y-3">
              {(['ready_for_quality', 'ready_with_guardrails', 'better_suited_to_steady_work', 'recovery_day_preferred'] as const).map((call) => {
                const count = sessionCallCounts[call] || 0;
                const total = recentNonBaseline.length || 1;
                const pct = (count / total) * 100;
                const colors: Record<string, string> = {
                  ready_for_quality: 'bg-green-500',
                  ready_with_guardrails: 'bg-blue-500',
                  better_suited_to_steady_work: 'bg-yellow-500',
                  recovery_day_preferred: 'bg-red-500',
                };
                return (
                  <div key={call}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-400">{SESSION_CALL_LABELS[call]}</span>
                      <span className="text-white">{count}</span>
                    </div>
                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${colors[call]} transition-all`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <h2 className="text-lg font-semibold text-white mb-4">Outcome summary</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-400 mb-2">Completion</p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-green-400">As planned</span>
                    <span className="text-white">{outcomeStats.completed}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-yellow-400">Modified</span>
                    <span className="text-white">{outcomeStats.modified}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-red-400">Abandoned</span>
                    <span className="text-white">{outcomeStats.abandoned}</span>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-400 mb-2">Fueling / Pacing</p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Fueling hit</span>
                    <span className="text-green-400">{outcomeStats.fuelingHit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Fueling missed</span>
                    <span className="text-red-400">{outcomeStats.fuelingMissed}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Pacing good</span>
                    <span className="text-green-400">{outcomeStats.pacingGood}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Pacing poor</span>
                    <span className="text-red-400">{outcomeStats.pacingPoor}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {hrvAnalysis && hrvAnalysis.confidence !== 'none' && (
          <div className="mb-6">
            <CoachHrvInsightPanel analysis={hrvAnalysis} sessions={sessions} />
          </div>
        )}

        <div className="mb-6">
          <ReadinessAssessment
            hrvAnalysis={hrvAnalysis}
            sleepHistory={sleepHistory}
            sessionCount={sessions.length}
          />
        </div>

        {selectedInsightSession && (
          <div className="mb-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-teal-500/20 flex items-center justify-center">
                  <Brain className="w-5 h-5 text-teal-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    Session Insight - {new Date(selectedInsightSession.date).toLocaleDateString()}
                  </h2>
                  <p className="text-sm text-gray-400">
                    {selectedInsightSession.planned_session_type
                      ? PLANNED_SESSION_LABELS[selectedInsightSession.planned_session_type]
                      : 'Session'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => generateAndSaveInsight(selectedInsightSession)}
                  disabled={generatingInsight}
                  className="flex items-center gap-2 px-3 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-500 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${generatingInsight ? 'animate-spin' : ''}`} />
                  {generatingInsight ? 'Generating...' : 'Regenerate'}
                </button>
                <button
                  onClick={() => setSelectedInsightSession(null)}
                  className="px-3 py-2 bg-gray-700 text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-600 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>

            <CoachContextEditor
              session={selectedInsightSession}
              onSave={handleSaveContextOverrides}
              saving={savingContext}
            />

            {selectedInsightSession.coach_pattern_type && selectedInsightSession.coach_insight_text ? (
              <CoachInsightPanel
                patternType={selectedInsightSession.coach_pattern_type}
                insightText={selectedInsightSession.coach_insight_text}
                discussionPrompt={selectedInsightSession.coach_discussion_prompt || ''}
                nextStep={selectedInsightSession.coach_next_step || ''}
                whyItMatters={selectedInsightSession.coach_why_it_matters || ''}
                confidence={selectedInsightSession.coach_confidence_level || 'moderate'}
              />
            ) : (
              <div className="bg-gray-900 rounded-xl p-6 border border-gray-700 text-center">
                <Brain className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 mb-4">No insight generated yet for this session</p>
                <button
                  onClick={() => generateAndSaveInsight(selectedInsightSession)}
                  disabled={generatingInsight}
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-500 transition-colors disabled:opacity-50"
                >
                  {generatingInsight ? 'Generating...' : 'Generate Coach Insight'}
                </button>
              </div>
            )}
          </div>
        )}

        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <h2 className="text-lg font-semibold text-white mb-4">Session history</h2>
          {sessions.length === 0 ? (
            <p className="text-gray-500">No sessions yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left py-3 px-3 text-gray-400 font-medium text-sm">Date</th>
                    <th className="text-left py-3 px-3 text-gray-400 font-medium text-sm">Call</th>
                    <th className="text-center py-3 px-3 text-gray-400 font-medium text-sm">Domains</th>
                    <th className="text-left py-3 px-3 text-gray-400 font-medium text-sm">Planned</th>
                    <th className="text-left py-3 px-3 text-gray-400 font-medium text-sm">Pattern</th>
                    <th className="text-left py-3 px-3 text-gray-400 font-medium text-sm">Outcome</th>
                    <th className="text-right py-3 px-3 text-gray-400 font-medium text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.slice(0, 15).map((session) => (
                    <tr key={session.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                      <td className="py-3 px-3">
                        <span className="text-white text-sm">
                          {new Date(session.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                        {session.is_baseline && (
                          <span className="ml-2 text-xs text-blue-400">baseline</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <SessionCallBadge call={session.session_call} />
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center justify-center gap-1">
                          <DomainIndicator status={session.control_status} />
                          <DomainIndicator status={session.adapt_status} />
                          <DomainIndicator status={session.focus_status} />
                        </div>
                      </td>
                      <td className="py-3 px-3 text-sm text-gray-300">
                        {session.planned_session_type
                          ? PLANNED_SESSION_LABELS[session.planned_session_type]
                          : '-'}
                      </td>
                      <td className="py-3 px-3 text-sm">
                        {session.coach_pattern_type ? (
                          <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                            session.coach_pattern_type === 'stable_readiness' ? 'bg-green-500/20 text-green-400' :
                            session.coach_pattern_type === 'mental_strain' ? 'bg-amber-500/20 text-amber-400' :
                            session.coach_pattern_type === 'recovery_strain' ? 'bg-blue-500/20 text-blue-400' :
                            session.coach_pattern_type === 'combined_strain' ? 'bg-red-500/20 text-red-400' :
                            session.coach_pattern_type === 'execution_risk' ? 'bg-orange-500/20 text-orange-400' :
                            'bg-gray-700/50 text-gray-400'
                          }`}>
                            {COACH_PATTERN_LABELS[session.coach_pattern_type]}
                          </span>
                        ) : !session.is_baseline ? (
                          <span className="text-gray-500 text-xs">Not generated</span>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-sm">
                        {session.session_completed ? (
                          <span
                            className={
                              session.session_completed === 'completed_as_planned'
                                ? 'text-green-400'
                                : session.session_completed === 'modified'
                                ? 'text-yellow-400'
                                : 'text-red-400'
                            }
                          >
                            {session.session_completed.replace(/_/g, ' ')}
                          </span>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {!session.is_baseline && (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleSelectSession(session)}
                              className="p-1.5 text-gray-400 hover:text-teal-400 hover:bg-teal-500/10 rounded transition-colors"
                              title="View coach insight"
                            >
                              <Brain className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setReviewSession(session)}
                              className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded transition-colors"
                              title="Review session"
                            >
                              <MessageSquare className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
