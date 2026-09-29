import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Search, X, Play, Pause, Plus, Heart, Music, Disc3, Radio,
  Tv2, ArrowLeft, Sparkles, ChevronRight, Youtube, Music2,
  Headphones, Waves, Globe, Users, ListMusic, Loader2,
  AudioLines, BadgeCheck, HardDrive, Layers, Filter, Check,
} from "lucide-react";
import { MediaItem, Channel, Album, MediaProvider } from "../types";
import { api } from "../services/api";
import { usePlayerStore } from "../store/playerStore";
import { TrackSortControl } from "../components/TrackSortControl";
import { sortMediaItems } from "../utils/trackSort";
import { ALBUM_SORT_OPTIONS, sortAlbums } from "../utils/albumSort";
import { CHANNEL_SORT_OPTIONS, sortChannels } from "../utils/channelSort";

export type SourceFilterId = 'all' | 'youtube' | 'spotify' | 'jiosaavn' | 'deezer' | 'soundcloud' | 'local';

export interface SourceMeta {
  id: SourceFilterId;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  activeClass: string;
  badgeClass: string;
  dotColor: string;
}

export const SOURCES: SourceMeta[] = [
  {
    id: 'all',
    label: 'All Sources',
    shortLabel: 'All',
    icon: Layers,
    color: 'text-brand-300',
    activeClass: 'bg-gradient-to-r from-brand-600 to-accent-cyan text-white shadow-brand-500/25 shadow-md border-transparent',
    badgeClass: 'bg-white/20 text-white',
    dotColor: '#06B6D4',
  },
  {
    id: 'youtube',
    label: 'YouTube',
    shortLabel: 'YouTube',
    icon: Youtube,
    color: 'text-red-400',
    activeClass: 'bg-red-600 text-white shadow-red-500/25 shadow-md border-red-500',
    badgeClass: 'bg-white/20 text-white',
    dotColor: '#EF4444',
  },
  {
    id: 'spotify',
    label: 'Spotify',
    shortLabel: 'Spotify',
    icon: Waves,
    color: 'text-[#1DB954]',
    activeClass: 'bg-[#1DB954] text-black font-bold shadow-[#1DB954]/25 shadow-md border-[#1DB954]',
    badgeClass: 'bg-black/20 text-black',
    dotColor: '#1DB954',
  },
  {
    id: 'jiosaavn',
    label: 'JioSaavn',
    shortLabel: 'JioSaavn',
    icon: Music2,
    color: 'text-blue-400',
    activeClass: 'bg-blue-600 text-white shadow-blue-500/25 shadow-md border-blue-500',
    badgeClass: 'bg-white/20 text-white',
    dotColor: '#3B82F6',
  },
  {
    id: 'deezer',
    label: 'Deezer',
    shortLabel: 'Deezer',
    icon: Headphones,
    color: 'text-purple-300',
    activeClass: 'bg-[#A238FF] text-white shadow-[#A238FF]/25 shadow-md border-[#A238FF]',
    badgeClass: 'bg-white/20 text-white',
    dotColor: '#A238FF',
  },
  {
    id: 'soundcloud',
    label: 'SoundCloud',
    shortLabel: 'SoundCloud',
    icon: Globe,
    color: 'text-orange-400',
    activeClass: 'bg-orange-500 text-white shadow-orange-500/25 shadow-md border-orange-500',
    badgeClass: 'bg-white/20 text-white',
    dotColor: '#F97316',
  },
  {
    id: 'local',
    label: 'Local Library',
    shortLabel: 'Local',
    icon: HardDrive,
    color: 'text-cyan-300',
    activeClass: 'bg-cyan-600 text-white shadow-cyan-500/25 shadow-md border-cyan-500',
    badgeClass: 'bg-white/20 text-white',
    dotColor: '#06B6D4',
  },
];

const matchSource = (item: MediaItem, source: SourceFilterId): boolean => {
  if (source === 'all') return true;
  if (source === 'youtube') return item.provider === 'youtube';
  if (source === 'spotify') return item.provider === 'spotify';
  if (source === 'jiosaavn') return item.provider === 'jiosaavn';
  if (source === 'deezer') return item.provider === 'deezer';
  if (source === 'soundcloud') return item.provider === 'soundcloud' || item.provider === 'jamendo' || item.provider === 'public_domain';
  if (source === 'local') return item.provider === 'local';
  return false;
};

const formatDuration = (secs: number) => {
  if (!secs) return "0:00";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
};

const seeded = (seed: string, max: number) => {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return Math.abs(h) % max;
};

const deriveChannels = (tracks: MediaItem[]): Channel[] => {
  const seen = new Set<string>();
  const out: Channel[] = [];
  for (const t of tracks) {
    if (seen.has(t.artist)) continue;
    seen.add(t.artist);
    out.push({
      id: `ch-${t.id}`, providerId: t.providerId, provider: t.provider,
      name: t.artist, description: `Music channel featuring ${t.genre} tracks`,
      thumbnail: t.thumbnail, subscriberCount: `${seeded(t.artist, 900) + 100}K`,
      videoCount: 60,
      verified: t.provider === "youtube" || t.provider === "jiosaavn",
    });
  }
  return out;
};

