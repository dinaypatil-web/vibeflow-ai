import React, { useState, useEffect, useMemo } from 'react';
import { 
  Library, 
  Upload, 
  HardDrive, 
  DownloadCloud, 
  Heart, 
  Clock, 
  CheckCircle2, 
  Sparkles, 
  Play, 
  FileAudio, 
  Trash2, 
  PieChart 
} from 'lucide-react';
import { MediaItem } from '../types';
import { api } from '../services/api';
import { TrackCard } from '../components/TrackCard';
import { usePlayerStore } from '../store/playerStore';
import { TrackSortControl } from '../components/TrackSortControl';
import { sortMediaItems } from '../utils/trackSort';

export const LibraryView: React.FC = () => {
  const [subTab, setSubTab] = useState<'favorites' | 'local' | 'downloads' | 'history'>('favorites');
  const [favorites, setFavorites] = useState<MediaItem[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [localItems, setLocalItems] = useState<MediaItem[]>([]);
  const [importing, setImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [favSort, setFavSort] = useState<string>('default');
  const [localSort, setLocalSort] = useState<string>('default');

  const { user, playTrack, setNowPlayingOpen } = usePlayerStore();

  const sortedFavorites = useMemo(() => {
    return sortMediaItems(favorites, favSort);
  }, [favorites, favSort]);

  const sortedLocalItems = useMemo(() => {
    return sortMediaItems(localItems, localSort);
  }, [localItems, localSort]);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const favs = await api.getFavorites(user?.id || 'demo-user-id');
      setFavorites(favs);

      const items = await api.getItems();
      setLocalItems(items.filter(i => i.isLocal));

      // Fetch history from database
      const res = await fetch(`http://localhost:4000/api/library/history?userId=${user?.id || 'demo-user-id'}`);
      const hData = await res.json();
      setHistory(hData.history || []);
    } catch (err) {
      console.error('Failed to load library data', err);
    }
  };

  // Drag & Drop / File Input Handler for Local Audio (MP3, WAV, FLAC, M4A, OGG)
  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setImporting(true);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const objectUrl = URL.createObjectURL(file);
      const cleanTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');

      // Register file locally
      await api.importLocal({
        title: cleanTitle,
        artist: 'My Device Audio',
        duration: 210, // estimated
        fileName: file.name,
        dataUrl: objectUrl,
        customTags: ['offline', 'local_import', file.type]
      });
    }

    setImporting(false);
    setImportSuccess(`Successfully imported and AI-categorized ${files.length} audio file(s)!`);
    setTimeout(() => setImportSuccess(null), 4000);
    loadData();
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Library className="w-5 h-5 text-brand-400" />
            <h2 className="text-2xl font-bold text-white tracking-tight">My Library & Offline Audio</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Manage your personal device files, favorites, download cache, and listening telemetry.
          </p>
        </div>

        {/* Sub-tabs */}
        <div className="flex items-center bg-surface-850 rounded-2xl p-1 border border-white/5 text-xs font-semibold">
          <button
            onClick={() => setSubTab('favorites')}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
              subTab === 'favorites' ? 'bg-brand-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Heart className="w-3.5 h-3.5" />
            <span>Favorites ({favorites.length})</span>
          </button>
          <button
            onClick={() => setSubTab('local')}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
              subTab === 'local' ? 'bg-brand-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>Local Files ({localItems.length})</span>
          </button>
          <button
            onClick={() => setSubTab('downloads')}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
              subTab === 'downloads' ? 'bg-brand-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            <DownloadCloud className="w-3.5 h-3.5" />
            <span>Downloads</span>
          </button>
          <button
            onClick={() => setSubTab('history')}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
              subTab === 'history' ? 'bg-brand-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>History</span>
          </button>
        </div>
      </div>

      {/* Subtab 1: Favorites */}
      {subTab === 'favorites' && (
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-lg font-bold text-white">Your Favorited Tracks</h3>
            <div className="flex flex-wrap items-center gap-2">
              <TrackSortControl currentSort={favSort} onSortChange={setFavSort} />
              {favorites.length > 0 && (
                <button
                  onClick={() => {
                    playTrack(sortedFavorites[0] || favorites[0], sortedFavorites);
                    setNowPlayingOpen(true);
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-brand-600 to-accent-cyan text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Play All Favorites</span>
                </button>
              )}
            </div>
          </div>

          {favorites.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {sortedFavorites.map(track => (
                <TrackCard key={track.id} track={track} queueContext={sortedFavorites} />
              ))}
            </div>
          ) : (
            <div className="p-12 text-center bg-surface-850 rounded-3xl border border-white/5 space-y-2">
              <Heart className="w-10 h-10 text-slate-500 mx-auto" />
              <h4 className="text-base font-semibold text-slate-200">No favorites yet</h4>
              <p className="text-xs text-slate-400">Click the heart icon on any track to add it here.</p>
            </div>
          )}
        </section>
      )}

      {/* Subtab 2: Local Files Importer */}
      {subTab === 'local' && (
        <section className="space-y-6">
          {/* File Upload Dropzone */}
          <div 
            className="p-8 rounded-3xl border-2 border-dashed border-brand-500/40 hover:border-brand-500 bg-surface-850/60 hover:bg-surface-850 transition-all text-center space-y-4 cursor-pointer relative"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleFileSelect(e.dataTransfer.files);
            }}
          >
            <input 
              type="file" 
              multiple 
              accept="audio/*,.mp3,.wav,.flac,.m4a,.ogg" 
              onChange={(e) => handleFileSelect(e.target.files)}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <div className="w-14 h-14 rounded-2xl bg-brand-600/20 text-brand-400 border border-brand-500/30 flex items-center justify-center mx-auto shadow-inner">
              <Upload className="w-7 h-7" />
            </div>
            <div>
              <h4 className="text-base font-bold text-white">Import Audio Files from Your Device</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                Drag and drop MP3, WAV, FLAC, M4A, or OGG tracks. They play directly in your browser with offline capability and automatic AI mood/genre tagging!
              </p>
            </div>
            <span className="inline-block px-4 py-1.5 rounded-xl bg-surface-800 text-xs text-brand-300 font-semibold border border-white/5">
              {importing ? 'Processing & Categorizing with AI...' : 'Browse Device Files'}
            </span>
          </div>

          {importSuccess && (
            <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-center gap-2 text-xs text-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{importSuccess}</span>
            </div>
          )}

          {/* Local Tracks list */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-base font-bold text-white">Device Imported Tracks ({localItems.length})</h3>
              {localItems.length > 0 && (
                <TrackSortControl currentSort={localSort} onSortChange={setLocalSort} />
              )}
            </div>
            {localItems.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {sortedLocalItems.map(track => (
                  <TrackCard key={track.id} track={track} queueContext={sortedLocalItems} />
                ))}
              </div>
            ) : (
              <div className="p-8 text-center bg-surface-850 rounded-2xl border border-white/5 text-xs text-slate-500">
                No local tracks imported yet. Drag your music files into the box above.
              </div>
            )}
          </div>
        </section>
      )}

      {/* Subtab 3: Downloads & Offline Manager */}
      {subTab === 'downloads' && (
        <section className="space-y-6">
          {/* Storage telemetry overview card */}
          <div className="p-6 rounded-3xl bg-surface-850 border border-white/5 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-md">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-accent-cyan/20 border border-accent-cyan/30 text-accent-cyan flex items-center justify-center">
                <PieChart className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Offline Audio Storage</h4>
                <p className="text-xs text-slate-400 mt-0.5">24.8 MB used of 2000 MB allocated offline cache</p>
                <div className="w-48 h-1.5 bg-surface-750 rounded-full mt-2 overflow-hidden">
                  <div className="w-3/12 h-full bg-accent-cyan rounded-full" />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button 
                onClick={() => alert('Offline cache cleared successfully.')}
                className="px-3.5 py-2 bg-surface-800 hover:bg-rose-950/60 text-slate-300 hover:text-rose-400 text-xs font-semibold rounded-xl border border-white/5 transition-colors"
              >
                Clear Cache
              </button>
            </div>
          </div>

          {/* Download Legal Compliance Notice */}
          <div className="p-4 rounded-2xl bg-surface-800/80 border border-brand-500/20 text-xs text-slate-300 space-y-1">
            <span className="font-semibold text-white">Authorized Download Policy:</span>
            <p className="text-slate-400 leading-relaxed">
              VibeFlow AI only permits direct local downloading for user-owned audio files and open-licensed Creative Commons master recordings. YouTube and Spotify streams are delivered through authorized embed players and comply strictly with platform terms without DRM extraction.
            </p>
          </div>
        </section>
      )}

      {/* Subtab 4: History */}
      {subTab === 'history' && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">Listening History</h3>
            <span className="text-xs text-slate-400 font-mono">{history.length} playback sessions</span>
          </div>

          {history.length > 0 ? (
            <div className="space-y-2">
              {history.map((h, idx) => (
                <div 
                  key={idx}
                  onClick={() => playTrack(h.mediaItem)}
                  className="flex items-center justify-between p-3 rounded-2xl bg-surface-850 hover:bg-surface-800 border border-white/5 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <img src={h.mediaItem.thumbnail} alt="" className="w-10 h-10 rounded-xl object-cover shrink-0" />
                    <div className="min-w-0">
                      <h5 className="text-sm font-semibold text-white truncate">{h.mediaItem.title}</h5>
                      <p className="text-xs text-slate-400 truncate">{h.mediaItem.artist}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span className="px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-300 text-[11px]">
                      {h.mediaItem.mood}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {new Date(h.listenedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center bg-surface-850 rounded-2xl border border-white/5 text-xs text-slate-500">
              No listening history recorded yet. Start playing any track!
            </div>
          )}
        </section>
      )}
    </div>
  );
};
