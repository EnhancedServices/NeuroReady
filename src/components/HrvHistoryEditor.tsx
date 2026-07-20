import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth-context';
import { Trash2, Save, X, Activity, ChevronLeft, ChevronRight } from 'lucide-react';
import type { HrvStatus } from '../types';
import { startOfWeek, weekDates, addDays, toDateStr, formatWeekRange } from '../lib/week-utils';

interface HrvHistoryEditorProps {
  athleteId: string;
  athleteName: string;
  onClose: () => void;
}

const HRV_STATUS_OPTIONS: { value: HrvStatus; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'slightly_down', label: 'Slightly down' },
  { value: 'clearly_down', label: 'Clearly down' },
  { value: 'unknown', label: 'Unknown' },
];

const SOURCE_OPTIONS = ['Garmin', 'Whoop', 'Oura', 'Apple Watch', 'Polar', 'Manual entry', 'Other'];

interface RowState {
  id?: string;
  value: string;
  status: HrvStatus | '';
}

export function HrvHistoryEditor({ athleteId, athleteName, onClose }: HrvHistoryEditorProps) {
  const { profile } = useAuth();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [rows, setRows] = useState<Record<string, RowState>>({});
  const [weekSource, setWeekSource] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const days = useMemo(() => weekDates(weekStart), [weekStart]);
  const thisWeekStart = useMemo(() => startOfWeek(new Date()), []);
  const isCurrentWeek = toDateStr(weekStart) === toDateStr(thisWeekStart);

  useEffect(() => {
    let cancelled = false;

    const loadWeek = async () => {
      setLoading(true);
      const startStr = toDateStr(weekStart);
      const endStr = toDateStr(addDays(weekStart, 6));

      const { data, error } = await supabase
        .from('neuro_hrv_history')
        .select('*')
        .eq('athlete_id', athleteId)
        .gte('date', startStr)
        .lte('date', endStr);

      if (cancelled) return;

      if (error) {
        console.error('Error loading HRV history:', error);
      }

      const byDate: Record<string, { id: string; hrv_value: number | null; hrv_status: HrvStatus; source_note: string | null }> = {};
      (data || []).forEach((e) => {
        byDate[e.date] = e;
      });

      const next: Record<string, RowState> = {};
      weekDates(weekStart).forEach((d) => {
        const ds = toDateStr(d);
        const existing = byDate[ds];
        next[ds] = {
          id: existing?.id,
          value: existing?.hrv_value != null ? String(existing.hrv_value) : '',
          status: existing?.hrv_status ?? '',
        };
      });

      setRows(next);
      setWeekSource((data || []).find((e) => e.source_note)?.source_note ?? '');
      setLoading(false);
    };

    loadWeek();
    return () => {
      cancelled = true;
    };
  }, [athleteId, weekStart]);

  const updateRow = (dateStr: string, patch: Partial<RowState>) => {
    setRows((prev) => ({ ...prev, [dateStr]: { ...prev[dateStr], ...patch } }));
  };

  const handleDeleteEntry = async (dateStr: string) => {
    const row = rows[dateStr];
    if (!row?.id) {
      updateRow(dateStr, { value: '', status: '' });
      return;
    }
    const { error } = await supabase.from('neuro_hrv_history').delete().eq('id', row.id);
    if (error) {
      console.error('Error deleting HRV entry:', error);
      setMessage('Could not delete entry.');
    } else {
      updateRow(dateStr, { id: undefined, value: '', status: '' });
    }
  };

  const handleSaveWeek = async () => {
    if (!profile) return;
    setSaving(true);
    setMessage(null);

    const inserts: Record<string, unknown>[] = [];
    const updates: { id: string; payload: Record<string, unknown> }[] = [];

    days.forEach((d) => {
      const ds = toDateStr(d);
      const row = rows[ds];
      if (!row) return;
      const hasData = row.value.trim() !== '' || row.status !== '';
      if (!hasData) return;

      const hrvValue = row.value.trim() !== '' ? parseFloat(row.value) : null;
      const status: HrvStatus = row.status || 'unknown';

      if (row.id) {
        const payload: Record<string, unknown> = {
          hrv_value: hrvValue,
          hrv_status: status,
          updated_at: new Date().toISOString(),
        };
        if (weekSource) payload.source_note = weekSource;
        updates.push({ id: row.id, payload });
      } else {
        inserts.push({
          athlete_id: athleteId,
          date: ds,
          hrv_value: hrvValue,
          hrv_status: status,
          source_note: weekSource || null,
          entered_by: profile.id,
        });
      }
    });

    try {
      const results = await Promise.all([
        ...(inserts.length ? [supabase.from('neuro_hrv_history').insert(inserts)] : []),
        ...updates.map((u) => supabase.from('neuro_hrv_history').update(u.payload).eq('id', u.id)),
      ]);
      const failed = results.find((r) => r.error);
      if (failed?.error) throw failed.error;

      const saved = inserts.length + updates.length;
      setMessage(saved > 0 ? `Saved ${saved} day${saved === 1 ? '' : 's'}.` : 'Nothing to save.');
      setWeekStart((w) => new Date(w));
    } catch (err) {
      console.error('Error saving HRV week:', err);
      const detail = err && typeof err === 'object' && 'message' in err ? String((err as { message?: unknown }).message) : String(err);
      setMessage(`Failed to save: ${detail}`);
    } finally {
      setSaving(false);
    }
  };

  const statusColor = (status: HrvStatus | '') => {
    switch (status) {
      case 'normal':
        return 'border-green-500/40 text-green-400';
      case 'slightly_down':
        return 'border-yellow-500/40 text-yellow-400';
      case 'clearly_down':
        return 'border-red-500/40 text-red-400';
      case 'unknown':
        return 'border-gray-500/40 text-gray-400';
      default:
        return 'border-gray-600 text-gray-500';
    }
  };

  const filledCount = days.filter((d) => {
    const r = rows[toDateStr(d)];
    return r && (r.value.trim() !== '' || r.status !== '');
  }).length;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-gray-900 border border-gray-800 rounded-xl max-w-3xl w-full my-8">
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <Activity className="w-6 h-6 text-blue-400" />
            <div>
              <h2 className="text-xl font-bold text-white">HRV History</h2>
              <p className="text-sm text-gray-400">{athleteName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setWeekStart((w) => addDays(w, -7))}
                className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                aria-label="Previous week"
              >
                <ChevronLeft className="w-4 h-4 text-gray-300" />
              </button>
              <div className="text-center min-w-[10rem]">
                <p className="text-white font-semibold">{formatWeekRange(weekStart)}</p>
                {isCurrentWeek && <p className="text-xs text-blue-400">This week</p>}
              </div>
              <button
                onClick={() => setWeekStart((w) => addDays(w, 7))}
                disabled={isCurrentWeek}
                className="p-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors"
                aria-label="Next week"
              >
                <ChevronRight className="w-4 h-4 text-gray-300" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              {!isCurrentWeek && (
                <button
                  onClick={() => setWeekStart(startOfWeek(new Date()))}
                  className="px-3 py-2 text-sm bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg transition-colors"
                >
                  This week
                </button>
              )}
              <select
                value={weekSource}
                onChange={(e) => setWeekSource(e.target.value)}
                className="px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                title="Source applied to all saved days"
              >
                <option value="">Source…</option>
                {SOURCE_OPTIONS.map((src) => (
                  <option key={src} value={src}>
                    {src}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-gray-800">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-800/60 text-gray-400 text-left">
                    <th className="px-4 py-2 font-medium">Day</th>
                    <th className="px-4 py-2 font-medium">HRV (ms)</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                    <th className="px-4 py-2 font-medium w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {days.map((d) => {
                    const ds = toDateStr(d);
                    const row = rows[ds] || { value: '', status: '' as const };
                    const isToday = ds === toDateStr(new Date());
                    return (
                      <tr key={ds} className="border-t border-gray-800">
                        <td className="px-4 py-2 whitespace-nowrap">
                          <span className="text-white font-medium">
                            {d.toLocaleDateString('en-US', { weekday: 'short' })}
                          </span>{' '}
                          <span className="text-gray-500">
                            {d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                          {isToday && <span className="ml-2 text-xs text-blue-400">today</span>}
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            inputMode="decimal"
                            value={row.value}
                            onChange={(e) => updateRow(ds, { value: e.target.value })}
                            placeholder="—"
                            className="w-24 px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-white focus:outline-none focus:border-blue-500"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <select
                            value={row.status}
                            onChange={(e) => updateRow(ds, { status: e.target.value as HrvStatus | '' })}
                            className={`px-2 py-1.5 bg-gray-800 border rounded focus:outline-none ${statusColor(row.status)}`}
                          >
                            <option value="" className="text-gray-500">
                              —
                            </option>
                            {HRV_STATUS_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value} className="bg-gray-800 text-white">
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-2">
                          {(row.id || row.value || row.status) && (
                            <button
                              onClick={() => handleDeleteEntry(ds)}
                              className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                              aria-label="Clear day"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 mt-6">
            <p className="text-sm text-gray-500">
              {message ?? `${filledCount} of 7 days filled`}
            </p>
            <button
              onClick={handleSaveWeek}
              disabled={saving || loading}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving…' : 'Save week'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
