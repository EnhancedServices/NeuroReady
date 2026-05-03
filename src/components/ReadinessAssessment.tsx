import { Brain, MessageSquare, ArrowRight, HelpCircle, Shield, AlertTriangle, Activity, Zap, CircleDot, Moon } from 'lucide-react';
import type { HrvAnalysis, SleepQuality } from '../types';

interface SleepEntry {
  id: string;
  date: string;
  sleep_hours: number | null;
  sleep_quality: SleepQuality | null;
}

interface ReadinessAssessmentProps {
  hrvAnalysis: HrvAnalysis | null;
  sleepHistory: SleepEntry[];
  sessionCount: number;
}

type ReadinessPattern =
  | 'ready'
  | 'sleep_concern'
  | 'hrv_concern'
  | 'combined_concern'
  | 'insufficient_data';

interface ReadinessInsight {
  pattern: ReadinessPattern;
  patternLabel: string;
  insightText: string;
  discussionPrompt: string;
  nextStep: string;
  whyItMatters: string;
  confidence: 'high' | 'moderate' | 'low';
}

function calculateSleepConcern(sleepHistory: SleepEntry[]): { concern: boolean; avgHours: number; recentQuality: SleepQuality | null } {
  const recent = sleepHistory.slice(0, 7);
  const withHours = recent.filter(s => s.sleep_hours !== null && s.sleep_hours > 0);

  if (withHours.length === 0) {
    return { concern: false, avgHours: 0, recentQuality: null };
  }

  const avgHours = withHours.reduce((sum, s) => sum + (s.sleep_hours || 0), 0) / withHours.length;
  const recentQuality = recent[0]?.sleep_quality || null;

  const concern = avgHours < 7 || recentQuality === 'poor' || recentQuality === 'fair';

  return { concern, avgHours, recentQuality };
}

function generateReadinessInsight(
  hrvAnalysis: HrvAnalysis | null,
  sleepHistory: SleepEntry[],
  sessionCount: number
): ReadinessInsight {
  const sleepData = calculateSleepConcern(sleepHistory);
  const hasHrvData = hrvAnalysis && hrvAnalysis.confidence !== 'none';
  const hasSleepData = sleepData.avgHours > 0;

  if (!hasHrvData && !hasSleepData) {
    return {
      pattern: 'insufficient_data',
      patternLabel: 'Insufficient Data',
      insightText: 'Not enough HRV or sleep data to assess readiness. Add historical data to enable insights.',
      discussionPrompt: 'What data sources does this athlete currently use for tracking?',
      nextStep: 'Add 5-7 days of HRV and sleep data via the Edit buttons above.',
      whyItMatters: 'Consistent data collection enables pattern recognition and personalised guidance.',
      confidence: 'low',
    };
  }

  const hrvConcern = hasHrvData && (
    hrvAnalysis!.trendCategory === 'clearly_suppressed' ||
    hrvAnalysis!.trendCategory === 'mildly_suppressed'
  );
  const sleepConcern = sleepData.concern;

  if (!hrvConcern && !sleepConcern) {
    return {
      pattern: 'ready',
      patternLabel: 'Stable Readiness',
      insightText: hasSleepData && hasHrvData
        ? `Recovery context looks supportive. HRV is ${hrvAnalysis!.trendCategory?.replace('_', ' ')} and sleep is averaging ${sleepData.avgHours.toFixed(1)} hours.`
        : hasHrvData
        ? `HRV trend is ${hrvAnalysis!.trendCategory?.replace('_', ' ')}. Recovery context appears stable based on available data.`
        : `Sleep is averaging ${sleepData.avgHours.toFixed(1)} hours. Add HRV data for a more complete picture.`,
      discussionPrompt: 'What routines are helping maintain this consistency?',
      nextStep: 'Continue current recovery practices. This is a good window for quality sessions if planned.',
      whyItMatters: 'Stable readiness suggests the athlete is absorbing training load without obvious strain.',
      confidence: hasHrvData && hasSleepData ? 'high' : 'moderate',
    };
  }

  if (sleepConcern && !hrvConcern) {
    const sleepIssue = sleepData.avgHours < 7
      ? `averaging ${sleepData.avgHours.toFixed(1)} hours`
      : `quality rated ${sleepData.recentQuality}`;
    return {
      pattern: 'sleep_concern',
      patternLabel: 'Sleep Concern',
      insightText: `Sleep is ${sleepIssue}. ${hasHrvData ? 'HRV is holding stable, suggesting the athlete may be coping short-term.' : 'Consider adding HRV data to assess recovery capacity.'} Watch for accumulating fatigue if this continues.`,
      discussionPrompt: 'What has been affecting sleep recently? Work, travel, stress, or training timing?',
      nextStep: 'Keep training if readiness holds, but protect upcoming quality sessions by addressing sleep inputs.',
      whyItMatters: 'Short sleep can accumulate. Cognitive and execution errors become more likely before subjective fatigue appears.',
      confidence: hasHrvData ? 'moderate' : 'low',
    };
  }

  if (hrvConcern && !sleepConcern) {
    return {
      pattern: 'hrv_concern',
      patternLabel: 'Recovery Concern',
      insightText: `HRV is ${hrvAnalysis!.trendCategory?.replace('_', ' ')} (${hrvAnalysis!.percentDiff > 0 ? '+' : ''}${hrvAnalysis!.percentDiff.toFixed(1)}% from baseline). ${hasSleepData ? `Sleep looks adequate at ${sleepData.avgHours.toFixed(1)} hours.` : ''} The system may be under more load than sleep alone suggests.`,
      discussionPrompt: 'Is this a productive training response, or is load accumulating faster than intended?',
      nextStep: 'Consider whether this week\'s quality sessions should proceed with full intensity or be modified.',
      whyItMatters: 'Suppressed HRV can indicate the body is working harder to maintain. Quality may hold for now, but tolerance may be narrowing.',
      confidence: hrvAnalysis!.confidence === 'high' ? 'high' : 'moderate',
    };
  }

  return {
    pattern: 'combined_concern',
    patternLabel: 'Combined Concern',
    insightText: `Both HRV (${hrvAnalysis!.trendCategory?.replace('_', ' ')}) and sleep (${sleepData.avgHours.toFixed(1)} hours) suggest elevated recovery load. The athlete is less likely to execute quality work well in this state.`,
    discussionPrompt: 'What changed in training, life stress, illness, or sleep patterns this week?',
    nextStep: 'Prioritise recovery inputs before the next key session. Consider downgrading quality work to steady or easy efforts.',
    whyItMatters: 'When both systems point down, the chance of poor execution and poor adaptation rises.',
    confidence: hasHrvData && hasSleepData ? 'high' : 'moderate',
  };
}

