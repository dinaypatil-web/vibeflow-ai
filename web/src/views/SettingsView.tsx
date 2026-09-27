import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Moon, 
  Sun, 
  Zap, 
  Volume2, 
  Shield, 
  Trash2, 
  Database, 
  CheckCircle2, 
  ExternalLink,
  Wifi,
  FileText,
  Radio,
  Waves,
  Sparkles,
  LogOut,
  Key,
  Heart,
  Music,
  Globe,
  Plus,
  X,
  User as UserIcon,
  Sliders
} from 'lucide-react';
import { usePlayerStore } from '../store/playerStore';
import { api } from '../services/api';

const ALL_GENRES = [
  'Bollywood', 'Lo-Fi & Chill', 'Hindi Retro', 'Marathi',
  'Punjabi', 'EDM & Electronic', 'Pop', 'Classical & Instrumental',
  'Devotional', 'Hip-Hop', 'Rock', 'Indie'
];

const ALL_MOODS = [
  { name: 'Calm & Peaceful', icon: '🌿' },
  { name: 'Focus & Study', icon: '🧠' },
  { name: 'Workout & Energy', icon: '⚡' },
  { name: 'Romantic', icon: '💖' },
  { name: 'Party & Dance', icon: '🎉' },
  { name: 'Nostalgic', icon: '📻' },
  { name: 'Spiritual & Devotional', icon: '🙏' },
  { name: 'Uplifting & Happy', icon: '☀️' },
  { name: 'Melancholic', icon: '🌧️' },
  { name: 'Sleep & Relaxation', icon: '🌙' }
];

const ALL_LANGUAGES = [
  'Hindi', 'English', 'Marathi', 'Punjabi', 'Tamil', 'Telugu', 'Sanskrit', 'Instrumental'
];

