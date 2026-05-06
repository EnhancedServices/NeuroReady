import { useState, useEffect, useRef } from 'react';
import { Home } from 'lucide-react';

interface TaskSwitchTestProps {
  onComplete: (switchCostMs: number, switchErrors: number) => void;
  onCancel: () => void;
}

interface Trial {
  number: number;
  taskType: 'odd-even' | 'high-low';
  isSwitch: boolean;
}

const DURATION_MS = 45000;
const THRESHOLD = 5;
const WARMUP_TRIALS = 3;

export function TaskSwitchTest({ onComplete, onCancel }: TaskSwitchTestProps) {
  const [started, setStarted] = useState(false);
  const [currentTrial, setCurrentTrial] = useState<Trial | null>(null);
  const [timeLeft, setTimeLeft] = useState(DURATION_MS / 1000);
  const [showInstructions, setShowInstructions] = useState(true);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [inWarmup, setInWarmup] = useState(true);
  const [warmupCount, setWarmupCount] = useState(0);

  const trialsRef = useRef<Array<{ trial: Trial; rt: number; correct: boolean }>>([]);
  const testStartTimeRef = useRef<number>(0);
  const trialStartTimeRef = useRef<number>(0);
  const timerRef = useRef<number>();
  const lastTaskRef = useRef<'odd-even' | 'high-low'>('odd-even');
  const inWarmupRef = useRef(true);
  const warmupCountRef = useRef(0);

  const generateTrial = (): Trial => {
    const taskType = Math.random() > 0.5 ? 'odd-even' : 'high-low';
    const isSwitch = taskType !== lastTaskRef.current;
    lastTaskRef.current = taskType;

    let number: number;
    if (taskType === 'high-low') {
      const validNumbers = [1, 2, 3, 4, 6, 7, 8, 9];
      number = validNumbers[Math.floor(Math.random() * validNumbers.length)];
    } else {
      number = Math.floor(Math.random() * 9) + 1;
    }

    return { number, taskType, isSwitch };
  };

  const startRealTimer = () => {
    const now = Date.now();
    testStartTimeRef.current = now;

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
    const firstTrial = generateTrial();
    setCurrentTrial(firstTrial);
    trialStartTimeRef.current = Date.now();
  };

  const handleResponse = (answer: boolean) => {
    if (!currentTrial) return;

    const rt = Date.now() - trialStartTimeRef.current;
    let correct = false;

    if (currentTrial.taskType === 'odd-even') {
      correct = (currentTrial.number % 2 === 1) === answer;
    } else {
      correct = (currentTrial.number > THRESHOLD) === answer;
    }

    if (inWarmupRef.current) {
      const newCount = warmupCountRef.current + 1;
      warmupCountRef.current = newCount;
      setWarmupCount(newCount);

      if (newCount >= WARMUP_TRIALS) {
        inWarmupRef.current = false;
        setInWarmup(false);
        startRealTimer();
      }
    } else {
      trialsRef.current.push({
        trial: currentTrial,
        rt,
        correct,
      });
    }

    setCurrentTrial(generateTrial());
    trialStartTimeRef.current = Date.now();
  };

  const finishTest = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    const repeatRTs = trialsRef.current
      .filter(t => !t.trial.isSwitch && t.correct)
      .map(t => t.rt)
      .sort((a, b) => a - b);

    const switchRTs = trialsRef.current
      .filter(t => t.trial.isSwitch && t.correct)
      .map(t => t.rt)
      .sort((a, b) => a - b);

    const medianRepeat = repeatRTs[Math.floor(repeatRTs.length / 2)] || 0;
    const medianSwitch = switchRTs[Math.floor(switchRTs.length / 2)] || 0;

    const switchCost = medianSwitch - medianRepeat;
    const switchErrors = trialsRef.current.filter(t => t.trial.isSwitch && !t.correct).length;

    onComplete(Math.max(0, switchCost), switchErrors);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
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
          <h2 className="text-3xl font-bold text-white mb-4">Task Switch Test</h2>
          <p className="text-gray-300 text-lg mb-6">
            Switch between two rules:
          </p>

          <div className="space-y-4 mb-6">
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="text-blue-400 font-bold mb-2 text-lg">ODD or EVEN?</div>
              <p className="text-gray-300">Example: 7 → ODD</p>
            </div>

            <div className="bg-gray-800 rounded-lg p-4">
              <div className="text-green-400 font-bold mb-2 text-lg">HIGH or LOW?</div>
              <p className="text-gray-300">Is the number greater than 5?</p>
              <p className="text-gray-300">Example: 7 → HIGH (above 5)</p>
            </div>
          </div>

          <div className="space-y-3 mb-8">
            <div className="flex items-center gap-2 text-gray-300">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>3 warm-up trials, then 45 seconds scored</span>
            </div>
            <div className="flex items-center gap-2 text-gray-300">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>The task switches randomly</span>
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

  if (!started || !currentTrial) return null;

  const isOddEven = currentTrial.taskType === 'odd-even';

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4 overflow-hidden">
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

      <div className="text-center mb-12">
        {inWarmup ? (
          <>
            <div className="text-4xl font-bold text-amber-400 mb-2">
              Warm-up {warmupCount + 1} of {WARMUP_TRIALS}
            </div>
            <div className="text-gray-600 text-lg">Task Switch Test</div>
          </>
        ) : (
          <>
            <div className="text-4xl sm:text-6xl font-bold text-gray-500 mb-2">{timeLeft}s</div>
            <div className="text-gray-600 text-lg">Task Switch Test</div>
          </>
        )}
      </div>

      <div className="mb-8">
        <div className={`text-3xl font-bold mb-4 ${isOddEven ? 'text-blue-400' : 'text-green-400'}`}>
          {isOddEven ? 'ODD or EVEN?' : 'HIGH or LOW?'}
        </div>
      </div>

      <div className="mb-10 sm:mb-20">
        <div className="text-7xl sm:text-9xl font-bold text-white">
          {currentTrial.number}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:gap-8 w-full max-w-3xl">
        <button
          onClick={() => handleResponse(true)}
          className="py-8 sm:py-12 text-2xl sm:text-4xl font-bold rounded-xl transition-all hover:scale-105 active:scale-95 bg-blue-600 hover:bg-blue-700 text-white"
        >
          {isOddEven ? 'ODD' : 'HIGH'}
        </button>
        <button
          onClick={() => handleResponse(false)}
          className="py-8 sm:py-12 text-2xl sm:text-4xl font-bold rounded-xl transition-all hover:scale-105 active:scale-95 bg-gray-700 hover:bg-gray-600 text-white"
        >
          {isOddEven ? 'EVEN' : 'LOW'}
        </button>
      </div>
    </div>
  );
}
