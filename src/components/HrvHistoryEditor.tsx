import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth-context';
import { Plus, Trash2, Save, X, Activity } from 'lucide-react';
import type { HrvHistoryEntry, HrvStatus } from '../types';

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

export function HrvHistoryEditor({ athleteId, athleteName, onClose }: HrvHistoryEditorProps) {
  const { profile } = useAuth();
  const [entries, setEntries] = useState<HrvHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newHrvValue, setNewHrvValue] = useState<string>('');
  const [newHrvStatus, setNewHrvStatus] = useState<HrvStatus>('normal');
  const [newSourceNote, setNewSourceNote] = useState('');

  useEffect(() => {
    loadEntries();
  }, [athleteId]);

  const loadEntries = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('neuro_hrv_history')
      .select('*')
      .eq('athlete_id', athleteId)
      .order('date', { ascending: false })
      .limit(30);

    if (error) {
      console.error('Error loading HRV history:', error);
    } else {
      setEntries(data || []);
    }
    setLoading(false);
  };

  const handleAddEntry = async () => {
    if (!profile) return;

    setSaving(true);

    const { error } = await supabase.from('neuro_hrv_history').insert({
      athlete_id: athleteId,
      date: newDate,
      hrv_value: newHrvValue ? parseFloat(newHrvValue) : null,
      hrv_status: newHrvStatus,
      source_note: newSourceNote || null,
      entered_by: profile.id,
    });

    if (error) {
      console.error('Error adding HRV entry:', error);
    } else {
      setShowAddForm(false);
      setNewDate(new Date().toISOString().split('T')[0]);
      setNewHrvValue('');
      setNewHrvStatus('normal');
      setNewSourceNote('');
      loadEntries();
    }

    setSaving(false);
  };

  const handleDeleteEntry = async (entryId: string) => {
    const { error } = await supabase.from('neuro_hrv_history').delete().eq('id', entryId);

    if (error) {
      console.error('Error deleting HRV entry:', error);
    } else {
      setEntries(entries.filter((e) => e.id !== entryId));
    }
  };

  const handleUpdateStatus = async (entryId: string, newStatus: HrvStatus) => {
    const { error } = await supabase
      .from('neuro_hrv_history')
      .update({ hrv_status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', entryId);

    if (error) {
      console.error('Error updating HRV status:', error);
    } else {
      setEntries(entries.map((e) => (e.id === entryId ? { ...e, hrv_status: newStatus } : e)));
    }
  };

  const getStatusColor = (status: HrvStatus) => {
    switch (status) {
      case 'normal':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'slightly_down':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'clearly_down':
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
            <Activity className="w-6 h-6 text-blue-400" />
            <div>
              <h2 className="text-xl font-bold text-white">HRV History</h2>
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
              <h3 className="text-white font-semibold mb-4">New HRV entry</h3>
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
                  <label className="block text-sm text-gray-400 mb-1">HRV value (optional)</label>
                  <input
                    type="number"
                    value={newHrvValue}
                    onChange={(e) => setNewHrvValue(e.target.value)}
                    placeholder="e.g., 45"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Status</label>
                  <select
                    value={newHrvStatus}
                    onChange={(e) => setNewHrvStatus(e.target.value as HrvStatus)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  >
                    {HRV_STATUS_OPTIONS.map((opt) => (
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
            <p className="text-gray-500 text-center py-8">No HRV entries yet</p>
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
                    {entry.hrv_value && (
                      <div className="text-right">
                        <p className="text-xl font-bold text-blue-400">{entry.hrv_value}</p>
                        <p className="text-xs text-gray-500">ms</p>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={entry.hrv_status}
                      onChange={(e) => handleUpdateStatus(entry.id, e.target.value as HrvStatus)}
                      className={`px-2 py-1 text-xs font-medium rounded border ${getStatusColor(entry.hrv_status)} bg-transparent focus:outline-none`}
                    >
                      {HRV_STATUS_OPTIONS.map((opt) => (
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
