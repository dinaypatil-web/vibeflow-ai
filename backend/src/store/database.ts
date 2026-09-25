import fs from 'fs';
import path from 'path';
import { 
  User, 
  UserPreferences, 
  MediaItem, 
  Playlist, 
  PlaylistItem, 
  DownloadJob,
  GenreCategory,
  MoodCategory
} from '../types';

export interface DatabaseSchema {
  users: User[];
  passwords: Record<string, string>; // userId -> hashedPassword
  mediaItems: MediaItem[];
  playlists: Playlist[];
  favorites: { id: string; userId: string; mediaItemId: string; createdAt: string }[];
  history: { id: string; userId: string; mediaItemId: string; playedSeconds: number; completionRate: number; listenedAt: string }[];
  downloadJobs: DownloadJob[];
  userFeedback: { id: string; userId: string; targetId: string; feedbackType: string; payload?: any; createdAt: string }[];
}

const DATA_DIR = path.join(__dirname, '../../data');
const DATA_FILE = path.join(DATA_DIR, 'vibeflow_db.json');

// Initial curated seed tracks
// Verified CORS-accessible public domain audio streams
// All non-YouTube tracks use stable archive.org / public CDN streams
const PUBLIC_STREAMS = {
  // Free Music Archive & archive.org verified streams
  lofi_chill:    'https://archive.org/download/testmp3testfile/mpthreetest.mp3',
  classical_1:   'https://upload.wikimedia.org/wikipedia/commons/6/6e/Grieg_-_In_the_Hall_of_the_Mountain_King.ogg',
  classical_2:   'https://upload.wikimedia.org/wikipedia/commons/b/bd/Bach_Cello_Suite_1_Prelude.ogg',
  jazz_1:        'https://upload.wikimedia.org/wikipedia/commons/9/9f/Clair_de_lune.ogg',
  ambient_1:     'https://upload.wikimedia.org/wikipedia/commons/2/2f/Handel_-_Messiah_-_03_And_the_glory.ogg',
  electronic_1:  'https://upload.wikimedia.org/wikipedia/commons/c/c8/Example.ogg',
  folk_1:        'https://upload.wikimedia.org/wikipedia/commons/1/11/Wolfgang_Amadeus_Mozart_-_Eine_kleine_Nachtmusik_-_1._Allegro.ogg',
  world_1:       'https://upload.wikimedia.org/wikipedia/commons/3/3a/Moonlight_sonata.ogg',
  pop_1:         'https://upload.wikimedia.org/wikipedia/commons/4/4e/BWV_543-fugue.ogg',
  sleep_1:       'https://upload.wikimedia.org/wikipedia/commons/f/f4/Chopin_-_Nocturne_op_9_no_2.ogg',
  podcast_1:     'https://upload.wikimedia.org/wikipedia/commons/d/d9/Beethoven_Piano_Sonata_14_-_mvt_1_-_Artur_Pizarro.ogg',
  devotional_1:  'https://upload.wikimedia.org/wikipedia/commons/5/50/Beethoven_Symphony_5_i.ogg',
};

