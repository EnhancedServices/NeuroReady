import { useState, useEffect } from 'react';
import { Session } from '../types';
import { supabase } from '../lib/supabase';
import {
  scoreBattery,
  buildBaseline,
  SessionData,
  Baseline,
  Light,
  TestScore,
  BatteryScore,
} from '../lib/scoring';
import { ArrowLeft, Clock, Moon, Zap, AlertTriangle, Plane } from 'lucide-react';

interface SessionDetailsProps {
  session: Session;
  onBack: () => void;
}

export function SessionDetails({ session, onBack }: SessionDetailsProps) {
  const [batteryScore, setBatteryScore] = useState<BatteryScore | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAndScore();
  }, [session.id]);

  const loadAndScore = async () => {
    const { data: allSessions, error } = await supabase
      .from('neuro_sessions')
      .select('*')
      .eq('athlete_id', session.athlete_id)
      .lte('date', session.date)
      .order('date', { ascending: false });

    if (error || !allSessions) {
      console.error('Error loading sessions:', error);
      setLoading(false);
      return;
    }

    const sessionData: SessionData[] = allSessions.map((s) => ({
      dateISO: s.date,
      metrics: {
        stroop_interference_ms: s.stroop_interference_ms ?? undefined,
        stroop_errors: s.stroop_errors ?? undefined,
        switch_cost_ms: s.switch_cost_ms ?? undefined,
        switch_errors: s.switch_errors ?? undefined,
        pvt_median_rt_ms: s.pvt_median_rt_ms ?? undefined,
        pvt_lapses: s.pvt_lapses ?? undefined,
        pvt_false_starts: s.pvt_false_starts ?? undefined,
      },
      tags: {
        sleepHours: s.sleep_hours ?? undefined,
        hardTraining24h: s.hard_training_24h ?? undefined,
        illnessSymptoms: s.illness_symptoms ?? undefined,
        travel: s.travel ?? undefined,
      },
    }));

    const baseline: Baseline | null = buildBaseline(sessionData);

    if (!baseline) {
      setLoading(false);
      return;
    }

    const todayMetrics = sessionData[0].metrics;
    const score = scoreBattery(todayMetrics, baseline);
    setBatteryScore(score);
    setLoading(false);
  };

  const lightColor = (light: Light) => {
    switch (light) {
      case 'green':
        return 'text-green-400 bg-green-950 border-green-800';
      case 'amber':
        return 'text-yellow-400 bg-yellow-950 border-yellow-800';
      case 'red':
        return 'text-red-400 bg-red-950 border-red-800';
    }
  };

  const lightBgGradient = (light: Light) => {
    switch (light) {
      case 'green':
        return 'from-green-600 to-green-700';
      case 'amber':
        return 'from-yellow-600 to-yellow-700';
      case 'red':
        return 'from-red-600 to-red-700';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-400 text-lg">Loading results...</p>
        </div>
      </div>
    );
  }

  if (!batteryScore) {
    return (
      <div className="min-h-screen bg-gray-950 p-4 py-8">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Sessions</span>
          </button>
          <div className="bg-gray-900 rounded-xl p-8 border border-gray-800 text-center">
            <p className="text-gray-400 text-lg">
              Not enough baseline data to calculate scores for this session.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const renderTestCard = (test: TestScore) => (
    <div
      key={test.name}
      className={`bg-gray-900 rounded-xl p-6 border ${lightColor(test.light)}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold text-white mb-1">{test.label}</h3>
          <p className="text-sm text-gray-400">{test.summary}</p>
        </div>
        <div className={`text-3xl font-bold ${test.light === 'green' ? 'text-green-400' : test.light === 'amber' ? 'text-yellow-400' : 'text-red-400'}`}>
          {test.score}
        </div>
      </div>

      <div className="mb-4">
        <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r ${lightBgGradient(test.light)} transition-all duration-500`}
            style={{ width: `${test.score}%` }}
          ></div>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        {test.metrics.map((metric) => (
          <div key={metric.key} className="flex items-center justify-between text-sm">
            <span className="text-gray-400 capitalize">
              {metric.key.replace(/_/g, ' ').replace(/ms$/, ' (ms)').replace(/\s+$/, '')}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-white font-medium">{Math.round(metric.value)}</span>
              <span className={`text-xs ${metric.z <= 0.75 ? 'text-green-400' : metric.z <= 1.5 ? 'text-yellow-400' : 'text-red-400'}`}>
                (z: {metric.z.toFixed(2)})
              </span>
            </div>
          </div>
        ))}
      </div>

      {test.actions.length > 0 && (
        <div className="pt-4 border-t border-gray-800">
          <h4 className="text-sm font-semibold text-gray-300 mb-2">Recommendations</h4>
          <ul className="space-y-1">
            {test.actions.map((action, idx) => (
              <li key={idx} className="text-sm text-gray-400 flex items-start gap-2">
                <span className="text-blue-400 mt-1">•</span>
                <span>{action}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 p-4 py-8">
      <div className="max-w-5xl mx-auto">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Sessions</span>
        </button>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-white">
              {new Date(session.date).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </h1>
            {session.time_of_day && (
              <div className="flex items-center gap-2 text-gray-400">
                <Clock className="w-5 h-5" />
                <span>
                  {new Date(`2000-01-01T${session.time_of_day}`).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            {session.sleep_hours && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-950 border border-blue-800 rounded-lg">
                <Moon className="w-4 h-4 text-blue-400" />
                <span className="text-sm text-blue-300">{session.sleep_hours}h sleep</span>
              </div>
            )}
            {session.hard_training_24h && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-950 border border-yellow-800 rounded-lg">
                <Zap className="w-4 h-4 text-yellow-400" />
                <span className="text-sm text-yellow-300">Hard training</span>
              </div>
            )}
            {session.illness_symptoms && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-red-950 border border-red-800 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span className="text-sm text-red-300">Illness symptoms</span>
              </div>
            )}
            {session.travel && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg">
                <Plane className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-300">Travel</span>
              </div>
            )}
            {session.is_baseline && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-950 border border-green-800 rounded-lg">
                <span className="text-sm text-green-300 font-medium">Baseline</span>
              </div>
            )}
          </div>
        </div>

        <div
          className={`bg-gradient-to-br ${lightBgGradient(batteryScore.overallLight)} rounded-xl p-8 mb-8 shadow-xl`}
        >
          <div className="text-center">
            <div className="text-white/80 text-sm font-semibold uppercase tracking-wider mb-2">
              Overall Readiness
            </div>
            <div className="text-white text-6xl font-bold mb-3">
              {batteryScore.overallScore}
            </div>
            <div className="text-white text-xl font-medium mb-4">
              {batteryScore.headline}
            </div>
            {batteryScore.actions.length > 0 && (
              <div className="bg-black/20 rounded-lg p-4 text-left max-w-lg mx-auto">
                <h4 className="text-white font-semibold mb-2 text-sm">Action Steps</h4>
                <ul className="space-y-1">
                  {batteryScore.actions.map((action, idx) => (
                    <li key={idx} className="text-white/90 text-sm flex items-start gap-2">
                      <span className="text-white/60 mt-0.5">•</span>
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-4">Test Results</h2>
        </div>

        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-1">
          {batteryScore.tests.map((test) => renderTestCard(test))}
        </div>
      </div>
    </div>
  );
}
