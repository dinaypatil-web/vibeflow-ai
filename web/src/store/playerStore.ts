import { create } from 'zustand';
import { 
  MediaItem, 
  User, 
  UserPreferences, 
  SourceAccount, 
  AppTheme, 
  OfflineTrack,
  PlayingModeId,
  SpatialMode,
  PersistedEqualizerState,
  EQ_PRESETS
} from '../types';
import { api, API_BASE } from '../services/api';
import { offlineStorage } from '../services/offlineStorage';

export type TabType = 'home' | 'search' | 'explore' | 'playlists' | 'library' | 'ai-studio' | 'settings';
export type RepeatMode = 'off' | 'all' | 'one';

export interface SavedCredential {
  userId?: string;
  identifier: string; // username or email
  email: string;
  username: string;
  name: string;
  password?: string;
  rememberMe: boolean;
  savedAt: string;
}

const LS_TOKEN = 'vibeflow_token';
const LS_USER  = 'vibeflow_user';
const LS_FAVS  = (userId: string) => `vibeflow_favs_${userId}`;
const LS_SPOTIFY = 'vibeflow_spotify_account';
const LS_THEME = 'vibeflow_theme';
const LS_SAVED_CREDS = 'vibeflow_saved_credentials';
const LS_SAVED_ACCOUNTS = 'vibeflow_saved_accounts';
const LS_LOCAL_USERS = 'vibeflow_local_users';
const LS_PLAYBACK_STATE = 'vibeflow_playback_state';
const LS_PLAYBACK_QUEUE = 'vibeflow_playback_queue';
const LS_EQUALIZER = 'vibeflow_equalizer';

export function saveEqualizerStateWeb(eq: PersistedEqualizerState) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(LS_EQUALIZER, JSON.stringify(eq));
  } catch {}
}

export interface PersistedPlaybackState {
  currentTrack: MediaItem;
  currentTime: number;
  queueIndex: number;
  wasPlaying: boolean;
  savedAt: number;
}

let lastPersistedTime = 0;
export function savePlaybackStateWeb(
  track: MediaItem | null,
  currentTime: number,
  queue: MediaItem[] = [],
  queueIndex: number = -1,
  isPlaying: boolean = false
) {
  if (typeof localStorage === 'undefined') return;
  try {
    if (!track) {
      localStorage.removeItem(LS_PLAYBACK_STATE);
      return;
    }
    const statePayload: PersistedPlaybackState = {
      currentTrack: track,
      currentTime: Math.max(0, Math.round(currentTime)),
      queueIndex: Math.max(0, queueIndex),
      wasPlaying: isPlaying,
      savedAt: Date.now()
    };
    localStorage.setItem(LS_PLAYBACK_STATE, JSON.stringify(statePayload));
    if (Array.isArray(queue) && queue.length > 0) {
      localStorage.setItem(LS_PLAYBACK_QUEUE, JSON.stringify(queue.slice(0, 50)));
    }
  } catch {}
}

export function persistSavedCredentials(cred: SavedCredential): SavedCredential[] {
  try {
    localStorage.setItem(LS_SAVED_CREDS, JSON.stringify(cred));
    const accountsRaw = localStorage.getItem(LS_SAVED_ACCOUNTS) || '[]';
    let accounts: SavedCredential[] = JSON.parse(accountsRaw);
    accounts = accounts.filter(a => 
      a.identifier.toLowerCase() !== cred.identifier.toLowerCase() && 
      (a.email ? a.email.toLowerCase() !== (cred.email || '').toLowerCase() : true) &&
      (a.username ? a.username.toLowerCase() !== (cred.username || '').toLowerCase() : true)
    );
    accounts.unshift(cred);
    if (accounts.length > 8) accounts = accounts.slice(0, 8);
    localStorage.setItem(LS_SAVED_ACCOUNTS, JSON.stringify(accounts));
    return accounts;
  } catch {
    return [cred];
  }
}

function loadPersisted() {
  try {
    const token = localStorage.getItem(LS_TOKEN);
    const userRaw = localStorage.getItem(LS_USER);
    const user: User | null = userRaw ? JSON.parse(userRaw) : null;
    const favs: string[] = user
      ? JSON.parse(localStorage.getItem(LS_FAVS(user.id)) || '[]')
      : [];
    const spotifyRaw = localStorage.getItem(LS_SPOTIFY);
    const spotifyAccount: SourceAccount = spotifyRaw
      ? JSON.parse(spotifyRaw)
      : { provider: 'spotify', connected: false };
    const savedTheme: AppTheme = (localStorage.getItem(LS_THEME) as AppTheme) || 'dark';
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', savedTheme);
    }
    const savedCredsRaw = localStorage.getItem(LS_SAVED_CREDS);
    const savedCredentials: SavedCredential | null = savedCredsRaw ? JSON.parse(savedCredsRaw) : null;
    const savedAccountsRaw = localStorage.getItem(LS_SAVED_ACCOUNTS);
    const savedAccounts: SavedCredential[] = savedAccountsRaw 
      ? JSON.parse(savedAccountsRaw) 
      : (savedCredentials ? [savedCredentials] : []);

    const playbackRaw = localStorage.getItem(LS_PLAYBACK_STATE);
    const playbackState: PersistedPlaybackState | null = playbackRaw ? JSON.parse(playbackRaw) : null;
    const queueRaw = localStorage.getItem(LS_PLAYBACK_QUEUE);
    const playbackQueue: MediaItem[] = queueRaw ? JSON.parse(queueRaw) : [];

    const eqRaw = localStorage.getItem(LS_EQUALIZER);
    const equalizerState: PersistedEqualizerState = eqRaw ? JSON.parse(eqRaw) : {
      enabled: true,
      preset: 'flat',
      bands: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      preamp: 0,
      spatialMode: 'off'
    };

    return { 
      token, 
      user, 
      favorites: favs, 
      spotifyAccount, 
      theme: savedTheme, 
      savedCredentials, 
      savedAccounts,
      playbackState,
      playbackQueue,
      equalizerState
    };
  } catch {
    return { 
      token: null, 
      user: null, 
      favorites: [], 
      spotifyAccount: { provider: 'spotify' as const, connected: false }, 
      theme: 'dark' as AppTheme,
      savedCredentials: null,
      savedAccounts: [],
      playbackState: null,
      playbackQueue: [],
      equalizerState: {
        enabled: true,
        preset: 'flat' as PlayingModeId,
        bands: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        preamp: 0,
        spatialMode: 'off' as SpatialMode
      }
    };
  }
}

