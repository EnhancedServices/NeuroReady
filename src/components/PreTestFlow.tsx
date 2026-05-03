import { useState } from 'react';
import { useAuth } from '../lib/auth-context';
import { LogOut, Home, ChevronRight, ChevronLeft, Activity, TrendingUp, TrendingDown, Minus, HelpCircle } from 'lucide-react';
import type {
  PreTestContext,
  TestReason,
  PlannedSessionType,
  SleepQuality,
  SorenessLevel,
  PerceivedFatigue,
  TrainingLoadStatus,
  HrvStatus,
  HrvAnalysis,
} from '../types';
import { TEST_REASON_LABELS, PLANNED_SESSION_LABELS } from '../types';

interface PreTestFlowProps {
  onComplete: (context: PreTestContext) => void;
  onCancel?: () => void;
  existingHrvAnalysis?: HrvAnalysis | null;
}

type Step = 'reason' | 'session' | 'context' | 'hrv';

const STEPS: Step[] = ['reason', 'session', 'context', 'hrv'];

function HrvTrendIcon({ category }: { category: string }) {
  if (category === 'mildly_elevated' || category === 'clearly_elevated') {
    return <TrendingUp className="w-5 h-5 text-blue-400" />;
  }
  if (category === 'stable') {
    return <Minus className="w-5 h-5 text-green-400" />;
  }
  if (category === 'mildly_suppressed' || category === 'clearly_suppressed') {
    return <TrendingDown className="w-5 h-5 text-amber-400" />;
  }
  return <HelpCircle className="w-5 h-5 text-gray-400" />;
}

