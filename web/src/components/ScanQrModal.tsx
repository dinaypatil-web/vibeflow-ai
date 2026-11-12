import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  QrCode, 
  Camera, 
  Upload, 
  Link as LinkIcon, 
  Play, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  RefreshCw,
  Sparkles
} from 'lucide-react';
import jsQR from 'jsqr';
import { api } from '../services/api';
import { Playlist } from '../types';
import { usePlayerStore } from '../store/playerStore';

interface ScanQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlaylistAdded: (playlist: Playlist) => void;
}

export const ScanQrModal: React.FC<ScanQrModalProps> = ({
  isOpen,
  onClose,
  onPlaylistAdded
}) => {
  const { playTrack, setNowPlayingOpen } = usePlayerStore();
  const [activeTab, setActiveTab] = useState<'camera' | 'upload' | 'manual'>('camera');
  const [isProcessing, setIsProcessing] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [addedPlaylist, setAddedPlaylist] = useState<Playlist | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Stop camera stream cleanly
  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Start camera stream for live QR scanning
  const startCamera = async (mode: 'environment' | 'user' = facingMode) => {
    stopCamera();
    setCameraError(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera access is not supported by your browser. Please upload a QR image or enter the share link.');
      setActiveTab('upload');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        scanLoop();
      }
    } catch (err: any) {
      console.warn('Camera access denied or failed:', err);
      setCameraError(
        err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
          ? 'Camera permission denied. Please allow camera access in your browser or upload a QR image below.'
          : 'Unable to start camera. Please upload a QR image or enter the share link.'
      );
      setActiveTab('upload');
    }
  };

  // Continuous scanning loop using jsQR and native BarcodeDetector
  const scanLoop = () => {
    if (!videoRef.current || videoRef.current.readyState < 2) {
      animationFrameRef.current = requestAnimationFrame(scanLoop);
      return;
    }

    const video = videoRef.current;
    let canvas = canvasRef.current;
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvasRef.current = canvas;
    }

    const width = video.videoWidth;
    const height = video.videoHeight;
    if (width > 0 && height > 0) {
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        ctx.drawImage(video, 0, 0, width, height);
        const imageData = ctx.getImageData(0, 0, width, height);

        // 1. Try jsQR (fast, client-side, pure JS)
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert'
        });

        if (code && code.data) {
          handleDetectedCode(code.data);
          return; // Stop scan loop on match
        }
      }
    }

    animationFrameRef.current = requestAnimationFrame(scanLoop);
  };

  // Process detected QR code string
  const handleDetectedCode = async (data: string) => {
    if (isProcessing) return;
    setIsProcessing(true);
    stopCamera();

    // Play subtle audio confirmation
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch {}

    try {
      const result = await api.scanSharedQrCode(data);
      if (result.playlist) {
        setAddedPlaylist(result.playlist);
        setFeedback({
          type: 'success',
          message: result.message || `Successfully added "${result.playlist.title}" to your library!`
        });
        onPlaylistAdded(result.playlist);
      } else {
        throw new Error('Playlist data could not be retrieved from this QR code.');
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to add playlist from QR code.'
      });
      // Allow retry
      setIsProcessing(false);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle uploaded image file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setFeedback(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setIsProcessing(false);
          setFeedback({ type: 'error', message: 'Failed to process image canvas.' });
          return;
        }

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code && code.data) {
          handleDetectedCode(code.data);
        } else {
          setIsProcessing(false);
          setFeedback({
            type: 'error',
            message: 'No QR code could be found in the uploaded image. Please ensure the QR code is clearly visible.'
          });
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Handle manual code / link submission
  const handleManualSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!manualCode.trim()) return;
    handleDetectedCode(manualCode.trim());
  };

  // Flip front/back camera
  const handleToggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  // Handle Play Now
  const handlePlayAddedPlaylist = () => {
    if (!addedPlaylist || !addedPlaylist.items || addedPlaylist.items.length === 0) return;
    const tracks = addedPlaylist.items.map(i => i.mediaItem);
    playTrack(tracks[0], tracks);
    setNowPlayingOpen(true);
    handleClose();
  };

  const handleClose = () => {
    stopCamera();
    setAddedPlaylist(null);
    setFeedback(null);
    setIsProcessing(false);
    setManualCode('');
    onClose();
  };

  // Manage camera on modal open/close & tab change
  useEffect(() => {
    if (isOpen && activeTab === 'camera' && !addedPlaylist) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, activeTab, addedPlaylist]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div 
        className="relative w-full max-w-md bg-surface-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-brand-400">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white leading-tight">Scan Shared QR Code</h2>
              <p className="text-xs text-slate-400">Add a shared playlist directly to your library</p>
            </div>
          </div>
          <button 
            onClick={handleClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success State View */}
        {addedPlaylist ? (
          <div className="p-6 flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                Playlist Added to Library
              </span>
              <h3 className="text-lg font-bold text-white pt-1">{addedPlaylist.title}</h3>
              <p className="text-xs text-slate-400 line-clamp-2">{addedPlaylist.description || 'Shared community playlist'}</p>
            </div>

            {/* Playlist Preview Card */}
            <div className="w-full p-3.5 rounded-2xl bg-surface-800/80 border border-white/5 flex items-center gap-3 text-left">
              <img 
                src={addedPlaylist.coverArt || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=300&q=80'} 
                alt="" 
                className="w-14 h-14 rounded-xl object-cover shadow"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{addedPlaylist.title}</p>
                <p className="text-xs text-slate-400">
                  {addedPlaylist.items?.length || addedPlaylist.itemCount || 0} tracks • By {addedPlaylist.creator?.name || 'VibeFlow User'}
                </p>
                <span className="inline-block mt-1 text-[10px] text-brand-300 font-medium">
                  {addedPlaylist.isSmart ? '⚡ Dynamic Smart Mix' : '🎵 Custom Track Sequence'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 w-full pt-2">
              <button
                onClick={handlePlayAddedPlaylist}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-brand-600 to-accent-pink hover:opacity-95 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-brand-500/25 transition-all"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Play Now</span>
              </button>
              <button
                onClick={handleClose}
                className="flex-1 py-3 px-4 rounded-xl bg-surface-800 hover:bg-surface-750 border border-white/10 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all"
              >
                <span>Done</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Mode Tabs */}
            <div className="flex border-b border-white/5 px-4 pt-2 gap-2 bg-surface-950/40">
              <button
                onClick={() => setActiveTab('camera')}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-xl transition-all border-b-2 -mb-[1px] ${
                  activeTab === 'camera'
                    ? 'border-brand-500 text-brand-400 bg-surface-850/60'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Camera Scan</span>
              </button>
              <button
                onClick={() => setActiveTab('upload')}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-xl transition-all border-b-2 -mb-[1px] ${
                  activeTab === 'upload'
                    ? 'border-brand-500 text-brand-400 bg-surface-850/60'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload QR Image</span>
              </button>
              <button
                onClick={() => setActiveTab('manual')}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-xl transition-all border-b-2 -mb-[1px] ${
                  activeTab === 'manual'
                    ? 'border-brand-500 text-brand-400 bg-surface-850/60'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <LinkIcon className="w-3.5 h-3.5" />
                <span>Paste Link / Code</span>
              </button>
            </div>

            {/* Content Area */}
            <div className="p-5 flex-1 overflow-y-auto space-y-4">
              {/* Feedback Alert */}
              {feedback && (
                <div className={`p-3 rounded-xl border flex items-center gap-2 text-xs ${
                  feedback.type === 'success' 
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' 
                    : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                }`}>
                  {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                  <span>{feedback.message}</span>
                </div>
              )}

              {/* Camera Tab */}
              {activeTab === 'camera' && (
                <div className="space-y-3">
                  <div className="relative aspect-square max-h-[260px] w-full mx-auto rounded-2xl overflow-hidden bg-black border border-white/10 flex items-center justify-center">
                    <video 
                      ref={videoRef} 
                      className="w-full h-full object-cover" 
                      playsInline 
                      muted 
                    />

                    {/* Viewfinder Overlay with Neon Target Corners */}
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div className="relative w-44 h-44 border-2 border-brand-400/40 rounded-2xl">
                        {/* Target Corners */}
                        <div className="absolute -top-1 -left-1 w-5 h-5 border-t-3 border-l-3 border-brand-400 rounded-tl-lg" />
                        <div className="absolute -top-1 -right-1 w-5 h-5 border-t-3 border-r-3 border-brand-400 rounded-tr-lg" />
                        <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-3 border-l-3 border-brand-400 rounded-bl-lg" />
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-3 border-r-3 border-brand-400 rounded-br-lg" />

                        {/* Animated Laser Scanning Line */}
                        <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-brand-400 to-transparent shadow-[0_0_8px_#38bdf8] animate-[bounce_2s_infinite]" />
                      </div>
                    </div>

                    {isProcessing && (
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-2 text-white">
                        <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
                        <span className="text-xs font-semibold">Adding playlist...</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                    <span>Center the QR code in the frame to scan</span>
                    <button
                      onClick={handleToggleFacingMode}
                      className="px-2.5 py-1 rounded-lg bg-surface-800 hover:bg-surface-750 text-slate-300 hover:text-white flex items-center gap-1 transition-colors"
                      title="Flip camera"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Flip</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Upload Tab */}
              {activeTab === 'upload' && (
                <div className="space-y-3">
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-white/10 hover:border-brand-500/50 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-surface-850/50 hover:bg-surface-850 space-y-2"
                  >
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileUpload} 
                      accept="image/*" 
                      className="hidden" 
                    />
                    <div className="w-12 h-12 rounded-2xl bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center mx-auto">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">Click to Upload or Drag QR Image</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">PNG, JPG, or Screenshot of shared QR code</p>
                    </div>
                  </div>

                  {cameraError && (
                    <p className="text-[11px] text-amber-400/90 bg-amber-400/10 p-2.5 rounded-xl border border-amber-400/20">
                      💡 {cameraError}
                    </p>
                  )}
                </div>
              )}

              {/* Manual Link / Code Tab */}
              {activeTab === 'manual' && (
                <form onSubmit={handleManualSubmit} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Share Link or QR Token:
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. st-workout-energy or http://localhost:5173/?shareToken=..."
                      value={manualCode}
                      onChange={e => setManualCode(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-surface-800 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isProcessing || !manualCode.trim()}
                    className="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-lg shadow-brand-500/20"
                  >
                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    <span>Add to Library</span>
                  </button>
                </form>
              )}

              {/* Sample Shared Playlists for 1-Click Verification / Testing */}
              <div className="pt-2 border-t border-white/5 space-y-2">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
                  <Sparkles className="w-3.5 h-3.5 text-brand-400" />
                  <span>Available Shared Playlists (1-Click Test):</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { label: 'Morning Motivation', token: 'st-morning-motivation' },
                    { label: 'Instrumentals Flow', token: 'st-instrumentals' },
                    { label: 'Workout Energy', token: 'st-workout-energy' },
                    { label: 'Retro Favorites', token: 'st-retro-favorites' }
                  ].map(sample => (
                    <button
                      key={sample.token}
                      disabled={isProcessing}
                      onClick={() => handleDetectedCode(sample.token)}
                      className="p-2 rounded-xl bg-surface-800/60 hover:bg-surface-750 border border-white/5 hover:border-brand-500/30 text-left transition-all text-[11px] group"
                    >
                      <p className="font-semibold text-slate-200 group-hover:text-white truncate">{sample.label}</p>
                      <p className="text-[9px] text-slate-500 font-mono truncate">{sample.token}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

