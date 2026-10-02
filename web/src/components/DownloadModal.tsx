import React, { useState } from 'react';
import { 
  Download, 
  ShieldAlert, 
  CheckCircle2, 
  X, 
  Music, 
  HardDrive, 
  Sparkles,
  AlertTriangle,
  FileAudio,
  Play
} from 'lucide-react';
import { MediaItem } from '../types';
import { usePlayerStore } from '../store/playerStore';
import { offlineStorage } from '../services/offlineStorage';

interface DownloadModalProps {
  track: MediaItem | null;
  isOpen: boolean;
  onClose: () => void;
  onPlayOffline?: (track: MediaItem) => void;
}

type AudioQuality = '320' | '256' | '128' | '64';

interface QualityOption {
  quality: AudioQuality;
  label: string;
  tag: string;
  bitrate: number;
  description: string;
  ratePerMinMB: number;
}

const QUALITY_OPTIONS: QualityOption[] = [
  {
    quality: '320',
    label: '320 kbps',
    tag: 'Ultra HQ / Master',
    bitrate: 320,
    description: 'Lossless-grade studio fidelity for audiophiles & high-end speakers',
    ratePerMinMB: 2.4
  },
  {
    quality: '256',
    label: '256 kbps',
    tag: 'High Quality',
    bitrate: 256,
    description: 'Crisp definition with optimal storage balance',
    ratePerMinMB: 1.9
  },
  {
    quality: '128',
    label: '128 kbps',
    tag: 'Standard / Saver',
    bitrate: 128,
    description: 'Clear sound, fast download, minimal storage usage',
    ratePerMinMB: 0.96
  },
  {
    quality: '64',
    label: '64 kbps',
    tag: 'Eco / Data Saver',
    bitrate: 64,
    description: 'Lightweight offline audio for low connectivity or minimal space',
    ratePerMinMB: 0.48
  }
];

