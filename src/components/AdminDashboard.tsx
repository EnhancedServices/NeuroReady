import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth-context';
import type { Session, Profile, AthleteFlag } from '../types';
import { SESSION_CALL_LABELS, FLAG_TYPE_LABELS } from '../types';
import {
  LogOut,
  Users,
  AlertTriangle,
  Trash2,
  X,
  ChevronRight,
  UserPlus,
  RefreshCw,
  Activity,
  Shield,
} from 'lucide-react';
import { AthleteDeepInsight } from './AthleteDeepInsight';
import { checkAndCreateFlags } from '../lib/flag-detection';
import logo from '../assets/logo26.png';

interface DeleteModalProps {
  athlete: Profile;
  onConfirm: () => void;
  onCancel: () => void;
  deleting: boolean;
}

function DeleteModal({ athlete, onConfirm, onCancel, deleting }: DeleteModalProps) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-red-500/30 rounded-xl max-w-md w-full p-6 shadow-2xl">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 rounded-full bg-red-500/15 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white mb-1">Delete User</h3>
            <p className="text-gray-400 text-sm">
              This will permanently delete{' '}
              <span className="text-white font-semibold">
                {athlete.full_name || athlete.email}
              </span>{' '}
              and all their session data.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={deleting}
            className="flex-1 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
          >
            {deleting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                Delete
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

interface InviteModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

function InviteModal({ onClose, onSuccess }: InviteModalProps) {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInvite = async () => {
    if (!email) return;
    setSending(true);
    setError(null);

    try {
      const normalizedEmail = email.trim().toLowerCase();

      const { data: existing } = await supabase
        .from('athletes')
        .select('id')
        .eq('email', normalizedEmail)
        .maybeSingle();

      let athleteId: string;
      if (existing) {
        athleteId = existing.id;
      } else {
        const { data: newAthlete, error: athleteErr } = await supabase
          .from('athletes')
          .insert({ email: normalizedEmail, name: fullName || null })
          .select('id')
          .single();
        if (athleteErr) throw new Error(athleteErr.message);
        athleteId = newAthlete.id;
      }

      const { data: existingAccess } = await supabase
        .from('athlete_app_access')
        .select('id')
        .eq('athlete_id', athleteId)
        .eq('app_name', 'neuroready')
        .maybeSingle();

      if (!existingAccess) {
        const { error: accessErr } = await supabase
          .from('athlete_app_access')
          .insert({ athlete_id: athleteId, app_name: 'neuroready' });
        if (accessErr) throw new Error(accessErr.message);
      }

      setSent(true);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }

    setSending(false);
  };

  if (sent) {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl max-w-md w-full p-6">
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
              <UserPlus className="w-6 h-6 text-green-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Athlete added!</h3>
            <p className="text-gray-400 mb-6">
              <span className="text-white">{email}</span> has been granted access. Create their auth account in Supabase dashboard to enable login.
            </p>
            <button
              onClick={onClose}
              className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">Add athlete</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="mb-4">
          <label className="block text-sm text-gray-400 mb-2">Email address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="athlete@example.com"
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm text-gray-400 mb-2">Full name (optional)</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="John Smith"
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
          />
        </div>

        {error && (
          <p className="text-red-400 text-sm mb-4">{error}</p>
        )}

        <button
          onClick={handleInvite}
          disabled={!email || sending}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-lg transition-colors"
        >
          {sending ? 'Adding...' : 'Add athlete'}
        </button>
      </div>
    </div>
  );
}

function SessionCallBadge({ call }: { call: string | null }) {
  if (!call) return <span className="text-gray-500 text-xs">-</span>;

  const colors: Record<string, string> = {
    ready_for_quality: 'bg-green-500/20 text-green-400',
    ready_with_guardrails: 'bg-blue-500/20 text-blue-400',
    better_suited_to_steady_work: 'bg-yellow-500/20 text-yellow-400',
    recovery_day_preferred: 'bg-red-500/20 text-red-400',
  };

  const shortLabels: Record<string, string> = {
    ready_for_quality: 'Ready',
    ready_with_guardrails: 'Guardrails',
    better_suited_to_steady_work: 'Steady',
    recovery_day_preferred: 'Recovery',
  };

  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded ${colors[call] || 'bg-gray-700'}`}>
      {shortLabels[call] || call}
    </span>
  );
}

export function AdminDashboard() {
  const { signOut } = useAuth();
  const [athletes, setAthletes] = useState<Profile[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [flags, setFlags] = useState<AthleteFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Profile | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [selectedAthlete, setSelectedAthlete] = useState<Profile | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [runningFlagCheck, setRunningFlagCheck] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);

    const [athletesRes, sessionsRes, flagsRes] = await Promise.all([
      supabase.from('neuro_profiles').select('*').eq('role', 'athlete').order('created_at', { ascending: false }),
      supabase.from('neuro_sessions').select('*').order('date', { ascending: false }).limit(100),
      supabase.from('neuro_athlete_flags').select('*').is('resolved_at', null),
    ]);

    if (!athletesRes.error) setAthletes(athletesRes.data || []);
    if (!sessionsRes.error) setSessions(sessionsRes.data || []);
    if (!flagsRes.error) setFlags(flagsRes.data || []);

    setLoading(false);
  };

  const runFlagCheck = async () => {
    setRunningFlagCheck(true);
    for (const athlete of athletes) {
      await checkAndCreateFlags(athlete.id);
    }
    await loadData();
    setRunningFlagCheck(false);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);

    try {
      const { data: sharedAthlete } = await supabase
        .from('athletes')
        .select('id')
        .eq('email', deleteTarget.email)
        .maybeSingle();

      if (sharedAthlete) {
        const { error: deleteErr } = await supabase
          .from('athlete_app_access')
          .delete()
          .eq('athlete_id', sharedAthlete.id);
        if (deleteErr) throw new Error(deleteErr.message);
      }

      setAthletes((prev) => prev.filter((a) => a.id !== deleteTarget.id));
      setSessions((prev) => prev.filter((s) => s.athlete_id !== deleteTarget.id));
      setFlags((prev) => prev.filter((f) => f.athlete_id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'An unexpected error occurred');
    }

    setDeleting(false);
  };

  const athleteFlagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const flag of flags) {
      counts[flag.athlete_id] = (counts[flag.athlete_id] || 0) + 1;
    }
    return counts;
  }, [flags]);

  const sortedAthletes = useMemo(() => {
    return [...athletes].sort((a, b) => {
      const aFlags = athleteFlagCounts[a.id] || 0;
      const bFlags = athleteFlagCounts[b.id] || 0;
      if (aFlags !== bFlags) return bFlags - aFlags;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [athletes, athleteFlagCounts]);

  const getLatestSession = (athleteId: string) => {
    return sessions.find((s) => s.athlete_id === athleteId);
  };

  const getSessionCount = (athleteId: string) => {
    return sessions.filter((s) => s.athlete_id === athleteId).length;
  };

  const sessionCallDistribution = useMemo(() => {
    const dist: Record<string, number> = {
      ready_for_quality: 0,
      ready_with_guardrails: 0,
      better_suited_to_steady_work: 0,
      recovery_day_preferred: 0,
    };
    const recentSessions = sessions.filter((s) => !s.is_baseline && s.session_call).slice(0, 50);
    for (const s of recentSessions) {
      if (s.session_call && dist[s.session_call] !== undefined) {
        dist[s.session_call]++;
      }
    }
    return dist;
  }, [sessions]);

  if (selectedAthlete) {
    return (
      <AthleteDeepInsight
        athlete={selectedAthlete}
        onBack={() => {
          setSelectedAthlete(null);
          loadData();
        }}
      />
    );
  }

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
    <div className="min-h-screen bg-gray-950">
      {deleteTarget && (
        <DeleteModal
          athlete={deleteTarget}
          onConfirm={handleDeleteConfirm}
          onCancel={() => {
            setDeleteTarget(null);
            setDeleteError(null);
          }}
          deleting={deleting}
        />
      )}

      {showInvite && <InviteModal onClose={() => setShowInvite(false)} onSuccess={loadData} />}

      <header className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Logo" className="w-9 h-9" />
            <h1 className="text-2xl font-bold text-white">Coach Dashboard</h1>
          </div>
          <button
            onClick={signOut}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {deleteError && (
          <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            {deleteError}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-5 h-5 text-blue-400" />
              <span className="text-gray-400 text-sm">Athletes</span>
            </div>
            <p className="text-3xl font-bold text-white">{athletes.length}</p>
          </div>

          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-5 h-5 text-green-400" />
              <span className="text-gray-400 text-sm">Total sessions</span>
            </div>
            <p className="text-3xl font-bold text-white">{sessions.length}</p>
          </div>

          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <span className="text-gray-400 text-sm">Active flags</span>
            </div>
            <p className="text-3xl font-bold text-white">{flags.length}</p>
          </div>

          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-5 h-5 text-yellow-400" />
              <span className="text-gray-400 text-sm">Athletes flagged</span>
            </div>
            <p className="text-3xl font-bold text-white">
              {Object.keys(athleteFlagCounts).length}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 bg-gray-900 rounded-xl p-6 border border-gray-800">
            <h2 className="text-lg font-semibold text-white mb-4">Readiness distribution (recent)</h2>
            <div className="space-y-3">
              {(
                [
                  'ready_for_quality',
                  'ready_with_guardrails',
                  'better_suited_to_steady_work',
                  'recovery_day_preferred',
                ] as const
              ).map((call) => {
                const count = sessionCallDistribution[call];
                const total =
                  Object.values(sessionCallDistribution).reduce((a, b) => a + b, 0) || 1;
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
            <h2 className="text-lg font-semibold text-white mb-4">Active flags</h2>
            {flags.length === 0 ? (
              <p className="text-gray-500 text-sm">No active flags</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {flags.slice(0, 5).map((flag) => {
                  const athlete = athletes.find((a) => a.id === flag.athlete_id);
                  return (
                    <div
                      key={flag.id}
                      className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg cursor-pointer hover:bg-red-500/15 transition-colors"
                      onClick={() => athlete && setSelectedAthlete(athlete)}
                    >
                      <p className="text-white text-sm font-medium">
                        {athlete?.full_name || athlete?.email || 'Unknown'}
                      </p>
                      <p className="text-xs text-red-400">{FLAG_TYPE_LABELS[flag.flag_type]}</p>
                    </div>
                  );
                })}
              </div>
            )}
            <button
              onClick={runFlagCheck}
              disabled={runningFlagCheck}
              className="w-full mt-4 flex items-center justify-center gap-2 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-300 text-sm rounded-lg transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${runningFlagCheck ? 'animate-spin' : ''}`} />
              {runningFlagCheck ? 'Checking...' : 'Run flag check'}
            </button>
          </div>
        </div>

        <div className="bg-gray-900 rounded-xl border border-gray-800">
          <div className="flex items-center justify-between p-6 border-b border-gray-800">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5" />
              Athletes ({athletes.length})
            </h2>
            <button
              onClick={() => setShowInvite(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Add athlete
            </button>
          </div>

          {sortedAthletes.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No athletes yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {sortedAthletes.map((athlete) => {
                const flagCount = athleteFlagCounts[athlete.id] || 0;
                const latestSession = getLatestSession(athlete.id);
                const sessionCount = getSessionCount(athlete.id);

                return (
                  <div
                    key={athlete.id}
                    className="flex items-center justify-between p-4 hover:bg-gray-800/50 transition-colors group"
                  >
                    <div
                      className="flex items-center gap-4 flex-1 cursor-pointer"
                      onClick={() => setSelectedAthlete(athlete)}
                    >
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-white font-semibold">
                          {(athlete.full_name || athlete.email).charAt(0).toUpperCase()}
                        </div>
                        {flagCount > 0 && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                            <span className="text-xs text-white font-bold">{flagCount}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">
                          {athlete.full_name || athlete.email}
                        </p>
                        <div className="flex items-center gap-3 text-sm text-gray-500">
                          <span>{sessionCount} sessions</span>
                          <span>Baseline: {athlete.baseline_sessions_count}/3</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {latestSession && (
                        <div className="text-right hidden sm:block">
                          <SessionCallBadge call={latestSession.session_call} />
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(latestSession.date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </p>
                        </div>
                      )}

                      <button
                        onClick={() => setSelectedAthlete(athlete)}
                        className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget(athlete);
                          setDeleteError(null);
                        }}
                        className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
