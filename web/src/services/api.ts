import { 
  MediaItem, 
  Playlist, 
  User, 
  RecommendationResponse, 
  AIClassificationResult, 
  NaturalLanguageSearchQuery,
  MediaProvider 
} from '../types';

const API_BASE = (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/$/, '') : '') || '/api';

export const api = {
  // Search
  search: async (query: string, provider?: MediaProvider, genre?: string, mood?: string, limit = 48): Promise<MediaItem[]> => {
    try {
      const params = new URLSearchParams();
      if (query) params.append('q', query);
      if (provider) params.append('provider', provider);
      if (genre) params.append('genre', genre);
      if (mood) params.append('mood', mood);
      params.append('limit', limit.toString());

      const res = await fetch(`${API_BASE}/media/search?${params.toString()}`);
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      return data.items || [];
    } catch (err) {
      console.warn('API search error:', err);
      return [];
    }
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

  // Playlists
  getPlaylists: async (userId = 'demo-user-id'): Promise<Playlist[]> => {
    try {
      const res = await fetch(`${API_BASE}/playlists?userId=${userId}`);
      if (!res.ok) throw new Error('Fetch playlists failed');
      const data = await res.json();
      return data.playlists || [];
    } catch (err) {
      console.warn('API getPlaylists error:', err);
      return [];
    }
  },

  createPlaylist: async (playlistData: Partial<Playlist>): Promise<Playlist> => {
    const res = await fetch(`${API_BASE}/playlists`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(playlistData)
    });
    const data = await res.json();
    return data.playlist;
  },

  deletePlaylist: async (id: string) => {
    await fetch(`${API_BASE}/playlists/${id}`, { method: 'DELETE' });
  },

  addItemToPlaylist: async (playlistId: string, mediaItemId: string) => {
    const res = await fetch(`${API_BASE}/playlists/${playlistId}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mediaItemId })
    });
    return await res.json();
  },

  removeItemFromPlaylist: async (playlistId: string, mediaItemId: string) => {
    await fetch(`${API_BASE}/playlists/${playlistId}/items/${mediaItemId}`, { method: 'DELETE' });
  },

  // Recommendations Feed
  getPersonalizedFeed: async (userId = 'demo-user-id'): Promise<RecommendationResponse[]> => {
    try {
      const res = await fetch(`${API_BASE}/recommendations/feed?userId=${userId}`);
      if (!res.ok) throw new Error('Fetch feed failed');
      const data = await res.json();
      return data.feed || [];
    } catch (err) {
      console.warn('API feed error:', err);
      return [];
    }
  },

  // Favorites
  getFavorites: async (userId = 'demo-user-id'): Promise<MediaItem[]> => {
    try {
      const res = await fetch(`${API_BASE}/library/favorites?userId=${userId}`);
      const data = await res.json();
      return data.favorites || [];
    } catch (err) {
      return [];
    }
  },

  toggleFavorite: async (userId: string, mediaItemId: string): Promise<boolean> => {
    const res = await fetch(`${API_BASE}/library/favorites/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, mediaItemId })
    });
    const data = await res.json();
    return data.isFavorite;
  },

  // History
  recordHistory: async (userId: string, mediaItemId: string, playedSeconds: number, completionRate: number) => {
    await fetch(`${API_BASE}/library/history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, mediaItemId, playedSeconds, completionRate })
    });
  },

  // Providers
  getProviders: async () => {
    const res = await fetch(`${API_BASE}/library/providers`);
    return await res.json();
  },

  // 1-Click Demo Login
  loginDemo: async (): Promise<{ user: User; token: string }> => {
    const res = await fetch(`${API_BASE}/auth/demo`, { method: 'POST' });
    return await res.json();
  }
};