const deriveAlbums = (tracks: MediaItem[]): Album[] => {
  const seen = new Set<string>();
  const out: Album[] = [];
  for (const t of tracks) {
    const albumTitle = t.album || `${t.artist} - Best Of`;
    const key = `${t.artist}::${albumTitle}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      id: `alb-${t.id}`, providerId: t.providerId, provider: t.provider,
      title: albumTitle, artist: t.artist, thumbnail: t.thumbnail,
      releaseYear: t.releaseYear || 2023,
      trackCount: seeded(albumTitle, 10) + 4, genre: t.genre,
    });
  }
  return out;
};

const ProviderBadge: React.FC<{ provider: MediaProvider; size?: "sm" | "xs" }> = ({ provider, size = "xs" }) => {
  const cls = size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-1.5 py-0.5 text-[10px]";
  if (provider === "youtube") return <span className={`${cls} rounded-md bg-red-600/90 text-white font-bold flex items-center gap-1`}><Youtube className="w-3 h-3" /><span>YT</span></span>;
  if (provider === "jiosaavn") return <span className={`${cls} rounded-md bg-blue-600/90 text-white font-bold flex items-center gap-1`}><Music2 className="w-3 h-3" /><span>Saavn</span></span>;
  if (provider === "deezer") return <span className={`${cls} rounded-md text-white font-bold flex items-center gap-1`} style={{ backgroundColor: "#A238FF" }}><Headphones className="w-3 h-3" /><span>Deezer</span></span>;
  if (provider === "spotify") return <span className={`${cls} rounded-md bg-[#1DB954]/90 text-black font-bold flex items-center gap-1`}><Waves className="w-3 h-3" /><span>Spotify</span></span>;
  if (provider === "soundcloud") return <span className={`${cls} rounded-md bg-orange-500/90 text-white font-bold flex items-center gap-1`}><Globe className="w-3 h-3" /><span>SC</span></span>;
  if (provider === "local") return <span className={`${cls} rounded-md bg-cyan-700/90 text-white font-bold flex items-center gap-1`}><HardDrive className="w-3 h-3" /><span>Local</span></span>;
  return <span className={`${cls} rounded-md bg-surface-700 text-slate-300 font-bold flex items-center gap-1`}><Radio className="w-3 h-3" /><span>Open</span></span>;
};

const TrackRow: React.FC<{ track: MediaItem; queueContext?: MediaItem[]; onAddToPlaylist?: (t: MediaItem) => void }> = ({ track, queueContext, onAddToPlaylist }) => {
  const { currentTrack, isPlaying, playTrack, togglePlay, favorites, toggleFavorite } = usePlayerStore();
  const isCurrent = currentTrack?.id === track.id;
  const playing = isCurrent && isPlaying;
  const isFav = favorites.includes(track.id);
  const handlePlay = (e: React.MouseEvent) => { e.stopPropagation(); if (isCurrent) togglePlay(); else playTrack(track, queueContext); };
  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer group ${isCurrent ? "bg-brand-500/10 border border-brand-500/30" : "hover:bg-surface-800/60 border border-transparent hover:border-white/5"}`} onClick={handlePlay}>
      <div className="relative shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-surface-850">
        <img src={track.thumbnail} alt={track.title} className="w-full h-full object-cover" loading="lazy" />
        <div className={`absolute inset-0 bg-black/50 flex items-center justify-center transition-opacity ${playing ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-brand-600 to-accent-cyan flex items-center justify-center shadow-lg">
            {playing ? <Pause className="w-3.5 h-3.5 text-white fill-current" /> : <Play className="w-3.5 h-3.5 text-white fill-current translate-x-0.5" />}
          </div>
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold truncate ${isCurrent ? "text-brand-300" : "text-slate-100 group-hover:text-brand-300 transition-colors"}`}>{track.title}</p>
        <p className="text-xs text-slate-400 truncate">{track.artist}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <ProviderBadge provider={track.provider} />
          <span className="text-[10px] text-slate-500">{formatDuration(track.duration)}</span>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button onClick={(e) => { e.stopPropagation(); toggleFavorite(track.id); }} className={`p-2 rounded-lg transition-colors ${isFav ? "text-accent-rose" : "text-slate-500 hover:text-slate-200 hover:bg-surface-750"}`} title="Favorite">
          <Heart className={`w-4 h-4 ${isFav ? "fill-accent-rose" : ""}`} />
        </button>
        {onAddToPlaylist && (
          <button onClick={(e) => { e.stopPropagation(); onAddToPlaylist(track); }} className="p-2 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-surface-750 transition-colors" title="Add to playlist">
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

const ChannelCard: React.FC<{ channel: Channel; onClick: (c: Channel) => void }> = ({ channel, onClick }) => (
  <div onClick={() => onClick(channel)} className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-800/60 border border-transparent hover:border-brand-500/20 cursor-pointer transition-all group">
    <div className="relative shrink-0">
      <img src={channel.thumbnail} alt={channel.name} className="w-14 h-14 rounded-full object-cover ring-2 ring-white/10 group-hover:ring-brand-500/50 transition-all" loading="lazy" />
      {channel.verified && <BadgeCheck className="absolute -bottom-1 -right-1 w-5 h-5 text-brand-400 bg-surface-900 rounded-full p-0.5" />}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-semibold text-slate-100 truncate group-hover:text-brand-300 transition-colors">{channel.name}</p>
      <p className="text-xs text-slate-400 truncate mt-0.5">{channel.description}</p>
      <div className="flex items-center gap-3 mt-1">
        {channel.subscriberCount && <span className="flex items-center gap-1 text-[11px] text-slate-500"><Users className="w-3 h-3" /> {channel.subscriberCount}</span>}
        {channel.videoCount && <span className="flex items-center gap-1 text-[11px] text-slate-500"><ListMusic className="w-3 h-3" /> {channel.videoCount} tracks</span>}
        <ProviderBadge provider={channel.provider} />
      </div>
    </div>
    <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-brand-400 transition-colors shrink-0" />
  </div>
);

const AlbumCard: React.FC<{ album: Album; onClick: (a: Album) => void }> = ({ album, onClick }) => (
  <div onClick={() => onClick(album)} className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-800/60 border border-transparent hover:border-brand-500/20 cursor-pointer transition-all group">
    <div className="relative shrink-0 w-14 h-14 rounded-xl overflow-hidden bg-surface-850">
      <img src={album.thumbnail} alt={album.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-semibold text-slate-100 truncate group-hover:text-brand-300 transition-colors">{album.title}</p>
      <p className="text-xs text-slate-400 truncate">{album.artist}</p>
      <div className="flex items-center gap-3 mt-1">
        {album.releaseYear && <span className="text-[11px] text-slate-500">{album.releaseYear}</span>}
        {album.trackCount && <span className="flex items-center gap-1 text-[11px] text-slate-500"><Music className="w-3 h-3" /> {album.trackCount} tracks</span>}
        <ProviderBadge provider={album.provider} />
      </div>
    </div>
    <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-brand-400 transition-colors shrink-0" />
  </div>
);

const EmptyState: React.FC<{ icon: React.ReactNode; message: string; sub: string }> = ({ icon, message, sub }) => (
  <div className="py-14 flex flex-col items-center text-center space-y-3 bg-surface-850/50 rounded-2xl border border-white/5">
    <div className="text-slate-600">{icon}</div>
    <p className="text-sm font-semibold text-slate-300">{message}</p>
    <p className="text-xs text-slate-500">{sub}</p>
  </div>
);

const ChannelDetailPanel: React.FC<{
  channel: Channel;
  allTracks: MediaItem[];
  onBack: () => void;
  onAddToPlaylist?: (t: MediaItem) => void;
  onTracksDiscovered?: (newTracks: MediaItem[]) => void;
}> = ({ channel, allTracks, onBack, onAddToPlaylist, onTracksDiscovered }) => {
  const { playTrack } = usePlayerStore();
  const [channelTracks, setChannelTracks] = useState<MediaItem[]>(() => {
    return allTracks.filter(t => 
      t.artist.toLowerCase().includes(channel.name.toLowerCase()) || 
      channel.name.toLowerCase().includes(t.artist.toLowerCase())
    );
  });
  const [loadingTracks, setLoadingTracks] = useState(false);
  const [exploredAll, setExploredAll] = useState(false);

  // Automatically explore all available tracks for this channel on mount (up to 60 tracks)
  useEffect(() => {
    let isCancelled = false;
    const targetCount = typeof channel.videoCount === 'number'
      ? channel.videoCount
      : parseInt(String(channel.videoCount || '60').replace(/\D/g, '')) || 60;
    const effectiveTarget = Math.max(targetCount, 60);

    const exploreChannelTracks = async () => {
      setLoadingTracks(true);
      try {
        const fullTracks = await api.getChannelTracks(channel.name, channel.provider, effectiveTarget);
        if (!isCancelled) {
          const map = new Map<string, MediaItem>();
          for (const t of channelTracks) {
            map.set(t.id, t);
          }
          if (fullTracks && fullTracks.length > 0) {
            for (const t of fullTracks) {
              map.set(t.id, t);
            }
          }

          // If still below 60 tracks, query supplementary targeted batches
          if (map.size < effectiveTarget) {
            const moreQueries = [
              `${channel.name} songs`,
              `${channel.name} hits`,
              `${channel.name} official`,
              `${channel.name} music`,
              `${channel.name} top tracks`
            ];
            for (const q of moreQueries) {
              if (map.size >= effectiveTarget) break;
              try {
                const batch = await api.search(q, channel.provider, undefined, undefined, 30);
                for (const b of batch) {
                  map.set(b.id, b);
                  if (map.size >= effectiveTarget) break;
                }
              } catch {}
            }
          }

          const merged = Array.from(map.values());
          setChannelTracks(merged);
          setExploredAll(true);
          onTracksDiscovered?.(merged);
        }
      } catch (err) {
        console.warn('Failed to explore all channel tracks:', err);
      } finally {
        if (!isCancelled) setLoadingTracks(false);
      }
    };

    exploreChannelTracks();

    return () => {
      isCancelled = true;
    };
  }, [channel.name, channel.provider, channel.videoCount]);

  const handleManualExploreMore = async () => {
    setLoadingTracks(true);
    try {
      const moreQueries = [
        `${channel.name} songs`,
        `${channel.name} hits`,
        `${channel.name} official`,
        `${channel.name} playlist`,
        `${channel.name} live`,
        `${channel.name} music`
      ];
      const map = new Map<string, MediaItem>();
      for (const t of channelTracks) map.set(t.id, t);
      for (const q of moreQueries) {
        try {
          const batch = await api.search(q, channel.provider, undefined, undefined, 40);
          for (const t of batch) map.set(t.id, t);
        } catch {}
      }
      const merged = Array.from(map.values());
      setChannelTracks(merged);
      setExploredAll(true);
      onTracksDiscovered?.(merged);
    } catch (e) {
      console.warn('Failed to fetch additional channel tracks:', e);
    } finally {
      setLoadingTracks(false);
    }
  };

  const [sortOption, setSortOption] = useState<string>('default');
  const sortedTracks = useMemo(() => {
    return sortMediaItems(channelTracks, sortOption);
  }, [channelTracks, sortOption]);

  const playAll = () => { if (sortedTracks.length > 0) playTrack(sortedTracks[0], sortedTracks); };
  const effectiveCount = Math.max(
    channel.videoCount ? parseInt(String(channel.videoCount).replace(/\D/g, '')) || 0 : 0,
    channelTracks.length
  );

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-4 group">
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /><span>Back to results</span>
      </button>
      <div className="relative rounded-2xl overflow-hidden mb-5">
        <img src={channel.thumbnail} alt={channel.name} className="w-full h-32 sm:h-44 object-cover blur-sm scale-110" />
        <div className="absolute inset-0 bg-gradient-to-t from-surface-900 via-surface-900/70 to-transparent" />
        <div className="absolute bottom-4 left-4 right-4 flex items-end gap-4">
          <img src={channel.thumbnail} alt={channel.name} className="w-16 h-16 rounded-full object-cover ring-2 ring-brand-500/50 shadow-xl shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white truncate">{channel.name}</h2>
              {channel.verified && <BadgeCheck className="w-5 h-5 text-brand-400 shrink-0" />}
            </div>
            <p className="text-xs text-slate-300 mt-0.5 line-clamp-1">{channel.description}</p>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              {channel.subscriberCount && <span className="flex items-center gap-1 text-xs text-slate-400"><Users className="w-3.5 h-3.5" /> {channel.subscriberCount}</span>}
              <span className="flex items-center gap-1 text-xs text-slate-400"><ListMusic className="w-3.5 h-3.5" /> {channelTracks.length} tracks explored</span>
              <ProviderBadge provider={channel.provider} size="sm" />
            </div>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <button onClick={playAll} disabled={sortedTracks.length === 0} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-brand-600 to-accent-cyan text-white text-sm font-bold rounded-xl shadow-lg hover:brightness-110 disabled:opacity-50 active:scale-95 transition-all">
          <Play className="w-4 h-4 fill-current" /> Play All ({sortedTracks.length})
        </button>
        <button
          onClick={handleManualExploreMore}
          disabled={loadingTracks}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-800 hover:bg-surface-750 border border-white/10 text-xs font-semibold text-slate-200 transition-all"
        >
          {loadingTracks ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-brand-400" />}
          <span>{loadingTracks ? 'Exploring tracks...' : 'Explore More Tracks'}</span>
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
          <AudioLines className="w-4 h-4 text-brand-400" /> All Channel Tracks ({channelTracks.length})
        </h3>
        <div className="flex items-center gap-3">
          {loadingTracks && (
            <span className="flex items-center gap-1.5 text-xs text-brand-400 font-medium animate-pulse">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Retrieving all tracks from {channel.provider}...</span>
            </span>
          )}
          {channelTracks.length > 1 && (
            <TrackSortControl currentSort={sortOption} onSortChange={setSortOption} title="Sort Channel Tracks By" />
          )}
        </div>
      </div>

      {loadingTracks && channelTracks.length === 0 ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-surface-850/50">
              <div className="w-12 h-12 rounded-lg bg-surface-800 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 bg-surface-800 rounded-full w-3/4" />
                <div className="h-3 bg-surface-800 rounded-full w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : sortedTracks.length > 0 ? (
        <div className="space-y-1">
          {sortedTracks.map(t => (
            <TrackRow key={t.id} track={t} queueContext={sortedTracks} onAddToPlaylist={onAddToPlaylist} />
          ))}
        </div>
      ) : (
        <EmptyState icon={<Tv2 className="w-8 h-8" />} message="No tracks for this channel" sub="Try searching for the artist directly" />
      )}
    </div>
  );
};

const AlbumDetailPanel: React.FC<{
  album: Album;
  allTracks: MediaItem[];
  onBack: () => void;
  onAddToPlaylist?: (t: MediaItem) => void;
  onTracksDiscovered?: (newTracks: MediaItem[]) => void;
}> = ({ album, allTracks, onBack, onAddToPlaylist, onTracksDiscovered }) => {
  const { playTrack } = usePlayerStore();
  const [albumTracks, setAlbumTracks] = useState<MediaItem[]>(() => {
    return allTracks.filter(t => 
      (t.album && t.album.toLowerCase().includes(album.title.toLowerCase())) ||
      t.artist.toLowerCase().includes(album.artist.toLowerCase()) || 
      album.artist.toLowerCase().includes(t.artist.toLowerCase())
    );
  });
  const [loadingTracks, setLoadingTracks] = useState(false);
  const [sortOption, setSortOption] = useState<string>('default');

  const sortedTracks = useMemo(() => {
    return sortMediaItems(albumTracks, sortOption);
  }, [albumTracks, sortOption]);

  useEffect(() => {
    let isCancelled = false;
    const fetchAlbumTracks = async () => {
      setLoadingTracks(true);
      try {
        const query = `${album.artist} ${album.title}`;
        const tracks = await api.search(query, album.provider, undefined, undefined, 50);
        if (!isCancelled && tracks && tracks.length > 0) {
          const map = new Map<string, MediaItem>();
          for (const t of tracks) map.set(t.id, t);
          for (const t of albumTracks) if (!map.has(t.id)) map.set(t.id, t);
          const m = Array.from(map.values());
          setAlbumTracks(m);
          onTracksDiscovered?.(m);
        }
      } catch (e) {
        console.warn('Failed to load album tracks:', e);
      } finally {
        if (!isCancelled) setLoadingTracks(false);
      }
    };
    fetchAlbumTracks();
    return () => { isCancelled = true; };
  }, [album.artist, album.title, album.provider]);

  const playAll = () => { if (sortedTracks.length > 0) playTrack(sortedTracks[0], sortedTracks); };
  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-4 group">
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /><span>Back to results</span>
      </button>
      <div className="flex flex-col sm:flex-row items-start gap-5 p-5 rounded-2xl bg-gradient-to-br from-surface-800 to-surface-850 border border-white/5 mb-5 relative overflow-hidden">
        <div className="absolute inset-0 opacity-15 bg-center bg-cover scale-110 blur-xl" style={{ backgroundImage: `url(${album.thumbnail})` }} />
        <div className="relative shrink-0">
          <img src={album.thumbnail} alt={album.title} className="w-28 h-28 rounded-xl object-cover shadow-2xl ring-1 ring-white/10" />
        </div>
        <div className="relative flex-1 min-w-0">
          <p className="text-xs font-semibold text-brand-400 uppercase tracking-wider mb-1">Album</p>
          <h2 className="text-xl font-bold text-white leading-tight">{album.title}</h2>
          <p className="text-sm text-slate-400 mt-1">{album.artist}</p>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            {album.releaseYear && <span className="text-xs text-slate-500">{album.releaseYear}</span>}
            <span className="flex items-center gap-1 text-xs text-slate-500"><Music className="w-3.5 h-3.5" /> {albumTracks.length} tracks</span>
            {album.genre && <span className="text-xs text-slate-500">{album.genre}</span>}
            <ProviderBadge provider={album.provider} size="sm" />
          </div>
        </div>
      </div>
      <div className="flex gap-3 mb-5">
        <button onClick={playAll} disabled={sortedTracks.length === 0} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-brand-600 to-accent-cyan text-white text-sm font-bold rounded-xl shadow-lg hover:brightness-110 disabled:opacity-50 active:scale-95 transition-all">
          <Play className="w-4 h-4 fill-current" /> Play All ({sortedTracks.length})
        </button>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
          <Music className="w-4 h-4 text-brand-400" /> Tracks ({sortedTracks.length})
        </h3>
        <div className="flex items-center gap-3">
          {loadingTracks && (
            <span className="flex items-center gap-1.5 text-xs text-brand-400 font-medium animate-pulse">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Loading album tracks...</span>
            </span>
          )}
          {albumTracks.length > 1 && (
            <TrackSortControl currentSort={sortOption} onSortChange={setSortOption} title="Sort Album Tracks By" />
          )}
        </div>
      </div>
      {sortedTracks.length > 0 ? (
        <div className="space-y-1">{sortedTracks.map(t => <TrackRow key={t.id} track={t} queueContext={sortedTracks} onAddToPlaylist={onAddToPlaylist} />)}</div>
      ) : (
        <EmptyState icon={<Disc3 className="w-8 h-8" />} message="No tracks found for this album" sub="Try searching for the artist directly" />
      )}
    </div>
  );
};

type SearchTab = "tracks" | "albums" | "channels";

interface SearchViewProps {
  onAddToPlaylist?: (track: MediaItem) => void;
}

export const SearchView: React.FC<SearchViewProps> = ({ onAddToPlaylist }) => {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<SearchTab>("tracks");
  const [selectedSource, setSelectedSource] = useState<SourceFilterId>("all");
  const [loadingSource, setLoadingSource] = useState<SourceFilterId | null>(null);
  const [tracks, setTracks] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [semanticHint, setSemanticHint] = useState<string | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [sortOption, setSortOption] = useState<string>('default');
  const [albumSortOption, setAlbumSortOption] = useState<string>('default');
  const [channelSortOption, setChannelSortOption] = useState<string>('default');
  const inputRef = useRef<HTMLInputElement>(null);

  // Compute live match count per source
  const sourceCounts = useMemo(() => {
    const counts: Record<SourceFilterId, number> = {
      all: tracks.length,
      youtube: 0,
      spotify: 0,
      jiosaavn: 0,
      deezer: 0,
      soundcloud: 0,
      local: 0,
    };
    for (const t of tracks) {
      for (const s of SOURCES) {
        if (s.id !== 'all' && matchSource(t, s.id)) {
          counts[s.id] = (counts[s.id] || 0) + 1;
        }
      }
    }
    return counts;
  }, [tracks]);

  // Filter items by selected source
  const sourceFilteredTracks = useMemo(() => {
    if (selectedSource === 'all') return tracks;
    return tracks.filter(t => matchSource(t, selectedSource));
  }, [tracks, selectedSource]);

  const sourceFilteredAlbums = useMemo(() => {
    return deriveAlbums(sourceFilteredTracks);
  }, [sourceFilteredTracks]);

  const sourceFilteredChannels = useMemo(() => {
    return deriveChannels(sourceFilteredTracks);
  }, [sourceFilteredTracks]);

  const sortedTracks = useMemo(() => {
    return sortMediaItems(sourceFilteredTracks, sortOption);
  }, [sourceFilteredTracks, sortOption]);

  const sortedAlbums = useMemo(() => {
    return sortAlbums(sourceFilteredAlbums, albumSortOption);
  }, [sourceFilteredAlbums, albumSortOption]);

  const sortedChannels = useMemo(() => {
    return sortChannels(sourceFilteredChannels, channelSortOption);
  }, [sourceFilteredChannels, channelSortOption]);

  const activeSourceMeta = useMemo(() => {
    return SOURCES.find(s => s.id === selectedSource) || SOURCES[0];
  }, [selectedSource]);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const performSearch = useCallback(async (q: string, targetSource?: SourceFilterId) => {
    if (!q.trim()) return;
    const effectiveSource = targetSource !== undefined ? targetSource : selectedSource;
    setLoading(true); setHasSearched(true); setSelectedChannel(null); setSelectedAlbum(null); setSemanticHint(null);
    try {
      let trackResults: MediaItem[] = [];
      if (effectiveSource !== 'all') {
        const prov = effectiveSource === 'soundcloud' ? 'soundcloud' : (effectiveSource as MediaProvider);
        trackResults = await api.search(q.trim(), prov);
      } else {
        trackResults = await api.search(q.trim());
      }
      setTracks(trackResults);
      if (q.trim().split(/\s+/).length >= 3) {
        try {
          const nlp = await api.naturalLanguageSearch(q.trim());
          if (nlp?.parsed?.semanticMatchSummary) setSemanticHint(nlp.parsed.semanticMatchSummary);
        } catch { /* ignore */ }
      }
    } catch (err) { console.error("SearchView error:", err); }
    finally { setLoading(false); }
  }, [selectedSource]);

  const fetchDedicatedProviderResults = useCallback(async (src: SourceFilterId) => {
    if (!query.trim() || src === 'all') return;
    setLoadingSource(src);
    try {
      const providerParam = src === 'soundcloud' ? 'soundcloud' : (src as MediaProvider);
      const newItems = await api.search(query.trim(), providerParam);
      if (newItems.length > 0) {
        setTracks(prev => {
          const map = new Map<string, MediaItem>();
          for (const item of [...newItems, ...prev]) {
            map.set(item.id, item);
          }
          return Array.from(map.values());
        });
      }
    } catch (e) {
      console.error('Failed to fetch provider results:', e);
    } finally {
      setLoadingSource(null);
    }
  }, [query]);

  const handleSourceTabClick = useCallback((src: SourceFilterId) => {
    setSelectedSource(src);
    // If user clicked a source tab that has 0 results in current cache and there's a query, fetch it directly
    if (src !== 'all' && (sourceCounts[src] || 0) === 0 && query.trim()) {
      fetchDedicatedProviderResults(src);
    }
  }, [sourceCounts, query, fetchDedicatedProviderResults]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === "Enter") performSearch(query); };

  const clearSearch = () => {
    setQuery(""); setTracks([]); setSelectedSource("all");
    setSortOption("default"); setAlbumSortOption("default"); setChannelSortOption("default");
    setHasSearched(false); setSemanticHint(null); setSelectedChannel(null); setSelectedAlbum(null);
    inputRef.current?.focus();
  };

  const handleTracksDiscovered = useCallback((newTracks: MediaItem[]) => {
    setTracks(prev => {
      const map = new Map<string, MediaItem>();
      for (const t of [...prev, ...newTracks]) {
        map.set(t.id, t);
      }
      return Array.from(map.values());
    });
  }, []);

  if (selectedChannel) return (
    <div className="pb-4">
      <ChannelDetailPanel
        channel={selectedChannel}
        allTracks={sourceFilteredTracks}
        onBack={() => setSelectedChannel(null)}
        onAddToPlaylist={onAddToPlaylist}
        onTracksDiscovered={handleTracksDiscovered}
      />
    </div>
  );
  if (selectedAlbum) return (
    <div className="pb-4">
      <AlbumDetailPanel
        album={selectedAlbum}
        allTracks={sourceFilteredTracks}
        onBack={() => setSelectedAlbum(null)}
        onAddToPlaylist={onAddToPlaylist}
        onTracksDiscovered={handleTracksDiscovered}
      />
    </div>
  );

  const tabConfig: { id: SearchTab; label: string; icon: React.ReactNode; count: number }[] = [
    { id: "tracks", label: "Tracks", icon: <Music className="w-4 h-4" />, count: sourceFilteredTracks.length },
    { id: "albums", label: "Albums", icon: <Disc3 className="w-4 h-4" />, count: sourceFilteredAlbums.length },
    { id: "channels", label: "Channels", icon: <Tv2 className="w-4 h-4" />, count: sourceFilteredChannels.length },
  ];

  return (
    <div className="space-y-5 pb-4 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Search className="w-5 h-5 text-brand-400" />
          <h2 className="text-xl font-bold text-white tracking-tight">Search</h2>
        </div>
        {hasSearched && (
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: activeSourceMeta.dotColor }} />
            <span className="font-medium text-slate-300">{activeSourceMeta.label}</span>
          </div>
        )}
      </div>

      {/* Main Search Input */}
      <div className="relative">
        <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          ref={inputRef} type="text" value={query}
          onChange={(e) => setQuery(e.target.value)} onKeyDown={handleKeyDown}
          placeholder="Search tracks, albums, artists, or paste Spotify / YouTube link..."
          className="w-full pl-12 pr-28 py-4 rounded-2xl bg-surface-850 border border-white/10 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/40 shadow-inner transition-all"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
          {query && <button onClick={clearSearch} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-surface-750 transition-colors"><X className="w-4 h-4" /></button>}
          <button onClick={() => performSearch(query)} disabled={!query.trim() || loading} className="px-4 py-2 bg-gradient-to-r from-brand-600 to-accent-cyan text-white text-xs font-bold rounded-xl shadow-md hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all flex items-center gap-1.5">
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            <span>Search</span>
          </button>
        </div>
      </div>

      {/* Spotify Link Notice */}
      {query.includes('spotify.com') && (
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#1DB954]/15 border border-[#1DB954]/30 text-xs text-[#1DB954]">
          <Waves className="w-4 h-4 shrink-0" />
          <span className="font-semibold">Spotify Link Detected:</span>
          <span className="text-slate-300">Click Search or press Enter to extract tracks and play!</span>
        </div>
      )}

      {/* AI Semantic Hint */}
      {semanticHint && (
        <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-brand-950/40 border border-brand-500/25 text-xs text-brand-200">
          <Sparkles className="w-4 h-4 text-brand-400 shrink-0 mt-0.5" />
          <div><span className="font-semibold text-white">AI: </span><span>{semanticHint}</span></div>
        </div>
      )}

      {/* Initial Landing State */}
      {!hasSearched && !loading && (
        <div className="py-10 space-y-6">
          {/* Pre-search Source Filter Selectors */}
          <div className="bg-surface-850/60 p-4 rounded-2xl border border-white/5 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 uppercase tracking-wider">
              <Filter className="w-3.5 h-3.5 text-brand-400" />
              <span>Search Source Preference</span>
            </div>
            <p className="text-xs text-slate-400">
              Choose a specific music platform or search across all connected sources at once:
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {SOURCES.map(source => {
                const Icon = source.icon;
                const isSelected = selectedSource === source.id;
                return (
                  <button
                    key={source.id}
                    onClick={() => setSelectedSource(source.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                      isSelected
                        ? `${source.activeClass} shadow-md`
                        : 'bg-surface-800 text-slate-300 hover:bg-surface-750 border-white/5 hover:border-white/10'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isSelected ? '' : source.color}`} />
                    <span>{source.label}</span>
                    {isSelected && <Check className="w-3 h-3 ml-0.5" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="py-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-brand-600/20 to-accent-cyan/20 border border-brand-500/20 flex items-center justify-center mx-auto">
              <Search className="w-8 h-8 text-brand-400 opacity-70" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-200">Find anything</h3>
              <p className="text-sm text-slate-500 mt-1">Search tracks, albums, or channels across Spotify, YouTube, JioSaavn, Deezer & Local</p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 pt-2">
              {["Arijit Singh", "Spotify Hits", "Kesariya", "Lo-Fi Chill", "Daft Punk", "Ed Sheeran"].map(s => (
                <button
                  key={s}
                  onClick={() => {
                    setQuery(s);
                    performSearch(s);
                  }}
                  className="px-3 py-1.5 rounded-full bg-surface-800 border border-white/8 text-xs text-slate-300 hover:bg-surface-750 hover:border-brand-500/30 hover:text-brand-300 transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="space-y-4 animate-pulse">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-9 w-24 rounded-xl bg-surface-800 shrink-0" />
            ))}
          </div>
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-surface-850/50">
              <div className="w-12 h-12 rounded-lg bg-surface-800 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 bg-surface-800 rounded-full w-3/4" />
                <div className="h-3 bg-surface-800 rounded-full w-1/2" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Search Results with Source Tabs */}
      {hasSearched && !loading && (
        <div className="space-y-4">
          {/* Source Filter Tabs Row */}
          <div className="bg-surface-850/70 p-3 rounded-2xl border border-white/5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-brand-400" />
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Filter by Source
                </span>
                <span className="text-[11px] text-slate-500 hidden sm:inline">
                  (Click any source tab to filter results)
                </span>
              </div>
              {selectedSource !== 'all' && (
                <button
                  onClick={() => setSelectedSource('all')}
                  className="text-xs text-brand-400 hover:text-brand-300 font-medium transition-colors flex items-center gap-1"
                >
                  <X className="w-3 h-3" />
                  Show all sources ({tracks.length})
                </button>
              )}
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {SOURCES.map(source => {
                const Icon = source.icon;
                const count = sourceCounts[source.id] || 0;
                const isSelected = selectedSource === source.id;
                const isLoadingThis = loadingSource === source.id;
                return (
                  <button
                    key={source.id}
                    onClick={() => handleSourceTabClick(source.id)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all border ${
                      isSelected
                        ? `${source.activeClass} shadow-md`
                        : 'bg-surface-800/80 hover:bg-surface-750 text-slate-400 hover:text-slate-200 border-white/5 hover:border-white/10'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isSelected ? '' : source.color}`} />
                    <span>{source.label}</span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        isSelected
                          ? source.badgeClass
                          : count > 0
                          ? 'bg-surface-700 text-slate-300'
                          : 'bg-surface-800 text-slate-600'
                      }`}
                    >
                      {isLoadingThis ? <Loader2 className="w-2.5 h-2.5 animate-spin inline" /> : count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sub-Tabs (Tracks / Albums / Channels) and Sort Control */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {tabConfig.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold shrink-0 transition-all ${
                    activeTab === tab.id
                      ? "bg-brand-600 text-white shadow-md shadow-brand-500/30"
                      : "text-slate-400 hover:text-slate-200 hover:bg-surface-800"
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  {tab.count > 0 && (
                    <span
                      className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${
                        activeTab === tab.id ? "bg-white/20" : "bg-surface-750 text-slate-400"
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {activeTab === 'tracks' && sourceFilteredTracks.length > 1 && (
              <TrackSortControl currentSort={sortOption} onSortChange={setSortOption} title="Sort Tracks By" />
            )}
            {activeTab === 'albums' && sourceFilteredAlbums.length > 1 && (
              <TrackSortControl currentSort={albumSortOption} onSortChange={setAlbumSortOption} options={ALBUM_SORT_OPTIONS} title="Sort Albums By" />
            )}
            {activeTab === 'channels' && sourceFilteredChannels.length > 1 && (
              <TrackSortControl currentSort={channelSortOption} onSortChange={setChannelSortOption} options={CHANNEL_SORT_OPTIONS} title="Sort Channels By" />
            )}
          </div>

          {/* Contextual Status Bar */}
          <div className="flex items-center justify-between text-xs text-slate-400 px-3 py-2 bg-surface-850/60 rounded-xl border border-white/5">
            <div className="flex items-center gap-2">
              {selectedSource !== 'all' ? (
                <>
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: activeSourceMeta.dotColor }} />
                  <span>
                    Showing <strong className="text-white">{activeSourceMeta.label}</strong> only: {sourceFilteredTracks.length} tracks, {sourceFilteredAlbums.length} albums, {sourceFilteredChannels.length} channels
                  </span>
                </>
              ) : (
                <span>
                  Found all <strong className="text-white">{tracks.length}</strong> matching tracks across platforms (not limited).
                </span>
              )}
            </div>
            {selectedSource !== 'all' ? (
              <button
                onClick={() => setSelectedSource('all')}
                className="text-brand-400 hover:text-brand-300 font-medium transition-colors ml-2 shrink-0"
              >
                Clear source filter
              </button>
            ) : (
              <span className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider hidden sm:inline">
                Full Results
              </span>
            )}
          </div>

          {/* Empty State for Selected Source */}
          {sourceFilteredTracks.length === 0 && (
            <div className="py-12 flex flex-col items-center text-center space-y-3 bg-surface-850/50 rounded-2xl border border-white/5">
              <div className="w-12 h-12 rounded-full bg-surface-800 flex items-center justify-center text-slate-400">
                <activeSourceMeta.icon className={`w-6 h-6 ${activeSourceMeta.color}`} />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-200">
                  No {activeTab} found from {activeSourceMeta.label} for "{query}"
                </p>
                {selectedSource !== 'all' && tracks.length > 0 && (
                  <p className="text-xs text-slate-400 mt-1">
                    There are {tracks.length} results available on other sources.
                  </p>
                )}
              </div>
              <div className="flex flex-wrap justify-center gap-2 pt-2">
                {selectedSource !== 'all' && (
                  <button
                    onClick={() => fetchDedicatedProviderResults(selectedSource)}
                    disabled={loadingSource === selectedSource}
                    className="px-3.5 py-1.5 rounded-xl bg-surface-800 hover:bg-surface-750 border border-white/10 text-xs text-slate-200 font-medium transition-all flex items-center gap-1.5"
                  >
                    {loadingSource === selectedSource ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-brand-400" />}
                    Search {activeSourceMeta.label} directly
                  </button>
                )}
                {selectedSource !== 'all' && tracks.length > 0 && (
                  <button
                    onClick={() => setSelectedSource('all')}
                    className="px-3.5 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-xs text-white font-medium transition-all"
                  >
                    View all sources ({tracks.length})
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Active Content View */}
          {sourceFilteredTracks.length > 0 && (
            <>
              {activeTab === "tracks" && (
                sortedTracks.length > 0 ? (
                  <div className="space-y-1">
                    {sortedTracks.map(t => (
                      <TrackRow key={t.id} track={t} queueContext={sortedTracks} onAddToPlaylist={onAddToPlaylist} />
                    ))}
                  </div>
                ) : (
                  <EmptyState icon={<Music className="w-8 h-8" />} message="No tracks found" sub="Try a different search term" />
                )
              )}

              {activeTab === "albums" && (
                sortedAlbums.length > 0 ? (
                  <div className="space-y-1">
                    {sortedAlbums.map(a => (
                      <AlbumCard key={a.id} album={a} onClick={setSelectedAlbum} />
                    ))}
                  </div>
                ) : (
                  <EmptyState icon={<Disc3 className="w-8 h-8" />} message="No albums found" sub="Search by album name or artist" />
                )
              )}

              {activeTab === "channels" && (
                sortedChannels.length > 0 ? (
                  <div className="space-y-1">
                    {sortedChannels.map(c => (
                      <ChannelCard key={c.id} channel={c} onClick={setSelectedChannel} />
                    ))}
                  </div>
                ) : (
                  <EmptyState icon={<Tv2 className="w-8 h-8" />} message="No channels found" sub="Search by artist or channel name" />
                )
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};
