import fs from 'fs';
import path from 'path';
import { 
  User, 
  UserSummary,
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
  history: { id: string; userId: string; mediaItemId: string; playedSeconds: number; completionRate: number; listenedAt: string; mediaItem?: MediaItem }[];
  downloadJobs: DownloadJob[];
  userFeedback: { id: string; userId: string; targetId: string; feedbackType: string; payload?: any; createdAt: string }[];
  deletedPlaylistIds?: string[];
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
  },
  {
    id: 'spotify-6VBhH7CyP56BXjp8VsDFPZ',
    provider: 'spotify',
    providerId: '6VBhH7CyP56BXjp8VsDFPZ',
    title: 'Kesariya (From "Brahmastra")',
    artist: 'Pritam, Arijit Singh, Amitabh Bhattacharya',
    album: 'Brahmastra (Original Soundtrack)',
    thumbnail: 'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e02f9de0806dd65b1d5e15cefd1',
    duration: 268,
    genre: 'Bollywood',
    mood: 'Romantic',
    language: 'Hindi',
    releaseYear: 2022,
    capabilities: ['stream_direct', 'stream_embed', 'preview_only', 'external_link'],
    streamUrl: 'https://aac.saavncdn.com/871/c2febd353f3a076a406fa37510f31f9f_160.mp4',
    embedUrl: 'https://open.spotify.com/embed/track/6VBhH7CyP56BXjp8VsDFPZ',
    isOfflinePermitted: false,
    isLocal: false,
    lyrics: 'Mujhko itna bataaye koi... Kaise tujhse dil na lagaaye koi... Kesariya tera ishq hai piya...',
    confidenceScore: 0.98,
    tags: ['spotify', 'bollywood', 'arijit_singh', 'romantic', 'love', 'full_track'],
    playbackCount: 95400
  },
  {
    id: 'spotify-4cOdK2wGLETKBW3PvgPWqT',
    provider: 'spotify',
    providerId: '4cOdK2wGLETKBW3PvgPWqT',
    title: 'Never Gonna Give You Up',
    artist: 'Rick Astley',
    album: 'Whenever You Need Somebody',
    thumbnail: 'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e02baf89eb11ec7c657805d2da0',
    duration: 213,
    genre: 'Pop',
    mood: 'Uplifting & Happy',
    language: 'English',
    releaseYear: 1987,
    capabilities: ['stream_direct', 'stream_embed', 'preview_only', 'external_link'],
    streamUrl: 'https://aac.saavncdn.com/793/bd42241d5bc13017588669eada1eebd2_160.mp4',
    embedUrl: 'https://open.spotify.com/embed/track/4cOdK2wGLETKBW3PvgPWqT',
    isOfflinePermitted: false,
    isLocal: false,
    lyrics: 'Never gonna give you up, never gonna let you down, never gonna run around and desert you...',
    confidenceScore: 0.99,
    tags: ['spotify', 'pop', 'retro', '80s', 'classic', 'full_track'],
    playbackCount: 120500
  },
  {
    id: 'spotify-0dEIca2nhcxDUV8C5QkPYb',
    provider: 'spotify',
    providerId: '0dEIca2nhcxDUV8C5QkPYb',
    title: 'Give Life Back to Music',
    artist: 'Daft Punk',
    album: 'Random Access Memories',
    thumbnail: 'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e029b9b36b0e22870b9f542d937',
    duration: 275,
    genre: 'EDM & Electronic',
    mood: 'Workout & Energy',
    language: 'English',
    releaseYear: 2013,
    capabilities: ['stream_direct', 'stream_embed', 'preview_only', 'external_link'],
    streamUrl: 'https://aac.saavncdn.com/087/76d361a84d3caf3b3f709eedb4772705_160.mp4',
    embedUrl: 'https://open.spotify.com/embed/track/0dEIca2nhcxDUV8C5QkPYb',
    isOfflinePermitted: false,
    isLocal: false,
    confidenceScore: 0.97,
    tags: ['spotify', 'electronic', 'disco', 'energy', 'full_track'],
    playbackCount: 88400
  },
  {
    id: 'spotify-0EwRpK9wY6lHfcJSt82w4x',
    provider: 'spotify',
    providerId: '0EwRpK9wY6lHfcJSt82w4x',
    title: 'Aaj Se Teri',
    artist: 'Amit Trivedi, Arijit Singh',
    album: 'Padman',
    thumbnail: 'https://image-cdn-fa.spotifycdn.com/image/ab67616d00001e026b652c887eea91470f495eca',
    duration: 312,
    genre: 'Bollywood',
    mood: 'Romantic',
    language: 'Hindi',
    releaseYear: 2018,
    capabilities: ['stream_direct', 'stream_embed', 'preview_only', 'external_link'],
    streamUrl: 'https://aac.saavncdn.com/565/3e1176b6bb17f8a7e04040da423ea83b_160.mp4',
    embedUrl: 'https://open.spotify.com/embed/track/0EwRpK9wY6lHfcJSt82w4x',
    isOfflinePermitted: false,
    isLocal: false,
    confidenceScore: 0.96,
    tags: ['spotify', 'bollywood', 'arijit_singh', 'full_track'],
    playbackCount: 65200
  }
];

class MemoryDatabase {
  private data: DatabaseSchema;

  constructor() {
    this.data = {
      users: [],
      passwords: {},
      mediaItems: INITIAL_MEDIA_ITEMS.map(item => {
        if (!item.releaseDate) {
          if (item.releaseYear) {
            const hash = (item.id || item.title || '').split('').reduce((acc: number, c: string) => acc + c.charCodeAt(0), 0);
            const m = String((hash % 12) + 1).padStart(2, '0');
            const d = String((hash % 28) + 1).padStart(2, '0');
            return { ...item, releaseDate: `${item.releaseYear}-${m}-${d}` };
          }
          return { ...item, releaseDate: '2024-01-01' };
        }
        return item;
      }),
      playlists: [],
      favorites: [],
      history: [],
      downloadJobs: [],
      userFeedback: [],
      deletedPlaylistIds: []
    };
    this.loadFromDisk();
    this.seedDefaultPlaylists();
    this.ensurePlaylistIntegrity();
  }

  private cloudSyncInFlight: Promise<void> | null = null;
  private readonly CLOUD_KV_APP_KEY = process.env.VIBEFLOW_KV_KEY || '1iqtcwcv';
  private readonly GIST_TOKEN = process.env.GITHUB_GIST_TOKEN || process.env.GH_TOKEN || '';
  private readonly GIST_ID = process.env.VIBEFLOW_GIST_ID || '4b45f50174bdc8a20ef0ac9779571405';

  private toCloudKey(ident: string): string {
    return 'u_' + ident.trim().toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
  }

