import { useMemo } from 'react';
import type { Session, HrvHistoryEntry, SleepQuality } from '../types';

interface SleepEntry {
  date: string;
  sleep_hours: number | null;
  sleep_quality: SleepQuality | null;
}

interface CoachTimelineProps {
  sessions: Session[];
  hrvHistory: HrvHistoryEntry[];
  sleepHistory: SleepEntry[];
}

const LABEL_WIDTH = 50;
const RIGHT_PAD = 10;

const LANE_CALL_Y = 0;
const LANE_CALL_H = 28;
const LANE_DOMAIN_Y = LANE_CALL_Y + LANE_CALL_H + 8;
const LANE_DOMAIN_H = 40;
const LANE_HRV_Y = LANE_DOMAIN_Y + LANE_DOMAIN_H + 8;
const LANE_HRV_H = 60;
const LANE_SLEEP_Y = LANE_HRV_Y + LANE_HRV_H + 8;
const LANE_SLEEP_H = 36;
const XAXIS_Y = LANE_SLEEP_Y + LANE_SLEEP_H + 4;
const XAXIS_H = 24;
const TOTAL_H = XAXIS_Y + XAXIS_H;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function sessionCallColor(call: string | null, isBaseline: boolean): string {
  if (isBaseline) return '#4B5563';
  if (!call) return '#4B5563';
  const map: Record<string, string> = {
    ready_for_quality: '#10B981',
    ready_with_guardrails: '#3B82F6',
    better_suited_to_steady_work: '#EAB308',
    recovery_day_preferred: '#EF4444',
  };
  return map[call] || '#4B5563';
}

function domainColor(status: string | null): string {
  if (status === 'green') return '#10B981';
  if (status === 'amber') return '#EAB308';
  if (status === 'red') return '#EF4444';
  return '#374151';
}

function sleepBarColor(quality: SleepQuality | null): string {
  if (!quality) return '#6B7280';
  const map: Record<SleepQuality, string> = {
    excellent: '#10B981',
    good: '#3B82F6',
    fair: '#EAB308',
    poor: '#EF4444',
  };
  return map[quality];
}

