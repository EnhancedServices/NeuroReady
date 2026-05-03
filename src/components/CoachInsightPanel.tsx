import { Brain, MessageSquare, ArrowRight, HelpCircle, Shield, AlertTriangle, Activity, Zap, CircleDot } from 'lucide-react';
import type { CoachPatternType, CoachConfidenceLevel } from '../types';
import { COACH_PATTERN_LABELS, COACH_CONFIDENCE_LABELS } from '../types';

interface CoachInsightPanelProps {
  patternType: CoachPatternType;
  insightText: string;
  discussionPrompt: string;
  nextStep: string;
  whyItMatters: string;
  confidence: CoachConfidenceLevel;
}

function PatternIcon({ pattern }: { pattern: CoachPatternType }) {
  switch (pattern) {
    case 'stable_readiness':
      return <Shield className="w-5 h-5" />;
    case 'mental_strain':
      return <Brain className="w-5 h-5" />;
    case 'recovery_strain':
      return <Activity className="w-5 h-5" />;
    case 'combined_strain':
      return <AlertTriangle className="w-5 h-5" />;
    case 'execution_risk':
      return <Zap className="w-5 h-5" />;
    case 'unclear_pattern':
    default:
      return <CircleDot className="w-5 h-5" />;
  }
}

function getPatternColors(pattern: CoachPatternType): { bg: string; border: string; text: string; icon: string } {
  switch (pattern) {
    case 'stable_readiness':
      return {
        bg: 'bg-green-500/10',
        border: 'border-green-500/30',
        text: 'text-green-400',
        icon: 'bg-green-500/20',
      };
    case 'mental_strain':
      return {
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/30',
        text: 'text-amber-400',
        icon: 'bg-amber-500/20',
      };
    case 'recovery_strain':
      return {
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/30',
        text: 'text-blue-400',
        icon: 'bg-blue-500/20',
      };
    case 'combined_strain':
      return {
        bg: 'bg-red-500/10',
        border: 'border-red-500/30',
        text: 'text-red-400',
        icon: 'bg-red-500/20',
      };
    case 'execution_risk':
      return {
        bg: 'bg-orange-500/10',
        border: 'border-orange-500/30',
        text: 'text-orange-400',
        icon: 'bg-orange-500/20',
      };
    case 'unclear_pattern':
    default:
      return {
        bg: 'bg-gray-500/10',
        border: 'border-gray-500/30',
        text: 'text-gray-400',
        icon: 'bg-gray-500/20',
      };
  }
}

function getConfidenceColor(confidence: CoachConfidenceLevel): string {
  switch (confidence) {
    case 'high':
      return 'text-green-400';
    case 'moderate':
      return 'text-yellow-400';
    case 'low':
      return 'text-orange-400';
    default:
      return 'text-gray-400';
  }
}

export function CoachInsightPanel({
  patternType,
  insightText,
  discussionPrompt,
  nextStep,
  whyItMatters,
  confidence,
}: CoachInsightPanelProps) {
  const colors = getPatternColors(patternType);

  return (
    <div className={`rounded-xl p-6 border ${colors.bg} ${colors.border}`}>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full ${colors.icon} flex items-center justify-center ${colors.text}`}>
            <PatternIcon pattern={patternType} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Coach Insight</h2>
            <p className="text-sm text-gray-400">Decision-tree interpretation</p>
          </div>
        </div>
        <div className="text-right">
          <span className={`inline-block px-3 py-1 text-sm font-medium rounded-full ${colors.bg} ${colors.text}`}>
            {COACH_PATTERN_LABELS[patternType]}
          </span>
          <p className={`text-xs mt-1 ${getConfidenceColor(confidence)}`}>
            {COACH_CONFIDENCE_LABELS[confidence]} confidence
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="p-4 bg-gray-800/50 rounded-lg">
          <div className="flex items-start gap-3">
            <Brain className="w-5 h-5 text-teal-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Coaching Insight</p>
              <p className="text-gray-200">{insightText}</p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-gray-800/50 rounded-lg">
          <div className="flex items-start gap-3">
            <MessageSquare className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Discussion Prompt</p>
              <p className="text-gray-200 italic">"{discussionPrompt}"</p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-gray-800/50 rounded-lg">
          <div className="flex items-start gap-3">
            <ArrowRight className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Next Step</p>
              <p className="text-gray-200">{nextStep}</p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-gray-800/50 rounded-lg">
          <div className="flex items-start gap-3">
            <HelpCircle className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Why It Matters</p>
              <p className="text-gray-200">{whyItMatters}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
