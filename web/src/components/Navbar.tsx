import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, 
  Sparkles, 
  Moon, 
  Sun,
  Zap,
  Bell, 
  User, 
  Clock, 
  SlidersHorizontal,
  ChevronRight,
  ChevronDown,
  Layers,
  LogOut,
  CheckCircle2,
  ListMusic,
  Settings as SettingsIcon
} from 'lucide-react';
import { usePlayerStore, TabType } from '../store/playerStore';
import { MoodCategory, AppTheme } from '../types';

interface NavbarProps {
  onSearchSubmit?: (query: string) => void;
  selectedMood?: MoodCategory | null;
  onSelectMood?: (mood: MoodCategory | null) => void;
  onOpenImportUrl?: () => void;
  onOpenAuth?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  onSearchSubmit, 
  selectedMood, 
  onSelectMood,
  onOpenImportUrl,
  onOpenAuth
}) => {
  const [searchInput, setSearchInput] = useState('');
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const { 
    activeTab, 
    setActiveTab, 
    sleepTimerRemainingSeconds,
    theme,
    setTheme, 
    setNowPlayingOpen,
    currentTrack,
    user,
    logout
  } = usePlayerStore();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    if (isProfileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isProfileMenuOpen]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchInput.trim()) {
      if (onSearchSubmit) {
        onSearchSubmit(searchInput.trim());
      }
      setActiveTab('search');
    }
  };

  const moods: MoodCategory[] = [
    'Uplifting & Happy',
    'Calm & Peaceful',
    'Focus & Study',
    'Workout & Energy',
    'Romantic',
    'Nostalgic',
    'Spiritual & Devotional',
    'Sleep & Relaxation',
    'Party & Dance'
  ];

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <header className="sticky top-0 z-30 bg-surface-900/90 backdrop-blur-xl border-b border-white/5 px-4 md:px-8 py-3.5 space-y-3">
      <div className="flex items-center justify-between gap-3">
        {/* Mobile brand title */}
        <div className="flex md:hidden items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-600 to-accent-cyan flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg text-white">VibeFlow</span>
        </div>

        {/* Global Search Bar with Natural Language Support */}
        <div className="flex-1 max-w-2xl relative">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search YouTube, artist, mood, or ask AI ('Hindi workout playlist')..."
              className="w-full pl-10 pr-24 py-2 rounded-xl bg-surface-800/80 border border-white/10 text-sm text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/40 transition-all shadow-inner"
            />
            <button
              onClick={() => {
                if (searchInput.trim()) {
                  if (onSearchSubmit) onSearchSubmit(searchInput.trim());
                  setActiveTab('search');
                }
              }}
              className="absolute right-1.5 px-3 py-1 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1 transition-all shadow-xs"
            >
              <Sparkles className="w-3 h-3" />
              <span>AI Search</span>
            </button>
          </div>
        </div>

        {/* Add URL / Video button */}
        {onOpenImportUrl && (
          <button
            onClick={onOpenImportUrl}
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-accent-cyan hover:opacity-95 text-white text-xs font-bold shadow-md shadow-brand-500/20 shrink-0 transition-all"
            title="Add any YouTube or video file URL"
          >
            <span>+ Add URL / Video</span>
          </button>
        )}

        {/* Top Right Actions */}
        <div className="flex items-center gap-2">
          {/* Active Sleep Timer indicator badge */}
          {sleepTimerRemainingSeconds !== null && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-950/80 border border-indigo-500/40 text-indigo-300 text-xs font-medium animate-pulse">
              <Clock className="w-3.5 h-3.5 text-accent-cyan" />
              <span>{formatTimer(sleepTimerRemainingSeconds)}</span>
            </div>
          )}

          {/* Now Playing shortcut */}
          {currentTrack && (
            <button
              onClick={() => setNowPlayingOpen(true)}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-800 hover:bg-surface-750 border border-white/5 text-xs font-medium text-slate-300 transition-all"
            >
              <Layers className="w-3.5 h-3.5 text-brand-400" />
              <span>Now Playing</span>
            </button>
          )}

          {/* Quick Theme Switcher Button */}
          <button
            onClick={() => {
              const themes: AppTheme[] = ['dark', 'cyberpunk', 'emerald', 'light'];
              const next = themes[(themes.indexOf(theme) + 1) % themes.length];
              setTheme(next);
            }}
            className="w-9 h-9 rounded-xl bg-surface-800 hover:bg-surface-750 border border-white/5 flex items-center justify-center transition-colors"
            title={`Current theme: ${theme.toUpperCase()}. Click to switch theme ambiance.`}
          >
            {theme === 'dark' && <Moon className="w-4 h-4 text-purple-400" />}
            {theme === 'cyberpunk' && <Zap className="w-4 h-4 text-cyan-400" />}
            {theme === 'emerald' && <Sparkles className="w-4 h-4 text-emerald-400" />}
            {theme === 'light' && <Sun className="w-4 h-4 text-amber-500" />}
          </button>

          <button 
            onClick={() => setActiveTab('settings')}
            className="w-9 h-9 rounded-xl bg-surface-800 hover:bg-surface-750 border border-white/5 flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors"
            title="Settings"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>

          {/* User Profile / Auth Button & Dropdown */}
          {user ? (
            <div className="relative" ref={profileMenuRef}>
              <button
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="flex items-center gap-2 p-1 pl-2.5 rounded-xl bg-surface-800 hover:bg-surface-750 border border-white/10 hover:border-brand-500/40 transition-all group"
                title={`Logged in as ${user.name} (${user.email})`}
              >
                <span className="text-xs font-semibold text-slate-200 hidden md:inline max-w-[100px] truncate">
                  {user.name.split(' ')[0]}
                </span>
                <img 
                  src={user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'} 
                  alt="" 
                  className="w-7 h-7 rounded-lg object-cover ring-1 ring-brand-500/40"
                />
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 group-hover:text-slate-200 transition-transform ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Profile Dropdown Menu */}
              {isProfileMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-surface-900 border border-white/10 rounded-2xl shadow-2xl shadow-black/60 p-3 z-50 animate-in fade-in zoom-in-95 duration-200 space-y-2">
                  <div className="p-2.5 rounded-xl bg-surface-850 border border-white/5">
                    <p className="text-xs font-bold text-white truncate">{user.name}</p>
                    <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                    <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-medium mt-1.5">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Cloud Synced Account</span>
                    </div>
                  </div>

                  <div className="space-y-0.5 pt-1">
                    <button
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        onOpenAuth?.();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-surface-800 transition-colors text-left"
                    >
                      <User className="w-3.5 h-3.5 text-brand-400" />
                      <span>Account Profile</span>
                    </button>

                    <button
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        setActiveTab('playlists');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-surface-800 transition-colors text-left"
                    >
                      <ListMusic className="w-3.5 h-3.5 text-accent-cyan" />
                      <span>My Playlists</span>
                    </button>

                    <button
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        setActiveTab('settings');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-surface-800 transition-colors text-left"
                    >
                      <SettingsIcon className="w-3.5 h-3.5 text-slate-400" />
                      <span>Settings & Preferences</span>
                    </button>
                  </div>

                  <div className="pt-1 border-t border-white/5">
                    <button
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-rose-300 hover:text-white bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/20 transition-all text-left"
                    >
                      <LogOut className="w-3.5 h-3.5 text-rose-400" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-brand-600 to-accent-cyan text-white text-xs font-bold shadow-sm shadow-brand-500/20 hover:opacity-95 transition-all"
            >
              <User className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign In</span>
            </button>
          )}
        </div>
      </div>

      {/* Mood Selector horizontal pill rail */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
        <span className="text-slate-400 font-medium shrink-0 flex items-center gap-1 pl-1">
          <Sparkles className="w-3.5 h-3.5 text-brand-400" />
          <span>Moods:</span>
        </span>
        <button
          onClick={() => onSelectMood && onSelectMood(null)}
          className={`shrink-0 px-3 py-1 rounded-full font-medium transition-all ${
            selectedMood === null 
              ? 'bg-white text-surface-900 font-semibold shadow-xs' 
              : 'bg-surface-800 text-slate-300 hover:bg-surface-750 border border-white/5'
          }`}
        >
          All Vibes
        </button>
        {moods.map(mood => {
          const isSelected = selectedMood === mood;
          return (
            <button
              key={mood}
              onClick={() => onSelectMood && onSelectMood(isSelected ? null : mood)}
              className={`shrink-0 px-3 py-1 rounded-full font-medium transition-all ${
                isSelected 
                  ? 'bg-gradient-to-r from-brand-600 to-accent-cyan text-white shadow-sm shadow-brand-500/20' 
                  : 'bg-surface-800 text-slate-300 hover:bg-surface-750 border border-white/5'
              }`}
            >
              {mood}
            </button>
          );
        })}
      </div>
    </header>
  );
};
