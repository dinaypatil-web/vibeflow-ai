import React, { useState, useEffect, useMemo } from 'react';
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
  LogIn,
  Share2,
  Users,
  ShieldCheck,
  ArrowUp,
  ArrowDown,
  Shuffle,
  ArrowUpDown,
  Check
} from 'lucide-react';
import { Playlist, PlaylistItem, MediaItem } from '../types';
import { api } from '../services/api';
import { usePlayerStore } from '../store/playerStore';
import { SmartPlaylistModal } from '../components/SmartPlaylistModal';
import { CreatePlaylistModal } from '../components/CreatePlaylistModal';
import { SharePlaylistModal } from '../components/SharePlaylistModal';
import { AddLinkToPlaylistModal } from '../components/AddLinkToPlaylistModal';
import { DeviceSyncModal } from '../components/DeviceSyncModal';
import { TrackSortControl } from '../components/TrackSortControl';
import { sortMediaItems } from '../utils/trackSort';
import { Link as LinkIcon } from 'lucide-react';

interface PlaylistsViewProps {
  onOpenAuth?: () => void;
}

export const PlaylistsView: React.FC<PlaylistsViewProps> = ({ onOpenAuth }) => {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [isSmartModalOpen, setIsSmartModalOpen] = useState(false);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isAddLinkModalOpen, setIsAddLinkModalOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [playlistSort, setPlaylistSort] = useState<string>('default');

  const { playTrack, setNowPlayingOpen, user, logout } = usePlayerStore();

  const sortedPlaylistItems = useMemo(() => {
    if (!selectedPlaylist?.items || selectedPlaylist.items.length === 0) return [];
    if (playlistSort === 'default') return selectedPlaylist.items;

    const itemsCopy = [...selectedPlaylist.items];
    const sortedMedia = sortMediaItems(itemsCopy.map(i => i.mediaItem), playlistSort);
    return sortedMedia
      .map(m => itemsCopy.find(i => i.mediaItem.id === m.id)!)
      .filter(Boolean);
  }, [selectedPlaylist?.items, playlistSort]);

  const fetchPlaylists = async (preferredPlaylistId?: string) => {
    setLoading(true);
    try {
      const data = await api.getPlaylists();
      
      // Sort: User's personal custom playlists first (newest first), then shared with me, then preset curated playlists
      const customPlaylists = data.filter(p => !p.id.startsWith('playlist-') && !p.isSharedWithMe)
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      const sharedPlaylists = data.filter(p => p.isSharedWithMe)
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      const presetPlaylists = data.filter(p => p.id.startsWith('playlist-'));
      
      const ordered = [...customPlaylists, ...sharedPlaylists, ...presetPlaylists];
      setPlaylists(ordered);

      if (ordered.length > 0) {
        const storedSelectedId = localStorage.getItem('vibeflow_selected_playlist_id');
        const targetId = preferredPlaylistId || selectedPlaylist?.id || storedSelectedId;
        const matched = targetId ? ordered.find(p => p.id === targetId) : undefined;
        // Priority: matched -> user's first custom playlist -> first playlist
        const nextSelected = matched || customPlaylists[0] || ordered[0];
        setSelectedPlaylist(nextSelected);
        if (nextSelected) {
          try {
            localStorage.setItem('vibeflow_selected_playlist_id', nextSelected.id);
          } catch {}
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

  const handleSelectPlaylist = (pl: Playlist) => {
    setSelectedPlaylist(pl);
    try {
      localStorage.setItem('vibeflow_selected_playlist_id', pl.id);
    } catch {}
  };

  const handlePlaylistCreated = (newPl?: Playlist) => {
    if (newPl) {
      setSelectedPlaylist(newPl);
      try {
        localStorage.setItem('vibeflow_selected_playlist_id', newPl.id);
      } catch {}
    }
    fetchPlaylists(newPl?.id);
  };

  useEffect(() => {
    // Check if user arrived via a share link
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('shareToken');
    if (token) {
      api.acceptShareToken(token)
        .then(res => {
          if (res.playlist) {
            handleSelectPlaylist(res.playlist);
            fetchPlaylists(res.playlist.id);
          }
        })
        .catch(() => {});
    }
  }, []);

  useEffect(() => {
    fetchPlaylists();
  }, [user?.id]);

  // Auto-resolve real track durations for playlists that have fallback 240s tracks
  useEffect(() => {
    if (!selectedPlaylist || !selectedPlaylist.items || selectedPlaylist.items.length === 0) return;
    const hasUnresolved = selectedPlaylist.items.some(
      i => !i.mediaItem?.duration || i.mediaItem.duration === 240
    );
    if (hasUnresolved && !selectedPlaylist.isSmart) {
      api.resolvePlaylistDurations(selectedPlaylist.id)
        .then(res => {
          if (res.playlist) {
            setSelectedPlaylist(res.playlist);
            setPlaylists(prev => prev.map(p => p.id === res.playlist.id ? res.playlist : p));
          }
        })
        .catch(() => {});
    }
  }, [selectedPlaylist?.id]);

  // Total playlist duration calculation in seconds
  const totalPlaylistSeconds = useMemo(() => {
    if (!selectedPlaylist?.items) return 0;
    return selectedPlaylist.items.reduce((sum, item) => sum + (item.mediaItem?.duration || 0), 0);
  }, [selectedPlaylist?.items]);

  // Human-readable total playlist time for header and title
  const formattedTotalPlaylistTime = useMemo(() => {
    if (!totalPlaylistSeconds) return '0 min';
    const total = Math.round(totalPlaylistSeconds);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    if (h > 0) {
      return m > 0 ? `${h} hr ${m} min` : `${h} hr`;
    }
    if (m > 0) {
      return s > 0 ? `${m} min ${s} sec` : `${m} min`;
    }
    return `${s} sec`;
  }, [totalPlaylistSeconds]);

  const handlePlayAll = () => {
    if (!sortedPlaylistItems || sortedPlaylistItems.length === 0) return;
    const mediaTracks = sortedPlaylistItems.map(i => i.mediaItem);
    playTrack(mediaTracks[0], mediaTracks);
    setNowPlayingOpen(true);
  };

  const handleDeletePlaylist = async () => {
    if (!selectedPlaylist) return;
    if (confirm(`Delete playlist "${selectedPlaylist.title}"?`)) {
      await api.deletePlaylist(selectedPlaylist.id);
      try {
        localStorage.removeItem('vibeflow_selected_playlist_id');
      } catch {}
      setSelectedPlaylist(null);
      fetchPlaylists();
    }
  };

  const handleLeaveSharedPlaylist = async () => {
    if (!selectedPlaylist) return;
    if (confirm(`Remove shared playlist "${selectedPlaylist.title}" from your library?`)) {
      await api.leaveSharedPlaylist(selectedPlaylist.id);
      try {
        localStorage.removeItem('vibeflow_selected_playlist_id');
      } catch {}
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

  // Reorder tracks by moving up or down
  const handleMoveTrack = async (e: React.MouseEvent, index: number, direction: 'up' | 'down') => {
    e.stopPropagation();
    if (!selectedPlaylist || !selectedPlaylist.items) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= selectedPlaylist.items.length) return;

    const baseList = [...sortedPlaylistItems];
    const [moved] = baseList.splice(index, 1);
    baseList.splice(targetIndex, 0, moved);
    baseList.forEach((item, idx) => {
      item.orderIndex = idx;
    });

    const updatedPl = { ...selectedPlaylist, items: baseList };
    setSelectedPlaylist(updatedPl);
    setPlaylists(prev => prev.map(p => p.id === updatedPl.id ? updatedPl : p));

    try {
      await api.reorderPlaylist(selectedPlaylist.id, {
        itemIds: baseList.map(i => i.id)
      });
    } catch (err) {
      console.error('Failed to reorder playlist', err);
    }
  };

  // Reverse playlist tracks sequence
  const handleReverseSequence = async () => {
    if (!selectedPlaylist || !selectedPlaylist.items || selectedPlaylist.items.length < 2) return;
    const baseList = [...sortedPlaylistItems].reverse();
    baseList.forEach((item, idx) => {
      item.orderIndex = idx;
    });

    const updatedPl = { ...selectedPlaylist, items: baseList };
    setSelectedPlaylist(updatedPl);
    setPlaylists(prev => prev.map(p => p.id === updatedPl.id ? updatedPl : p));
    setPlaylistSort('default');

    try {
      await api.reorderPlaylist(selectedPlaylist.id, { action: 'reverse' });
    } catch (err) {
      console.error('Failed to reverse playlist', err);
    }
  };

  // Shuffle playlist sequence
  const handleShuffleSequence = async () => {
    if (!selectedPlaylist || !selectedPlaylist.items || selectedPlaylist.items.length < 2) return;
    const baseList = [...selectedPlaylist.items];
    for (let i = baseList.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [baseList[i], baseList[j]] = [baseList[j], baseList[i]];
    }
    baseList.forEach((item, idx) => {
      item.orderIndex = idx;
    });

    const updatedPl = { ...selectedPlaylist, items: baseList };
    setSelectedPlaylist(updatedPl);
    setPlaylists(prev => prev.map(p => p.id === updatedPl.id ? updatedPl : p));
    setPlaylistSort('default');

    try {
      await api.reorderPlaylist(selectedPlaylist.id, { action: 'shuffle' });
    } catch (err) {
      console.error('Failed to shuffle playlist', err);
    }
  };

  // Save current sorted view as the permanent sequence
  const handleSaveSortedSequence = async () => {
    if (!selectedPlaylist || !sortedPlaylistItems || sortedPlaylistItems.length < 2) return;
    const baseList = [...sortedPlaylistItems];
    baseList.forEach((item, idx) => {
      item.orderIndex = idx;
    });

    const updatedPl = { ...selectedPlaylist, items: baseList };
    setSelectedPlaylist(updatedPl);
    setPlaylists(prev => prev.map(p => p.id === updatedPl.id ? updatedPl : p));
    setPlaylistSort('default');

    try {
      await api.reorderPlaylist(selectedPlaylist.id, {
        itemIds: baseList.map(i => i.id)
      });
    } catch (err) {
      console.error('Failed to save sorted sequence', err);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    const confirmed = confirm(
      `Permanently delete your account (@${user.username || user.name})?\n\n` +
      `This will permanently erase your user profile, cloud playlists, and login access across all devices.\n\n` +
      `Are you sure you want to proceed?`
    );
    if (!confirmed) return;

    try {
      await api.deleteAccount(undefined, user.id);
      logout();
      fetchPlaylists();
      alert('Your account and all associated data have been permanently deleted from this device and the server.');
    } catch (err: any) {
      alert(`Failed to delete account: ${err.message || 'Unknown error'}`);
    }
  };

  const handleExport = (format: 'json' | 'm3u') => {
    if (!selectedPlaylist) return;
    const url = `http://localhost:4000/api/playlists/${selectedPlaylist.id}/export?format=${format}`;
    window.open(url, '_blank');
  };

  const formatDuration = (secs: number) => {
    if (!secs || isNaN(secs)) return '0:00';
    const totalSecs = Math.round(secs);
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    if (h > 0) {
      return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    }
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
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-white">
                {user ? user.name : 'VibeFlow Account'}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                <Cloud className="w-3 h-3" />
                <span>Server Saved & Cloud Synced</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {user 
                ? `Logged in as ${user.email} • Your playlists & tracks are stored on the server & accessible from any device`
                : 'All your playlists are saved on the server database. Use Sync Code to access on other devices.'
              }
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsSyncModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-surface-800 hover:bg-surface-750 border border-white/10 text-xs font-semibold text-slate-200 hover:text-white transition-all flex items-center gap-1.5"
            title="Pair with phone, tablet, or another computer using your Sync Code"
          >
            <Cloud className="w-3.5 h-3.5 text-brand-400" />
            <span>Sync Across Devices</span>
          </button>

          {user ? (
            <div className="flex items-center gap-2">
              <button
                onClick={logout}
                className="px-3 py-1.5 rounded-xl bg-surface-800 hover:bg-surface-750 border border-white/10 text-xs font-medium text-slate-300 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 text-slate-400" />
                <span>Sign Out</span>
              </button>
              <button
                onClick={handleDeleteAccount}
                className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-xs font-semibold text-rose-300 hover:text-rose-100 transition-all flex items-center gap-1.5 cursor-pointer"
                title="Permanently delete user account from all devices"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span>Delete Account</span>
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-brand-600 to-accent-cyan hover:opacity-95 text-xs font-bold text-white shadow-md shadow-brand-500/20 transition-all flex items-center gap-1.5"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In / Register</span>
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
              const isCustom = !pl.id.startsWith('playlist-') && !pl.isSharedWithMe;
              return (
                <div
                  key={pl.id}
                  onClick={() => handleSelectPlaylist(pl)}
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
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="text-sm font-bold text-white truncate">{pl.title}</h4>
                      {pl.isSmart && (
                        <span className="p-0.5 rounded bg-brand-500/20 text-brand-300 text-[10px]" title="Smart Playlist">
                          <Sparkles className="w-3 h-3" />
                        </span>
                      )}
                      {isCustom && (
                        <span className="px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[9px] font-bold uppercase tracking-wider">
                          Custom
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[11px] text-slate-400 truncate">
                        {pl.items?.length || pl.itemCount} tracks
                      </span>
                      <span className="text-slate-600">•</span>
                      {pl.isSharedWithMe ? (
                        <span className="text-[10px] text-accent-cyan font-semibold truncate">
                          Shared by {pl.creator?.name?.split(' ')[0] || 'User'}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 truncate">
                          by {pl.creator?.name?.split(' ')[0] || 'You'}
                        </span>
                      )}
                    </div>
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
                <div className="flex items-start gap-4">
                  <img
                    src={selectedPlaylist.coverArt || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80'}
                    alt={selectedPlaylist.title}
                    className="w-20 h-20 rounded-2xl object-cover shadow-lg ring-1 ring-white/10 shrink-0"
                  />
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xl font-bold text-white">{selectedPlaylist.title}</h3>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-500/15 border border-brand-500/30 text-brand-300 text-xs font-semibold shadow-xs" title="Total Playlist Duration">
                        <Clock className="w-3.5 h-3.5 text-accent-cyan" />
                        <span>{formattedTotalPlaylistTime}</span>
                      </span>
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
                      {selectedPlaylist.isSharedWithMe ? (
                        <span className="px-2 py-0.5 rounded-full bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/30 text-[11px] font-semibold flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          <span>Shared With You</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[11px] font-semibold flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" />
                          <span>Your Creation</span>
                        </span>
                      )}
                    </div>

                    {/* Creator Attribution Bar */}
                    <div className="flex flex-wrap items-center gap-2.5 mt-2 text-xs">
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-surface-800 border border-white/5">
                        <img
                          src={selectedPlaylist.creator?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'}
                          alt=""
                          className="w-4 h-4 rounded-full object-cover"
                        />
                        <span className="text-slate-400">Created by</span>
                        <span className="font-bold text-white">{selectedPlaylist.creator?.name || 'Aarav Sharma'}</span>
                        {selectedPlaylist.creator?.username && (
                          <span className="text-slate-400">(@{selectedPlaylist.creator.username})</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 text-slate-400 font-mono text-[11px] px-2.5 py-1 rounded-xl bg-surface-800 border border-white/5">
                        <span>{selectedPlaylist.items?.length || 0} tracks</span>
                        <span>•</span>
                        <span className="text-brand-300 font-medium">{formattedTotalPlaylistTime}</span>
                      </div>

                      <div className="flex items-center gap-1 text-[11px] text-emerald-400/90 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Retained in your access until deleted</span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-400 mt-2 max-w-lg">
                      {selectedPlaylist.description || 'Personal playlist collection.'}
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

                  {/* Save Direct Link to Playlist Button */}
                  <button
                    onClick={() => setIsAddLinkModalOpen(true)}
                    className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
                    title="Save YouTube, Spotify, or Media stream link directly into this playlist"
                  >
                    <LinkIcon className="w-3.5 h-3.5" />
                    <span>Add Link / URL</span>
                  </button>

                  {/* Share Playlist Button */}
                  <button
                    onClick={() => setIsShareModalOpen(true)}
                    className="px-3.5 py-2 bg-gradient-to-r from-brand-600/30 to-purple-600/30 hover:from-brand-600/50 hover:to-purple-600/50 text-brand-200 hover:text-white border border-brand-500/30 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-sm"
                    title="Share playlist with other users or copy share link"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Share</span>
                  </button>

                  {/* Track Sort Control based on attributes */}
                  {selectedPlaylist.items && selectedPlaylist.items.length > 1 && (
                    <TrackSortControl currentSort={playlistSort} onSortChange={setPlaylistSort} />
                  )}

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

                  {/* Delete or Leave Playlist button */}
                  {selectedPlaylist.isSharedWithMe ? (
                    <button
                      onClick={handleLeaveSharedPlaylist}
                      className="p-2 rounded-xl bg-surface-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border border-white/5 transition-colors"
                      title="Remove shared playlist from your library"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  ) : !selectedPlaylist.isSmart ? (
                    <button
                      onClick={handleDeletePlaylist}
                      className="p-2 rounded-xl bg-surface-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border border-white/5 transition-colors"
                      title="Delete playlist"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  ) : null}
                </div>
              </div>

              {/* Tracks List */}
              <div className="space-y-3">
                {/* Quick Sequence Controls Toolbar */}
                {selectedPlaylist.items && selectedPlaylist.items.length > 1 && !selectedPlaylist.isSmart && (
                  <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-2xl bg-surface-800/80 border border-white/5 text-xs">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-slate-400 font-medium">Sequence:</span>
                      <button
                        onClick={handleReverseSequence}
                        className="px-2.5 py-1.5 rounded-xl bg-surface-750 hover:bg-surface-700 text-slate-200 hover:text-white border border-white/5 flex items-center gap-1.5 transition-colors cursor-pointer text-xs"
                        title="Reverse track playing sequence"
                      >
                        <ArrowUpDown className="w-3.5 h-3.5 text-brand-400" />
                        <span>Reverse Order</span>
                      </button>
                      <button
                        onClick={handleShuffleSequence}
                        className="px-2.5 py-1.5 rounded-xl bg-surface-750 hover:bg-surface-700 text-slate-200 hover:text-white border border-white/5 flex items-center gap-1.5 transition-colors cursor-pointer text-xs"
                        title="Shuffle the sequence of tracks"
                      >
                        <Shuffle className="w-3.5 h-3.5 text-accent-cyan" />
                        <span>Shuffle</span>
                      </button>
                      {playlistSort !== 'default' && (
                        <button
                          onClick={handleSaveSortedSequence}
                          className="px-2.5 py-1.5 rounded-xl bg-brand-600/30 hover:bg-brand-600/50 text-brand-200 hover:text-white border border-brand-500/30 flex items-center gap-1.5 transition-colors cursor-pointer text-xs"
                          title="Save this sorted order as the permanent playlist sequence"
                        >
                          <Check className="w-3.5 h-3.5 text-brand-300" />
                          <span>Save As Permanent Sequence</span>
                        </button>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 hidden sm:inline">
                      Use <span className="font-semibold text-white">↑</span> / <span className="font-semibold text-white">↓</span> on any track to reorder
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs font-semibold text-slate-500 px-3 uppercase tracking-wider">
                  <span># Title</span>
                  <div className="flex items-center gap-12 pr-2">
                    <span>Vibe / Genre</span>
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  {sortedPlaylistItems && sortedPlaylistItems.length > 0 ? (
                    sortedPlaylistItems.map((item, idx) => {
                      const track = item.mediaItem;
                      return (
                        <div
                          key={`${item.id}-${idx}`}
                          onClick={() => {
                            const all = sortedPlaylistItems.map(i => i.mediaItem);
                            playTrack(track, all);
                          }}
                          className="flex items-center justify-between p-2.5 rounded-xl hover:bg-surface-800 transition-colors group cursor-pointer border border-transparent hover:border-white/5"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            {/* Sequence number and Move Up/Down controls */}
                            <div className="flex items-center gap-1 min-w-[32px] shrink-0">
                              <span className="w-4 text-center text-xs font-mono text-slate-500 group-hover:text-brand-400">
                                {idx + 1}
                              </span>
                              {!selectedPlaylist.isSmart && (
                                <div className="flex flex-col -space-y-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    type="button"
                                    disabled={idx === 0}
                                    onClick={(e) => handleMoveTrack(e, idx, 'up')}
                                    className="p-0.5 text-slate-400 hover:text-brand-300 disabled:opacity-20 hover:bg-surface-700 rounded transition-colors cursor-pointer"
                                    title="Move track up in sequence"
                                  >
                                    <ArrowUp className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={idx === sortedPlaylistItems.length - 1}
                                    onClick={(e) => handleMoveTrack(e, idx, 'down')}
                                    className="p-0.5 text-slate-400 hover:text-brand-300 disabled:opacity-20 hover:bg-surface-700 rounded transition-colors cursor-pointer"
                                    title="Move track down in sequence"
                                  >
                                    <ArrowDown className="w-3 h-3" />
                                  </button>
                                </div>
                              )}
                            </div>
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
                            <span className="font-mono text-slate-400 text-xs font-medium">
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
                    <div className="p-8 text-center space-y-3">
                      <p className="text-slate-400 text-xs">
                        No tracks in this playlist yet. Add songs from search, or paste a YouTube / Spotify link directly!
                      </p>
                      <button
                        onClick={() => setIsAddLinkModalOpen(true)}
                        className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white text-xs font-semibold rounded-xl inline-flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all"
                      >
                        <LinkIcon className="w-3.5 h-3.5" />
                        <span>Paste YouTube / Spotify / Web Link</span>
                      </button>
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
        onPlaylistCreated={handlePlaylistCreated}
      />

      {/* Custom Playlist Modal */}
      <CreatePlaylistModal
        isOpen={isCustomModalOpen}
        onClose={() => setIsCustomModalOpen(false)}
        onPlaylistCreated={handlePlaylistCreated}
      />

      {/* Share Playlist Modal */}
      <SharePlaylistModal
        isOpen={isShareModalOpen}
        playlist={selectedPlaylist}
        onClose={() => setIsShareModalOpen(false)}
        onPlaylistUpdated={fetchPlaylists}
      />

      {/* Add Direct Link to Playlist Modal */}
      <AddLinkToPlaylistModal
        isOpen={isAddLinkModalOpen}
        playlist={selectedPlaylist}
        onClose={() => setIsAddLinkModalOpen(false)}
        onSuccess={() => {
          fetchPlaylists(selectedPlaylist?.id);
        }}
      />

      {/* Cross-Device Sync Modal */}
      <DeviceSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        onOpenAuth={onOpenAuth}
        onSynced={() => {
          fetchPlaylists();
        }}
      />
    </div>
  );
};
