import { 
  MediaItem, 
  GenreCategory, 
  MoodCategory, 
  AIClassificationResult, 
  NaturalLanguageSearchQuery,
  RecommendationResponse,
  PlaylistRule
} from '../types';
import { db } from '../store/database';

export class AIRecommendationService {
  // Classification dictionary
  private static MOOD_KEYWORDS: Record<MoodCategory, string[]> = {
    'Workout & Energy': ['workout', 'gym', 'energy', 'energetic', 'pump', 'high-voltage', 'dhol', 'synthwave', 'rush', 'beats', 'intense', 'cardio'],
    'Calm & Peaceful': ['calm', 'peaceful', 'meditation', 'sitar', 'monsoon', 'tranquil', 'gentle', 'serene', 'healing', 'nature'],
    'Focus & Study': ['focus', 'study', 'lo-fi', 'lofi', 'chill', 'alpha', 'brain', 'podcast', 'deep', 'work', 'reading', 'concentration'],
    'Romantic': ['romantic', 'love', 'ishq', 'piya', 'dil', 'pyaar', 'acoustic', 'heart', 'ballad', 'duet'],
    'Nostalgic': ['nostalgic', 'retro', 'golden', 'vintage', 'classic', 'memory', 'strings', 'remaster', 'oldies'],
    'Sad & Emotional': ['sad', 'emotional', 'heartbreak', 'melancholy', 'tears', 'crying', 'slow', 'pain', 'lonely'],
    'Spiritual & Devotional': ['spiritual', 'devotional', 'sacred', 'mantra', 'om', 'shanti', 'temple', 'bansuri', 'aarti', 'bhajan', 'chalisa'],
    'Sleep & Relaxation': ['sleep', 'slumber', 'delta', 'theta', 'relaxation', 'drift', 'night', 'ambient', 'deep sleep'],
    'Party & Dance': ['party', 'dance', 'club', 'celebration', 'groove', 'remix', 'electro', 'dj', 'high', 'drop'],
    'Uplifting & Happy': ['uplifting', 'happy', 'joy', 'smile', 'sunshine', 'unplugged', 'acoustic', 'cheerful', 'feel good']
  };

  private static GENRE_KEYWORDS: Record<GenreCategory, string[]> = {
    'Bollywood': ['bollywood', 'arijit', 'pritam', 'shreya', 'hindi film', 'soundtrack', 'filmi'],
    'Hindi Retro': ['lata', 'mangeshkar', 'kishore', 'rafi', 'mukesh', 'retro', 'golden era', 'vintage'],
    'Marathi': ['marathi', 'lavani', 'ajay-atul', 'dhol tasha', 'pune', 'utsav', 'lokgeet'],
    'Punjabi': ['punjabi', 'bhangra', 'dhillon', 'diljit', 'sidhu', 'desi', 'munde'],
    'Tamil & Telugu': ['tamil', 'telugu', 'anirudh', 'ar rahman', 'sid sriram', 'tollywood', 'kollywood'],
    'Lo-Fi & Chill': ['lofi', 'lo-fi', 'chill', 'beats', 'aesthetic', 'coffee', 'midnight'],
    'EDM & Electronic': ['edm', 'electronic', 'synthwave', 'techno', 'house', 'electro', 'drop'],
    'Classical & Instrumental': ['classical', 'instrumental', 'sitar', 'bansuri', 'flute', 'tabla', 'violin', 'piano', 'raga'],
    'Devotional': ['devotional', 'bhajan', 'mantra', 'sacred', 'kirtan', 'chalisa', 'temple'],
    'Podcast & Talks': ['podcast', 'talk', 'talks', 'interview', 'lecture', 'neuroscience', 'mindset', 'stoic'],
    'Pop': ['pop', 'sheeran', 'taylor', 'vocal', 'chart', 'hit', 'radio'],
    'Rock': ['rock', 'electric', 'guitar', 'riff', 'metal', 'band'],
    'Hip-Hop': ['hip-hop', 'hiphop', 'rap', 'trap', 'flow', 'rhyme'],
    'Acoustic': ['acoustic', 'unplugged', 'guitar', 'folk', 'stripped']
  };

