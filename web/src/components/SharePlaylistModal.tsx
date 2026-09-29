import React, { useState, useEffect } from 'react';
import { 
  X, 
  Share2, 
  Copy, 
  Check, 
  UserPlus, 
  Users, 
  Trash2, 
  ShieldCheck, 
  Search, 
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { Playlist, UserSummary } from '../types';
import { api } from '../services/api';
import { usePlayerStore } from '../store/playerStore';

interface SharePlaylistModalProps {
  isOpen: boolean;
  playlist: Playlist | null;
  onClose: () => void;
  onPlaylistUpdated: () => void;
}

export const SharePlaylistModal: React.FC<SharePlaylistModalProps> = ({
  isOpen,
  playlist,
  onClose,
  onPlaylistUpdated
}) => {
  const { user: currentUser } = usePlayerStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [availableUsers, setAvailableUsers] = useState<UserSummary[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserSummary | null>(null);
  const [manualInput, setManualInput] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setFeedback(null);
      setCopiedLink(false);
      loadSuggestedUsers();
    }
  }, [isOpen, playlist?.id]);

  const loadSuggestedUsers = async (query: string = '') => {
    try {
      const users = await api.searchUsers(query);
      // Filter out creator and users already shared with
      const alreadyShared = playlist?.sharedWith || [];
      const filtered = users.filter(u => 
        u.id !== currentUser?.id && 
        u.id !== playlist?.userId && 
        !alreadyShared.includes(u.id)
      );
      setAvailableUsers(filtered);
    } catch (err) {
      console.error('Failed to search users', err);
    }
  };

  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    setManualInput(val);
    setSelectedUser(null);
    loadSuggestedUsers(val);
  };

  if (!isOpen || !playlist) return null;

  const shareUrl = `${window.location.origin}/?shareToken=${playlist.shareToken || playlist.id}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setFeedback({ type: 'success', message: 'Share link copied to clipboard!' });
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const handleShareWithUser = async (targetIdent?: string) => {
    const target = targetIdent || selectedUser?.username || selectedUser?.id || manualInput.trim();
    if (!target) {
      setFeedback({ type: 'error', message: 'Please select or enter a username/email to share with.' });
      return;
    }

    setIsSharing(true);
    setFeedback(null);
    try {
      const res = await api.sharePlaylist(playlist.id, target);
      setFeedback({ type: 'success', message: res.message || `Playlist shared with ${target}!` });
      setSearchTerm('');
      setManualInput('');
      setSelectedUser(null);
      onPlaylistUpdated();
      loadSuggestedUsers();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to share playlist' });
    } finally {
      setIsSharing(false);
    }
  };

  const handleRevokeAccess = async (targetUserId: string, targetName: string) => {
    if (!confirm(`Revoke access for ${targetName}?`)) return;
    try {
      await api.unsharePlaylist(playlist.id, targetUserId);
      setFeedback({ type: 'success', message: `Revoked access for ${targetName}` });
      onPlaylistUpdated();
      loadSuggestedUsers();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to revoke access' });
    }
  };

  const isOwner = currentUser?.id === playlist.userId || !playlist.userId;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-lg bg-surface-900 border border-white/10 rounded-3xl p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-600 to-accent-cyan flex items-center justify-center text-white shadow-md">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Share Playlist</h3>
              <p className="text-xs text-slate-400 truncate max-w-xs">
                "{playlist.title}"
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

        {/* Creator Attribution info */}
        <div className="p-3 rounded-2xl bg-surface-850 border border-white/5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src={playlist.creator?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'}
              alt=""
              className="w-8 h-8 rounded-full object-cover ring-1 ring-white/10 shrink-0"
            />
            <div className="min-w-0">
              <span className="text-xs text-slate-400 block">Attributed Creator:</span>
              <span className="text-xs font-bold text-white truncate block">
                {playlist.creator?.name || 'Aarav Sharma'} 
                {playlist.creator?.username && <span className="text-slate-400 font-normal ml-1">(@{playlist.creator.username})</span>}
              </span>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-brand-500/10 text-brand-300 border border-brand-500/20 text-[10px] font-semibold flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" />
            <span>Private by Default</span>
          </span>
        </div>

        {/* Notification feedback */}
        {feedback && (
          <div className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 border animate-in fade-in ${
            feedback.type === 'success' 
              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20' 
              : 'bg-rose-500/15 text-rose-300 border-rose-500/20'
          }`}>
            {feedback.type === 'success' ? (
              <Check className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Share Link Section */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-300 uppercase">
            Shareable Access Link
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-surface-800 border border-white/10 text-xs text-slate-300 font-mono focus:outline-none"
            />
            <button
              onClick={handleCopyLink}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md ${
                copiedLink
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gradient-to-r from-brand-600 to-accent-cyan text-white hover:opacity-95'
              }`}
            >
              {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>
          <p className="text-[11px] text-slate-400">
            Anyone with this secure link can open and add this playlist to their library.
          </p>
        </div>

        {/* Share with specific User Section (Owner only) */}
        {isOwner && (
          <div className="space-y-2.5 pt-2 border-t border-white/5">
            <label className="block text-xs font-semibold text-slate-300 uppercase">
              Share Direct with VibeFlow User
            </label>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Enter username or email (e.g. demo, dinay.patil)..."
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-surface-800 border border-white/10 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                />
              </div>
              <button
                onClick={() => handleShareWithUser()}
                disabled={isSharing || (!manualInput.trim() && !selectedUser)}
                className="px-4 py-2.5 rounded-xl bg-surface-800 hover:bg-surface-750 border border-white/10 text-xs font-semibold text-brand-300 hover:text-white flex items-center gap-1.5 transition-all disabled:opacity-40"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>{isSharing ? 'Sharing...' : 'Grant'}</span>
              </button>
            </div>

            {/* Suggested registered users list */}
            {availableUsers.length > 0 && (
              <div className="p-2 bg-surface-850 rounded-2xl border border-white/5 space-y-1 max-h-36 overflow-y-auto">
                <div className="text-[10px] font-semibold text-slate-400 px-2 py-0.5 uppercase">
                  Suggested Community Users:
                </div>
                {availableUsers.map((u) => (
                  <div
                    key={u.id}
                    onClick={() => {
                      setSelectedUser(u);
                      setSearchTerm(u.username || u.name);
                      setManualInput(u.username || u.id);
                    }}
                    className={`flex items-center justify-between p-2 rounded-xl cursor-pointer text-xs transition-colors ${
                      selectedUser?.id === u.id 
                        ? 'bg-brand-500/20 text-brand-200 border border-brand-500/30' 
                        : 'hover:bg-surface-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <img 
                        src={u.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'} 
                        alt="" 
                        className="w-6 h-6 rounded-full object-cover" 
                      />
                      <div>
                        <span className="font-semibold text-white">{u.name}</span>
                        {u.username && <span className="text-slate-400 ml-1.5">@{u.username}</span>}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShareWithUser(u.username || u.id);
                      }}
                      className="px-2 py-1 rounded-lg bg-surface-750 hover:bg-brand-600 text-[10px] font-bold text-white transition-colors"
                    >
                      Share
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Currently Shared With Users List */}
        <div className="space-y-2 pt-2 border-t border-white/5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300 uppercase flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-brand-400" />
              <span>Users with Access ({playlist.sharedWithUsers?.length || playlist.sharedWith?.length || 0})</span>
            </span>
          </div>

          <div className="space-y-1.5 max-h-36 overflow-y-auto">
            {playlist.sharedWithUsers && playlist.sharedWithUsers.length > 0 ? (
              playlist.sharedWithUsers.map((su) => (
                <div 
                  key={su.id} 
                  className="flex items-center justify-between p-2.5 rounded-xl bg-surface-850 border border-white/5"
                >
                  <div className="flex items-center gap-2.5">
                    <img
                      src={su.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'}
                      alt=""
                      className="w-7 h-7 rounded-full object-cover"
                    />
                    <div>
                      <h5 className="text-xs font-semibold text-white">{su.name}</h5>
                      <p className="text-[10px] text-slate-400">@{su.username || su.id}</p>
                    </div>
                  </div>

                  {isOwner && (
                    <button
                      onClick={() => handleRevokeAccess(su.id, su.name)}
                      className="p-1.5 rounded-lg hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 transition-colors"
                      title="Revoke access"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))
            ) : (
              <div className="p-4 text-center rounded-2xl bg-surface-850/50 border border-white/5 text-slate-500 text-xs">
                🔒 Private. Not shared with any users yet. Only visible to you.
              </div>
            )}
          </div>
        </div>

        {/* Footer Guarantee */}
        <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1 text-slate-400">
            <Sparkles className="w-3 h-3 text-brand-400" />
            <span>Accessible in your library until you choose to delete it</span>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-surface-800 hover:bg-surface-750 text-slate-200 text-xs font-semibold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
