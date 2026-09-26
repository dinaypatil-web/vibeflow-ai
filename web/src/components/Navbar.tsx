import React, { useState } from 'react';
import { 
  Search, 
  Sparkles, 
  Moon, 
  Bell, 
  User, 
  Clock, 
  SlidersHorizontal,
  ChevronRight,
  Layers
} from 'lucide-react';
import { usePlayerStore, TabType } from '../store/playerStore';
import { MoodCategory } from '../types';

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
  const { 
    activeTab, 
    setActiveTab, 
    sleepTimerRemainingSeconds, 
    setNowPlayingOpen,
    currentTrack,
    user
  } = usePlayerStore();

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

          <button 
            onClick={() => setActiveTab('settings')}
            className="w-9 h-9 rounded-xl bg-surface-800 hover:bg-surface-750 border border-white/5 flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors"
            title="Settings"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>

          {/* User Profile / Auth Button */}
          {user ? (
            <button
              onClick={() => onOpenAuth ? onOpenAuth() : setActiveTab('settings')}
              className="flex items-center gap-2 p-1 pl-2 rounded-xl bg-surface-800 hover:bg-surface-750 border border-white/10 transition-all group"
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
            </button>
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
