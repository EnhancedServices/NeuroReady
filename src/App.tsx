import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './lib/auth-context';
import { DbHealthProvider } from './lib/db-health';
import { Auth } from './components/Auth';
import { Onboarding } from './components/Onboarding';
import { TestBattery } from './components/TestBattery';
import { AthleteDashboard } from './components/AthleteDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { SessionResultScreen } from './components/SessionResultScreen';
import { DbStatusBanner } from './components/DbStatusBanner';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import type { TestResult, PreTestContext, SessionResult } from './types';
import { buildBaseline, scoreBattery, SessionData, MetricKey } from './lib/scoring';
import { generateSessionResult, analyzeHistoricalPatterns } from './lib/risk-engine';
import { analyzeHrv } from './lib/hrv-engine';
import { AlertCircle } from 'lucide-react';
import type { HrvAnalysis, HrvHistoryEntry } from './types';

type AppView = 'dashboard' | 'onboarding' | 'testing' | 'results';

function AppContent() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const [view, setView] = useState<AppView>('dashboard');
  const [sessionResult, setSessionResult] = useState<SessionResult | null>(null);
  const [preTestHrvAnalysis, setPreTestHrvAnalysis] = useState<HrvAnalysis | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (profile && profile.role === 'athlete') {
      if (!profile.onboarding_complete && profile.baseline_sessions_count < 3) {
        setView('onboarding');
      } else {
        setView('dashboard');
      }
    } else if (profile && profile.role === 'admin') {
      setView('dashboard');
    }
  }, [profile]);

  const handleStartTest = async () => {
    if (!profile) {
      setView('testing');
      return;
    }

    const { data: hrvHistory } = await supabase
      .from('neuro_hrv_history')
      .select('*')
      .eq('athlete_id', profile.id)
      .order('date', { ascending: false })
      .limit(60);

    const { data: allSessions } = await supabase
      .from('neuro_sessions')
      .select('*')
      .eq('athlete_id', profile.id)
      .order('date', { ascending: false });

    if (hrvHistory && hrvHistory.length > 0) {
      const analysis = analyzeHrv(hrvHistory as HrvHistoryEntry[], allSessions || []);
      setPreTestHrvAnalysis(analysis);
    } else {
      setPreTestHrvAnalysis(null);
    }

    setView('testing');
  };

  const handleOnboardingComplete = () => {
    setView('dashboard');
  };

  const handleTestComplete = async (results: TestResult, context: PreTestContext) => {
    if (!profile) return;

    setSaving(true);
    setSaveError(null);

    try {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0];

    const { data: existingSession, error: checkError } = await supabase
      .from('neuro_sessions')
      .select('*')
      .eq('athlete_id', profile.id)
      .eq('date', dateStr)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking existing session:', checkError);
      return;
    }

    const { data: allSessions, error: sessionsError } = await supabase
      .from('neuro_sessions')
      .select('*')
      .eq('athlete_id', profile.id)
      .order('date', { ascending: false });

    if (sessionsError) {
      console.error('Error loading sessions:', sessionsError);
      return;
    }

    const sessionData: SessionData[] = (allSessions || []).map(s => ({
      dateISO: s.date,
      metrics: {
        stroop_interference_ms: s.stroop_interference_ms ?? undefined,
        stroop_errors: s.stroop_errors ?? undefined,
        switch_cost_ms: s.switch_cost_ms ?? undefined,
        switch_errors: s.switch_errors ?? undefined,
        pvt_median_rt_ms: s.pvt_median_rt_ms ?? undefined,
        pvt_lapses: s.pvt_lapses ?? undefined,
        pvt_false_starts: s.pvt_false_starts ?? undefined,
      } as Partial<Record<MetricKey, number>>,
    }));

    const baseline = buildBaseline(sessionData);

    const todayMetrics: Partial<Record<MetricKey, number>> = {
      stroop_interference_ms: results.stroopInterferenceMs,
      stroop_errors: results.stroopErrors,
      switch_cost_ms: results.switchCostMs,
      switch_errors: results.switchErrors,
      pvt_median_rt_ms: results.pvtMedianRtMs,
      pvt_lapses: results.pvtLapses,
      pvt_false_starts: results.pvtFalseStarts,
    };

    const { data: hrvHistory } = await supabase
      .from('neuro_hrv_history')
      .select('*')
      .eq('athlete_id', profile.id)
      .order('date', { ascending: false })
      .limit(60);

    let result: SessionResult | null = null;

    if (baseline && profile.baseline_sessions_count >= 3) {
      const batteryScore = scoreBattery(todayMetrics, baseline);
      const historicalPatterns = analyzeHistoricalPatterns(allSessions || []);
      result = generateSessionResult(batteryScore, context, historicalPatterns, hrvHistory || [], allSessions || []);
    }

    const hrvAnalysis = result?.hrvAnalysis;

    const sessionPayload = {
      athlete_id: profile.id,
      date: dateStr,
      time_of_day: timeStr,
      stroop_interference_ms: results.stroopInterferenceMs,
      stroop_errors: results.stroopErrors,
      switch_cost_ms: results.switchCostMs,
      switch_errors: results.switchErrors,
      pvt_median_rt_ms: results.pvtMedianRtMs,
      pvt_lapses: results.pvtLapses,
      pvt_false_starts: results.pvtFalseStarts,
      sleep_hours: context.sleepHours,
      hard_training_24h: context.trainingLoadStatus === 'high' || context.trainingLoadStatus === 'very_high',
      illness_symptoms: context.illnessSymptoms,
      travel: context.travel,
      is_baseline: profile.baseline_sessions_count < 3,
      test_reason: context.testReason,
      planned_session_type: context.plannedSessionType,
      sleep_quality: context.sleepQuality,
      soreness_level: context.sorenessLevel,
      perceived_fatigue: context.perceivedFatigue,
      training_load_status: context.trainingLoadStatus,
      hrv_7day_avg: context.hrv7dayAvg,
      hrv_status: context.hrvStatus,
      session_call: result?.sessionCall || null,
      primary_risk: result?.primaryRisk || null,
      secondary_risk: result?.secondaryRisk || null,
      action_1: result?.action1 || null,
      action_2: result?.action2 || null,
      what_changed_text: result?.whatChangedText || null,
      what_it_means_text: result?.whatItMeansText || null,
      why_this_matters_text: result?.whyThisMattersText || null,
      control_status: result?.controlStatus || null,
      adapt_status: result?.adaptStatus || null,
      focus_status: result?.focusStatus || null,
      hrv_entries_last_7d: hrvAnalysis?.entriesLast7d || null,
      hrv_baseline_avg: hrvAnalysis?.baselineAvg || null,
      hrv_pct_diff_from_baseline: hrvAnalysis?.percentDiff || null,
      hrv_trend_category: hrvAnalysis?.trendCategory || null,
      hrv_confidence: hrvAnalysis?.confidence || null,
      hrv_interpretation: hrvAnalysis?.interpretation || null,
      hrv_supports_readiness: hrvAnalysis?.supportsReadiness || null,
      hrv_concerns_recovery: hrvAnalysis?.concernsRecovery || null,
      hrv_text_summary: hrvAnalysis?.textSummary || null,
    };

    if (existingSession) {
      const { error } = await supabase
        .from('neuro_sessions')
        .update(sessionPayload)
        .eq('id', existingSession.id);

      if (error) {
        console.error('Error updating session:', error);
        return;
      }
    } else {
      const { error } = await supabase.from('neuro_sessions').insert(sessionPayload);

      if (error) {
        console.error('Error inserting session:', error);
        return;
      }
    }

    if (profile.baseline_sessions_count < 3) {
      const newCount = profile.baseline_sessions_count + 1;
      await supabase
        .from('neuro_profiles')
        .update({
          baseline_sessions_count: newCount,
          onboarding_complete: newCount >= 3,
        })
        .eq('id', profile.id);

      await refreshProfile();
    }

    if (result) {
      setSessionResult(result);
      setView('results');
    } else {
      setView('dashboard');
    }
    } catch {
      setSaveError('Failed to save your session. Please try again.');
      setView('dashboard');
    } finally {
      setSaving(false);
    }
  };

  const handleResultsContinue = () => {
    setSessionResult(null);
    setView('dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-400 text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  if (saving) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-400 text-lg">Saving your results...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return <Auth />;
  }

  if (profile.role === 'admin') {
    return <AdminDashboard />;
  }

  if (view === 'onboarding') {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  if (view === 'testing') {
    return <TestBattery onComplete={handleTestComplete} onCancel={() => setView('dashboard')} existingHrvAnalysis={preTestHrvAnalysis} />;
  }

  if (view === 'results' && sessionResult) {
    return <SessionResultScreen result={sessionResult} hrvAnalysis={sessionResult.hrvAnalysis} onContinue={handleResultsContinue} />;
  }

  return <AthleteDashboard onStartTest={handleStartTest} />;
}

export default function App() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-gray-900 border border-red-500/20 rounded-lg p-8">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-8 h-8 text-red-500 flex-shrink-0 mt-1" />
            <div>
              <h1 className="text-2xl font-bold text-white mb-3">Configuration Error</h1>
              <p className="text-gray-300 mb-4">
                Missing Supabase environment variables. Please add the following to your deployment:
              </p>
              <div className="bg-gray-950 border border-gray-800 rounded p-4 mb-4">
                <p className="text-sm text-gray-400 mb-2 font-mono">VITE_SUPABASE_URL</p>
                <p className="text-sm text-gray-400 font-mono">VITE_SUPABASE_ANON_KEY</p>
              </div>
              <p className="text-gray-400 text-sm">
                If you're using Vercel, add these in <span className="font-mono text-blue-400">Settings → Environment Variables</span> and redeploy.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <DbHealthProvider>
      <DbStatusBanner />
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </DbHealthProvider>
  );
}