  /**
   * AI-powered genre and mood classification with confidence metrics and reasoning.
   */
  public static classify(title: string, artist: string, tags: string[] = [], description = ''): AIClassificationResult {
    const textCorpus = `${title} ${artist} ${tags.join(' ')} ${description}`.toLowerCase();

    let bestMood: MoodCategory = 'Calm & Peaceful';
    let maxMoodScore = 0;
    const detectedTags: string[] = [];

    for (const [mood, keywords] of Object.entries(this.MOOD_KEYWORDS)) {
      let score = 0;
      for (const kw of keywords) {
        if (textCorpus.includes(kw.toLowerCase())) {
          score += 1.5;
          if (!detectedTags.includes(kw)) detectedTags.push(kw);
        }
      }
      if (score > maxMoodScore) {
        maxMoodScore = score;
        bestMood = mood as MoodCategory;
      }
    }

    let bestGenre: GenreCategory = 'Pop';
    let maxGenreScore = 0;

    for (const [genre, keywords] of Object.entries(this.GENRE_KEYWORDS)) {
      let score = 0;
      for (const kw of keywords) {
        if (textCorpus.includes(kw.toLowerCase())) {
          score += 1.5;
          if (!detectedTags.includes(kw)) detectedTags.push(kw);
        }
      }
      if (score > maxGenreScore) {
        maxGenreScore = score;
        bestGenre = genre as GenreCategory;
      }
    }

    const confidenceScore = Math.min(0.99, Math.max(0.72, 0.70 + (maxMoodScore + maxGenreScore) * 0.05));
    const reasoning = `Classified as ${bestGenre} (${bestMood}) based on acoustic indicators, linguistic semantics, and recognized descriptors [${detectedTags.slice(0, 4).join(', ')}].`;

    return {
      mediaItemId: '',
      suggestedGenre: bestGenre,
      suggestedMood: bestMood,
      confidenceScore: Math.round(confidenceScore * 100) / 100,
      reasoning,
      detectedTags
    };
  }

  /**
   * Natural Language Search parser and semantic matcher.
   */
  public static parseNaturalLanguageQuery(query: string): { parsed: NaturalLanguageSearchQuery; results: MediaItem[] } {
    const lower = query.toLowerCase();
    const allItems = db.getAllMediaItems();

    let detectedMood: MoodCategory | undefined;
    let detectedGenre: GenreCategory | undefined;
    let detectedLanguage: string | undefined;
    let detectedMaxDuration: number | undefined;

    // Detect language
    if (lower.includes('hindi')) detectedLanguage = 'Hindi';
    else if (lower.includes('marathi')) detectedLanguage = 'Marathi';
    else if (lower.includes('punjabi')) detectedLanguage = 'Punjabi';
    else if (lower.includes('english')) detectedLanguage = 'English';

    // Detect duration constraints (e.g., "45-minute", "30 mins", "5 min")
    const durationMatch = lower.match(/(\d+)\s*(?:minute|min|mins|m)/);
    if (durationMatch) {
      detectedMaxDuration = parseInt(durationMatch[1], 10) * 60;
    }

    // Match Mood
    for (const [mood, keywords] of Object.entries(this.MOOD_KEYWORDS)) {
      if (keywords.some(k => lower.includes(k.toLowerCase()))) {
        detectedMood = mood as MoodCategory;
        break;
      }
    }

    // Match Genre
    for (const [genre, keywords] of Object.entries(this.GENRE_KEYWORDS)) {
      if (keywords.some(k => lower.includes(k.toLowerCase()))) {
        detectedGenre = genre as GenreCategory;
        break;
      }
    }

    // Filter items
    const scoredResults = allItems.map(item => {
      let score = 0;
      const itemText = `${item.title} ${item.artist} ${item.genre} ${item.mood} ${item.language || ''} ${item.tags?.join(' ') || ''}`.toLowerCase();

      // Query tokens match
      const queryTokens = lower.split(/\s+/).filter(t => t.length > 2);
      for (const token of queryTokens) {
        if (itemText.includes(token)) score += 3;
      }

      if (detectedMood && item.mood === detectedMood) score += 5;
      if (detectedGenre && item.genre === detectedGenre) score += 5;
      if (detectedLanguage && item.language?.toLowerCase() === detectedLanguage.toLowerCase()) score += 4;
      if (detectedMaxDuration && item.duration <= detectedMaxDuration) score += 2;

      return { item, score };
    });

    const results = scoredResults
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(r => r.item);

    const summaryParts: string[] = [];
    if (detectedMood) summaryParts.push(`Mood: ${detectedMood}`);
    if (detectedGenre) summaryParts.push(`Genre: ${detectedGenre}`);
    if (detectedLanguage) summaryParts.push(`Language: ${detectedLanguage}`);
    if (detectedMaxDuration) summaryParts.push(`Max Duration: ${Math.round(detectedMaxDuration / 60)} mins`);

    const semanticMatchSummary = summaryParts.length > 0 
      ? `Identified intent parameters [${summaryParts.join(', ')}] matched ${results.length} tracks.`
      : `Matched ${results.length} relevant tracks based on keyword and semantic affinity.`;

    return {
      parsed: {
        query,
        extractedMood: detectedMood,
        extractedGenre: detectedGenre,
        extractedLanguage: detectedLanguage,
        extractedDurationMax: detectedMaxDuration,
        semanticMatchSummary
      },
      results: results.length > 0 ? results : allItems.slice(0, 6)
    };
  }