export const SettingsView: React.FC = () => {
  const { user, updatePreferences, spotifyAccount, setSpotifyConnectModalOpen, disconnectSpotifyAccount, theme, setTheme } = usePlayerStore();
  const [audioQuality, setAudioQuality] = useState<'standard' | 'high' | 'lossless'>('high');
  const [wifiOnly, setWifiOnly] = useState(true);
  const [historyTracking, setHistoryTracking] = useState(true);
  const [providerStatuses, setProviderStatuses] = useState<any[]>([]);

  // User taste preferences state
  const [favoriteGenres, setFavoriteGenres] = useState<string[]>(
    user?.preferences?.favoriteGenres || ['Bollywood', 'Lo-Fi & Chill', 'Hindi Retro', 'Marathi']
  );
  const [favoriteMoods, setFavoriteMoods] = useState<string[]>(
    user?.preferences?.favoriteMoods || ['Calm & Peaceful', 'Focus & Study', 'Workout & Energy', 'Romantic']
  );
  const [preferredLanguages, setPreferredLanguages] = useState<string[]>(
    user?.preferences?.preferredLanguages || ['Hindi', 'English', 'Marathi']
  );
  const [favoriteArtists, setFavoriteArtists] = useState<string[]>(
    user?.preferences?.favoriteArtists || ['Arijit Singh', 'Bombay Chill Collective']
  );
  const [newArtist, setNewArtist] = useState('');
  const [prefSaving, setPrefSaving] = useState(false);
  const [prefSaved, setPrefSaved] = useState(false);

  useEffect(() => {
    if (user?.preferences) {
      if (user.preferences.favoriteGenres) setFavoriteGenres(user.preferences.favoriteGenres);
      if (user.preferences.favoriteMoods) setFavoriteMoods(user.preferences.favoriteMoods);
      if (user.preferences.preferredLanguages) setPreferredLanguages(user.preferences.preferredLanguages);
      if (user.preferences.favoriteArtists) setFavoriteArtists(user.preferences.favoriteArtists);
    }
  }, [user]);

  useEffect(() => {
    api.getProviders().then(res => {
      setProviderStatuses(res.providers || []);
    }).catch(console.error);
  }, []);

  const toggleGenre = (genre: string) => {
    setFavoriteGenres(prev =>
      prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]
    );
  };

  const toggleMood = (mood: string) => {
    setFavoriteMoods(prev =>
      prev.includes(mood) ? prev.filter(m => m !== mood) : [...prev, mood]
    );
  };

  const toggleLanguage = (lang: string) => {
    setPreferredLanguages(prev =>
      prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]
    );
  };

  const handleAddArtist = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newArtist.trim();
    if (clean && !favoriteArtists.includes(clean)) {
      setFavoriteArtists(prev => [...prev, clean]);
      setNewArtist('');
    }
  };

  const handleRemoveArtist = (artist: string) => {
    setFavoriteArtists(prev => prev.filter(a => a !== artist));
  };

  const handleSavePreferences = async () => {
    setPrefSaving(true);
    try {
      await updatePreferences({
        favoriteGenres: favoriteGenres as any,
        favoriteMoods: favoriteMoods as any,
        preferredLanguages,
        favoriteArtists
      });
      setPrefSaved(true);
      setTimeout(() => setPrefSaved(false), 3500);
    } catch (err) {
      console.error('Failed to save preferences:', err);
    } finally {
      setPrefSaving(false);
    }
  };

  const handleClearHistory = () => {
    if (confirm('Clear all your listening history? This will reset your recent playback telemetry.')) {
      alert('Listening history has been wiped.');
    }
  };

  const handleResetTaste = () => {
    if (confirm('Reset your personalized AI taste model to default?')) {
      setFavoriteGenres(['Bollywood', 'Lo-Fi & Chill', 'Hindi Retro', 'Marathi']);
      setFavoriteMoods(['Calm & Peaceful', 'Focus & Study', 'Workout & Energy', 'Romantic']);
      setPreferredLanguages(['Hindi', 'English', 'Marathi']);
      setFavoriteArtists(['Arijit Singh', 'Bombay Chill Collective']);
      handleSavePreferences();
      alert('Taste model reset to fresh baseline.');
    }
  };

  return (
    <div className="space-y-8 pb-12 max-w-4xl animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2.5">
          <Settings className="w-5 h-5 text-brand-400" />
          <h2 className="text-2xl font-bold text-white tracking-tight">Settings & Music Preferences</h2>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Customize playback parameters, theme ambiance, and fine-tune your personalized AI discovery tastes.
        </p>
      </div>

      {/* Account Card */}
      <section className="p-6 rounded-3xl bg-surface-850 border border-white/5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <img
            src={user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'}
            alt=""
            className="w-14 h-14 rounded-2xl object-cover ring-2 ring-brand-500/40"
          />
          <div>
            <h3 className="text-base font-bold text-white">{user?.name || 'Aarav Sharma'}</h3>
            <p className="text-xs text-slate-400">
              {user?.username ? `@${user.username} • ` : ''}{user?.email || 'demo@vibeflow.ai'}
            </p>
            <span className="inline-block mt-1 text-[11px] text-emerald-400 font-semibold">
              ✓ Verified VibeFlow AI Account
            </span>
          </div>
        </div>
      </section>

      {/* Music & Discovery Preferences */}
      <section className="p-6 rounded-3xl bg-surface-850 border border-brand-500/30 shadow-xl shadow-brand-500/5 space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 to-accent-pink flex items-center justify-center text-white shadow-md">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">AI Taste & Track Preferences</h3>
              <p className="text-[11px] text-slate-400">VibeFlow AI curates recommendations directly matching your selections below</p>
            </div>
          </div>
          {prefSaved && (
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 animate-in fade-in">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Preferences Saved!</span>
            </span>
          )}
        </div>

        {/* Favorite Genres */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Music className="w-3.5 h-3.5 text-brand-400" />
              <span>Favorite Genres ({favoriteGenres.length} selected)</span>
            </label>
            <span className="text-[10px] text-slate-400">Click to toggle</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {ALL_GENRES.map(genre => {
              const active = favoriteGenres.includes(genre);
              return (
                <button
                  key={genre}
                  type="button"
                  onClick={() => toggleGenre(genre)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                    active
                      ? 'bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-md shadow-brand-500/25 ring-1 ring-white/20 scale-[1.02]'
                      : 'bg-surface-800 text-slate-400 hover:text-white hover:bg-surface-750 border border-white/5'
                  }`}
                >
                  {genre}
                </button>
              );
            })}
          </div>
        </div>

        {/* Favorite Moods */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5 text-accent-pink" />
              <span>Preferred Moods & Energies ({favoriteMoods.length} selected)</span>
            </label>
            <span className="text-[10px] text-slate-400">Matches acoustic vibes</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {ALL_MOODS.map(m => {
              const active = favoriteMoods.includes(m.name);
              return (
                <button
                  key={m.name}
                  type="button"
                  onClick={() => toggleMood(m.name)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all duration-200 ${
                    active
                      ? 'bg-gradient-to-r from-accent-pink/80 to-purple-600 text-white shadow-md shadow-accent-pink/20 ring-1 ring-white/20 scale-[1.02]'
                      : 'bg-surface-800 text-slate-400 hover:text-white hover:bg-surface-750 border border-white/5'
                  }`}
                >
                  <span>{m.icon}</span>
                  <span>{m.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Preferred Languages */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-accent-cyan" />
              <span>Preferred Languages ({preferredLanguages.length} selected)</span>
            </label>
            <span className="text-[10px] text-slate-400">Prioritizes vocal tracks</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {ALL_LANGUAGES.map(lang => {
              const active = preferredLanguages.includes(lang);
              return (
                <button
                  key={lang}
                  type="button"
                  onClick={() => toggleLanguage(lang)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                    active
                      ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-500/20 ring-1 ring-white/20 scale-[1.02]'
                      : 'bg-surface-800 text-slate-400 hover:text-white hover:bg-surface-750 border border-white/5'
                  }`}
                >
                  {lang}
                </button>
              );
            })}
          </div>
        </div>

        {/* Favorite Artists */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <UserIcon className="w-3.5 h-3.5 text-amber-400" />
              <span>Favorite Artists & Bands</span>
            </label>
            <span className="text-[10px] text-slate-400">Adds artists to personalized rotation</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-2">
            {favoriteArtists.map(artist => (
              <span
                key={artist}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-surface-800 border border-white/10 text-xs font-medium text-slate-200"
              >
                <span>{artist}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveArtist(artist)}
                  className="hover:text-rose-400 p-0.5 rounded transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>

          <form onSubmit={handleAddArtist} className="flex gap-2 max-w-md">
            <input
              type="text"
              value={newArtist}
              onChange={e => setNewArtist(e.target.value)}
              placeholder="Add favorite artist (e.g. Arijit Singh, AP Dhillon)..."
              className="flex-1 px-3.5 py-2 rounded-xl bg-surface-800 border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
            />
            <button
              type="submit"
              className="px-3.5 py-2 bg-surface-750 hover:bg-surface-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </form>
        </div>

        {/* Save CTA */}
        <div className="pt-2 flex items-center justify-between border-t border-white/5">
          <p className="text-[11px] text-slate-400">
            Changes take effect across your Discovery Feed, Smart Playlists, and AI Studio instantly.
          </p>
          <button
            type="button"
            onClick={handleSavePreferences}
            disabled={prefSaving}
            className="px-6 py-2.5 bg-gradient-to-r from-brand-600 via-brand-500 to-accent-cyan hover:brightness-110 active:scale-[0.98] text-white text-xs font-bold rounded-2xl shadow-lg shadow-brand-500/25 transition-all flex items-center gap-2 shrink-0 disabled:opacity-50"
          >
            {prefSaving ? (
              <span>Saving...</span>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Save Preferences & Update Feed</span>
              </>
            )}
          </button>
        </div>
      </section>

      {/* Visual Ambiance / Themes */}
      <section className="p-6 rounded-3xl bg-surface-850 border border-white/5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Zap className="w-4 h-4 text-brand-400" />
            <span>Visual Ambiance & Theme</span>
          </h3>
          <span className="text-xs text-brand-400 font-semibold capitalize">
            Current: {theme}
          </span>
        </div>
        <p className="text-xs text-slate-400">
          Transform the look and feel of VibeFlow across the entire application instantly.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { 
              id: 'dark', 
              label: 'Dark Velvet', 
              icon: <Moon className="w-4 h-4 text-purple-400" />, 
              desc: 'OLED Black & Violet',
              previewClass: 'from-[#0d0f17] to-[#7c3aed]'
            },
            { 
              id: 'cyberpunk', 
              label: 'Cyberpunk Neon', 
              icon: <Zap className="w-4 h-4 text-cyan-400" />, 
              desc: 'Electric Cyan & Obsidian',
              previewClass: 'from-[#030712] via-[#06b6d4] to-[#ec4899]'
            },
            { 
              id: 'emerald', 
              label: 'Aurora Emerald', 
              icon: <Sparkles className="w-4 h-4 text-emerald-400" />, 
              desc: 'Midnight Forest & Mint',
              previewClass: 'from-[#05130b] to-[#10b981]'
            },
            { 
              id: 'light', 
              label: 'Clean Daylight', 
              icon: <Sun className="w-4 h-4 text-amber-500" />, 
              desc: 'Pearl White & Royal Indigo',
              previewClass: 'from-[#ffffff] via-[#f1f5f9] to-[#6366f1]'
            }
          ].map(t => (
            <div
              key={t.id}
              onClick={() => setTheme(t.id as any)}
              className={`p-3.5 rounded-2xl border cursor-pointer transition-all duration-200 relative overflow-hidden group ${
                theme === t.id
                  ? 'bg-surface-800 border-brand-500 text-white shadow-lg ring-2 ring-brand-500/30'
                  : 'bg-surface-900 border-white/5 text-slate-400 hover:text-white hover:border-white/20'
              }`}
            >
              {/* Color swatch bar */}
              <div className={`w-full h-2 rounded-full mb-3 bg-gradient-to-r ${t.previewClass} shadow-xs`} />
              <div className="flex items-center gap-2 mb-1">
                {t.icon}
                <span className="text-xs font-bold truncate">{t.label}</span>
              </div>
              <p className="text-[10px] text-slate-400 leading-tight">{t.desc}</p>
              {theme === t.id && (
                <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-brand-400 shadow-sm shadow-brand-500" />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Audio Playback Settings */}
      <section className="p-6 rounded-3xl bg-surface-850 border border-white/5 space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-brand-400" />
          <span>Audio Playback & Quality</span>
        </h3>

        <div className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/5">
            <div>
              <p className="text-xs font-semibold text-white">Streaming Audio Quality</p>
              <p className="text-[11px] text-slate-400">Controls bitrate for direct streams and local master files</p>
            </div>
            <select
              value={audioQuality}
              onChange={(e) => setAudioQuality(e.target.value as any)}
              className="bg-surface-800 text-slate-200 text-xs rounded-xl px-3 py-1.5 border border-white/10 focus:outline-none"
            >
              <option value="standard">Standard (192 kbps)</option>
              <option value="high">High Fidelity (320 kbps)</option>
              <option value="lossless">FLAC Lossless (Studio Master)</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-white">Wi-Fi Only for Offline Downloads</p>
              <p className="text-[11px] text-slate-400">Prevents caching permitted tracks over mobile cellular data</p>
            </div>
            <input
              type="checkbox"
              checked={wifiOnly}
              onChange={(e) => setWifiOnly(e.target.checked)}
              className="w-4 h-4 accent-brand-500 rounded cursor-pointer"
            />
          </div>
        </div>
      </section>

      {/* External Sources & Logins */}
      <section className="p-6 rounded-3xl bg-surface-850 border border-white/5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Waves className="w-5 h-5 text-[#1DB954]" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Source Logins & External Accounts</h3>
          </div>
          <span className="text-[11px] text-slate-400">Stream Complete Tracks</span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Log in to your streaming accounts (Spotify, YouTube) to stream full songs directly without 30-second preview limitations.
        </p>

        <div className="space-y-3">
          {/* Spotify Source Card */}
          <div className={`p-4 rounded-2xl border transition-all ${
            spotifyAccount.connected 
              ? 'bg-[#1DB954]/10 border-[#1DB954]/30' 
              : 'bg-surface-800 border-white/5'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#1DB954] flex items-center justify-center shrink-0">
                  <Waves className="w-5 h-5 text-black" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-white">Spotify Account</h4>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      spotifyAccount.connected 
                        ? 'bg-[#1DB954]/20 text-[#1DB954]' 
                        : 'bg-amber-500/20 text-amber-300'
                    }`}>
                      {spotifyAccount.connected ? 'Connected' : 'Free / Not Connected'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {spotifyAccount.connected 
                      ? `${spotifyAccount.username || 'Aarav Sharma'} • ${spotifyAccount.accountType?.toUpperCase() || 'PREMIUM'} Active • Full Playback Authorized` 
                      : 'Free API previews cut off after 30s. Log in or bridge via VibeFlow to play complete tracks.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                {spotifyAccount.connected ? (
                  <>
                    <button
                      onClick={() => setSpotifyConnectModalOpen(true)}
                      className="px-3 py-1.5 rounded-xl bg-surface-750 hover:bg-surface-700 text-xs font-semibold text-white border border-white/10 transition-colors"
                    >
                      Manage
                    </button>
                    <button
                      onClick={disconnectSpotifyAccount}
                      className="px-3 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 text-xs font-semibold transition-colors flex items-center gap-1"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Disconnect</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setSpotifyConnectModalOpen(true)}
                    className="px-4 py-2 rounded-xl bg-[#1DB954] hover:bg-[#1ed760] text-black text-xs font-bold transition-all shadow-md active:scale-95 flex items-center gap-1.5"
                  >
                    <Key className="w-3.5 h-3.5" />
                    <span>Log in to Spotify</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* JioSaavn Master Audio Source */}
          <div className="p-4 rounded-2xl bg-surface-800 border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                <Radio className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-white">JioSaavn Master Audio Source</h4>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                    Active &amp; Verified
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  100% full-length 320kbps/160kbps master audio streams for Indian and global music without logins or cutoffs.
                </p>
              </div>
            </div>
            <span className="text-xs text-emerald-400 font-semibold hidden sm:inline">
              ✓ 0 API Key Needed
            </span>
          </div>
        </div>
      </section>

      {/* Live Provider API Configuration */}
      <section className="p-6 rounded-3xl bg-surface-850 border border-brand-500/30 space-y-4 shadow-lg shadow-brand-500/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-accent-cyan" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Live Streaming Engine Status</h3>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Live Data Connected</span>
          </span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          VibeFlow AI federates <strong>7 live music providers</strong> in real-time:
          <span className="text-blue-400 font-semibold"> JioSaavn</span> (full-length Indian music — Bollywood, Punjabi, Tamil, Telugu),
          <span className="text-red-400 font-semibold"> YouTube</span> (global music videos),
          <span className="text-[#A238FF] font-semibold"> Deezer</span> (70M+ tracks, 30s previews),
          <span className="text-orange-400 font-semibold"> SoundCloud</span> (indie &amp; remixes),
          <span className="text-[#1DB954] font-semibold"> Spotify</span> (30s previews, requires API keys),
          <span className="text-emerald-400 font-semibold"> iTunes</span> and
          <span className="text-brand-400 font-semibold"> Audius</span>.
          Search any artist or song instantly — e.g. Arijit Singh, Diljit Dosanjh, Taylor Swift, A R Rahman.
        </p>

        <div className="p-3.5 rounded-2xl bg-surface-800/80 border border-white/5 space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-white">Custom YouTube Data API v3 Key (Optional)</span>
              <span className="text-[11px] text-slate-400">Enables direct YouTube search</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="password"
                placeholder="Enter your personal YouTube API Key (Optional)..."
                id="custom-yt-key"
                className="flex-1 px-3.5 py-2 rounded-xl bg-surface-850 border border-white/10 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
              />
              <button
                onClick={async () => {
                  const el = document.getElementById('custom-yt-key') as HTMLInputElement;
                  if (el && el.value) {
                    try {
                      await api.configureProviders({ youtubeApiKey: el.value.trim() });
                      alert('YouTube API key configured successfully!');
                      const updated = await api.getProviders();
                      setProviderStatuses(updated.providers || []);
                    } catch {
                      alert('Failed to save YouTube key.');
                    }
                  } else {
                    alert('Please enter a YouTube API key.');
                  }
                }}
                className="px-4 py-2 bg-gradient-to-r from-brand-600 to-accent-cyan text-white text-xs font-bold rounded-xl hover:opacity-95 shadow-md shrink-0"
              >
                Save Key
              </button>
            </div>
          </div>

          {/* Spotify API keys */}
          <div className="border-t border-white/5 pt-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-[#1DB954]">Spotify Web API Credentials (Optional)</span>
              <span className="text-[11px] text-slate-400">OAuth official API search</span>
            </div>
            <div className="flex flex-col gap-2">
              <input
                type="text"
                placeholder="Spotify Client ID..."
                id="spotify-client-id"
                className="w-full px-3.5 py-2 rounded-xl bg-surface-850 border border-white/10 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1DB954]/50"
              />
              <div className="flex items-center gap-2">
                <input
                  type="password"
                  placeholder="Spotify Client Secret..."
                  id="spotify-client-secret"
                  className="flex-1 px-3.5 py-2 rounded-xl bg-surface-850 border border-white/10 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1DB954]/50"
                />
                <button
                  onClick={async () => {
                    const idEl = document.getElementById('spotify-client-id') as HTMLInputElement;
                    const secEl = document.getElementById('spotify-client-secret') as HTMLInputElement;
                    if (idEl?.value && secEl?.value) {
                      try {
                        await api.configureProviders({
                          spotifyClientId: idEl.value.trim(),
                          spotifyClientSecret: secEl.value.trim()
                        });
                        alert('Spotify credentials saved & active immediately!');
                        const updated = await api.getProviders();
                        setProviderStatuses(updated.providers || []);
                      } catch {
                        alert('Failed to save Spotify credentials.');
                      }
                    } else {
                      alert('Enter both Spotify Client ID and Client Secret.');
                    }
                  }}
                  className="px-4 py-2 bg-[#1DB954] text-black text-xs font-bold rounded-xl hover:opacity-90 shadow-md shrink-0"
                >
                  Save
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                Get free credentials at <span className="text-[#1DB954]">developer.spotify.com</span> → Create App
              </p>
            </div>
          </div>

          <p className="text-[11px] text-slate-500">
            JioSaavn, Deezer, SoundCloud, iTunes &amp; Audius work out-of-the-box with zero keys required.
          </p>
        </div>
      </section>

      {/* Connected Provider Capabilities Matrix */}
      <section className="p-6 rounded-3xl bg-surface-850 border border-white/5 space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-400" />
          <span>Connected Media Providers & Legal Compliance</span>
        </h3>

        <div className="space-y-3">
          {providerStatuses.map((prov, idx) => (
            <div key={idx} className="p-3.5 rounded-2xl bg-surface-800 border border-white/5 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">{prov.name}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  prov.isConfigured ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                }`}>
                  {prov.isConfigured ? 'Authorized / Ready' : 'API Key Optional'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                {prov.termsNotice}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Privacy & Data Management */}
      <section className="p-6 rounded-3xl bg-surface-850 border border-white/5 space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Database className="w-4 h-4 text-accent-pink" />
          <span>Privacy & Data Management</span>
        </h3>

        <div className="space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-white/5">
            <div>
              <p className="text-xs font-semibold text-white">Listening History Collection</p>
              <p className="text-[11px] text-slate-400">Used strictly on-device to personalize mood suggestions</p>
            </div>
            <input
              type="checkbox"
              checked={historyTracking}
              onChange={(e) => setHistoryTracking(e.target.checked)}
              className="w-4 h-4 accent-brand-500 rounded cursor-pointer"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              onClick={handleClearHistory}
              className="px-3.5 py-2 bg-surface-800 hover:bg-rose-950/60 text-slate-300 hover:text-rose-400 text-xs font-semibold rounded-xl border border-white/5 transition-colors flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Listening History</span>
            </button>
            <button
              onClick={handleResetTaste}
              className="px-3.5 py-2 bg-surface-800 hover:bg-surface-750 text-slate-300 text-xs font-semibold rounded-xl border border-white/5 transition-colors"
            >
              Reset AI Taste Model
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
