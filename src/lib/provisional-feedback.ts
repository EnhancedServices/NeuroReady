import type { MetricKey } from './scoring';

/*
  Provisional (pre-baseline) feedback.

  Before an athlete has a personal baseline, the app cannot make an
  intra-individual readiness call. This module produces *provisional*,
  clearly-labeled feedback so check #1 still gives useful guidance.

  IMPORTANT on validity (see reference bands below):
  - Stroop interference and Task-switch cost are WITHIN-session difference
    scores (incongruent - congruent; switch - repeat). They subtract out the
    athlete's own base speed and device latency, so they are the most
    defensible to compare against broad population bands.
  - PVT median RT is an ABSOLUTE reaction time and is sensitive to device /
    touchscreen latency and the brief (2-min) format, so it is flagged
    `lowValidity` and framed cautiously.
  - Lapses, false starts and error counts are interpretable in absolute terms
    regardless of baseline and are strong day-1 signals.

  All thresholds are literature-informed DEFAULTS and are intentionally easy to
  tune. They are NOT diagnostic cut-offs. Sources are approximate ranges from
  cognitive/sleep-science literature (Stroop effect, task-switching cost,
  psychomotor vigilance) adapted to this app's short, touchscreen test formats.
*/

export type ProvisionalBand = 'strong' | 'typical' | 'watch';

export interface ProvisionalMetric {
  key: MetricKey;
  label: string;
  value: number;
  unit: string;
  band: ProvisionalBand;
  bandLabel: string;
  note: string;
  lowValidity: boolean;
  change: {
    text: string;
    direction: 'improved' | 'steady' | 'declined';
  } | null;
}

export interface ProvisionalFeedback {
  headline: string;
  subtext: string;
  metrics: ProvisionalMetric[];
  validitySignals: string[];
  guidance: string[];
  hasPrevious: boolean;
}

interface BandConfig {
  key: MetricKey;
  label: string;
  unit: string;
  lowValidity: boolean;
  // For all metrics here, lower is better.
  // value <= strongMax -> strong; value <= typicalMax -> typical; else watch.
  strongMax: number;
  typicalMax: number;
  notes: Record<ProvisionalBand, string>;
}

// Tunable reference bands. Adjust these as your own data accumulates.
export const REFERENCE_BANDS: Record<MetricKey, BandConfig> = {
  stroop_interference_ms: {
    key: 'stroop_interference_ms',
    label: 'Impulse control (Stroop interference)',
    unit: 'ms',
    lowValidity: false,
    strongMax: 60,
    typicalMax: 150,
    notes: {
      strong: 'Low interference — impulse control looks sharp.',
      typical: 'Interference is in the typical range for healthy adults.',
      watch: 'Higher interference — impulse control may be more taxed today.',
    },
  },
  switch_cost_ms: {
    key: 'switch_cost_ms',
    label: 'Flexibility (task-switch cost)',
    unit: 'ms',
    lowValidity: false,
    strongMax: 120,
    typicalMax: 350,
    notes: {
      strong: 'Low switch cost — mental flexibility looks sharp.',
      typical: 'Switch cost is in the typical range.',
      watch: 'Higher switch cost — switching between rules costs more today.',
    },
  },
  pvt_median_rt_ms: {
    key: 'pvt_median_rt_ms',
    label: 'Attention (reaction time)',
    unit: 'ms',
    lowValidity: true,
    strongMax: 320,
    typicalMax: 450,
    notes: {
      strong: 'Fast, alert reaction times.',
      typical: 'Reaction time is in the typical alert range.',
      watch: 'Slower reaction time — can reflect fatigue or short sleep.',
    },
  },
  pvt_lapses: {
    key: 'pvt_lapses',
    label: 'Attention lapses (>500ms)',
    unit: '',
    lowValidity: false,
    strongMax: 1,
    typicalMax: 4,
    notes: {
      strong: 'Very few lapses — attention held steady.',
      typical: 'A few lapses, within a normal range for a brief test.',
      watch: 'Several lapses — a common early sign of sleep debt or fatigue.',
    },
  },
  pvt_false_starts: {
    key: 'pvt_false_starts',
    label: 'False starts (early taps)',
    unit: '',
    lowValidity: false,
    strongMax: 1,
    typicalMax: 3,
    notes: {
      strong: 'Well-timed responses — you waited for the signal.',
      typical: 'A couple of early taps — mostly well-timed.',
      watch: 'Several early taps — try to wait for the signal before responding.',
    },
  },
  stroop_errors: {
    key: 'stroop_errors',
    label: 'Stroop errors',
    unit: '',
    lowValidity: false,
    strongMax: 2,
    typicalMax: 5,
    notes: {
      strong: 'Very accurate.',
      typical: 'A few errors, within a normal range.',
      watch: 'More errors than usual — accuracy dipped.',
    },
  },
  switch_errors: {
    key: 'switch_errors',
    label: 'Task-switch errors',
    unit: '',
    lowValidity: false,
    strongMax: 2,
    typicalMax: 5,
    notes: {
      strong: 'Very accurate on switches.',
      typical: 'A few switch errors, within a normal range.',
      watch: 'More switch errors than usual — accuracy dipped.',
    },
  },
};

