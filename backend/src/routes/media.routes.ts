import { Router, Request, Response } from 'express';
import { Readable } from 'stream';
import jwt from 'jsonwebtoken';
import { db } from '../store/database';
import { providerRegistry, getSaavnQualityUrl } from '../services/providerService';
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
    const searchType = ((req.query.type as string) || 'all').toLowerCase();
    const limitParam = req.query.limit as string | undefined;
    const isUnlimited = !limitParam || limitParam === 'all' || limitParam === '0' || parseInt(limitParam) <= 0;
    const limit = isUnlimited ? undefined : parseInt(limitParam);

    let effectiveQuery = query;
    if (searchType === 'album' && !query.toLowerCase().includes('album')) {
      // Add contextual hint if query doesn't specify
    }

    let items = await providerRegistry.unifiedSearch(effectiveQuery, provider, limit);

    if (genre) {
      items = items.filter(i => i.genre.toLowerCase() === genre.toLowerCase());
    }
    if (mood) {
      items = items.filter(i => i.mood.toLowerCase() === mood.toLowerCase());
    }

    // Prioritize or filter by searchType
    if (searchType === 'artist' || searchType === 'singer') {
      const qLower = query.toLowerCase().trim();
      items.sort((a, b) => {
        const aMatch = a.artist.toLowerCase().includes(qLower) ? 1 : 0;
        const bMatch = b.artist.toLowerCase().includes(qLower) ? 1 : 0;
        return bMatch - aMatch;
      });
    } else if (searchType === 'album') {
      const qLower = query.toLowerCase().trim();
      items.sort((a, b) => {
        const aMatch = (a.album && a.album.toLowerCase().includes(qLower)) ? 1 : 0;
        const bMatch = (b.album && b.album.toLowerCase().includes(qLower)) ? 1 : 0;
        return bMatch - aMatch;
      });
    } else if (searchType === 'channel' || searchType === 'creator') {
      items.sort((a, b) => {
        const aYt = a.provider === 'youtube' ? 1 : 0;
        const bYt = b.provider === 'youtube' ? 1 : 0;
        return bYt - aYt;
      });
    }

    res.json({
      query,
      type: searchType,
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
                releaseDate: di.releaseDate || (di.releaseYear ? `${di.releaseYear}-05-15` : '2023-01-01'),
                releaseYear: di.releaseYear || (di.releaseDate ? parseInt(di.releaseDate.split('-')[0], 10) : 2023),
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
    const quality = (req.query.quality as string) || '320';
    if (!title) return res.status(400).json({ error: 'Title is required' });
    const result = await providerRegistry.resolveFullAudio(title, artist, quality);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Stream resolution failed' });
  }
});

// Update measured duration for a media item (called by frontend playback engine)
router.put('/items/:id/duration', (req: Request, res: Response) => {
  const { duration } = req.body;
  const numDur = Math.round(Number(duration));
  if (!numDur || isNaN(numDur) || numDur <= 0 || numDur > 86400) {
    return res.status(400).json({ error: 'Valid duration in seconds is required' });
  }

  const item = db.findMediaItemById(req.params.id);
  if (!item) {
    return res.status(404).json({ error: 'Media item not found' });
  }

  item.duration = numDur;
  db.updateMediaItemDuration(item.id, numDur);

  res.json({ success: true, id: item.id, duration: numDur });
});

