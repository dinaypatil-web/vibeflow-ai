import { create } from 'zustand';
import { MediaItem, User, UserPreferences, SourceAccount, AppTheme } from '../types';

export type TabType = 'home' | 'search' | 'explore' | 'playlists' | 'library' | 'ai-studio' | 'settings';
export type RepeatMode = 'off' | 'all' | 'one';

export interface SavedCredential {
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

    return { token, user, favorites: favs, spotifyAccount, theme: savedTheme, savedCredentials, savedAccounts };
  } catch {
    return { 
      token: null, 
      user: null, 
      favorites: [], 
      spotifyAccount: { provider: 'spotify' as const, connected: false }, 
      theme: 'dark' as AppTheme,
      savedCredentials: null,
      savedAccounts: []
    };
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
  savedCredentials: SavedCredential | null;
  savedAccounts: SavedCredential[];
  isSpotifyConnectModalOpen: boolean;
  spotifyAccount: SourceAccount;
  theme: AppTheme;

  // Actions
  setTheme: (theme: AppTheme) => void;
  setSpotifyConnectModalOpen: (open: boolean) => void;
  connectSpotifyAccount: (account?: Partial<SourceAccount>) => void;
  disconnectSpotifyAccount: () => void;
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
  savedCredentials: persisted.savedCredentials,
  savedAccounts: persisted.savedAccounts,
  isSpotifyConnectModalOpen: false,
  spotifyAccount: persisted.spotifyAccount,
  theme: persisted.theme,

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
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: cleanId, email: cleanId, username: cleanId, password: cleanPass })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      get().setUser(data.user, data.token);

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
            const localId = `usr-${Date.now()}`;
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
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: cleanName, email: cleanEmail, username: cleanUser, password: cleanPass })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      get().setUser(data.user, data.token);

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
      const res = await fetch('/api/auth/reset-password', {
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

      await fetch('/api/auth/preferences', {
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
