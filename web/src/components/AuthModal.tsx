import React, { useState, useEffect } from 'react';
import {
  Radio, Mail, Lock, User, Eye, EyeOff, Loader2, Sparkles,
  Music, Headphones, Waves, AlertCircle, ChevronRight, X,
  CheckCircle2, Globe, Shield, KeyRound, Trash2, Users
} from 'lucide-react';
import { usePlayerStore, SavedCredential } from '../store/playerStore';

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
  const { 
    login, 
    register, 
    loginDemo, 
    authLoading, 
    authError, 
    clearAuthError, 
    user,
    savedCredentials,
    savedAccounts,
    removeSavedAccount,
    clearSavedCredentials
  } = usePlayerStore();

  const [mode, setMode] = useState<AuthMode>('login');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [localError, setLocalError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [retrievedNotice, setRetrievedNotice] = useState<string | null>(null);

  // Auto-fill from saved credentials when opening login mode
  useEffect(() => {
    if (mode === 'login' && savedCredentials) {
      const idToFill = savedCredentials.identifier || savedCredentials.username || savedCredentials.email || '';
      setEmail(idToFill);
      if (savedCredentials.password) {
        setPassword(savedCredentials.password);
      }
      setRetrievedNotice(`Retrieved credentials for ${savedCredentials.name || idToFill}`);
      const t = setTimeout(() => setRetrievedNotice(null), 3500);
      return () => clearTimeout(t);
    }
  }, [mode, savedCredentials]);

  // Close on successful login
  useEffect(() => {
    if (user && success) {
      setTimeout(() => onClose?.(), 600);
    }
  }, [user, success, onClose]);

  const validate = () => {
    if (mode === 'login') {
      if (!email.trim()) return 'Please enter your username or email address';
      if (!password) return 'Password is required';
    } else {
      if (!name.trim()) return 'Your full name is required';
      if (!email.trim() && !username.trim()) return 'An email address or username is required';
      if (!password || password.length < 6) return 'Password must be at least 6 characters';
    }
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
        await login(email.trim(), password.trim(), rememberMe);
      } else {
        const rawUser = username.trim() || (!email.includes('@') ? email.trim() : email.split('@')[0]);
        const rawEmail = email.includes('@') ? email.trim() : `${rawUser}@vibeflow.local`;
        await register(name.trim(), rawEmail, password.trim(), rawUser, rememberMe);
      }
      setSuccess(true);
    } catch {
      // error shown via authError
    }
  };

  const handleQuickSignIn = async (cred: SavedCredential) => {
    setLocalError(null);
    clearAuthError();
    const id = cred.identifier || cred.username || cred.email;
    const pass = cred.password || '';
    if (!pass) {
      setEmail(id);
      setLocalError('Please enter your password to sign in');
      return;
    }
    try {
      await login(id, pass, true);
      setSuccess(true);
    } catch {}
  };

  const handleSelectAccount = (cred: SavedCredential) => {
    const id = cred.identifier || cred.username || cred.email;
    setEmail(id);
    if (cred.password) setPassword(cred.password);
    setRetrievedNotice(`Loaded credentials for ${cred.name || id}`);
    setTimeout(() => setRetrievedNotice(null), 3000);
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
          <div className="flex items-center gap-3 mb-5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-brand-600 via-brand-500 to-accent-cyan flex items-center justify-center shadow-lg shadow-brand-500/30">
              <Radio className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">VibeFlow AI</h1>
              <p className="text-xs text-brand-400 font-medium">Intelligent Music & Video</p>
            </div>
          </div>

          {/* Title */}
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-white">
              {mode === 'login' ? 'Welcome back! 🎵' : 'Join VibeFlow AI ✨'}
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              {mode === 'login'
                ? 'Sign in with your saved credentials or enter your details'
                : 'Create your account and save your music preferences'}
            </p>
          </div>

          {/* Retrieved Credentials Toast Banner */}
          {retrievedNotice && mode === 'login' && !success && (
            <div className="flex items-center gap-2 p-2.5 px-3 rounded-xl bg-brand-500/15 border border-brand-500/30 text-brand-300 text-xs mb-3 animate-in fade-in">
              <KeyRound className="w-3.5 h-3.5 text-brand-400 shrink-0" />
              <span className="truncate">{retrievedNotice}</span>
            </div>
          )}

          {/* Feature pills (register mode) */}
          {mode === 'register' && (
            <div className="grid grid-cols-2 gap-2 mb-4">
              {FEATURES.map((f, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-850 border border-white/5 text-xs text-slate-300">
                  <span className="text-brand-400 shrink-0">{f.icon}</span>
                  <span>{f.text}</span>
                </div>
              ))}
            </div>
          )}

          {/* Quick Saved Account Card (Login Mode) */}
          {mode === 'login' && savedCredentials && (
            <div className="mb-4 p-3.5 rounded-2xl bg-gradient-to-r from-brand-950/60 to-surface-850 border border-brand-500/30 shadow-md space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 to-accent-cyan flex items-center justify-center font-bold text-white text-xs shadow-sm">
                    {(savedCredentials.name || savedCredentials.identifier || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white truncate max-w-[140px]">{savedCredentials.name || 'Saved Account'}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-brand-500/20 text-brand-300 font-semibold border border-brand-500/30">
                        Saved
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate max-w-[180px]">
                      {savedCredentials.username ? `@${savedCredentials.username}` : savedCredentials.email || savedCredentials.identifier}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleQuickSignIn(savedCredentials)}
                    disabled={authLoading || success}
                    className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-brand-600 to-accent-cyan hover:opacity-95 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1 active:scale-95"
                  >
                    <span>1-Click Sign In</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => removeSavedAccount(savedCredentials.identifier)}
                    title="Remove saved account"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-surface-800 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Multiple saved accounts list */}
              {savedAccounts && savedAccounts.length > 1 && (
                <div className="pt-2 border-t border-white/5 flex items-center gap-1.5 overflow-x-auto scrollbar-none text-[11px] text-slate-400">
                  <span className="shrink-0 flex items-center gap-1 text-[10px] font-semibold text-slate-400 uppercase">
                    <Users className="w-3 h-3" /> Switch:
                  </span>
                  {savedAccounts.map((acc, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectAccount(acc)}
                      className={`px-2 py-0.5 rounded-lg border text-[11px] transition-all shrink-0 ${
                        email === (acc.identifier || acc.username || acc.email)
                          ? 'bg-brand-500/20 border-brand-500/40 text-brand-300 font-semibold'
                          : 'bg-surface-800 border-white/5 hover:border-white/20 text-slate-300'
                      }`}
                    >
                      {acc.name?.split(' ')[0] || acc.username || acc.email}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Success state */}
          {success && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 mb-4 animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <p className="text-sm font-semibold">
                {mode === 'login' ? 'Logged in successfully!' : 'Account created & credentials saved! Welcome to VibeFlow AI 🎉'}
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
              <>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Full name (e.g. Dinay Patil)"
                    autoComplete="name"
                    className="w-full pl-11 pr-4 py-3 bg-surface-850 border border-white/10 rounded-2xl text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/40 transition-all text-white"
                  />
                </div>

                <div className="relative">
                  <span className="text-xs font-bold text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">@</span>
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value.replace(/[@\s]/g, ''))}
                    placeholder="Username (e.g. dinay_vibe)"
                    autoComplete="username"
                    className="w-full pl-11 pr-4 py-3 bg-surface-850 border border-white/10 rounded-2xl text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/40 transition-all text-white"
                  />
                </div>
              </>
            )}

            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type={mode === 'login' ? 'text' : 'email'}
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder={mode === 'login' ? 'Username or email address' : 'Email address (optional if username set)'}
                autoComplete={mode === 'login' ? 'username' : 'email'}
                className="w-full pl-11 pr-4 py-3 bg-surface-850 border border-white/10 rounded-2xl text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/40 transition-all text-white"
              />
            </div>

            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={mode === 'register' ? 'Password (min 6 characters)' : 'Password'}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                className="w-full pl-11 pr-12 py-3 bg-surface-850 border border-white/10 rounded-2xl text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/40 transition-all text-white"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Remember Me / Save Credentials Checkbox */}
            <div className="flex items-center justify-between px-1 py-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded accent-brand-500 cursor-pointer"
                />
                <span className="text-xs text-slate-300 font-medium">
                  {mode === 'login' ? 'Remember credentials on this device' : 'Save sign-up credentials for login'}
                </span>
              </label>

              {mode === 'login' && savedCredentials && (
                <button
                  type="button"
                  onClick={() => handleSelectAccount(savedCredentials)}
                  className="text-[11px] text-brand-400 hover:text-brand-300 font-medium transition-colors"
                >
                  Retrieve saved
                </button>
              )}
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
            <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> Encrypted Credentials</span>
            <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> Auto-retrieved on Login</span>
          </div>

          {/* Toggle mode */}
          <p className="text-center text-sm text-slate-400 mt-4">
            {mode === 'login' ? (
              <>Don't have an account?{' '}
                <button 
                  onClick={() => { 
                    setMode('register'); 
                    setLocalError(null); 
                    clearAuthError(); 
                  }} 
                  className="text-brand-400 hover:text-brand-300 font-semibold transition-colors"
                >
                  Create one free
                </button>
              </>
            ) : (
              <>Already have an account?{' '}
                <button 
                  onClick={() => { 
                    setMode('login'); 
                    setLocalError(null); 
                    clearAuthError(); 
                  }} 
                  className="text-brand-400 hover:text-brand-300 font-semibold transition-colors"
                >
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
