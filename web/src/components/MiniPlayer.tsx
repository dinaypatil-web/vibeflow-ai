import React from 'react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX, 
  Repeat, 
  Repeat1, 
  Shuffle, 
  Heart, 
  Maximize2, 
  Moon, 
  Radio, 
  Sparkles,
  Youtube,
  HardDrive,
  Waves
} from 'lucide-react';
import { usePlayerStore } from '../store/playerStore';

export const MiniPlayer: React.FC = () => {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    repeatMode,
    isShuffle,
    favorites,
    sleepTimerRemainingSeconds,
    togglePlay,
    nextTrack,
    previousTrack,
    seekTo,
    setVolume,
    toggleMute,
    cycleRepeatMode,
    toggleShuffle,
    toggleFavorite,
    setNowPlayingOpen,
    setSleepTimer,
    setSpotifyConnectModalOpen,
    spotifyAccount
  } = usePlayerStore();

  if (!currentTrack) {
    return (
      <footer className="fixed bottom-14 md:bottom-0 left-0 right-0 z-40 bg-surface-900/90 backdrop-blur-xl border-t border-white/5 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-surface-800 flex items-center justify-center text-slate-500">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-400">Ready to play</p>
            <p className="text-xs text-slate-400">Select any track or search with AI above</p>
          </div>
        </div>
      </footer>
    );
  }

  const formatTime = (secs: number) => {
    if (!secs || isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const isFav = favorites.includes(currentTrack.id);
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <footer className="fixed bottom-14 md:bottom-0 left-0 right-0 z-40 bg-surface-850/95 backdrop-blur-2xl border-t border-white/10 shadow-2xl transition-all">
      {/* Top micro progress timeline (seekable) */}
      <div 
        className="w-full h-1.5 bg-surface-750 cursor-pointer relative group"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const clickX = e.clientX - rect.left;
          const ratio = Math.max(0, Math.min(1, clickX / rect.width));
          seekTo(ratio * duration);
        }}
      >
        <div 
          className="h-full bg-gradient-to-r from-brand-500 via-accent-cyan to-brand-400 relative transition-all duration-100"
          style={{ width: `${progressPercent}%` }}
        >
          <div className="opacity-0 group-hover:opacity-100 absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-md shadow-brand-500/50 transition-opacity" />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-4">
        {/* Track Info */}
        <div className="flex items-center gap-3.5 min-w-0 flex-1 max-w-sm">
          <div 
            onClick={() => setNowPlayingOpen(true)}
            className="relative cursor-pointer group shrink-0"
          >
            <img 
              src={currentTrack.thumbnail} 
              alt={currentTrack.title} 
              className="w-12 h-12 rounded-lg object-cover ring-1 ring-white/10 group-hover:brightness-110 transition-all shadow-md"
            />
            {currentTrack.provider === 'youtube' && (
              <span className="absolute -top-1 -right-1 bg-red-600 text-white p-0.5 rounded-full shadow-sm">
                <Youtube className="w-2.5 h-2.5" />
              </span>
            )}
            {currentTrack.provider === 'spotify' && (
              <span className="absolute -top-1 -right-1 bg-[#1DB954] text-black p-0.5 rounded-full shadow-sm">
                <Waves className="w-2.5 h-2.5" />
              </span>
            )}
            {currentTrack.isLocal && (
              <span className="absolute -top-1 -right-1 bg-accent-cyan text-white p-0.5 rounded-full shadow-sm">
                <HardDrive className="w-2.5 h-2.5" />
              </span>
            )}
          </div>

          <div className="min-w-0">
            <h4 
              onClick={() => setNowPlayingOpen(true)}
              className="text-sm font-semibold text-slate-100 truncate cursor-pointer hover:text-brand-300 transition-colors"
            >
              {currentTrack.title}
            </h4>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="truncate">{currentTrack.artist}</span>
              <span>•</span>
              <span className="text-[11px] px-1.5 py-0.2 rounded bg-surface-750 text-brand-300 font-medium truncate">
                {currentTrack.mood}
              </span>
              {currentTrack.provider === 'spotify' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSpotifyConnectModalOpen(true);
                  }}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-[#1DB954]/20 text-[#1DB954] hover:bg-[#1DB954]/30 border border-[#1DB954]/30 font-semibold flex items-center gap-1 transition-colors shrink-0"
                  title={spotifyAccount.connected ? "Spotify Account Connected • Full Track Streaming Active" : "Click to log in to Spotify"}
                >
                  <Waves className="w-2.5 h-2.5" />
                  <span>{spotifyAccount.connected ? 'Spotify' : 'Log in'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Favorite button */}
          <button 
            onClick={() => toggleFavorite(currentTrack.id)}
            className={`p-1.5 rounded-lg hover:bg-surface-750 transition-colors ${
              isFav ? 'text-accent-rose' : 'text-slate-400 hover:text-slate-200'
            }`}
            title={isFav ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Heart className={`w-4 h-4 ${isFav ? 'fill-accent-rose' : ''}`} />
          </button>
        </div>

        {/* Center Playback Controls */}
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-3">
            {/* Shuffle */}
            <button 
              onClick={toggleShuffle}
              className={`p-1.5 rounded-lg hover:bg-surface-750 transition-colors hidden sm:block ${
                isShuffle ? 'text-brand-400' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Shuffle"
            >
              <Shuffle className="w-4 h-4" />
            </button>

            {/* Previous */}
            <button 
              onClick={previousTrack}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-surface-750 rounded-lg transition-colors"
              title="Previous"
            >
              <SkipBack className="w-5 h-5 fill-current" />
            </button>

            {/* Play/Pause */}
            <button 
              onClick={togglePlay}
              className="w-10 h-10 rounded-full bg-gradient-to-tr from-brand-600 to-accent-cyan text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg shadow-brand-500/30"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current translate-x-0.5" />
              )}
            </button>

            {/* Next */}
            <button 
              onClick={nextTrack}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-surface-750 rounded-lg transition-colors"
              title="Next"
            >
              <SkipForward className="w-5 h-5 fill-current" />
            </button>

            {/* Repeat */}
            <button 
              onClick={cycleRepeatMode}
              className={`p-1.5 rounded-lg hover:bg-surface-750 transition-colors hidden sm:block ${
                repeatMode !== 'off' ? 'text-brand-400' : 'text-slate-400 hover:text-slate-200'
              }`}
              title={`Repeat: ${repeatMode}`}
            >
              {repeatMode === 'one' ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
            </button>
          </div>

          {/* Time scrubber text */}
          <div className="hidden md:flex items-center gap-2 text-[11px] text-slate-400 font-mono">
            <span>{formatTime(currentTime)}</span>
            <span>/</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Right Volume & Tools */}
        <div className="flex items-center gap-3">
          {/* Sleep timer quick setting */}
          <button
            onClick={() => {
              if (sleepTimerRemainingSeconds !== null) {
                setSleepTimer(null);
              } else {
                setSleepTimer(30); // Quick 30m sleep timer
              }
            }}
            className={`p-2 rounded-lg hover:bg-surface-750 transition-colors ${
              sleepTimerRemainingSeconds !== null 
                ? 'text-accent-cyan bg-cyan-950/60 border border-cyan-500/30' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title={sleepTimerRemainingSeconds !== null ? 'Cancel sleep timer' : 'Start 30-min sleep timer'}
          >
            <Moon className="w-4 h-4" />
          </button>

          {/* Volume slider (desktop) */}
          <div className="hidden lg:flex items-center gap-2">
            <button 
              onClick={toggleMute}
              className="text-slate-400 hover:text-slate-200 transition-colors"
            >
              {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <input 
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-20 h-1 bg-surface-750 rounded-lg accent-brand-500 cursor-pointer"
            />
          </div>

          {/* Expand to Fullscreen Now Playing */}
          <button 
            onClick={() => setNowPlayingOpen(true)}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-surface-750 rounded-lg transition-colors"
            title="Expand player"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </footer>
  );
};
