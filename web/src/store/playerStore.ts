import { create } from 'zustand';
import { MediaItem, User } from '../types';

export type TabType = 'home' | 'search' | 'explore' | 'playlists' | 'library' | 'ai-studio' | 'settings';
export type RepeatMode = 'off' | 'all' | 'one';

const LS_TOKEN = 'vibeflow_token';
const LS_USER  = 'vibeflow_user';
const LS_FAVS  = (userId: string) => `vibeflow_favs_${userId}`;

function loadPersisted() {
  try {
    const token = localStorage.getItem(LS_TOKEN);
    const userRaw = localStorage.getItem(LS_USER);
    const user: User | null = userRaw ? JSON.parse(userRaw) : null;
    const favs: string[] = user
      ? JSON.parse(localStorage.getItem(LS_FAVS(user.id)) || '[]')
      : [];
    return { token, user, favorites: favs };
  } catch {
    return { token: null, user: null, favorites: [] };
  }
}

const persisted = loadPersisted();

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
  authLoading: boolean;
  authError: string | null;

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
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  loginDemo: () => Promise<void>;
  logout: () => void;
  clearAuthError: () => void;
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
  favorites: persisted.favorites,
  user: persisted.user,
  token: persisted.token,
  seekRequestedTime: null,
  authLoading: false,
  authError: null,

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
    set(state => ({ queue: [...state.queue, track] }));
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
      set({ sleepTimerMinutes: minutes, sleepTimerRemainingSeconds: minutes * 60 });
    }
  },

  tickSleepTimer: () => {
    const rem = get().sleepTimerRemainingSeconds;
    if (rem === null) return;
    if (rem <= 1) {
      set({ isPlaying: false, sleepTimerMinutes: null, sleepTimerRemainingSeconds: null });
    } else {
      set({ sleepTimerRemainingSeconds: rem - 1 });
    }
  },

  toggleFavorite: (trackId) => {
    set(state => {
      const exists = state.favorites.includes(trackId);
      const newFavs = exists
        ? state.favorites.filter(id => id !== trackId)
        : [...state.favorites, trackId];
      if (state.user) {
        localStorage.setItem(LS_FAVS(state.user.id), JSON.stringify(newFavs));
      }
      return { favorites: newFavs };
    });
  },

  setUser: (user, token) => {
    if (user && token) {
      localStorage.setItem(LS_TOKEN, token);
      localStorage.setItem(LS_USER, JSON.stringify(user));
      const favs: string[] = JSON.parse(localStorage.getItem(LS_FAVS(user.id)) || '[]');
      set({ user, token, favorites: favs });
    } else {
      localStorage.removeItem(LS_TOKEN);
      localStorage.removeItem(LS_USER);
      set({ user: null, token: null, favorites: [] });
    }
  },

  login: async (email, password) => {
    set({ authLoading: true, authError: null });
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      get().setUser(data.user, data.token);
      set({ authLoading: false });
    } catch (err: any) {
      set({ authLoading: false, authError: err.message || 'Login failed' });
      throw err;
    }
  },

  register: async (name, email, password) => {
    set({ authLoading: true, authError: null });
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      get().setUser(data.user, data.token);
      set({ authLoading: false });
    } catch (err: any) {
      set({ authLoading: false, authError: err.message || 'Registration failed' });
      throw err;
    }
  },

  loginDemo: async () => {
    set({ authLoading: true, authError: null });
    try {
      const res = await fetch('/api/auth/demo', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Demo login failed');
      get().setUser(data.user, data.token);
      set({ authLoading: false });
    } catch (err: any) {
      set({ authLoading: false, authError: err.message || 'Demo login failed' });
    }
  },

  logout: () => {
    localStorage.removeItem(LS_TOKEN);
    localStorage.removeItem(LS_USER);
    set({ user: null, token: null, favorites: [], activeTab: 'home' });
  },

  clearAuthError: () => set({ authError: null }),
}));
