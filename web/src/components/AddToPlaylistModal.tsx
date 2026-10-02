import React, { useState, useEffect } from 'react';
import { X, ListMusic, Plus, Check, CheckCircle2 } from 'lucide-react';
import { MediaItem, Playlist } from '../types';
import { api } from '../services/api';
import { usePlayerStore } from '../store/playerStore';

interface AddToPlaylistModalProps {
  isOpen: boolean;
  track: MediaItem | null;
  onClose: () => void;
}

export const AddToPlaylistModal: React.FC<AddToPlaylistModalProps> = ({ 
  isOpen, 
  track, 
  onClose 
}) => {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(false);
  const [addedIds, setAddedIds] = useState<string[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const { user, token } = usePlayerStore();

  useEffect(() => {
    if (isOpen) {
      loadPlaylists();
      setAddedIds([]);
    }
  }, [isOpen]);

  const loadPlaylists = async () => {
    setLoading(true);
    try {
      const data = await api.getPlaylists();
      setPlaylists(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !track) return null;

  const handleAdd = async (playlistId: string) => {
    try {
      await api.addItemToPlaylist(playlistId, track.id);
      setAddedIds(prev => [...prev, playlistId]);
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err) {
      console.error('Failed to add to playlist', err);
    }
  };

  const handleCreateAndAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setCreating(true);
    try {
      const newPl = await api.createPlaylist({
        title: newTitle.trim(),
        description: 'Personal playlist',
        isSmart: false,
        userId: user?.id,
        creator: user ? {
          id: user.id,
          name: user.name,
          username: user.username || user.name,
          avatar: user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
          email: user.email
        } : undefined
      }, token);
      await api.addItemToPlaylist(newPl.id, track.id);
      try {
        localStorage.setItem('vibeflow_selected_playlist_id', newPl.id);
      } catch {}
      setNewTitle('');
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-sm bg-surface-900 border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <ListMusic className="w-5 h-5 text-brand-400" />
            <h3 className="text-base font-bold text-white">Add to Playlist</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-xl bg-surface-800 hover:bg-surface-750 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Selected Track Pill */}
        <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-surface-850 border border-white/5">
          <img src={track.thumbnail} alt="" className="w-10 h-10 rounded-xl object-cover" />
          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-bold text-white truncate">{track.title}</h4>
            <p className="text-[11px] text-slate-400 truncate">{track.artist}</p>
          </div>
        </div>

        {/* Playlists List */}
        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Select Playlist
          </span>
          {playlists.map(pl => {
            const isAdded = addedIds.includes(pl.id);
            return (
              <button
                key={pl.id}
                onClick={() => handleAdd(pl.id)}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all ${
                  isAdded 
                    ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300' 
                    : 'bg-surface-850 hover:bg-surface-800 text-slate-200 border border-white/5'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <img src={pl.coverArt || ''} alt="" className="w-7 h-7 rounded-lg object-cover" />
                  <span className="text-xs font-semibold truncate">{pl.title}</span>
                </div>
                {isAdded ? (
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <span className="text-[10px] text-slate-400 shrink-0">{pl.items?.length || pl.itemCount} tracks</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Quick New Playlist Creator */}
        <form onSubmit={handleCreateAndAdd} className="pt-2 border-t border-white/5 space-y-2">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Or Create New Playlist
          </span>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="New playlist name..."
              className="flex-1 px-3 py-1.5 rounded-xl bg-surface-800 border border-white/10 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <button
              type="submit"
              disabled={creating || !newTitle.trim()}
              className="px-3 py-1.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all"
            >
              {creating ? '...' : 'Create & Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
