import React, { useEffect, useRef, useState } from 'react';
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
  // Tracks whether the current YouTube video failed to embed so we fall back to streamUrl
  const ytEmbedFailedRef = useRef(false);

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
    tickSleepTimer,
    sleepTimerRemainingSeconds,
    user
  } = usePlayerStore();

  // Helper: reads store directly so it is always fresh inside YT event callbacks (avoids stale closures)
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

  // 2. Setup Web Audio API Analyser for dynamic canvas waveforms
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
      }
    } catch (e) {
      // Audio element might already be connected
    }
  }, []);

  // 3. Sleep timer interval
  useEffect(() => {
    if (sleepTimerRemainingSeconds === null) return;
    const interval = setInterval(() => {
      tickSleepTimer();
    }, 1000);
    return () => clearInterval(interval);
  }, [sleepTimerRemainingSeconds, tickSleepTimer]);

  // 3b. Reset embed-failed flag whenever the track changes
  useEffect(() => {
    ytEmbedFailedRef.current = false;
  }, [currentTrack?.id]);

  // 4. Initialize or update YouTube Player
  useEffect(() => {
    if (!isYtApiLoaded || !currentTrack) return;

    if (currentTrack.provider === 'youtube') {
      // Pause HTML5 audio when switching to a YouTube track
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
                  // User paused inside player
                } else if (event.data === YTState.ENDED) {
                  onEnded();
                }
              },
              onError: (event: any) => {
                console.warn('YouTube Player error code:', event.data);
                // Codes 100/101/150: video unavailable or embedding blocked by copyright
                if (event.data === 101 || event.data === 150 || event.data === 100) {
                  const fallbackUrl = getCurrentStreamUrl();
                  if (fallbackUrl && audioRef.current) {
                    console.info('YouTube embed blocked - falling back to streamUrl:', fallbackUrl);
                    ytEmbedFailedRef.current = true;
                    audioRef.current.src = fallbackUrl;
                    audioRef.current.load();
                    if (globalAudioContext && globalAudioContext.state === 'suspended') {
                      globalAudioContext.resume();
                    }
                    audioRef.current.play().catch(e => console.warn('Fallback stream play error:', e));
                  } else {
                    console.warn('No fallback streamUrl - skipping to next track');
                    nextTrack();
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
      // Pause YouTube player if active
      if (ytPlayerRef.current && isYtReady) {
        try {
          ytPlayerRef.current.pauseVideo();
        } catch (e) {}
      }
    }
  }, [currentTrack?.id, isYtApiLoaded]);

  // 5. Handle Play / Pause State synchronization
  useEffect(() => {
    if (!currentTrack) return;

    // If YouTube embed failed, the HTML5 audio element has already taken over.
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
      // HTML5 audio path (native tracks OR YouTube embed-blocked fallback)
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
            globalAudioContext.resume();
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

  // 5b. Automatic Spotify Full-Track Stream Bridge
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
            console.log('[AudioEngine] Bridged Spotify track to verified full-length audio stream:', data.streamUrl);
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

  // 6. Handle Volume, Mute & Playback Speed
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

  // 7. Handle Seeking
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

  // 8. Time ticker for YouTube player
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

  // 9. HTML5 Audio event listeners
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
    // 800ms was too aggressive - give stream 2.5s to recover before auto-advancing
    setTimeout(() => {
      nextTrack();
    }, 2500);
  };

  const onEnded = () => {
    if (currentTrack && user) {
      api.recordHistory(user.id, currentTrack.id, Math.floor(currentTrack.duration), 1.0);
    }
    nextTrack();
  };

  return (
    <div
      id="vf-audio-engine-mount"
      className="fixed -bottom-[9999px] -right-[9999px] w-[320px] h-[240px] opacity-0 pointer-events-none z-[-99]"
      style={{ position: 'fixed', bottom: '-9999px', right: '-9999px', width: '320px', height: '240px' }}
      aria-hidden="true"
    >
      {/* HTML5 Audio Player */}
      <audio
        ref={audioRef}
        crossOrigin="anonymous"
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
