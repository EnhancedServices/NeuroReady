export type Light = "green" | "amber" | "red";

export type MetricKey =
  | "stroop_interference_ms"
  | "stroop_errors"
  | "switch_cost_ms"
  | "switch_errors"
  | "pvt_median_rt_ms"
  | "pvt_lapses"
  | "pvt_false_starts";

export type TestName = "stroop" | "taskSwitch" | "pvt3";

export type MetricDirection = "lower_better" | "higher_better";

export type MetricScore = {
  key: MetricKey;
  value: number;
  baselineMedian: number;
  baselineSD: number;
  z: number;
  points: number;
  light: Light;
};

export type TestScore = {
  name: TestName;
  score: number;
  light: Light;
  metrics: MetricScore[];
  label: string;
  summary: string;
  actions: string[];
};

export type BatteryScore = {
  overallScore: number;
  overallLight: Light;
  tests: TestScore[];
  headline: string;
  actions: string[];
};

export type SessionData = {
  dateISO: string;
  metrics: Partial<Record<MetricKey, number>>;
  tags?: {
    sleepHours?: number;
    hardTraining24h?: boolean;
    illnessSymptoms?: boolean;
    travel?: boolean;
  };
};

export type BaselineStats = {
  median: number;
  sd: number;
};

export type Baseline = Record<MetricKey, BaselineStats>;

export type ScoringConfig = {
  zGreenMax: number;
  zAmberMax: number;
  pointsPerZ: number;
  baselineWindow: number;
  minBaselineSessions: number;
};

export const DEFAULT_CONFIG: ScoringConfig = {
  zGreenMax: 0.75,
  zAmberMax: 1.5,
  pointsPerZ: 25,
  baselineWindow: 10,
  minBaselineSessions: 3,
};

const METRIC_DIRECTION: Record<MetricKey, MetricDirection> = {
  stroop_interference_ms: "lower_better",
  stroop_errors: "lower_better",
  switch_cost_ms: "lower_better",
  switch_errors: "lower_better",
  pvt_median_rt_ms: "lower_better",
  pvt_lapses: "lower_better",
  pvt_false_starts: "lower_better",
};

