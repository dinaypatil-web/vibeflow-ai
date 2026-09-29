import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../store/database';
import { Playlist, PlaylistItem, MediaItem } from '../types';
import { AIRecommendationService } from '../services/aiRecommendationService';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'vibeflow-super-secret-key-2026';

function resolveUserId(req: Request): string {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(auth.substring(7), JWT_SECRET) as any;
      if (decoded?.userId) return decoded.userId;
    } catch {}
  }
  if (req.query.userId) return req.query.userId as string;
  if (req.body?.userId) return req.body.userId as string;
  return 'demo-user-id';
}

// Get playlists
router.get('/', async (req: Request, res: Response) => {
  const userId = resolveUserId(req);
  if (process.env.VERCEL) {
    try { await db.syncFromCloud(); } catch {}
  }
  const playlists = db.getPlaylistsByUserId(userId);

  // Hydrate items for smart playlists dynamically
  const hydrated = playlists.map(p => {
    if (p.isSmart && p.smartDefinition) {
      const items = AIRecommendationService.evaluateSmartRules(
        p.smartDefinition.rules,
        p.smartDefinition.matchLogic,
        p.smartDefinition.limit || 20
      );
      return {
        ...p,
        itemCount: items.length,
        items: items.map((m, idx) => ({
          id: `item-${p.id}-${idx}`,
          playlistId: p.id,
          mediaItemId: m.id,
          orderIndex: idx,
          addedAt: new Date().toISOString(),
          mediaItem: m
        }))
      };
    }
    return p;
  });

  res.json({ playlists: hydrated });
});

// Create Playlist
router.post('/', (req: Request, res: Response) => {
  const { title, description, coverArt, isSmart, smartDefinition, isPrivate, isShareable, userId } = req.body;
  if (!title) {
    return res.status(400).json({ error: 'Playlist title is required' });
  }

  const actualUserId = userId || resolveUserId(req);
  const user = db.findUserById(actualUserId) || db.findUserByIdentifier(actualUserId);
  const creator = user ? {
    id: user.id,
    name: user.name,
    username: user.username || user.name,
    avatar: user.avatar,
    email: user.email
  } : {
    id: actualUserId,
    name: actualUserId === 'demo-user-id' ? 'Aarav Sharma' : 'Music Lover',
    username: actualUserId === 'demo-user-id' ? 'demo' : actualUserId,
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'
  };

  const playlistId = `pl-${Date.now()}`;
  let initialItems: PlaylistItem[] = [];

  if (isSmart && smartDefinition) {
    const matched = AIRecommendationService.evaluateSmartRules(smartDefinition.rules, smartDefinition.matchLogic, smartDefinition.limit || 20);
    initialItems = matched.map((m, idx) => ({
      id: `item-${playlistId}-${idx}`,
      playlistId,
      mediaItemId: m.id,
      orderIndex: idx,
      addedAt: new Date().toISOString(),
      mediaItem: m
    }));
  }

  const newPlaylist: Playlist = {
    id: playlistId,
    userId: actualUserId,
    creator,
    title,
    description: description || '',
    coverArt: coverArt || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80',
    isSmart: Boolean(isSmart),
    smartDefinition: smartDefinition || undefined,
    isPrivate: isPrivate !== undefined ? Boolean(isPrivate) : true,
    isShareable: isShareable !== undefined ? Boolean(isShareable) : true,
    itemCount: initialItems.length,
    items: initialItems,
    sharedWith: [],
    sharedWithUsers: [],
    shareToken: `st-${playlistId}`,
    isSharedWithMe: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.createPlaylist(newPlaylist);
  res.status(201).json({ playlist: newPlaylist });
});

// Share token preview
router.get('/share/:token', (req: Request, res: Response) => {
  const playlist = db.findPlaylistByShareToken(req.params.token);
  if (!playlist) {
    return res.status(404).json({ error: 'Shared playlist not found or link expired' });
  }
  res.json({ playlist });
});

// Accept shared playlist link
router.post('/share/:token/accept', (req: Request, res: Response) => {
  const userId = resolveUserId(req);
  const result = db.acceptShareToken(req.params.token, userId);
  if (!result.success) {
    return res.status(404).json({ error: result.message });
  }
  res.json(result);
});

// Get playlist by ID
router.get('/:id', (req: Request, res: Response) => {
  const userId = resolveUserId(req);
  const playlist = db.findPlaylistById(req.params.id);
  if (!playlist) {
    return res.status(404).json({ error: 'Playlist not found' });
  }

  const shareToken = (req.query.token as string) || (req.headers['x-share-token'] as string);
  const isOwner = playlist.userId === userId;
  const isShared = Array.isArray(playlist.sharedWith) && playlist.sharedWith.includes(userId);
  const isTokenMatch = Boolean(shareToken && playlist.shareToken === shareToken);

  // Requirement: Any user's playlist shall not be visible to other User unless shared
  if (!isOwner && !isShared && !isTokenMatch) {
    return res.status(403).json({ error: 'This playlist is private and has not been shared with you.' });
  }

  const enrichedPlaylist = {
    ...playlist,
    isSharedWithMe: !isOwner
  };

  if (playlist.isSmart && playlist.smartDefinition) {
    const matched = AIRecommendationService.evaluateSmartRules(
      playlist.smartDefinition.rules,
      playlist.smartDefinition.matchLogic,
      playlist.smartDefinition.limit || 25
    );
    const items: PlaylistItem[] = matched.map((m, idx) => ({
      id: `item-${playlist.id}-${idx}`,
      playlistId: playlist.id,
      mediaItemId: m.id,
      orderIndex: idx,
      addedAt: new Date().toISOString(),
      mediaItem: m
    }));
    return res.json({ playlist: { ...enrichedPlaylist, itemCount: items.length, items } });
  }

  res.json({ playlist: enrichedPlaylist });
});

// Share playlist with another user
router.post('/:id/share', (req: Request, res: Response) => {
  const userId = resolveUserId(req);
  const { target, targetIdentifier, targetUserId } = req.body;
  const ident = (target || targetIdentifier || targetUserId || '').trim();
  if (!ident) {
    return res.status(400).json({ error: 'Target username, email, or user ID is required to share' });
  }

  const result = db.sharePlaylist(req.params.id, userId, ident);
  if (!result.success) {
    return res.status(400).json({ error: result.message });
  }
  res.json(result);
});

// Revoke sharing for specific user
router.delete('/:id/share/:targetUserId', (req: Request, res: Response) => {
  const userId = resolveUserId(req);
  const result = db.unsharePlaylist(req.params.id, userId, req.params.targetUserId);
  if (!result.success) {
    return res.status(400).json({ error: result.message });
  }
  res.json(result);
});

// Leave / remove shared playlist for recipient
router.post('/:id/leave', (req: Request, res: Response) => {
  const userId = resolveUserId(req);
  const ok = db.leaveSharedPlaylist(req.params.id, userId);
  if (!ok) {
    return res.status(404).json({ error: 'Playlist not found' });
  }
  res.json({ success: true, message: 'Shared playlist removed from your library' });
});

// Update playlist (owner only)
router.put('/:id', (req: Request, res: Response) => {
  const userId = resolveUserId(req);
  const playlist = db.findPlaylistById(req.params.id);
  if (!playlist) {
    return res.status(404).json({ error: 'Playlist not found' });
  }
  if (playlist.userId !== userId) {
    return res.status(403).json({ error: 'Only the creator can edit playlist details' });
  }

  const updated = db.updatePlaylist(req.params.id, req.body);
  res.json({ playlist: updated });
});

// Delete playlist (owner deletes; recipient leaves)
router.delete('/:id', (req: Request, res: Response) => {
  const userId = resolveUserId(req);
  const playlist = db.findPlaylistById(req.params.id);
  if (!playlist) {
    return res.status(404).json({ error: 'Playlist not found' });
  }

  if (playlist.userId !== userId) {
    if (Array.isArray(playlist.sharedWith) && playlist.sharedWith.includes(userId)) {
      db.leaveSharedPlaylist(req.params.id, userId);
      return res.json({ success: true, message: 'Removed shared playlist from your library' });
    }
    return res.status(403).json({ error: 'Only the creator can delete this playlist' });
  }

  const deleted = db.deletePlaylist(req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: 'Playlist not found' });
  }
  res.json({ success: true, message: 'Playlist deleted' });
});

