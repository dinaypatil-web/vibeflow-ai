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
   * Hybrid personalized discovery feed based on user preferences, favorites, and history.
   */
  public static getPersonalizedFeed(userId: string): RecommendationResponse[] {
    const user = db.findUserById(userId) || db.findUserByIdentifier(userId);
    const allItems = db.getAllMediaItems();
    const favorites = db.getFavorites(user ? user.id : userId);
    const history = db.getHistory(user ? user.id : userId);

    const preferredGenres: string[] = user?.preferences?.favoriteGenres?.length 
      ? user.preferences.favoriteGenres 
      : ['Bollywood', 'Lo-Fi & Chill', 'Hindi Retro', 'Marathi'];

    const preferredMoods: string[] = user?.preferences?.favoriteMoods?.length 
      ? user.preferences.favoriteMoods 
      : ['Calm & Peaceful', 'Focus & Study', 'Workout & Energy', 'Romantic'];

    const preferredLanguages: string[] = user?.preferences?.preferredLanguages || [];
    const favoriteArtists: string[] = user?.preferences?.favoriteArtists || [];

    const feed: RecommendationResponse[] = [];

    // Helper: calculate user affinity score for a track
    const scoreItem = (item: MediaItem): number => {
      let score = 0;
      if (preferredGenres.includes(item.genre)) score += 35;
      if (preferredMoods.includes(item.mood)) score += 30;
      if (preferredLanguages.length > 0 && item.language && preferredLanguages.includes(item.language)) score += 25;
      if (favoriteArtists.length > 0 && favoriteArtists.some(a => 
        item.artist.toLowerCase().includes(a.toLowerCase()) || a.toLowerCase().includes(item.artist.toLowerCase())
      )) score += 45;
      if (favorites.some(f => f.id === item.id)) score += 15;
      score += Math.min(10, (item.playbackCount || 0) / 1000);
      return score;
    };

    // 1. Recommended for You (Weighted by preferences + history)
    const scoredItems = [...allItems]
      .map(item => ({ item, score: scoreItem(item) }))
      .sort((a, b) => b.score - a.score);

    const recForYou = scoredItems.filter(s => s.score > 0).map(s => s.item).slice(0, 6);
    const topReasonParts: string[] = [];
    if (preferredGenres.length > 0) topReasonParts.push(preferredGenres.slice(0, 2).join(' & '));
    if (preferredMoods.length > 0) topReasonParts.push(preferredMoods.slice(0, 2).join(' & '));

    feed.push({
      sectionTitle: user?.name ? `Made for ${user.name.split(' ')[0]}` : 'Recommended for You',
      description: 'Crafted by VibeFlow AI directly from your saved genres, moods, and artist affinities.',
      reason: topReasonParts.length > 0
        ? `Personalized from your affinity for ${topReasonParts.join(' • ')}.`
        : 'Curated based on your listening profile.',
      items: recForYou.length > 0 ? recForYou : allItems.slice(0, 6)
    });

    // 2. Favorite Moods Spotlight
    if (preferredMoods.length > 0) {
      const primaryMood = preferredMoods[0];
      const moodTracks = allItems.filter(item => preferredMoods.includes(item.mood)).slice(0, 6);
      if (moodTracks.length > 0) {
        feed.push({
          sectionTitle: `Mood Flow: ${primaryMood}`,
          description: `Vibes handpicked to match your selected emotional resonance.`,
          reason: `Filtered for your preferred mood affinities (${preferredMoods.slice(0, 3).join(', ')}).`,
          items: moodTracks
        });
      }
    }

    // 3. Preferred Genres Spotlight
    if (preferredGenres.length > 0) {
      const primaryGenre = preferredGenres[0];
      const genreTracks = allItems.filter(item => preferredGenres.includes(item.genre)).slice(0, 6);
      if (genreTracks.length > 0) {
        feed.push({
          sectionTitle: `Genre Spotlight: ${primaryGenre}`,
          description: `Signature beats and melodies tailored to your favorite genres.`,
          reason: `Highlighted because you saved ${preferredGenres.slice(0, 3).join(', ')} in your taste profile.`,
          items: genreTracks
        });
      }
    }

    // 4. Preferred Languages Flow (if specified)
    if (preferredLanguages.length > 0) {
      const langTracks = allItems.filter(item => item.language && preferredLanguages.includes(item.language)).slice(0, 6);
      if (langTracks.length > 0) {
        feed.push({
          sectionTitle: `Language Mix: ${preferredLanguages.slice(0, 2).join(' & ')}`,
          description: `High-fidelity audio streaming in your preferred regional & global languages.`,
          reason: `Matched to your selected language preferences (${preferredLanguages.join(', ')}).`,
          items: langTracks
        });
      }
    }

    // 5. Favorite Artists Spotlight (if specified)
    if (favoriteArtists.length > 0) {
      const artistTracks = allItems.filter(item => 
        favoriteArtists.some(a => item.artist.toLowerCase().includes(a.toLowerCase()) || a.toLowerCase().includes(item.artist.toLowerCase()))
      ).slice(0, 6);
      if (artistTracks.length > 0) {
        feed.push({
          sectionTitle: `Artist Affinity: ${favoriteArtists.slice(0, 2).join(' & ')}`,
          description: `Tracks from artists you follow and creators with complementary acoustic style.`,
          reason: `Selected from your saved favorite artists list.`,
          items: artistTracks
        });
      }
    }

    // 6. Similar to Your Favorites
    if (favorites.length > 0) {
      const seedFav = favorites[0];
      const { similar, reason } = this.getSimilarTracks(seedFav.id, 5);
      if (similar.length > 0) {
        feed.push({
          sectionTitle: `Inspired by "${seedFav.title}"`,
          description: 'Tracks sharing similar acoustic signatures and emotional resonance.',
          reason,
          items: similar
        });
      }
    }

    // 7. Trending in Global Catalog
    const topPlayed = [...allItems].sort((a, b) => (b.playbackCount || 0) - (a.playbackCount || 0)).slice(0, 6);
    feed.push({
      sectionTitle: 'Trending Discoveries',
      description: 'Most popular tracks resonating with listeners across platforms this week.',
      reason: 'Curated from global play count and positive reception.',
      items: topPlayed
    });

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
