import { 
  MediaItem, 
  Playlist, 
  User, 
  UserSummary,
  UserPreferences,
  RecommendationResponse, 
  AIClassificationResult, 
  NaturalLanguageSearchQuery,
  MediaProvider 
} from '../types';

export const API_BASE = (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/$/, '') : '') || '/api';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem('vibeflow_token');
  } catch {
    return null;
  }
}

export function getStoredUserId(): string {
  try {
    const raw = localStorage.getItem('vibeflow_user');
    if (raw) {
      const u = JSON.parse(raw);
      if (u?.id) return u.id;
    }
  } catch {}
  return 'demo-user-id';
}

const LS_CREATED_PLAYLIST_IDS = 'vibeflow_my_created_playlist_ids';
const LS_CACHED_PLAYLISTS = 'vibeflow_cached_playlists';
const LS_SELECTED_PLAYLIST_ID = 'vibeflow_selected_playlist_id';

const getCacheKey = (userId: string) => `vibeflow_cached_playlists_${userId}`;
const getCreatedIdsKey = (userId: string) => `vibeflow_created_playlist_ids_${userId}`;

export function getStoredCreatedPlaylistIds(userId?: string): string[] {
  try {
    const uid = userId || getStoredUserId();
    const raw = localStorage.getItem(getCreatedIdsKey(uid));
    if (raw) return JSON.parse(raw);
    if (uid === 'demo-user-id') {
      const legacy = localStorage.getItem(LS_CREATED_PLAYLIST_IDS);
      return legacy ? JSON.parse(legacy) : [];
    }
    return [];
  } catch {
    return [];
  }
}

export function saveLocalCreatedPlaylist(playlist: Playlist, userId?: string) {
  try {
    if (!playlist || !playlist.id) return;
    const uid = userId || playlist.userId || getStoredUserId();
    // 1. Add ID to created IDs list for this specific user
    const ids = getStoredCreatedPlaylistIds(uid);
    if (!ids.includes(playlist.id)) {
      ids.unshift(playlist.id);
      localStorage.setItem(getCreatedIdsKey(uid), JSON.stringify(ids.slice(0, 100)));
    }
    // 2. Cache full playlist object for this user
    const cached = getLocallyCachedPlaylists(uid);
    const existingIdx = cached.findIndex(p => p.id === playlist.id);
    if (existingIdx >= 0) {
      cached[existingIdx] = { ...cached[existingIdx], ...playlist };
    } else {
      cached.unshift(playlist);
    }
    localStorage.setItem(getCacheKey(uid), JSON.stringify(cached.slice(0, 100)));
    localStorage.setItem(LS_SELECTED_PLAYLIST_ID, playlist.id);
  } catch {}
}

export function removeLocalCreatedPlaylist(id: string, userId?: string) {
  try {
    const uid = userId || getStoredUserId();
    const ids = getStoredCreatedPlaylistIds(uid).filter(x => x !== id);
    localStorage.setItem(getCreatedIdsKey(uid), JSON.stringify(ids));
    const cached = getLocallyCachedPlaylists(uid).filter(p => p.id !== id);
    localStorage.setItem(getCacheKey(uid), JSON.stringify(cached));
    if (localStorage.getItem(LS_SELECTED_PLAYLIST_ID) === id) {
      localStorage.removeItem(LS_SELECTED_PLAYLIST_ID);
    }
  } catch {}
}

export function getLocallyCachedPlaylists(userId?: string): Playlist[] {
  try {
    const uid = userId || getStoredUserId();
    const raw = localStorage.getItem(getCacheKey(uid));
    if (raw) return JSON.parse(raw);
    if (uid === 'demo-user-id') {
      const legacy = localStorage.getItem(LS_CACHED_PLAYLISTS);
      return legacy ? JSON.parse(legacy) : [];
    }
    return [];
  } catch {
    return [];
  }
}

