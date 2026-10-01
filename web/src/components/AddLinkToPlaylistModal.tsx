import React, { useState } from 'react';
import { 
  X, 
  Link, 
  Youtube, 
  Waves, 
  Music, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  FileAudio
} from 'lucide-react';
import { Playlist, MediaItem } from '../types';
import { api } from '../services/api';

interface AddLinkToPlaylistModalProps {
  isOpen: boolean;
  playlist: Playlist | null;
  onClose: () => void;
  onSuccess?: (addedItems: MediaItem[], updatedPlaylist: Playlist) => void;
}

export const AddLinkToPlaylistModal: React.FC<AddLinkToPlaylistModalProps> = ({
  isOpen,
  playlist,
  onClose,
  onSuccess
}) => {
  const [url, setUrl] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [customArtist, setCustomArtist] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen || !playlist) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUrl = url.trim();
    if (!cleanUrl) return;

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await api.importUrlToPlaylist(
        playlist.id,
        cleanUrl,
        customTitle.trim() || undefined,
        customArtist.trim() || undefined
      );

      setSuccessMsg(res.message || `Successfully added track(s) to "${playlist.title}"!`);
      if (onSuccess) {
        onSuccess(res.items, res.playlist);
      }
      setTimeout(() => {
        setUrl('');
        setCustomTitle('');
        setCustomArtist('');
        setSuccessMsg(null);
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Failed to add link to playlist');
    } finally {
      setLoading(false);
    }
  };

  const isSpotify = url.includes('spotify.com') || url.startsWith('spotify:');
  const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-lg bg-surface-900 border border-white/10 rounded-3xl p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-600 to-accent-cyan flex items-center justify-center text-white shadow-md">
              <Link className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Save Link to Playlist</h3>
              <p className="text-xs text-slate-400">
                Adding to <span className="text-brand-300 font-semibold">{playlist.title}</span>
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl bg-surface-800 hover:bg-surface-750 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Supported Platforms Banner */}
        <div className="p-3 rounded-2xl bg-surface-850 border border-white/5 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
            <Sparkles className="w-3.5 h-3.5 text-brand-400" />
            <span>Supported Platforms & Links:</span>
          </div>
          <div className="flex flex-wrap gap-2 text-[11px]">
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-500/10 text-red-300 border border-red-500/20 font-medium">
              <Youtube className="w-3.5 h-3.5 text-red-500" /> YouTube Video / Shorts
            </span>
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-medium">
              <Waves className="w-3.5 h-3.5 text-[#1DB954]" /> Spotify Track / Album / Playlist
            </span>
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-medium">
              <FileAudio className="w-3.5 h-3.5 text-accent-cyan" /> Direct Audio / MP3 / MP4 Stream
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Paste Media or Streaming Link *
            </label>
            <div className="relative">
              <input
                type="url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://open.spotify.com/track/... or https://youtube.com/watch?v=..."
                className="w-full pl-3.5 pr-10 py-3 rounded-xl bg-surface-800 border border-white/10 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {isSpotify && <Waves className="w-4 h-4 text-[#1DB954]" />}
                {isYouTube && <Youtube className="w-4 h-4 text-red-500" />}
                {!isSpotify && !isYouTube && url && <Link className="w-4 h-4 text-brand-400" />}
              </div>
            </div>
            {isSpotify && (
              <p className="text-[11px] text-[#1DB954] mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Spotify link identified — audio stream will be auto-resolved in full quality.</span>
              </p>
            )}
            {isYouTube && (
              <p className="text-[11px] text-red-400 mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>YouTube link identified — metadata & video embed will be saved to server.</span>
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Custom Title (Optional)
              </label>
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="Auto-detected from link"
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-800 border border-white/10 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Singer / Artist (Optional)
              </label>
              <input
                type="text"
                value={customArtist}
                onChange={(e) => setCustomArtist(e.target.value)}
                placeholder="Auto-detected from link"
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-800 border border-white/10 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/30 flex items-center gap-2 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/30 flex items-center gap-2 text-xs text-emerald-300">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
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
              disabled={loading || !url.trim()}
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Extracting & Saving to Server...</span>
                </>
              ) : (
                <>
                  <Music className="w-3.5 h-3.5" />
                  <span>Save to Playlist</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
