import { useState, useEffect, useRef } from 'react';
import { Home } from 'lucide-react';

interface PVT3TestProps {
  onComplete: (medianRtMs: number, lapses: number, falseStarts: number) => void;
  onCancel: () => void;
}

const DURATION_MS = 120000;
const MIN_WAIT_MS = 2000;
const MAX_WAIT_MS = 10000;
const LAPSE_THRESHOLD_MS = 500;
const WARMUP_TRIALS = 3;

export function PVT3Test({ onComplete, onCancel }: PVT3TestProps) {
  const [started, setStarted] = useState(false);
  const [waiting, setWaiting] = useState(true);
  const [showInstructions, setShowInstructions] = useState(true);
  const [timeLeft, setTimeLeft] = useState(DURATION_MS / 1000);
  const [showStimulus, setShowStimulus] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [inWarmup, setInWarmup] = useState(true);
  const [warmupCount, setWarmupCount] = useState(0);

  const trialsRef = useRef<Array<{ rt: number; falseStart: boolean }>>([]);
  const testStartTimeRef = useRef<number>(0);
  const stimulusStartTimeRef = useRef<number>(0);
  const timerRef = useRef<number>();
  const waitTimeoutRef = useRef<number>();
  const inWarmupRef = useRef(true);
  const warmupCountRef = useRef(0);

  const startRealTimer = () => {
    testStartTimeRef.current = Date.now();

    timerRef.current = window.setInterval(() => {
      const elapsed = Date.now() - testStartTimeRef.current;
      const remaining = Math.max(0, Math.ceil((DURATION_MS - elapsed) / 1000));
      setTimeLeft(remaining);

      if (remaining === 0) {
        finishTest();
      }
    }, 100);
  };

  const startTest = () => {
    setShowInstructions(false);
    setStarted(true);
    startTrial();
  };

  const startTrial = () => {
    setWaiting(true);
    setShowStimulus(false);

    const waitTime = MIN_WAIT_MS + Math.random() * (MAX_WAIT_MS - MIN_WAIT_MS);

    waitTimeoutRef.current = window.setTimeout(() => {
      setShowStimulus(true);
      setWaiting(false);
      stimulusStartTimeRef.current = Date.now();
    }, waitTime);
  };

  const handleResponse = () => {
    if (waiting) {
      if (inWarmupRef.current) {
        if (waitTimeoutRef.current) {
          clearTimeout(waitTimeoutRef.current);
        }
        startTrial();
        return;
      }

      trialsRef.current.push({ rt: 0, falseStart: true });

      if (waitTimeoutRef.current) {
        clearTimeout(waitTimeoutRef.current);
      }

      startTrial();
      return;
    }

    if (showStimulus) {
      if (inWarmupRef.current) {
        const newCount = warmupCountRef.current + 1;
        warmupCountRef.current = newCount;
        setWarmupCount(newCount);

        if (newCount >= WARMUP_TRIALS) {
          inWarmupRef.current = false;
          setInWarmup(false);
          startRealTimer();
        }

        startTrial();
        return;
      }

      const rt = Date.now() - stimulusStartTimeRef.current;
      trialsRef.current.push({ rt, falseStart: false });

      const elapsed = Date.now() - testStartTimeRef.current;
      if (elapsed < DURATION_MS) {
        startTrial();
      }
    }
  };

  const finishTest = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    if (waitTimeoutRef.current) {
      clearTimeout(waitTimeoutRef.current);
    }

    const validTrials = trialsRef.current.filter(t => !t.falseStart && t.rt > 0);
    const rts = validTrials.map(t => t.rt).sort((a, b) => a - b);

    const medianRt = rts[Math.floor(rts.length / 2)] || 0;
    const lapses = validTrials.filter(t => t.rt > LAPSE_THRESHOLD_MS).length;
    const falseStarts = trialsRef.current.filter(t => t.falseStart).length;

    onComplete(medianRt, lapses, falseStarts);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (waitTimeoutRef.current) {
        clearTimeout(waitTimeoutRef.current);
      }
    };
  }, []);

  if (showInstructions) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
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
                  onClick={onCancel}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors"
                >
                  Abort Test
                </button>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={() => setShowCancelConfirm(true)}
          className="fixed top-4 left-4 flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors z-10"
        >
          <Home className="w-4 h-4" />
          <span className="font-medium">Return to Dashboard</span>
        </button>

        <div className="max-w-2xl w-full bg-gray-900 rounded-lg p-8 border border-gray-800">
          <h2 className="text-3xl font-bold text-white mb-4">PVT-3 Test</h2>
          <p className="text-gray-300 text-lg mb-6">
            Tap the screen as quickly as possible when you see the lightning bolt.
          </p>

          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <div className="space-y-4">
              <div>
                <div className="text-gray-400 mb-2">When you see:</div>
                <div className="bg-gray-950 rounded-lg p-8 text-center">
                  <div className="text-6xl">⚡</div>
                </div>
                <div className="text-green-400 mt-2 font-bold">→ Tap immediately!</div>
              </div>

              <div>
                <div className="text-gray-400 mb-2">Wait patiently:</div>
                <div className="bg-gray-950 rounded-lg p-8 text-center">
                  <div className="text-gray-700 text-2xl">...</div>
                </div>
                <div className="text-red-400 mt-2 font-bold">→ Don't tap early!</div>
              </div>
            </div>
          </div>

          <div className="space-y-3 mb-8">
            <div className="flex items-center gap-2 text-gray-300">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>3 warm-up trials, then 2 minutes scored</span>
            </div>
            <div className="flex items-center gap-2 text-gray-300">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>React as fast as you can</span>
            </div>
          </div>

          <button
            onClick={startTest}
            className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white text-2xl font-bold rounded-lg transition-colors"
          >
            Start Test
          </button>
        </div>
      </div>
    );
  }

  if (!started) return null;

  return (
    <div
      className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4 overflow-hidden cursor-pointer select-none"
      onClick={handleResponse}
    >
      {showCancelConfirm && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={(e) => e.stopPropagation()}
        >
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
                onClick={onCancel}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors"
              >
                Abort Test
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowCancelConfirm(true);
        }}
        className="fixed top-4 left-4 flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors z-10"
      >
        <Home className="w-4 h-4" />
        <span className="font-medium">Return to Dashboard</span>
      </button>

      <div className="text-center mt-20 sm:mt-0 mb-12">
        {inWarmup ? (
          <>
            <div className="text-4xl font-bold text-amber-400 mb-2">
              Warm-up {warmupCount + 1} of {WARMUP_TRIALS}
            </div>
            <div className="text-gray-600 text-lg">PVT-3 Test - Tap anywhere</div>
          </>
        ) : (
          <>
            <div className="text-4xl sm:text-6xl font-bold text-gray-500 mb-2">{timeLeft}s</div>
            <div className="text-gray-600 text-lg">PVT-3 Test - Tap anywhere</div>
          </>
        )}
      </div>

      <div className="flex-1 flex items-center justify-center w-full">
        {showStimulus ? (
          <div className="text-7xl sm:text-9xl animate-pulse">⚡</div>
        ) : (
          <div className="text-6xl text-gray-800">...</div>
        )}
      </div>

      <div className="text-gray-700 text-sm mb-8">
        Trials: {trialsRef.current.length}
      </div>
    </div>
  );
}
