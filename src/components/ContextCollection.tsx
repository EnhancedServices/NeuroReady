import { useState } from 'react';
import { SessionContext } from '../types';
import { useAuth } from '../lib/auth-context';
import { LogOut, Home } from 'lucide-react';

interface ContextCollectionProps {
  onComplete: (context: SessionContext) => void;
  onCancel?: () => void;
}

export function ContextCollection({ onComplete, onCancel }: ContextCollectionProps) {
  const { signOut } = useAuth();
  const [sleepHours, setSleepHours] = useState<number>(7);
  const [hardTraining24h, setHardTraining24h] = useState<boolean | null>(null);
  const [illnessSymptoms, setIllnessSymptoms] = useState<boolean | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const handleSubmit = () => {
    if (hardTraining24h === null || illnessSymptoms === null) {
      return;
    }

    onComplete({
      sleepHours,
      hardTraining24h,
      illnessSymptoms,
      travel: false,
    });
  };

  const canProceed = hardTraining24h !== null && illnessSymptoms !== null;

  const handleCancelClick = () => {
    setShowCancelConfirm(true);
  };

  const handleConfirmCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 p-4">
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 max-w-md w-full">
            <h3 className="text-2xl font-bold text-white mb-4">Return to Dashboard?</h3>
            <p className="text-gray-300 mb-6 text-lg">
              This will abort the current test session. You'll need to start over if you want to complete a test.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-lg transition-colors"
              >
                Continue Test
              </button>
              <button
                onClick={handleConfirmCancel}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors"
              >
                Abort Test
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between mb-4">
          {onCancel && (
            <button
              onClick={handleCancelClick}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
            >
              <Home className="w-4 h-4" />
              <span className="font-medium">Return to Dashboard</span>
            </button>
          )}
          <button
            onClick={signOut}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors ml-auto"
          >
            <LogOut className="w-4 h-4" />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </div>

      <div className="flex items-center justify-center">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-8">
            <h2 className="text-4xl font-bold text-white mb-2">Quick Context Check</h2>
            <p className="text-gray-400 text-lg">Help us understand your current state</p>
          </div>

        <div className="bg-gray-900 rounded-xl p-8 shadow-2xl border border-gray-800 space-y-10">
          <div>
            <label className="block text-white font-bold mb-4 text-xl">
              Sleep last night
            </label>
            <div className="flex items-center gap-6">
              <input
                type="range"
                min="0"
                max="12"
                step="0.5"
                value={sleepHours}
                onChange={(e) => setSleepHours(parseFloat(e.target.value))}
                className="flex-1 h-3 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="text-4xl font-bold text-blue-400 w-24 text-center">
                {sleepHours}h
              </div>
            </div>
          </div>

          <div>
            <label className="block text-white font-bold mb-4 text-xl">
              Hard training last 24h?
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setHardTraining24h(true)}
                className={`py-5 rounded-lg font-bold text-2xl transition-all ${
                  hardTraining24h === true
                    ? 'bg-blue-600 text-white scale-105'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-750'
                }`}
              >
                Yes
              </button>
              <button
                onClick={() => setHardTraining24h(false)}
                className={`py-5 rounded-lg font-bold text-2xl transition-all ${
                  hardTraining24h === false
                    ? 'bg-blue-600 text-white scale-105'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-750'
                }`}
              >
                No
              </button>
            </div>
          </div>

          <div>
            <label className="block text-white font-bold mb-4 text-xl">
              Any illness symptoms?
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setIllnessSymptoms(true)}
                className={`py-5 rounded-lg font-bold text-2xl transition-all ${
                  illnessSymptoms === true
                    ? 'bg-blue-600 text-white scale-105'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-750'
                }`}
              >
                Yes
              </button>
              <button
                onClick={() => setIllnessSymptoms(false)}
                className={`py-5 rounded-lg font-bold text-2xl transition-all ${
                  illnessSymptoms === false
                    ? 'bg-blue-600 text-white scale-105'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-750'
                }`}
              >
                No
              </button>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!canProceed}
            className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white text-2xl font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue to Tests
          </button>
        </div>
        </div>
      </div>
    </div>
  );
}
