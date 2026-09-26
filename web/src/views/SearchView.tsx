import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Search, X, Play, Pause, Plus, Heart, Music, Disc3, Radio,
  Tv2, ArrowLeft, Sparkles, ChevronRight, Youtube, Music2,
  Headphones, Waves, Globe, Users, ListMusic, Loader2,
  AudioLines, BadgeCheck,
} from "lucide-react";
import { MediaItem, Channel, Album, MediaProvider } from "../types";
import { api } from "../services/api";
import { usePlayerStore } from "../store/playerStore";
import { TrackSortControl } from "../components/TrackSortControl";
import { sortMediaItems } from "../utils/trackSort";

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
      videoCount: seeded(t.artist + "v", 80) + 10,
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

const ChannelDetailPanel: React.FC<{ channel: Channel; allTracks: MediaItem[]; onBack: () => void; onAddToPlaylist?: (t: MediaItem) => void }> = ({ channel, allTracks, onBack, onAddToPlaylist }) => {
  const { playTrack } = usePlayerStore();
  const channelTracks = allTracks.filter(t => t.artist.toLowerCase().includes(channel.name.toLowerCase()) || channel.name.toLowerCase().includes(t.artist.toLowerCase()));
  const playAll = () => { if (channelTracks.length > 0) playTrack(channelTracks[0], channelTracks); };
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
              {channel.videoCount && <span className="flex items-center gap-1 text-xs text-slate-400"><ListMusic className="w-3.5 h-3.5" /> {channel.videoCount} tracks</span>}
            </div>
          </div>
        </div>
      </div>
      <div className="flex gap-3 mb-5">
        <button onClick={playAll} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-brand-600 to-accent-cyan text-white text-sm font-bold rounded-xl shadow-lg hover:brightness-110 active:scale-95 transition-all">
          <Play className="w-4 h-4 fill-current" /> Play All
        </button>
      </div>
      <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
        <AudioLines className="w-4 h-4 text-brand-400" /> Tracks ({channelTracks.length})
      </h3>
      {channelTracks.length > 0 ? (
        <div className="space-y-1">{channelTracks.map(t => <TrackRow key={t.id} track={t} queueContext={channelTracks} onAddToPlaylist={onAddToPlaylist} />)}</div>
      ) : (
        <EmptyState icon={<Tv2 className="w-8 h-8" />} message="No tracks for this channel" sub="Try searching for the artist directly" />
      )}
    </div>
  );
};