  public async syncUserToCloud(user: User, passwordHash: string): Promise<boolean> {
    try {
      const record = {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        role: user.role || 'user',
        preferences: user.preferences,
        createdAt: user.createdAt || new Date().toISOString(),
        hash: passwordHash
      };
      const b64 = Buffer.from(JSON.stringify(record)).toString('base64url');
      const keys = [
        this.toCloudKey(user.id),
        this.toCloudKey(user.email),
        user.username ? this.toCloudKey(user.username) : null,
        user.email && user.email.includes('@') ? this.toCloudKey(user.email.split('@')[0]) : null
      ].filter(Boolean) as string[];

      // Non-blocking with 1500ms timeout so Vercel lambdas never hang
      Promise.all(keys.map(k => 
        fetch(`https://keyvalue.immanuel.co/api/KeyVal/UpdateValue/${this.CLOUD_KV_APP_KEY}/${k}/${b64}`, {
          method: 'POST',
          signal: AbortSignal.timeout(1500)
        }).catch(() => {})
      )).catch(() => {});
      return true;
    } catch {
      return false;
    }
  }

  public async fetchUserFromCloud(identifier: string): Promise<User | undefined> {
    if (!identifier) return undefined;
    try {
      const key = this.toCloudKey(identifier);
      const res = await fetch(`https://keyvalue.immanuel.co/api/KeyVal/GetValue/${this.CLOUD_KV_APP_KEY}/${key}`, {
        signal: AbortSignal.timeout(5000)
      });
      if (res.ok) {
        const raw = await res.json();
        if (raw && typeof raw === 'string') {
          const rec = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
          if (rec && rec.id && rec.email) {
            const user: User = {
              id: rec.id,
              email: rec.email,
              username: rec.username,
              name: rec.name,
              role: rec.role || 'user',
              preferences: rec.preferences,
              createdAt: rec.createdAt
            };
            this.createUser(user, rec.hash || '');
            return user;
          }
        }
      }
    } catch {
      // Offline or network timeout
    }
    return undefined;
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
        this.data = {
          ...this.data,
          ...parsed,
          users: parsed.users || [],
          passwords: parsed.passwords || {},
          playlists: parsed.playlists || [],
          favorites: parsed.favorites || [],
          history: parsed.history || [],
          deletedPlaylistIds: parsed.deletedPlaylistIds || []
        };
        // Ensure all media items have releaseDate and valid durations
        if (this.data.mediaItems && Array.isArray(this.data.mediaItems)) {
          this.data.mediaItems.forEach(item => {
            if (!item.releaseDate) {
              if (item.releaseYear) {
                const hash = (item.id || item.title || '').split('').reduce((acc: number, c: string) => acc + c.charCodeAt(0), 0);
                const m = String((hash % 12) + 1).padStart(2, '0');
                const d = String((hash % 28) + 1).padStart(2, '0');
                item.releaseDate = `${item.releaseYear}-${m}-${d}`;
              } else {
                item.releaseDate = '2024-01-01';
              }
            }
            // Fix legacy fallback duration for Never Gonna Give You Up
            if (item.id === 'yt-dQw4w9WgXcQ' || item.providerId === 'dQw4w9WgXcQ') {
              item.duration = 213;
            }
          });
        }
        // Sync playlist items with master media item durations & fix legacy fallbacks
        if (this.data.playlists && Array.isArray(this.data.playlists)) {
          this.data.playlists.forEach(pl => {
            if (pl.items && Array.isArray(pl.items)) {
              pl.items.forEach(it => {
                if (it.mediaItem) {
                  if (it.mediaItem.id === 'yt-dQw4w9WgXcQ' || it.mediaItem.providerId === 'dQw4w9WgXcQ') {
                    it.mediaItem.duration = 213;
                  } else {
                    const master = this.data.mediaItems.find(m => m.id === it.mediaItem.id || m.id === it.mediaItemId);
                    if (master && master.duration && master.duration > 0 && master.duration !== 240) {
                      it.mediaItem.duration = master.duration;
                    }
                  }
                }
              });
            }
          });
        }
      }
    } catch (err) {
      console.warn('Could not read existing data file, using fresh in-memory data store', err);
    }
    // Background cloud hydration to ensure cross-device consistency across serverless lambdas
    this.syncFromCloud().catch(() => {});
  }

  public async syncFromCloud(): Promise<boolean> {
    try {
      // 1. Upstash Redis / Vercel KV if configured
      const kvUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
      const kvToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

      if (kvUrl && kvToken) {
        const res = await fetch(`${kvUrl}/get/vibeflow_cloud_db`, {
          headers: { Authorization: `Bearer ${kvToken}` },
          signal: AbortSignal.timeout(4000)
        });
        if (res.ok) {
          const json: any = await res.json();
          if (json.result) {
            const parsed = typeof json.result === 'string' ? JSON.parse(json.result) : json.result;
            this.mergeCloudData(parsed);
            return true;
          }
        }
      }

      // 2. GitHub Gist if configured
      if (this.GIST_TOKEN && this.GIST_ID) {
        const res = await fetch(`https://api.github.com/gists/${this.GIST_ID}`, {
          headers: {
            'Authorization': `token ${this.GIST_TOKEN}`,
            'User-Agent': 'VibeFlow-AI-Backend'
          },
          signal: AbortSignal.timeout(5000)
        });
        if (res.ok) {
          const data: any = await res.json();
          const file = data.files?.['vibeflow_users.json'];
          if (file?.content) {
            const parsed = JSON.parse(file.content);
            this.mergeCloudData(parsed);
            return true;
          }
        }
      }
    } catch (err) {
      // Network timeout or offline, preserve local state
    }
    return false;
  }

  public async syncToCloud(): Promise<boolean> {
    if (this.cloudSyncInFlight) {
      await this.cloudSyncInFlight;
      return true;
    }

    this.cloudSyncInFlight = (async () => {
      try {
        const payload = {
          users: this.data.users,
          passwords: this.data.passwords,
          playlists: this.data.playlists.filter(p => !p.id.startsWith('playlist-')),
          favorites: this.data.favorites,
          deletedPlaylistIds: this.data.deletedPlaylistIds || [],
          syncedAt: new Date().toISOString()
        };

        const kvUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
        const kvToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

        if (kvUrl && kvToken) {
          await fetch(`${kvUrl}/set/vibeflow_cloud_db`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${kvToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(JSON.stringify(payload)),
            signal: AbortSignal.timeout(5000)
          });
          return;
        }

        if (this.GIST_TOKEN && this.GIST_ID) {
          await fetch(`https://api.github.com/gists/${this.GIST_ID}`, {
            method: 'PATCH',
            headers: {
              'Authorization': `token ${this.GIST_TOKEN}`,
              'User-Agent': 'VibeFlow-AI-Backend',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              files: {
                'vibeflow_users.json': {
                  content: JSON.stringify(payload, null, 2)
                }
              }
            }),
            signal: AbortSignal.timeout(5000)
          });
        }
      } catch (err) {
        // Silently tolerate temporary network issues
      } finally {
        this.cloudSyncInFlight = null;
      }
    })();

    await this.cloudSyncInFlight;
    return true;
  }

  private mergeCloudData(cloud: { users?: User[]; passwords?: Record<string, string>; playlists?: Playlist[]; favorites?: any[]; deletedPlaylistIds?: string[] }) {
    if (!cloud) return;
    if (cloud.users && Array.isArray(cloud.users)) {
      for (const u of cloud.users) {
        const existingIdx = this.data.users.findIndex(x => x.id === u.id || x.email.toLowerCase() === u.email.toLowerCase());
        if (existingIdx >= 0) {
          this.data.users[existingIdx] = { ...this.data.users[existingIdx], ...u };
        } else {
          this.data.users.push(u);
        }
      }
    }
    if (cloud.passwords && typeof cloud.passwords === 'object') {
      this.data.passwords = { ...this.data.passwords, ...cloud.passwords };
    }
    if (cloud.playlists && Array.isArray(cloud.playlists)) {
      for (const p of cloud.playlists) {
        const existingIdx = this.data.playlists.findIndex(x => x.id === p.id);
        if (existingIdx >= 0) {
          const existing = this.data.playlists[existingIdx];
          // Merge sharedWith arrays (union of IDs) instead of overwriting
          const mergedSharedWith = Array.from(new Set([
            ...(existing.sharedWith || []),
            ...(p.sharedWith || [])
          ]));
          // Merge sharedWithUsers arrays by unique ID
          const sharedUserMap = new Map<string, any>();
          for (const u of [...(existing.sharedWithUsers || []), ...(p.sharedWithUsers || [])]) {
            if (u && u.id) sharedUserMap.set(u.id, u);
          }
          const mergedSharedWithUsers = Array.from(sharedUserMap.values());
          // Prefer the version with more items (more up-to-date)
          const mergedItems = (p.items && existing.items)
            ? (p.items.length >= existing.items.length ? p.items : existing.items)
            : (p.items || existing.items);
          this.data.playlists[existingIdx] = {
            ...existing,
            ...p,
            sharedWith: mergedSharedWith,
            sharedWithUsers: mergedSharedWithUsers,
            items: mergedItems,
            itemCount: mergedItems ? mergedItems.length : (p.itemCount || existing.itemCount)
          };
        } else {
          this.data.playlists.push(p);
        }
      }
    }
    if (cloud.favorites && Array.isArray(cloud.favorites)) {
      for (const f of cloud.favorites) {
        if (!this.data.favorites.some(x => x.id === f.id || (x.userId === f.userId && x.mediaItemId === f.mediaItemId))) {
          this.data.favorites.push(f);
        }
      }
    }
    // Merge deletedPlaylistIds and purge deleted playlists from memory
    if (cloud.deletedPlaylistIds && Array.isArray(cloud.deletedPlaylistIds)) {
      if (!this.data.deletedPlaylistIds) this.data.deletedPlaylistIds = [];
      const deletedSet = new Set([...this.data.deletedPlaylistIds, ...cloud.deletedPlaylistIds]);
      this.data.deletedPlaylistIds = Array.from(deletedSet);
      // Remove any playlists that are in the deleted set
      this.data.playlists = this.data.playlists.filter(p => !deletedSet.has(p.id));
    }
    this.saveToDisk();
  }

  private isSavingDisk = false;

  public saveToDisk() {
    if (this.isSavingDisk) return;
    this.isSavingDisk = true;
    try {
      const { dir, file } = this.getFilePath();
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(file, JSON.stringify(this.data, null, 2), 'utf-8');
      // Also ensure primary DATA_FILE is written if running on a custom path
      if (file !== DATA_FILE && fs.existsSync(DATA_DIR)) {
        try {
          fs.writeFileSync(DATA_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
        } catch {}
      }
    } catch (err: any) {
      if (err?.code !== 'UNKNOWN' && err?.errno !== -4094) {
        console.warn('Could not persist data file to disk', err);
      }
    } finally {
      this.isSavingDisk = false;
    }
    // Sync to cloud storage in background
    this.syncToCloud().catch(() => {});
  }

  private seedDefaultPlaylists() {
    if (this.data.playlists.length === 0) {
      const demoUserId = 'demo-user-id';
      const demoCreator: UserSummary = {
        id: demoUserId,
        name: 'Aarav Sharma',
        username: 'demo',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
        email: 'demo@vibeflow.ai'
      };
      
      const defaultPlaylists: Playlist[] = [
        {
          id: 'playlist-morning',
          userId: demoUserId,
          creator: demoCreator,
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
          sharedWith: [],
          sharedWithUsers: [],
          shareToken: 'st-morning-motivation',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'playlist-instrumentals',
          userId: demoUserId,
          creator: demoCreator,
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
          sharedWith: [],
          sharedWithUsers: [],
          shareToken: 'st-instrumentals',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'playlist-workout',
          userId: demoUserId,
          creator: demoCreator,
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
          sharedWith: [],
          sharedWithUsers: [],
          shareToken: 'st-workout-energy',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'playlist-retro',
          userId: demoUserId,
          creator: demoCreator,
          title: 'Hindi Retro Favorites',
          description: 'Timeless melodies from the golden era of Indian cinema.',
          coverArt: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80',
          isSmart: false,
          isPrivate: false,
          isShareable: true,
          itemCount: 2,
          sharedWith: [],
          sharedWithUsers: [],
          shareToken: 'st-retro-favorites',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];

      this.data.playlists = defaultPlaylists;
      this.saveToDisk();
    }
  }

  public ensurePlaylistIntegrity() {
    for (const pl of this.data.playlists) {
      if (!pl.creator) {
        const u = this.findUserById(pl.userId) || this.findUserByIdentifier(pl.userId);
        if (u) {
          pl.creator = {
            id: u.id,
            name: u.name,
            username: u.username || u.name,
            avatar: u.avatar,
            email: u.email
          };
        } else {
          pl.creator = {
            id: pl.userId || 'demo-user-id',
            name: pl.userId === 'demo-user-id' ? 'Aarav Sharma' : 'Music Lover',
            username: pl.userId === 'demo-user-id' ? 'demo' : (pl.userId || 'creator'),
            avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'
          };
        }
      }
      if (!Array.isArray(pl.sharedWith)) pl.sharedWith = [];
      if (!Array.isArray(pl.sharedWithUsers)) pl.sharedWithUsers = [];
      if (!pl.shareToken) {
        pl.shareToken = `st-${pl.id}`;
      }
    }

    // Ensure default mobile playlist is seeded for smooth cross-device QR scanning
    if (!this.data.playlists.some(p => p.id === 'mobile-pl-1')) {
      this.data.playlists.push({
        id: 'mobile-pl-1',
        userId: 'demo-user-id',
        creator: {
          id: 'demo-user-id',
          name: 'VibeFlow Cloud',
          username: 'vibeflow',
          avatar: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=600&q=80'
        },
        title: 'Daily Cloud Flow Mix',
        description: 'Synced across devices • Bollywood, Lo-Fi & High-Energy',
        coverArt: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=600&q=80',
        isSmart: false,
        isPrivate: false,
        isShareable: true,
        itemCount: 3,
        items: [
          { id: 'pi-m1', playlistId: 'mobile-pl-1', mediaItemId: 'track-1', orderIndex: 0, addedAt: new Date().toISOString(), mediaItem: (this.findMediaItemById('track-1') || this.data.mediaItems[0]) as MediaItem },
          { id: 'pi-m2', playlistId: 'mobile-pl-1', mediaItemId: 'track-2', orderIndex: 1, addedAt: new Date().toISOString(), mediaItem: (this.findMediaItemById('track-2') || this.data.mediaItems[1]) as MediaItem },
          { id: 'pi-m3', playlistId: 'mobile-pl-1', mediaItemId: 'track-4', orderIndex: 2, addedAt: new Date().toISOString(), mediaItem: (this.findMediaItemById('track-4') || this.data.mediaItems[2]) as MediaItem }
        ],
        sharedWith: [],
        sharedWithUsers: [],
        shareToken: 'st-mobile-pl-1',
        isSharedWithMe: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
  }

  // User operations
  public findUserByIdentifier(identifier: string): User | undefined {
    if (!identifier) return undefined;
    const clean = identifier.trim().toLowerCase();
    const cleanNoSpecial = clean.replace(/[\._\-]/g, '');
    return this.data.users.find(u => {
      const email = (u.email || '').trim().toLowerCase();
      const username = (u.username || '').trim().toLowerCase();
      const name = (u.name || '').trim().toLowerCase();
      const id = (u.id || '').trim().toLowerCase();
      const emailPrefix = email.includes('@') ? email.split('@')[0] : '';
      return email === clean || 
             username === clean || 
             name === clean || 
             id === clean || 
             emailPrefix === clean ||
             username.replace(/[\._\-]/g, '') === cleanNoSpecial ||
             emailPrefix.replace(/[\._\-]/g, '') === cleanNoSpecial ||
             name.replace(/[\s\._\-]/g, '') === cleanNoSpecial;
    });
  }

  public findUserByEmail(email: string): User | undefined {
    return this.findUserByIdentifier(email);
  }

  public findUserById(id: string): User | undefined {
    if (!id) return undefined;
    return this.data.users.find(u => u.id === id);
  }

  public getOrCreateUserSyncCode(userIdOrIdentifier: string): string {
    let user = this.findUserById(userIdOrIdentifier) || this.findUserByIdentifier(userIdOrIdentifier);
    if (!user) {
      user = this.findUserById('demo-user-id');
    }
    if (!user) {
      return 'VF-1001';
    }
    if (!user.syncCode) {
      const num = Math.floor(1000 + Math.random() * 9000);
      user.syncCode = `VF-${num}`;
      this.saveToDisk();
    }
    return user.syncCode;
  }

  public findUserBySyncCode(rawSyncCode: string): User | undefined {
    if (!rawSyncCode) return undefined;
    const clean = rawSyncCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    return this.data.users.find(u => {
      if (!u.syncCode) return false;
      const uClean = u.syncCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
      return uClean === clean;
    });
  }

  public updatePassword(userIdOrIdentifier: string, passwordHash: string): boolean {
    const user = this.findUserById(userIdOrIdentifier) || this.findUserByIdentifier(userIdOrIdentifier);
    if (!user) return false;
    this.data.passwords[user.id] = passwordHash;
    if (user.email) {
      this.data.passwords[user.email.toLowerCase()] = passwordHash;
    }
    if (user.username) {
      this.data.passwords[user.username.toLowerCase()] = passwordHash;
    }
    this.saveToDisk();
    return true;
  }

  public createUser(user: User, passwordHash: string): User {
    if (!user.username) {
      user.username = (user.email ? user.email.split('@')[0] : user.name.replace(/\s+/g, '')).toLowerCase();
    }
    // Update if already exists, else push
    const existingIndex = this.data.users.findIndex(u => 
      u.id === user.id || 
      (u.email && user.email && u.email.toLowerCase() === user.email.toLowerCase()) ||
      (u.username && user.username && u.username.toLowerCase() === user.username.toLowerCase())
    );
    if (existingIndex >= 0) {
      this.data.users[existingIndex] = { ...this.data.users[existingIndex], ...user };
    } else {
      this.data.users.push(user);
    }
    this.data.passwords[user.id] = passwordHash;
    if (user.email) {
      this.data.passwords[user.email.toLowerCase()] = passwordHash;
    }
    if (user.username) {
      this.data.passwords[user.username.toLowerCase()] = passwordHash;
    }
    this.saveToDisk();
    return user;
  }

  public updateUserPreferences(userId: string, prefs: Partial<UserPreferences>): UserPreferences | undefined {
    const user = this.findUserById(userId) || this.findUserByIdentifier(userId);
    if (!user) return undefined;
    user.preferences = {
      ...user.preferences,
      ...prefs,
      userId: user.id
    } as UserPreferences;
    this.saveToDisk();
    return user.preferences;
  }

  public getPasswordHash(userIdOrIdentifier: string): string | undefined {
    if (!userIdOrIdentifier) return undefined;
    if (this.data.passwords[userIdOrIdentifier]) {
      return this.data.passwords[userIdOrIdentifier];
    }
    const clean = userIdOrIdentifier.trim().toLowerCase();
    if (this.data.passwords[clean]) {
      return this.data.passwords[clean];
    }
    const user = this.findUserByIdentifier(userIdOrIdentifier);
    if (user) {
      return this.data.passwords[user.id] || 
        (user.email ? this.data.passwords[user.email.toLowerCase()] : undefined) ||
        (user.username ? this.data.passwords[user.username.toLowerCase()] : undefined);
    }
    return undefined;
  }

  // Media operations
  public getAllMediaItems(): MediaItem[] {
    return [...this.data.mediaItems];
  }

  public findMediaItemById(id: string): MediaItem | undefined {
    return this.data.mediaItems.find(m => m.id === id);
  }

  public addMediaItem(item: MediaItem): MediaItem {
    if (!item.releaseDate) {
      if (item.releaseYear) {
        const hash = (item.id || item.title || '').split('').reduce((acc: number, c: string) => acc + c.charCodeAt(0), 0);
        const m = String((hash % 12) + 1).padStart(2, '0');
        const d = String((hash % 28) + 1).padStart(2, '0');
        item.releaseDate = `${item.releaseYear}-${m}-${d}`;
      } else {
        item.releaseDate = '2024-01-01';
      }
    }
    const existing = this.data.mediaItems.find(m => 
      (item.id && m.id === item.id) || 
      (item.provider && item.providerId && m.provider === item.provider && m.providerId === item.providerId)
    );
    if (existing) {
      Object.assign(existing, item);
      this.saveToDisk();
      return existing;
    }
    this.data.mediaItems.push(item);
    this.saveToDisk();
    return item;
  }

  public updateMediaItemDuration(id: string, duration: number): boolean {
    if (!id || !duration || duration <= 0) return false;
    let found = false;
    const media = this.findMediaItemById(id);
    if (media) {
      media.duration = duration;
      found = true;
    }
    // Also update across all playlist items referencing this media item
    if (this.data.playlists) {
      for (const pl of this.data.playlists) {
        if (pl.items) {
          for (const item of pl.items) {
            if (item.mediaItemId === id || (item.mediaItem && item.mediaItem.id === id)) {
              if (item.mediaItem) {
                item.mediaItem.duration = duration;
              }
              found = true;
            }
          }
        }
      }
    }
    if (found) {
      this.saveToDisk();
    }
    return found;
  }

  public getUserAliasSet(userIdOrIdent: string): Set<string> {
    const idSet = new Set<string>();
    if (!userIdOrIdent) return idSet;
    const clean = userIdOrIdent.trim().toLowerCase();
    idSet.add(clean);
    const user = this.findUserById(userIdOrIdent) || 
                 this.findUserByIdentifier(userIdOrIdent) || 
                 this.findUserBySyncCode(userIdOrIdent);
    if (user) {
      if (user.id) idSet.add(user.id.toLowerCase());
      if (user.username) idSet.add(user.username.toLowerCase());
      if (user.email) idSet.add(user.email.toLowerCase());
      if (user.syncCode) idSet.add(user.syncCode.toLowerCase());
    }
    return idSet;
  }

  public isUserOwner(playlist: Playlist, userIdOrIdent: string): boolean {
    if (!playlist || !userIdOrIdent) return false;
    const idSet = this.getUserAliasSet(userIdOrIdent);
    const pUid = (playlist.userId || '').toLowerCase();
    const pCreatorId = (playlist.creator?.id || '').toLowerCase();
    const pCreatorUser = (playlist.creator?.username || '').toLowerCase();
    const pCreatorEmail = (playlist.creator?.email || '').toLowerCase();

    if (
      idSet.has(pUid) || 
      idSet.has(pCreatorId) || 
      idSet.has(pCreatorUser) || 
      idSet.has(pCreatorEmail)
    ) {
      return true;
    }

    // Check if playlist's creator or userId matches via user email, username, or ID in database
    const user = this.findUserById(userIdOrIdent) || 
                 this.findUserByIdentifier(userIdOrIdent) || 
                 this.findUserBySyncCode(userIdOrIdent);
    if (user) {
      if (pUid) {
        const plOwner = this.findUserById(pUid) || this.findUserByIdentifier(pUid);
        if (plOwner && (
          (plOwner.email && user.email && plOwner.email.toLowerCase() === user.email.toLowerCase()) ||
          (plOwner.username && user.username && plOwner.username.toLowerCase() === user.username.toLowerCase()) ||
          plOwner.id === user.id
        )) {
          return true;
        }
      }
      if (pCreatorEmail && user.email && pCreatorEmail === user.email.toLowerCase()) {
        return true;
      }
      if (pCreatorUser && user.username && pCreatorUser === user.username.toLowerCase()) {
        return true;
      }
      if (pCreatorId && user.id && pCreatorId === user.id.toLowerCase()) {
        return true;
      }
    }

    return false;
  }

  public isUserShared(playlist: Playlist, userIdOrIdent: string): boolean {
    if (!playlist || !userIdOrIdent || !Array.isArray(playlist.sharedWith)) return false;
    const idSet = this.getUserAliasSet(userIdOrIdent);
    return playlist.sharedWith.some(s => idSet.has((s || '').toLowerCase()));
  }

  public getPlaylistsByUserId(userId: string, clientPlaylistIds?: string[]): Playlist[] {
    if (!userId) return [];
    const user = this.findUserById(userId) || 
                 this.findUserByIdentifier(userId) || 
                 this.findUserBySyncCode(userId);
    const clientSet = new Set<string>((clientPlaylistIds || []).filter(Boolean));
    const deletedSet = new Set<string>(this.data.deletedPlaylistIds || []);

    const isLoggedIn = Boolean(user && user.id !== 'demo-user-id');

    // Automatically associate any client-created guest/session playlists with this authenticated user
    if (isLoggedIn && clientSet.size > 0 && user) {
      let modified = false;
      for (const p of this.data.playlists) {
        if (clientSet.has(p.id) && !deletedSet.has(p.id)) {
          if (p.userId !== user.id || !p.creator?.email) {
            p.userId = user.id;
            p.creator = {
              id: user.id,
              name: user.name,
              username: user.username || user.name,
              avatar: user.avatar,
              email: user.email
            };
            modified = true;
          }
        }
      }
      if (modified) {
        this.saveToDisk();
      }
    }

    return this.data.playlists
      .filter(p => {
        // Exclude any explicitly deleted playlist
        if (deletedSet.has(p.id)) return false;

        // When a real user is logged in across any device:
        // App shows playlists created by, client-created by, or shared to the user
        if (isLoggedIn && user) {
          const isOwner = this.isUserOwner(p, user.id);
          const isShared = this.isUserShared(p, user.id);
          const isClientCreated = clientSet.has(p.id);
          return isOwner || isShared || isClientCreated;
        }

        // For guest / unauthenticated / demo sessions only:
        if (p.id.startsWith('playlist-')) return true;

        const isOwner = this.isUserOwner(p, userId);
        const isClientCreated = clientSet.has(p.id);
        const isShared = this.isUserShared(p, userId);

        return isOwner || isClientCreated || isShared;
      })
      .map(p => {
        const isOwner = (isLoggedIn && user) 
          ? (this.isUserOwner(p, user.id) || clientSet.has(p.id)) 
          : (this.isUserOwner(p, userId) || clientSet.has(p.id));
        const isPreset = p.id.startsWith('playlist-');
        return {
          ...p,
          isSharedWithMe: !isOwner && !isPreset
        };
      });
  }

  public findPlaylistById(id: string): Playlist | undefined {
    return this.data.playlists.find(p => p.id === id);
  }

  public createPlaylist(playlist: Playlist): Playlist {
    const rawUserId = playlist.userId || 'demo-user-id';
    const user = this.findUserById(rawUserId) || this.findUserByIdentifier(rawUserId);
    const canonicalUserId = user ? user.id : rawUserId;
    playlist.userId = canonicalUserId;

    if (!playlist.creator) {
      if (user) {
        playlist.creator = {
          id: user.id,
          name: user.name,
          username: user.username || user.name,
          avatar: user.avatar,
          email: user.email
        };
      } else {
        playlist.creator = {
          id: canonicalUserId,
          name: canonicalUserId === 'demo-user-id' ? 'Aarav Sharma' : 'Music Lover',
          username: canonicalUserId === 'demo-user-id' ? 'demo' : canonicalUserId,
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'
        };
      }
    } else {
      if (user) {
        playlist.creator.id = user.id;
        if (!playlist.creator.name || playlist.creator.name === 'Music Lover') {
          playlist.creator.name = user.name;
        }
        playlist.creator.username = user.username || playlist.creator.username || user.name;
        playlist.creator.email = user.email || playlist.creator.email;
        playlist.creator.avatar = user.avatar || playlist.creator.avatar;
      }
    }

    if (!Array.isArray(playlist.sharedWith)) playlist.sharedWith = [];
    if (!Array.isArray(playlist.sharedWithUsers)) playlist.sharedWithUsers = [];
    if (!playlist.shareToken) {
      playlist.shareToken = `st-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    }
    this.data.playlists.push(playlist);
    this.saveToDisk();
    this.syncToCloud().catch(() => {});
    return playlist;
  }

  public sharePlaylist(playlistId: string, ownerUserId: string, targetIdentifier: string): { success: boolean; playlist?: Playlist; message?: string } {
    const playlist = this.findPlaylistById(playlistId);
    if (!playlist) {
      return { success: false, message: 'Playlist not found' };
    }
    if (!this.isUserOwner(playlist, ownerUserId)) {
      return { success: false, message: 'Only the creator can share this playlist' };
    }

    const targetUser = this.findUserByIdentifier(targetIdentifier) || this.findUserById(targetIdentifier);
    if (!targetUser) {
      return { success: false, message: `User "${targetIdentifier}" not found. Please verify username or email.` };
    }

    const ownerAliases = this.getUserAliasSet(ownerUserId);
    if (ownerAliases.has(targetUser.id.toLowerCase()) || ownerAliases.has((targetUser.username || '').toLowerCase())) {
      return { success: false, message: 'You already own this playlist' };
    }

    if (!Array.isArray(playlist.sharedWith)) playlist.sharedWith = [];
    if (!Array.isArray(playlist.sharedWithUsers)) playlist.sharedWithUsers = [];

    if (!playlist.sharedWith.includes(targetUser.id)) {
      playlist.sharedWith.push(targetUser.id);
      playlist.sharedWithUsers.push({
        id: targetUser.id,
        name: targetUser.name,
        username: targetUser.username || targetUser.name,
        avatar: targetUser.avatar,
        email: targetUser.email
      });
      playlist.updatedAt = new Date().toISOString();
      this.saveToDisk();
      this.syncToCloud().catch(() => {});
    }

    return { 
      success: true, 
      playlist, 
      message: `Playlist successfully shared with ${targetUser.name} (@${targetUser.username})` 
    };
  }

  public unsharePlaylist(playlistId: string, ownerUserId: string, targetUserId: string): { success: boolean; playlist?: Playlist; message?: string } {
    const playlist = this.findPlaylistById(playlistId);
    if (!playlist) return { success: false, message: 'Playlist not found' };
    if (!this.isUserOwner(playlist, ownerUserId)) return { success: false, message: 'Only the creator can manage sharing' };

    const targetAliases = this.getUserAliasSet(targetUserId);
    if (playlist.sharedWith) {
      playlist.sharedWith = playlist.sharedWith.filter(id => !targetAliases.has(id.toLowerCase()));
    }
    if (playlist.sharedWithUsers) {
      playlist.sharedWithUsers = playlist.sharedWithUsers.filter(u => !targetAliases.has((u.id || '').toLowerCase()) && !targetAliases.has((u.username || '').toLowerCase()));
    }
    playlist.updatedAt = new Date().toISOString();
    this.saveToDisk();
    this.syncToCloud().catch(() => {});
    return { success: true, playlist, message: 'Revoked access for user' };
  }

  public leaveSharedPlaylist(playlistId: string, userId: string): boolean {
    const playlist = this.findPlaylistById(playlistId);
    if (!playlist) return false;
    const idSet = this.getUserAliasSet(userId);
    if (playlist.sharedWith) {
      playlist.sharedWith = playlist.sharedWith.filter(id => !idSet.has(id.toLowerCase()));
    }
    if (playlist.sharedWithUsers) {
      playlist.sharedWithUsers = playlist.sharedWithUsers.filter(u => !idSet.has((u.id || '').toLowerCase()) && !idSet.has((u.username || '').toLowerCase()));
    }
    this.saveToDisk();
    this.syncToCloud().catch(() => {});
    return true;
  }

  public findPlaylistByShareToken(token: string): Playlist | undefined {
    if (!token || typeof token !== 'string') return undefined;

    // Collect all candidate tokens and IDs to test against playlists
    const candidates: string[] = [];

    let raw = token.trim();
    // Strip surrounding quotes or angle brackets
    raw = raw.replace(/^[<"']+|[>"']+$/g, '').trim();

    // Try decoding URI component (up to 2 passes in case of double-encoding)
    let decoded = raw;
    try { decoded = decodeURIComponent(decoded); } catch {}
    try { if (decoded.includes('%')) decoded = decodeURIComponent(decoded); } catch {}

    candidates.push(raw, decoded);

    // If it's JSON, extract relevant properties
    for (const str of [raw, decoded]) {
      try {
        const json = JSON.parse(str);
        if (typeof json === 'object' && json !== null) {
          const val = json.shareToken || json.token || json.qrData || json.playlistId || json.id || json.code;
          if (val && typeof val === 'string') {
            candidates.push(val.trim());
          }
        }
      } catch {}
    }

    // Extract query parameters from URL strings (?shareToken=, ?token=, ?playlistId=, ?id=, etc.)
    for (const str of [raw, decoded]) {
      const qMatches = str.matchAll(/[?&#](?:shareToken|token|playlistId|id|share|code)=([^&#\s]+)/gi);
      for (const m of qMatches) {
        if (m[1]) {
          try { candidates.push(decodeURIComponent(m[1]).trim()); } catch { candidates.push(m[1].trim()); }
        }
      }

      // Extract path segments: /share/:token, /playlist/:id, /playlists/:id
      const pMatches = str.matchAll(/\/(?:share|playlist|playlists)\/([^/?#\s]+)/gi);
      for (const m of pMatches) {
        if (m[1]) {
          try { candidates.push(decodeURIComponent(m[1]).trim()); } catch { candidates.push(m[1].trim()); }
        }
      }

      // Regex matches for common token formats (st-..., pl-..., mobile-pl-..., playlist-...)
      const stMatch = str.match(/\b(st-[a-zA-Z0-9_-]+)\b/i);
      if (stMatch) candidates.push(stMatch[1]);
      const plMatch = str.match(/\b(pl-[a-zA-Z0-9_-]+)\b/i);
      if (plMatch) candidates.push(plMatch[1]);
      const mplMatch = str.match(/\b(mobile-pl-[a-zA-Z0-9_-]+)\b/i);
      if (mplMatch) candidates.push(mplMatch[1]);
      const plistMatch = str.match(/\b(playlist-[a-zA-Z0-9_-]+)\b/i);
      if (plistMatch) candidates.push(plistMatch[1]);
    }

    // Prepare lowercase unique candidates
    const uniqueCandidates = Array.from(new Set(candidates.filter(c => Boolean(c) && typeof c === 'string'))).map(c => c.toLowerCase());

    // Step 1: Exact matches against shareToken or playlist ID
    for (const cand of uniqueCandidates) {
      const found = this.data.playlists.find(p => {
        const pToken = (p.shareToken || '').toLowerCase();
        const pId = (p.id || '').toLowerCase();
        return pToken === cand ||
          pId === cand ||
          pToken === `st-${cand}` ||
          `st-${pId}` === cand ||
          pId === cand.replace(/^st-/, '') ||
          pToken === cand.replace(/^st-/, '') ||
          pId === cand.replace(/^pl-/, '');
      });
      if (found) return found;
    }

    // Step 2: Substring or containment matches
    for (const cand of uniqueCandidates) {
      if (cand.length < 3) continue;
      const found = this.data.playlists.find(p => {
        const pToken = (p.shareToken || '').toLowerCase();
        const pId = (p.id || '').toLowerCase();
        if (pToken && (cand.includes(pToken) || pToken.includes(cand))) return true;
        if (pId && (cand.includes(pId) || pId.includes(cand))) return true;

        // Compare raw numerical timestamp in id if present (e.g. pl-1790698176297 -> 1790698176297)
        const pNum = pId.replace(/\D/g, '');
        const candNum = cand.replace(/\D/g, '');
        if (pNum && candNum && pNum.length >= 8 && (candNum.includes(pNum) || pNum.includes(candNum))) {
          return true;
        }

        // Title slug match fallback for standard and default playlists
        if (cand.includes('morning') && (pId.includes('morning') || pToken.includes('morning'))) return true;
        if (cand.includes('workout') && (pId.includes('workout') || pToken.includes('workout'))) return true;
        if (cand.includes('instrumental') && (pId.includes('instrumental') || pToken.includes('instrumental'))) return true;
        if (cand.includes('retro') && (pId.includes('retro') || pToken.includes('retro'))) return true;
        if (cand.includes('cloud') && (pId.includes('mobile-pl-1') || (p.title || '').toLowerCase().includes('cloud'))) return true;

        return false;
      });
      if (found) return found;
    }

    return undefined;
  }

  public acceptShareToken(token: string, userId: string): { success: boolean; playlist?: Playlist; message?: string } {
    const playlist = this.findPlaylistByShareToken(token);
    if (!playlist) return { success: false, message: 'Invalid or expired share link' };
    if (this.isUserOwner(playlist, userId)) {
      return { success: true, playlist, message: 'You are the creator of this playlist' };
    }
    const targetUser = this.findUserById(userId) || this.findUserByIdentifier(userId);
    if (!Array.isArray(playlist.sharedWith)) playlist.sharedWith = [];
    if (!Array.isArray(playlist.sharedWithUsers)) playlist.sharedWithUsers = [];
    
    const canonicalId = targetUser ? targetUser.id : userId;
    let modified = false;

    if (!playlist.sharedWith.includes(canonicalId)) {
      playlist.sharedWith.push(canonicalId);
      modified = true;
    }
    if (userId !== canonicalId && !playlist.sharedWith.includes(userId)) {
      playlist.sharedWith.push(userId);
      modified = true;
    }

    if (targetUser && !playlist.sharedWithUsers.some(u => u.id === targetUser.id || u.username === targetUser.username)) {
      playlist.sharedWithUsers.push({
        id: targetUser.id,
        name: targetUser.name,
        username: targetUser.username || targetUser.name,
        avatar: targetUser.avatar,
        email: targetUser.email
      });
      modified = true;
    }

    if (modified) {
      playlist.updatedAt = new Date().toISOString();
      this.saveToDisk();
      this.syncToCloud().catch(() => {});
    }
    return { success: true, playlist, message: `Added "${playlist.title}" to your shared playlists` };
  }

  public searchUsers(query: string = '', excludeUserId?: string): UserSummary[] {
    const q = (query || '').trim().toLowerCase();
    return this.data.users
      .filter(u => {
        if (excludeUserId && u.id === excludeUserId) return false;
        if (!q) return true;
        return (u.name && u.name.toLowerCase().includes(q)) ||
               (u.username && u.username.toLowerCase().includes(q)) ||
               (u.email && u.email.toLowerCase().includes(q));
      })
      .map(u => ({
        id: u.id,
        name: u.name,
        username: u.username || u.name,
        avatar: u.avatar,
        email: u.email
      }))
      .slice(0, 15);
  }

  public updatePlaylist(id: string, updates: Partial<Playlist>): Playlist | undefined {
    const playlist = this.findPlaylistById(id);
    if (!playlist) return undefined;
    Object.assign(playlist, updates, { updatedAt: new Date().toISOString() });
    this.saveToDisk();
    return playlist;
  }

  public getDeletedPlaylistIds(): string[] {
    return this.data.deletedPlaylistIds || [];
  }

  public clearPlaylistCache(userId?: string): { success: boolean; clearedCount: number; remainingCount: number } {
    const defaultIds = new Set(['playlist-morning', 'playlist-instrumentals', 'playlist-workout', 'playlist-retro', 'mobile-pl-1']);
    const beforeCount = this.data.playlists.length;

    if (userId && userId !== 'demo-user-id') {
      const userAliases = this.getUserAliasSet(userId);
      this.data.playlists = this.data.playlists.filter(p => {
        if (defaultIds.has(p.id)) return true;
        const isOwner = userAliases.has((p.userId || '').toLowerCase()) ||
          userAliases.has((p.creator?.id || '').toLowerCase()) ||
          userAliases.has((p.creator?.email || '').toLowerCase());
        return !isOwner;
      });
    } else {
      // Clear all test/temporary playlists and keep clean default seeds
      this.data.playlists = this.data.playlists.filter(p => defaultIds.has(p.id));
    }

    this.data.deletedPlaylistIds = [];
    this.saveToDisk();
    this.syncToCloud().catch(() => {});
    return {
      success: true,
      clearedCount: beforeCount - this.data.playlists.length,
      remainingCount: this.data.playlists.length
    };
  }

  public deletePlaylist(id: string): boolean {
    if (!this.data.deletedPlaylistIds) this.data.deletedPlaylistIds = [];
    if (!this.data.deletedPlaylistIds.includes(id)) {
      this.data.deletedPlaylistIds.push(id);
    }
    const index = this.data.playlists.findIndex(p => p.id === id);
    if (index !== -1) {
      this.data.playlists.splice(index, 1);
    }
    this.saveToDisk();
    this.syncToCloud().catch(() => {});
    return true;
  }

  public deleteMultiplePlaylists(ids: string[], userId: string): { deletedIds: string[]; failedIds: string[] } {
    const deletedIds: string[] = [];
    const failedIds: string[] = [];
    if (!Array.isArray(ids) || ids.length === 0) {
      return { deletedIds, failedIds };
    }

    if (!this.data.deletedPlaylistIds) this.data.deletedPlaylistIds = [];
    const idSet = new Set(ids);
    let changed = false;

    for (const id of idSet) {
      const pl = this.findPlaylistById(id);
      if (!pl) {
        // Record as deleted so another device doesn't revive a phantom playlist
        if (!this.data.deletedPlaylistIds.includes(id)) {
          this.data.deletedPlaylistIds.push(id);
          changed = true;
        }
        deletedIds.push(id);
        continue;
      }
      if (this.isUserOwner(pl, userId)) {
        const idx = this.data.playlists.findIndex(p => p.id === id);
        if (idx !== -1) {
          this.data.playlists.splice(idx, 1);
        }
        if (!this.data.deletedPlaylistIds.includes(id)) {
          this.data.deletedPlaylistIds.push(id);
        }
        deletedIds.push(id);
        changed = true;
      } else if (this.isUserShared(pl, userId)) {
        this.leaveSharedPlaylist(id, userId);
        deletedIds.push(id);
        changed = true;
      } else {
        failedIds.push(id);
      }
    }

    if (changed) {
      this.saveToDisk();
      this.syncToCloud().catch(() => {});
    }

    return { deletedIds, failedIds };
  }

  public linkPlaylistsToUser(userId: string, clientPlaylistIds?: string[], clientPlaylists?: Playlist[]): { linkedCount: number; playlists: Playlist[] } {
    const user = this.findUserById(userId) || this.findUserByIdentifier(userId);
    if (!user) return { linkedCount: 0, playlists: [] };

    const deletedSet = new Set<string>(this.data.deletedPlaylistIds || []);
    const clientSet = new Set<string>((clientPlaylistIds || []).filter(Boolean));
    let modified = false;

    // 1. Link any existing playlists in database matching clientPlaylistIds
    for (const p of this.data.playlists) {
      if (clientSet.has(p.id) && !deletedSet.has(p.id)) {
        if (p.userId !== user.id || p.creator?.id !== user.id || !p.creator?.email) {
          p.userId = user.id;
          p.creator = {
            id: user.id,
            name: user.name,
            username: user.username || user.name,
            avatar: user.avatar,
            email: user.email
          };
          p.updatedAt = new Date().toISOString();
          modified = true;
        }
      }
    }

    // 2. If client provided full playlist objects (e.g. offline/guest created), add them if missing
    if (Array.isArray(clientPlaylists)) {
      for (const pl of clientPlaylists) {
        if (!pl || !pl.id || deletedSet.has(pl.id)) continue;
        const existing = this.findPlaylistById(pl.id);
        if (!existing) {
          const newPl: Playlist = {
            ...pl,
            userId: user.id,
            creator: {
              id: user.id,
              name: user.name,
              username: user.username || user.name,
              avatar: user.avatar,
              email: user.email
            },
            updatedAt: new Date().toISOString()
          };
          this.data.playlists.push(newPl);
          modified = true;
        } else if (existing.userId !== user.id) {
          existing.userId = user.id;
          existing.creator = {
            id: user.id,
            name: user.name,
            username: user.username || user.name,
            avatar: user.avatar,
            email: user.email
          };
          modified = true;
        }
      }
    }

    if (modified) {
      this.saveToDisk();
      this.syncToCloud().catch(() => {});
    }

    return {
      linkedCount: this.getPlaylistsByUserId(user.id).length,
      playlists: this.getPlaylistsByUserId(user.id)
    };
  }

  public async addItemsToPlaylist(
    playlistId: string, 
    itemsOrIds: (string | MediaItem)[]
  ): Promise<{ success: boolean; playlist?: Playlist; addedItems: PlaylistItem[]; error?: string }> {
    const playlist = this.findPlaylistById(playlistId);
    if (!playlist) {
      return { success: false, addedItems: [], error: 'Playlist not found' };
    }

    if (!playlist.items) playlist.items = [];
    const addedItems: PlaylistItem[] = [];

    for (const itemOrId of itemsOrIds) {
      let targetItemId: string;
      let mediaItem: MediaItem | undefined;

      if (typeof itemOrId === 'string') {
        targetItemId = itemOrId;
        mediaItem = this.findMediaItemById(targetItemId);
      } else if (itemOrId && typeof itemOrId === 'object') {
        targetItemId = itemOrId.id;
        mediaItem = this.findMediaItemById(targetItemId);
        if (!mediaItem) {
          mediaItem = this.addMediaItem(itemOrId);
        }
      } else {
        continue;
      }

      if (!mediaItem) continue;

      const newItem: PlaylistItem = {
        id: `item-${Date.now()}-${Math.floor(Math.random() * 10000)}-${playlist.items.length}`,
        playlistId: playlist.id,
        mediaItemId: targetItemId,
        orderIndex: playlist.items.length,
        addedAt: new Date().toISOString(),
        mediaItem
      };

      playlist.items.push(newItem);
      addedItems.push(newItem);
    }

    playlist.itemCount = playlist.items.length;
    playlist.updatedAt = new Date().toISOString();
    this.saveToDisk();

    return { success: true, playlist, addedItems };
  }

  public deleteUser(userId: string): boolean {
    const user = this.findUserById(userId) || this.findUserByIdentifier(userId);
    if (!user) return false;

    const targetId = user.id;
    const username = user.username?.toLowerCase();
    const email = user.email?.toLowerCase();

    // 1. Remove user from data.users
    this.data.users = this.data.users.filter(u => u.id !== targetId);

    // 2. Remove password entries
    if (this.data.passwords) {
      delete this.data.passwords[targetId];
      if (username) delete this.data.passwords[username];
      if (email) delete this.data.passwords[email];
    }

    // 3. Remove history and favorites
    if (this.data.history) {
      this.data.history = this.data.history.filter(h => h.userId !== targetId);
    }
    if (this.data.favorites) {
      this.data.favorites = this.data.favorites.filter(f => f.userId !== targetId);
    }

    // 4. Remove user's private playlists and remove from shared lists
    if (this.data.playlists) {
      this.data.playlists = this.data.playlists.filter(p => p.userId !== targetId && p.creator?.id !== targetId);
      for (const p of this.data.playlists) {
        if (p.sharedWith) {
          p.sharedWith = p.sharedWith.filter(uid => uid !== targetId);
        }
        if (p.sharedWithUsers) {
          p.sharedWithUsers = p.sharedWithUsers.filter(u => u.id !== targetId);
        }
      }
    }

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
  public recordHistory(userId: string, mediaItemId: string, playedSeconds: number, completionRate: number, mediaItem?: MediaItem) {
    const user = this.findUserById(userId) || this.findUserByIdentifier(userId) || this.findUserBySyncCode(userId);
    const targetUserId = user ? user.id : (userId || 'demo-user-id');

    // Ensure media item exists in catalog if provided
    let resolvedItem = this.findMediaItemById(mediaItemId);
    if (!resolvedItem && mediaItem) {
      resolvedItem = this.addMediaItem(mediaItem);
    }
    const finalItem = resolvedItem || mediaItem;

    // Check if recent session exists within recent 15 entries for the same track & user
    const existingIndex = this.data.history.slice(0, 15).findIndex(
      h => (h.userId.toLowerCase() === targetUserId.toLowerCase() || (user && h.userId.toLowerCase() === user.id.toLowerCase())) && 
           h.mediaItemId === mediaItemId
    );

    if (existingIndex !== -1) {
      // Update existing recent record
      this.data.history[existingIndex].playedSeconds = Math.max(this.data.history[existingIndex].playedSeconds || 0, playedSeconds);
      this.data.history[existingIndex].completionRate = Math.max(this.data.history[existingIndex].completionRate || 0, completionRate);
      this.data.history[existingIndex].listenedAt = new Date().toISOString();
      if (finalItem && !this.data.history[existingIndex].mediaItem) {
        this.data.history[existingIndex].mediaItem = finalItem;
      }
    } else {
      this.data.history.unshift({
        id: `hist-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        userId: targetUserId,
        mediaItemId,
        playedSeconds,
        completionRate,
        mediaItem: finalItem,
        listenedAt: new Date().toISOString()
      });
    }

    // Increment playback count on media item
    if (resolvedItem) {
      resolvedItem.playbackCount = (resolvedItem.playbackCount || 0) + 1;
    } else if (finalItem) {
      finalItem.playbackCount = (finalItem.playbackCount || 0) + 1;
    }

    // Keep history reasonable
    if (this.data.history.length > 500) {
      this.data.history = this.data.history.slice(0, 500);
    }
    this.saveToDisk();
  }

  public getHistory(userId: string): { mediaItem: MediaItem; playedSeconds: number; listenedAt: string }[] {
    const user = this.findUserById(userId) || this.findUserByIdentifier(userId) || this.findUserBySyncCode(userId);
    const idSet = this.getUserAliasSet(userId);

    return this.data.history
      .filter(h => {
        if (!h.userId) return false;
        const hUid = h.userId.toLowerCase();
        if (idSet.has(hUid) || hUid === userId.toLowerCase()) return true;
        if (user && (
          hUid === user.id.toLowerCase() || 
          (user.email && hUid === user.email.toLowerCase()) || 
          (user.username && hUid === user.username.toLowerCase())
        )) {
          return true;
        }
        return false;
      })
      .map(h => {
        const item = this.findMediaItemById(h.mediaItemId) || (h as any).mediaItem;
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