const TEST_WEIGHTS: Record<TestName, { speed: number; control: number; speedKey: MetricKey; controlKey: MetricKey; label: string }> =
  {
    stroop: { speed: 0.6, control: 0.4, speedKey: "stroop_interference_ms", controlKey: "stroop_errors", label: "Control" },
    taskSwitch: { speed: 0.6, control: 0.4, speedKey: "switch_cost_ms", controlKey: "switch_errors", label: "Adapt" },
    pvt3: { speed: 0.6, control: 0.4, speedKey: "pvt_median_rt_ms", controlKey: "pvt_lapses", label: "Focus" },
  };

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function median(arr: number[]) {
  if (arr.length === 0) return NaN;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function mean(arr: number[]) {
  return arr.reduce((s, x) => s + x, 0) / (arr.length || 1);
}

function sd(arr: number[]) {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  const sumSqDiffs = arr.reduce((acc, x) => acc + (x - m) ** 2, 0);
  return Math.sqrt(sumSqDiffs / (arr.length - 1));
}

export function buildBaseline(sessions: SessionData[], config: ScoringConfig = DEFAULT_CONFIG): Baseline | null {
  const recent = [...sessions]
    .sort((a, b) => a.dateISO.localeCompare(b.dateISO))
    .slice(-config.baselineWindow);

  if (recent.length < config.minBaselineSessions) return null;

  const baseline: Partial<Baseline> = {};
  const keys = Object.keys(METRIC_DIRECTION) as MetricKey[];

  for (const key of keys) {
    const values = recent
      .map((s) => s.metrics[key])
      .filter((v): v is number => typeof v === "number" && Number.isFinite(v));

    if (values.length < config.minBaselineSessions) continue;

    const med = median(values);
    const s = sd(values);

    const sdSafe = s < 1e-6 ? 1 : s;

    baseline[key] = { median: med, sd: sdSafe };
  }

  const haveKeys = Object.keys(baseline).length;
  return haveKeys >= 4 ? (baseline as Baseline) : null;
}

export function zScore(key: MetricKey, value: number, base: BaselineStats): number {
  const dir = METRIC_DIRECTION[key];
  const raw = dir === "lower_better" ? (value - base.median) : (base.median - value);
  return raw / (base.sd || 1);
}

export function lightFromZ(z: number, config: ScoringConfig): Light {
  if (z <= config.zGreenMax) return "green";
  if (z <= config.zAmberMax) return "amber";
  return "red";
}

export function pointsFromZ(z: number, config: ScoringConfig): number {
  return clamp(100 - z * config.pointsPerZ, 0, 100);
}

export function scoreMetric(key: MetricKey, value: number, baseline: Baseline, config: ScoringConfig): MetricScore | null {
  const base = baseline[key];
  if (!base) return null;

  const z = zScore(key, value, base);
  const light = lightFromZ(z, config);
  const points = pointsFromZ(z, config);

  return {
    key,
    value,
    baselineMedian: base.median,
    baselineSD: base.sd,
    z,
    points,
    light,
  };
}

function lightFromScore(score: number): Light {
  if (score >= 75) return "green";
  if (score >= 55) return "amber";
  return "red";
}

function stroopActions(light: Light): string[] {
  if (light === "green") return ["Proceed with the plan", "Use your normal fueling reminders"];
  if (light === "amber") return ["Keep the session, reduce surges", "Cap the first 20–30 minutes", "Set 20-minute fuel alerts"];
  return ["Switch to low-risk training", "Avoid group-ride surges", "Make fueling automatic: alerts + easy access"];
}

function switchActions(light: Light): string[] {
  if (light === "green") return ["Proceed with the plan", "Stick to pre-set pacing targets"];
  if (light === "amber") return ["Reduce session complexity", "Pre-commit intervals and recovery", "Avoid last-minute plan changes"];
  return ["Choose steady work over variable efforts", "Simplify the route/session", "Use fixed checkpoints for pace and fuel"];
}

function pvtActions(light: Light): string[] {
  if (light === "green") return ["Proceed with the plan", "Keep your normal check-ins"];
  if (light === "amber") return ["Keep training, add guardrails", "Use timed fuel prompts", "Avoid technical or high-risk sessions"];
  return ["Prioritize sleep and recovery today", "Do easy aerobic volume or rest", "If illness signs: stop and reassess"];
}

function summaryForTest(name: TestName, light: Light): string {
  if (name === "stroop") {
    if (light === "green") return "Impulse control looks normal today.";
    if (light === "amber") return "Higher risk of pacing spikes and poor surge choices.";
    return "Control is down. Keep decisions simple and cap intensity.";
  }
  if (name === "taskSwitch") {
    if (light === "green") return "Flexibility looks normal today.";
    if (light === "amber") return "Adapting to changes may feel harder today.";
    return "Adaptability is down. Avoid complex sessions and keep it steady.";
  }
  if (light === "green") return "Attention looks normal today.";
  if (light === "amber") return "Higher risk of missed cues and drifting focus.";
  return "Attention is down. Expect missed fuel cues and pacing drift without guardrails.";
}

export function scoreTest(
  name: TestName,
  today: Partial<Record<MetricKey, number>>,
  baseline: Baseline,
  config: ScoringConfig = DEFAULT_CONFIG
): TestScore {
  const w = TEST_WEIGHTS[name];
  const speedVal = today[w.speedKey];
  const controlVal = today[w.controlKey];

  const speedMetric = typeof speedVal === "number" ? scoreMetric(w.speedKey, speedVal, baseline, config) : null;
  const controlMetric = typeof controlVal === "number" ? scoreMetric(w.controlKey, controlVal, baseline, config) : null;

  const metrics = [speedMetric, controlMetric].filter((m): m is MetricScore => !!m);

  const speedPoints = speedMetric?.points ?? 50;
  const controlPoints = controlMetric?.points ?? 50;

  const score = clamp(w.speed * speedPoints + w.control * controlPoints, 0, 100);
  const light = lightFromScore(score);

  const actions =
    name === "stroop" ? stroopActions(light) : name === "taskSwitch" ? switchActions(light) : pvtActions(light);

  return {
    name,
    score: Math.round(score),
    light,
    metrics,
    label: w.label,
    summary: summaryForTest(name, light),
    actions,
  };
}

export function scoreBattery(
  today: Partial<Record<MetricKey, number>>,
  baseline: Baseline,
  config: ScoringConfig = DEFAULT_CONFIG
): BatteryScore {
  const stroop = scoreTest("stroop", today, baseline, config);
  const taskSwitch = scoreTest("taskSwitch", today, baseline, config);
  const pvt3 = scoreTest("pvt3", today, baseline, config);

  const tests = [stroop, taskSwitch, pvt3];
  const avg = mean(tests.map((t) => t.score));

  const reds = tests.filter((t) => t.light === "red").length;

  let overallLight = lightFromScore(avg);
  if (reds >= 2) overallLight = "red";
  else if (reds === 1 && overallLight === "green") overallLight = "amber";

  const overallScore = Math.round(avg);

  const headline =
    overallLight === "green"
      ? "Ready to train as planned."
      : overallLight === "amber"
      ? "Train today, but simplify decisions."
      : "Protect the day. Keep it low-risk.";

  const actionSet = new Set<string>();
  for (const t of tests) {
    if (overallLight === "green") {
      actionSet.add("Follow your fueling schedule");
      actionSet.add("Stick to your pacing targets");
      break;
    } else {
      if (t.light !== "green") t.actions.forEach((a) => actionSet.add(a));
    }
  }

  const actions = Array.from(actionSet).slice(0, 5);

  return {
    overallScore,
    overallLight,
    tests,
    headline,
    actions,
  };
}
