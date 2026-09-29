import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../store/database';
import { providerRegistry } from '../services/providerService';
import { AIRecommendationService } from '../services/aiRecommendationService';
import { MediaItem, MediaProvider } from '../types';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'vibeflow-super-secret-key-2026';

// Search across all connected sources
router.get('/search', async (req: Request, res: Response) => {
  try {
    const query = (req.query.q as string) || '';
    const provider = req.query.provider as MediaProvider | undefined;
    const genre = req.query.genre as string | undefined;
    const mood = req.query.mood as string | undefined;
    const limitParam = req.query.limit as string | undefined;
    const isUnlimited = !limitParam || limitParam === 'all' || limitParam === '0' || parseInt(limitParam) <= 0;
    const limit = isUnlimited ? undefined : parseInt(limitParam);

    let items = await providerRegistry.unifiedSearch(query, provider, limit);

    if (genre) {
      items = items.filter(i => i.genre.toLowerCase() === genre.toLowerCase());
    }
    if (mood) {
      items = items.filter(i => i.mood.toLowerCase() === mood.toLowerCase());
    }

    res.json({
      query,
      count: items.length,
      items: limit ? items.slice(0, limit) : items
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Search execution failed' });
  }
});

// Get all catalog media items
router.get('/items', (req: Request, res: Response) => {
  const items = db.getAllMediaItems();
  res.json({ count: items.length, items });
});

// Get single media item
router.get('/items/:id', (req: Request, res: Response) => {
  const item = db.findMediaItemById(req.params.id);
  if (!item) {
    return res.status(404).json({ error: 'Media item not found' });
  }
  res.json({ item });
});

// Explore all tracks for a specific channel / artist
router.get('/channel/:channelName/tracks', async (req: Request, res: Response) => {
  try {
    const channelName = decodeURIComponent(req.params.channelName);
    const provider = req.query.provider as MediaProvider | undefined;
    const limit = parseInt(req.query.limit as string) || 60;
    const targetCount = parseInt(req.query.target as string) || 60;
    const effectiveLimit = Math.max(limit, targetCount, 60);
    const nameLower = channelName.toLowerCase();

    // 1. Gather all local matching tracks from DB
    const dbTracks = db.getAllMediaItems().filter(item => 
      item.artist.toLowerCase().includes(nameLower) ||
      nameLower.includes(item.artist.toLowerCase())
    );

    // 2. Fetch live tracks from the provider / unified search
    let liveTracks: MediaItem[] = [];
    try {
      liveTracks = await providerRegistry.unifiedSearch(channelName, provider, effectiveLimit);
    } catch (e) {
      console.warn('Channel tracks live query error:', e);
    }

    // 3. Deduplicate
    const map = new Map<string, MediaItem>();
    for (const t of [...dbTracks, ...liveTracks]) {
      map.set(t.id, t);
    }

    // 4. If under effectiveLimit (e.g. 60 tracks), run supplementary queries specifically for this channel
    if (map.size < effectiveLimit) {
      const subQueries = [
        `${channelName} songs`,
        `${channelName} hits`,
        `${channelName} official`,
        `${channelName} music`,
        `${channelName} top tracks`,
        `${channelName} playlist`
      ];

      await Promise.all(subQueries.map(async (sq) => {
        try {
          const batch = await providerRegistry.unifiedSearch(sq, provider, 25);
          for (const b of batch) {
            if (!map.has(b.id)) {
              map.set(b.id, b);
            }
          }
        } catch {
          // ignore error
        }
      }));
    }

    // 5. If STILL under effectiveLimit, bridge matching tracks from Deezer / JioSaavn
    if (map.size < effectiveLimit) {
      try {
        const deezer = providerRegistry.getAdapter('deezer');
        if (deezer) {
          const dItems = await deezer.search(channelName, effectiveLimit - map.size);
          for (const di of dItems) {
            if (!map.has(di.id)) {
              const bridged: MediaItem = {
                ...di,
                id: `yt-channel-${di.providerId}`,
                provider: provider || 'youtube',
                artist: channelName,
                capabilities: ['stream_direct', 'stream_embed', 'preview_only']
              };
              map.set(bridged.id, bridged);
              if (map.size >= effectiveLimit) break;
            }
          }
        }
      } catch (e) {
        console.warn('Channel fallback bridge error:', e);
      }
    }

    const allChannelTracks = Array.from(map.values()).slice(0, effectiveLimit);
    res.json({
      channel: channelName,
      count: allChannelTracks.length,
      items: allChannelTracks
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch channel tracks' });
  }
});

// AI Classification Endpoint
router.post('/classify', (req: Request, res: Response) => {
  const { title, artist, tags, description } = req.body;
  if (!title) {
    return res.status(400).json({ error: 'Track title is required for classification' });
  }

  const result = AIRecommendationService.classify(title, artist || '', tags || [], description || '');
  res.json({ result });
});

// User classification correction / feedback
router.post('/classify/feedback', (req: Request, res: Response) => {
  const { userId, targetId, feedbackType, payload } = req.body;
  db.recordFeedback(userId || 'anonymous', targetId, feedbackType, payload);

  // If user corrected mood or genre, update the item
  if (targetId && payload) {
    const item = db.findMediaItemById(targetId);
    if (item) {
      if (payload.genre) item.genre = payload.genre;
      if (payload.mood) item.mood = payload.mood;
      item.confidenceScore = 1.0; // User-validated ground truth
      db.saveToDisk();
    }
  }

  res.json({ success: true, message: 'Classification feedback registered and used to tune future recommendations.' });
});

// Natural Language Search Parser
router.post('/natural-search', async (req: Request, res: Response) => {
  const { query } = req.body;
  if (!query) {
    return res.status(400).json({ error: 'Query string is required' });
  }

  const { parsed, results } = AIRecommendationService.parseNaturalLanguageQuery(query);
  
  // Enrich with live search across providers if local results are limited
  let finalResults = [...results];
  if (finalResults.length < 20) {
    try {
      const searchTerms = parsed.extractedArtist || parsed.query || query;
      const live = await providerRegistry.unifiedSearch(searchTerms, undefined, 30);
      const seen = new Set(finalResults.map(r => r.id));
      for (const item of live) {
        if (!seen.has(item.id)) {
          seen.add(item.id);
          finalResults.push(item);
        }
      }
    } catch (e) {
      console.warn('Live fallback for natural search error:', e);
    }
  }

  res.json({ parsed, count: finalResults.length, results: finalResults });
});

// Find Similar Content
router.get('/similar/:id', (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 6;
  const result = AIRecommendationService.getSimilarTracks(req.params.id, limit);
  res.json(result);
});

// Import any URL (YouTube or direct video/audio stream)
router.post('/import-url', async (req: Request, res: Response) => {
  try {
    const { url, customTitle, customArtist } = req.body;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL is required' });
    }

    const item = await providerRegistry.importFromUrl(url, customTitle, customArtist);
    
    // Attribute creator if user is authenticated
    let userId = req.body.userId;
    const auth = req.headers.authorization;
    if (!userId && auth && auth.startsWith('Bearer ')) {
      try {
        const decoded = jwt.verify(auth.substring(7), JWT_SECRET) as any;
        userId = decoded?.userId;
      } catch {}
    }
    if (userId) {
      const u = db.findUserById(userId) || db.findUserByIdentifier(userId);
      if (u) {
        item.createdBy = { id: u.id, name: u.name, username: u.username || u.name, avatar: u.avatar };
        item.attributionNote = `Added by @${u.username || u.name}`;
        db.saveToDisk();
      }
    }

    res.status(201).json({ success: true, item });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to import URL' });
  }
});

// Local file registration
router.post('/local/import', (req: Request, res: Response) => {
  const { title, artist, duration, fileName, localPath, format, customTags } = req.body;
  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  // Automatic AI classification
  const classification = AIRecommendationService.classify(title, artist || 'Unknown Artist', customTags || [], fileName);

  let userId = req.body.userId;
  const auth = req.headers.authorization;
  if (!userId && auth && auth.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(auth.substring(7), JWT_SECRET) as any;
      userId = decoded?.userId;
    } catch {}
  }
  const u = userId ? (db.findUserById(userId) || db.findUserByIdentifier(userId)) : undefined;

  const localItem: MediaItem = {
    id: `local-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    provider: 'local',
    providerId: fileName || `local-file-${Date.now()}`,
    title,
    artist: artist || 'Local Artist',
    album: 'Imported Library',
    thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80',
    duration: duration || 180,
    genre: classification.suggestedGenre,
    mood: classification.suggestedMood,
    capabilities: ['stream_direct', 'offline_download'],
    localPath: localPath || fileName,
    streamUrl: req.body.dataUrl || undefined, // base64 or blob URL if stored
    isOfflinePermitted: true,
    isLocal: true,
    confidenceScore: classification.confidenceScore,
    tags: [...(classification.detectedTags || []), 'local', format || 'mp3'],
    createdBy: u ? { id: u.id, name: u.name, username: u.username || u.name, avatar: u.avatar } : undefined,
    attributionNote: u ? `Uploaded by @${u.username || u.name}` : undefined
  };

  db.addMediaItem(localItem);
  res.status(201).json({ item: localItem, classification });
});

// Resolve full audio stream for any track (e.g. Spotify tracks without audio cutoffs)
router.get('/resolve-stream', async (req: Request, res: Response) => {
  try {
    const title = (req.query.title as string) || '';
    const artist = (req.query.artist as string) || '';
    if (!title) return res.status(400).json({ error: 'Title is required' });
    const result = await providerRegistry.resolveFullAudio(title, artist);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Stream resolution failed' });
  }
});

export default router;
