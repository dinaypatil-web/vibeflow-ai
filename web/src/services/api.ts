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

const API_BASE = (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/$/, '') : '') || '/api';

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

function authHeaders(token?: string | null): HeadersInit {
  const t = token || getStoredToken();
  const h: HeadersInit = { 'Content-Type': 'application/json' };
  if (t) h['Authorization'] = `Bearer ${t}`;
  return h;
}

export const api = {
  // Search — searches all files matching criteria, not limited to any number
  search: async (query: string, provider?: MediaProvider, genre?: string, mood?: string, limit?: number): Promise<MediaItem[]> => {
    try {
      const params = new URLSearchParams();
      if (query) params.append('q', query);
      if (provider) params.append('provider', provider);
      if (genre) params.append('genre', genre);
      if (mood) params.append('mood', mood);
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
  getChannelTracks: async (channelName: string, provider?: MediaProvider): Promise<MediaItem[]> => {
    try {
      const params = new URLSearchParams();
      if (provider) params.append('provider', provider);
      params.append('limit', '100');
      const res = await fetch(`${API_BASE}/media/channel/${encodeURIComponent(channelName)}/tracks?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.items && data.items.length > 0) return data.items;
      }
    } catch (e) {
      console.warn('getChannelTracks error, falling back to search:', e);
    }
    // Fallback to provider or general search
    return await api.search(channelName, provider, undefined, undefined, 100);
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

  // Playlists — token-scoped per logged-in user
  getPlaylists: async (userId?: string, token?: string | null): Promise<Playlist[]> => {
    try {
      const uid = userId || getStoredUserId();
      const t = token !== undefined ? token : getStoredToken();
      const headers: HeadersInit = {};
      if (t) headers['Authorization'] = `Bearer ${t}`;
      const res = await fetch(`${API_BASE}/playlists?userId=${uid}`, { headers });
      if (!res.ok) throw new Error('Fetch playlists failed');
      const data = await res.json();
      return data.playlists || [];
    } catch (err) {
      console.warn('API getPlaylists error:', err);
      return [];
    }
  },

  createPlaylist: async (playlistData: Partial<Playlist>, token?: string | null): Promise<Playlist> => {
    const uid = playlistData.userId || getStoredUserId();
    const t = token !== undefined ? token : getStoredToken();
    const res = await fetch(`${API_BASE}/playlists`, {
      method: 'POST',
      headers: authHeaders(t),
      body: JSON.stringify({ ...playlistData, userId: uid })
    });
    const data = await res.json();
    return data.playlist;
  },

  deletePlaylist: async (id: string, token?: string | null) => {
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
    return await res.json();
  },

  removeItemFromPlaylist: async (playlistId: string, mediaItemId: string, token?: string | null) => {
    const t = token !== undefined ? token : getStoredToken();
    await fetch(`${API_BASE}/playlists/${playlistId}/items/${mediaItemId}`, {
      method: 'DELETE',
      headers: t ? { 'Authorization': `Bearer ${t}` } : {}
    });
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
  recordHistory: async (userId: string, mediaItemId: string, playedSeconds: number, completionRate: number, token?: string | null) => {
    await fetch(`${API_BASE}/library/history`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ userId, mediaItemId, playedSeconds, completionRate })
    });
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
  }
};
