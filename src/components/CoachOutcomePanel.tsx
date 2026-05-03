import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth-context';
import { Save, X, MessageSquare } from 'lucide-react';
import type {
  Session,
  HrDriftFlag,
  ExecutionQuality,
  ReadinessCallMatched,
  SessionCompleted,
  FuelingCompliance,
  PacingExecution,
  RpeOutcome,
} from '../types';
import { SESSION_CALL_LABELS, PLANNED_SESSION_LABELS } from '../types';

interface CoachOutcomePanelProps {
  session: Session;
  onClose: () => void;
  onUpdate: () => void;
}

export function CoachOutcomePanel({ session, onClose, onUpdate }: CoachOutcomePanelProps) {
  const { profile } = useAuth();
  const [saving, setSaving] = useState(false);

  const [sessionCompleted, setSessionCompleted] = useState<SessionCompleted | null>(
    session.session_completed || null
  );
  const [fuelingCompliance, setFuelingCompliance] = useState<FuelingCompliance | null>(
    session.fueling_compliance || null
  );
  const [pacingExecution, setPacingExecution] = useState<PacingExecution | null>(
    session.pacing_execution || null
  );
  const [rpeOutcome, setRpeOutcome] = useState<RpeOutcome | null>(
    session.rpe_outcome || null
  );
  const [athleteNote, setAthleteNote] = useState(session.athlete_note || '');

  const [hrDriftFlag, setHrDriftFlag] = useState<HrDriftFlag | null>(
    session.hr_drift_flag || null
  );
  const [executionQuality, setExecutionQuality] = useState<ExecutionQuality | null>(
    session.execution_quality || null
  );
  const [readinessCallMatched, setReadinessCallMatched] = useState<ReadinessCallMatched | null>(
    session.readiness_call_matched || null
  );
  const [coachNote, setCoachNote] = useState(session.coach_note || '');

  const handleSave = async () => {
    if (!profile) return;

    setSaving(true);

    const { error } = await supabase
      .from('neuro_sessions')
      .update({
        session_completed: sessionCompleted,
        fueling_compliance: fuelingCompliance,
        pacing_execution: pacingExecution,
        rpe_outcome: rpeOutcome,
        athlete_note: athleteNote || null,
        hr_drift_flag: hrDriftFlag,
        execution_quality: executionQuality,
        readiness_call_matched: readinessCallMatched,
        coach_note: coachNote || null,
        coach_outcome_at: new Date().toISOString(),
        coach_outcome_by: profile.id,
      })
      .eq('id', session.id);

    setSaving(false);

    if (error) {
      console.error('Error saving coach outcome:', error);
      return;
    }

    onUpdate();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-gray-900 border border-gray-800 rounded-xl max-w-2xl w-full my-8">
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <MessageSquare className="w-6 h-6 text-blue-400" />
            <div>
              <h2 className="text-xl font-bold text-white">Session Review</h2>
              <p className="text-sm text-gray-400">
                {new Date(session.date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <h3 className="text-sm font-semibold text-gray-400 mb-3">Session context</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Call:</span>{' '}
                <span className="text-white">
                  {session.session_call
                    ? SESSION_CALL_LABELS[session.session_call]
                    : 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Planned:</span>{' '}
                <span className="text-white">
                  {session.planned_session_type
                    ? PLANNED_SESSION_LABELS[session.planned_session_type]
                    : 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Primary risk:</span>{' '}
                <span className="text-white">{session.primary_risk || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-500">Sleep:</span>{' '}
                <span className="text-white">
                  {session.sleep_hours ? `${session.sleep_hours}h` : 'N/A'}
                  {session.sleep_quality && ` (${session.sleep_quality})`}
                </span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-3">Athlete outcome</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Session completion</label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { value: 'completed_as_planned', label: 'As planned' },
                    { value: 'modified', label: 'Modified' },
                    { value: 'abandoned', label: 'Abandoned' },
                  ] as { value: SessionCompleted; label: string }[]).map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setSessionCompleted(value)}
                      className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                        sessionCompleted === value
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Fueling</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setFuelingCompliance('hit')}
                      className={`py-2 rounded-lg text-sm font-medium transition-all ${
                        fuelingCompliance === 'hit'
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      Hit
                    </button>
                    <button
                      onClick={() => setFuelingCompliance('missed')}
                      className={`py-2 rounded-lg text-sm font-medium transition-all ${
                        fuelingCompliance === 'missed'
                          ? 'bg-red-600 text-white'
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      Missed
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Pacing</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setPacingExecution('good')}
                      className={`py-2 rounded-lg text-sm font-medium transition-all ${
                        pacingExecution === 'good'
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      Good
                    </button>
                    <button
                      onClick={() => setPacingExecution('poor')}
                      className={`py-2 rounded-lg text-sm font-medium transition-all ${
                        pacingExecution === 'poor'
                          ? 'bg-red-600 text-white'
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      Poor
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">RPE vs expected</label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { value: 'easier', label: 'Easier' },
                    { value: 'as_expected', label: 'As expected' },
                    { value: 'harder', label: 'Harder' },
                  ] as { value: RpeOutcome; label: string }[]).map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setRpeOutcome(value)}
                      className={`py-2 rounded-lg text-sm font-medium transition-all ${
                        rpeOutcome === value
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Athlete note</label>
                <textarea
                  value={athleteNote}
                  onChange={(e) => setAthleteNote(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 resize-none"
                  placeholder="Athlete's notes..."
                />
              </div>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-6">
            <h3 className="text-white font-semibold mb-3">Coach review</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">HR drift elevated</label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { value: 'no', label: 'No' },
                    { value: 'yes', label: 'Yes' },
                    { value: 'unknown', label: 'Unknown' },
                  ] as { value: HrDriftFlag; label: string }[]).map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setHrDriftFlag(value)}
                      className={`py-2 rounded-lg text-sm font-medium transition-all ${
                        hrDriftFlag === value
                          ? value === 'yes'
                            ? 'bg-red-600 text-white'
                            : value === 'no'
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-600 text-white'
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Execution quality</label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { value: 'good', label: 'Good' },
                    { value: 'fair', label: 'Fair' },
                    { value: 'poor', label: 'Poor' },
                  ] as { value: ExecutionQuality; label: string }[]).map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setExecutionQuality(value)}
                      className={`py-2 rounded-lg text-sm font-medium transition-all ${
                        executionQuality === value
                          ? value === 'good'
                            ? 'bg-green-600 text-white'
                            : value === 'fair'
                            ? 'bg-yellow-600 text-white'
                            : 'bg-red-600 text-white'
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Readiness call matched reality</label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { value: 'yes', label: 'Yes' },
                    { value: 'partially', label: 'Partially' },
                    { value: 'no', label: 'No' },
                  ] as { value: ReadinessCallMatched; label: string }[]).map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setReadinessCallMatched(value)}
                      className={`py-2 rounded-lg text-sm font-medium transition-all ${
                        readinessCallMatched === value
                          ? value === 'yes'
                            ? 'bg-green-600 text-white'
                            : value === 'partially'
                            ? 'bg-yellow-600 text-white'
                            : 'bg-red-600 text-white'
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Coach note</label>
                <textarea
                  value={coachNote}
                  onChange={(e) => setCoachNote(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 resize-none"
                  placeholder="Your interpretation and observations..."
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 p-6 border-t border-gray-800">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-lg transition-colors"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save review'}
          </button>
        </div>
      </div>
    </div>
  );
}
