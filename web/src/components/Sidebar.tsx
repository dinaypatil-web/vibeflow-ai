import React from 'react';
import { 
  Home, 
  Search,
  Compass, 
  ListMusic, 
  Library, 
  Sparkles, 
  Settings, 
  Radio, 
  Flame, 
  Heart, 
  Clock, 
  Volume2, 
  CheckCircle2, 
  DownloadCloud,
  LogIn,
  LogOut,
  User as UserIcon
} from 'lucide-react';
import { usePlayerStore, TabType } from '../store/playerStore';

interface SidebarProps {
  onOpenAuth?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenAuth }) => {
  const { activeTab, setActiveTab, user, logout } = usePlayerStore();

  const navItems: { id: TabType; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'home', label: 'Home', icon: <Home className="w-5 h-5" /> },
    { id: 'search', label: 'Search', icon: <Search className="w-5 h-5" /> },
    { id: 'explore', label: 'Explore & Browse', icon: <Compass className="w-5 h-5" /> },
    { id: 'playlists', label: 'Playlists & Smart Mix', icon: <ListMusic className="w-5 h-5" /> },
    { id: 'library', label: 'My Library & Offline', icon: <Library className="w-5 h-5" /> },
    { id: 'ai-studio', label: 'AI Taste Studio', icon: <Sparkles className="w-5 h-5" />, badge: 'AI' },
    { id: 'settings', label: 'Settings & Privacy', icon: <Settings className="w-5 h-5" /> },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 bg-surface-900 border-r border-white/5 p-4 select-none shrink-0 h-screen overflow-y-auto">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-2 py-4 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 via-brand-500 to-accent-cyan flex items-center justify-center shadow-lg shadow-brand-500/25">
          <Radio className="w-6 h-6 text-white animate-pulse" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-brand-300 bg-clip-text text-transparent">
            VibeFlow AI
          </h1>
          <p className="text-xs text-brand-400 font-medium tracking-wide">Intelligent Audio & Video</p>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="space-y-1 mb-6">
        <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Discovery</p>
        {navItems.map(item => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 group ${
                isActive 
                  ? 'bg-brand-600/20 text-brand-300 border border-brand-500/30 shadow-sm shadow-brand-500/10' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-surface-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`transition-colors ${isActive ? 'text-brand-400' : 'group-hover:text-slate-200'}`}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-gradient-to-r from-brand-600 to-accent-pink text-white shadow-xs">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Quick Playlists section */}
      <div className="mb-6">
        <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Smart Curations</p>
        <div className="space-y-1 text-sm text-slate-400">
          <button 
            onClick={() => setActiveTab('playlists')} 
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-surface-800 hover:text-slate-200 text-left transition-colors"
          >
            <Flame className="w-4 h-4 text-accent-pink" />
            <span className="truncate">Workout Energy & Dhol</span>
          </button>
          <button 
            onClick={() => setActiveTab('playlists')} 
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-surface-800 hover:text-slate-200 text-left transition-colors"
          >
            <Sparkles className="w-4 h-4 text-brand-400" />
            <span className="truncate">My Morning Motivation</span>
          </button>
          <button 
            onClick={() => setActiveTab('playlists')} 
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-surface-800 hover:text-slate-200 text-left transition-colors"
          >
            <Volume2 className="w-4 h-4 text-accent-cyan" />
            <span className="truncate">Relaxing Instrumentals</span>
          </button>
          <button 
            onClick={() => setActiveTab('playlists')} 
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-surface-800 hover:text-slate-200 text-left transition-colors"
          >
            <Heart className="w-4 h-4 text-accent-rose" />
            <span className="truncate">Hindi Retro Favorites</span>
          </button>
        </div>
      </div>

      {/* User profile card at bottom */}
      <div className="mt-auto pt-4 border-t border-white/5">
        {user ? (
          <div className="flex items-center gap-3 p-2 rounded-xl bg-surface-850/80 border border-white/5 group">
            <img 
              src={user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'} 
              alt="Profile" 
              className="w-9 h-9 rounded-full object-cover ring-2 ring-brand-500/40 shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-200 truncate">{user.name}</p>
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-400">
                <CheckCircle2 className="w-3 h-3" />
                <span className="truncate">Cloud Synced</span>
              </div>
            </div>
            <button
              onClick={logout}
              title="Sign Out"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-surface-800 transition-all opacity-70 group-hover:opacity-100"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="p-3 rounded-2xl bg-gradient-to-b from-brand-950/40 to-surface-850 border border-brand-500/20 text-center space-y-2">
            <p className="text-xs text-slate-300 font-medium">Sync playlists across devices</p>
            <button
              onClick={onOpenAuth}
              className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-brand-600 to-accent-cyan text-white text-xs font-bold shadow-md shadow-brand-500/20 hover:opacity-95 transition-all flex items-center justify-center gap-1.5"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In / Register</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
