import React, { useState, useEffect } from 'react';
import { 
  X, 
  Cloud, 
  Smartphone, 
  Laptop, 
  Copy, 
  Check, 
  ArrowRight, 
  Loader2, 
  ShieldCheck, 
  AlertCircle, 
  LogIn,
  KeyRound
} from 'lucide-react';
import { api } from '../services/api';
import { usePlayerStore } from '../store/playerStore';

interface DeviceSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAuth?: () => void;
  onSynced?: () => void;
}

export const DeviceSyncModal: React.FC<DeviceSyncModalProps> = ({
  isOpen,
  onClose,
  onOpenAuth,
  onSynced
}) => {
  const { user, setUser } = usePlayerStore();
  const [syncCode, setSyncCode] = useState<string>('');
  const [loadingCode, setLoadingCode] = useState(false);
  const [copied, setCopied] = useState(false);

  const [inputCode, setInputCode] = useState('');
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadSyncCode();
      setError(null);
      setSuccessMsg(null);
    }
  }, [isOpen, user]);

  const loadSyncCode = async () => {
    setLoadingCode(true);
    try {
      const res = await api.getSyncCode();
      if (res.syncCode) {
        setSyncCode(res.syncCode);
      }
    } catch (e) {
      // Fallback to user sync code or default format
      setSyncCode(user?.syncCode || 'VF-SYNC');
    } finally {
      setLoadingCode(false);
    }
  };

  const handleCopyCode = () => {
    if (!syncCode) return;
    navigator.clipboard.writeText(syncCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLinkDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = inputCode.trim();
    if (!clean) return;

    setLinking(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await api.linkDeviceBySyncCode(clean);
      if (res.user) {
        setUser(res.user, res.token || localStorage.getItem('vibeflow_token') || 'sync-token');
        setSuccessMsg(`Device paired successfully! Welcome back, ${res.user.name}.`);
        if (onSynced) onSynced();
        setTimeout(() => {
          onClose();
        }, 1500);
      }
    } catch (err: any) {
      setError(err.message || 'Invalid sync code. Please check the code on your other device.');
    } finally {
      setLinking(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-md bg-surface-900 border border-white/10 rounded-3xl p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-600 to-accent-cyan flex items-center justify-center text-white shadow-md">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Anywhere Access & Sync</h3>
              <p className="text-xs text-slate-400">Playlists are saved to server for cross-device access</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl bg-surface-800 hover:bg-surface-750 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Server Persistence Guarantee Badge */}
        <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/25 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-bold text-emerald-300">Server-Side Storage Active</p>
            <p className="text-slate-300 mt-0.5 leading-relaxed">
              Your playlists, imported links, and customizations are stored securely on the VibeFlow server. They will never vanish when you switch browsers, devices, or clear cache.
            </p>
          </div>
        </div>

        {/* Option 1: Cross-Device Quick Sync Code */}
        <div className="p-4 rounded-2xl bg-surface-850 border border-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-brand-400" />
              <span>Your Device Sync Code</span>
            </span>
            <div className="flex items-center gap-1 text-[11px] text-slate-400">
              <Smartphone className="w-3 h-3" />
              <span>⇄</span>
              <Laptop className="w-3 h-3" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1 px-4 py-2.5 rounded-xl bg-surface-800 border border-white/10 font-mono text-base font-bold text-brand-300 tracking-wider text-center select-all">
              {loadingCode ? <Loader2 className="w-4 h-4 animate-spin mx-auto text-slate-400" /> : (syncCode || 'VF-SYNC')}
            </div>
            <button
              onClick={handleCopyCode}
              disabled={loadingCode || !syncCode}
              className="px-3.5 py-2.5 rounded-xl bg-surface-800 hover:bg-surface-750 border border-white/10 text-xs font-semibold text-slate-200 hover:text-white flex items-center gap-1.5 transition-all"
              title="Copy Sync Code"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>
          <p className="text-[11px] text-slate-400">
            Open VibeFlow on another phone or computer, open Sync, and enter this code to instantly access your playlists.
          </p>
        </div>

        {/* Option 2: Enter Sync Code to Link Another Device */}
        <form onSubmit={handleLinkDevice} className="space-y-2">
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Pair with another device code:
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.toUpperCase())}
              placeholder="e.g. VF-8492"
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-surface-800 border border-white/10 text-xs font-mono uppercase text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <button
              type="submit"
              disabled={linking || !inputCode.trim()}
              className="px-4 py-2.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all"
            >
              {linking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
              <span>Pair Device</span>
            </button>
          </div>
        </form>

        {error && (
          <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/30 flex items-center gap-2 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/30 flex items-center gap-2 text-xs text-emerald-300">
            <Check className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Option 3: Account Sign In / Sign Up */}
        <div className="pt-3 border-t border-white/5 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            {user ? `Signed in as ${user.email}` : 'Or use standard user account:'}
          </span>
          {!user && onOpenAuth && (
            <button
              onClick={() => {
                onClose();
                onOpenAuth();
              }}
              className="px-3 py-1.5 rounded-xl bg-surface-800 hover:bg-surface-750 text-xs font-semibold text-brand-300 hover:text-white flex items-center gap-1.5 transition-colors border border-brand-500/20"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In / Register</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