export const persisted = loadPersisted();

interface PlayerState {
  currentTrack: MediaItem | null;
  isPlaying: boolean;
  autoplayBlocked: boolean;
  setAutoplayBlocked: (blocked: boolean) => void;
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
  isVideoTabActive: boolean;
  activeTab: TabType;
  sleepTimerMinutes: number | null;
  sleepTimerRemainingSeconds: number | null;
  favorites: string[];
  user: User | null;
  token: string | null;
  seekRequestedTime: number | null;
  authLoading: boolean;
  authError: string | null;
  savedCredentials: SavedCredential | null;
  savedAccounts: SavedCredential[];
  isSpotifyConnectModalOpen: boolean;
  spotifyAccount: SourceAccount;
  theme: AppTheme;

  // Download Modal & Offline Tracks
  downloadModalTrack: MediaItem | null;
  isDownloadModalOpen: boolean;
  offlineTracks: OfflineTrack[];
  offlineStorageStats: { totalBytes: number; count: number };
  openDownloadModal: (track: MediaItem) => void;
  closeDownloadModal: () => void;
  loadOfflineTracks: () => Promise<void>;
  removeOfflineTrack: (id: string) => Promise<void>;
  clearOfflineStorage: () => Promise<void>;

  // Equalizer & Playing Modes
  eqEnabled: boolean;
  eqPreset: PlayingModeId;
  eqBands: number[];
  eqPreamp: number;
  spatialMode: SpatialMode;
  nowPlayingInitialTab: 'visualizer' | 'equalizer' | 'video' | 'spotify' | 'lyrics' | 'queue' | null;

  setEqEnabled: (enabled: boolean) => void;
  setEqPreset: (presetId: PlayingModeId) => void;
  setEqBand: (index: number, gainDb: number) => void;
  setEqPreamp: (gainDb: number) => void;
  setSpatialMode: (mode: SpatialMode) => void;
  resetEq: () => void;
  openNowPlayingWithTab: (tab: 'visualizer' | 'equalizer' | 'video' | 'spotify' | 'lyrics' | 'queue') => void;

