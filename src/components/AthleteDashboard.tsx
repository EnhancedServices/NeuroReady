import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth-context';
import { supabase } from '../lib/supabase';
import type { Session, DomainStatus } from '../types';
import { SESSION_CALL_LABELS, RISK_TYPE_LABELS } from '../types';
import { LogOut, Play, ClipboardList, ChevronRight, AlertCircle, RefreshCw } from 'lucide-react';
import { AthleteOutcomeForm } from './AthleteOutcomeForm';
import logo from '../assets/logo26.png';

const CALL_COLORS: Record<string, { bar: string; bg: string; text: string; border: string; dot: string }> = {
  ready_for_quality: {
    bar: 'bg-green-500',
    bg: 'bg-green-500/15',
    text: 'text-green-400',
    border: 'border-green-500/30',
    dot: 'bg-green-500',
  },
  ready_with_guardrails: {
    bar: 'bg-blue-500',
    bg: 'bg-blue-500/15',
    text: 'text-blue-400',
    border: 'border-blue-500/30',
    dot: 'bg-blue-500',
  },
  better_suited_to_steady_work: {
    bar: 'bg-yellow-500',
    bg: 'bg-yellow-500/15',
    text: 'text-yellow-400',
    border: 'border-yellow-500/30',
    dot: 'bg-yellow-500',
  },
  recovery_day_preferred: {
    bar: 'bg-red-500',
    bg: 'bg-red-500/15',
    text: 'text-red-400',
    border: 'border-red-500/30',
    dot: 'bg-red-500',
  },
};

const DOMAIN_DOT_COLORS: Record<DomainStatus, string> = {
  green: 'bg-green-500',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
};

const DOMAIN_SVG_COLORS: Record<DomainStatus, string> = {
  green: '#22c55e',
  amber: '#f59e0b',
  red: '#ef4444',
};

function DomainDot({ status }: { status: DomainStatus | null }) {
  if (!status) return <span className="inline-block w-2.5 h-2.5 rounded-full bg-gray-700 flex-shrink-0" />;
  return <span className={`inline-block w-2.5 h-2.5 rounded-full flex-shrink-0 ${DOMAIN_DOT_COLORS[status]}`} />;
}

function SessionCallBadge({ call }: { call: string | null }) {
  if (!call) return null;
  const colors = CALL_COLORS[call];
  const label = SESSION_CALL_LABELS[call as keyof typeof SESSION_CALL_LABELS] || call;
  return (
    <span className={`px-2 py-1 text-xs font-medium rounded border ${colors ? `${colors.bg} ${colors.text} ${colors.border}` : 'bg-gray-700 text-gray-300 border-gray-600'}`}>
      {label}
    </span>
  );
}

function SessionCallBar({ call }: { call: string | null }) {
  const colors = call ? CALL_COLORS[call] : null;
  return (
    <div className={`w-0.5 h-8 rounded-full flex-shrink-0 ${colors ? colors.bar : 'bg-gray-700'}`} />
  );
}

