import React, { useState, useEffect } from 'react';
import { 
  ListMusic, 
  Sparkles, 
  Plus, 
  Play, 
  Trash2, 
  Download, 
  FileDown, 
  Clock, 
  CheckCircle2,
  FolderPlus,
  X,
  User as UserIcon,
  Cloud,
  LogOut,
  LogIn
} from 'lucide-react';
import { Playlist, PlaylistItem } from '../types';
import { api } from '../services/api';
import { usePlayerStore } from '../store/playerStore';
import { SmartPlaylistModal } from '../components/SmartPlaylistModal';
import { CreatePlaylistModal } from '../components/CreatePlaylistModal';

interface PlaylistsViewProps {
  onOpenAuth?: () => void;
}

export const PlaylistsView: React.FC<PlaylistsViewProps> = ({ onOpenAuth }) => {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [isSmartModalOpen, setIsSmartModalOpen] = useState(false);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const { playTrack, setNowPlayingOpen, user, logout } = usePlayerStore();

  const fetchPlaylists = async () => {
    setLoading(true);
    try {
      const data = await api.getPlaylists();
      setPlaylists(data);
      if (data.length > 0) {
        if (!selectedPlaylist) {
          setSelectedPlaylist(data[0]);
        } else {
          const refreshed = data.find(p => p.id === selectedPlaylist.id);
          setSelectedPlaylist(refreshed || data[0]);
        }
      } else {
        setSelectedPlaylist(null);
      }
    } catch (err) {
      console.error('Fetch playlists error', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSelectedPlaylist(null);
    fetchPlaylists();
  }, [user?.id]);

  const handlePlayAll = () => {
    if (!selectedPlaylist || !selectedPlaylist.items || selectedPlaylist.items.length === 0) return;
    const mediaTracks = selectedPlaylist.items.map(i => i.mediaItem);
    playTrack(mediaTracks[0], mediaTracks);
    setNowPlayingOpen(true);
  };

  const handleDeletePlaylist = async () => {
    if (!selectedPlaylist) return;
    if (confirm(`Delete playlist "${selectedPlaylist.title}"?`)) {
      await api.deletePlaylist(selectedPlaylist.id);
      setSelectedPlaylist(null);
      fetchPlaylists();
    }
  };

  const handleRemoveTrack = async (e: React.MouseEvent, mediaItemId: string) => {
    e.stopPropagation();
    if (!selectedPlaylist) return;
    await api.removeItemFromPlaylist(selectedPlaylist.id, mediaItemId);
    fetchPlaylists();
  };

  const handleExport = (format: 'json' | 'm3u') => {
    if (!selectedPlaylist) return;
    const url = `http://localhost:4000/api/playlists/${selectedPlaylist.id}/export?format=${format}`;
    window.open(url, '_blank');
  };

  const formatDuration = (secs: number) => {
    if (!secs) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ListMusic className="w-5 h-5 text-brand-400" />
            <h2 className="text-2xl font-bold text-white tracking-tight">Playlists & Collections</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Create custom personal mixtapes or rule-based smart playlists with M3U/JSON export.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsCustomModalOpen(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-brand-600 to-accent-pink text-white text-xs font-bold rounded-xl shadow-lg shadow-brand-500/25 flex items-center gap-1.5 hover:opacity-95 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            <span>Create Playlist</span>
          </button>

          <button
            onClick={() => setIsSmartModalOpen(true)}
            className="px-4 py-2.5 bg-surface-800 hover:bg-surface-750 border border-white/10 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-accent-cyan" />
            <span>Smart Rule Mix</span>
          </button>
        </div>
      </div>

      {/* User Cloud Sync Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-gradient-to-r from-brand-950/60 via-surface-850 to-surface-850 border border-brand-500/20 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center shrink-0 overflow-hidden">
            {user ? (
              <img src={user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'} alt="" className="w-full h-full object-cover" />
            ) : (
              <UserIcon className="w-5 h-5 text-brand-400" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">
                {user ? user.name : 'Guest Session'}
              </span>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                user ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/15 text-amber-400 border-amber-500/20'
              }`}>
                <Cloud className="w-3 h-3" />
                <span>{user ? 'Cloud Synced Across Devices' : 'Local Only (Not Synced)'}</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {user 
                ? `Logged in as ${user.email} • Your playlists & tracks are synced across all your devices`
                : 'Sign in to sync your playlists and saved tracks across all your phones, tablets, and computers.'
              }
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {user ? (
            <button
              onClick={logout}
              className="px-3 py-1.5 rounded-xl bg-surface-800 hover:bg-surface-750 border border-white/10 text-xs font-medium text-slate-300 hover:text-white transition-all flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5 text-slate-400" />
              <span>Sign Out</span>
            </button>
          ) : (
            <button
              onClick={onOpenAuth}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-brand-600 to-accent-cyan hover:opacity-95 text-xs font-bold text-white shadow-md shadow-brand-500/20 transition-all flex items-center gap-1.5"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In / Create Account</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Playlists List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Your Playlists ({playlists.length})</h3>
            <button 
              onClick={() => setIsCustomModalOpen(true)}
              className="text-xs text-brand-400 hover:text-brand-300 font-medium flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New</span>
            </button>
          </div>

          <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
            {playlists.map(pl => {
              const isSelected = selectedPlaylist?.id === pl.id;
              return (
                <div
                  key={pl.id}
                  onClick={() => setSelectedPlaylist(pl)}
                  className={`p-3 rounded-2xl cursor-pointer transition-all duration-200 border flex items-center gap-3.5 ${
                    isSelected
                      ? 'bg-surface-800 border-brand-500/40 shadow-md shadow-brand-500/10 ring-1 ring-brand-500/20'
                      : 'bg-surface-850 hover:bg-surface-800 border-white/5'
                  }`}
                >
                  <img
                    src={pl.coverArt || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80'}
                    alt={pl.title}
                    className="w-12 h-12 rounded-xl object-cover shadow-sm shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-sm font-bold text-white truncate">{pl.title}</h4>
                      {pl.isSmart && (
                        <span className="p-0.5 rounded bg-brand-500/20 text-brand-300 text-[10px]" title="Smart Playlist">
                          <Sparkles className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 truncate mt-0.5">
                      {pl.items?.length || pl.itemCount} tracks {pl.isSmart ? '• Dynamic' : '• Custom'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Selected Playlist Detail & Track Listing */}
        <div className="lg:col-span-2">
          {selectedPlaylist ? (
            <div className="bg-surface-850 rounded-3xl p-6 border border-white/5 space-y-6">
              {/* Playlist Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-white/5">
                <div className="flex items-center gap-4">
                  <img
                    src={selectedPlaylist.coverArt || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80'}
                    alt={selectedPlaylist.title}
                    className="w-20 h-20 rounded-2xl object-cover shadow-lg ring-1 ring-white/10"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-bold text-white">{selectedPlaylist.title}</h3>
                      {selectedPlaylist.isSmart ? (
                        <span className="px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30 text-[11px] font-semibold flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          <span>Smart Rules Active</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30 text-[11px] font-semibold">
                          Custom Playlist
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-1 max-w-md">
                      {selectedPlaylist.description || 'Personal playlist.'}
                    </p>
                    <p className="text-xs text-slate-500 mt-1 font-mono">
                      {selectedPlaylist.items?.length || 0} tracks
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handlePlayAll}
                    disabled={!selectedPlaylist.items || selectedPlaylist.items.length === 0}
                    className="px-4 py-2 bg-gradient-to-r from-brand-600 to-accent-cyan text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 hover:opacity-95 disabled:opacity-50"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Play Mix</span>
                  </button>

                  {/* Export Options */}
                  <div className="flex items-center bg-surface-800 rounded-xl p-1 border border-white/5 text-xs">
                    <button
                      onClick={() => handleExport('json')}
                      className="px-2.5 py-1 text-slate-300 hover:text-white rounded-lg flex items-center gap-1"
                      title="Export metadata as JSON"
                    >
                      <Download className="w-3 h-3" />
                      <span>JSON</span>
                    </button>
                    <button
                      onClick={() => handleExport('m3u')}
                      className="px-2.5 py-1 text-slate-300 hover:text-white rounded-lg flex items-center gap-1"
                      title="Export as M3U playlist file"
                    >
                      <FileDown className="w-3 h-3" />
                      <span>M3U</span>
                    </button>
                  </div>

                  {/* Delete Playlist button (for custom playlists) */}
                  {!selectedPlaylist.isSmart && (
                    <button
                      onClick={handleDeletePlaylist}
                      className="p-2 rounded-xl bg-surface-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border border-white/5 transition-colors"
                      title="Delete playlist"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Tracks List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500 px-3 uppercase tracking-wider">
                  <span># Title</span>
                  <div className="flex items-center gap-12 pr-2">
                    <span>Vibe / Genre</span>
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  {selectedPlaylist.items && selectedPlaylist.items.length > 0 ? (
                    selectedPlaylist.items.map((item, idx) => {
                      const track = item.mediaItem;
                      return (
                        <div
                          key={`${item.id}-${idx}`}
                          onClick={() => {
                            const all = selectedPlaylist.items!.map(i => i.mediaItem);
                            playTrack(track, all);
                          }}
                          className="flex items-center justify-between p-2.5 rounded-xl hover:bg-surface-800 transition-colors group cursor-pointer border border-transparent hover:border-white/5"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <span className="w-5 text-center text-xs font-mono text-slate-500 group-hover:text-brand-400">
                              {idx + 1}
                            </span>
                            <img src={track.thumbnail} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                            <div className="min-w-0">
                              <h5 className="text-sm font-semibold text-slate-200 truncate group-hover:text-brand-300 transition-colors">
                                {track.title}
                              </h5>
                              <p className="text-xs text-slate-400 truncate">{track.artist}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 text-xs text-slate-400">
                            <div className="hidden sm:flex items-center gap-1.5">
                              <span className="px-2 py-0.5 rounded-md bg-surface-750 text-slate-300 text-[11px]">
                                {track.genre}
                              </span>
                              <span className="px-2 py-0.5 rounded-md bg-brand-500/10 text-brand-300 text-[11px]">
                                {track.mood}
                              </span>
                            </div>
                            <span className="font-mono text-slate-400 text-xs">
                              {formatDuration(track.duration)}
                            </span>

                            {/* Remove from playlist button */}
                            {!selectedPlaylist.isSmart && (
                              <button
                                onClick={(e) => handleRemoveTrack(e, track.id)}
                                className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-rose-950/60 hover:text-rose-400 transition-all text-slate-500"
                                title="Remove from playlist"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-8 text-center text-slate-500 text-xs">
                      No tracks in this playlist yet. Add songs by clicking the '+' icon on any track!
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center bg-surface-850 rounded-3xl border border-white/5 text-slate-500">
              Select or create a playlist from the left.
            </div>
          )}
        </div>
      </div>

      {/* Smart Playlist Modal */}
      <SmartPlaylistModal
        isOpen={isSmartModalOpen}
        onClose={() => setIsSmartModalOpen(false)}
        onPlaylistCreated={fetchPlaylists}
      />

      {/* Custom Playlist Modal */}
      <CreatePlaylistModal
        isOpen={isCustomModalOpen}
        onClose={() => setIsCustomModalOpen(false)}
        onPlaylistCreated={fetchPlaylists}
      />
    </div>
  );
};
