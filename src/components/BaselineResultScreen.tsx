import { CheckCircle, Clock, Zap, Eye, ArrowRight } from 'lucide-react';

interface BaselineResultScreenProps {
  stroopInterferenceMs: number;
  stroopErrors: number;
  switchCostMs: number;
  switchErrors: number;
  pvtMedianRtMs: number;
  pvtLapses: number;
  pvtFalseStarts: number;
  baselineCount: number; // how many baselines completed (including this one)
  baselineTarget: number; // how many needed total
  onContinue: () => void;
}

export function BaselineResultScreen({
  stroopInterferenceMs,
  stroopErrors,
  switchCostMs,
  switchErrors,
  pvtMedianRtMs,
  pvtLapses,
  pvtFalseStarts,
  baselineCount,
  baselineTarget,
  onContinue,
}: BaselineResultScreenProps) {
  const complete = baselineCount >= baselineTarget;

  return (
    <div className="min-h-screen bg-gray-950 p-4 py-8">
      <div className="max-w-lg mx-auto">
        {/* Progress */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-500/15 mb-4">
            <CheckCircle className="w-8 h-8 text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            Baseline {baselineCount} of {baselineTarget} complete
          </h1>
          <p className="text-gray-400">
            {complete
              ? 'Baseline built. Your next check will give you a full readiness report.'
              : `One more check-in to build your personal baseline. Come back before your next key session.`}
          </p>
        </div>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex justify-between text-xs text-gray-500 mb-1.5">
            <span>Baseline progress</span>
            <span>{baselineCount} / {baselineTarget}</span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${(baselineCount / baselineTarget) * 100}%` }}
            />
          </div>
        </div>

        {/* Raw numbers */}
        <div className="bg-gray-900 rounded-xl p-5 border border-gray-800 mb-6">
          <h2 className="text-sm font-semibold text-gray-400 mb-4">Your numbers today</h2>
          <div className="space-y-4">
            {/* Stroop */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Zap className="w-4 h-4 text-red-400" />
              </div>
              <div className="flex-1">
                <p className="text-white text-sm font-medium">Impulse control (Stroop)</p>
                <div className="flex items-center gap-4 mt-1">
                  <span className="text-gray-300 text-sm">
                    Interference: <span className="text-white font-medium">{Math.round(stroopInterferenceMs)}ms</span>
                  </span>
                  <span className="text-gray-500 text-sm">
                    Errors: <span className="text-white">{stroopErrors}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* TaskSwitch */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-yellow-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Clock className="w-4 h-4 text-yellow-400" />
              </div>
              <div className="flex-1">
                <p className="text-white text-sm font-medium">Flexibility (Task Switch)</p>
                <div className="flex items-center gap-4 mt-1">
                  <span className="text-gray-300 text-sm">
                    Switch cost: <span className="text-white font-medium">{Math.round(switchCostMs)}ms</span>
                  </span>
                  <span className="text-gray-500 text-sm">
                    Errors: <span className="text-white">{switchErrors}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* PVT */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-green-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Eye className="w-4 h-4 text-green-400" />
              </div>
              <div className="flex-1">
                <p className="text-white text-sm font-medium">Attention (PVT)</p>
                <div className="flex items-center gap-4 mt-1">
                  <span className="text-gray-300 text-sm">
                    Reaction time: <span className="text-white font-medium">{Math.round(pvtMedianRtMs)}ms</span>
                  </span>
                  <span className="text-gray-500 text-sm">
                    Lapses: <span className="text-white">{pvtLapses}</span>
                  </span>
                  {pvtFalseStarts > 0 && (
                    <span className="text-gray-500 text-sm">
                      False starts: <span className="text-white">{pvtFalseStarts}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Context note */}
        <div className="bg-gray-800/50 rounded-xl p-4 mb-6">
          <p className="text-gray-400 text-sm leading-relaxed">
            These numbers become meaningful once your personal baseline is built. Lower interference, lower switch cost, and faster reaction times generally indicate sharper cognitive readiness. Your baseline captures what's normal for you.
          </p>
        </div>

        <button
          onClick={onContinue}
          className="w-full flex items-center justify-center gap-2 py-5 bg-blue-600 hover:bg-blue-700 text-white text-lg font-bold rounded-xl transition-colors"
        >
          {complete ? 'Continue to dashboard' : 'Done for today'}
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
