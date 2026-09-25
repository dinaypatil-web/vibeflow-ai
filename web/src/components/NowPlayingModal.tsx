import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
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
  Moon, 
  Sparkles, 
  ListMusic, 
  FileText, 
  Sliders, 
  Share2, 
  Check, 
  DownloadCloud,
  Youtube,
  HardDrive,
  Plus,
  Video
} from 'lucide-react';
import { usePlayerStore } from '../store/playerStore';
import { globalAudioAnalyser } from './AudioEngine';
import { api } from '../services/api';
import { MediaItem } from '../types';

interface NowPlayingModalProps {
  onAddToPlaylist?: (track: MediaItem) => void;
}

export const NowPlayingModal: React.FC<NowPlayingModalProps> = ({ onAddToPlaylist }) => {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    playbackSpeed,
    repeatMode,
    isShuffle,
    favorites,
    isNowPlayingOpen,
    queue,
    sleepTimerMinutes,
    sleepTimerRemainingSeconds,
    togglePlay,
    nextTrack,
    previousTrack,
    seekTo,
    setVolume,
    toggleMute,
    setPlaybackSpeed,
    cycleRepeatMode,
    toggleShuffle,
    toggleFavorite,
    setNowPlayingOpen,
    setSleepTimer,
    playTrack
  } = usePlayerStore();

  const [activeTab, setActiveTab] = useState<'visualizer' | 'video' | 'lyrics' | 'queue'>('visualizer');
  const [showSleepModal, setShowSleepModal] = useState(false);
  const [similarTracks, setSimilarTracks] = useState<any[]>([]);
  const [similarReason, setSimilarReason] = useState<string>('');
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Fetch similar tracks on load
  useEffect(() => {
    if (!currentTrack) return;
    setLoadingSimilar(true);
    api.getSimilar(currentTrack.id, 4).then(res => {
      setSimilarTracks(res.similar || []);
      setSimilarReason(res.reason || '');
      setLoadingSimilar(false);
    }).catch(() => setLoadingSimilar(false));
  }, [currentTrack]);

  // Audio Canvas visualizer loop
  useEffect(() => {
    if (!isNowPlayingOpen || activeTab !== 'visualizer') return;

    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dataArray = new Uint8Array(32);

    const render = () => {
      animId = requestAnimationFrame(render);

      if (globalAudioAnalyser && isPlaying) {
        globalAudioAnalyser.getByteFrequencyData(dataArray);
      } else {
        // Fallback pulsing wave if paused or YouTube
        for (let i = 0; i < dataArray.length; i++) {
          dataArray[i] = isPlaying ? Math.floor(Math.sin(Date.now() / 200 + i) * 50 + 70) : 10;
        }
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barWidth = (canvas.width / dataArray.length) * 0.75;
      const gap = 3;

      for (let i = 0; i < dataArray.length; i++) {
        const val = dataArray[i];
        const barHeight = Math.max(4, (val / 255) * canvas.height * 0.9);
        const x = i * (barWidth + gap);
        const y = canvas.height - barHeight;

        // Gradient bar
        const grad = ctx.createLinearGradient(0, canvas.height, 0, 0);
        grad.addColorStop(0, 'rgba(139, 92, 246, 0.4)');
        grad.addColorStop(0.5, 'rgba(6, 182, 212, 0.8)');
        grad.addColorStop(1, 'rgba(236, 72, 153, 0.95)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 4);
        ctx.fill();
      }
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [isNowPlayingOpen, activeTab, isPlaying]);

  if (!isNowPlayingOpen || !currentTrack) return null;

  const isFav = favorites.includes(currentTrack.id);
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const formatTime = (secs: number) => {
    if (!secs || isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const speedOptions = [0.75, 1.0, 1.25, 1.5, 2.0];

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-surface-950/80 backdrop-blur-3xl animate-in fade-in duration-300">
      <div className="relative w-full max-w-4xl max-h-[92vh] bg-surface-900/90 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-xs uppercase tracking-widest font-semibold text-slate-400">
              Now Playing • {currentTrack.provider.toUpperCase()}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Tab switchers */}
            <div className="flex items-center bg-surface-800 rounded-xl p-1 border border-white/5 text-xs">
              <button
                onClick={() => setActiveTab('visualizer')}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  activeTab === 'visualizer' ? 'bg-brand-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                Visualizer
              </button>
              {currentTrack.provider === 'youtube' && (
                <button
                  onClick={() => setActiveTab('video')}
                  className={`px-3 py-1 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                    activeTab === 'video' ? 'bg-red-600 text-white shadow-xs font-semibold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>Video</span>
                </button>
              )}
              <button
                onClick={() => setActiveTab('lyrics')}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  activeTab === 'lyrics' ? 'bg-brand-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                Lyrics & Insights
              </button>
              <button
                onClick={() => setActiveTab('queue')}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  activeTab === 'queue' ? 'bg-brand-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                Queue ({queue.length})
              </button>
            </div>

            {/* Add to Playlist button */}
            {onAddToPlaylist && (
              <button
                onClick={() => onAddToPlaylist(currentTrack)}
                className="p-2 rounded-xl bg-surface-800 hover:bg-surface-750 text-slate-400 hover:text-white transition-colors border border-white/5 flex items-center gap-1 text-xs"
                title="Add to Playlist"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Playlist</span>
              </button>
            )}

            {/* Share button */}
            <button
              onClick={handleShare}
              className="p-2 rounded-xl bg-surface-800 hover:bg-surface-750 text-slate-400 hover:text-white transition-colors border border-white/5"
              title="Share Track"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
            </button>

            {/* Close */}
            <button
              onClick={() => setNowPlayingOpen(false)}
              className="p-2 rounded-xl bg-surface-800 hover:bg-surface-750 text-slate-400 hover:text-white transition-colors border border-white/5"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 flex flex-col md:flex-row items-center gap-8">
          {/* Left: Vinyl Disc Art & Visualizer OR HD Video Stream */}
          <div className="w-full md:w-1/2 flex flex-col items-center">
            {activeTab === 'video' && currentTrack.provider === 'youtube' ? (
              <div className="w-full max-w-md sm:max-w-lg aspect-video rounded-2xl overflow-hidden shadow-2xl border border-white/10 mb-6 bg-black flex items-center justify-center">
                <iframe
                  src={`https://www.youtube.com/embed/${currentTrack.providerId}?autoplay=1&controls=1&rel=0&modestbranding=1`}
                  title={currentTrack.title}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : (
              <>
                {/* Spinning Vinyl Record Container */}
                <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center mb-6">
                  {/* Vinyl Groove Rings */}
                  <div 
                    className={`w-full h-full rounded-full bg-surface-950 border-4 border-slate-800 shadow-2xl flex items-center justify-center p-4 ring-8 ring-white/5 ${
                      isPlaying ? 'animate-spin-slow' : ''
                    }`}
                  >
                    {/* Vinyl Grooves pattern */}
                    <div className="w-full h-full rounded-full border border-white/10 flex items-center justify-center p-6 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-surface-800 via-surface-900 to-black">
                      <div className="w-full h-full rounded-full border border-white/5 flex items-center justify-center p-6">
                        {/* Inner Track Cover Album */}
                        <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden shadow-inner ring-4 ring-brand-500/40">
                          <img
                            src={currentTrack.thumbnail}
                            alt={currentTrack.title}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-radial from-transparent to-black/30" />
                          <div className="absolute center-center w-6 h-6 rounded-full bg-surface-900 border-2 border-white/20 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Glowing Aura behind vinyl */}
                  <div className="absolute -inset-4 bg-gradient-to-tr from-brand-600/30 to-accent-cyan/20 rounded-full blur-2xl -z-10 animate-pulse-glow" />
                </div>

                {/* Dynamic Audio Visualizer Canvas */}
                <div className="w-full max-w-xs h-16 rounded-xl bg-surface-850/60 p-2 border border-white/5 flex items-center justify-center">
                  <canvas ref={canvasRef} width={260} height={48} className="w-full h-full" />
                </div>
              </>
            )}
          </div>

          {/* Right: Track Information, Controls, and Tab Details */}
          <div className="w-full md:w-1/2 flex flex-col justify-between space-y-6">
            {(activeTab === 'visualizer' || activeTab === 'video') && (
              <div className="space-y-4">
                {/* AI Classification & Mood Tags */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30 text-xs font-semibold flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    <span>{currentTrack.genre}</span>
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-medium">
                    {currentTrack.mood}
                  </span>
                  {currentTrack.confidenceScore && (
                    <span className="px-2 py-0.5 rounded-full bg-surface-800 text-slate-400 text-[11px] font-mono">
                      AI Confidence: {Math.round(currentTrack.confidenceScore * 100)}%
                    </span>
                  )}
                </div>

                {/* Track Titles */}
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-snug">
                    {currentTrack.title}
                  </h2>
                  <p className="text-base text-slate-400 font-medium mt-1">
                    {currentTrack.artist} {currentTrack.album ? `• ${currentTrack.album}` : ''}
                  </p>
                </div>

                {/* AI Recommendation Reason */}
                <div className="p-3.5 rounded-2xl bg-surface-850/80 border border-brand-500/20 shadow-inner">
                  <div className="flex items-center gap-2 text-xs font-semibold text-brand-300 mb-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Why VibeFlow AI recommends this</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {similarReason || `Curated for your affinity with ${currentTrack.genre} and ${currentTrack.mood} rhythms.`}
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'lyrics' && (
              <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <FileText className="w-4 h-4 text-brand-400" />
                  <span>Lyrics & Spoken Transcript</span>
                </div>
                {currentTrack.lyrics ? (
                  <p className="text-sm text-slate-200 leading-relaxed font-sans whitespace-pre-line bg-surface-850 p-4 rounded-xl border border-white/5">
                    {currentTrack.lyrics}
                  </p>
                ) : (
                  <div className="p-4 rounded-xl bg-surface-850 text-center border border-white/5">
                    <p className="text-sm text-slate-400">Pure instrumental piece with natural acoustic harmonics.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'queue' && (
              <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <span>Up Next ({queue.length})</span>
                  <span className="text-[11px] text-brand-400 font-normal">Click to play</span>
                </div>
                <div className="space-y-1.5">
                  {queue.map((track, idx) => {
                    const isCurr = track.id === currentTrack.id;
                    return (
                      <div
                        key={`${track.id}-${idx}`}
                        onClick={() => playTrack(track)}
                        className={`flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-all ${
                          isCurr ? 'bg-brand-600/30 border border-brand-500/40 text-white' : 'hover:bg-surface-800 text-slate-300'
                        }`}
                      >
                        <span className="text-xs font-mono text-slate-500 w-4 text-center">{idx + 1}</span>
                        <img src={track.thumbnail} alt="" className="w-8 h-8 rounded object-cover" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold truncate">{track.title}</p>
                          <p className="text-[11px] text-slate-400 truncate">{track.artist}</p>
                        </div>
                        <span className="text-[11px] text-slate-400">{formatTime(track.duration)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Playback Progress Timeline */}
            <div className="space-y-2">
              <div 
                className="w-full h-2 bg-surface-750 rounded-full cursor-pointer relative group"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                  seekTo(ratio * duration);
                }}
              >
                <div
                  className="h-full bg-gradient-to-r from-brand-500 via-accent-cyan to-brand-400 rounded-full relative"
                  style={{ width: `${progressPercent}%` }}
                >
                  <div className="w-3.5 h-3.5 rounded-full bg-white shadow-md absolute right-0 top-1/2 -translate-y-1/2 group-hover:scale-125 transition-transform" />
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Main Interactive Controls */}
            <div className="flex items-center justify-between pt-2">
              {/* Shuffle */}
              <button
                onClick={toggleShuffle}
                className={`p-2.5 rounded-xl hover:bg-surface-800 transition-colors ${
                  isShuffle ? 'text-brand-400' : 'text-slate-400 hover:text-white'
                }`}
                title="Shuffle"
              >
                <Shuffle className="w-5 h-5" />
              </button>

              {/* Previous */}
              <button
                onClick={previousTrack}
                className="p-2.5 text-slate-300 hover:text-white hover:bg-surface-800 rounded-xl transition-colors"
                title="Previous"
              >
                <SkipBack className="w-6 h-6 fill-current" />
              </button>

              {/* Play / Pause Giant Button */}
              <button
                onClick={togglePlay}
                className="w-14 h-14 rounded-full bg-gradient-to-tr from-brand-600 via-brand-500 to-accent-cyan text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl shadow-brand-500/35"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <Pause className="w-7 h-7 fill-current" />
                ) : (
                  <Play className="w-7 h-7 fill-current translate-x-0.5" />
                )}
              </button>

              {/* Next */}
              <button
                onClick={nextTrack}
                className="p-2.5 text-slate-300 hover:text-white hover:bg-surface-800 rounded-xl transition-colors"
                title="Next"
              >
                <SkipForward className="w-6 h-6 fill-current" />
              </button>

              {/* Repeat Mode */}
              <button
                onClick={cycleRepeatMode}
                className={`p-2.5 rounded-xl hover:bg-surface-800 transition-colors ${
                  repeatMode !== 'off' ? 'text-brand-400' : 'text-slate-400 hover:text-white'
                }`}
                title={`Repeat: ${repeatMode}`}
              >
                {repeatMode === 'one' ? <Repeat1 className="w-5 h-5" /> : <Repeat className="w-5 h-5" />}
              </button>
            </div>

            {/* Bottom Accessories (Speed, Sleep Timer, Favorites) */}
            <div className="flex items-center justify-between pt-4 border-t border-white/5 text-xs text-slate-400">
              {/* Speed Controller */}
              <div className="flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-slate-400" />
                <span>Speed:</span>
                <div className="flex items-center bg-surface-800 rounded-lg p-0.5 border border-white/5">
                  {speedOptions.map(spd => (
                    <button
                      key={spd}
                      onClick={() => setPlaybackSpeed(spd)}
                      className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                        playbackSpeed === spd ? 'bg-brand-600 text-white font-bold' : 'hover:text-white'
                      }`}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Sleep timer & Favorite buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowSleepModal(!showSleepModal)}
                  className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 font-medium transition-all ${
                    sleepTimerRemainingSeconds !== null
                      ? 'bg-cyan-950/80 text-accent-cyan border border-cyan-500/40'
                      : 'bg-surface-800 text-slate-400 hover:text-white border border-white/5'
                  }`}
                >
                  <Moon className="w-3.5 h-3.5" />
                  <span>
                    {sleepTimerRemainingSeconds !== null 
                      ? `${Math.floor(sleepTimerRemainingSeconds / 60)}m left` 
                      : 'Sleep Timer'}
                  </span>
                </button>

                <button
                  onClick={() => toggleFavorite(currentTrack.id)}
                  className={`p-2 rounded-xl bg-surface-800 hover:bg-surface-750 transition-colors border border-white/5 ${
                    isFav ? 'text-accent-rose' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Favorite"
                >
                  <Heart className={`w-4 h-4 ${isFav ? 'fill-accent-rose' : ''}`} />
                </button>
              </div>
            </div>

            {/* Sleep Timer Preset Selector Dialog */}
            {showSleepModal && (
              <div className="p-3 bg-surface-800 border border-white/10 rounded-2xl flex items-center justify-between gap-2 animate-in fade-in zoom-in-95">
                <span className="text-xs font-semibold text-slate-300">Set Sleep Timer:</span>
                <div className="flex items-center gap-1">
                  {[15, 30, 45, 60].map(mins => (
                    <button
                      key={mins}
                      onClick={() => {
                        setSleepTimer(mins);
                        setShowSleepModal(false);
                      }}
                      className="px-2.5 py-1 bg-surface-750 hover:bg-brand-600 hover:text-white text-xs rounded-lg text-slate-300 transition-colors font-mono"
                    >
                      {mins}m
                    </button>
                  ))}
                  {sleepTimerRemainingSeconds !== null && (
                    <button
                      onClick={() => {
                        setSleepTimer(null);
                        setShowSleepModal(false);
                      }}
                      className="px-2.5 py-1 bg-rose-950/70 hover:bg-rose-900 text-rose-300 text-xs rounded-lg transition-colors"
                    >
                      Off
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