function ReadinessTrend({ sessions }: { sessions: Session[] }) {
  const nonBaseline = [...sessions]
    .filter(s => !s.is_baseline && s.session_call)
    .slice(0, 10)
    .reverse();

  if (nonBaseline.length < 2) return null;

  const counts: Record<string, number> = {};
  for (const s of nonBaseline) {
    if (s.session_call) counts[s.session_call] = (counts[s.session_call] || 0) + 1;
  }

  return (
    <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 mb-6">
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Readiness trend</h2>
      <div className="flex items-end gap-1.5 mb-1">
        {nonBaseline.map((session, i) => {
          const isLatest = i === nonBaseline.length - 1;
          const colors = session.session_call ? CALL_COLORS[session.session_call] : null;
          return (
            <div key={session.id} className="flex flex-col items-center gap-1 flex-1 min-w-0">
              <div
                className={`w-full rounded-sm ${colors ? colors.bar : 'bg-gray-700'}`}
                style={{ height: isLatest ? '28px' : '20px' }}
                title={session.session_call ? SESSION_CALL_LABELS[session.session_call as keyof typeof SESSION_CALL_LABELS] : undefined}
              />
              <span className="text-gray-600 leading-none" style={{ fontSize: '9px' }}>
                {new Date(session.date).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })}
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-gray-800">
        {Object.entries(counts).map(([call, count]) => {
          const colors = CALL_COLORS[call];
          if (!colors) return null;
          return (
            <div key={call} className="flex items-center gap-1.5">
              <span className={`inline-block w-2 h-2 rounded-full ${colors.dot}`} />
              <span className="text-xs text-gray-500">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DomainTrends({ sessions }: { sessions: Session[] }) {
  const scored = [...sessions]
    .filter(s => !s.is_baseline && s.session_call)
    .slice(0, 10)
    .reverse();

  if (scored.length < 3) return null;

  const domains: { key: 'control_status' | 'adapt_status' | 'focus_status'; label: string }[] = [
    { key: 'control_status', label: 'Control' },
    { key: 'adapt_status', label: 'Adapt' },
    { key: 'focus_status', label: 'Focus' },
  ];

  const statusY: Record<DomainStatus, number> = { green: 6, amber: 18, red: 30 };
  const svgW = 100;

  return (
    <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 mb-6">
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Domain trends</h2>
      <div className="space-y-3">
        {domains.map(({ key, label }) => {
          const points = scored.map((s, i) => {
            const status = s[key] as DomainStatus | null;
            const x = scored.length === 1 ? svgW / 2 : (i / (scored.length - 1)) * svgW;
            const y = status ? statusY[status] : 18;
            return { x, y, status };
          });
          const latest = scored[scored.length - 1][key] as DomainStatus | null;
          const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y}`).join(' ');

          return (
            <div key={key} className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 w-16 flex-shrink-0">
                <DomainDot status={latest} />
                <span className="text-xs text-gray-400">{label}</span>
              </div>
              <svg viewBox={`0 0 ${svgW} 36`} className="flex-1 h-6" preserveAspectRatio="none">
                <path d={pathD} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="1.5" />
                {points.map((p, i) => (
                  <circle
                    key={i}
                    cx={p.x.toFixed(1)}
                    cy={p.y}
                    r="2.5"
                    fill={p.status ? DOMAIN_SVG_COLORS[p.status] : '#374151'}
                  />
                ))}
              </svg>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LatestSessionCard({
  session,
  onLogOutcome,
}: {
  session: Session;
  onLogOutcome: () => void;
}) {
  const colors = session.session_call ? CALL_COLORS[session.session_call] : null;

  return (
    <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">Latest check</h2>
        <span className="text-sm text-gray-500">
          {new Date(session.date).toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          })}
        </span>
      </div>

      {session.session_call && colors && (
        <div className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-semibold mb-4 ${colors.bg} ${colors.text} border ${colors.border}`}>
          {SESSION_CALL_LABELS[session.session_call as keyof typeof SESSION_CALL_LABELS]}
        </div>
      )}

      {session.what_changed_text && (
        <p className="text-gray-300 text-sm mb-3 leading-relaxed">{session.what_changed_text}</p>
      )}

      {session.primary_risk && (
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs text-gray-500">Primary risk:</span>
          <span className="text-xs text-gray-300 font-medium">
            {RISK_TYPE_LABELS[session.primary_risk]}
          </span>
        </div>
      )}

      {(session.control_status || session.adapt_status || session.focus_status) && (
        <div className="flex items-center gap-4 mb-4">
          {[
            { label: 'Control', status: session.control_status },
            { label: 'Adapt', status: session.adapt_status },
            { label: 'Focus', status: session.focus_status },
          ].map(({ label, status }) => (
            <div key={label} className="flex items-center gap-1.5">
              <DomainDot status={status as DomainStatus | null} />
              <span className="text-xs text-gray-500">{label}</span>
            </div>
          ))}
        </div>
      )}

      {!session.session_completed && session.session_call && (
        <button
          onClick={onLogOutcome}
          className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
        >
          Log how the session went →
        </button>
      )}
      {session.session_completed && (
        <span className="text-xs text-green-400">Outcome logged</span>
      )}
    </div>
  );
}

interface AthleteDashboardProps {
  onStartTest?: () => void;
}

export function AthleteDashboard({ onStartTest }: AthleteDashboardProps) {
  const { profile, signOut } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [outcomeSession, setOutcomeSession] = useState<Session | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    if (!profile) return;
    setLoadError(null);
    setLoading(true);

    const { data, error } = await supabase
      .from('neuro_sessions')
      .select('*')
      .eq('athlete_id', profile.id)
      .order('date', { ascending: false })
      .limit(20);

    if (error) {
      setLoadError('Failed to load sessions. Please try again.');
      setLoading(false);
      return;
    }

    setSessions(data || []);
    setLoading(false);
  };

  const handleOutcomeComplete = () => {
    setOutcomeSession(null);
    loadSessions();
  };

  const recentSessionsWithoutOutcome = sessions.filter(
    s => !s.is_baseline && s.session_call && !s.session_completed
  );

  const mostRecentSession = sessions[0];
  const scoredSessions = sessions.filter(s => !s.is_baseline && s.session_call);
  const greenCount = scoredSessions.filter(s => s.session_call === 'ready_for_quality').length;
  const greenRate = scoredSessions.length > 0 ? Math.round((greenCount / scoredSessions.length) * 100) : null;

  const visibleSessions = showAll ? sessions : sessions.slice(0, 5);
  const hiddenCount = sessions.length - 5;

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

  return (
    <div className="min-h-screen bg-gray-950 p-4 py-8">
      {outcomeSession && (
        <AthleteOutcomeForm
          session={outcomeSession}
          onComplete={handleOutcomeComplete}
          onCancel={() => setOutcomeSession(null)}
        />
      )}

      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <img src={logo} alt="Logo" className="w-10 h-10 flex-shrink-0" />
            <div>
              <h1 className="text-3xl font-bold text-white">
                {profile?.full_name || 'Athlete'}
              </h1>
              <p className="text-gray-400">Readiness check</p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800 mb-6">
          <p className="text-gray-400 mb-4">
            Use before a key session or when something feels off.
          </p>
          <button
            onClick={onStartTest}
            className="w-full flex items-center justify-center gap-3 py-5 bg-blue-600 hover:bg-blue-700 text-white text-xl font-bold rounded-xl transition-colors"
          >
            <Play className="w-6 h-6" />
            Start readiness check
          </button>
        </div>

        {loadError && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-5 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-white font-semibold mb-1">Could not load sessions</p>
                <p className="text-gray-400 text-sm mb-3">{loadError}</p>
                <button
                  onClick={loadSessions}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors text-sm"
                >
                  <RefreshCw className="w-4 h-4" />
                  Retry
                </button>
              </div>
            </div>
          </div>
        )}

        {recentSessionsWithoutOutcome.length > 0 && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-5 mb-6">
            <div className="flex items-start gap-3">
              <ClipboardList className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-white font-semibold mb-1">Log your session outcome</h3>
                <p className="text-gray-400 text-sm mb-3">
                  Help improve your recommendations by logging how training went.
                </p>
                <button
                  onClick={() => setOutcomeSession(recentSessionsWithoutOutcome[0])}
                  className="flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white font-medium rounded-lg transition-colors"
                >
                  Log outcome
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {mostRecentSession && mostRecentSession.session_call && (
          <LatestSessionCard
            session={mostRecentSession}
            onLogOutcome={() => setOutcomeSession(mostRecentSession)}
          />
        )}

        <ReadinessTrend sessions={sessions} />
        <DomainTrends sessions={sessions} />

        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <h2 className="text-lg font-semibold text-white mb-4">Session history</h2>
          {sessions.length === 0 ? (
            <p className="text-gray-500">No sessions yet</p>
          ) : (
            <>
              <div className="space-y-2">
                {visibleSessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <SessionCallBar call={session.is_baseline ? null : session.session_call} />
                      <div>
                        <p className="text-white font-medium">
                          {new Date(session.date).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </p>
                        {session.is_baseline && (
                          <span className="text-xs text-blue-400">Baseline</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {session.session_call ? (
                        <SessionCallBadge call={session.session_call} />
                      ) : session.is_baseline ? (
                        <span className="text-xs text-gray-500">Building baseline</span>
                      ) : null}
                      {!session.is_baseline && session.session_call && !session.session_completed && (
                        <button
                          onClick={() => setOutcomeSession(session)}
                          className="text-xs text-blue-400 hover:text-blue-300"
                        >
                          Log
                        </button>
                      )}
                      {session.session_completed && (
                        <span className="text-xs text-green-400">Logged</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {!showAll && hiddenCount > 0 && (
                <button
                  onClick={() => setShowAll(true)}
                  className="w-full mt-3 py-2.5 text-sm text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 rounded-lg transition-colors"
                >
                  Show more ({hiddenCount})
                </button>
              )}
              {showAll && sessions.length > 5 && (
                <button
                  onClick={() => setShowAll(false)}
                  className="w-full mt-3 py-2.5 text-sm text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 rounded-lg transition-colors"
                >
                  Show less
                </button>
              )}
            </>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 text-center">
            <div className="text-3xl font-bold text-blue-400 mb-1">{sessions.length}</div>
            <div className="text-xs text-gray-500">Total tests</div>
          </div>
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 text-center">
            <div className="text-3xl font-bold text-green-400 mb-1">
              {greenRate !== null ? `${greenRate}%` : '—'}
            </div>
            <div className="text-xs text-gray-500">Green rate</div>
          </div>
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 text-center">
            <div className="text-3xl font-bold text-yellow-400 mb-1">
              {sessions.filter(s => s.session_completed).length}
            </div>
            <div className="text-xs text-gray-500">Outcomes logged</div>
          </div>
        </div>
      </div>
    </div>
  );
}
