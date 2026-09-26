import React, { useState, useEffect } from 'react';
import {
  Radio, Mail, Lock, User, Eye, EyeOff, Loader2, Sparkles,
  Music, Headphones, Waves, AlertCircle, ChevronRight, X,
  CheckCircle2, Globe, Shield
} from 'lucide-react';
import { usePlayerStore } from '../store/playerStore';

type AuthMode = 'login' | 'register';

interface AuthModalProps {
  onClose?: () => void;
  required?: boolean; // if true, can't close without logging in
}

const FEATURES = [
  { icon: <Music className="w-4 h-4" />, text: 'Your playlists across all devices' },
  { icon: <Headphones className="w-4 h-4" />, text: 'Listening history & favorites' },
  { icon: <Sparkles className="w-4 h-4" />, text: 'AI-personalized recommendations' },
  { icon: <Waves className="w-4 h-4" />, text: 'Sync across JioSaavn, YouTube & more' },
];

export const AuthModal: React.FC<AuthModalProps> = ({ onClose, required = false }) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const { login, register, loginDemo, authLoading, authError, clearAuthError, user } = usePlayerStore();

  // Close on successful login
  useEffect(() => {
    if (user && success) {
      setTimeout(() => onClose?.(), 600);
    }
  }, [user, success, onClose]);

  const validate = () => {
    if (!email.trim()) return 'Email is required';
    if (!email.includes('@')) return 'Enter a valid email address';
    if (!password || password.length < 6) return 'Password must be at least 6 characters';
    if (mode === 'register' && !name.trim()) return 'Name is required';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearAuthError();
    const err = validate();
    if (err) { setLocalError(err); return; }
    try {
      if (mode === 'login') {
        await login(email.trim(), password);
      } else {
        await register(name.trim(), email.trim(), password);
      }
      setSuccess(true);
    } catch {
      // error shown via authError
    }
  };

  const handleDemo = async () => {
    setLocalError(null);
    clearAuthError();
    await loginDemo();
    setSuccess(true);
  };

  const displayError = localError || authError;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-xl"
        onClick={required ? undefined : onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-surface-900 border border-white/10 rounded-3xl shadow-2xl shadow-black/50 overflow-hidden animate-in zoom-in-95 fade-in duration-300">

        {/* Decorative top gradient */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-600 via-accent-cyan to-brand-400" />

        {/* Close button (if not required) */}
        {!required && onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-surface-800 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        <div className="p-7">
          {/* Brand */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-brand-600 via-brand-500 to-accent-cyan flex items-center justify-center shadow-lg shadow-brand-500/30">
              <Radio className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">VibeFlow AI</h1>
              <p className="text-xs text-brand-400 font-medium">Intelligent Music & Video</p>
            </div>
          </div>

          {/* Title */}
          <div className="mb-5">
            <h2 className="text-2xl font-bold text-white">
              {mode === 'login' ? 'Welcome back! 🎵' : 'Join VibeFlow AI ✨'}
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              {mode === 'login'
                ? 'Sign in to access your playlists & personalized music'
                : 'Create your account and sync music across all devices'}
            </p>
          </div>

          {/* Feature pills (register mode) */}
          {mode === 'register' && (
            <div className="grid grid-cols-2 gap-2 mb-5">
              {FEATURES.map((f, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-850 border border-white/5 text-xs text-slate-300">
                  <span className="text-brand-400 shrink-0">{f.icon}</span>
                  <span>{f.text}</span>
                </div>
              ))}
            </div>
          )}

          {/* Success state */}
          {success && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 mb-4 animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <p className="text-sm font-semibold">
                {mode === 'login' ? 'Logged in successfully!' : 'Account created! Welcome to VibeFlow AI 🎉'}
              </p>
            </div>
          )}

          {/* Error */}
          {displayError && !success && (
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 mb-4 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <p className="text-sm">{displayError}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === 'register' && (
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Full name"
                  autoComplete="name"
                  className="w-full pl-11 pr-4 py-3.5 bg-surface-850 border border-white/10 rounded-2xl text-sm text-slateate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/40 transition-all text-white"
                />
              </div>
            )}

            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Email address"
                autoComplete={mode === 'login' ? 'email' : 'new-email'}
                className="w-full pl-11 pr-4 py-3.5 bg-surface-850 border border-white/10 rounded-2xl text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/40 transition-all text-white"
              />
            </div>

            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={mode === 'register' ? 'Create password (min 6 chars)' : 'Password'}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                className="w-full pl-11 pr-12 py-3.5 bg-surface-850 border border-white/10 rounded-2xl text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/40 transition-all text-white"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <button
              type="submit"
              disabled={authLoading || success}
              className="w-full py-3.5 bg-gradient-to-r from-brand-600 to-accent-cyan text-white font-bold text-sm rounded-2xl shadow-lg shadow-brand-500/25 hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              {authLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /><span>Please wait...</span></>
              ) : (
                <><span>{mode === 'login' ? 'Sign In' : 'Create Account'}</span><ChevronRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-4">
            <div className="h-px flex-1 bg-white/8" />
            <span className="text-xs text-slate-500">or continue with</span>
            <div className="h-px flex-1 bg-white/8" />
          </div>

          {/* Demo login */}
          <button
            onClick={handleDemo}
            disabled={authLoading || success}
            className="w-full py-3 bg-surface-800 border border-white/10 hover:border-brand-500/40 hover:bg-surface-750 text-slate-200 text-sm font-semibold rounded-2xl flex items-center justify-center gap-2.5 transition-all group disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4 text-brand-400 group-hover:text-brand-300" />
            <span>Try Demo Account</span>
            <span className="text-xs text-slate-500">(Instant, no sign-up)</span>
          </button>

          {/* Trust signals */}
          <div className="flex items-center justify-center gap-4 mt-4 text-[11px] text-slate-500">
            <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> Encrypted</span>
            <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> Cross-device sync</span>
          </div>

          {/* Toggle mode */}
          <p className="text-center text-sm text-slate-400 mt-4">
            {mode === 'login' ? (
              <>Don't have an account?{' '}
                <button onClick={() => { setMode('register'); setLocalError(null); clearAuthError(); }} className="text-brand-400 hover:text-brand-300 font-semibold transition-colors">
                  Create one free
                </button>
              </>
            ) : (
              <>Already have an account?{' '}
                <button onClick={() => { setMode('login'); setLocalError(null); clearAuthError(); }} className="text-brand-400 hover:text-brand-300 font-semibold transition-colors">
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};
