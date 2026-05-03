import { useState } from 'react';
import { useAuth } from '../lib/auth-context';
import { LogOut, ChevronDown, ChevronUp, Shield, Zap, Target, AlertTriangle, Activity, Info } from 'lucide-react';
import type { SessionResult, SessionCall, RiskType, DomainStatus, HrvAnalysis } from '../types';
import { SESSION_CALL_LABELS, RISK_TYPE_LABELS } from '../types';

interface SessionResultScreenProps {
  result: SessionResult;
  hrvAnalysis?: HrvAnalysis | null;
  onContinue: () => void;
}

const SESSION_CALL_CONFIG: Record<SessionCall, { icon: typeof Shield; color: string; bgColor: string; borderColor: string }> = {
  ready_for_quality: {
    icon: Zap,
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
  },
  ready_with_guardrails: {
    icon: Shield,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
  },
  better_suited_to_steady_work: {
    icon: Target,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
  },
  recovery_day_preferred: {
    icon: AlertTriangle,
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
  },
};

const RISK_DESCRIPTIONS: Record<RiskType, string> = {
  pacing: 'Pacing decisions may be harder to control',
  fueling: 'Fueling cues may be easier to miss',
  focus: 'Attention may drift more easily',
  complexity: 'Complex decisions may be harder',
  recovery: 'Recovery should be the priority',
};

const DOMAIN_DESCRIPTIONS: Record<string, string> = {
  Control: 'Impulse control, pacing decisions',
  Adapt: 'Flexibility, plan changes',
  Focus: 'Attention, vigilance',
};

function DomainIndicator({ label, status }: { label: string; status: DomainStatus }) {
  const colors: Record<DomainStatus, string> = {
    green: 'bg-green-500',
    amber: 'bg-yellow-500',
    red: 'bg-red-500',
  };

  return (
    <div className="p-4 bg-gray-800/50 rounded-lg">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-3 h-3 rounded-full flex-shrink-0 ${colors[status]}`} />
        <span className="text-gray-300 text-sm font-medium">{label}</span>
      </div>
      <p className="text-xs text-gray-500">{DOMAIN_DESCRIPTIONS[label]}</p>
    </div>
  );
}

function ConfidenceBadge({ confidence }: { confidence: { level: 'high' | 'moderate' | 'low'; reason: string } | null }) {
  if (!confidence) return null;

  const styles: Record<string, { bg: string; text: string; label: string }> = {
    high: { bg: 'bg-green-500/15 border-green-500/30', text: 'text-green-400', label: 'High confidence' },
    moderate: { bg: 'bg-yellow-500/15 border-yellow-500/30', text: 'text-yellow-400', label: 'Moderate confidence' },
    low: { bg: 'bg-gray-700/60 border-gray-600/50', text: 'text-gray-400', label: 'Low confidence' },
  };

  const s = styles[confidence.level];

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs ${s.bg} ${s.text}`}>
      <Info className="w-3 h-3 flex-shrink-0" />
      <span><span className="font-semibold">{s.label}</span> — {confidence.reason}</span>
    </div>
  );
}

export function SessionResultScreen({ result, hrvAnalysis, onContinue }: SessionResultScreenProps) {
  const { signOut } = useAuth();
  const [showDetails, setShowDetails] = useState(false);

  const config = SESSION_CALL_CONFIG[result.sessionCall];
  const Icon = config.icon;

  return (
    <div className="min-h-screen bg-gray-950 p-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-end mb-6">
          <button
            onClick={signOut}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>

        <div className={`rounded-2xl p-8 mb-6 border-2 ${config.bgColor} ${config.borderColor}`}>
          <div className="flex items-center gap-4 mb-4">
            <div className={`w-16 h-16 rounded-full ${config.bgColor} border-2 ${config.borderColor} flex items-center justify-center`}>
              <Icon className={`w-8 h-8 ${config.color}`} />
            </div>
            <div>
              <p className="text-gray-400 text-sm uppercase tracking-wide mb-1">Today's Call</p>
              <h1 className={`text-3xl font-bold ${config.color}`}>
                {SESSION_CALL_LABELS[result.sessionCall]}
              </h1>
            </div>
          </div>

          {result.callConfidence && (
            <div className="mb-4">
              <ConfidenceBadge confidence={result.callConfidence} />
            </div>
          )}

          <div className="mt-2 pt-6 border-t border-gray-700/50">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-gray-400 text-sm">Main risk today:</span>
              <span className="text-white font-semibold">{RISK_TYPE_LABELS[result.primaryRisk]}</span>
            </div>
            <p className="text-gray-300">{RISK_DESCRIPTIONS[result.primaryRisk]}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <DomainIndicator label="Control" status={result.controlStatus} />
          <DomainIndicator label="Adapt" status={result.adaptStatus} />
          <DomainIndicator label="Focus" status={result.focusStatus} />
        </div>

        <div className="bg-gray-900 rounded-xl p-6 mb-6 border border-gray-800">
          <h2 className="text-xl font-bold text-white mb-4">What changed</h2>
          <p className="text-gray-300 leading-relaxed">{result.whatChangedText}</p>
        </div>

        <div className="bg-gray-900 rounded-xl p-6 mb-6 border border-gray-800">
          <h2 className="text-xl font-bold text-white mb-4">What it means</h2>
          <p className="text-gray-300 leading-relaxed">{result.whatItMeansText}</p>
        </div>

        <div className="bg-gray-900 rounded-xl p-6 mb-6 border border-blue-500/30">
          <h2 className="text-xl font-bold text-white mb-4">What to do</h2>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white font-bold text-sm">1</span>
              </div>
              <p className="text-gray-200 text-lg">{result.action1}</p>
            </div>
            {result.action2 && (
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-blue-600/60 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white font-bold text-sm">2</span>
                </div>
                <p className="text-gray-200 text-lg">{result.action2}</p>
              </div>
            )}
          </div>
        </div>

        {hrvAnalysis && hrvAnalysis.confidence !== 'none' && (
          <div className="bg-gray-900 rounded-xl p-6 mb-6 border border-gray-800">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-teal-500/20 flex items-center justify-center">
                <Activity className="w-5 h-5 text-teal-400" />
              </div>
              <h2 className="text-xl font-bold text-white">Recovery context</h2>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-gray-400 text-sm mb-1">HRV trend</p>
                <p className="text-white">{hrvAnalysis.athleteFacingTrend}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm mb-1">What it may mean</p>
                <p className="text-gray-300">{hrvAnalysis.athleteFacingMeaning}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm mb-1">How it affects today</p>
                <p className="text-gray-300">{hrvAnalysis.athleteFacingImpact}</p>
              </div>
              <div className="pt-2 border-t border-gray-800">
                <p className="text-gray-500 text-sm">{hrvAnalysis.athleteFacingConfidence}</p>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full flex items-center justify-center gap-2 py-3 text-gray-400 hover:text-white transition-colors mb-4"
        >
          <span className="text-sm">Why this matters + research context</span>
          {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showDetails && (
          <div className="space-y-4 mb-6">
            <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
              <h3 className="text-lg font-semibold text-white mb-3">Why this matters</h3>
              <p className="text-gray-400 leading-relaxed">{result.whyThisMattersText}</p>
            </div>
          </div>
        )}

        <button
          onClick={onContinue}
          className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white text-xl font-bold rounded-xl transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