function getPatternColors(pattern: ReadinessPattern): { bg: string; border: string; text: string; icon: string } {
  switch (pattern) {
    case 'ready':
      return { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-400', icon: 'bg-green-500/20' };
    case 'sleep_concern':
      return { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400', icon: 'bg-amber-500/20' };
    case 'hrv_concern':
      return { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', icon: 'bg-blue-500/20' };
    case 'combined_concern':
      return { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', icon: 'bg-red-500/20' };
    case 'insufficient_data':
    default:
      return { bg: 'bg-gray-500/10', border: 'border-gray-500/30', text: 'text-gray-400', icon: 'bg-gray-500/20' };
  }
}

function PatternIcon({ pattern }: { pattern: ReadinessPattern }) {
  switch (pattern) {
    case 'ready':
      return <Shield className="w-5 h-5" />;
    case 'sleep_concern':
      return <Moon className="w-5 h-5" />;
    case 'hrv_concern':
      return <Activity className="w-5 h-5" />;
    case 'combined_concern':
      return <AlertTriangle className="w-5 h-5" />;
    case 'insufficient_data':
    default:
      return <CircleDot className="w-5 h-5" />;
  }
}

function getConfidenceColor(confidence: 'high' | 'moderate' | 'low'): string {
  switch (confidence) {
    case 'high': return 'text-green-400';
    case 'moderate': return 'text-yellow-400';
    case 'low': return 'text-orange-400';
  }
}

export function ReadinessAssessment({ hrvAnalysis, sleepHistory, sessionCount }: ReadinessAssessmentProps) {
  const insight = generateReadinessInsight(hrvAnalysis, sleepHistory, sessionCount);
  const colors = getPatternColors(insight.pattern);

  return (
    <div className={`rounded-xl p-6 border ${colors.bg} ${colors.border}`}>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full ${colors.icon} flex items-center justify-center ${colors.text}`}>
            <PatternIcon pattern={insight.pattern} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Readiness Assessment</h2>
            <p className="text-sm text-gray-400">Based on HRV and sleep data</p>
          </div>
        </div>
        <div className="text-right">
          <span className={`inline-block px-3 py-1 text-sm font-medium rounded-full ${colors.bg} ${colors.text}`}>
            {insight.patternLabel}
          </span>
          <p className={`text-xs mt-1 ${getConfidenceColor(insight.confidence)}`}>
            {insight.confidence.charAt(0).toUpperCase() + insight.confidence.slice(1)} confidence
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="p-4 bg-gray-800/50 rounded-lg">
          <div className="flex items-start gap-3">
            <Brain className="w-5 h-5 text-teal-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Coaching Insight</p>
              <p className="text-gray-200">{insight.insightText}</p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-gray-800/50 rounded-lg">
          <div className="flex items-start gap-3">
            <MessageSquare className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Discussion Prompt</p>
              <p className="text-gray-200 italic">"{insight.discussionPrompt}"</p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-gray-800/50 rounded-lg">
          <div className="flex items-start gap-3">
            <ArrowRight className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Next Step</p>
              <p className="text-gray-200">{insight.nextStep}</p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-gray-800/50 rounded-lg">
          <div className="flex items-start gap-3">
            <HelpCircle className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Why It Matters</p>
              <p className="text-gray-200">{insight.whyItMatters}</p>
            </div>
          </div>
        </div>
      </div>

      {sessionCount === 0 && (
        <p className="text-sm text-gray-500 mt-4 text-center">
          Complete test sessions to unlock per-session insights with cognitive readiness analysis.
        </p>
      )}
    </div>
  );
}
