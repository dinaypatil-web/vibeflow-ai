import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Youtube, 
  HardDrive, 
  Radio, 
  Sparkles, 
  SlidersHorizontal,
  Compass,
  Plus,
  Link as LinkIcon,
  Music2,
  Headphones,
  Waves,
  Globe,
  ArrowUp,
  ArrowDown,
  Shuffle,
  ArrowUpDown,
  LayoutGrid,
  ListOrdered,
  Clock
} from 'lucide-react';
import { MediaItem, MediaProvider, GenreCategory, MoodCategory } from '../types';
import { api } from '../services/api';
import { TrackCard } from '../components/TrackCard';
import { TrackSortControl } from '../components/TrackSortControl';
import { sortMediaItems } from '../utils/trackSort';
import { usePlayerStore } from '../store/playerStore';

interface ExploreViewProps {
  initialQuery?: string;
  initialMood?: MoodCategory | null;
  onAddToPlaylist?: (track: MediaItem) => void;
  onOpenImportUrl?: () => void;
}

export const ExploreView: React.FC<ExploreViewProps> = ({ 
  initialQuery = '', 
  initialMood = null,
  onAddToPlaylist,
  onOpenImportUrl
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [providerFilter, setProviderFilter] = useState<MediaProvider | 'all'>('all');
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [selectedMood, setSelectedMood] = useState<MoodCategory | null>(initialMood);
  const [results, setResults] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [semanticSummary, setSemanticSummary] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState<string>('default');
  const [viewMode, setViewMode] = useState<'grid' | 'sequence'>('grid');

  const { playTrack } = usePlayerStore();

  const sortedResults = useMemo(() => {
    return sortMediaItems(results, sortOption);
  }, [results, sortOption]);

  const handleReverseSequence = () => {
    setResults(prev => [...prev].reverse());
    setSortOption('default');
  };

  const handleShuffleSequence = () => {
    setResults(prev => {
      const arr = [...prev];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    });
    setSortOption('default');
  };

  const handleMoveExploreTrack = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= results.length) return;
    setResults(prev => {
      const arr = [...prev];
      const [moved] = arr.splice(index, 1);
      arr.splice(targetIndex, 0, moved);
      return arr;
    });
    setSortOption('default');
  };

  const formatTrackDuration = (secs: number) => {
    if (!secs || isNaN(secs)) return '0:00';
    const totalSecs = Math.round(secs);
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    if (h > 0) {
      return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    }
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
      handleSearch(initialQuery);
    } else {
      handleSearch('');
    }
  }, [initialQuery]);

  useEffect(() => {
    if (initialMood) {
      setSelectedMood(initialMood);
      handleSearch(query, initialMood);
    }
  }, [initialMood]);

  const handleSearch = async (
    searchTerm: string, 
    moodOverride?: MoodCategory | null,
    providerOverride?: MediaProvider | 'all',
    genreOverride?: string | null
  ) => {
    setLoading(true);
    const activeMood = moodOverride !== undefined ? moodOverride : selectedMood;
    const activeProv = providerOverride !== undefined ? providerOverride : providerFilter;
    const activeGenre = genreOverride !== undefined ? genreOverride : selectedGenre;
    const provParam = activeProv === 'all' ? undefined : activeProv;

    try {
      const res = await api.search(
        searchTerm.trim(), 
        provParam, 
        activeGenre || undefined, 
        activeMood || undefined
      );
      setResults(res);

      // If user typed 4+ words, also query natural language interpreter for AI insight pill
      if (searchTerm.trim().split(/\s+/).length >= 4) {
        try {
          const nlp = await api.naturalLanguageSearch(searchTerm.trim());
          if (nlp?.parsed?.semanticMatchSummary) {
            setSemanticSummary(nlp.parsed.semanticMatchSummary);
          }
        } catch {
          // ignore nlp helper error
        }
      } else {
        setSemanticSummary(null);
      }
    } catch (err) {
      console.error('Search error', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProvider = (p: MediaProvider | 'all') => {
    setProviderFilter(p);
    handleSearch(query, selectedMood, p, selectedGenre);
  };

  const handleSelectGenre = (g: string | null) => {
    setSelectedGenre(g);
    handleSearch(query, selectedMood, providerFilter, g);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch(query);
    }
  };

  const genres: { name: GenreCategory; color: string; desc: string }[] = [
    { name: 'Bollywood', color: 'from-pink-600 to-rose-700', desc: 'Melodic Hindi anthems' },
    { name: 'Hindi Retro', color: 'from-amber-600 to-orange-700', desc: 'Golden era 60s-90s' },
    { name: 'Marathi', color: 'from-orange-600 to-red-700', desc: 'Dhol Tasha & Folk' },
    { name: 'Punjabi', color: 'from-yellow-500 to-amber-700', desc: 'High energy bass beats' },
    { name: 'Lo-Fi & Chill', color: 'from-blue-600 to-indigo-700', desc: 'Midnight calm & study' },
    { name: 'Classical & Instrumental', color: 'from-emerald-600 to-teal-800', desc: 'Sitar, flutes & piano' },
    { name: 'EDM & Electronic', color: 'from-purple-600 to-cyan-600', desc: 'Synthwave & club' },
    { name: 'Devotional', color: 'from-amber-500 to-yellow-600', desc: 'Sacred mantras & chants' },
    { name: 'Podcast & Talks', color: 'from-slate-700 to-slate-900', desc: 'Intellectual discourses' },
  ];

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Search Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Compass className="w-5 h-5 text-brand-400" />
          <h2 className="text-2xl font-bold text-white tracking-tight">Explore & Multi-Source Search</h2>
        </div>

        {/* Search input with trigger */}
        <div className="relative flex items-center max-w-3xl">
          <Search className="w-5 h-5 text-slate-400 absolute left-4 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search tracks, artists, moods, or natural prompts ('Find acoustic study music')..."
            className="w-full pl-12 pr-28 py-3.5 rounded-2xl bg-surface-850 border border-white/10 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/50 shadow-inner"
          />
          <button
            onClick={() => handleSearch(query)}
            className="absolute right-2 px-4 py-2 bg-gradient-to-r from-brand-600 to-accent-cyan text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 hover:opacity-95 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Search</span>
          </button>
        </div>

        {/* Provider Source Filters */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-400 font-medium">Source:</span>
          <button
            onClick={() => handleSelectProvider('all')}
            className={`px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer ${
              providerFilter === 'all' 
                ? 'bg-white text-surface-900 font-bold shadow-xs' 
                : 'bg-surface-800 text-slate-300 hover:bg-surface-750 border border-white/5'
            }`}
          >
            All Sources
          </button>
          <button
            onClick={() => handleSelectProvider('jiosaavn')}
            className={`px-3 py-1.5 rounded-xl font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
              providerFilter === 'jiosaavn' 
                ? 'bg-blue-600 text-white font-bold shadow-xs' 
                : 'bg-surface-800 text-slate-300 hover:bg-surface-750 border border-white/5'
            }`}
          >
            <Music2 className="w-3.5 h-3.5" />
            <span>JioSaavn</span>
          </button>
          <button
            onClick={() => handleSelectProvider('youtube')}
            className={`px-3 py-1.5 rounded-xl font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
              providerFilter === 'youtube' 
                ? 'bg-red-600 text-white font-bold shadow-xs' 
                : 'bg-surface-800 text-slate-300 hover:bg-surface-750 border border-white/5'
            }`}
          >
            <Youtube className="w-3.5 h-3.5" />
            <span>YouTube</span>
          </button>
          <button
            onClick={() => handleSelectProvider('deezer')}
            className={`px-3 py-1.5 rounded-xl font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
              providerFilter === 'deezer' 
                ? 'bg-[#A238FF] text-white font-bold shadow-xs' 
                : 'bg-surface-800 text-slate-300 hover:bg-surface-750 border border-white/5'
            }`}
          >
            <Headphones className="w-3.5 h-3.5" />
            <span>Deezer</span>
          </button>
          <button
            onClick={() => handleSelectProvider('spotify')}
            className={`px-3 py-1.5 rounded-xl font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
              providerFilter === 'spotify' 
                ? 'bg-[#1DB954] text-black font-bold shadow-xs' 
                : 'bg-surface-800 text-slate-300 hover:bg-surface-750 border border-white/5'
            }`}
          >
            <Waves className="w-3.5 h-3.5" />
            <span>Spotify</span>
          </button>
          <button
            onClick={() => handleSelectProvider('soundcloud')}
            className={`px-3 py-1.5 rounded-xl font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
              providerFilter === 'soundcloud' 
                ? 'bg-orange-500 text-white font-bold shadow-xs' 
                : 'bg-surface-800 text-slate-300 hover:bg-surface-750 border border-white/5'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>SoundCloud</span>
          </button>
          <button
            onClick={() => handleSelectProvider('jamendo')}
            className={`px-3 py-1.5 rounded-xl font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
              providerFilter === 'jamendo' 
                ? 'bg-brand-600 text-white font-bold shadow-xs' 
                : 'bg-surface-800 text-slate-300 hover:bg-surface-750 border border-white/5'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Open Streams</span>
          </button>

          {onOpenImportUrl && (
            <button
              onClick={onOpenImportUrl}
              className="px-3 py-1.5 rounded-xl font-medium flex items-center gap-1.5 bg-gradient-to-r from-brand-600 to-indigo-600 text-white hover:brightness-110 shadow-sm border border-brand-400/30 transition-all cursor-pointer ml-auto sm:ml-0"
              title="Add any YouTube or direct video/audio URL"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add URL / Video</span>
            </button>
          )}

          {(selectedGenre || selectedMood) && (
            <button
              onClick={() => {
                setSelectedGenre(null);
                setSelectedMood(null);
                handleSearch(query, null, providerFilter, null);
              }}
              className="ml-auto text-xs text-brand-400 hover:underline cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Semantic Match AI Insight alert */}
        {semanticSummary && (
          <div className="p-3.5 rounded-2xl bg-brand-950/40 border border-brand-500/30 flex items-start gap-2.5 text-xs text-brand-200">
            <Sparkles className="w-4 h-4 text-brand-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-white">AI Query Interpretation: </span>
              <span>{semanticSummary}</span>
            </div>
          </div>
        )}
      </div>

      {/* Genre Exploration Carousel / Grid (if no search query) */}
      {!query && !selectedGenre && (
        <section className="space-y-3">
          <h3 className="text-base font-bold text-slate-200">Explore by Genre</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {genres.map(g => (
              <div
                key={g.name}
                onClick={() => handleSelectGenre(g.name)}
                className={`p-4 rounded-2xl bg-gradient-to-br ${g.color} cursor-pointer hover:scale-[1.02] active:scale-95 transition-all shadow-md group`}
              >
                <h4 className="text-sm font-bold text-white">{g.name}</h4>
                <p className="text-[11px] text-white/80 mt-1">{g.desc}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Search Results Grid / Sequence */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-white">
              {query || selectedGenre || selectedMood ? `Results (${results.length})` : 'All Curated Media Items'}
            </h3>
            {results.length > 0 && (
              <span className="hidden sm:inline text-xs text-slate-400">• Click any track to play</span>
            )}
          </div>

          {results.length > 1 && (
            <div className="flex flex-wrap items-center gap-2">
              {/* Sequence Reorder Controls */}
              <div className="flex items-center gap-1.5 bg-surface-800 p-1 rounded-xl border border-white/5">
                <button
                  onClick={handleReverseSequence}
                  className="px-2.5 py-1 text-slate-300 hover:text-white hover:bg-surface-700 rounded-lg flex items-center gap-1.5 text-xs transition-colors cursor-pointer"
                  title="Reverse track playing sequence"
                >
                  <ArrowUpDown className="w-3.5 h-3.5 text-brand-400" />
                  <span className="hidden sm:inline">Reverse Sequence</span>
                </button>
                <button
                  onClick={handleShuffleSequence}
                  className="px-2.5 py-1 text-slate-300 hover:text-white hover:bg-surface-700 rounded-lg flex items-center gap-1.5 text-xs transition-colors cursor-pointer"
                  title="Shuffle sequence randomly"
                >
                  <Shuffle className="w-3.5 h-3.5 text-accent-cyan" />
                  <span className="hidden sm:inline">Shuffle Order</span>
                </button>
              </div>

              {/* Sort by attributes */}
              <TrackSortControl currentSort={sortOption} onSortChange={setSortOption} />

              {/* Layout Toggle: Grid vs Sequence List */}
              <div className="flex items-center bg-surface-800 p-1 rounded-xl border border-white/5">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    viewMode === 'grid' ? 'bg-brand-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Grid View"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('sequence')}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    viewMode === 'sequence' ? 'bg-brand-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Sequence / List View with Reorder Controls"
                >
                  <ListOrdered className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 animate-pulse">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="aspect-square bg-surface-850 rounded-2xl" />
            ))}
          </div>
        ) : sortedResults.length > 0 ? (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {sortedResults.map(track => (
                <TrackCard 
                  key={track.id} 
                  track={track} 
                  queueContext={sortedResults}
                  onAddToPlaylist={onAddToPlaylist}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-1.5 bg-surface-850 p-4 rounded-3xl border border-white/5">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 px-3 pb-2 border-b border-white/5 uppercase tracking-wider">
                <span># Title</span>
                <div className="flex items-center gap-12 pr-2">
                  <span>Vibe / Genre</span>
                  <Clock className="w-3.5 h-3.5" />
                </div>
              </div>
              {sortedResults.map((track, idx) => (
                <div
                  key={`${track.id}-${idx}`}
                  onClick={() => playTrack(track, sortedResults)}
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-surface-800 transition-colors group cursor-pointer border border-transparent hover:border-white/5"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {/* Sequence number with Up/Down buttons */}
                    <div className="flex items-center gap-1 min-w-[32px] shrink-0">
                      <span className="w-4 text-center text-xs font-mono text-slate-500 group-hover:text-brand-400">
                        {idx + 1}
                      </span>
                      <div className="flex flex-col -space-y-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveExploreTrack(idx, 'up');
                          }}
                          className="p-0.5 text-slate-400 hover:text-brand-300 disabled:opacity-20 hover:bg-surface-700 rounded transition-colors cursor-pointer"
                          title="Move track up in sequence"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === sortedResults.length - 1}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveExploreTrack(idx, 'down');
                          }}
                          className="p-0.5 text-slate-400 hover:text-brand-300 disabled:opacity-20 hover:bg-surface-700 rounded transition-colors cursor-pointer"
                          title="Move track down in sequence"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <img src={track.thumbnail} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                    <div className="min-w-0">
                      <h5 className="text-sm font-semibold text-slate-200 truncate group-hover:text-brand-300 transition-colors">
                        {track.title}
                      </h5>
                      <p className="text-xs text-slate-400 truncate">{track.artist}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <div className="hidden sm:flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-md bg-surface-750 text-slate-300 text-[11px]">
                        {track.genre}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-brand-500/10 text-brand-300 text-[11px]">
                        {track.mood}
                      </span>
                    </div>
                    <span className="font-mono text-slate-400 text-xs font-medium">
                      {formatTrackDuration(track.duration)}
                    </span>
                    {onAddToPlaylist && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddToPlaylist(track);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-surface-750 hover:bg-brand-600 hover:text-white transition-all text-slate-400 cursor-pointer"
                        title="Add to playlist"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="p-12 text-center bg-surface-850 rounded-3xl border border-white/5 space-y-3">
            <Radio className="w-10 h-10 text-slate-500 mx-auto" />
            <h4 className="text-base font-semibold text-slate-200">No media items matched</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Try searching for popular terms like "Kesariya", "Dhol", "Lo-Fi", "Sitar", or ask AI for a vibe.
            </p>
          </div>
        )}
      </section>
    </div>
  );
};