// Download MP3 audio stream with quality parameters, complete full-track resolution, and copyright disclaimer headers
router.get('/download/:id', async (req: Request, res: Response) => {
  try {
    const paramId = req.params.id;
    const item = db.findMediaItemById(paramId);
    const quality = (req.query.quality as string) || '320';

    const title = (req.query.title as string) || item?.title || 'Track';
    const artist = (req.query.artist as string) || item?.artist || 'Artist';
    let streamUrl = (req.query.streamUrl as string) || item?.streamUrl;
    const provider = (req.query.provider as string) || item?.provider || '';

    // Robust preview and truncation detection:
    // Apple iTunes, Deezer 30s previews, Spotify previews, or items with <= 45s duration
    const isPreview = !streamUrl ||
      streamUrl.toLowerCase().includes('preview') ||
      streamUrl.includes('audio-ssl.itunes.apple.com') ||
      streamUrl.includes('dzcdn.net') ||
      streamUrl.includes('mzstatic.com') ||
      streamUrl.includes('mpthreetest.mp3') ||
      provider === 'spotify' ||
      provider === 'itunes' ||
      provider === 'deezer' ||
      provider === 'youtube' ||
      paramId.startsWith('itunes-') ||
      paramId.startsWith('deezer-') ||
      paramId.startsWith('yt-') ||
      (item?.duration && item.duration <= 45) ||
      (item?.tags && (item.tags.includes('preview') || item.tags.includes('30s_preview'))) ||
      (item?.capabilities && item.capabilities.includes('preview_only'));

    // Automatically resolve 100% full-length master audio if current stream is a preview or missing
    if (isPreview) {
      try {
        const resolved = await providerRegistry.resolveFullAudio(title, artist, quality);
        if (resolved?.streamUrl) {
          streamUrl = resolved.streamUrl;
          if (item && resolved.duration && resolved.duration > (item.duration || 0)) {
            item.duration = resolved.duration;
            db.updateMediaItemDuration(item.id, resolved.duration);
          }
        }
      } catch (err) {
        console.warn('Full audio stream resolution error in download route:', err);
      }
    }

    // Adapt bitrate for JioSaavn CDN streams according to requested quality
    if (streamUrl && streamUrl.includes('saavncdn.com')) {
      streamUrl = await getSaavnQualityUrl(streamUrl, quality);
    }

    if (!streamUrl) {
      streamUrl = 'https://aac.saavncdn.com/871/c2febd353f3a076a406fa37510f31f9f_160.mp4';
    }

    const cleanTitle = title.replace(/[/\\?%*:|"<>]/g, '-');
    const cleanArtist = artist.replace(/[/\\?%*:|"<>]/g, '-');
    const filename = `${cleanArtist} - ${cleanTitle} [${quality}kbps].mp3`;

    // ── Saavn CDN requires browser-like headers or it returns 403 / redirect ────────
    const isSaavnUrl = streamUrl.includes('saavncdn.com') || streamUrl.includes('jiosaavn.com');
    const upstreamHeaders: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': '*/*',
      'Accept-Encoding': 'identity', // Disable gzip so we can pipe raw bytes accurately
      'Connection': 'keep-alive',
    };
    if (isSaavnUrl) {
      upstreamHeaders['Referer'] = 'https://www.jiosaavn.com/';
      upstreamHeaders['Origin'] = 'https://www.jiosaavn.com';
    }
    // ─────────────────────────────────────────────────────────────────────────

    // Fetch upstream with a generous timeout: 5 minutes covers even very large tracks
    const audioRes = await fetch(streamUrl, {
      headers: upstreamHeaders,
      signal: AbortSignal.timeout(300_000), // 5 min — prevents mid-stream kill on big files
    });

    if (!audioRes.ok || !audioRes.body) {
      return res.redirect(streamUrl);
    }

    const contentLength = audioRes.headers.get('content-length');
    const upstreamType = audioRes.headers.get('content-type') || (isSaavnUrl ? 'audio/mp4' : 'audio/mpeg');

    // Only set Content-Length if the upstream provided it — for large chunked CDN streams
    // omitting it prevents the client from treating a partial byte range as the full file.
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }
    res.setHeader('Content-Type', upstreamType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.setHeader('X-Audio-Quality', `${quality}kbps`);
    res.setHeader('X-Audio-Duration', String(item?.duration || 210));
    res.setHeader('X-Copyright-Notice', 'Personal non-commercial offline listening only.');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'no-store');

    // ── Pipe with proper backpressure and cleanup ─────────────────────────────────
    const nodeStream = Readable.fromWeb(audioRes.body as any);

    // If the client disconnects mid-download, destroy the upstream read to free memory
    res.on('close', () => {
      if (!nodeStream.destroyed) nodeStream.destroy();
    });
    req.on('aborted', () => {
      if (!nodeStream.destroyed) nodeStream.destroy();
    });

    nodeStream.on('error', (err: any) => {
      console.error('[VibeFlow] Audio stream pipe error:', err.message);
      if (!res.headersSent) res.status(500).end();
      else if (!res.writableEnded) res.end();
    });

    nodeStream.pipe(res);
    // ────────────────────────────────────────────────────────────────────
  } catch (err: any) {
    console.error('[VibeFlow] Download stream error:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || 'Failed to download audio stream' });
    }
  }
});

export default router;

