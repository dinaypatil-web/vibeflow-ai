import { Router, Request, Response } from 'express';
import { db } from '../store/database';
import { providerRegistry } from '../services/providerService';

const router = Router();

// Get Favorites
router.get('/favorites', (req: Request, res: Response) => {
  const userId = (req.query.userId as string) || 'demo-user-id';
  const favorites = db.getFavorites(userId);
  res.json({ count: favorites.length, favorites });
});

// Toggle Favorite
router.post('/favorites/toggle', (req: Request, res: Response) => {
  const { userId, mediaItemId } = req.body;
  if (!mediaItemId) {
    return res.status(400).json({ error: 'mediaItemId is required' });
  }

  const isFav = db.toggleFavorite(userId || 'demo-user-id', mediaItemId);
  res.json({ isFavorite: isFav, mediaItemId });
});

// Check if favorite
router.get('/favorites/check/:mediaItemId', (req: Request, res: Response) => {
  const userId = (req.query.userId as string) || 'demo-user-id';
  const isFav = db.isFavorite(userId, req.params.mediaItemId);
  res.json({ isFavorite: isFav });
});

// Get History
router.get('/history', (req: Request, res: Response) => {
  const userId = (req.query.userId as string) || 'demo-user-id';
  const history = db.getHistory(userId);
  res.json({ count: history.length, history });
});

// Record History Playback
router.post('/history', (req: Request, res: Response) => {
  const { userId, mediaItemId, playedSeconds, completionRate } = req.body;
  if (!mediaItemId) {
    return res.status(400).json({ error: 'mediaItemId is required' });
  }

  db.recordHistory(userId || 'demo-user-id', mediaItemId, playedSeconds || 0, completionRate || 0);
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
