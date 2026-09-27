import React, { useEffect, useState } from 'react';
import { 
  Sparkles, 
  Flame, 
  Radio, 
  Compass, 
  ChevronRight, 
  Play, 
  TrendingUp, 
  Zap,
  ArrowRight,
  Headphones,
  Sliders,
  Heart
} from 'lucide-react';
import { MediaItem, RecommendationResponse, MoodCategory } from '../types';
import { api } from '../services/api';
import { TrackCard } from '../components/TrackCard';
import { usePlayerStore } from '../store/playerStore';

interface HomeViewProps {
  onSelectMood: (mood: MoodCategory | null) => void;
  onSearchQuery: (query: string) => void;
  onAddToPlaylist?: (track: MediaItem) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ 
  onSelectMood, 
  onSearchQuery,
  onAddToPlaylist 
}) => {
  const [feed, setFeed] = useState<RecommendationResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, playTrack, setNowPlayingOpen, setActiveTab } = usePlayerStore();

  const userPrefKey = JSON.stringify(user?.preferences || {});

  useEffect(() => {
    setLoading(true);
    api.getPersonalizedFeed(user?.id || 'demo-user-id')
      .then(res => {
        setFeed(res);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user?.id, userPrefKey]);

  const quickPrompts = [
    { title: 'Study & Flow', query: 'Suggest peaceful instrumental music for studying', icon: '🧠', gradient: 'from-blue-600 to-indigo-800' },
    { title: 'Workout Power', query: 'Create a 45-minute Marathi Dhol and electronic workout playlist', icon: '⚡', gradient: 'from-amber-600 to-rose-700' },
    { title: 'Golden Retro', query: 'Find timeless Hindi Retro acoustic love classics', icon: '🎙️', gradient: 'from-purple-700 to-pink-700' },
    { title: 'Deep Sleep Drift', query: 'Theta wave ambient soundscapes for deep delta sleep', icon: '🌙', gradient: 'from-cyan-800 to-blue-950' }
  ];

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-300">
      {/* Hero Banner with Dynamic Greeting */}
      <section className="relative overflow-hidden rounded-3xl p-6 sm:p-10 bg-gradient-to-r from-surface-850 via-surface-800 to-brand-950/60 border border-white/10 shadow-2xl">
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 animate-spin-slow" />
            <span>AI Discovery Engine Active</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Discover Your Next <span className="bg-gradient-to-r from-brand-400 via-accent-cyan to-accent-pink bg-clip-text text-transparent">Sonic Flow</span>
          </h2>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            Curated from YouTube, high-fidelity local audio, and royalty-free master streams with automatic mood classification and background playback.
          </p>

          {/* Active preferences pills */}
          {user?.preferences && (user.preferences.favoriteGenres?.length > 0 || user.preferences.favoriteMoods?.length > 0) && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-xs text-brand-300 font-semibold flex items-center gap-1">
                <Heart className="w-3.5 h-3.5 fill-current" />
                <span>Your Active Vibe:</span>
              </span>
              {user.preferences.favoriteGenres?.slice(0, 3).map((g, i) => (
                <span key={i} className="px-2.5 py-0.5 rounded-full bg-brand-500/20 text-brand-200 border border-brand-500/30 text-[11px] font-medium">
                  {g}
                </span>
              ))}
              {user.preferences.favoriteMoods?.slice(0, 2).map((m, i) => (
                <span key={i} className="px-2.5 py-0.5 rounded-full bg-accent-pink/20 text-accent-pink border border-accent-pink/30 text-[11px] font-medium">
                  {m}
                </span>
              ))}
              <button
                onClick={() => setActiveTab('settings')}
                className="text-[11px] text-slate-400 hover:text-white underline underline-offset-2 ml-1 transition-colors"
              >
                Change
              </button>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button 
              onClick={() => {
                if (feed.length > 0 && feed[0].items.length > 0) {
                  playTrack(feed[0].items[0], feed[0].items);
                  setNowPlayingOpen(true);
                }
              }}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-brand-600 to-accent-cyan text-white font-bold text-sm flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-brand-500/30"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Start Daily Vibe Mix</span>
            </button>
            <button 
              onClick={() => setActiveTab('settings')}
              className="px-5 py-3 rounded-2xl bg-surface-750/80 hover:bg-surface-700 text-slate-200 border border-white/10 font-semibold text-sm flex items-center gap-2 transition-all"
            >
              <Sliders className="w-4 h-4 text-brand-400" />
              <span>Tune Preferences</span>
            </button>
            <button 
              onClick={() => onSelectMood('Workout & Energy')}
              className="px-5 py-3 rounded-2xl bg-surface-750/80 hover:bg-surface-700 text-slate-200 border border-white/10 font-semibold text-sm flex items-center gap-2 transition-all"
            >
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Workout Mode</span>
            </button>
          </div>
        </div>

        {/* Ambient background glow orb */}
        <div className="absolute -right-16 -top-16 w-80 h-80 rounded-full bg-brand-500/20 blur-3xl pointer-events-none" />
        <div className="absolute right-32 -bottom-20 w-64 h-64 rounded-full bg-accent-cyan/15 blur-3xl pointer-events-none" />
      </section>

      {/* Quick AI Prompt Pills */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand-400" />
            <h3 className="text-base font-bold text-slate-200">Ask AI in Natural Language</h3>
          </div>
          <span className="text-xs text-slate-400">Click to explore instant prompts</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {quickPrompts.map((p, idx) => (
            <div
              key={idx}
              onClick={() => onSearchQuery(p.query)}
              className="p-4 rounded-2xl bg-surface-850 hover:bg-surface-800 border border-white/5 hover:border-brand-500/30 cursor-pointer transition-all duration-200 group flex items-start gap-3 shadow-sm hover:shadow-lg"
            >
              <div className="text-2xl p-2 rounded-xl bg-surface-800 group-hover:scale-110 transition-transform">
                {p.icon}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-bold text-white group-hover:text-brand-300 transition-colors">
                  {p.title}
                </h4>
                <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">
                  "{p.query}"
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Render Recommendation Sections from AI Engine */}
      {loading ? (
        <div className="space-y-6 animate-pulse">
          <div className="h-6 w-48 bg-surface-800 rounded-lg" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="aspect-square bg-surface-800 rounded-2xl" />
            ))}
          </div>
        </div>
      ) : (
        feed.map((section, sIdx) => (
          <section key={sIdx} className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                  <span>{section.sectionTitle}</span>
                  {sIdx === 0 && <span className="text-xs px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-300 font-normal">AI Tailored</span>}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">{section.description}</p>
                {section.reason && (
                  <p className="text-[11px] text-brand-400/90 font-medium mt-1 flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 shrink-0" />
                    <span>{section.reason}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Track Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {section.items.map(track => (
                <TrackCard 
                  key={track.id} 
                  track={track} 
                  queueContext={section.items}
                  onAddToPlaylist={onAddToPlaylist}
                />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
};
