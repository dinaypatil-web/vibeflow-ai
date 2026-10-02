import React, { useEffect, useRef, useState, useCallback } from 'react';
import { usePlayerStore } from '../store/playerStore';
import { api } from '../services/api';

// Global audio analyser export for visualizers
export let globalAudioAnalyser: AnalyserNode | null = null;
export let globalAudioContext: AudioContext | null = null;

export const AudioEngine: React.FC = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ytPlayerRef = useRef<any>(null);
  const [isYtApiLoaded, setIsYtApiLoaded] = useState(false);
  const [isYtReady, setIsYtReady] = useState(false);
  // Tracks whether current YouTube video failed or was switched to audio stream for background/lock-screen playback
  const ytEmbedFailedRef = useRef(false);
  const wakeLockRef = useRef<any>(null);

  const {
    currentTrack,
    isPlaying,
    volume,
    isMuted,
    playbackSpeed,
    seekRequestedTime,
    clearSeekRequest,
    setCurrentTime,
    setDuration,
    setPlaying,
    nextTrack,
    previousTrack,
    seekTo,
    tickSleepTimer,
    sleepTimerRemainingSeconds,
    user
  } = usePlayerStore();

  const getCurrentStreamUrl = (): string | undefined => {
    return usePlayerStore.getState().currentTrack?.streamUrl;
  };

  // 1. Load YouTube IFrame API script once globally
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if ((window as any).YT && (window as any).YT.Player) {
      setIsYtApiLoaded(true);
      return;
    }

    const prevOnReady = (window as any).onYouTubeIframeAPIReady;
    (window as any).onYouTubeIframeAPIReady = () => {
      if (prevOnReady) prevOnReady();
      setIsYtApiLoaded(true);
    };

    if (!document.getElementById('yt-iframe-api-script')) {
      const tag = document.createElement('script');
      tag.id = 'yt-iframe-api-script';
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.async = true;
      document.body.appendChild(tag);
    }
  }, []);

  // 2. Setup Web Audio API Analyser for visualizers + auto-resume protector
  useEffect(() => {
    if (!audioRef.current) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx && !globalAudioContext) {
        globalAudioContext = new AudioCtx();
        const analyser = globalAudioContext.createAnalyser();
        analyser.fftSize = 64;
        globalAudioAnalyser = analyser;

        const source = globalAudioContext.createMediaElementSource(audioRef.current);
        source.connect(analyser);
        analyser.connect(globalAudioContext.destination);

        // Auto-resume if browser suspends context in background
        globalAudioContext.onstatechange = () => {
          if (globalAudioContext?.state === 'suspended' && usePlayerStore.getState().isPlaying) {
            globalAudioContext.resume().catch(() => {});
          }
        };
      }
    } catch (e) {
      // Audio element might already be connected
    }
  }, []);

  // 3. Screen Wake Lock API — keeps audio thread uninterrupted
  const requestWakeLock = useCallback(async () => {
    if (typeof navigator !== 'undefined' && 'wakeLock' in navigator && !wakeLockRef.current) {
      try {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        wakeLockRef.current.addEventListener('release', () => {
          wakeLockRef.current = null;
        });
      } catch {}
    }
  }, []);

  const releaseWakeLock = useCallback(() => {
    if (wakeLockRef.current) {
      try {
        wakeLockRef.current.release();
      } catch {}
      wakeLockRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (isPlaying) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }
    return () => releaseWakeLock();
  }, [isPlaying, requestWakeLock, releaseWakeLock]);

  // 4. Media Session API — Lock Screen & Notification Center Playback Controls
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator) || !currentTrack) return;

    try {
      const artworkSizes = [96, 128, 192, 256, 384, 512];
      const artwork = artworkSizes.map(size => ({
        src: currentTrack.thumbnail || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=512&q=80',
        sizes: `${size}x${size}`,
        type: 'image/jpeg'
      }));

      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title || 'VibeFlow Track',
        artist: currentTrack.artist || 'VibeFlow AI',
        album: currentTrack.genre || 'VibeFlow Playlist',
        artwork
      });

      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';

      // Lock Screen Action Handlers
      navigator.mediaSession.setActionHandler('play', () => {
        setPlaying(true);
      });

      navigator.mediaSession.setActionHandler('pause', () => {
        setPlaying(false);
      });

      navigator.mediaSession.setActionHandler('previoustrack', () => {
        previousTrack();
      });

      navigator.mediaSession.setActionHandler('nexttrack', () => {
        // Trigger continuous advance
        onEnded();
      });

      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined && details.seekTime !== null) {
          seekTo(details.seekTime);
        }
      });

      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        const skip = details.seekOffset || 10;
        const cur = usePlayerStore.getState().currentTime;
        seekTo(Math.max(0, cur - skip));
      });

      navigator.mediaSession.setActionHandler('seekforward', (details) => {
        const skip = details.seekOffset || 10;
        const cur = usePlayerStore.getState().currentTime;
        const dur = usePlayerStore.getState().duration;
        seekTo(Math.min(dur || 999999, cur + skip));
      });

      navigator.mediaSession.setActionHandler('stop', () => {
        setPlaying(false);
      });
    } catch (e) {
      console.warn('[AudioEngine] MediaSession configuration warning:', e);
    }
  }, [currentTrack?.id, isPlaying, setPlaying, previousTrack, seekTo]);

  // Update MediaSession Position State for lock-screen scrubber
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator) || !('setPositionState' in navigator.mediaSession)) return;
    if (!currentTrack) return;

    try {
      const dur = usePlayerStore.getState().duration;
      const cur = usePlayerStore.getState().currentTime;
      if (typeof dur === 'number' && dur > 0 && typeof cur === 'number' && cur >= 0 && cur <= dur) {
        navigator.mediaSession.setPositionState({
          duration: Math.round(dur),
          playbackRate: playbackSpeed || 1.0,
          position: Math.min(Math.round(cur), Math.round(dur))
        });
      }
    } catch {}
  }, [playbackSpeed]);

  // 5. Background / Minimized / Lock Screen Continuity Manager
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const handleVisibilityChange = () => {
      const state = usePlayerStore.getState();
      if (!state.isPlaying || !state.currentTrack) return;

      if (document.hidden) {
        // Screen locked or tab minimized:
        // If current track is playing via YouTube video iframe, browsers will pause the iframe.
        // Transfer playback seamlessly to HTML5 pure audio stream so music continues playing uninterrupted!
        if (state.currentTrack.provider === 'youtube' && !ytEmbedFailedRef.current) {
          const fallbackUrl = state.currentTrack.streamUrl;
          if (fallbackUrl && audioRef.current) {
            try {
              let curTime = 0;
              if (ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === 'function') {
                curTime = ytPlayerRef.current.getCurrentTime() || 0;
                ytPlayerRef.current.pauseVideo();
              }
              ytEmbedFailedRef.current = true;
              audioRef.current.src = fallbackUrl;
              audioRef.current.currentTime = curTime;
              audioRef.current.play().catch(() => {});
            } catch {}
          }
        }

        // Keep Web Audio API Context active in background
        if (globalAudioContext && globalAudioContext.state === 'suspended') {
          globalAudioContext.resume().catch(() => {});
        }
      } else {
        // Tab brought back into view: re-acquire wake lock if playing
        if (state.isPlaying) {
          requestWakeLock();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handleVisibilityChange);
    };
  }, [requestWakeLock]);

  // 6. Sleep timer interval
  useEffect(() => {
    if (sleepTimerRemainingSeconds === null) return;
    const interval = setInterval(() => {
      tickSleepTimer();
    }, 1000);
    return () => clearInterval(interval);
  }, [sleepTimerRemainingSeconds, tickSleepTimer]);

  // Reset embed-failed flag when track changes
  useEffect(() => {
    ytEmbedFailedRef.current = false;
  }, [currentTrack?.id]);

  // 7. Initialize or update YouTube Player
  useEffect(() => {
    if (!isYtApiLoaded || !currentTrack) return;

    if (currentTrack.provider === 'youtube') {
      // Pause HTML5 audio when switching to YouTube video track
      if (audioRef.current) audioRef.current.pause();

      if (ytPlayerRef.current && isYtReady) {
        try {
          ytPlayerRef.current.loadVideoById(currentTrack.providerId);
          ytPlayerRef.current.setVolume(isMuted ? 0 : volume * 100);
          ytPlayerRef.current.setPlaybackRate(playbackSpeed);
          if (isPlaying) {
            ytPlayerRef.current.playVideo();
          } else {
            ytPlayerRef.current.pauseVideo();
          }
        } catch (e) {
          console.warn('Error loading video on existing YT player:', e);
        }
      } else if (!ytPlayerRef.current) {
        try {
          const YT = (window as any).YT;
          ytPlayerRef.current = new YT.Player('vf-yt-player-slot', {
            videoId: currentTrack.providerId,
            width: '320',
            height: '240',
            playerVars: {
              autoplay: isPlaying ? 1 : 0,
              controls: 0,
              disablekb: 1,
              fs: 0,
              rel: 0,
              playsinline: 1,
              origin: window.location.origin
            },
            events: {
              onReady: (event: any) => {
                setIsYtReady(true);
                event.target.setVolume(isMuted ? 0 : volume * 100);
                event.target.setPlaybackRate(playbackSpeed);
                if (isPlaying) {
                  event.target.playVideo();
                }
              },
              onStateChange: (event: any) => {
                const YTState = (window as any).YT.PlayerState;
                if (event.data === YTState.PLAYING) {
                  setPlaying(true);
                  const dur = event.target.getDuration();
                  if (dur && dur > 0) setDuration(dur);
                } else if (event.data === YTState.PAUSED) {
                  // If browser paused YouTube iframe because screen was locked or minimised:
                  // seamlessly switch to audio stream without stopping the music!
                  const curState = usePlayerStore.getState();
                  if (curState.isPlaying && document.hidden && curState.currentTrack?.streamUrl) {
                    const curTime = event.target.getCurrentTime() || 0;
                    ytEmbedFailedRef.current = true;
                    if (audioRef.current) {
                      audioRef.current.src = curState.currentTrack.streamUrl;
                      audioRef.current.currentTime = curTime;
                      audioRef.current.play().catch(() => {});
                    }
                  }
                } else if (event.data === YTState.ENDED) {
                  onEnded();
                }
              },
              onError: (event: any) => {
                console.warn('YouTube Player error code:', event.data);
                if (event.data === 101 || event.data === 150 || event.data === 100) {
                  const fallbackUrl = getCurrentStreamUrl();
                  if (fallbackUrl && audioRef.current) {
                    ytEmbedFailedRef.current = true;
                    audioRef.current.src = fallbackUrl;
                    audioRef.current.load();
                    if (globalAudioContext && globalAudioContext.state === 'suspended') {
                      globalAudioContext.resume().catch(() => {});
                    }
                    audioRef.current.play().catch(e => console.warn('Fallback stream play error:', e));
                  } else {
                    onEnded();
                  }
                }
              }
            }
          });
        } catch (e) {
          console.warn('Failed to construct YT.Player:', e);
        }
      }
    } else {
      if (ytPlayerRef.current && isYtReady) {
        try {
          ytPlayerRef.current.pauseVideo();
        } catch (e) {}
      }
    }
  }, [currentTrack?.id, isYtApiLoaded]);

  // 8. Handle Play / Pause State synchronization
  useEffect(() => {
    if (!currentTrack) return;

    const isYtEmbedFallback = currentTrack.provider === 'youtube' && ytEmbedFailedRef.current;

    if (currentTrack.provider === 'youtube' && !isYtEmbedFallback) {
      if (ytPlayerRef.current && isYtReady) {
        try {
          if (isPlaying) {
            ytPlayerRef.current.playVideo();
          } else {
            ytPlayerRef.current.pauseVideo();
          }
        } catch (e) {
          console.warn('Error toggling YT play/pause:', e);
        }
      }
    } else {
      const audio = audioRef.current;
      if (!audio) return;

      const streamUrlToUse = currentTrack.streamUrl;

      if (!isYtEmbedFallback && streamUrlToUse) {
        try {
          const currentSrc = decodeURIComponent(audio.src);
          const targetSrc = decodeURIComponent(streamUrlToUse);
          if (currentSrc !== targetSrc) {
            audio.src = streamUrlToUse;
            audio.load();
          }
        } catch {
          audio.src = streamUrlToUse;
          audio.load();
        }
      }

      if (streamUrlToUse || isYtEmbedFallback) {
        if (isPlaying) {
          if (globalAudioContext && globalAudioContext.state === 'suspended') {
            globalAudioContext.resume().catch(() => {});
          }
          audio.play().catch(err => {
            console.warn('Autoplay prevented or stream error:', err);
          });
        } else {
          audio.pause();
        }
      }
    }
  }, [isPlaying, isYtReady, currentTrack?.id]);

  // 9. Automatic Spotify Full-Track Stream Bridge
  useEffect(() => {
    if (!currentTrack || currentTrack.provider !== 'spotify') return;
    const isPreview = (
      currentTrack.duration <= 35 ||
      currentTrack.streamUrl?.includes('preview') ||
      currentTrack.streamUrl?.includes('p.scdn.co') ||
      currentTrack.streamUrl?.includes('open.spotify.com')
    );
    if (isPreview) {
      fetch(`/api/media/resolve-stream?title=${encodeURIComponent(currentTrack.title)}&artist=${encodeURIComponent(currentTrack.artist)}`)
        .then(r => r.json())
        .then(data => {
          if (data?.streamUrl && data.streamUrl !== currentTrack.streamUrl && data.streamUrl.startsWith('http')) {
            console.log('[AudioEngine] Bridged Spotify track to full-length audio stream:', data.streamUrl);
            currentTrack.streamUrl = data.streamUrl;
            if (data.duration && data.duration > 35) {
              currentTrack.duration = data.duration;
              setDuration(data.duration);
            }
            if (audioRef.current) {
              audioRef.current.src = data.streamUrl;
              audioRef.current.load();
              if (isPlaying) {
                audioRef.current.play().catch(e => console.warn('Stream play warning:', e));
              }
            }
          }
        })
        .catch(err => console.warn('Spotify stream resolution failed:', err));
    }
  }, [currentTrack?.id]);

  // 10. Handle Volume, Mute & Playback Speed
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
      audioRef.current.playbackRate = playbackSpeed;
    }
    if (ytPlayerRef.current && isYtReady) {
      try {
        ytPlayerRef.current.setVolume(isMuted ? 0 : volume * 100);
        ytPlayerRef.current.setPlaybackRate(playbackSpeed);
      } catch (e) {}
    }
  }, [volume, isMuted, playbackSpeed, isYtReady]);

  // 11. Handle Seeking
  useEffect(() => {
    if (seekRequestedTime === null) return;

    const isYtEmbedFallback = currentTrack?.provider === 'youtube' && ytEmbedFailedRef.current;

    if (currentTrack?.provider === 'youtube' && !isYtEmbedFallback) {
      if (ytPlayerRef.current && isYtReady) {
        try {
          ytPlayerRef.current.seekTo(seekRequestedTime, true);
        } catch (e) {}
      }
    } else if (audioRef.current) {
      audioRef.current.currentTime = seekRequestedTime;
    }
    clearSeekRequest();
  }, [seekRequestedTime, clearSeekRequest, currentTrack?.provider, isYtReady]);

  // 12. Time ticker for YouTube player
  useEffect(() => {
    if (!isPlaying || currentTrack?.provider !== 'youtube' || !isYtReady) return;
    if (ytEmbedFailedRef.current) return;

    const interval = setInterval(() => {
      if (ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === 'function') {
        try {
          const curTime = ytPlayerRef.current.getCurrentTime();
          const dur = ytPlayerRef.current.getDuration();
          if (typeof curTime === 'number' && !isNaN(curTime)) {
            setCurrentTime(curTime);
          }
          if (typeof dur === 'number' && dur > 0 && !isNaN(dur)) {
            setDuration(dur);
          }
        } catch (e) {}
      }
    }, 250);

    return () => clearInterval(interval);
  }, [isPlaying, currentTrack?.provider, isYtReady, setCurrentTime, setDuration]);

  // 13. HTML5 Audio event listeners
  const onTimeUpdate = () => {
    if (audioRef.current) {
      if (currentTrack?.provider !== 'youtube' || ytEmbedFailedRef.current) {
        setCurrentTime(audioRef.current.currentTime);
      }
    }
  };

  const onLoadedMetadata = () => {
    if (audioRef.current && audioRef.current.duration) {
      if (currentTrack?.provider !== 'youtube' || ytEmbedFailedRef.current) {
        setDuration(audioRef.current.duration);
      }
    }
  };

  const onAudioError = (e: React.SyntheticEvent<HTMLAudioElement, Event>) => {
    const mediaError = (e.target as HTMLAudioElement).error;
    console.warn('HTML5 Audio playback error:', mediaError?.code, mediaError?.message);
    setTimeout(() => {
      onEnded();
    }, 2000);
  };

  // 14. Seamless Continuous Playlist Track Transition
  // Executed synchronously within onEnded so mobile OS / background tabs do NOT block autoplay!
  const onEnded = () => {
    const state = usePlayerStore.getState();
    const current = state.currentTrack;
    if (current && state.user) {
      api.recordHistory(state.user.id, current.id, Math.floor(current.duration), 1.0);
    }

    const nextData = state.getNextTrack();
    if (nextData && nextData.track) {
      const next = nextData.track;

      // CRITICAL: Synchronously load and trigger play on audio element
      // while still inside the user-authorized 'ended' event context.
      // This bypasses browser background autoplay restrictions on locked/minimized devices!
      const audio = audioRef.current;
      if (audio) {
        const streamUrl = next.streamUrl;
        if (streamUrl) {
          audio.src = streamUrl;
          audio.currentTime = 0;
          if (globalAudioContext && globalAudioContext.state === 'suspended') {
            globalAudioContext.resume().catch(() => {});
          }
          audio.play().catch(e => {
            console.warn('[AudioEngine] Seamless background track play caught:', e);
          });
        }
      }

      // Advance queue state in store
      state.nextTrack();
    } else {
      usePlayerStore.setState({ isPlaying: false });
    }
  };

  return (
    <div
      id="vf-audio-engine-mount"
      className="fixed -bottom-[9999px] -right-[9999px] w-[320px] h-[240px] opacity-0 pointer-events-none z-[-99]"
      style={{ position: 'fixed', bottom: '-9999px', right: '-9999px', width: '320px', height: '240px' }}
      aria-hidden="true"
    >
      {/* HTML5 Audio Player with background audio capability */}
      <audio
        ref={audioRef}
        crossOrigin="anonymous"
        playsInline
        preload="auto"
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMetadata}
        onEnded={onEnded}
        onError={onAudioError}
      />

      {/* Target DOM element for YouTube IFrame API Player */}
      <div id="vf-yt-player-slot" />
    </div>
  );
};
