import { useAuth } from '../lib/auth-context';
import logo from '../assets/logo26.png';

interface OnboardingProps {
  onComplete: () => void;
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const { profile } = useAuth();
  const baselineNeeded = 3;
  const completed = profile?.baseline_sessions_count || 0;

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img src={logo} alt="Logo" className="w-12 h-12" />
            <h1 className="text-5xl font-bold text-white">Build Your Baseline</h1>
          </div>
          <p className="text-gray-400 text-xl">
            Complete {baselineNeeded} test sessions to establish your personal baseline
          </p>
        </div>

        <div className="bg-gray-900 rounded-xl p-8 shadow-2xl border border-gray-800 mb-6">
          <div className="mb-8">
            <div className="flex justify-between items-center mb-3">
              <span className="text-gray-300 font-bold text-lg">Progress</span>
              <span className="text-blue-400 font-bold text-2xl">{completed} / {baselineNeeded}</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-4">
              <div
                className="bg-blue-600 h-4 rounded-full transition-all duration-500"
                style={{ width: `${(completed / baselineNeeded) * 100}%` }}
              />
            </div>
          </div>

          <div className="space-y-5 mb-8">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-white font-bold">1</span>
              </div>
              <div>
                <h3 className="text-white font-bold text-lg mb-1">Same time each day</h3>
                <p className="text-gray-400">
                  Take the test at roughly the same time for accurate comparison
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-white font-bold">2</span>
              </div>
              <div>
                <h3 className="text-white font-bold text-lg mb-1">Normal conditions</h3>
                <p className="text-gray-400">
                  Avoid testing when sick, severely fatigued, or after major travel
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-white font-bold">3</span>
              </div>
              <div>
                <h3 className="text-white font-bold text-lg mb-1">Takes 7-8 minutes</h3>
                <p className="text-gray-400">
                  Three quick tests: Stroop (2 min), Task-switch (2 min), PVT-3 (3 min)
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={onComplete}
            className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white text-2xl font-bold rounded-lg transition-colors"
          >
            Continue to Dashboard
          </button>
        </div>

        <div className="text-center text-gray-500">
          Compare you to yourself, not to norms
        </div>
      </div>
    </div>
  );
}
