import React, { useState } from 'react';
import { 
  X, 
  Link, 
  Youtube, 
  Video, 
  Sparkles, 
  Play, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { api } from '../services/api';
import { usePlayerStore } from '../store/playerStore';

interface ImportUrlModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ImportUrlModal: React.FC<ImportUrlModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [url, setUrl] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [customArtist, setCustomArtist] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { playTrack, setNowPlayingOpen } = usePlayerStore();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await api.importUrl(url.trim(), customTitle.trim() || undefined, customArtist.trim() || undefined);
      if (res.item) {
        // Start playing the imported item immediately!
        playTrack(res.item);
        setNowPlayingOpen(true);
        if (onSuccess) onSuccess();
        onClose();
        setUrl('');
        setCustomTitle('');
        setCustomArtist('');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to import URL');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-lg bg-surface-900 border border-white/10 rounded-3xl p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-600 to-accent-cyan flex items-center justify-center text-white shadow-md">
              <Link className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Add URL / Video Stream</h3>
              <p className="text-xs text-slate-400">Play any YouTube video or direct media stream URL</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl bg-surface-800 hover:bg-surface-750 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Supported Formats Banner */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-850 border border-white/5 text-xs text-slate-300">
          <span className="font-semibold text-brand-300">Supports:</span>
          <span className="flex items-center gap-1 text-slate-400">
            <Youtube className="w-3.5 h-3.5 text-red-500" /> YouTube Videos & Shorts
          </span>
          <span className="text-slate-600">•</span>
          <span className="flex items-center gap-1 text-slate-400">
            <Video className="w-3.5 h-3.5 text-accent-cyan" /> MP4, WebM, MP3 Streams
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
              Media Stream or YouTube URL *
            </label>
            <input
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="e.g. https://www.youtube.com/watch?v=... or https://example.com/video.mp4"
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-800 border border-white/10 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                Custom Title (Optional)
              </label>
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="Auto-detected if blank"
                className="w-full px-3 py-2 rounded-xl bg-surface-800 border border-white/10 text-xs text-slate-200 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                Creator / Artist (Optional)
              </label>
              <input
                type="text"
                value={customArtist}
                onChange={(e) => setCustomArtist(e.target.value)}
                placeholder="Auto-detected if blank"
                className="w-full px-3 py-2 rounded-xl bg-surface-800 border border-white/10 text-xs text-slate-200 focus:outline-none"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/30 flex items-center gap-2 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-3 border-t border-white/5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-gradient-to-r from-brand-600 to-accent-cyan hover:opacity-95 text-white text-xs font-bold rounded-xl shadow-lg shadow-brand-500/25 flex items-center gap-1.5 transition-all"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{loading ? 'Fetching & Categorizing...' : 'Import & Play Now'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