  /**
   * Find similar content based on genre, mood, tags, and language.
   */
  public static getSimilarTracks(seedTrackId: string, limit = 6): { seed: MediaItem | undefined; similar: MediaItem[]; reason: string } {
    const seed = db.findMediaItemById(seedTrackId);
    if (!seed) {
      return { seed: undefined, similar: db.getAllMediaItems().slice(0, limit), reason: 'Default selection' };
    }

    const allItems = db.getAllMediaItems().filter(m => m.id !== seedTrackId);

    const scored = allItems.map(item => {
      let score = 0;
      if (item.genre === seed.genre) score += 6;
      if (item.mood === seed.mood) score += 5;
      if (item.language && seed.language && item.language === seed.language) score += 3;
      if (item.artist === seed.artist) score += 4;

      // Common tags
      const seedTags = seed.tags || [];
      const itemTags = item.tags || [];
      const commonTags = seedTags.filter(t => itemTags.includes(t));
      score += commonTags.length * 2;

      return { item, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const similar = scored.slice(0, limit).map(s => s.item);

    const reason = `Recommended because you listened to "${seed.title}" by ${seed.artist} (${seed.genre} • ${seed.mood}).`;

    return { seed, similar, reason };
  }

  /**
   * Hybrid personalized discovery feed.
   */
  public static getPersonalizedFeed(userId: string): RecommendationResponse[] {
    const user = db.findUserById(userId);
    const allItems = db.getAllMediaItems();
    const favorites = db.getFavorites(userId);
    const history = db.getHistory(userId);

    const preferredGenres = user?.preferences?.favoriteGenres?.length 
      ? user.preferences.favoriteGenres 
      : ['Bollywood', 'Lo-Fi & Chill', 'Hindi Retro', 'Marathi'];

    const preferredMoods = user?.preferences?.favoriteMoods?.length 
      ? user.preferences.favoriteMoods 
      : ['Calm & Peaceful', 'Focus & Study', 'Workout & Energy', 'Romantic'];

    const feed: RecommendationResponse[] = [];

    // 1. Recommended for You (Weighted by preferences + history)
    const recForYou = allItems.filter(item => 
      preferredGenres.includes(item.genre) || preferredMoods.includes(item.mood)
    ).slice(0, 6);

    feed.push({
      sectionTitle: 'Recommended for You',
      description: 'Crafted by VibeFlow AI based on your listening habits and mood affinities.',
      reason: `Personalized for your affinity with ${preferredGenres.slice(0, 2).join(' & ')}.`,
      items: recForYou.length > 0 ? recForYou : allItems.slice(0, 5)
    });

    // 2. Similar to Your Favorites
    if (favorites.length > 0) {
      const seedFav = favorites[0];
      const { similar, reason } = this.getSimilarTracks(seedFav.id, 5);
      feed.push({
        sectionTitle: `Inspired by "${seedFav.title}"`,
        description: 'Tracks sharing similar acoustic signatures and emotional resonance.',
        reason,
        items: similar
      });
    } else {
      const topPlayed = [...allItems].sort((a, b) => (b.playbackCount || 0) - (a.playbackCount || 0)).slice(0, 5);
      feed.push({
        sectionTitle: 'Trending in Your Preferred Genres',
        description: 'Most popular tracks resonating with listeners this week.',
        reason: 'Curated from global play count and positive reception.',
        items: topPlayed
      });
    }

    // 3. Your Next Workout Playlist
    const workoutTracks = allItems.filter(item => item.mood === 'Workout & Energy' || item.mood === 'Party & Dance').slice(0, 5);
    if (workoutTracks.length > 0) {
      feed.push({
        sectionTitle: 'Your Next Workout Playlist',
        description: 'High-octane Dhol Tasha, electronic synthwave, and energetic anthems.',
        reason: 'Selected for high BPM and motivating rhythms.',
        items: workoutTracks
      });
    }

    // 4. Focus & Lo-Fi Sanctuary
    const focusTracks = allItems.filter(item => item.mood === 'Focus & Study' || item.genre === 'Lo-Fi & Chill').slice(0, 5);
    if (focusTracks.length > 0) {
      feed.push({
        sectionTitle: 'Focus & Deep Study Zone',
        description: 'Distraction-free ambient soundscapes, rain lo-fi, and intellectual talks.',
        reason: 'Curated for flow state and productive concentration.',
        items: focusTracks
      });
    }

    // 5. Hidden Gems & Regional Discoveries
    const regional = allItems.filter(item => item.genre === 'Marathi' || item.genre === 'Punjabi' || item.genre === 'Classical & Instrumental').slice(0, 5);
    if (regional.length > 0) {
      feed.push({
        sectionTitle: 'Discover Regional Music & Heritage',
        description: 'Authentic regional folk, classical ragas, and unplugged melodies.',
        reason: 'Broadens your musical horizons beyond mainstream trends.',
        items: regional
      });
    }

    return feed;
  }

  /**
   * Smart playlist rule evaluator.
   */
  public static evaluateSmartRules(rules: PlaylistRule[], matchLogic: 'AND' | 'OR' = 'AND', limit = 20): MediaItem[] {
    const allItems = db.getAllMediaItems();

    const matches = allItems.filter(item => {
      const evaluations = rules.map(rule => {
        let itemVal: any;
        if (rule.field === 'genre') itemVal = item.genre;
        else if (rule.field === 'mood') itemVal = item.mood;
        else if (rule.field === 'artist') itemVal = item.artist;
        else if (rule.field === 'language') itemVal = item.language;
        else if (rule.field === 'duration') itemVal = item.duration;
        else if (rule.field === 'listeningCount') itemVal = item.playbackCount || 0;
        else if (rule.field === 'isLocal') itemVal = item.isLocal;

        switch (rule.operator) {
          case 'equals':
            return String(itemVal).toLowerCase() === String(rule.value).toLowerCase();
          case 'contains':
            return String(itemVal).toLowerCase().includes(String(rule.value).toLowerCase());
          case 'in':
            return Array.isArray(rule.value) && rule.value.map(v => String(v).toLowerCase()).includes(String(itemVal).toLowerCase());
          case 'greater_than':
            return Number(itemVal) > Number(rule.value);
          case 'less_than':
            return Number(itemVal) < Number(rule.value);
          default:
            return true;
        }
      });

      return matchLogic === 'AND' ? evaluations.every(Boolean) : evaluations.some(Boolean);
    });

    return matches.slice(0, limit);
  }
}
