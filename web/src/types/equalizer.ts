export const EQ_FREQUENCIES = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000] as const;

export const EQ_LABELS = ['32Hz', '64Hz', '125Hz', '250Hz', '500Hz', '1kHz', '2kHz', '4kHz', '8kHz', '16kHz'] as const;

export const EQ_BAND_DESCRIPTIONS = [
  'Sub-Bass (Deep Rumble)',
  'Bass (Punch & Kick)',
  'Low Mid (Body & Warmth)',
  'Mid (Vocals & Guitars)',
  'Mid Presence (Clarity)',
  'Upper Mid (Vocal Attack)',
  'Presence (High Definition)',
  'Brilliance (Crisp Edges)',
  'Highs (Cymbals & Sparkle)',
  'Air (Sheen & Openness)'
] as const;

export type PlayingModeId =
  | 'flat'
  | 'bass_boost'
  | 'vocal'
  | 'rock'
  | 'pop'
  | 'electronic'
  | 'lofi'
  | 'classical'
  | 'jazz'
  | 'night_mode'
  | 'concert_hall'
  | 'custom';

export type SpatialMode = 'off' | 'studio' | 'concert' | 'club' | 'stadium';

export interface SpatialOption {
  id: SpatialMode;
  name: string;
  icon: string;
  description: string;
  reverbDecaySeconds: number;
  wetMix: number;
}

export const SPATIAL_OPTIONS: SpatialOption[] = [
  {
    id: 'off',
    name: 'Direct Studio',
    icon: '🎧',
    description: 'Direct pristine stereo feed with zero artificial room coloration',
    reverbDecaySeconds: 0,
    wetMix: 0
  },
  {
    id: 'studio',
    name: 'Mastering Studio',
    icon: '🎙️',
    description: 'Subtle acoustic diffusion of an ultra-high-end mastering room',
    reverbDecaySeconds: 0.6,
    wetMix: 0.08
  },
  {
    id: 'club',
    name: 'Club & Lounge',
    icon: '🍸',
    description: 'Warm, punchy reflections with tight bass absorption and nightclub intimacy',
    reverbDecaySeconds: 1.4,
    wetMix: 0.20
  },
  {
    id: 'concert',
    name: 'Concert Hall',
    icon: '🏛️',
    description: 'Expansive natural acoustic stage with deep 2.4s spatial resonance',
    reverbDecaySeconds: 2.4,
    wetMix: 0.32
  },
  {
    id: 'stadium',
    name: 'Open-Air Stadium',
    icon: '🏟️',
    description: 'Massive outdoor festival arena with wide stereo decay and airy reverberation',
    reverbDecaySeconds: 3.5,
    wetMix: 0.40
  }
];

export interface EqPreset {
  id: PlayingModeId;
  name: string;
  icon: string;
  description: string;
  genreFocus: string;
  bands: number[]; // 10 values, -12 to +12 dB
  spatialMode: SpatialMode;
  preamp: number; // -6 to +6 dB
}