// Minimum meaningful change to call a metric improved/declined vs last check.
const CHANGE_THRESHOLDS: Record<MetricKey, number> = {
  stroop_interference_ms: 25,
  switch_cost_ms: 40,
  pvt_median_rt_ms: 20,
  pvt_lapses: 2,
  pvt_false_starts: 2,
  stroop_errors: 2,
  switch_errors: 2,
};

const BAND_LABELS: Record<ProvisionalBand, string> = {
  strong: 'Sharp',
  typical: 'Typical range',
  watch: 'Worth watching',
};

function classifyBand(config: BandConfig, value: number): ProvisionalBand {
  if (value <= config.strongMax) return 'strong';
  if (value <= config.typicalMax) return 'typical';
  return 'watch';
}

function describeChange(key: MetricKey, value: number, previous: number): ProvisionalMetric['change'] {
  const delta = value - previous; // lower is better for every metric here
  const threshold = CHANGE_THRESHOLDS[key];

  if (Math.abs(delta) < threshold) {
    return { text: 'About the same as your last check', direction: 'steady' };
  }

  const unit = REFERENCE_BANDS[key].unit;
  const magnitude = Math.abs(Math.round(delta));
  const amount = unit === 'ms' ? `${magnitude}ms` : `${magnitude}`;

  return delta < 0
    ? { text: `${amount} better than your last check`, direction: 'improved' }
    : { text: `${amount} higher than your last check`, direction: 'declined' };
}

const METRIC_ORDER: MetricKey[] = [
  'stroop_interference_ms',
  'switch_cost_ms',
  'pvt_median_rt_ms',
  'pvt_lapses',
  'pvt_false_starts',
  'stroop_errors',
  'switch_errors',
];

export function buildProvisionalFeedback(
  today: Partial<Record<MetricKey, number>>,
  previous: Partial<Record<MetricKey, number>> | null
): ProvisionalFeedback {
  const hasPrevious = !!previous && METRIC_ORDER.some((k) => typeof previous[k] === 'number');

  const metrics: ProvisionalMetric[] = [];
  for (const key of METRIC_ORDER) {
    const value = today[key];
    if (typeof value !== 'number' || !Number.isFinite(value)) continue;
    const config = REFERENCE_BANDS[key];
    const band = classifyBand(config, value);
    const prevValue = previous?.[key];
    const change =
      hasPrevious && typeof prevValue === 'number' ? describeChange(key, value, prevValue) : null;

    metrics.push({
      key,
      label: config.label,
      value,
      unit: config.unit,
      band,
      bandLabel: BAND_LABELS[band],
      note: config.notes[band],
      lowValidity: config.lowValidity,
      change,
    });
  }

  const validitySignals = buildValiditySignals(today);
  const guidance = buildGuidance(metrics, today);

  const watchCount = metrics.filter((m) => m.band === 'watch').length;
  const headline =
    watchCount === 0
      ? 'Strong first read — nice work.'
      : watchCount <= 2
      ? 'Solid check-in with a couple of things to watch.'
      : 'Useful check-in — a few areas look taxed today.';

  const subtext = hasPrevious
    ? 'This is a provisional read against general reference ranges, plus how today compares to your last check. It becomes fully personalised once your baseline is built.'
    : 'This is a provisional read against general reference ranges — not a personalised readiness call yet. Each check-in sharpens it to what is normal for you.';

  return { headline, subtext, metrics, validitySignals, guidance, hasPrevious };
}

function buildValiditySignals(today: Partial<Record<MetricKey, number>>): string[] {
  const signals: string[] = [];
  const falseStarts = today.pvt_false_starts ?? 0;
  const lapses = today.pvt_lapses ?? 0;
  const stroopErr = today.stroop_errors ?? 0;
  const switchErr = today.switch_errors ?? 0;

  if (falseStarts >= 4) {
    signals.push('Several early taps in the attention test — wait for the signal so the score reflects your true reaction time.');
  }
  if (stroopErr + switchErr >= 10) {
    signals.push('Higher error counts than typical — make sure you are testing somewhere quiet and undistracted.');
  }
  if (lapses >= 5) {
    signals.push('Multiple attention lapses — this is a common, valid early signal of sleep debt or fatigue.');
  }
  if (signals.length === 0) {
    signals.push('Clean run — the numbers look like a fair reflection of your effort today.');
  }
  return signals;
}

function buildGuidance(metrics: ProvisionalMetric[], today: Partial<Record<MetricKey, number>>): string[] {
  const guidance: string[] = [];
  const watchKeys = new Set(metrics.filter((m) => m.band === 'watch').map((m) => m.key));

  if ((today.pvt_false_starts ?? 0) >= 4) {
    guidance.push('On the attention test, hold off tapping until the number appears — a few early taps inflated your false starts.');
  }
  if (watchKeys.has('pvt_median_rt_ms') || watchKeys.has('pvt_lapses')) {
    guidance.push('Slower attention often tracks short sleep — prioritise sleep tonight and keep tomorrow simple.');
  }
  if (watchKeys.has('stroop_interference_ms') || watchKeys.has('switch_cost_ms')) {
    guidance.push('Where you can today, keep decisions simple and pre-commit your plan rather than improvising.');
  }

  guidance.push('Test at a consistent time of day (mornings work well) so your baseline is clean and comparable.');

  return guidance.slice(0, 4);
}