export function PreTestFlow({ onComplete, onCancel, existingHrvAnalysis }: PreTestFlowProps) {
  const { signOut } = useAuth();
  const [currentStep, setCurrentStep] = useState<Step>('reason');
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const [testReason, setTestReason] = useState<TestReason | null>(null);
  const [plannedSessionType, setPlannedSessionType] = useState<PlannedSessionType | null>(null);
  const [sleepHours, setSleepHours] = useState<number>(7);
  const [sleepQuality, setSleepQuality] = useState<SleepQuality | null>(null);
  const [sorenessLevel, setSorenessLevel] = useState<SorenessLevel | null>(null);
  const [illnessSymptoms, setIllnessSymptoms] = useState<boolean | null>(null);
  const [travel, setTravel] = useState<boolean | null>(null);
  const [perceivedFatigue, setPerceivedFatigue] = useState<PerceivedFatigue | null>(null);
  const [trainingLoadStatus, setTrainingLoadStatus] = useState<TrainingLoadStatus | null>(null);
  const [hrvTracking, setHrvTracking] = useState<boolean | null>(null);
  const [hrvInputMode, setHrvInputMode] = useState<'value' | 'status'>('status');
  const [hrv7dayAvg, setHrv7dayAvg] = useState<number | null>(null);
  const [hrvStatus, setHrvStatus] = useState<HrvStatus | null>(null);

  const currentStepIndex = STEPS.indexOf(currentStep);
  const progress = ((currentStepIndex + 1) / STEPS.length) * 100;

  const canProceedReason = testReason !== null;
  const canProceedSession = plannedSessionType !== null;
  const canProceedContext =
    sleepQuality !== null &&
    sorenessLevel !== null &&
    illnessSymptoms !== null &&
    travel !== null &&
    perceivedFatigue !== null &&
    trainingLoadStatus !== null;
  const canProceedHrv =
    hrvTracking === false || (hrvTracking === true && (hrv7dayAvg !== null || hrvStatus !== null));

  const goNext = () => {
    const idx = STEPS.indexOf(currentStep);
    if (idx < STEPS.length - 1) {
      setCurrentStep(STEPS[idx + 1]);
    }
  };

  const goBack = () => {
    const idx = STEPS.indexOf(currentStep);
    if (idx > 0) {
      setCurrentStep(STEPS[idx - 1]);
    }
  };

  const handleSubmit = () => {
    if (!testReason || !plannedSessionType || !sleepQuality || !sorenessLevel ||
        illnessSymptoms === null || travel === null || !perceivedFatigue ||
        !trainingLoadStatus || hrvTracking === null) {
      return;
    }

    const context: PreTestContext = {
      testReason,
      plannedSessionType,
      sleepHours,
      sleepQuality,
      sorenessLevel,
      illnessSymptoms,
      travel,
      perceivedFatigue,
      trainingLoadStatus,
      hrvTracking,
      hrv7dayAvg: hrvTracking ? hrv7dayAvg : null,
      hrvStatus: hrvTracking ? hrvStatus : null,
    };

    onComplete(context);
  };

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
              This will cancel the readiness check. You'll need to start over if you want to complete a test.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-lg transition-colors"
              >
                Continue
              </button>
              <button
                onClick={handleConfirmCancel}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors"
              >
                Cancel Check
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between mb-6">
          {onCancel && (
            <button
              onClick={handleCancelClick}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
            >
              <Home className="w-4 h-4" />
              <span className="font-medium">Dashboard</span>
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

        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">
              Step {currentStepIndex + 1} of {STEPS.length}
            </span>
            <span className="text-sm text-gray-400">{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {currentStep === 'reason' && (
          <div className="bg-gray-900 rounded-xl p-8 border border-gray-800">
            <h2 className="text-3xl font-bold text-white mb-2">Why are you testing today?</h2>
            <p className="text-gray-400 mb-8">This helps us tailor your readiness assessment.</p>

            <div className="space-y-3">
              {(Object.keys(TEST_REASON_LABELS) as TestReason[]).map((reason) => (
                <button
                  key={reason}
                  onClick={() => setTestReason(reason)}
                  className={`w-full text-left p-5 rounded-xl border-2 transition-all ${
                    testReason === reason
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                  }`}
                >
                  <span className="text-lg font-medium text-white">{TEST_REASON_LABELS[reason]}</span>
                </button>
              ))}
            </div>

            <div className="flex justify-end mt-8">
              <button
                onClick={goNext}
                disabled={!canProceedReason}
                className="flex items-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-lg font-bold rounded-xl transition-colors"
              >
                Next
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {currentStep === 'session' && (
          <div className="bg-gray-900 rounded-xl p-8 border border-gray-800">
            <h2 className="text-3xl font-bold text-white mb-2">What's planned today?</h2>
            <p className="text-gray-400 mb-8">Select the type of session you're preparing for.</p>

            <div className="grid grid-cols-2 gap-3">
              {(Object.keys(PLANNED_SESSION_LABELS) as PlannedSessionType[]).map((session) => (
                <button
                  key={session}
                  onClick={() => setPlannedSessionType(session)}
                  className={`text-left p-4 rounded-xl border-2 transition-all ${
                    plannedSessionType === session
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                  }`}
                >
                  <span className="text-base font-medium text-white">{PLANNED_SESSION_LABELS[session]}</span>
                </button>
              ))}
            </div>

            <div className="flex justify-between mt-8">
              <button
                onClick={goBack}
                className="flex items-center gap-2 px-6 py-4 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
                Back
              </button>
              <button
                onClick={goNext}
                disabled={!canProceedSession}
                className="flex items-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-lg font-bold rounded-xl transition-colors"
              >
                Next
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {currentStep === 'context' && (
          <div className="bg-gray-900 rounded-xl p-8 border border-gray-800">
            <h2 className="text-3xl font-bold text-white mb-2">Current state</h2>
            <p className="text-gray-400 mb-8">Help us understand how you're feeling today.</p>

            <div className="space-y-8">
              <div>
                <label className="block text-white font-semibold mb-3">Sleep last night</label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="0"
                    max="12"
                    step="0.5"
                    value={sleepHours}
                    onChange={(e) => setSleepHours(parseFloat(e.target.value))}
                    className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <span className="text-2xl font-bold text-blue-400 w-16 text-center">{sleepHours}h</span>
                </div>
              </div>

              <div>
                <label className="block text-white font-semibold mb-3">Sleep quality</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['poor', 'fair', 'good', 'excellent'] as SleepQuality[]).map((quality) => (
                    <button
                      key={quality}
                      onClick={() => setSleepQuality(quality)}
                      className={`py-3 rounded-lg font-medium capitalize transition-all ${
                        sleepQuality === quality
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      {quality}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-white font-semibold mb-3">Body soreness</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['none', 'mild', 'moderate', 'severe'] as SorenessLevel[]).map((level) => (
                    <button
                      key={level}
                      onClick={() => setSorenessLevel(level)}
                      className={`py-3 rounded-lg font-medium capitalize transition-all ${
                        sorenessLevel === level
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-white font-semibold mb-3">Illness signs?</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setIllnessSymptoms(false)}
                      className={`py-3 rounded-lg font-medium transition-all ${
                        illnessSymptoms === false
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      No
                    </button>
                    <button
                      onClick={() => setIllnessSymptoms(true)}
                      className={`py-3 rounded-lg font-medium transition-all ${
                        illnessSymptoms === true
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      Yes
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-white font-semibold mb-3">Travel in last 48h?</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setTravel(false)}
                      className={`py-3 rounded-lg font-medium transition-all ${
                        travel === false
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      No
                    </button>
                    <button
                      onClick={() => setTravel(true)}
                      className={`py-3 rounded-lg font-medium transition-all ${
                        travel === true
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      Yes
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-white font-semibold mb-3">How fatigued do you feel?</label>
                <div className="grid grid-cols-4 gap-2">
                  {([
                    { value: 'low', label: 'Low' },
                    { value: 'moderate', label: 'Moderate' },
                    { value: 'high', label: 'High' },
                    { value: 'very_high', label: 'Very high' },
                  ] as { value: PerceivedFatigue; label: string }[]).map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setPerceivedFatigue(value)}
                      className={`py-3 rounded-lg font-medium transition-all ${
                        perceivedFatigue === value
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
                <label className="block text-white font-semibold mb-3">Recent training load</label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { value: 'normal', label: 'Normal' },
                    { value: 'high', label: 'High' },
                    { value: 'very_high', label: 'Very high' },
                  ] as { value: TrainingLoadStatus; label: string }[]).map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setTrainingLoadStatus(value)}
                      className={`py-3 rounded-lg font-medium transition-all ${
                        trainingLoadStatus === value
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-between mt-8">
              <button
                onClick={goBack}
                className="flex items-center gap-2 px-6 py-4 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
                Back
              </button>
              <button
                onClick={goNext}
                disabled={!canProceedContext}
                className="flex items-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-lg font-bold rounded-xl transition-colors"
              >
                Next
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {currentStep === 'hrv' && (
          <div className="bg-gray-900 rounded-xl p-8 border border-gray-800">
            <div className="flex items-center gap-3 mb-2">
              <Activity className="w-8 h-8 text-teal-400" />
              <h2 className="text-3xl font-bold text-white">HRV tracking</h2>
            </div>
            <p className="text-gray-400 mb-8">Optional: Add HRV data for better recommendations.</p>

            {existingHrvAnalysis && existingHrvAnalysis.confidence !== 'none' && (
              <div className="mb-8 p-5 bg-teal-500/10 border border-teal-500/30 rounded-xl">
                <div className="flex items-center gap-3 mb-3">
                  <HrvTrendIcon category={existingHrvAnalysis.trendCategory} />
                  <h3 className="text-white font-semibold">Your current HRV trend</h3>
                </div>
                <p className="text-gray-200 mb-2">{existingHrvAnalysis.athleteFacingTrend}</p>
                <p className="text-gray-400 text-sm">{existingHrvAnalysis.athleteFacingConfidence}</p>
              </div>
            )}

            <div className="mb-8">
              <label className="block text-white font-semibold mb-3">Do you track HRV?</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    setHrvTracking(false);
                    setHrv7dayAvg(null);
                    setHrvStatus(null);
                  }}
                  className={`py-4 rounded-xl font-medium transition-all ${
                    hrvTracking === false
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  No / Skip
                </button>
                <button
                  onClick={() => setHrvTracking(true)}
                  className={`py-4 rounded-xl font-medium transition-all ${
                    hrvTracking === true
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  Yes
                </button>
              </div>
            </div>

            {hrvTracking && (
              <div className="space-y-6 p-6 bg-gray-800/50 rounded-xl border border-gray-700">
                <div>
                  <label className="block text-white font-semibold mb-3">How would you like to enter?</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => {
                        setHrvInputMode('status');
                        setHrv7dayAvg(null);
                      }}
                      className={`py-3 rounded-lg font-medium transition-all ${
                        hrvInputMode === 'status'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      Status vs normal
                    </button>
                    <button
                      onClick={() => {
                        setHrvInputMode('value');
                        setHrvStatus(null);
                      }}
                      className={`py-3 rounded-lg font-medium transition-all ${
                        hrvInputMode === 'value'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      7-day average
                    </button>
                  </div>
                </div>

                {hrvInputMode === 'status' && (
                  <div>
                    <label className="block text-white font-semibold mb-3">HRV status today</label>
                    <div className="grid grid-cols-2 gap-3">
                      {([
                        { value: 'normal', label: 'Normal' },
                        { value: 'slightly_down', label: 'Slightly down' },
                        { value: 'clearly_down', label: 'Clearly down' },
                        { value: 'unknown', label: 'Not sure' },
                      ] as { value: HrvStatus; label: string }[]).map(({ value, label }) => (
                        <button
                          key={value}
                          onClick={() => setHrvStatus(value)}
                          className={`py-3 rounded-lg font-medium transition-all ${
                            hrvStatus === value
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {hrvInputMode === 'value' && (
                  <div>
                    <label className="block text-white font-semibold mb-3">7-day HRV average (ms)</label>
                    <input
                      type="number"
                      value={hrv7dayAvg || ''}
                      onChange={(e) => setHrv7dayAvg(e.target.value ? parseFloat(e.target.value) : null)}
                      placeholder="e.g., 45"
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white text-lg focus:outline-none focus:border-blue-500"
                    />
                    <p className="text-gray-500 text-sm mt-2">Enter your 7-day rolling average from your device.</p>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-between mt-8">
              <button
                onClick={goBack}
                className="flex items-center gap-2 px-6 py-4 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={!canProceedHrv}
                className="flex items-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-lg font-bold rounded-xl transition-colors"
              >
                Start Tests
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
