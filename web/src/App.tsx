import React, { useState } from 'react';
import { usePlayerStore, TabType } from './store/playerStore';
import { MoodCategory, MediaItem } from './types';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { MiniPlayer } from './components/MiniPlayer';
import { NowPlayingModal } from './components/NowPlayingModal';
import { AudioEngine } from './components/AudioEngine';
import { ImportUrlModal } from './components/ImportUrlModal';
import { AddToPlaylistModal } from './components/AddToPlaylistModal';
import { HomeView } from './views/HomeView';
import { ExploreView } from './views/ExploreView';
import { SearchView } from './views/SearchView';
import { PlaylistsView } from './views/PlaylistsView';
import { LibraryView } from './views/LibraryView';
import { AIStudioView } from './views/AIStudioView';
import { SettingsView } from './views/SettingsView';
import { AuthModal } from './components/AuthModal';
import { SpotifyConnectModal } from './components/SpotifyConnectModal';
import { 
  Home, 
  Search,
  Compass, 
  ListMusic, 
  Library as LibraryIcon, 
  Sparkles, 
  Settings 
} from 'lucide-react';

export const App: React.FC = () => {
  const { activeTab, setActiveTab, theme } = usePlayerStore();
  const [selectedMood, setSelectedMood] = useState<MoodCategory | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isImportUrlModalOpen, setIsImportUrlModalOpen] = useState(false);
  const [playlistTargetTrack, setPlaylistTargetTrack] = useState<MediaItem | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const handleSelectMood = (mood: MoodCategory | null) => {
    setSelectedMood(mood);
    if (mood) {
      setActiveTab('explore');
    }
  };

  const handleSearchSubmit = (query: string) => {
    setSearchQuery(query);
    setActiveTab('explore');
  };

  const handleAddToPlaylist = (track: MediaItem) => {
    setPlaylistTargetTrack(track);
  };

  return (
    <div className="flex h-screen bg-surface-900 text-slate-100 overflow-hidden font-sans transition-colors duration-300" data-theme={theme}>
      {/* Background Audio Engine */}
      <AudioEngine />

      {/* Desktop Sidebar */}
      <Sidebar onOpenAuth={() => setIsAuthModalOpen(true)} />

      {/* Main App Layout */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Navbar */}
        <Navbar 
          onSearchSubmit={handleSearchSubmit}
          selectedMood={selectedMood}
          onSelectMood={handleSelectMood}
          onOpenImportUrl={() => setIsImportUrlModalOpen(true)}
          onOpenAuth={() => setIsAuthModalOpen(true)}
        />

        {/* Scrollable View Content */}
        <main className="flex-1 overflow-y-auto px-4 md:px-8 pt-6 pb-44 md:pb-28">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'home' && (
              <HomeView 
                onSelectMood={handleSelectMood} 
                onSearchQuery={handleSearchSubmit}
                onAddToPlaylist={handleAddToPlaylist}
              />
            )}
            {activeTab === 'search' && (
              <SearchView onAddToPlaylist={handleAddToPlaylist} />
            )}
            {activeTab === 'explore' && (
              <ExploreView 
                initialQuery={searchQuery}
                initialMood={selectedMood}
                onAddToPlaylist={handleAddToPlaylist}
                onOpenImportUrl={() => setIsImportUrlModalOpen(true)}
              />
            )}
            {activeTab === 'playlists' && (
              <PlaylistsView onOpenAuth={() => setIsAuthModalOpen(true)} />
            )}
            {activeTab === 'library' && <LibraryView />}
            {activeTab === 'ai-studio' && <AIStudioView />}
            {activeTab === 'settings' && <SettingsView />}
          </div>
        </main>

        {/* Mobile Bottom Navigation Bar */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-surface-950/95 backdrop-blur-xl border-t border-white/5 px-1 py-2 flex items-center justify-around text-[10px] font-medium text-slate-400">
          <button
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all ${
              activeTab === 'home' ? 'text-brand-400 bg-brand-500/10' : 'hover:text-slate-200'
            }`}
          >
            <Home className="w-5 h-5" />
            <span>Home</span>
          </button>

          <button
            onClick={() => setActiveTab('search')}
            className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all ${
              activeTab === 'search' ? 'text-brand-400 bg-brand-500/10' : 'hover:text-slate-200'
            }`}
          >
            <Search className="w-5 h-5" />
            <span>Search</span>
          </button>

          <button
            onClick={() => setActiveTab('explore')}
            className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all ${
              activeTab === 'explore' ? 'text-brand-400 bg-brand-500/10' : 'hover:text-slate-200'
            }`}
          >
            <Compass className="w-5 h-5" />
            <span>Explore</span>
          </button>

          <button
            onClick={() => setActiveTab('playlists')}
            className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all ${
              activeTab === 'playlists' ? 'text-brand-400 bg-brand-500/10' : 'hover:text-slate-200'
            }`}
          >
            <ListMusic className="w-5 h-5" />
            <span>Playlists</span>
          </button>

          <button
            onClick={() => setActiveTab('library')}
            className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all ${
              activeTab === 'library' ? 'text-brand-400 bg-brand-500/10' : 'hover:text-slate-200'
            }`}
          >
            <LibraryIcon className="w-5 h-5" />
            <span>Library</span>
          </button>

          <button
            onClick={() => setActiveTab('ai-studio')}
            className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all ${
              activeTab === 'ai-studio' ? 'text-brand-400 bg-brand-500/10' : 'hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-5 h-5" />
            <span>AI</span>
          </button>
        </nav>

        {/* Persistent Mini Player */}
        <MiniPlayer />

        {/* Fullscreen Now Playing Modal */}
        <NowPlayingModal onAddToPlaylist={handleAddToPlaylist} />

        {/* Import URL Modal */}
        <ImportUrlModal 
          isOpen={isImportUrlModalOpen} 
          onClose={() => setIsImportUrlModalOpen(false)} 
        />

        {/* Add to Playlist Modal */}
        <AddToPlaylistModal
          isOpen={!!playlistTargetTrack}
          track={playlistTargetTrack}
          onClose={() => setPlaylistTargetTrack(null)}
        />

        {/* User Authentication & Cloud Sync Modal */}
        {isAuthModalOpen && (
          <AuthModal onClose={() => setIsAuthModalOpen(false)} />
        )}

        {/* Spotify Source Login Modal */}
        <SpotifyConnectModal />
      </div>
    </div>
  );
};
export default App;