const INITIAL_MEDIA_ITEMS: MediaItem[] = [
  {
    id: 'track-1',
    provider: 'youtube',
    providerId: 'BddP6PYo2gs', // Kesariya – embeddable
    title: 'Kesariya (Soulful Acoustic)',
    artist: 'Arijit Singh & Pritam',
    album: 'Brahmastra Acoustic Sessions',
    thumbnail: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=600&q=80',
    duration: 268,
    genre: 'Bollywood',
    mood: 'Romantic',
    language: 'Hindi',
    releaseYear: 2022,
    capabilities: ['stream_embed', 'preview_only'],
    embedUrl: 'https://www.youtube.com/embed/BddP6PYo2gs',
    streamUrl: PUBLIC_STREAMS.lofi_chill,  // fallback if embed blocked
    isOfflinePermitted: false,
    isLocal: false,
    lyrics: 'Mujhko itna bataaye koi... Kaise tujhse dil na lagaaye koi... Kesariya tera ishq hai piya...',
    confidenceScore: 0.96,
    tags: ['acoustic', 'romantic', 'bollywood', 'love', 'guitar'],
    playbackCount: 1420
  },
  {
    id: 'track-2',
    provider: 'jamendo',
    providerId: 'lofi-mumbai-01',
    title: 'Midnight Marine Drive (Lo-Fi Beats)',
    artist: 'Bombay Chill Collective',
    album: 'Monsoon in Mumbai',
    thumbnail: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80',
    duration: 215,
    genre: 'Lo-Fi & Chill',
    mood: 'Focus & Study',
    language: 'Instrumental',
    releaseYear: 2024,
    capabilities: ['stream_direct', 'offline_download'],
    streamUrl: PUBLIC_STREAMS.lofi_chill,
    isOfflinePermitted: true,
    isLocal: false,
    confidenceScore: 0.98,
    tags: ['lofi', 'chill', 'study', 'rain', 'nostalgic', 'peaceful'],
    playbackCount: 3890
  },
  {
    id: 'track-3',
    provider: 'youtube',
    providerId: '1F3HM635S0k', // Lag Ja Gale
    title: 'Lag Ja Gale (Golden Strings Remaster)',
    artist: 'Lata Mangeshkar & Madan Mohan',
    album: 'Timeless Classics',
    thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80',
    duration: 254,
    genre: 'Hindi Retro',
    mood: 'Nostalgic',
    language: 'Hindi',
    releaseYear: 1964,
    capabilities: ['stream_embed', 'preview_only'],
    embedUrl: 'https://www.youtube.com/embed/1F3HM635S0k',
    streamUrl: PUBLIC_STREAMS.classical_2,
    isOfflinePermitted: false,
    isLocal: false,
    lyrics: 'Lag ja gale ki phir ye haseen raat ho na ho... Shayad phir is janam mein mulaqaat ho na ho...',
    confidenceScore: 0.99,
    tags: ['retro', 'nostalgic', 'strings', 'vintage', 'classic', 'emotional'],
    playbackCount: 5200
  },
  {
    id: 'track-4',
    provider: 'jamendo',
    providerId: 'marathi-energy-01',
    title: 'Dhol Tasha High-Voltage Groove',
    artist: 'Pune Rhythm Syndicate',
    album: 'Ganesh Utsav Echoes',
    thumbnail: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80',
    duration: 290,
    genre: 'Marathi',
    mood: 'Workout & Energy',
    language: 'Marathi',
    releaseYear: 2023,
    capabilities: ['stream_direct', 'offline_download'],
    streamUrl: PUBLIC_STREAMS.classical_1,
    isOfflinePermitted: true,
    isLocal: false,
    confidenceScore: 0.95,
    tags: ['dhol', 'tasha', 'marathi', 'workout', 'energy', 'percussion'],
    playbackCount: 2940
  },
  {
    id: 'track-5',
    provider: 'youtube',
    providerId: 'YOqs0g7_p3g', // Chaiyya Chaiyya
    title: 'Chaiyya Chaiyya (Sufi Electro Pulse)',
    artist: 'A.R. Rahman & Sukhwinder Singh',
    album: 'Dil Se Reimagined',
    thumbnail: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=600&q=80',
    duration: 390,
    genre: 'Bollywood',
    mood: 'Party & Dance',
    language: 'Hindi',
    releaseYear: 1998,
    capabilities: ['stream_embed', 'preview_only'],
    embedUrl: 'https://www.youtube.com/embed/YOqs0g7_p3g',
    streamUrl: PUBLIC_STREAMS.ambient_1,
    isOfflinePermitted: false,
    isLocal: false,
    lyrics: 'Jinke sar ho ishq ki chhaanv... Paanv ke neeche jannat hogi...',
    confidenceScore: 0.97,
    tags: ['dance', 'energetic', 'sufi', 'legendary', 'train'],
    playbackCount: 8900
  },
  {
    id: 'track-6',
    provider: 'jamendo',
    providerId: 'sitar-monsoon-02',
    title: 'Raag Megh (Monsoon Sitar Meditation)',
    artist: 'Pandit Niladri Sen',
    album: 'Ragas of Eternity',
    thumbnail: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=600&q=80',
    duration: 480,
    genre: 'Classical & Instrumental',
    mood: 'Calm & Peaceful',
    language: 'Instrumental',
    releaseYear: 2021,
    capabilities: ['stream_direct', 'offline_download'],
    streamUrl: PUBLIC_STREAMS.jazz_1,
    isOfflinePermitted: true,
    isLocal: false,
    confidenceScore: 0.99,
    tags: ['sitar', 'classical', 'indian', 'peaceful', 'meditation', 'monsoon'],
    playbackCount: 4120
  },
  {
    id: 'track-7',
    provider: 'youtube',
    // FIX: corrected providerId from invalid 'cl0a3i' to match the embedUrl video ID
    providerId: 'VNs_cCtdbPc', // Brown Munde – AP Dhillon
    title: 'Brown Munde (Acoustic Unplugged)',
    artist: 'AP Dhillon & Gurinder Gill',
    album: 'Hidden Gems',
    thumbnail: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=600&q=80',
    duration: 232,
    genre: 'Punjabi',
    mood: 'Uplifting & Happy',
    language: 'Punjabi',
    releaseYear: 2020,
    capabilities: ['stream_embed', 'preview_only'],
    embedUrl: 'https://www.youtube.com/embed/VNs_cCtdbPc',
    streamUrl: PUBLIC_STREAMS.folk_1,
    isOfflinePermitted: false,
    isLocal: false,
    lyrics: 'Desi munde... Brown Munde... Always rolling high...',
    confidenceScore: 0.94,
    tags: ['punjabi', 'urban', 'unplugged', 'uplifting', 'vibe'],
    playbackCount: 6300
  },
  {
    id: 'track-8',
    provider: 'jamendo',
    providerId: 'cyber-synth-03',
    title: 'Neon Mumbai 2099 (Synthwave Rush)',
    artist: 'CyberBandit',
    album: 'Digital Monsoon',
    thumbnail: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=600&q=80',
    duration: 275,
    genre: 'EDM & Electronic',
    mood: 'Workout & Energy',
    language: 'Instrumental',
    releaseYear: 2025,
    capabilities: ['stream_direct', 'offline_download'],
    streamUrl: PUBLIC_STREAMS.electronic_1,
    isOfflinePermitted: true,
    isLocal: false,
    confidenceScore: 0.96,
    tags: ['synthwave', 'cyberpunk', 'electronic', 'workout', 'bass', 'energetic'],
    playbackCount: 3100
  },
  {
    id: 'track-9',
    provider: 'jamendo',
    providerId: 'sacred-flute-04',
    title: 'Om Shanti (Bansuri Bamboo Flute)',
    artist: 'Vrindavan Sacred Ensemble',
    album: 'Temples of the Ganges',
    thumbnail: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=600&q=80',
    duration: 360,
    genre: 'Devotional',
    mood: 'Spiritual & Devotional',
    language: 'Sanskrit',
    releaseYear: 2023,
    capabilities: ['stream_direct', 'offline_download'],
    streamUrl: PUBLIC_STREAMS.devotional_1,
    isOfflinePermitted: true,
    isLocal: false,
    confidenceScore: 0.98,
    tags: ['flute', 'spiritual', 'meditation', 'mantra', 'peaceful'],
    playbackCount: 7400
  },
  {
    id: 'track-10',
    provider: 'jamendo',
    providerId: 'podcast-neuro-05',
    title: 'The AI Revolution & The Creative Flow',
    artist: 'Dr. Maya Patel',
    album: 'NeuroVibe Talks Ep. 42',
    thumbnail: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=600&q=80',
    duration: 620,
    genre: 'Podcast & Talks',
    mood: 'Focus & Study',
    language: 'English',
    releaseYear: 2026,
    capabilities: ['stream_direct', 'offline_download'],
    streamUrl: PUBLIC_STREAMS.podcast_1,
    isOfflinePermitted: true,
    isLocal: false,
    confidenceScore: 0.99,
    tags: ['podcast', 'ai', 'neuroscience', 'focus', 'creativity'],
    playbackCount: 2150
  },
  {
    id: 'track-11',
    provider: 'jamendo',
    providerId: 'sleep-waves-06',
    title: 'Theta Waves 6Hz (Deep Delta Sleep Drift)',
    artist: 'Slumber Sonic Lab',
    album: 'Night Realm Ambient',
    thumbnail: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=600&q=80',
    duration: 540,
    genre: 'Classical & Instrumental',
    mood: 'Sleep & Relaxation',
    language: 'Instrumental',
    releaseYear: 2024,
    capabilities: ['stream_direct', 'offline_download'],
    streamUrl: PUBLIC_STREAMS.sleep_1,
    isOfflinePermitted: true,
    isLocal: false,
    confidenceScore: 0.98,
    tags: ['sleep', 'ambient', 'relaxation', 'theta', 'night'],
    playbackCount: 6800
  },
  {
    id: 'track-12',
    provider: 'youtube',
    providerId: 'JGwWNGJdvx8', // Shape of You
    title: 'Shape of You (Acoustic Lo-Fi Remix)',
    artist: 'Ed Sheeran & Tropical Chill',
    album: 'Global Acoustic Vibes',
    thumbnail: 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?auto=format&fit=crop&w=600&q=80',
    duration: 233,
    genre: 'Pop',
    mood: 'Uplifting & Happy',
    language: 'English',
    releaseYear: 2017,
    capabilities: ['stream_embed', 'preview_only'],
    embedUrl: 'https://www.youtube.com/embed/JGwWNGJdvx8',
    streamUrl: PUBLIC_STREAMS.world_1,
    isOfflinePermitted: false,
    isLocal: false,
    lyrics: 'The club isn\'t the best place to find a lover so the bar is where I go... I\'m in love with the shape of you...',
    confidenceScore: 0.95,
    tags: ['pop', 'acoustic', 'uplifting', 'dance', 'guitar'],
    playbackCount: 9400
  }
];