export function CoachTimeline({ sessions, hrvHistory, sleepHistory }: CoachTimelineProps) {
  const cutoff = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  }, []);

  const { dates, colWidth, svgWidth, sessionMap, hrvMap, sleepMap } = useMemo(() => {
    const dateSet = new Set<string>();
    sessions.forEach(s => { if (s.date >= cutoff) dateSet.add(s.date); });
    hrvHistory.forEach(h => { if (h.date >= cutoff) dateSet.add(h.date); });
    sleepHistory.forEach(sl => { if (sl.date >= cutoff) dateSet.add(sl.date); });

    let allDates = [...dateSet].sort();
    if (allDates.length > 20) allDates = allDates.slice(allDates.length - 20);

    const colW = allDates.length <= 10 ? 36 : allDates.length <= 15 ? 32 : 28;
    const width = LABEL_WIDTH + allDates.length * colW + RIGHT_PAD;

    return {
      dates: allDates,
      colWidth: colW,
      svgWidth: width,
      sessionMap: new Map(sessions.map(s => [s.date, s])),
      hrvMap: new Map(hrvHistory.map(h => [h.date, h])),
      sleepMap: new Map(sleepHistory.map(sl => [sl.date, sl])),
    };
  }, [sessions, hrvHistory, sleepHistory, cutoff]);

  const hrvPoints = useMemo(() => {
    return dates
      .map((d, i) => {
        const entry = hrvMap.get(d);
        if (!entry || entry.hrv_value == null) return null;
        return { i, v: entry.hrv_value };
      })
      .filter(Boolean) as { i: number; v: number }[];
  }, [dates, hrvMap]);

  const baselineHrvAvg = useMemo(() => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekCutoff = weekAgo.toISOString().split('T')[0];
    const old = hrvHistory.filter(h => h.date < weekCutoff && h.hrv_value != null);
    if (old.length === 0) return null;
    return old.reduce((s, h) => s + (h.hrv_value || 0), 0) / old.length;
  }, [hrvHistory]);

  if (dates.length < 2) {
    return (
      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4">Trend timeline</h2>
        <p className="text-gray-500 text-sm text-center py-8">
          Not enough data to show trends yet. At least 2 sessions are needed.
        </p>
      </div>
    );
  }

  const colCenter = (i: number) => LABEL_WIDTH + i * colWidth + colWidth / 2;

  let hrvMin = Infinity;
  let hrvMax = -Infinity;
  hrvPoints.forEach(({ v }) => {
    if (v < hrvMin) hrvMin = v;
    if (v > hrvMax) hrvMax = v;
  });
  const hrvRange = hrvMax - hrvMin;
  const hrvPad = (hrvRange > 0 ? hrvRange : 10) * 0.1;
  const hrvScaleMin = hrvMin - hrvPad;
  const hrvScaleMax = hrvMax + hrvPad;

  const toHrvY = (v: number): number => {
    if (hrvScaleMax === hrvScaleMin) return LANE_HRV_Y + LANE_HRV_H / 2;
    return LANE_HRV_Y + LANE_HRV_H - ((v - hrvScaleMin) / (hrvScaleMax - hrvScaleMin)) * LANE_HRV_H;
  };

  const polylinePoints = hrvPoints
    .map(({ i, v }) => `${colCenter(i).toFixed(1)},${toHrvY(v).toFixed(1)}`)
    .join(' ');

  const toSleepBarH = (hours: number): number => {
    const pct = Math.max(0, Math.min(1, (hours - 4) / 5));
    return pct * LANE_SLEEP_H;
  };

  return (
    <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 mb-6">
      <h2 className="text-lg font-semibold text-white mb-4">Trend timeline</h2>
      <div className="overflow-x-auto">
        <svg
          width={svgWidth}
          height={TOTAL_H}
          viewBox={`0 0 ${svgWidth} ${TOTAL_H}`}
          style={{ fontFamily: 'system-ui, -apple-system, sans-serif', display: 'block' }}
        >
          <text x={2} y={LANE_CALL_Y + LANE_CALL_H / 2 + 4} fontSize={10} fill="#6B7280" textAnchor="start">CALL</text>
          <text x={2} y={LANE_DOMAIN_Y + LANE_DOMAIN_H / 2 + 4} fontSize={10} fill="#6B7280" textAnchor="start">DOM</text>
          <text x={2} y={LANE_HRV_Y + LANE_HRV_H / 2 + 4} fontSize={10} fill="#6B7280" textAnchor="start">HRV</text>
          <text x={2} y={LANE_SLEEP_Y + LANE_SLEEP_H / 2 + 4} fontSize={10} fill="#6B7280" textAnchor="start">SLEEP</text>

          {dates.map((_, i) =>
            i % 2 === 0 ? (
              <rect
                key={`bg-${i}`}
                x={LABEL_WIDTH + i * colWidth}
                y={0}
                width={colWidth}
                height={XAXIS_Y}
                fill="rgba(255,255,255,0.015)"
              />
            ) : null
          )}

          {dates.map((date, i) => {
            const session = sessionMap.get(date);
            if (!session) return null;
            const color = sessionCallColor(session.session_call, session.is_baseline);
            const barW = colWidth - 4;
            const barX = LABEL_WIDTH + i * colWidth + 2;
            return (
              <rect
                key={`call-${date}`}
                x={barX.toFixed(1)}
                y={(LANE_CALL_Y + 4).toFixed(1)}
                width={barW.toFixed(1)}
                height={20}
                rx={3}
                ry={3}
                fill={color}
                opacity={0.85}
              />
            );
          })}

          {dates.map((date, i) => {
            const session = sessionMap.get(date);
            if (!session) return null;
            const cx = colCenter(i).toFixed(1);
            const spacing = LANE_DOMAIN_H / 4;
            return (
              <g key={`dom-${date}`}>
                <circle cx={cx} cy={(LANE_DOMAIN_Y + spacing).toFixed(1)} r={4} fill={domainColor(session.control_status)} />
                <circle cx={cx} cy={(LANE_DOMAIN_Y + spacing * 2).toFixed(1)} r={4} fill={domainColor(session.adapt_status)} />
                <circle cx={cx} cy={(LANE_DOMAIN_Y + spacing * 3).toFixed(1)} r={4} fill={domainColor(session.focus_status)} />
              </g>
            );
          })}

          {hrvPoints.length <= 1 ? (
            <text
              x={((LABEL_WIDTH + svgWidth - RIGHT_PAD) / 2).toFixed(1)}
              y={(LANE_HRV_Y + LANE_HRV_H / 2 + 4).toFixed(1)}
              fontSize={9}
              fill="#6B7280"
              textAnchor="middle"
            >
              Not enough HRV data
            </text>
          ) : (
            <>
              {baselineHrvAvg !== null && (
                <line
                  x1={LABEL_WIDTH}
                  y1={toHrvY(baselineHrvAvg).toFixed(1)}
                  x2={(svgWidth - RIGHT_PAD).toFixed(1)}
                  y2={toHrvY(baselineHrvAvg).toFixed(1)}
                  stroke="#374151"
                  strokeWidth={1}
                  strokeDasharray="3,3"
                />
              )}
              <polyline
                points={polylinePoints}
                fill="none"
                stroke="#14B8A6"
                strokeWidth={1.5}
                strokeLinejoin="round"
              />
              {hrvPoints.map(({ i, v }) => (
                <circle
                  key={`hrv-dot-${i}`}
                  cx={colCenter(i).toFixed(1)}
                  cy={toHrvY(v).toFixed(1)}
                  r={3}
                  fill="#14B8A6"
                />
              ))}
            </>
          )}

          {dates.map((date, i) => {
            const entry = sleepMap.get(date);
            if (!entry || entry.sleep_hours == null) return null;
            const color = sleepBarColor(entry.sleep_quality);
            const barH = toSleepBarH(entry.sleep_hours);
            if (barH <= 0) return null;
            const barW = colWidth - 6;
            const barX = LABEL_WIDTH + i * colWidth + 3;
            return (
              <rect
                key={`sleep-${date}`}
                x={barX.toFixed(1)}
                y={(LANE_SLEEP_Y + LANE_SLEEP_H - barH).toFixed(1)}
                width={barW.toFixed(1)}
                height={barH.toFixed(1)}
                rx={2}
                ry={2}
                fill={color}
                opacity={0.85}
              />
            );
          })}

          {dates.map((date, i) => {
            const d = new Date(date + 'T00:00:00');
            const day = d.getDate();
            const isMonthBoundary =
              i === 0 ||
              new Date(dates[i - 1] + 'T00:00:00').getMonth() !== d.getMonth();
            const cx = colCenter(i).toFixed(1);
            return (
              <g key={`xaxis-${date}`}>
                {isMonthBoundary && (
                  <text x={cx} y={(XAXIS_Y + 10).toFixed(1)} fontSize={8} fill="#4B5563" textAnchor="middle">
                    {MONTHS[d.getMonth()]}
                  </text>
                )}
                <text x={cx} y={(XAXIS_Y + 21).toFixed(1)} fontSize={9} fill="#4B5563" textAnchor="middle">
                  {day}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