const AlbumDetailPanel: React.FC<{ album: Album; allTracks: MediaItem[]; onBack: () => void; onAddToPlaylist?: (t: MediaItem) => void }> = ({ album, allTracks, onBack, onAddToPlaylist }) => {
  const { playTrack } = usePlayerStore();
  const albumTracks = allTracks.filter(t => t.artist.toLowerCase().includes(album.artist.toLowerCase()) || album.artist.toLowerCase().includes(t.artist.toLowerCase()));
  const playAll = () => { if (albumTracks.length > 0) playTrack(albumTracks[0], albumTracks); };
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
            {album.trackCount && <span className="flex items-center gap-1 text-xs text-slate-500"><Music className="w-3.5 h-3.5" /> {album.trackCount} tracks</span>}
            {album.genre && <span className="text-xs text-slate-500">{album.genre}</span>}
            <ProviderBadge provider={album.provider} size="sm" />
          </div>
        </div>
      </div>
      <div className="flex gap-3 mb-5">
        <button onClick={playAll} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-brand-600 to-accent-cyan text-white text-sm font-bold rounded-xl shadow-lg hover:brightness-110 active:scale-95 transition-all">
          <Play className="w-4 h-4 fill-current" /> Play All
        </button>
      </div>
      <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
        <Music className="w-4 h-4 text-brand-400" /> Tracks ({albumTracks.length})
      </h3>
      {albumTracks.length > 0 ? (
        <div className="space-y-1">{albumTracks.map(t => <TrackRow key={t.id} track={t} queueContext={albumTracks} onAddToPlaylist={onAddToPlaylist} />)}</div>
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
  const [tracks, setTracks] = useState<MediaItem[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [semanticHint, setSemanticHint] = useState<string | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [sortOption, setSortOption] = useState<string>('default');
  const inputRef = useRef<HTMLInputElement>(null);

  const sortedTracks = useMemo(() => {
    return sortMediaItems(tracks, sortOption);
  }, [tracks, sortOption]);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const performSearch = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setLoading(true); setHasSearched(true); setSelectedChannel(null); setSelectedAlbum(null); setSemanticHint(null);
    try {
      const trackResults = await api.search(q.trim());
      setTracks(trackResults); setChannels(deriveChannels(trackResults)); setAlbums(deriveAlbums(trackResults));
      if (q.trim().split(/\s+/).length >= 3) {
        try {
          const nlp = await api.naturalLanguageSearch(q.trim());
          if (nlp?.parsed?.semanticMatchSummary) setSemanticHint(nlp.parsed.semanticMatchSummary);
        } catch { /* ignore */ }
      }
    } catch (err) { console.error("SearchView error:", err); }
    finally { setLoading(false); }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === "Enter") performSearch(query); };

  const clearSearch = () => {
    setQuery(""); setTracks([]); setChannels([]); setAlbums([]);
    setHasSearched(false); setSemanticHint(null); setSelectedChannel(null); setSelectedAlbum(null);
    inputRef.current?.focus();
  };

  if (selectedChannel) return <div className="pb-4"><ChannelDetailPanel channel={selectedChannel} allTracks={tracks} onBack={() => setSelectedChannel(null)} onAddToPlaylist={onAddToPlaylist} /></div>;
  if (selectedAlbum) return <div className="pb-4"><AlbumDetailPanel album={selectedAlbum} allTracks={tracks} onBack={() => setSelectedAlbum(null)} onAddToPlaylist={onAddToPlaylist} /></div>;

  const tabConfig: { id: SearchTab; label: string; icon: React.ReactNode; count: number }[] = [
    { id: "tracks", label: "Tracks", icon: <Music className="w-4 h-4" />, count: tracks.length },
    { id: "albums", label: "Albums", icon: <Disc3 className="w-4 h-4" />, count: albums.length },
    { id: "channels", label: "Channels", icon: <Tv2 className="w-4 h-4" />, count: channels.length },
  ];

  return (
    <div className="space-y-5 pb-4 animate-in fade-in duration-300">
      <div className="flex items-center gap-2">
        <Search className="w-5 h-5 text-brand-400" />
        <h2 className="text-xl font-bold text-white tracking-tight">Search</h2>
      </div>
      <div className="relative">
        <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          ref={inputRef} type="text" value={query}
          onChange={(e) => setQuery(e.target.value)} onKeyDown={handleKeyDown}
          placeholder="Search tracks, albums, channels, artists..."
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
      {semanticHint && (
        <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-brand-950/40 border border-brand-500/25 text-xs text-brand-200">
          <Sparkles className="w-4 h-4 text-brand-400 shrink-0 mt-0.5" />
          <div><span className="font-semibold text-white">AI: </span><span>{semanticHint}</span></div>
        </div>
      )}
      {!hasSearched && !loading && (
        <div className="py-14 text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-brand-600/20 to-accent-cyan/20 border border-brand-500/20 flex items-center justify-center mx-auto">
            <Search className="w-9 h-9 text-brand-400 opacity-70" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-200">Find anything</h3>
            <p className="text-sm text-slate-500 mt-1">Search tracks, albums, or channels across all sources</p>
          </div>
          <div className="flex flex-wrap justify-center gap-2 pt-2">
            {["Arijit Singh", "Lo-Fi Chill", "Bollywood Hits", "Punjabi Party", "Devotional"].map(s => (
              <button key={s} onClick={() => { setQuery(s); performSearch(s); }} className="px-3 py-1.5 rounded-full bg-surface-800 border border-white/8 text-xs text-slate-300 hover:bg-surface-750 hover:border-brand-500/30 hover:text-brand-300 transition-all">{s}</button>
            ))}
          </div>
        </div>
      )}
      {loading && (
        <div className="space-y-3 animate-pulse">
          <div className="flex gap-2">{[1,2,3].map(i => <div key={i} className="h-9 w-24 rounded-xl bg-surface-800" />)}</div>
          {[1,2,3,4,5].map(i => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-surface-850/50">
              <div className="w-12 h-12 rounded-lg bg-surface-800 shrink-0" />
              <div className="flex-1 space-y-2"><div className="h-3.5 bg-surface-800 rounded-full w-3/4" /><div className="h-3 bg-surface-800 rounded-full w-1/2" /></div>
            </div>
          ))}
        </div>
      )}
      {hasSearched && !loading && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {tabConfig.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold shrink-0 transition-all ${activeTab === tab.id ? "bg-brand-600 text-white shadow-md shadow-brand-500/30" : "text-slate-400 hover:text-slate-200 hover:bg-surface-800"}`}>
                  {tab.icon}<span>{tab.label}</span>
                  {tab.count > 0 && <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${activeTab === tab.id ? "bg-white/20" : "bg-surface-750 text-slate-400"}`}>{tab.count}</span>}
                </button>
              ))}
            </div>

            {activeTab === 'tracks' && tracks.length > 1 && (
              <TrackSortControl currentSort={sortOption} onSortChange={setSortOption} />
            )}
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 px-1 py-1 bg-surface-850/60 rounded-xl border border-white/5">
            <span>
              Found all <strong className="text-white">{tracks.length}</strong> matching tracks, <strong className="text-white">{albums.length}</strong> albums, and <strong className="text-white">{channels.length}</strong> channels across platforms (not limited).
            </span>
            <span className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider hidden sm:inline">
              Full Results
            </span>
          </div>

          {activeTab === "tracks" && (sortedTracks.length > 0 ? <div className="space-y-1">{sortedTracks.map(t => <TrackRow key={t.id} track={t} queueContext={sortedTracks} onAddToPlaylist={onAddToPlaylist} />)}</div> : <EmptyState icon={<Music className="w-8 h-8" />} message="No tracks found" sub="Try a different search term" />)}
          {activeTab === "albums" && (albums.length > 0 ? <div className="space-y-1">{albums.map(a => <AlbumCard key={a.id} album={a} onClick={setSelectedAlbum} />)}</div> : <EmptyState icon={<Disc3 className="w-8 h-8" />} message="No albums found" sub="Search by album name or artist" />)}
          {activeTab === "channels" && (channels.length > 0 ? <div className="space-y-1">{channels.map(c => <ChannelCard key={c.id} channel={c} onClick={setSelectedChannel} />)}</div> : <EmptyState icon={<Tv2 className="w-8 h-8" />} message="No channels found" sub="Search by artist or channel name" />)}
        </div>
      )}
    </div>
  );
};
