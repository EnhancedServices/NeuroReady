import { useState } from 'react';
import { PreTestFlow } from './PreTestFlow';
import { StroopTest } from './tests/StroopTest';
import { TaskSwitchTest } from './tests/TaskSwitchTest';
import { PVT3Test } from './tests/PVT3Test';
import type { PreTestContext, TestResult, HrvAnalysis } from '../types';

interface TestBatteryProps {
  onComplete: (results: TestResult, context: PreTestContext) => void;
  onCancel?: () => void;
  existingHrvAnalysis?: HrvAnalysis | null;
}

type TestStage = 'context' | 'stroop' | 'taskSwitch' | 'pvt3' | 'complete';

export function TestBattery({ onComplete, onCancel, existingHrvAnalysis }: TestBatteryProps) {
  const [stage, setStage] = useState<TestStage>('context');
  const [context, setContext] = useState<PreTestContext | null>(null);
  const [results, setResults] = useState<TestResult>({});

  const handleContextComplete = (ctx: PreTestContext) => {
    setContext(ctx);
    setStage('stroop');
  };

  const handleStroopComplete = (interferenceMs: number, errors: number) => {
    setResults((prev) => ({
      ...prev,
      stroopInterferenceMs: interferenceMs,
      stroopErrors: errors,
    }));
    setStage('taskSwitch');
  };

  const handleTaskSwitchComplete = (switchCostMs: number, switchErrors: number) => {
    setResults((prev) => ({
      ...prev,
      switchCostMs,
      switchErrors,
    }));
    setStage('pvt3');
  };

  const handlePVT3Complete = (medianRtMs: number, lapses: number, falseStarts: number) => {
    if (!context) return;

    const finalResults = {
      ...results,
      pvtMedianRtMs: medianRtMs,
      pvtLapses: lapses,
      pvtFalseStarts: falseStarts,
    };
    setResults(finalResults);
    setStage('complete');
    onComplete(finalResults, context);
  };

  if (stage === 'context') {
    return <PreTestFlow onComplete={handleContextComplete} onCancel={onCancel} existingHrvAnalysis={existingHrvAnalysis} />;
  }

  if (stage === 'stroop') {
    return <StroopTest onComplete={handleStroopComplete} onCancel={onCancel} />;
  }

  if (stage === 'taskSwitch') {
    return <TaskSwitchTest onComplete={handleTaskSwitchComplete} onCancel={onCancel} />;
  }

  if (stage === 'pvt3') {
    return <PVT3Test onComplete={handlePVT3Complete} onCancel={onCancel} />;
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="inline-block w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-400 text-lg">Processing results...</p>
      </div>
    </div>
  );
}