  // Actions
  setTheme: (theme: AppTheme) => void;
  setSpotifyConnectModalOpen: (open: boolean) => void;
  connectSpotifyAccount: (account?: Partial<SourceAccount>) => void;
  disconnectSpotifyAccount: () => void;
  playTrack: (track: MediaItem, newQueue?: MediaItem[]) => void;
  togglePlay: () => void;
  setPlaying: (isPlaying: boolean) => void;
  nextTrack: () => void;
  getNextTrack: () => { track: MediaItem; index: number } | null;
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
  setVideoTabActive: (active: boolean) => void;
  setActiveTab: (tab: TabType) => void;
  setSleepTimer: (minutes: number | null) => void;
  tickSleepTimer: () => void;
  toggleFavorite: (trackId: string) => void;
  setUser: (user: User | null, token: string | null) => void;
  updatePreferences: (prefs: Partial<UserPreferences>) => Promise<void>;
  saveCredentials: (cred: SavedCredential) => void;
  clearSavedCredentials: () => void;
  removeSavedAccount: (identifier: string) => void;
  login: (identifier: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (name: string, email: string, password: string, username?: string, rememberMe?: boolean) => Promise<void>;
  resetPassword: (identifier: string, newPassword: string) => Promise<User>;
  loginDemo: () => Promise<void>;
  logout: () => void;
  clearAuthError: () => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentTrack: persisted.playbackState?.currentTrack || null,
  isPlaying: false,
  autoplayBlocked: false,
  setAutoplayBlocked: (blocked: boolean) => set({ autoplayBlocked: blocked }),
  queue: (persisted.playbackQueue && persisted.playbackQueue.length > 0)
    ? persisted.playbackQueue
    : (persisted.playbackState?.currentTrack ? [persisted.playbackState.currentTrack] : []),
  queueIndex: typeof persisted.playbackState?.queueIndex === 'number' && persisted.playbackState.queueIndex >= 0
    ? persisted.playbackState.queueIndex
    : (persisted.playbackState?.currentTrack ? 0 : -1),
  currentTime: persisted.playbackState?.currentTime || 0,
  duration: persisted.playbackState?.currentTrack?.duration || 0,
  volume: 0.85,
  isMuted: false,
  playbackSpeed: 1.0,
  repeatMode: 'all',
  isShuffle: false,
  isNowPlayingOpen: false,
  isVideoTabActive: false,
  activeTab: 'home',
  sleepTimerMinutes: null,
  sleepTimerRemainingSeconds: null,
  favorites: persisted.favorites,
  user: persisted.user,
  token: persisted.token,
  seekRequestedTime: null,
  authLoading: false,
  authError: null,
  savedCredentials: persisted.savedCredentials,
  savedAccounts: persisted.savedAccounts,
  isSpotifyConnectModalOpen: false,
  spotifyAccount: persisted.spotifyAccount,
  theme: persisted.theme,

  // Equalizer & Playing Modes
  eqEnabled: persisted.equalizerState?.enabled ?? true,
  eqPreset: persisted.equalizerState?.preset ?? 'flat',
  eqBands: Array.isArray(persisted.equalizerState?.bands) && persisted.equalizerState.bands.length === 10
    ? [...persisted.equalizerState.bands]
    : [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  eqPreamp: persisted.equalizerState?.preamp ?? 0,
  spatialMode: persisted.equalizerState?.spatialMode ?? 'off',
  nowPlayingInitialTab: null,

  downloadModalTrack: null,
  isDownloadModalOpen: false,
  offlineTracks: [],
  offlineStorageStats: { totalBytes: 0, count: 0 },

  openDownloadModal: (track: MediaItem) => set({ downloadModalTrack: track, isDownloadModalOpen: true }),
  closeDownloadModal: () => set({ downloadModalTrack: null, isDownloadModalOpen: false }),

  loadOfflineTracks: async () => {
    try {
      const tracks = await offlineStorage.getAllOfflineTracks();
      const stats = await offlineStorage.getOfflineStorageStats();
      set({ offlineTracks: tracks, offlineStorageStats: stats });
    } catch (e) {
      console.warn('Failed to load offline tracks:', e);
    }
  },

  removeOfflineTrack: async (id: string) => {
    try {
      await offlineStorage.deleteOfflineTrack(id);
      const tracks = await offlineStorage.getAllOfflineTracks();
      const stats = await offlineStorage.getOfflineStorageStats();
      set({ offlineTracks: tracks, offlineStorageStats: stats });
    } catch (e) {
      console.warn('Failed to remove offline track:', e);
    }
  },

  clearOfflineStorage: async () => {
    try {
      await offlineStorage.clearAllOfflineStorage();
      set({ offlineTracks: [], offlineStorageStats: { totalBytes: 0, count: 0 } });
    } catch (e) {
      console.warn('Failed to clear offline storage:', e);
    }
  },

  setTheme: (theme: AppTheme) => {
    try {
      localStorage.setItem(LS_THEME, theme);
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme', theme);
      }
    } catch {}
    set({ theme });
  },
  setSpotifyConnectModalOpen: (open) => set({ isSpotifyConnectModalOpen: open }),
  connectSpotifyAccount: (account) => {
    const updated: SourceAccount = {
      provider: 'spotify',
      connected: true,
      username: account?.username || 'Aarav Sharma (Spotify)',
      accountType: account?.accountType || 'premium',
      accessToken: account?.accessToken || `sp_token_${Date.now()}_auth`,
      lastSynced: new Date().toISOString()
    };
    try {
      localStorage.setItem(LS_SPOTIFY, JSON.stringify(updated));
    } catch {}
    set({ spotifyAccount: updated });
  },
  disconnectSpotifyAccount: () => {
    const disconnected: SourceAccount = { provider: 'spotify', connected: false };
    try {
      localStorage.removeItem(LS_SPOTIFY);
    } catch {}
    set({ spotifyAccount: disconnected });
  },

  playTrack: (track, newQueue) => {
    let queue = get().queue;
    let queueIndex = get().queueIndex;

    // Check if track is available in local offline vault
    const offlineMatch = get().offlineTracks.find(t => t.id === track.id);
    const resolvedTrack: MediaItem = offlineMatch?.offlineUrl ? {
      ...track,
      streamUrl: offlineMatch.offlineUrl,
      isOfflinePermitted: true
    } : track;

    if (newQueue && newQueue.length > 0) {
      queue = newQueue;
      queueIndex = queue.findIndex(t => t.id === resolvedTrack.id);
      if (queueIndex === -1) {
        queue = [resolvedTrack, ...queue];
        queueIndex = 0;
      }
    } else {
      if (queue.length === 0) {
        queue = [resolvedTrack];
        queueIndex = 0;
      } else {
        const found = queue.findIndex(t => t.id === resolvedTrack.id);
        if (found !== -1) {
          queueIndex = found;
        } else {
          queue = [...queue, resolvedTrack];
          queueIndex = queue.length - 1;
        }
      }
    }

    set({
      currentTrack: resolvedTrack,
      isPlaying: true,
      autoplayBlocked: false,
      queue,
      queueIndex,
      currentTime: 0,
      duration: track.duration || 0
    });
    savePlaybackStateWeb(resolvedTrack, 0, queue, queueIndex, true);
  },

  togglePlay: () => {
    const { currentTrack, isPlaying, queue } = get();
    if (!currentTrack && queue.length > 0) {
      get().playTrack(queue[0]);
      return;
    }
    const nextState = !isPlaying;
    set({ isPlaying: nextState, autoplayBlocked: false });
    const st = get();
    if (st.currentTrack) {
      savePlaybackStateWeb(st.currentTrack, st.currentTime, st.queue, st.queueIndex, nextState);
    }
  },

  setPlaying: (isPlaying) => {
    set({ isPlaying, autoplayBlocked: isPlaying ? false : get().autoplayBlocked });
    const st = get();
    if (st.currentTrack) {
      savePlaybackStateWeb(st.currentTrack, st.currentTime, st.queue, st.queueIndex, isPlaying);
    }
  },

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
      savePlaybackStateWeb(nextTrack, 0, queue, nextIndex, true);
    }
  },

  getNextTrack: () => {
    const { queue, queueIndex, isShuffle, repeatMode, currentTrack } = get();
    if (queue.length === 0) return null;

    if (repeatMode === 'one' && currentTrack) {
      return { track: currentTrack, index: queueIndex };
    }

    let nextIndex = queueIndex + 1;
    if (isShuffle) {
      nextIndex = Math.floor(Math.random() * queue.length);
    } else if (nextIndex >= queue.length) {
      if (repeatMode === 'all') {
        nextIndex = 0;
      } else {
        return null;
      }
    }

    const next = queue[nextIndex];
    return next ? { track: next, index: nextIndex } : null;
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
      savePlaybackStateWeb(prevTrack, 0, queue, prevIndex, true);
    }
  },

  setCurrentTime: (time) => {
    set({ currentTime: time });
    const now = Date.now();
    if (now - lastPersistedTime > 3000) {
      lastPersistedTime = now;
      const st = get();
      if (st.currentTrack) {
        savePlaybackStateWeb(st.currentTrack, time, st.queue, st.queueIndex, st.isPlaying);
      }
    }
  },
  setDuration: (duration) => {
    const validDur = typeof duration === 'number' && !isNaN(duration) && duration > 0 ? Math.round(duration) : 0;
    set(state => {
      const cur = state.currentTrack;
      if (validDur > 0 && cur && (!cur.duration || cur.duration === 240 || cur.duration === 30 || cur.duration === 180 || cur.duration === 210 || Math.abs(cur.duration - validDur) > 3)) {
        const updatedTrack = { ...cur, duration: validDur };
        const updatedQueue = state.queue.map(q => q.id === cur.id ? { ...q, duration: validDur } : q);
        api.updateMediaDuration(cur.id, validDur).catch(() => {});
        return { duration, currentTrack: updatedTrack, queue: updatedQueue };
      }
      return { duration };
    });
  },
  seekTo: (time) => {
    set({ seekRequestedTime: time, currentTime: time });
    const st = get();
    if (st.currentTrack) {
      savePlaybackStateWeb(st.currentTrack, time, st.queue, st.queueIndex, st.isPlaying);
    }
  },
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

  setNowPlayingOpen: (open) => set({ isNowPlayingOpen: open, ...(open ? {} : { isVideoTabActive: false }) }),
  setVideoTabActive: (isVideoTabActive) => set({ isVideoTabActive }),
  setActiveTab: (tab) => set({ activeTab: tab }),

  setEqEnabled: (enabled) => {
    set({ eqEnabled: enabled });
    const s = get();
    saveEqualizerStateWeb({
      enabled,
      preset: s.eqPreset,
      bands: s.eqBands,
      preamp: s.eqPreamp,
      spatialMode: s.spatialMode
    });
  },

  setEqPreset: (presetId) => {
    const found = EQ_PRESETS.find(p => p.id === presetId);
    if (found) {
      const newBands = [...found.bands];
      const newPreamp = found.preamp ?? 0;
      const newSpatial = found.spatialMode ?? 'off';
      set({
        eqPreset: presetId,
        eqBands: newBands,
        eqPreamp: newPreamp,
        spatialMode: newSpatial
      });
      saveEqualizerStateWeb({
        enabled: get().eqEnabled,
        preset: presetId,
        bands: newBands,
        preamp: newPreamp,
        spatialMode: newSpatial
      });
    }
  },

  setEqBand: (index, gainDb) => {
    const s = get();
    const currentBands = [...s.eqBands];
    currentBands[index] = Math.max(-12, Math.min(12, Number(gainDb.toFixed(1))));
    set({
      eqBands: currentBands,
      eqPreset: 'custom'
    });
    saveEqualizerStateWeb({
      enabled: s.eqEnabled,
      preset: 'custom',
      bands: currentBands,
      preamp: s.eqPreamp,
      spatialMode: s.spatialMode
    });
  },

  setEqPreamp: (gainDb) => {
    const s = get();
    const preamp = Math.max(-6, Math.min(6, Number(gainDb.toFixed(1))));
    set({ eqPreamp: preamp });
    saveEqualizerStateWeb({
      enabled: s.eqEnabled,
      preset: s.eqPreset,
      bands: s.eqBands,
      preamp,
      spatialMode: s.spatialMode
    });
  },

  setSpatialMode: (mode) => {
    const s = get();
    set({ spatialMode: mode });
    saveEqualizerStateWeb({
      enabled: s.eqEnabled,
      preset: s.eqPreset,
      bands: s.eqBands,
      preamp: s.eqPreamp,
      spatialMode: mode
    });
  },

  resetEq: () => {
    const flatBands = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    set({
      eqEnabled: true,
      eqPreset: 'flat',
      eqBands: flatBands,
      eqPreamp: 0,
      spatialMode: 'off'
    });
    saveEqualizerStateWeb({
      enabled: true,
      preset: 'flat',
      bands: flatBands,
      preamp: 0,
      spatialMode: 'off'
    });
  },

  openNowPlayingWithTab: (tab) => {
    set({
      isNowPlayingOpen: true,
      nowPlayingInitialTab: tab
    });
  },

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
      
      // Seamlessly link any guest-session created playlist IDs to this authenticated user account
      if (user.id !== 'demo-user-id') {
        try {
          const userKey = `vibeflow_created_playlist_ids_${user.id}`;
          const existingUserIds: string[] = JSON.parse(localStorage.getItem(userKey) || '[]');
          const demoIds: string[] = JSON.parse(localStorage.getItem('vibeflow_created_playlist_ids_demo-user-id') || '[]');
          const legacyIds: string[] = JSON.parse(localStorage.getItem('vibeflow_my_created_playlist_ids') || '[]');
          const mergedIds = Array.from(new Set([...existingUserIds, ...demoIds, ...legacyIds]));
          if (mergedIds.length > 0) {
            localStorage.setItem(userKey, JSON.stringify(mergedIds.slice(0, 100)));
          }

          // Also migrate local playlist cache
          const userCacheKey = `vibeflow_cached_playlists_${user.id}`;
          const userCached: any[] = JSON.parse(localStorage.getItem(userCacheKey) || '[]');
          const demoCached: any[] = JSON.parse(localStorage.getItem('vibeflow_cached_playlists_demo-user-id') || '[]');
          const legacyCached: any[] = JSON.parse(localStorage.getItem('vibeflow_cached_playlists') || '[]');
          const allCached = [...userCached];
          for (const item of [...demoCached, ...legacyCached]) {
            if (item && item.id && !allCached.some(c => c.id === item.id)) {
              allCached.push({ ...item, userId: user.id });
            }
          }
          if (allCached.length > 0) {
            localStorage.setItem(userCacheKey, JSON.stringify(allCached.slice(0, 100)));
          }
        } catch {}
      }

      set({ user, token, favorites: favs });
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('vibeflow:auth_change', { detail: { user, token } }));
      }
    } else {
      localStorage.removeItem(LS_TOKEN);
      localStorage.removeItem(LS_USER);
      set({ user: null, token: null, favorites: [] });
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('vibeflow:auth_change', { detail: { user: null, token: null } }));
      }
    }
  },

  saveCredentials: (cred) => {
    const updated = persistSavedCredentials(cred);
    set({ savedCredentials: cred, savedAccounts: updated });
  },

  clearSavedCredentials: () => {
    localStorage.removeItem(LS_SAVED_CREDS);
    set({ savedCredentials: null });
  },

  removeSavedAccount: (identifier) => {
    try {
      const clean = identifier.toLowerCase();
      const accountsRaw = localStorage.getItem(LS_SAVED_ACCOUNTS) || '[]';
      let accounts: SavedCredential[] = JSON.parse(accountsRaw);
      accounts = accounts.filter(a => 
        a.identifier.toLowerCase() !== clean && 
        (a.email ? a.email.toLowerCase() !== clean : true) && 
        (a.username ? a.username.toLowerCase() !== clean : true)
      );
      localStorage.setItem(LS_SAVED_ACCOUNTS, JSON.stringify(accounts));
      const currentSaved = get().savedCredentials;
      const isCurrent = currentSaved && (
        currentSaved.identifier.toLowerCase() === clean || 
        currentSaved.email.toLowerCase() === clean || 
        currentSaved.username.toLowerCase() === clean
      );
      if (isCurrent) {
        if (accounts.length > 0) {
          localStorage.setItem(LS_SAVED_CREDS, JSON.stringify(accounts[0]));
          set({ savedCredentials: accounts[0], savedAccounts: accounts });
        } else {
          localStorage.removeItem(LS_SAVED_CREDS);
          set({ savedCredentials: null, savedAccounts: [] });
        }
      } else {
        set({ savedAccounts: accounts });
      }
    } catch {}
  },

  login: async (identifier, password, rememberMe = true) => {
    set({ authLoading: true, authError: null });
    const cleanId = (identifier || '').trim();
    const cleanPass = (password || '').trim();
    try {
      // Gather local playlist IDs & objects from guest/demo session to migrate on login
      let guestIds: string[] = [];
      let guestPlaylists: any[] = [];
      try {
        const demoIds: string[] = JSON.parse(localStorage.getItem('vibeflow_created_playlist_ids_demo-user-id') || '[]');
        const legacyIds: string[] = JSON.parse(localStorage.getItem('vibeflow_my_created_playlist_ids') || '[]');
        guestIds = Array.from(new Set([...demoIds, ...legacyIds]));
        const demoCached: any[] = JSON.parse(localStorage.getItem('vibeflow_cached_playlists_demo-user-id') || '[]');
        const legacyCached: any[] = JSON.parse(localStorage.getItem('vibeflow_cached_playlists') || '[]');
        guestPlaylists = [...demoCached, ...legacyCached].filter((p: any) => p && p.id && !p.id.startsWith('playlist-'));
      } catch {}

      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: cleanId,
          email: cleanId,
          username: cleanId,
          password: cleanPass,
          clientPlaylistIds: guestIds,
          clientPlaylists: guestPlaylists
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      get().setUser(data.user, data.token);

      // Pre-seed user's cloud playlists on this device immediately upon login
      if (data.playlists && Array.isArray(data.playlists)) {
        try {
          const userCacheKey = `vibeflow_cached_playlists_${data.user.id}`;
          const userKey = `vibeflow_created_playlist_ids_${data.user.id}`;
          const existingCached: any[] = JSON.parse(localStorage.getItem(userCacheKey) || '[]');
          const existingIds: string[] = JSON.parse(localStorage.getItem(userKey) || '[]');
          const deletedSet = new Set(data.deletedPlaylistIds || []);

          // Merge server playlists with existing local playlists, preserving any local items not deleted
          const map = new Map<string, any>();
          for (const p of data.playlists) {
            if (!deletedSet.has(p.id)) map.set(p.id, p);
          }
          for (const p of existingCached) {
            if (p && p.id && !deletedSet.has(p.id) && !map.has(p.id)) {
              map.set(p.id, p);
            }
          }
          const mergedPlaylists = Array.from(map.values());
          const mergedCreatedIds = Array.from(new Set([
            ...data.playlists.filter((p: any) => !p.id.startsWith('playlist-') && !p.isSharedWithMe).map((p: any) => p.id),
            ...existingIds
          ])).filter(id => !deletedSet.has(id));

          localStorage.setItem(userCacheKey, JSON.stringify(mergedPlaylists.slice(0, 100)));
          localStorage.setItem(userKey, JSON.stringify(mergedCreatedIds.slice(0, 100)));
        } catch {}
      }

      // Save user to local directory for offline & local resilience
      try {
        const localUsersRaw = localStorage.getItem(LS_LOCAL_USERS) || '[]';
        const localUsers: any[] = JSON.parse(localUsersRaw);
        const idx = localUsers.findIndex(u => {
          const uObj = u.user || u;
          return uObj.id === data.user.id || (uObj.email && uObj.email.toLowerCase() === (data.user.email || '').toLowerCase());
        });
        const entry = {
          user: data.user,
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
          username: data.user.username,
          password: cleanPass,
          updatedAt: new Date().toISOString()
        };
        if (idx >= 0) localUsers[idx] = entry;
        else localUsers.push(entry);
        localStorage.setItem(LS_LOCAL_USERS, JSON.stringify(localUsers));
      } catch {}

      // Save credentials for retrieval if rememberMe is enabled
      if (rememberMe) {
        const cred: SavedCredential = {
          userId: data.user.id,
          identifier: cleanId,
          email: data.user.email,
          username: data.user.username || cleanId,
          name: data.user.name || cleanId,
          password: cleanPass,
          rememberMe: true,
          savedAt: new Date().toISOString()
        };
        const updatedAccounts = persistSavedCredentials(cred);
        set({ savedCredentials: cred, savedAccounts: updatedAccounts });
      }

      set({ authLoading: false });
    } catch (err: any) {
      // Local fallback in case network is down, backend is offline, or serverless cold restart
      try {
        const localUsersRaw = localStorage.getItem(LS_LOCAL_USERS);
        if (localUsersRaw) {
          const localUsers: any[] = JSON.parse(localUsersRaw);
          const found = localUsers.find(u => {
            const userObj = u.user || u;
            const uEmail = (userObj.email || u.email || '').toLowerCase();
            const uUser = (userObj.username || u.username || '').toLowerCase();
            const uName = (userObj.name || u.name || '').toLowerCase();
            const uId = (userObj.id || u.id || '').toLowerCase();
            const target = cleanId.toLowerCase();
            const emailPrefix = uEmail.includes('@') ? uEmail.split('@')[0] : '';
            return target === uEmail || target === uUser || target === uName || target === uId || target === emailPrefix;
          });

          if (found) {
            const storedPass = found.password || found.user?.password;
            if (storedPass === cleanPass || !storedPass) {
              const userObj: User = found.user || found;
              const token = `local-jwt-${Date.now()}`;
              get().setUser(userObj, token);

              if (rememberMe) {
                const cred: SavedCredential = {
                  userId: userObj.id,
                  identifier: cleanId,
                  email: userObj.email,
                  username: userObj.username || cleanId,
                  name: userObj.name || cleanId,
                  password: cleanPass,
                  rememberMe: true,
                  savedAt: new Date().toISOString()
                };
                const updatedAccounts = persistSavedCredentials(cred);
                set({ savedCredentials: cred, savedAccounts: updatedAccounts });
              }

              set({ authLoading: false, authError: null });
              return;
            }
          }
        }

        // Also check saved credentials
        const savedCredsRaw = localStorage.getItem(LS_SAVED_CREDS);
        if (savedCredsRaw) {
          const saved: SavedCredential = JSON.parse(savedCredsRaw);
          const sIdent = (saved.identifier || '').toLowerCase();
          const sEmail = (saved.email || '').toLowerCase();
          const sUser = (saved.username || '').toLowerCase();
          const target = cleanId.toLowerCase();
          if ((target === sIdent || target === sEmail || target === sUser) && (saved.password === cleanPass || !saved.password)) {
            const localId = saved.userId || (saved.username ? `usr-${saved.username}` : `usr-${cleanId.replace(/[^a-zA-Z0-9_-]/g, '')}`);
            const recoveredUser: User = {
              id: localId,
              name: saved.name || cleanId,
              email: saved.email || `${cleanId}@vibeflow.local`,
              username: saved.username || cleanId,
              role: 'user',
              preferences: {
                userId: localId,
                favoriteGenres: ['Bollywood', 'Lo-Fi & Chill'],
                favoriteMoods: ['Calm & Peaceful'],
                preferredLanguages: ['Hindi', 'English'],
                favoriteArtists: ['Arijit Singh'],
                autoPlaySimilar: true,
                streamQuality: 'high',
                downloadQuality: 'high',
                wifiOnlyDownloads: true,
                enableListeningHistory: true,
                theme: 'dark'
              },
              createdAt: new Date().toISOString()
            };
            const token = `local-jwt-${Date.now()}`;
            get().setUser(recoveredUser, token);
            set({ authLoading: false, authError: null });
            return;
          }
        }
      } catch {}

      set({ authLoading: false, authError: err.message || 'Login failed' });
      throw err;
    }
  },

  register: async (name, email, password, username, rememberMe = true) => {
    set({ authLoading: true, authError: null });
    const cleanName = (name || '').trim();
    const cleanEmail = (email || '').trim();
    const cleanPass = (password || '').trim();
    const cleanUser = (username || cleanEmail.split('@')[0] || cleanName.replace(/\s+/g, '')).trim();

    try {
      // Gather local playlist IDs & objects from guest/demo session to migrate on registration
      let guestIds: string[] = [];
      let guestPlaylists: any[] = [];
      try {
        const demoIds: string[] = JSON.parse(localStorage.getItem('vibeflow_created_playlist_ids_demo-user-id') || '[]');
        const legacyIds: string[] = JSON.parse(localStorage.getItem('vibeflow_my_created_playlist_ids') || '[]');
        guestIds = Array.from(new Set([...demoIds, ...legacyIds]));
        const demoCached: any[] = JSON.parse(localStorage.getItem('vibeflow_cached_playlists_demo-user-id') || '[]');
        const legacyCached: any[] = JSON.parse(localStorage.getItem('vibeflow_cached_playlists') || '[]');
        guestPlaylists = [...demoCached, ...legacyCached].filter((p: any) => p && p.id && !p.id.startsWith('playlist-'));
      } catch {}

      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cleanName,
          email: cleanEmail,
          username: cleanUser,
          password: cleanPass,
          clientPlaylistIds: guestIds,
          clientPlaylists: guestPlaylists
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      get().setUser(data.user, data.token);

      // Pre-seed user's cloud playlists on this device immediately upon registration
      if (data.playlists && Array.isArray(data.playlists)) {
        try {
          const userCacheKey = `vibeflow_cached_playlists_${data.user.id}`;
          const userKey = `vibeflow_created_playlist_ids_${data.user.id}`;
          const existingCached: any[] = JSON.parse(localStorage.getItem(userCacheKey) || '[]');
          const existingIds: string[] = JSON.parse(localStorage.getItem(userKey) || '[]');
          const deletedSet = new Set(data.deletedPlaylistIds || []);

          const map = new Map<string, any>();
          for (const p of data.playlists) {
            if (!deletedSet.has(p.id)) map.set(p.id, p);
          }
          for (const p of existingCached) {
            if (p && p.id && !deletedSet.has(p.id) && !map.has(p.id)) {
              map.set(p.id, p);
            }
          }
          const mergedPlaylists = Array.from(map.values());
          const mergedCreatedIds = Array.from(new Set([
            ...data.playlists.filter((p: any) => !p.id.startsWith('playlist-') && !p.isSharedWithMe).map((p: any) => p.id),
            ...existingIds
          ])).filter(id => !deletedSet.has(id));

          localStorage.setItem(userCacheKey, JSON.stringify(mergedPlaylists.slice(0, 100)));
          localStorage.setItem(userKey, JSON.stringify(mergedCreatedIds.slice(0, 100)));
        } catch {}
      }

      // Save to local cache as resilience safeguard
      try {
        const localUsersRaw = localStorage.getItem(LS_LOCAL_USERS) || '[]';
        const localUsers: any[] = JSON.parse(localUsersRaw);
        const idx = localUsers.findIndex(u => {
          const uObj = u.user || u;
          return uObj.id === data.user.id || (uObj.email && uObj.email.toLowerCase() === cleanEmail.toLowerCase());
        });
        const entry = {
          user: data.user,
          id: data.user.id,
          name: cleanName,
          email: cleanEmail,
          username: cleanUser,
          password: cleanPass,
          createdAt: data.user.createdAt || new Date().toISOString()
        };
        if (idx >= 0) localUsers[idx] = entry;
        else localUsers.push(entry);
        localStorage.setItem(LS_LOCAL_USERS, JSON.stringify(localUsers));
      } catch {}

      // Always save sign up credentials for seamless retrieval when user logs in
      if (rememberMe) {
        const cred: SavedCredential = {
          userId: data.user.id,
          identifier: cleanUser || cleanEmail,
          email: cleanEmail,
          username: cleanUser,
          name: cleanName,
          password: cleanPass,
          rememberMe: true,
          savedAt: new Date().toISOString()
        };
        const updatedAccounts = persistSavedCredentials(cred);
        set({ savedCredentials: cred, savedAccounts: updatedAccounts });
      }

      set({ authLoading: false });
    } catch (err: any) {
      if (err.message && err.message.includes('already exists')) {
        set({ authLoading: false, authError: err.message });
        throw err;
      }

      // Offline / network failure fallback
      if (err.message && (err.message.includes('fetch') || err.message.includes('Network') || err.message.includes('Failed') || err.message.includes('504') || err.message.includes('500'))) {
        const localId = `usr-${Date.now()}`;
        const localUser: User = {
          id: localId,
          name: cleanName,
          email: cleanEmail || `${cleanUser}@vibeflow.local`,
          username: cleanUser,
          role: 'user',
          preferences: {
            userId: localId,
            favoriteGenres: ['Bollywood', 'Lo-Fi & Chill', 'Hindi Retro', 'Marathi'],
            favoriteMoods: ['Calm & Peaceful', 'Focus & Study', 'Workout & Energy', 'Romantic'],
            preferredLanguages: ['Hindi', 'English', 'Marathi'],
            favoriteArtists: ['Arijit Singh', 'Bombay Chill Collective'],
            autoPlaySimilar: true,
            streamQuality: 'high',
            downloadQuality: 'high',
            wifiOnlyDownloads: true,
            enableListeningHistory: true,
            theme: 'dark'
          },
          createdAt: new Date().toISOString()
        };
        const token = `local-jwt-${Date.now()}`;
        get().setUser(localUser, token);

        try {
          const localUsersRaw = localStorage.getItem(LS_LOCAL_USERS) || '[]';
          const localUsers: any[] = JSON.parse(localUsersRaw);
          localUsers.push({
            user: localUser,
            id: localId,
            name: cleanName,
            email: localUser.email,
            username: cleanUser,
            password: cleanPass,
            createdAt: localUser.createdAt
          });
          localStorage.setItem(LS_LOCAL_USERS, JSON.stringify(localUsers));
        } catch {}

        if (rememberMe) {
          const cred: SavedCredential = {
            identifier: cleanUser || cleanEmail,
            email: localUser.email,
            username: cleanUser,
            name: cleanName,
            password: cleanPass,
            rememberMe: true,
            savedAt: new Date().toISOString()
          };
          const updatedAccounts = persistSavedCredentials(cred);
          set({ savedCredentials: cred, savedAccounts: updatedAccounts });
        }

        set({ authLoading: false, authError: null });
        return;
      }

      set({ authLoading: false, authError: err.message || 'Registration failed' });
      throw err;
    }
  },

  resetPassword: async (identifier: string, newPassword: string) => {
    set({ authLoading: true, authError: null });
    const cleanId = (identifier || '').trim();
    const cleanPass = (newPassword || '').trim();
    try {
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: cleanId, newPassword: cleanPass })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Password reset failed');

      get().setUser(data.user, data.token);

      // Save/update user in local directory with new password
      try {
        const localUsersRaw = localStorage.getItem(LS_LOCAL_USERS) || '[]';
        const localUsers: any[] = JSON.parse(localUsersRaw);
        const idx = localUsers.findIndex(u => {
          const uObj = u.user || u;
          return uObj.id === data.user.id || 
                 (uObj.email && uObj.email.toLowerCase() === (data.user.email || '').toLowerCase()) ||
                 (uObj.username && uObj.username.toLowerCase() === (data.user.username || '').toLowerCase());
        });
        const entry = {
          user: data.user,
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
          username: data.user.username,
          password: cleanPass,
          updatedAt: new Date().toISOString()
        };
        if (idx >= 0) localUsers[idx] = entry;
        else localUsers.push(entry);
        localStorage.setItem(LS_LOCAL_USERS, JSON.stringify(localUsers));

        // Update saved credentials
        const cred: SavedCredential = {
          identifier: cleanId,
          email: data.user.email,
          username: data.user.username || cleanId,
          name: data.user.name || cleanId,
          password: cleanPass,
          rememberMe: true,
          savedAt: new Date().toISOString()
        };
        const updatedAccounts = persistSavedCredentials(cred);
        set({ savedCredentials: cred, savedAccounts: updatedAccounts });
      } catch {}

      set({ authLoading: false, authError: null });
      return data.user;
    } catch (err: any) {
      // Local fallback if offline or network failure
      try {
        const localUsersRaw = localStorage.getItem(LS_LOCAL_USERS) || '[]';
        const localUsers: any[] = JSON.parse(localUsersRaw);
        const idx = localUsers.findIndex(u => {
          const uObj = u.user || u;
          const uEmail = (uObj.email || u.email || '').toLowerCase();
          const uUser = (uObj.username || u.username || '').toLowerCase();
          const target = cleanId.toLowerCase();
          return target === uEmail || target === uUser;
        });
        if (idx >= 0) {
          const userObj = localUsers[idx].user || localUsers[idx];
          localUsers[idx].password = cleanPass;
          localStorage.setItem(LS_LOCAL_USERS, JSON.stringify(localUsers));
          const cred: SavedCredential = {
            identifier: cleanId,
            email: userObj.email,
            username: userObj.username || cleanId,
            name: userObj.name || cleanId,
            password: cleanPass,
            rememberMe: true,
            savedAt: new Date().toISOString()
          };
          const updatedAccounts = persistSavedCredentials(cred);
          set({ savedCredentials: cred, savedAccounts: updatedAccounts });
          const token = `local-jwt-${Date.now()}`;
          get().setUser(userObj, token);
          set({ authLoading: false, authError: null });
          return userObj;
        }
      } catch {}

      set({ authLoading: false, authError: err.message || 'Password reset failed' });
      throw err;
    }
  },

  updatePreferences: async (prefs: Partial<UserPreferences>) => {
    const state = get();
    if (!state.user) return;

    const currentPrefs = state.user.preferences || {
      userId: state.user.id,
      favoriteGenres: ['Bollywood', 'Lo-Fi & Chill'],
      favoriteMoods: ['Calm & Peaceful', 'Focus & Study'],
      preferredLanguages: ['Hindi', 'English'],
      favoriteArtists: ['Arijit Singh'],
      autoPlaySimilar: true,
      streamQuality: 'high',
      downloadQuality: 'high',
      wifiOnlyDownloads: true,
      enableListeningHistory: true,
      theme: 'dark'
    };

    const newPreferences: UserPreferences = {
      ...currentPrefs,
      ...prefs,
      userId: state.user.id
    };

    const updatedUser: User = {
      ...state.user,
      preferences: newPreferences
    };

    // Update store state immediately
    set({ user: updatedUser });
    localStorage.setItem(LS_USER, JSON.stringify(updatedUser));

    // Persist to backend
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (state.token) headers['Authorization'] = `Bearer ${state.token}`;

      await fetch(`${API_BASE}/auth/preferences`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ preferences: newPreferences, userId: state.user.id })
      });
    } catch (err) {
      console.warn('Preferences saved locally, backend sync failed:', err);
    }
  },

  loginDemo: async () => {
    set({ authLoading: true, authError: null });
    try {
      const res = await fetch(`${API_BASE}/auth/demo`, { method: 'POST' });
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
