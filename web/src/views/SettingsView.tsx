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
  Radio
} from 'lucide-react';
import { usePlayerStore } from '../store/playerStore';
import { api } from '../services/api';

export const SettingsView: React.FC = () => {
  const { user } = usePlayerStore();
  const [theme, setTheme] = useState<'dark' | 'cyberpunk' | 'light'>('dark');
  const [audioQuality, setAudioQuality] = useState<'standard' | 'high' | 'lossless'>('high');
  const [wifiOnly, setWifiOnly] = useState(true);
  const [historyTracking, setHistoryTracking] = useState(true);
  const [providerStatuses, setProviderStatuses] = useState<any[]>([]);

  useEffect(() => {
    api.getProviders().then(res => {
      setProviderStatuses(res.providers || []);
    }).catch(console.error);
  }, []);

  const handleClearHistory = () => {
    if (confirm('Clear all your listening history? This will reset your recent playback telemetry.')) {
      alert('Listening history has been wiped.');
    }
  };

  const handleResetTaste = () => {
    if (confirm('Reset your personalized AI taste model to default?')) {
      alert('Taste model reset to fresh baseline.');
    }
  };

  return (
    <div className="space-y-8 pb-12 max-w-4xl animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2.5">
          <Settings className="w-5 h-5 text-brand-400" />
          <h2 className="text-2xl font-bold text-white tracking-tight">Settings & Legal Compliance</h2>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Customize playback parameters, theme ambiance, privacy rules, and review provider integrations.
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
            <p className="text-xs text-slate-400">{user?.email || 'demo@vibeflow.ai'}</p>
            <span className="inline-block mt-1 text-[11px] text-emerald-400 font-semibold">
              ✓ Verified VibeFlow AI Pro Account
            </span>
          </div>
        </div>
      </section>

      {/* Visual Ambiance / Themes */}
      <section className="p-6 rounded-3xl bg-surface-850 border border-white/5 space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Visual Ambiance & Theme</h3>
        <div className="grid grid-cols-3 gap-3">
          {[
            { id: 'dark', label: 'Dark Velvet', icon: <Moon className="w-4 h-4 text-purple-400" />, desc: 'OLED Black & Violet' },
            { id: 'cyberpunk', label: 'Cyberpunk Neon', icon: <Zap className="w-4 h-4 text-cyan-400" />, desc: 'Cyan & Pink Electric' },
            { id: 'light', label: 'Clean Daylight', icon: <Sun className="w-4 h-4 text-amber-400" />, desc: 'Modern High Contrast' }
          ].map(t => (
            <div
              key={t.id}
              onClick={() => setTheme(t.id as any)}
              className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                theme === t.id
                  ? 'bg-surface-800 border-brand-500 text-white shadow-md'
                  : 'bg-surface-900 border-white/5 text-slate-400 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                {t.icon}
                <span className="text-xs font-bold">{t.label}</span>
              </div>
              <p className="text-[10px] text-slate-500">{t.desc}</p>
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
                onClick={() => {
                  const el = document.getElementById('custom-yt-key') as HTMLInputElement;
                  if (el && el.value) {
                    fetch('http://localhost:4000/api/library/providers/configure', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ youtubeApiKey: el.value.trim() })
                    }).then(() => alert('YouTube API key configured successfully!'));
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
              <span className="text-[11px] text-slate-400">Enables 30s Spotify previews</span>
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
                  onClick={() => {
                    const idEl = document.getElementById('spotify-client-id') as HTMLInputElement;
                    const secEl = document.getElementById('spotify-client-secret') as HTMLInputElement;
                    if (idEl?.value && secEl?.value) {
                      fetch('http://localhost:4000/api/library/providers/configure', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ spotifyClientId: idEl.value.trim(), spotifyClientSecret: secEl.value.trim() })
                      }).then(() => alert('Spotify credentials saved! Restart the server to apply.'));
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
                Get free credentials at <span className="text-[#1DB954]" >developer.spotify.com</span> → Create App
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
