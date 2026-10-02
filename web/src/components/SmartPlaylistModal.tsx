import React, { useState } from 'react';
import { X, Sparkles, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { Playlist, PlaylistRule, GenreCategory, MoodCategory } from '../types';
import { api } from '../services/api';
import { usePlayerStore } from '../store/playerStore';

interface SmartPlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlaylistCreated: (playlist?: Playlist) => void;
}

export const SmartPlaylistModal: React.FC<SmartPlaylistModalProps> = ({ 
  isOpen, 
  onClose, 
  onPlaylistCreated 
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [matchLogic, setMatchLogic] = useState<'AND' | 'OR'>('AND');
  const [rules, setRules] = useState<PlaylistRule[]>([
    { field: 'mood', operator: 'equals', value: 'Focus & Study' }
  ]);
  const [limit, setLimit] = useState(25);
  const [saving, setSaving] = useState(false);
  const { user, token } = usePlayerStore();

  if (!isOpen) return null;

  const genres: GenreCategory[] = [
    'Bollywood', 'Hindi Retro', 'Punjabi', 'Marathi', 'Tamil & Telugu', 
    'Lo-Fi & Chill', 'Pop', 'EDM & Electronic', 'Classical & Instrumental', 
    'Devotional', 'Podcast & Talks'
  ];

  const moods: MoodCategory[] = [
    'Uplifting & Happy', 'Calm & Peaceful', 'Focus & Study', 'Workout & Energy', 
    'Romantic', 'Nostalgic', 'Sad & Emotional', 'Spiritual & Devotional', 
    'Sleep & Relaxation', 'Party & Dance'
  ];

  const handleAddRule = () => {
    setRules([...rules, { field: 'genre', operator: 'equals', value: 'Bollywood' }]);
  };

  const handleRemoveRule = (index: number) => {
    setRules(rules.filter((_, i) => i !== index));
  };

  const handleUpdateRule = (index: number, updates: Partial<PlaylistRule>) => {
    const updated = [...rules];
    updated[index] = { ...updated[index], ...updates };
    setRules(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSaving(true);
    try {
      const created = await api.createPlaylist({
        title: title.trim(),
        description: description.trim() || 'AI-generated smart playlist tailored with dynamic rules.',
        isSmart: true,
        smartDefinition: {
          rules,
          matchLogic,
          limit
        },
        userId: user?.id,
        creator: user ? {
          id: user.id,
          name: user.name,
          username: user.username || user.name,
          avatar: user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
          email: user.email
        } : undefined
      }, token);
      onPlaylistCreated(created);
      onClose();
    } catch (err) {
      console.error('Failed to create smart playlist', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-xl bg-surface-900 border border-white/10 rounded-3xl p-6 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-600/30 border border-brand-500/40 flex items-center justify-center text-brand-300">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Create Smart Playlist</h3>
              <p className="text-xs text-slate-400">Rules update automatically as new tracks arrive</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl bg-surface-800 hover:bg-surface-750 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Playlist Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. My Monsoon Lo-Fi Haven"
              className="w-full px-3.5 py-2 rounded-xl bg-surface-800 border border-white/10 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Description (Optional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Curated instrumental sounds for deep code architecture sessions"
              className="w-full px-3.5 py-2 rounded-xl bg-surface-800 border border-white/10 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
            />
          </div>

          {/* Rule Match Logic */}
          <div className="flex items-center justify-between bg-surface-850 p-3 rounded-xl border border-white/5">
            <span className="text-xs font-semibold text-slate-300">Condition Logic:</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMatchLogic('AND')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  matchLogic === 'AND' ? 'bg-brand-600 text-white shadow-xs' : 'bg-surface-800 text-slate-400'
                }`}
              >
                Match ALL Rules (AND)
              </button>
              <button
                type="button"
                onClick={() => setMatchLogic('OR')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  matchLogic === 'OR' ? 'bg-brand-600 text-white shadow-xs' : 'bg-surface-800 text-slate-400'
                }`}
              >
                Match ANY Rule (OR)
              </button>
            </div>
          </div>

          {/* Rule Builder Rows */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 uppercase">Configured Rules ({rules.length})</label>
              <button
                type="button"
                onClick={handleAddRule}
                className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Condition</span>
              </button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {rules.map((rule, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 rounded-xl bg-surface-850 border border-white/5">
                  {/* Field */}
                  <select
                    value={rule.field}
                    onChange={(e) => handleUpdateRule(idx, { field: e.target.value as any })}
                    className="bg-surface-800 text-slate-200 text-xs rounded-lg px-2 py-1.5 border border-white/10 focus:outline-none"
                  >
                    <option value="genre">Genre</option>
                    <option value="mood">Mood</option>
                    <option value="language">Language</option>
                    <option value="duration">Max Duration</option>
                  </select>

                  {/* Operator */}
                  <select
                    value={rule.operator}
                    onChange={(e) => handleUpdateRule(idx, { operator: e.target.value as any })}
                    className="bg-surface-800 text-slate-200 text-xs rounded-lg px-2 py-1.5 border border-white/10 focus:outline-none"
                  >
                    <option value="equals">Equals</option>
                    <option value="contains">Contains</option>
                    <option value="less_than">Less than</option>
                    <option value="greater_than">Greater than</option>
                  </select>

                  {/* Value */}
                  {rule.field === 'genre' ? (
                    <select
                      value={rule.value}
                      onChange={(e) => handleUpdateRule(idx, { value: e.target.value })}
                      className="flex-1 bg-surface-800 text-slate-200 text-xs rounded-lg px-2 py-1.5 border border-white/10 focus:outline-none"
                    >
                      {genres.map(g => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  ) : rule.field === 'mood' ? (
                    <select
                      value={rule.value}
                      onChange={(e) => handleUpdateRule(idx, { value: e.target.value })}
                      className="flex-1 bg-surface-800 text-slate-200 text-xs rounded-lg px-2 py-1.5 border border-white/10 focus:outline-none"
                    >
                      {moods.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={rule.value}
                      onChange={(e) => handleUpdateRule(idx, { value: e.target.value })}
                      placeholder="Value"
                      className="flex-1 bg-surface-800 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 border border-white/10 focus:outline-none"
                    />
                  )}

                  {/* Remove */}
                  {rules.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveRule(idx)}
                      className="p-1.5 rounded-lg hover:bg-rose-950/60 text-slate-400 hover:text-rose-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="pt-4 border-t border-white/5 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-gradient-to-r from-brand-600 to-accent-cyan hover:opacity-95 text-white text-xs font-bold rounded-xl shadow-lg shadow-brand-500/25 flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{saving ? 'Creating Smart Mix...' : 'Save Smart Playlist'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
