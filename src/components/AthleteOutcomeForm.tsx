import { useState } from 'react';
import { X, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type {
  Session,
  SessionCompleted,
  FuelingCompliance,
  PacingExecution,
  RpeOutcome,
  AthleteOutcome,
} from '../types';

interface AthleteOutcomeFormProps {
  session: Session;
  onComplete: () => void;
  onCancel: () => void;
}

export function AthleteOutcomeForm({ session, onComplete, onCancel }: AthleteOutcomeFormProps) {
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
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const canSubmit =
    sessionCompleted !== null &&
    fuelingCompliance !== null &&
    pacingExecution !== null &&
    rpeOutcome !== null;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setSaving(true);

    const outcome: AthleteOutcome = {
      sessionCompleted: sessionCompleted!,
      fuelingCompliance: fuelingCompliance!,
      pacingExecution: pacingExecution!,
      rpeOutcome: rpeOutcome!,
      athleteNote,
    };

    const { error } = await supabase
      .from('neuro_sessions')
      .update({
        session_completed: outcome.sessionCompleted,
        fueling_compliance: outcome.fuelingCompliance,
        pacing_execution: outcome.pacingExecution,
        rpe_outcome: outcome.rpeOutcome,
        athlete_note: outcome.athleteNote || null,
        athlete_outcome_at: new Date().toISOString(),
      })
      .eq('id', session.id);

    setSaving(false);

    if (error) {
      console.error('Error saving outcome:', error);
      return;
    }

    setSaved(true);
    setTimeout(() => {
      onComplete();
    }, 1500);
  };

  if (saved) {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">Outcome logged</h3>
          <p className="text-gray-400">Thanks for the feedback!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 max-w-lg w-full my-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">Log session outcome</h3>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-white font-semibold mb-3">How did the session go?</label>
            <div className="grid grid-cols-1 gap-2">
              {([
                { value: 'completed_as_planned', label: 'Completed as planned' },
                { value: 'modified', label: 'Modified the session' },
                { value: 'abandoned', label: 'Abandoned / cut short' },
              ] as { value: SessionCompleted; label: string }[]).map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setSessionCompleted(value)}
                  className={`py-3 px-4 rounded-lg font-medium text-left transition-all ${
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

          <div>
            <label className="block text-white font-semibold mb-3">Fueling</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setFuelingCompliance('hit')}
                className={`py-3 rounded-lg font-medium transition-all ${
                  fuelingCompliance === 'hit'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                Hit targets
              </button>
              <button
                onClick={() => setFuelingCompliance('missed')}
                className={`py-3 rounded-lg font-medium transition-all ${
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
            <label className="block text-white font-semibold mb-3">Pacing</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setPacingExecution('good')}
                className={`py-3 rounded-lg font-medium transition-all ${
                  pacingExecution === 'good'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                Felt good
              </button>
              <button
                onClick={() => setPacingExecution('poor')}
                className={`py-3 rounded-lg font-medium transition-all ${
                  pacingExecution === 'poor'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                Felt poor
              </button>
            </div>
          </div>

          <div>
            <label className="block text-white font-semibold mb-3">RPE compared to expected</label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { value: 'easier', label: 'Easier' },
                { value: 'as_expected', label: 'As expected' },
                { value: 'harder', label: 'Harder' },
              ] as { value: RpeOutcome; label: string }[]).map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setRpeOutcome(value)}
                  className={`py-3 rounded-lg font-medium transition-all ${
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
            <label className="block text-white font-semibold mb-3">
              Notes <span className="text-gray-500 font-normal">(optional)</span>
            </label>
            <textarea
              value={athleteNote}
              onChange={(e) => setAthleteNote(e.target.value)}
              placeholder="Any additional context..."
              rows={3}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-8">
          <button
            onClick={onCancel}
            className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || saving}
            className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors"
          >
            {saving ? 'Saving...' : 'Save outcome'}
          </button>
        </div>
      </div>
    </div>
  );
}