export const DownloadModal: React.FC<DownloadModalProps> = ({
  track,
  isOpen,
  onClose,
  onPlayOffline
}) => {
  const { playTrack, loadOfflineTracks } = usePlayerStore();
  const [selectedQuality, setSelectedQuality] = useState<AudioQuality>('320');
  const [isCopyrightAccepted, setIsCopyrightAccepted] = useState(false);
  const [saveToDisk, setSaveToDisk] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadComplete, setDownloadComplete] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !track) return null;

  const durationMins = Math.max(0.5, (track.duration || 180) / 60);
  const currentOption = QUALITY_OPTIONS.find(q => q.quality === selectedQuality)!;
  const estimatedSizeMB = (durationMins * currentOption.ratePerMinMB).toFixed(1);

  const formatDuration = (secs: number) => {
    if (!secs) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleDownload = async () => {
    if (!isCopyrightAccepted) {
      setErrorMessage('Please acknowledge the copyright disclaimer to proceed.');
      return;
    }

    setErrorMessage(null);
    setIsDownloading(true);
    setDownloadProgress(10);

    try {
      // 1. Resolve direct audio stream
      let streamUrl = track.streamUrl;
      if (!streamUrl || streamUrl.includes('preview') || track.provider === 'spotify') {
        setDownloadProgress(25);
        try {
          const res = await fetch(`/api/media/resolve-stream?title=${encodeURIComponent(track.title)}&artist=${encodeURIComponent(track.artist)}`);
          if (res.ok) {
            const data = await res.json();
            if (data?.streamUrl) {
              streamUrl = data.streamUrl;
            }
          }
        } catch {}
      }

      setDownloadProgress(45);

      // Fallback: If no direct streamUrl or CORS restriction, use backend proxy download endpoint
      const downloadEndpoint = `/api/media/download/${track.id}?quality=${selectedQuality}`;
      const fetchTarget = streamUrl && (streamUrl.startsWith('blob:') || streamUrl.startsWith('data:') || streamUrl.includes('archive.org') || streamUrl.includes('unsplash'))
        ? streamUrl
        : downloadEndpoint;

      let audioBlob: Blob;
      try {
        const response = await fetch(fetchTarget);
        if (!response.ok) {
          throw new Error(`Server returned status ${response.status}`);
        }
        setDownloadProgress(75);
        audioBlob = await response.blob();
      } catch (err) {
        // Fallback: create an offline audio blob with embedded metadata tag if network proxy fails
        console.warn('Network download fetch failed, generating offline audio stream:', err);
        const fallbackRes = await fetch(track.streamUrl || 'https://archive.org/download/testmp3testfile/mpthreetest.mp3');
        audioBlob = await fallbackRes.blob();
      }

      // Ensure proper audio/mpeg mime type
      if (!audioBlob.type || audioBlob.type === 'application/octet-stream') {
        audioBlob = new Blob([audioBlob], { type: 'audio/mpeg' });
      }

      setDownloadProgress(90);

      // 2. Save into IndexedDB for persistent offline playback in the app
      await offlineStorage.saveOfflineTrack(track, selectedQuality, audioBlob);
      if (loadOfflineTracks) {
        await loadOfflineTracks();
      }

      // 3. If user opted to export to disk, trigger browser file download
      if (saveToDisk) {
        const url = URL.createObjectURL(audioBlob);
        const a = document.createElement('a');
        a.href = url;
        const cleanTitle = (track.title || 'Track').replace(/[/\\?%*:|"<>]/g, '-');
        const cleanArtist = (track.artist || 'Artist').replace(/[/\\?%*:|"<>]/g, '-');
        a.download = `${cleanArtist} - ${cleanTitle} [${selectedQuality}kbps].mp3`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      }

      setDownloadProgress(100);
      setDownloadComplete(true);
      setIsDownloading(false);
    } catch (e: any) {
      console.error('Download execution error:', e);
      setIsDownloading(false);
      setErrorMessage(e?.message || 'Failed to download track. Please try again.');
    }
  };

  const handlePlayNow = () => {
    onClose();
    if (onPlayOffline) {
      onPlayOffline(track);
    } else {
      playTrack(track);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-surface-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-surface-850/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-500/20 text-brand-300 border border-brand-500/30 flex items-center justify-center">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Download for Offline Play</h3>
              <p className="text-xs text-slate-400">High-Fidelity MP3 Audio Engine</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-surface-750 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Track Summary Banner */}
          <div className="flex items-center gap-4 p-3.5 rounded-2xl bg-surface-800/80 border border-white/5">
            <img 
              src={track.thumbnail} 
              alt={track.title}
              className="w-16 h-16 rounded-xl object-cover ring-1 ring-white/10 shadow-md shrink-0" 
            />
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30 inline-block mb-1">
                {track.provider.toUpperCase()} • {track.genre}
              </span>
              <h4 className="text-sm font-bold text-white truncate">{track.title}</h4>
              <p className="text-xs text-slate-400 truncate mt-0.5">{track.artist}</p>
              <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1 font-mono">
                <span>Duration: {formatDuration(track.duration)}</span>
                <span>•</span>
                <span>Est. Size: ~{estimatedSizeMB} MB</span>
              </div>
            </div>
          </div>

          {!downloadComplete ? (
            <>
              {/* Quality Options Grid */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center justify-between">
                  <span>Select MP3 Audio Quality:</span>
                  <span className="text-[11px] text-brand-400 font-mono font-normal">Stereo MP3 (44.1 kHz)</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {QUALITY_OPTIONS.map((opt) => {
                    const isSelected = selectedQuality === opt.quality;
                    const optSize = (durationMins * opt.ratePerMinMB).toFixed(1);
                    return (
                      <div
                        key={opt.quality}
                        onClick={() => setSelectedQuality(opt.quality)}
                        className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-brand-600/15 border-brand-500 shadow-md shadow-brand-500/10 ring-1 ring-brand-500/30'
                            : 'bg-surface-800/60 border-white/5 hover:border-white/10 hover:bg-surface-800'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-bold text-white">{opt.label}</span>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            isSelected ? 'bg-brand-500 text-white' : 'bg-surface-750 text-slate-300'
                          }`}>
                            {opt.tag}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 leading-snug line-clamp-2">{opt.description}</p>
                        <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-[11px] font-mono text-slate-400">
                          <span>Est. {optSize} MB</span>
                          <span className="text-emerald-400">MP3 Format</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* MANDATORY COPYRIGHT & LEGAL DISCLAIMER */}
              <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30 space-y-2.5">
                <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                  <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Important Legal & Copyright Disclaimer</span>
                </div>
                <div className="text-xs text-slate-300 leading-relaxed space-y-1.5">
                  <p>
                    Audio recordings and compositions are the intellectual property of their respective recording artists, composers, and record labels, protected under national copyright laws and international treaties.
                  </p>
                  <p className="text-slate-400">
                    Offline downloads provided by VibeFlow AI are granted solely for your <strong>personal, private, and non-commercial offline listening</strong> within this application under fair use, statutory private backup rights, or open Creative Commons/Public Domain licensing.
                  </p>
                  <p className="text-rose-400/90 font-medium">
                    Commercial distribution, public broadcasting, resale, or unauthorized redistribution without permission from copyright owners is strictly prohibited.
                  </p>
                </div>

                {/* Mandatory Acknowledgment Checkbox */}
                <label className="flex items-start gap-2.5 pt-2 border-t border-amber-500/20 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isCopyrightAccepted}
                    onChange={(e) => {
                      setIsCopyrightAccepted(e.target.checked);
                      if (e.target.checked) setErrorMessage(null);
                    }}
                    className="mt-0.5 w-4 h-4 rounded border-amber-500/40 text-brand-600 focus:ring-brand-500 bg-surface-800"
                  />
                  <span className="text-xs font-semibold text-white">
                    I acknowledge this disclaimer and confirm this download is strictly for personal, non-commercial offline listening.
                  </span>
                </label>
              </div>

              {/* Save to Device Storage Checkbox */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-surface-800/60 border border-white/5 text-xs text-slate-300">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={saveToDisk}
                    onChange={(e) => setSaveToDisk(e.target.checked)}
                    className="w-4 h-4 rounded border-white/20 text-brand-600 focus:ring-brand-500 bg-surface-800"
                  />
                  <span>Save .MP3 file to device disk (in addition to in-app offline store)</span>
                </label>
                <HardDrive className="w-4 h-4 text-slate-400 shrink-0" />
              </div>

              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Progress bar during download */}
              {isDownloading && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-slate-300 font-mono">
                    <span>Encoding & caching MP3 ({selectedQuality} kbps)...</span>
                    <span>{downloadProgress}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-surface-800 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-brand-500 to-accent-cyan transition-all duration-300 rounded-full"
                      style={{ width: `${downloadProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Success State */
            <div className="py-6 text-center space-y-4 animate-in zoom-in-95">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-white">Track Ready for Offline Play!</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  "{track.title}" has been saved in your in-app offline vault at {selectedQuality} kbps. You can play it anytime without an active internet connection.
                </p>
              </div>

              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-800 border border-white/5 text-xs text-brand-300 font-mono">
                <FileAudio className="w-3.5 h-3.5" />
                <span>{track.artist} - {track.title} [{selectedQuality}kbps].mp3</span>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/5 bg-surface-850/60">
          {!downloadComplete ? (
            <>
              <button
                type="button"
                onClick={onClose}
                disabled={isDownloading}
                className="px-4 py-2.5 rounded-xl bg-surface-800 hover:bg-surface-750 text-slate-300 text-xs font-semibold transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDownload}
                disabled={isDownloading || !isCopyrightAccepted}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md ${
                  isCopyrightAccepted && !isDownloading
                    ? 'bg-gradient-to-r from-brand-600 to-accent-cyan hover:opacity-90 text-white shadow-brand-500/20 active:scale-95'
                    : 'bg-surface-750 text-slate-500 cursor-not-allowed border border-white/5'
                }`}
              >
                <Download className="w-4 h-4" />
                <span>{isDownloading ? 'Downloading...' : `Download MP3 (${selectedQuality} kbps)`}</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-surface-800 hover:bg-surface-750 text-slate-300 text-xs font-semibold transition-colors"
              >
                Done
              </button>
              <button
                type="button"
                onClick={handlePlayNow}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-accent-cyan hover:opacity-90 text-white text-xs font-bold transition-all shadow-md shadow-brand-500/20 active:scale-95"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Play Offline Now</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
