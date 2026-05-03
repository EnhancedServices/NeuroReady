import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth-context';
import { Plus, Trash2, Save, X, Moon } from 'lucide-react';
import type { SleepQuality } from '../types';

interface SleepHistoryEntry {
  id: string;
  athlete_id: string;
  date: string;
  sleep_hours: number | null;
  sleep_quality: SleepQuality | null;
  source_note: string | null;
  entered_by: string | null;
  created_at: string;
  updated_at: string;
}

interface SleepHistoryEditorProps {
  athleteId: string;
  athleteName: string;
  onClose: () => void;
}

const SLEEP_QUALITY_OPTIONS: { value: SleepQuality; label: string }[] = [
  { value: 'poor', label: 'Poor' },
  { value: 'fair', label: 'Fair' },
  { value: 'good', label: 'Good' },
  { value: 'excellent', label: 'Excellent' },
];

const SOURCE_OPTIONS = ['Garmin', 'Whoop', 'Oura', 'Apple Watch', 'Polar', 'Manual entry', 'Other'];

export function SleepHistoryEditor({ athleteId, athleteName, onClose }: SleepHistoryEditorProps) {
  const { profile } = useAuth();
  const [entries, setEntries] = useState<SleepHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newSleepHours, setNewSleepHours] = useState<string>('');
  const [newSleepQuality, setNewSleepQuality] = useState<SleepQuality>('good');
  const [newSourceNote, setNewSourceNote] = useState('');

  useEffect(() => {
    loadEntries();
  }, [athleteId]);

  const loadEntries = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('neuro_sleep_history')
      .select('*')
      .eq('athlete_id', athleteId)
      .order('date', { ascending: false })
      .limit(30);

    if (error) {
      console.error('Error loading sleep history:', error);
    } else {
      setEntries(data || []);
    }
    setLoading(false);
  };

  const handleAddEntry = async () => {
    if (!profile) return;

    setSaving(true);

    const { error } = await supabase.from('neuro_sleep_history').insert({
      athlete_id: athleteId,
      date: newDate,
      sleep_hours: newSleepHours ? parseFloat(newSleepHours) : null,
      sleep_quality: newSleepQuality,
      source_note: newSourceNote || null,
      entered_by: profile.id,
    });

    if (error) {
      console.error('Error adding sleep entry:', error);
    } else {
      setShowAddForm(false);
      setNewDate(new Date().toISOString().split('T')[0]);
      setNewSleepHours('');
      setNewSleepQuality('good');
      setNewSourceNote('');
      loadEntries();
    }

    setSaving(false);
  };

  const handleDeleteEntry = async (entryId: string) => {
    const { error } = await supabase.from('neuro_sleep_history').delete().eq('id', entryId);

    if (error) {
      console.error('Error deleting sleep entry:', error);
    } else {
      setEntries(entries.filter((e) => e.id !== entryId));
    }
  };

  const handleUpdateQuality = async (entryId: string, newQuality: SleepQuality) => {
    const { error } = await supabase
      .from('neuro_sleep_history')
      .update({ sleep_quality: newQuality, updated_at: new Date().toISOString() })
      .eq('id', entryId);

    if (error) {
      console.error('Error updating sleep quality:', error);
    } else {
      setEntries(entries.map((e) => (e.id === entryId ? { ...e, sleep_quality: newQuality } : e)));
    }
  };

  const getQualityColor = (quality: SleepQuality | null) => {
    switch (quality) {
      case 'excellent':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'good':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'fair':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'poor':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-gray-900 border border-gray-800 rounded-xl max-w-2xl w-full my-8">
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <Moon className="w-6 h-6 text-blue-400" />
            <div>
              <h2 className="text-xl font-bold text-white">Sleep History</h2>
              <p className="text-sm text-gray-400">{athleteName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-6">
          {!showAddForm ? (
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors mb-6"
            >
              <Plus className="w-4 h-4" />
              Add entry
            </button>
          ) : (
            <div className="bg-gray-800/50 rounded-lg p-4 mb-6 border border-gray-700">
              <h3 className="text-white font-semibold mb-4">New sleep entry</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Date</label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Sleep hours</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="12"
                    value={newSleepHours}
                    onChange={(e) => setNewSleepHours(e.target.value)}
                    placeholder="e.g., 7.5"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Quality</label>
                  <select
                    value={newSleepQuality}
                    onChange={(e) => setNewSleepQuality(e.target.value as SleepQuality)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  >
                    {SLEEP_QUALITY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Source (optional)</label>
                  <select
                    value={newSourceNote}
                    onChange={(e) => setNewSourceNote(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Select source...</option>
                    {SOURCE_OPTIONS.map((src) => (
                      <option key={src} value={src}>
                        {src}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={handleAddEntry}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : entries.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No sleep entries yet</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg border border-gray-700/50"
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-white font-medium">
                        {new Date(entry.date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                      {entry.source_note && (
                        <p className="text-xs text-gray-500">{entry.source_note}</p>
                      )}
                    </div>
                    {entry.sleep_hours && (
                      <div className="text-right">
                        <p className="text-xl font-bold text-blue-400">{entry.sleep_hours}</p>
                        <p className="text-xs text-gray-500">hours</p>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={entry.sleep_quality || ''}
                      onChange={(e) => handleUpdateQuality(entry.id, e.target.value as SleepQuality)}
                      className={`px-2 py-1 text-xs font-medium rounded border ${getQualityColor(entry.sleep_quality)} bg-transparent focus:outline-none`}
                    >
                      {SLEEP_QUALITY_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value} className="bg-gray-800">
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleDeleteEntry(entry.id)}
                      className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
