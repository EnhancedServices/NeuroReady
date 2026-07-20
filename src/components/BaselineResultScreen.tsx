import { CheckCircle, Clock, Zap, Eye, ArrowRight, Activity, TrendingDown, TrendingUp, Minus, ShieldCheck, Info } from 'lucide-react';
import type { HrvAnalysis } from '../types';
import type { MetricKey } from '../lib/scoring';
import type { ProvisionalBand, ProvisionalFeedback, ProvisionalMetric } from '../lib/provisional-feedback';

interface BaselineResultScreenProps {
  feedback: ProvisionalFeedback;
  hrvAnalysis?: HrvAnalysis | null;
  baselineCount: number;
  baselineTarget: number;
  onContinue: () => void;
}

const BAND_STYLES: Record<ProvisionalBand, { chip: string; dot: string }> = {
  strong: { chip: 'bg-green-500/15 text-green-400 border-green-500/30', dot: 'bg-green-500' },
  typical: { chip: 'bg-blue-500/15 text-blue-400 border-blue-500/30', dot: 'bg-blue-500' },
  watch: { chip: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30', dot: 'bg-yellow-500' },
};

function metricFamily(key: MetricKey): { icon: typeof Zap; color: string; bg: string } {
  if (key.startsWith('stroop')) return { icon: Zap, color: 'text-red-400', bg: 'bg-red-500/15' };
  if (key.startsWith('switch')) return { icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/15' };
  return { icon: Eye, color: 'text-green-400', bg: 'bg-green-500/15' };
}

function formatValue(m: ProvisionalMetric): string {
  const rounded = m.unit === 'ms' ? Math.round(m.value) : m.value;
  return m.unit ? `${rounded}${m.unit}` : `${rounded}`;
}

function ChangeChip({ change }: { change: ProvisionalMetric['change'] }) {
  if (!change) return null;
  const config = {
    improved: { icon: TrendingDown, cls: 'text-green-400' },
    declined: { icon: TrendingUp, cls: 'text-yellow-400' },
    steady: { icon: Minus, cls: 'text-gray-500' },
  }[change.direction];
  const Icon = config.icon;
  return (
    <div className={`flex items-center gap-1 text-xs ${config.cls} mt-1`}>
      <Icon className="w-3 h-3" />
      <span>{change.text}</span>
    </div>
  );
}

export function BaselineResultScreen({
  feedback,
  hrvAnalysis,
  baselineCount,
  baselineTarget,
  onContinue,
}: BaselineResultScreenProps) {
  const complete = baselineCount >= baselineTarget;

  return (
    <div className="min-h-screen bg-gray-950 p-4 py-8">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-500/15 mb-4">
            <CheckCircle className="w-8 h-8 text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">{feedback.headline}</h1>
          <p className="text-gray-400 text-sm leading-relaxed">{feedback.subtext}</p>
        </div>

        {/* Provisional badge + baseline progress */}
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-blue-500/30 bg-blue-500/10 text-blue-400 text-xs">
              <Info className="w-3 h-3" />
              <span className="font-semibold">Provisional</span>
            </div>
            <span className="text-xs text-gray-500">Baseline {baselineCount} / {baselineTarget}</span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, (baselineCount / baselineTarget) * 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {complete
              ? 'Baseline built. Your next check gives a full, personalised readiness report.'
              : 'One more check-in builds your personal baseline. Come back before your next key session.'}
          </p>
        </div>

        {/* Metrics */}
        <div className="space-y-2 mb-6">
          {feedback.metrics.map((m) => {
            const fam = metricFamily(m.key);
            const Icon = fam.icon;
            const style = BAND_STYLES[m.band];
            return (
              <div key={m.key} className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg ${fam.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                    <Icon className={`w-4 h-4 ${fam.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-white text-sm font-medium">{m.label}</p>
                      <span className="text-white font-bold text-sm whitespace-nowrap">{formatValue(m)}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs ${style.chip}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                        {m.bandLabel}
                      </span>
                      {m.lowValidity && (
                        <span className="text-[10px] text-gray-500 uppercase tracking-wide">device-sensitive</span>
                      )}
                    </div>
                    <p className="text-gray-400 text-xs mt-1.5 leading-relaxed">{m.note}</p>
                    <ChangeChip change={m.change} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Recovery context (HRV) — valid from day 1 when coach has entered HRV */}
        {hrvAnalysis && hrvAnalysis.confidence !== 'none' && (
          <div className="bg-gray-900 rounded-xl p-5 border border-gray-800 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-full bg-teal-500/20 flex items-center justify-center">
                <Activity className="w-5 h-5 text-teal-400" />
              </div>
              <h2 className="text-lg font-bold text-white">Recovery context</h2>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-gray-500 text-xs mb-0.5">HRV trend</p>
                <p className="text-white text-sm">{hrvAnalysis.athleteFacingTrend}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs mb-0.5">How it affects today</p>
                <p className="text-gray-300 text-sm">{hrvAnalysis.athleteFacingImpact}</p>
              </div>
              <p className="text-gray-500 text-xs pt-1 border-t border-gray-800">{hrvAnalysis.athleteFacingConfidence}</p>
            </div>
          </div>
        )}

        {/* Validity signals */}
        {feedback.validitySignals.length > 0 && (
          <div className="bg-gray-800/40 rounded-xl p-4 mb-6 border border-gray-800">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-4 h-4 text-gray-400" />
              <h3 className="text-sm font-semibold text-gray-300">Data quality</h3>
            </div>
            <ul className="space-y-1.5">
              {feedback.validitySignals.map((s, i) => (
                <li key={i} className="text-gray-400 text-xs leading-relaxed flex gap-2">
                  <span className="text-gray-600">•</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Guidance */}
        {feedback.guidance.length > 0 && (
          <div className="bg-gray-900 rounded-xl p-5 mb-6 border border-blue-500/30">
            <h3 className="text-sm font-semibold text-white mb-3">Guidance for today</h3>
            <div className="space-y-2.5">
              {feedback.guidance.map((g, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-blue-600/70 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white font-bold text-[11px]">{i + 1}</span>
                  </div>
                  <p className="text-gray-200 text-sm leading-relaxed">{g}</p>
                </div>
              ))}
            </div>
          </div>
        )}

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
