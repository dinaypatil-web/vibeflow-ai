export type MediaProvider = 'youtube' | 'spotify' | 'soundcloud' | 'local' | 'jamendo' | 'public_domain';

export type PlaybackCapability = 'stream_embed' | 'stream_direct' | 'offline_download' | 'preview_only' | 'external_link';

export type MoodCategory = 
  | 'Uplifting & Happy'
  | 'Calm & Peaceful'
  | 'Focus & Study'
  | 'Workout & Energy'
  | 'Romantic'
  | 'Nostalgic'
  | 'Sad & Emotional'
  | 'Spiritual & Devotional'
  | 'Sleep & Relaxation'
  | 'Party & Dance';

export type GenreCategory =
  | 'Bollywood'
  | 'Hindi Retro'
  | 'Punjabi'
  | 'Marathi'
  | 'Tamil & Telugu'
  | 'Pop'
  | 'Lo-Fi & Chill'
  | 'EDM & Electronic'
  | 'Rock'
  | 'Hip-Hop'
  | 'Classical & Instrumental'
  | 'Acoustic'
  | 'Devotional'
  | 'Podcast & Talks';

export interface MediaItem {
  id: string;
  provider: MediaProvider;
  providerId: string;
  title: string;
  artist: string;
  album?: string;
  thumbnail: string;
  duration: number; // in seconds
  genre: GenreCategory;
  mood: MoodCategory;
  language?: string;
  releaseYear?: number;
  capabilities: PlaybackCapability[];
  streamUrl?: string;
  embedUrl?: string;
  localPath?: string;
  isOfflinePermitted: boolean;
  isLocal: boolean;
  lyrics?: string;
  confidenceScore?: number; // AI classification confidence (0 to 1)
  tags?: string[];
  playbackCount?: number;
  addedAt?: string;
}

export interface PlaylistRule {
  field: 'genre' | 'mood' | 'artist' | 'language' | 'duration' | 'listeningCount' | 'isFavorite' | 'isLocal';
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'in';
  value: any;
}

export interface SmartPlaylistDefinition {
  rules: PlaylistRule[];
  matchLogic: 'AND' | 'OR';
  sortBy?: 'addedAt' | 'title' | 'artist' | 'duration' | 'listeningCount';
  sortDirection?: 'asc' | 'desc';
  limit?: number;
}

export interface Playlist {
  id: string;
  userId: string;
  title: string;
  description?: string;
  coverArt?: string;
  isSmart: boolean;
  smartDefinition?: SmartPlaylistDefinition;
  isPrivate: boolean;
  isShareable: boolean;
  isPinned?: boolean;
  itemCount: number;
  items?: PlaylistItem[];
  createdAt: string;
  updatedAt: string;
}

export interface PlaylistItem {
  id: string;
  playlistId: string;
  mediaItemId: string;
  orderIndex: number;
  addedAt: string;
  mediaItem: MediaItem;
}

export interface UserPreferences {
  id?: string;
  userId: string;
  favoriteGenres: GenreCategory[];
  favoriteMoods: MoodCategory[];
  preferredLanguages: string[];
  favoriteArtists: string[];
  preferredDurationMaxMinutes?: number;
  autoPlaySimilar: boolean;
  streamQuality: 'low' | 'standard' | 'high';
  downloadQuality: 'standard' | 'high';
  wifiOnlyDownloads: boolean;
  enableListeningHistory: boolean;
  theme: 'dark' | 'light' | 'cyberpunk' | 'system';
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: 'user' | 'admin';
  preferences?: UserPreferences;
  createdAt: string;
}

export interface DownloadJob {
  id: string;
  mediaItemId: string;
  mediaItem: MediaItem;
  status: 'pending' | 'downloading' | 'completed' | 'paused' | 'failed';
  progress: number; // 0 to 100
  downloadedBytes: number;
  totalBytes: number;
  localPath?: string;
  errorMessage?: string;
  startedAt: string;
  completedAt?: string;
}

export interface RecommendationResponse {
  sectionTitle: string;
  description: string;
  reason: string;
  items: MediaItem[];
}

export interface AIClassificationResult {
  mediaItemId: string;
  suggestedGenre: GenreCategory;
  suggestedMood: MoodCategory;
  confidenceScore: number;
  reasoning: string;
  detectedTags: string[];
}

export interface NaturalLanguageSearchQuery {
  query: string;
  extractedMood?: MoodCategory;
  extractedGenre?: GenreCategory;
  extractedLanguage?: string;
  extractedDurationMax?: number;
  extractedArtist?: string;
  semanticMatchSummary: string;
}
