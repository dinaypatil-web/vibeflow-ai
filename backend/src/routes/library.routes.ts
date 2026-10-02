import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../store/database';
import { providerRegistry } from '../services/providerService';

const router = Router();

function resolveUserId(req: Request): string {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    try {
      const token = auth.slice(7);
      const decoded = jwt.decode(token) as any;
      if (decoded?.userId) return decoded.userId;
    } catch {}
  }
  const rawId = (req.headers['x-user-id'] || req.query.userId || req.body?.userId) as string;
  if (rawId && rawId !== 'demo-user-id') {
    const u = db.findUserById(rawId) || db.findUserByIdentifier(rawId) || db.findUserBySyncCode(rawId);
    if (u) return u.id;
    return rawId;
  }
  return 'demo-user-id';
}

// Get Favorites
router.get('/favorites', (req: Request, res: Response) => {
  const userId = resolveUserId(req);
  const favorites = db.getFavorites(userId);
  res.json({ count: favorites.length, favorites });
});

// Toggle Favorite
router.post('/favorites/toggle', (req: Request, res: Response) => {
  const userId = resolveUserId(req);
  const { mediaItemId } = req.body;
  if (!mediaItemId) {
    return res.status(400).json({ error: 'mediaItemId is required' });
  }

  const isFav = db.toggleFavorite(userId, mediaItemId);
  res.json({ isFavorite: isFav, mediaItemId });
});

// Check if favorite
router.get('/favorites/check/:mediaItemId', (req: Request, res: Response) => {
  const userId = resolveUserId(req);
  const isFav = db.isFavorite(userId, req.params.mediaItemId);
  res.json({ isFavorite: isFav });
});

// Get History
router.get('/history', (req: Request, res: Response) => {
  const userId = resolveUserId(req);
  const history = db.getHistory(userId);
  res.json({ count: history.length, history });
});

// Record History Playback
router.post('/history', (req: Request, res: Response) => {
  const userId = resolveUserId(req);
  const { mediaItemId, playedSeconds, completionRate, mediaItem } = req.body;
  const targetItemId = mediaItemId || mediaItem?.id;
  if (!targetItemId) {
    return res.status(400).json({ error: 'mediaItemId or mediaItem is required' });
  }

  db.recordHistory(userId, targetItemId, playedSeconds || 0, completionRate || 0, mediaItem);
  res.status(201).json({ recorded: true });
});

// Provider Capabilities and Compliance Status
router.get('/providers', (req: Request, res: Response) => {
  const statuses = providerRegistry.getAllStatuses();
  res.json({ providers: statuses });
});

// Configure Provider API Keys at runtime
router.post('/providers/configure', (req: Request, res: Response) => {
  const { youtubeApiKey, spotifyClientId, spotifyClientSecret } = req.body;
  if (youtubeApiKey !== undefined) {
    const yt = providerRegistry.getAdapter('youtube') as any;
    if (yt && yt.setApiKey) {
      yt.setApiKey(youtubeApiKey);
    }
  }
  if (spotifyClientId !== undefined || spotifyClientSecret !== undefined) {
    const sp = providerRegistry.getAdapter('spotify') as any;
    if (sp && sp.setCredentials) {
      sp.setCredentials(spotifyClientId || '', spotifyClientSecret || '');
    }
  }
  res.json({ success: true, message: 'Provider configuration updated', providers: providerRegistry.getAllStatuses() });
});

export default router;