class MemoryDatabase {
  private data: DatabaseSchema;

  constructor() {
    this.data = {
      users: [],
      passwords: {},
      mediaItems: INITIAL_MEDIA_ITEMS,
      playlists: [],
      favorites: [],
      history: [],
      downloadJobs: [],
      userFeedback: []
    };
    this.loadFromDisk();
    this.seedDefaultPlaylists();
  }

  private getFilePath(): { dir: string; file: string } {
    if (process.env.VERCEL) {
      return { dir: '/tmp', file: '/tmp/vibeflow_db.json' };
    }
    return { dir: DATA_DIR, file: DATA_FILE };
  }

  private loadFromDisk() {
    try {
      const { file } = this.getFilePath();
      const targetFile = fs.existsSync(file) ? file : (fs.existsSync(DATA_FILE) ? DATA_FILE : null);
      if (targetFile) {
        const raw = fs.readFileSync(targetFile, 'utf-8');
        const parsed = JSON.parse(raw);
        this.data = { ...this.data, ...parsed };
      }
    } catch (err) {
      console.warn('Could not read existing data file, using fresh in-memory data store', err);
    }
  }

  public saveToDisk() {
    try {
      const { dir, file } = this.getFilePath();
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(file, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.warn('Could not persist data file to disk', err);
    }
  }

  private seedDefaultPlaylists() {
    if (this.data.playlists.length === 0) {
      const demoUserId = 'demo-user-id';
      
      const defaultPlaylists: Playlist[] = [
        {
          id: 'playlist-morning',
          userId: demoUserId,
          title: 'My Morning Motivation',
          description: 'High energy and positive morning vibes to kickstart your day.',
          coverArt: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=600&q=80',
          isSmart: true,
          smartDefinition: {
            rules: [
              { field: 'mood', operator: 'in', value: ['Workout & Energy', 'Uplifting & Happy'] }
            ],
            matchLogic: 'OR',
            limit: 20
          },
          isPrivate: false,
          isShareable: true,
          isPinned: true,
          itemCount: 4,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'playlist-instrumentals',
          userId: demoUserId,
          title: 'Relaxing Instrumentals',
          description: 'Acoustic sitar, classical bamboo flutes, and soothing piano melodies.',
          coverArt: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=600&q=80',
          isSmart: true,
          smartDefinition: {
            rules: [
              { field: 'mood', operator: 'in', value: ['Calm & Peaceful', 'Focus & Study', 'Sleep & Relaxation'] },
              { field: 'genre', operator: 'in', value: ['Classical & Instrumental', 'Lo-Fi & Chill', 'Devotional'] }
            ],
            matchLogic: 'AND',
            limit: 25
          },
          isPrivate: false,
          isShareable: true,
          isPinned: true,
          itemCount: 5,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'playlist-workout',
          userId: demoUserId,
          title: 'Workout Energy & Dhol Beats',
          description: 'High BPM, Dhol Tasha, and Synthwave for intense fitness sessions.',
          coverArt: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80',
          isSmart: true,
          smartDefinition: {
            rules: [
              { field: 'mood', operator: 'equals', value: 'Workout & Energy' }
            ],
            matchLogic: 'AND',
            limit: 15
          },
          isPrivate: false,
          isShareable: true,
          itemCount: 3,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'playlist-retro',
          userId: demoUserId,
          title: 'Hindi Retro Favorites',
          description: 'Timeless melodies from the golden era of Indian cinema.',
          coverArt: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80',
          isSmart: false,
          isPrivate: false,
          isShareable: true,
          itemCount: 2,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];

      this.data.playlists = defaultPlaylists;
      this.saveToDisk();
    }
  }

  // User operations
  public findUserByEmail(email: string): User | undefined {
    return this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  public findUserById(id: string): User | undefined {
    return this.data.users.find(u => u.id === id);
  }

  public createUser(user: User, passwordHash: string): User {
    this.data.users.push(user);
    this.data.passwords[user.id] = passwordHash;
    this.saveToDisk();
    return user;
  }

  public updateUserPreferences(userId: string, prefs: Partial<UserPreferences>): UserPreferences | undefined {
    const user = this.findUserById(userId);
    if (!user) return undefined;
    user.preferences = {
      ...user.preferences,
      ...prefs,
      userId
    } as UserPreferences;
    this.saveToDisk();
    return user.preferences;
  }

  public getPasswordHash(userId: string): string | undefined {
    return this.data.passwords[userId];
  }

  // Media operations
  public getAllMediaItems(): MediaItem[] {
    return [...this.data.mediaItems];
  }

  public findMediaItemById(id: string): MediaItem | undefined {
    return this.data.mediaItems.find(m => m.id === id);
  }

  public addMediaItem(item: MediaItem): MediaItem {
    const existing = this.data.mediaItems.find(m => m.id === item.id || (m.provider === item.provider && m.providerId === item.providerId));
    if (existing) {
      Object.assign(existing, item);
      this.saveToDisk();
      return existing;
    }
    this.data.mediaItems.push(item);
    this.saveToDisk();
    return item;
  }

  // Playlists
  public getPlaylistsByUserId(userId: string): Playlist[] {
    return this.data.playlists.filter(p => p.userId === userId || !p.isPrivate);
  }

  public findPlaylistById(id: string): Playlist | undefined {
    return this.data.playlists.find(p => p.id === id);
  }

  public createPlaylist(playlist: Playlist): Playlist {
    this.data.playlists.push(playlist);
    this.saveToDisk();
    return playlist;
  }

  public updatePlaylist(id: string, updates: Partial<Playlist>): Playlist | undefined {
    const playlist = this.findPlaylistById(id);
    if (!playlist) return undefined;
    Object.assign(playlist, updates, { updatedAt: new Date().toISOString() });
    this.saveToDisk();
    return playlist;
  }

  public deletePlaylist(id: string): boolean {
    const index = this.data.playlists.findIndex(p => p.id === id);
    if (index === -1) return false;
    this.data.playlists.splice(index, 1);
    this.saveToDisk();
    return true;
  }

  // Favorites
  public getFavorites(userId: string): MediaItem[] {
    const favItemIds = this.data.favorites
      .filter(f => f.userId === userId)
      .map(f => f.mediaItemId);
    return this.data.mediaItems.filter(m => favItemIds.includes(m.id));
  }

  public toggleFavorite(userId: string, mediaItemId: string): boolean {
    const idx = this.data.favorites.findIndex(f => f.userId === userId && f.mediaItemId === mediaItemId);
    if (idx !== -1) {
      this.data.favorites.splice(idx, 1);
      this.saveToDisk();
      return false; // un-favorited
    } else {
      this.data.favorites.push({
        id: `fav-${Date.now()}`,
        userId,
        mediaItemId,
        createdAt: new Date().toISOString()
      });
      this.saveToDisk();
      return true; // favorited
    }
  }

  public isFavorite(userId: string, mediaItemId: string): boolean {
    return this.data.favorites.some(f => f.userId === userId && f.mediaItemId === mediaItemId);
  }

  // History
  public recordHistory(userId: string, mediaItemId: string, playedSeconds: number, completionRate: number) {
    this.data.history.unshift({
      id: `hist-${Date.now()}`,
      userId,
      mediaItemId,
      playedSeconds,
      completionRate,
      listenedAt: new Date().toISOString()
    });
    // Increment playback count on media item
    const media = this.findMediaItemById(mediaItemId);
    if (media) {
      media.playbackCount = (media.playbackCount || 0) + 1;
    }
    // keep history reasonable
    if (this.data.history.length > 500) {
      this.data.history = this.data.history.slice(0, 500);
    }
    this.saveToDisk();
  }

  public getHistory(userId: string): { mediaItem: MediaItem; playedSeconds: number; listenedAt: string }[] {
    return this.data.history
      .filter(h => h.userId === userId)
      .map(h => {
        const item = this.findMediaItemById(h.mediaItemId);
        return item ? { mediaItem: item, playedSeconds: h.playedSeconds, listenedAt: h.listenedAt } : null;
      })
      .filter(Boolean) as { mediaItem: MediaItem; playedSeconds: number; listenedAt: string }[];
  }

  // Feedback & Classification Overrides
  public recordFeedback(userId: string, targetId: string, feedbackType: string, payload?: any) {
    this.data.userFeedback.push({
      id: `fb-${Date.now()}`,
      userId,
      targetId,
      feedbackType,
      payload,
      createdAt: new Date().toISOString()
    });
    this.saveToDisk();
  }
}

export const db = new MemoryDatabase();