export function mergeWithLocalPlaylists(serverPlaylists: Playlist[], userId?: string): Playlist[] {
  try {
    const uid = userId || getStoredUserId();
    const createdIds = new Set(getStoredCreatedPlaylistIds(uid));
    const cached = getLocallyCachedPlaylists(uid);

    const map = new Map<string, Playlist>();
    
    // Server playlists take base precedence
    for (const pl of serverPlaylists) {
      map.set(pl.id, pl);
    }

    // Preserve any locally created playlists that have not yet arrived from server
    for (const pl of cached) {
      if (!map.has(pl.id) && createdIds.has(pl.id)) {
        map.set(pl.id, pl);
      }
    }

    const merged = Array.from(map.values());
    localStorage.setItem(getCacheKey(uid), JSON.stringify(merged.slice(0, 100)));
    return merged;
  } catch {
    return serverPlaylists;
  }
}

function authHeaders(token?: string | null): HeadersInit {
  const t = token || getStoredToken();
  const h: HeadersInit = { 'Content-Type': 'application/json' };
  if (t) h['Authorization'] = `Bearer ${t}`;
  return h;
}

export const api = {
  // Search — searches all files matching criteria, with category and provider filtering
  search: async (query: string, provider?: MediaProvider, genre?: string, mood?: string, limit?: number, type?: string): Promise<MediaItem[]> => {
    try {
      const params = new URLSearchParams();
      if (query) params.append('q', query);
      if (provider) params.append('provider', provider);
      if (genre) params.append('genre', genre);
      if (mood) params.append('mood', mood);
      if (type && type !== 'all') params.append('type', type);
      if (limit !== undefined && limit > 0) {
        params.append('limit', limit.toString());
      } else {
        params.append('limit', 'all');
      }

      const res = await fetch(`${API_BASE}/media/search?${params.toString()}`);
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      return data.items || [];
    } catch (err) {
      console.warn('API search error:', err);
      return [];
    }
  },

  // Explore all tracks for a specific channel / artist
  getChannelTracks: async (channelName: string, provider?: MediaProvider, limit = 60): Promise<MediaItem[]> => {
    try {
      const params = new URLSearchParams();
      if (provider) params.append('provider', provider);
      params.append('limit', limit.toString());
      params.append('target', limit.toString());
      const res = await fetch(`${API_BASE}/media/channel/${encodeURIComponent(channelName)}/tracks?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.items && data.items.length > 0) return data.items;
      }
    } catch (e) {
      console.warn('getChannelTracks error, falling back to search:', e);
    }
    // Fallback to provider or general search
    return await api.search(channelName, provider, undefined, undefined, limit);
  },

  // Get all items
  getItems: async (): Promise<MediaItem[]> => {
    try {
      const res = await fetch(`${API_BASE}/media/items`);
      if (!res.ok) throw new Error('Fetch items failed');
      const data = await res.json();
      return data.items || [];
    } catch (err) {
      console.warn('API getItems error:', err);
      return [];
    }
  },

  // AI Classification
  classify: async (title: string, artist?: string, tags?: string[], description?: string): Promise<AIClassificationResult> => {
    const res = await fetch(`${API_BASE}/media/classify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, artist, tags, description })
    });
    const data = await res.json();
    return data.result;
  },

  // Feedback / Override
  submitFeedback: async (userId: string, targetId: string, feedbackType: string, payload?: any) => {
    await fetch(`${API_BASE}/media/classify/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, targetId, feedbackType, payload })
    });
  },

  // NLP Search
  naturalLanguageSearch: async (query: string): Promise<{ parsed: NaturalLanguageSearchQuery; results: MediaItem[] }> => {
    const res = await fetch(`${API_BASE}/media/natural-search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });
    return await res.json();
  },

  // Similar Tracks
  getSimilar: async (id: string, limit = 6): Promise<{ seed?: MediaItem; similar: MediaItem[]; reason: string }> => {
    const res = await fetch(`${API_BASE}/media/similar/${id}?limit=${limit}`);
    return await res.json();
  },

  // Local track import
  importLocal: async (payload: { title: string; artist?: string; duration?: number; fileName: string; dataUrl?: string; customTags?: string[] }) => {
    const res = await fetch(`${API_BASE}/media/local/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await res.json();
  },

  // Import any custom URL (YouTube, MP4, WebM, MP3, etc.)
  importUrl: async (url: string, customTitle?: string, customArtist?: string): Promise<{ success: boolean; item: MediaItem }> => {
    const res = await fetch(`${API_BASE}/media/import-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, customTitle, customArtist })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to import URL');
    }
    return await res.json();
  },

  // Playlists — token-scoped per logged-in user with offline resilience
  getPlaylists: async (userId?: string, token?: string | null): Promise<Playlist[]> => {
    try {
      const uid = userId || getStoredUserId();
      const t = token !== undefined ? token : getStoredToken();
      const headers: HeadersInit = {};
      if (t) headers['Authorization'] = `Bearer ${t}`;

      const clientIds = getStoredCreatedPlaylistIds(uid);
      if (clientIds.length > 0) {
        headers['x-client-playlist-ids'] = JSON.stringify(clientIds);
      }

      const res = await fetch(`${API_BASE}/playlists?userId=${encodeURIComponent(uid)}`, { headers });
      if (!res.ok) throw new Error('Fetch playlists failed');
      const data = await res.json();
      const serverPlaylists: Playlist[] = data.playlists || [];
      return mergeWithLocalPlaylists(serverPlaylists, uid);
    } catch (err) {
      console.warn('API getPlaylists error, returning locally cached playlists:', err);
      const uid = userId || getStoredUserId();
      return getLocallyCachedPlaylists(uid);
    }
  },

  createPlaylist: async (playlistData: Partial<Playlist>, token?: string | null): Promise<Playlist> => {
    const uid = playlistData.userId || getStoredUserId();
    const t = token !== undefined ? token : getStoredToken();

    // Automatically resolve logged-in user profile if creator details are missing
    let creator = playlistData.creator;
    let userEmail = (creator as any)?.email;
    let userName = creator?.name;
    try {
      const uRaw = localStorage.getItem('vibeflow_user');
      if (uRaw) {
        const u = JSON.parse(uRaw);
        if (u && u.name) {
          if (!creator || creator.name === 'Music Lover') {
            creator = {
              id: u.id || uid,
              name: u.name,
              username: u.username || u.name,
              avatar: u.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
              email: u.email
            };
          }
          if (!userEmail && u.email) userEmail = u.email;
          if (!userName && u.name) userName = u.name;
        }
      }
    } catch {}

    const payload = {
      ...playlistData,
      userId: uid,
      creator,
      userEmail,
      userName
    };

    const res = await fetch(`${API_BASE}/playlists`, {
      method: 'POST',
      headers: authHeaders(t),
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create playlist');
    }
    const data = await res.json();
    const created: Playlist = data.playlist;
    if (created && created.id) {
      saveLocalCreatedPlaylist(created, uid);
    }
    return created;
  },

  deletePlaylist: async (id: string, token?: string | null, userId?: string) => {
    const uid = userId || getStoredUserId();
    removeLocalCreatedPlaylist(id, uid);
    const t = token !== undefined ? token : getStoredToken();
    await fetch(`${API_BASE}/playlists/${id}`, {
      method: 'DELETE',
      headers: t ? { 'Authorization': `Bearer ${t}` } : {}
    });
  },

  addItemToPlaylist: async (playlistId: string, mediaItemId: string, token?: string | null) => {
    const t = token !== undefined ? token : getStoredToken();
    const res = await fetch(`${API_BASE}/playlists/${playlistId}/items`, {
      method: 'POST',
      headers: authHeaders(t),
      body: JSON.stringify({ mediaItemId })
    });
    const data = await res.json();
    if (data.playlist) {
      saveLocalCreatedPlaylist(data.playlist);
    }
    return data;
  },

  // Save YouTube / Spotify / Web stream link directly to the playlist on the server
  importUrlToPlaylist: async (playlistId: string, url: string, customTitle?: string, customArtist?: string, token?: string | null): Promise<{ success: boolean; playlist: Playlist; items: MediaItem[]; message?: string }> => {
    const t = token !== undefined ? token : getStoredToken();
    const res = await fetch(`${API_BASE}/playlists/${playlistId}/import-url`, {
      method: 'POST',
      headers: authHeaders(t),
      body: JSON.stringify({ url, customTitle, customArtist })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to import URL into playlist');
    }
    const data = await res.json();
    if (data.playlist) {
      saveLocalCreatedPlaylist(data.playlist);
    }
    return data;
  },

  // Retrieve cross-device sync code for the current user
  getSyncCode: async (token?: string | null): Promise<{ syncCode: string }> => {
    const t = token !== undefined ? token : getStoredToken();
    const res = await fetch(`${API_BASE}/playlists/sync/code`, {
      headers: authHeaders(t)
    });
    if (!res.ok) throw new Error('Failed to retrieve sync code');
    return await res.json();
  },

  // Link device by entering 6-character sync code
  linkDeviceBySyncCode: async (syncCode: string): Promise<{ success: boolean; user: User; token: string; playlists: Playlist[] }> => {
    const res = await fetch(`${API_BASE}/playlists/sync/link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ syncCode })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Invalid or expired sync code');
    }
    const data = await res.json();
    if (data.user && data.token) {
      localStorage.setItem('vibeflow_token', data.token);
      localStorage.setItem('vibeflow_user', JSON.stringify(data.user));
    }
    return data;
  },

  removeItemFromPlaylist: async (playlistId: string, mediaItemId: string, token?: string | null) => {
    const t = token !== undefined ? token : getStoredToken();
    const res = await fetch(`${API_BASE}/playlists/${playlistId}/items/${mediaItemId}`, {
      method: 'DELETE',
      headers: t ? { 'Authorization': `Bearer ${t}` } : {}
    });
    const data = await res.json();
    if (data.playlist) {
      saveLocalCreatedPlaylist(data.playlist);
    }
    return data;
  },

  // Reorder items in a playlist
  reorderPlaylist: async (
    playlistId: string, 
    payload: { itemIds?: string[]; fromIndex?: number; toIndex?: number; action?: 'reverse' | 'shuffle' }, 
    token?: string | null
  ): Promise<{ success: boolean; playlist: Playlist }> => {
    const t = token !== undefined ? token : getStoredToken();
    const res = await fetch(`${API_BASE}/playlists/${playlistId}/reorder`, {
      method: 'PUT',
      headers: authHeaders(t),
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to reorder playlist');
    const data = await res.json();
    if (data.playlist) {
      saveLocalCreatedPlaylist(data.playlist);
    }
    return data;
  },

  // Auto-resolve real track durations for a playlist
  resolvePlaylistDurations: async (playlistId: string, token?: string | null): Promise<{ success: boolean; playlist: Playlist }> => {
    const t = token !== undefined ? token : getStoredToken();
    const res = await fetch(`${API_BASE}/playlists/${playlistId}/resolve-durations`, {
      method: 'POST',
      headers: authHeaders(t)
    });
    if (!res.ok) throw new Error('Failed to resolve playlist durations');
    const data = await res.json();
    if (data.playlist) {
      saveLocalCreatedPlaylist(data.playlist);
    }
    return data;
  },

  getPlaylist: async (playlistId: string, token?: string | null): Promise<Playlist | null> => {
    try {
      const t = token !== undefined ? token : getStoredToken();
      const res = await fetch(`${API_BASE}/playlists/${playlistId}`, {
        headers: t ? { 'Authorization': `Bearer ${t}` } : {}
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.playlist || null;
    } catch {
      return null;
    }
  },

  updateMediaDuration: async (mediaItemId: string, duration: number): Promise<boolean> => {
    try {
      if (!mediaItemId || !duration || duration <= 0) return false;
      const res = await fetch(`${API_BASE}/media/items/${encodeURIComponent(mediaItemId)}/duration`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ duration: Math.round(duration) })
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  sharePlaylist: async (playlistId: string, targetIdentifier: string, token?: string | null) => {
    const t = token !== undefined ? token : getStoredToken();
    const res = await fetch(`${API_BASE}/playlists/${playlistId}/share`, {
      method: 'POST',
      headers: authHeaders(t),
      body: JSON.stringify({ target: targetIdentifier })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to share playlist');
    return data;
  },

  unsharePlaylist: async (playlistId: string, targetUserId: string, token?: string | null) => {
    const t = token !== undefined ? token : getStoredToken();
    const res = await fetch(`${API_BASE}/playlists/${playlistId}/share/${targetUserId}`, {
      method: 'DELETE',
      headers: t ? { 'Authorization': `Bearer ${t}` } : {}
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to revoke access');
    return data;
  },

  leaveSharedPlaylist: async (playlistId: string, token?: string | null) => {
    const t = token !== undefined ? token : getStoredToken();
    const res = await fetch(`${API_BASE}/playlists/${playlistId}/leave`, {
      method: 'POST',
      headers: authHeaders(t)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to leave shared playlist');
    return data;
  },

  getPlaylistByShareToken: async (shareToken: string) => {
    const res = await fetch(`${API_BASE}/playlists/share/${shareToken}`);
    if (!res.ok) throw new Error('Shared playlist not found or link expired');
    const data = await res.json();
    return data.playlist as Playlist;
  },

  acceptShareToken: async (shareToken: string, token?: string | null) => {
    const t = token !== undefined ? token : getStoredToken();
    const res = await fetch(`${API_BASE}/playlists/share/${shareToken}/accept`, {
      method: 'POST',
      headers: authHeaders(t)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to accept share link');
    return data;
  },

  searchUsers: async (query: string = '', token?: string | null): Promise<UserSummary[]> => {
    try {
      const t = token !== undefined ? token : getStoredToken();
      const headers: HeadersInit = {};
      if (t) headers['Authorization'] = `Bearer ${t}`;
      const res = await fetch(`${API_BASE}/auth/users?q=${encodeURIComponent(query)}`, { headers });
      if (!res.ok) return [];
      const data = await res.json();
      return data.users || [];
    } catch {
      return [];
    }
  },

  // Personalized feed
  getPersonalizedFeed: async (userId?: string, token?: string | null): Promise<RecommendationResponse[]> => {
    try {
      const uid = userId || getStoredUserId();
      const t = token !== undefined ? token : getStoredToken();
      const headers: HeadersInit = {};
      if (t) headers['Authorization'] = `Bearer ${t}`;
      const res = await fetch(`${API_BASE}/recommendations/feed?userId=${uid}`, { headers });
      if (!res.ok) throw new Error('Fetch feed failed');
      const data = await res.json();
      return data.feed || [];
    } catch (err) {
      console.warn('API feed error:', err);
      return [];
    }
  },

  // Favorites
  getFavorites: async (userId?: string, token?: string | null): Promise<MediaItem[]> => {
    try {
      const uid = userId || getStoredUserId();
      const t = token !== undefined ? token : getStoredToken();
      const headers: HeadersInit = {};
      if (t) headers['Authorization'] = `Bearer ${t}`;
      const res = await fetch(`${API_BASE}/library/favorites?userId=${uid}`, { headers });
      const data = await res.json();
      return data.favorites || [];
    } catch (err) {
      return [];
    }
  },

  toggleFavorite: async (userId?: string, mediaItemId?: string, token?: string | null): Promise<boolean> => {
    const uid = userId || getStoredUserId();
    const t = token !== undefined ? token : getStoredToken();
    const res = await fetch(`${API_BASE}/library/favorites/toggle`, {
      method: 'POST',
      headers: authHeaders(t),
      body: JSON.stringify({ userId: uid, mediaItemId })
    });
    const data = await res.json();
    return data.isFavorite;
  },

  // History
  recordHistory: async (userId: string, mediaItemId: string, playedSeconds: number, completionRate: number, token?: string | null, mediaItem?: MediaItem) => {
    const uid = userId || getStoredUserId();
    const t = token !== undefined ? token : getStoredToken();
    try {
      await fetch(`${API_BASE}/library/history`, {
        method: 'POST',
        headers: authHeaders(t),
        body: JSON.stringify({ userId: uid, mediaItemId, playedSeconds, completionRate, mediaItem })
      });

      // Maintain client-side local cache as instant backup
      if (typeof window !== 'undefined' && mediaItem) {
        try {
          const raw = localStorage.getItem('vibeflow:local_history');
          const list: any[] = raw ? JSON.parse(raw) : [];
          const entry = {
            mediaItem,
            playedSeconds,
            completionRate,
            listenedAt: new Date().toISOString()
          };
          const filtered = list.filter(item => item.mediaItem?.id !== mediaItem.id);
          filtered.unshift(entry);
          localStorage.setItem('vibeflow:local_history', JSON.stringify(filtered.slice(0, 100)));
          window.dispatchEvent(new CustomEvent('vibeflow:history_updated', { detail: { entry } }));
        } catch {}
      }
    } catch (e) {
      console.warn('Failed to record history', e);
    }
  },

  getHistory: async (userId: string, token?: string | null): Promise<any[]> => {
    const uid = userId || getStoredUserId();
    const t = token !== undefined ? token : getStoredToken();
    try {
      const res = await fetch(`${API_BASE}/library/history?userId=${encodeURIComponent(uid)}`, {
        headers: authHeaders(t)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.history && data.history.length > 0) {
          return data.history;
        }
      }
    } catch {}

    // Fallback to local storage cache if server is offline or empty
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('vibeflow:local_history');
        if (raw) return JSON.parse(raw);
      } catch {}
    }
    return [];
  },

  // Providers
  getProviders: async () => {
    const res = await fetch(`${API_BASE}/library/providers`);
    return await res.json();
  },

  configureProviders: async (config: { youtubeApiKey?: string; spotifyClientId?: string; spotifyClientSecret?: string }) => {
    const res = await fetch(`${API_BASE}/library/providers/configure`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    return await res.json();
  },

  // Auth
  loginDemo: async (): Promise<{ user: User; token: string }> => {
    const res = await fetch(`${API_BASE}/auth/demo`, { method: 'POST' });
    return await res.json();
  },

  login: async (identifier: string, password: string): Promise<{ user: User; token: string }> => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, email: identifier, username: identifier, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    return data;
  },

  register: async (name: string, email: string, password: string, username?: string): Promise<{ user: User; token: string }> => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, username, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');
    return data;
  },

  updatePreferences: async (preferences: Partial<UserPreferences>, token?: string | null, userId?: string): Promise<{ preferences: UserPreferences; user: User }> => {
    const t = token !== undefined ? token : getStoredToken();
    const uid = userId || getStoredUserId();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (t) headers['Authorization'] = `Bearer ${t}`;

    const res = await fetch(`${API_BASE}/auth/preferences`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ preferences, userId: uid })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to save preferences');
    return data;
  },

  getMe: async (token: string): Promise<User> => {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Unauthorized');
    return data.user;
  },

  // Delete user account permanently from this device and server
  deleteAccount: async (token?: string | null, userId?: string): Promise<{ success: boolean; message: string }> => {
    const t = token !== undefined ? token : getStoredToken();
    const uid = userId || getStoredUserId();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (t) headers['Authorization'] = `Bearer ${t}`;

    const res = await fetch(`${API_BASE}/auth/account`, {
      method: 'DELETE',
      headers,
      body: JSON.stringify({ userId: uid })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete account');

    try {
      localStorage.removeItem('vibeflow_token');
      localStorage.removeItem('vibeflow_user');
      localStorage.removeItem('vibeflow_my_created_playlist_ids');
      localStorage.removeItem('vibeflow_cached_playlists');
      localStorage.removeItem('vibeflow_selected_playlist_id');
    } catch {}

    return data;
  }
};
