import { useState, useEffect, useRef } from 'react';
import { Home } from 'lucide-react';

interface StroopTestProps {
  onComplete: (interferenceMs: number, errors: number) => void;
  onCancel: () => void;
}

interface Trial {
  word: string;
  color: string;
  congruent: boolean;
}

const COLORS = ['red', 'blue', 'green', 'yellow'];
const COLOR_MAP: Record<string, string> = {
  red: '#EF4444',
  blue: '#3B82F6',
  green: '#10B981',
  yellow: '#EAB308',
};

const DURATION_MS = 45000;
const WARMUP_TRIALS = 3;

export function StroopTest({ onComplete, onCancel }: StroopTestProps) {
  const [started, setStarted] = useState(false);
  const [currentTrial, setCurrentTrial] = useState<Trial | null>(null);
  const [timeLeft, setTimeLeft] = useState(DURATION_MS / 1000);
  const [showInstructions, setShowInstructions] = useState(true);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [inWarmup, setInWarmup] = useState(true);
  const [warmupCount, setWarmupCount] = useState(0);

  const trialsRef = useRef<Array<{ trial: Trial; rt: number; correct: boolean; congruent: boolean }>>([]);
  const testStartTimeRef = useRef<number>(0);
  const trialStartTimeRef = useRef<number>(0);
  const timerRef = useRef<number>();
  const inWarmupRef = useRef(true);
  const warmupCountRef = useRef(0);

  const generateTrial = (): Trial => {
    const congruent = Math.random() < 0.7;
    const word = COLORS[Math.floor(Math.random() * COLORS.length)];
    const color = congruent ? word : COLORS.filter(c => c !== word)[Math.floor(Math.random() * 3)];
    return { word, color, congruent };
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
    setCurrentTrial(generateTrial());
    trialStartTimeRef.current = Date.now();
  };

  const handleResponse = (selectedColor: string) => {
    if (!currentTrial) return;

    const rt = Date.now() - trialStartTimeRef.current;
    const correct = selectedColor === currentTrial.color;

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
        congruent: currentTrial.congruent,
      });
    }

    setCurrentTrial(generateTrial());
    trialStartTimeRef.current = Date.now();
  };

  const finishTest = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    const congruentRTs = trialsRef.current
      .filter(t => t.congruent && t.correct)
      .map(t => t.rt)
      .sort((a, b) => a - b);

    const incongruentRTs = trialsRef.current
      .filter(t => !t.congruent && t.correct)
      .map(t => t.rt)
      .sort((a, b) => a - b);

    const medianCongruent = congruentRTs[Math.floor(congruentRTs.length / 2)] || 0;
    const medianIncongruent = incongruentRTs[Math.floor(incongruentRTs.length / 2)] || 0;

    const interference = medianIncongruent - medianCongruent;
    const errors = trialsRef.current.filter(t => !t.congruent && !t.correct).length;

    onComplete(Math.max(0, interference), errors);
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
          <h2 className="text-3xl font-bold text-white mb-4">Stroop Test</h2>
          <p className="text-gray-300 text-lg mb-6">
            Tap the button that matches the COLOR of the text, not the word.
          </p>

          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <p className="text-gray-400 mb-4">Example:</p>
            <div className="text-center mb-4">
              <span className="text-5xl font-bold" style={{ color: COLOR_MAP.blue }}>RED</span>
            </div>
            <p className="text-gray-300">
              Correct answer: <span className="text-blue-400 font-bold">BLUE</span>
            </p>
          </div>

          <div className="space-y-3 mb-8">
            <div className="flex items-center gap-2 text-gray-300">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>3 warm-up trials, then 45 seconds scored</span>
            </div>
            <div className="flex items-center gap-2 text-gray-300">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>Answer as quickly and accurately as possible</span>
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

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4">
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
            <div className="text-gray-600 text-lg">Stroop Test</div>
          </>
        ) : (
          <>
            <div className="text-6xl font-bold text-gray-500 mb-2">{timeLeft}s</div>
            <div className="text-gray-600 text-lg">Stroop Test</div>
          </>
        )}
      </div>

      <div className="mb-20">
        <div
          className="text-9xl font-bold uppercase"
          style={{ color: COLOR_MAP[currentTrial.color] }}
        >
          {currentTrial.word}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 w-full max-w-3xl">
        {COLORS.map((color) => (
          <button
            key={color}
            onClick={() => handleResponse(color)}
            className="py-12 text-3xl font-bold rounded-xl transition-all hover:scale-105 active:scale-95"
            style={{
              backgroundColor: COLOR_MAP[color],
              color: color === 'yellow' ? '#000' : '#fff',
            }}
          >
            {color.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  );
}
