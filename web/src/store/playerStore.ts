import { create } from 'zustand';
import { MediaItem, User } from '../types';

export type TabType = 'home' | 'explore' | 'playlists' | 'library' | 'ai-studio' | 'settings';
export type RepeatMode = 'off' | 'all' | 'one';

interface PlayerState {
  currentTrack: MediaItem | null;
  isPlaying: boolean;
  queue: MediaItem[];
  queueIndex: number;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  playbackSpeed: number;
  repeatMode: RepeatMode;
  isShuffle: boolean;
  isNowPlayingOpen: boolean;
  activeTab: TabType;
  sleepTimerMinutes: number | null;
  sleepTimerRemainingSeconds: number | null;
  favorites: string[];
  user: User | null;
  token: string | null;
  seekRequestedTime: number | null;

  // Actions
  playTrack: (track: MediaItem, newQueue?: MediaItem[]) => void;
  togglePlay: () => void;
  setPlaying: (isPlaying: boolean) => void;
  nextTrack: () => void;
  previousTrack: () => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  seekTo: (time: number) => void;
  clearSeekRequest: () => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  setPlaybackSpeed: (speed: number) => void;
  toggleShuffle: () => void;
  cycleRepeatMode: () => void;
  addToQueue: (track: MediaItem) => void;
  removeFromQueue: (index: number) => void;
  setNowPlayingOpen: (open: boolean) => void;
  setActiveTab: (tab: TabType) => void;
  setSleepTimer: (minutes: number | null) => void;
  tickSleepTimer: () => void;
  toggleFavorite: (trackId: string) => void;
  setUser: (user: User | null, token: string | null) => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentTrack: null,
  isPlaying: false,
  queue: [],
  queueIndex: -1,
  currentTime: 0,
  duration: 0,
  volume: 0.85,
  isMuted: false,
  playbackSpeed: 1.0,
  repeatMode: 'all',
  isShuffle: false,
  isNowPlayingOpen: false,
  activeTab: 'home',
  sleepTimerMinutes: null,
  sleepTimerRemainingSeconds: null,
  favorites: ['track-1', 'track-3'],
  user: {
    id: 'demo-user-id',
    email: 'demo@vibeflow.ai',
    name: 'Aarav Sharma',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    role: 'user',
    createdAt: new Date().toISOString()
  },
  token: 'demo-token',
  seekRequestedTime: null,

  playTrack: (track, newQueue) => {
    let queue = get().queue;
    let queueIndex = get().queueIndex;

    if (newQueue && newQueue.length > 0) {
      queue = newQueue;
      queueIndex = queue.findIndex(t => t.id === track.id);
      if (queueIndex === -1) {
        queue = [track, ...queue];
        queueIndex = 0;
      }
    } else {
      if (queue.length === 0) {
        queue = [track];
        queueIndex = 0;
      } else {
        const found = queue.findIndex(t => t.id === track.id);
        if (found !== -1) {
          queueIndex = found;
        } else {
          queue = [...queue, track];
          queueIndex = queue.length - 1;
        }
      }
    }

    set({
      currentTrack: track,
      isPlaying: true,
      queue,
      queueIndex,
      currentTime: 0,
      duration: track.duration || 0
    });
  },

  togglePlay: () => {
    const { currentTrack, isPlaying, queue } = get();
    if (!currentTrack && queue.length > 0) {
      get().playTrack(queue[0]);
      return;
    }
    set({ isPlaying: !isPlaying });
  },

  setPlaying: (isPlaying) => set({ isPlaying }),

  nextTrack: () => {
    const { queue, queueIndex, isShuffle, repeatMode } = get();
    if (queue.length === 0) return;

    if (repeatMode === 'one') {
      set({ currentTime: 0, isPlaying: true, seekRequestedTime: 0 });
      return;
    }

    let nextIndex = queueIndex + 1;
    if (isShuffle) {
      nextIndex = Math.floor(Math.random() * queue.length);
    } else if (nextIndex >= queue.length) {
      if (repeatMode === 'all') {
        nextIndex = 0;
      } else {
        set({ isPlaying: false });
        return;
      }
    }

    const nextTrack = queue[nextIndex];
    if (nextTrack) {
      set({
        currentTrack: nextTrack,
        queueIndex: nextIndex,
        isPlaying: true,
        currentTime: 0,
        duration: nextTrack.duration || 0
      });
    }
  },

  previousTrack: () => {
    const { queue, queueIndex, currentTime } = get();
    if (currentTime > 3) {
      set({ currentTime: 0, seekRequestedTime: 0 });
      return;
    }

    if (queue.length === 0) return;
    let prevIndex = queueIndex - 1;
    if (prevIndex < 0) prevIndex = queue.length - 1;

    const prevTrack = queue[prevIndex];
    if (prevTrack) {
      set({
        currentTrack: prevTrack,
        queueIndex: prevIndex,
        isPlaying: true,
        currentTime: 0,
        duration: prevTrack.duration || 0
      });
    }
  },

  setCurrentTime: (time) => set({ currentTime: time }),
  setDuration: (duration) => set({ duration }),
  seekTo: (time) => set({ seekRequestedTime: time, currentTime: time }),
  clearSeekRequest: () => set({ seekRequestedTime: null }),

  setVolume: (volume) => set({ volume, isMuted: volume === 0 }),
  toggleMute: () => {
    const { isMuted, volume } = get();
    set({ isMuted: !isMuted, volume: !isMuted ? 0 : (volume > 0 ? volume : 0.8) });
  },

  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),
  toggleShuffle: () => set(state => ({ isShuffle: !state.isShuffle })),
  cycleRepeatMode: () => {
    const modes: RepeatMode[] = ['off', 'all', 'one'];
    const current = get().repeatMode;
    const nextIdx = (modes.indexOf(current) + 1) % modes.length;
    set({ repeatMode: modes[nextIdx] });
  },

  addToQueue: (track) => {
    set(state => ({
      queue: [...state.queue, track]
    }));
  },

  removeFromQueue: (index) => {
    set(state => {
      const newQueue = [...state.queue];
      newQueue.splice(index, 1);
      let newIndex = state.queueIndex;
      if (index < state.queueIndex) {
        newIndex--;
      } else if (index === state.queueIndex && index >= newQueue.length) {
        newIndex = Math.max(0, newQueue.length - 1);
      }
      return { queue: newQueue, queueIndex: newIndex };
    });
  },

  setNowPlayingOpen: (open) => set({ isNowPlayingOpen: open }),
  setActiveTab: (tab) => set({ activeTab: tab }),

  setSleepTimer: (minutes) => {
    if (minutes === null) {
      set({ sleepTimerMinutes: null, sleepTimerRemainingSeconds: null });
    } else {
      set({
        sleepTimerMinutes: minutes,
        sleepTimerRemainingSeconds: minutes * 60
      });
    }
  },

  tickSleepTimer: () => {
    const rem = get().sleepTimerRemainingSeconds;
    if (rem === null) return;
    if (rem <= 1) {
      set({
        isPlaying: false,
        sleepTimerMinutes: null,
        sleepTimerRemainingSeconds: null
      });
    } else {
      set({ sleepTimerRemainingSeconds: rem - 1 });
    }
  },

  toggleFavorite: (trackId) => {
    set(state => {
      const exists = state.favorites.includes(trackId);
      return {
        favorites: exists
          ? state.favorites.filter(id => id !== trackId)
          : [...state.favorites, trackId]
      };
    });
  },

  setUser: (user, token) => set({ user, token })
}));
