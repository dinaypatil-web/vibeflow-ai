import React from 'react';
import { 
  Play, 
  Pause, 
  Heart, 
  Plus, 
  Sparkles, 
  Youtube, 
  HardDrive, 
  Radio, 
  MoreVertical,
  Music2,
  Headphones,
  Waves,
  Globe,
  Download
} from 'lucide-react';
import { MediaItem } from '../types';
import { usePlayerStore } from '../store/playerStore';

interface TrackCardProps {
  track: MediaItem;
  queueContext?: MediaItem[];
  onFindSimilar?: (track: MediaItem) => void;
  onAddToPlaylist?: (track: MediaItem) => void;
}

export const TrackCard: React.FC<TrackCardProps> = ({ 
  track, 
  queueContext, 
  onFindSimilar, 
  onAddToPlaylist 
}) => {
  const { currentTrack, isPlaying, playTrack, togglePlay, favorites, toggleFavorite, openDownloadModal } = usePlayerStore();

  const isCurrent = currentTrack?.id === track.id;
  const isCurrentlyPlaying = isCurrent && isPlaying;
  const isFav = favorites.includes(track.id);

  const formatDuration = (secs: number) => {
    if (!secs) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isCurrent) {
      togglePlay();
    } else {
      playTrack(track, queueContext);
    }
  };

  return (
    <div 
      onClick={handlePlayClick}
      className={`group relative p-3 rounded-2xl glass-card cursor-pointer border transition-all duration-300 ${
        isCurrent 
          ? 'bg-surface-800/90 border-brand-500/40 shadow-lg shadow-brand-500/15 ring-1 ring-brand-500/30' 
          : 'hover:border-brand-500/20'
      }`}
    >
      {/* Artwork with overlay play button */}
      <div className="relative aspect-square w-full rounded-xl overflow-hidden mb-3 bg-surface-850">
        <img 
          src={track.thumbnail} 
          alt={track.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
          loading="lazy"
        />

        {/* Dark overlay with Play button */}
        <div className={`absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center transition-opacity duration-300 ${
          isCurrentlyPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}>
          <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-brand-600 to-accent-cyan text-white flex items-center justify-center shadow-lg shadow-brand-500/50 group-hover:scale-110 active:scale-95 transition-transform">
            {isCurrentlyPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current translate-x-0.5" />
            )}
          </div>
        </div>

        {/* Source Provider badge */}
        <div className="absolute top-2 left-2 flex items-center gap-1">
          {track.provider === 'youtube' && (
            <span className="px-1.5 py-0.5 rounded-md bg-red-600/90 text-white text-[10px] font-bold flex items-center gap-1 shadow-sm">
              <Youtube className="w-3 h-3" />
              <span>YT</span>
            </span>
          )}
          {track.provider === 'jiosaavn' && (
            <span className="px-1.5 py-0.5 rounded-md bg-blue-600/90 text-white text-[10px] font-bold flex items-center gap-1 shadow-sm">
              <Music2 className="w-3 h-3" />
              <span>Saavn</span>
            </span>
          )}
          {track.provider === 'deezer' && (
            <span className="px-1.5 py-0.5 rounded-md text-white text-[10px] font-bold flex items-center gap-1 shadow-sm" style={{backgroundColor:'#A238FF'}}>
              <Headphones className="w-3 h-3" />
              <span>Deezer</span>
            </span>
          )}
          {track.provider === 'spotify' && (
            <span className="px-1.5 py-0.5 rounded-md bg-[#1DB954]/90 text-black text-[10px] font-bold flex items-center gap-1 shadow-sm">
              <Waves className="w-3 h-3" />
              <span>Spotify</span>
            </span>
          )}
          {track.provider === 'soundcloud' && (
            <span className="px-1.5 py-0.5 rounded-md bg-orange-500/90 text-white text-[10px] font-bold flex items-center gap-1 shadow-sm">
              <Globe className="w-3 h-3" />
              <span>SC</span>
            </span>
          )}
          {track.isLocal && (
            <span className="px-1.5 py-0.5 rounded-md bg-accent-cyan/90 text-white text-[10px] font-bold flex items-center gap-1 shadow-sm">
              <HardDrive className="w-3 h-3" />
              <span>Local</span>
            </span>
          )}
        </div>

        {/* Duration badge */}
        <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[10px] font-mono text-slate-300">
          {formatDuration(track.duration)}
        </span>
      </div>

      {/* Meta Info */}
      <div className="space-y-1">
        <h4 className="font-semibold text-sm text-slate-100 truncate group-hover:text-brand-300 transition-colors">
          {track.title}
        </h4>
        <p className="text-xs text-slate-400 truncate">
          {track.artist}
        </p>

        {/* Genre & Mood Pills */}
        <div className="flex items-center gap-1.5 pt-1">
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-surface-750 text-slate-300 truncate">
            {track.genre}
          </span>
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-300 border border-brand-500/20 truncate">
            {track.mood}
          </span>
        </div>

        {/* User Attribution */}
        {track.curatedFor && (
          <div className="flex items-center gap-1 text-[10px] text-brand-300/90 font-medium truncate pt-0.5" title={`Curated for @${track.curatedFor.username || track.curatedFor.name}`}>
            <Sparkles className="w-2.5 h-2.5 shrink-0 text-brand-400" />
            <span className="truncate">Curated for @{track.curatedFor.username || track.curatedFor.name}</span>
          </div>
        )}
        {track.createdBy && !track.curatedFor && (
          <div className="flex items-center gap-1 text-[10px] text-accent-cyan/90 font-medium truncate pt-0.5" title={`Added by @${track.createdBy.username || track.createdBy.name}`}>
            <span className="truncate">Added by @{track.createdBy.username || track.createdBy.name}</span>
          </div>
        )}
      </div>

      {/* Card Action footer (visible on hover) */}
      <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between opacity-80 group-hover:opacity-100 transition-opacity text-slate-400">
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(track.id);
          }}
          className={`p-1.5 rounded-lg hover:bg-surface-750 transition-colors ${
            isFav ? 'text-accent-rose' : 'hover:text-white'
          }`}
          title={isFav ? 'Favorited' : 'Add to favorites'}
        >
          <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-accent-rose' : ''}`} />
        </button>

        {onFindSimilar && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onFindSimilar(track);
            }}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-surface-750 hover:bg-brand-600 hover:text-white text-[11px] font-medium transition-all"
            title="Find similar tracks with AI"
          >
            <Sparkles className="w-3 h-3 text-brand-400 group-hover:text-white" />
            <span>Similar</span>
          </button>
        )}

        <div className="flex items-center gap-1">
          {onAddToPlaylist && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddToPlaylist(track);
              }}
              className="p-1.5 rounded-lg hover:bg-surface-750 hover:text-white transition-colors"
              title="Add to playlist"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              openDownloadModal(track);
            }}
            className="p-1.5 rounded-lg hover:bg-brand-500/20 text-slate-400 hover:text-brand-300 transition-colors"
            title="Download MP3 for offline playback"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