// Add item to playlist
router.post('/:id/items', (req: Request, res: Response) => {
  const { mediaItemId, item, mediaItem: reqMediaItem } = req.body;
  const playlist = db.findPlaylistById(req.params.id);
  if (!playlist) {
    return res.status(404).json({ error: 'Playlist not found' });
  }

  let targetItemId = mediaItemId || item?.id || reqMediaItem?.id;
  let mediaItem = targetItemId ? db.findMediaItemById(targetItemId) : undefined;
  if (!mediaItem && (item || reqMediaItem)) {
    const toInsert = item || reqMediaItem;
    mediaItem = db.addMediaItem(toInsert);
    targetItemId = mediaItem.id;
  }

  if (!mediaItem) {
    return res.status(404).json({ error: 'Media item not found' });
  }

  if (!playlist.items) playlist.items = [];
  const newItem: PlaylistItem = {
    id: `item-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    playlistId: playlist.id,
    mediaItemId: targetItemId,
    orderIndex: playlist.items.length,
    addedAt: new Date().toISOString(),
    mediaItem
  };

  playlist.items.push(newItem);
  playlist.itemCount = playlist.items.length;
  db.saveToDisk();

  res.status(201).json({ item: newItem, playlist });
});

// Remove item from playlist
router.delete('/:id/items/:mediaItemId', (req: Request, res: Response) => {
  const playlist = db.findPlaylistById(req.params.id);
  if (!playlist || !playlist.items) {
    return res.status(404).json({ error: 'Playlist not found' });
  }

  playlist.items = playlist.items.filter(i => i.mediaItemId !== req.params.mediaItemId && i.id !== req.params.mediaItemId);
  playlist.itemCount = playlist.items.length;
  db.saveToDisk();

  res.json({ success: true, playlist });
});

// Export playlist
router.get('/:id/export', (req: Request, res: Response) => {
  const format = (req.query.format as string) || 'json';
  const playlist = db.findPlaylistById(req.params.id);
  if (!playlist) {
    return res.status(404).json({ error: 'Playlist not found' });
  }

  const items = playlist.items?.map(i => i.mediaItem) || [];

  if (format === 'm3u') {
    let m3u = '#EXTM3U\n';
    m3u += `#PLAYLIST:${playlist.title}\n`;
    for (const item of items) {
      m3u += `#EXTINF:${item.duration},${item.artist} - ${item.title}\n`;
      m3u += `${item.streamUrl || item.embedUrl || item.title}\n`;
    }
    res.setHeader('Content-Type', 'audio/x-mpegurl');
    res.setHeader('Content-Disposition', `attachment; filename="${playlist.title.replace(/\s+/g, '_')}.m3u"`);
    return res.send(m3u);
  }

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="${playlist.title.replace(/\s+/g, '_')}.json"`);
  res.json({ playlist, items });
});

export default router;