export const EQ_PRESETS: EqPreset[] = [
  {
    id: 'flat',
    name: 'Studio Flat',
    icon: '🎧',
    description: 'Pure, uncolored studio monitor reference curve. Balanced across the entire frequency range.',
    genreFocus: 'All Genres / Reference',
    bands: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    spatialMode: 'off',
    preamp: 0
  },
  {
    id: 'bass_boost',
    name: 'Bass Boost',
    icon: '🔊',
    description: 'Deep, thumping sub-bass rumble and kick attack with protected treble clarity.',
    genreFocus: 'EDM, Hip-Hop, Punjabi, Dhol-Tasha',
    bands: [6.5, 7.0, 5.0, 2.5, 0.0, -1.0, 0.0, 1.5, 2.5, 3.0],
    spatialMode: 'off',
    preamp: -2.0
  },
  {
    id: 'vocal',
    name: 'Vocal Clarity',
    icon: '🎤',
    description: 'Lifts lead voices, podcasts, and acoustic guitars while removing muddy low rumble.',
    genreFocus: 'Pop, Ghazals, Podcasts, Acoustic',
    bands: [-3.5, -2.0, 0.0, 2.5, 5.0, 5.5, 4.0, 2.0, 0.5, -1.5],
    spatialMode: 'studio',
    preamp: 0
  },
  {
    id: 'rock',
    name: 'Rock & Metal',
    icon: '🎸',
    description: 'Aggressive V-curve with heavy kick drums, scooped mids, and blistering guitar highs.',
    genreFocus: 'Classic Rock, Metal, Alternative',
    bands: [5.0, 4.0, 2.0, -2.0, -3.0, 0.5, 3.5, 5.0, 6.0, 6.0],
    spatialMode: 'off',
    preamp: -1.5
  },
  {
    id: 'pop',
    name: 'Pop & Vibrant',
    icon: '🎵',
    description: 'Polished commercial mastering profile with crisp vocal top-end and punchy low-mids.',
    genreFocus: 'Bollywood Hits, Modern Pop, Top 40',
    bands: [2.5, 3.5, 4.0, 1.5, 0.0, 2.0, 4.0, 5.0, 4.0, 2.5],
    spatialMode: 'studio',
    preamp: -0.5
  },
  {
    id: 'electronic',
    name: 'Club & Dance',
    icon: '⚡',
    description: 'High-voltage energy with vibrating sub-bass, tight snares, and shimmering synthesizer leads.',
    genreFocus: 'House, Techno, Trance, Dubstep',
    bands: [7.5, 6.5, 3.0, 0.0, -2.0, 2.0, 4.5, 6.0, 7.0, 6.0],
    spatialMode: 'club',
    preamp: -2.5
  },
  {
    id: 'lofi',
    name: 'Lo-Fi & Chillout',
    icon: '☕',
    description: 'Cozy analog tape saturation with softened highs, warm low-end, and relaxed vintage tone.',
    genreFocus: 'Lo-Fi Beats, Study & Sleep, Mellow Jazz',
    bands: [4.0, 5.0, 3.5, 1.0, 0.0, -1.5, -2.5, -4.5, -6.5, -8.5],
    spatialMode: 'studio',
    preamp: 0.5
  },
  {
    id: 'classical',
    name: 'Classical & Symphony',
    icon: '🎻',
    description: 'Delicate dynamic range retention, expansive instrument separation, and silky acoustic highs.',
    genreFocus: 'Orchestral, Piano, Strings, Cinematic',
    bands: [3.0, 2.5, 1.5, 1.0, 0.0, 0.0, 2.0, 3.5, 4.5, 5.5],
    spatialMode: 'concert',
    preamp: 0
  },
  {
    id: 'jazz',
    name: 'Jazz & Soul',
    icon: '🎷',
    description: 'Warm upright double-bass, rich brass resonance, and smooth silky brush cymbals.',
    genreFocus: 'Jazz, Soul, R&B, Blues',
    bands: [3.5, 4.0, 2.5, 1.0, 2.0, 2.5, 1.5, 2.5, 3.0, 3.5],
    spatialMode: 'club',
    preamp: 0
  },
  {
    id: 'night_mode',
    name: 'Late Night Mode',
    icon: '🌙',
    description: 'Attenuates heavy bass vibrations and harsh treble spikes for relaxed listening at low volumes.',
    genreFocus: 'Late Night, Bedtime, Headphones',
    bands: [-5.0, -4.0, -2.0, 0.0, 1.0, 1.5, 0.5, -2.0, -4.5, -6.5],
    spatialMode: 'off',
    preamp: 0.5
  },
  {
    id: 'concert_hall',
    name: 'Concert Arena',
    icon: '🏟️',
    description: 'Simulates the thrilling spaciousness and reverberant atmosphere of a live auditorium arena.',
    genreFocus: 'Live Recordings, Stadium Anthems',
    bands: [2.5, 1.5, 0.0, -1.0, 1.0, 3.0, 4.5, 5.5, 4.5, 3.0],
    spatialMode: 'concert',
    preamp: -1.0
  },
  {
    id: 'custom',
    name: 'Custom Profile',
    icon: '🎛️',
    description: 'Personalized equalizer configuration tailored precisely to your ears and audio hardware.',
    genreFocus: 'User Defined',
    bands: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    spatialMode: 'off',
    preamp: 0
  }
];

export interface PersistedEqualizerState {
  enabled: boolean;
  preset: PlayingModeId;
  bands: number[];
  preamp: number;
  spatialMode: SpatialMode;
}
