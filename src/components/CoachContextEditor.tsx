import { useState } from 'react';
import { Settings, Moon, Activity, Save, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import type { SleepQuality, HrvTrendCategory, Session } from '../types';
import { HRV_TREND_LABELS } from '../types';

interface CoachContextEditorProps {
  session: Session;
  onSave: (updates: {
    coach_sleep_override_hours: number | null;
    coach_sleep_override_quality: SleepQuality | null;
    coach_hrv_override_category: HrvTrendCategory | null;
  }) => Promise<void>;
  saving: boolean;
}

const SLEEP_QUALITY_OPTIONS: { value: SleepQuality | ''; label: string }[] = [
  { value: '', label: 'Use athlete-reported' },
  { value: 'poor', label: 'Poor' },
  { value: 'fair', label: 'Fair' },
  { value: 'good', label: 'Good' },
  { value: 'excellent', label: 'Excellent' },
];

const HRV_TREND_OPTIONS: { value: HrvTrendCategory | ''; label: string }[] = [
  { value: '', label: 'Use athlete-reported' },
  { value: 'stable', label: 'Stable' },
  { value: 'mildly_suppressed', label: 'Mildly Suppressed' },
  { value: 'clearly_suppressed', label: 'Clearly Suppressed' },
  { value: 'mildly_elevated', label: 'Mildly Elevated' },
  { value: 'clearly_elevated', label: 'Clearly Elevated' },
  { value: 'insufficient_data', label: 'Insufficient Data' },
];

export function CoachContextEditor({ session, onSave, saving }: CoachContextEditorProps) {
  const [expanded, setExpanded] = useState(true);
  const [sleepHours, setSleepHours] = useState<string>(
    session.coach_sleep_override_hours?.toString() ?? ''
  );
  const [sleepQuality, setSleepQuality] = useState<SleepQuality | ''>(
    session.coach_sleep_override_quality ?? ''
  );
  const [hrvCategory, setHrvCategory] = useState<HrvTrendCategory | ''>(
    session.coach_hrv_override_category ?? ''
  );

  const hasOverrides =
    session.coach_sleep_override_hours !== null ||
    session.coach_sleep_override_quality !== null ||
    session.coach_hrv_override_category !== null;

  const hasChanges =
    (sleepHours !== '' && sleepHours !== session.coach_sleep_override_hours?.toString()) ||
    (sleepHours === '' && session.coach_sleep_override_hours !== null) ||
    sleepQuality !== (session.coach_sleep_override_quality ?? '') ||
    hrvCategory !== (session.coach_hrv_override_category ?? '');

  const handleSave = async () => {
    await onSave({
      coach_sleep_override_hours: sleepHours !== '' ? parseFloat(sleepHours) : null,
      coach_sleep_override_quality: sleepQuality !== '' ? sleepQuality : null,
      coach_hrv_override_category: hrvCategory !== '' ? hrvCategory : null,
    });
  };

  const handleReset = () => {
    setSleepHours('');
    setSleepQuality('');
    setHrvCategory('');
  };

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-700">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-5 py-4 flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center">
            <Settings className="w-4 h-4 text-gray-400" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-white">Context Overrides</h3>
            <p className="text-xs text-gray-500">
              {hasOverrides ? 'Coach adjustments active' : 'Edit sleep and HRV context'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasOverrides && (
            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-teal-500/20 text-teal-400">
              Modified
            </span>
          )}
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-5 border-t border-gray-800">
          <div className="pt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-800/30 rounded-lg">
              <div>
                <p className="text-xs text-gray-500 mb-1">Athlete-Reported Sleep</p>
                <p className="text-sm text-gray-300">
                  {session.sleep_hours !== null ? `${session.sleep_hours}h` : 'Not reported'}{' '}
                  {session.sleep_quality && `(${session.sleep_quality})`}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Athlete-Reported HRV Trend</p>
                <p className="text-sm text-gray-300">
                  {session.hrv_trend_category
                    ? HRV_TREND_LABELS[session.hrv_trend_category]
                    : 'Not available'}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                  <Moon className="w-4 h-4 text-blue-400" />
                  Override Sleep Hours
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="12"
                  value={sleepHours}
                  onChange={(e) => setSleepHours(e.target.value)}
                  placeholder="Leave empty to use athlete-reported"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-teal-500 text-sm"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                  <Moon className="w-4 h-4 text-blue-400" />
                  Override Sleep Quality
                </label>
                <select
                  value={sleepQuality}
                  onChange={(e) => setSleepQuality(e.target.value as SleepQuality | '')}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-teal-500 text-sm"
                >
                  {SLEEP_QUALITY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                  <Activity className="w-4 h-4 text-teal-400" />
                  Override HRV Trend Category
                </label>
                <select
                  value={hrvCategory}
                  onChange={(e) => setHrvCategory(e.target.value as HrvTrendCategory | '')}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-teal-500 text-sm"
                >
                  {HRV_TREND_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleSave}
                disabled={saving || !hasChanges}
                className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save & Regenerate Insight'}
              </button>
              <button
                onClick={handleReset}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                <RotateCcw className="w-4 h-4" />
                Reset Overrides
              </button>
            </div>

            <p className="text-xs text-gray-500">
              Overrides replace athlete-reported values for insight generation only.
              The original athlete data is preserved.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
