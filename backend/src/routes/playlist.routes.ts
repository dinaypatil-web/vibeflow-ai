import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../store/database';
import { Playlist, PlaylistItem, MediaItem } from '../types';
import { AIRecommendationService } from '../services/aiRecommendationService';
import { providerRegistry, fetchYouTubeDuration } from '../services/providerService';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'vibeflow-super-secret-key-2026';

async function enrichPlaylistDurations(playlist: Playlist): Promise<boolean> {
  if (!playlist.items || playlist.items.length === 0) return false;
  let changed = false;

  const resolutionPromises = playlist.items.map(async (item) => {
    const m = item.mediaItem;
    if (!m) return;
    // Check if duration is missing, zero, or the 240s default fallback
    if (!m.duration || m.duration === 240 || m.duration <= 0) {
      let vid: string | null = m.providerId || null;
      if (!vid && m.streamUrl) {
        if (m.streamUrl.includes('v=')) {
          try {
            vid = new URL(m.streamUrl).searchParams.get('v');
          } catch {}
        } else if (m.streamUrl.includes('youtu.be/')) {
          vid = m.streamUrl.split('youtu.be/')[1]?.split('?')[0] || null;
        }
      }
      if (!vid && m.embedUrl && m.embedUrl.includes('embed/')) {
        vid = m.embedUrl.split('embed/')[1]?.split('?')[0] || null;
      }

      if (vid) {
        try {
          const realDur = await fetchYouTubeDuration(vid);
          if (realDur && realDur > 0 && realDur !== m.duration) {
            m.duration = realDur;
            const inDb = db.findMediaItemById(m.id);
            if (inDb) inDb.duration = realDur;
            changed = true;
          }
        } catch {}
      }
    }
  });

  await Promise.allSettled(resolutionPromises);
  if (changed) {
    db.saveToDisk();
  }
  return changed;
}

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

  // Parse client-created playlist IDs passed from frontend
  let clientPlaylistIds: string[] = [];
  const headerIds = req.headers['x-client-playlist-ids'];
  if (typeof headerIds === 'string') {
    try { clientPlaylistIds = JSON.parse(headerIds); } catch {}
  } else if (req.query.clientPlaylistIds) {
    try { clientPlaylistIds = JSON.parse(req.query.clientPlaylistIds as string); } 
    catch { clientPlaylistIds = (req.query.clientPlaylistIds as string).split(','); }
  }

  const playlists = db.getPlaylistsByUserId(userId, clientPlaylistIds);

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
    if (p.items) {
      p.items.sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
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

  // Prioritize verified JWT authentication over req.body.userId
  const authUserId = resolveUserId(req);
  const actualUserId = (authUserId && authUserId !== 'demo-user-id') 
    ? authUserId 
    : (userId || authUserId || 'demo-user-id');

  const user = db.findUserById(actualUserId) || db.findUserByIdentifier(actualUserId);
  const canonicalUserId = user ? user.id : actualUserId;

  const creator = user ? {
    id: user.id,
    name: user.name,
    username: user.username || user.name,
    avatar: user.avatar,
    email: user.email
  } : {
    id: canonicalUserId,
    name: canonicalUserId === 'demo-user-id' ? 'Aarav Sharma' : 'Music Lover',
    username: canonicalUserId === 'demo-user-id' ? 'demo' : canonicalUserId,
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
    userId: canonicalUserId,
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

// Get or generate cross-device sync code for the current user
router.get('/sync/code', (req: Request, res: Response) => {
  const userId = resolveUserId(req);
  const syncCode = db.getOrCreateUserSyncCode(userId);
  res.json({ syncCode });
});

// Link another device to account via 6-character sync code
router.post('/sync/link', (req: Request, res: Response) => {
  const { syncCode } = req.body;
  if (!syncCode || typeof syncCode !== 'string') {
    return res.status(400).json({ error: 'Sync code is required' });
  }
  const user = db.findUserBySyncCode(syncCode);
  if (!user) {
    return res.status(404).json({ error: 'No account found with this sync code. Please check and try again.' });
  }

  const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
  const playlists = db.getPlaylistsByUserId(user.id);
  res.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      username: user.username,
      avatar: user.avatar,
      role: user.role,
      syncCode: user.syncCode
    },
    token,
    playlists
  });
});

// Get playlist by ID
router.get('/:id', async (req: Request, res: Response) => {
  const userId = resolveUserId(req);
  const playlist = db.findPlaylistById(req.params.id);
  if (!playlist) {
    return res.status(404).json({ error: 'Playlist not found' });
  }

  const shareToken = (req.query.token as string) || (req.headers['x-share-token'] as string);
  const isOwner = db.isUserOwner(playlist, userId);
  const isShared = db.isUserShared(playlist, userId);
  const isTokenMatch = Boolean(shareToken && playlist.shareToken === shareToken);

  // Requirement: Any user's playlist shall not be visible to other User unless shared
  if (!isOwner && !isShared && !isTokenMatch) {
    return res.status(403).json({ error: 'This playlist is private and has not been shared with you.' });
  }

  // Ensure items are ordered by orderIndex
  if (playlist.items && playlist.items.length > 0) {
    playlist.items.sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
    // Auto-resolve any legacy or fallback 240s durations
    const hasFallbackDurations = playlist.items.some(
      i => !i.mediaItem?.duration || i.mediaItem.duration === 240
    );
    if (hasFallbackDurations) {
      await enrichPlaylistDurations(playlist);
    }
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

// Resolve accurate track durations for a playlist
router.post('/:id/resolve-durations', async (req: Request, res: Response) => {
  const playlist = db.findPlaylistById(req.params.id);
  if (!playlist) {
    return res.status(404).json({ error: 'Playlist not found' });
  }
  await enrichPlaylistDurations(playlist);
  if (playlist.items) {
    playlist.items.sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
  }
  res.json({ success: true, playlist });
});

// Reorder playlist tracks
router.put('/:id/reorder', (req: Request, res: Response) => {
  const userId = resolveUserId(req);
  const playlist = db.findPlaylistById(req.params.id);
  if (!playlist) {
    return res.status(404).json({ error: 'Playlist not found' });
  }
  if (!db.isUserOwner(playlist, userId) && !db.isUserShared(playlist, userId)) {
    return res.status(403).json({ error: 'Permission denied to reorder this playlist' });
  }

  if (!playlist.items) playlist.items = [];

  const { itemIds, fromIndex, toIndex, action } = req.body;

  if (Array.isArray(itemIds) && itemIds.length > 0) {
    const itemMap = new Map<string, PlaylistItem>();
    for (const item of playlist.items) {
      itemMap.set(item.id, item);
      itemMap.set(item.mediaItemId, item);
      if (item.mediaItem?.id) itemMap.set(item.mediaItem.id, item);
    }
    const newItems: PlaylistItem[] = [];
    for (const id of itemIds) {
      const it = itemMap.get(id);
      if (it && !newItems.includes(it)) {
        newItems.push(it);
      }
    }
    for (const item of playlist.items) {
      if (!newItems.includes(item)) {
        newItems.push(item);
      }
    }
    playlist.items = newItems;
  } else if (typeof fromIndex === 'number' && typeof toIndex === 'number') {
    if (
      fromIndex >= 0 && 
      fromIndex < playlist.items.length && 
      toIndex >= 0 && 
      toIndex < playlist.items.length
    ) {
      const [moved] = playlist.items.splice(fromIndex, 1);
      playlist.items.splice(toIndex, 0, moved);
    }
  } else if (action === 'reverse') {
    playlist.items.reverse();
  } else if (action === 'shuffle') {
    for (let i = playlist.items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [playlist.items[i], playlist.items[j]] = [playlist.items[j], playlist.items[i]];
    }
  }

  // Update orderIndex sequentially
  playlist.items.forEach((item, idx) => {
    item.orderIndex = idx;
  });
  playlist.itemCount = playlist.items.length;
  playlist.updatedAt = new Date().toISOString();
  db.saveToDisk();

  res.json({ success: true, playlist, items: playlist.items });
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
  if (!db.isUserOwner(playlist, userId)) {
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

  if (!db.isUserOwner(playlist, userId)) {
    if (db.isUserShared(playlist, userId)) {
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

// Save YouTube / Spotify / Web stream URL directly to the playlist
router.post('/:id/import-url', async (req: Request, res: Response) => {
  try {
    const { url, customTitle, customArtist } = req.body;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL link is required' });
    }

    const playlist = db.findPlaylistById(req.params.id);
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    const items = await providerRegistry.importAllFromUrl(url.trim(), customTitle, customArtist);
    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Could not extract playable tracks from the provided URL' });
    }

    if (!playlist.items) playlist.items = [];

    const addedPlaylistItems: PlaylistItem[] = [];
    for (const mediaItem of items) {
      // Avoid duplicate track in same playlist if already present
      const alreadyHas = playlist.items.some(i => 
        i.mediaItemId === mediaItem.id || 
        (i.mediaItem && i.mediaItem.providerId === mediaItem.providerId && i.mediaItem.provider === mediaItem.provider)
      );
      if (alreadyHas) continue;

      const newItem: PlaylistItem = {
        id: `item-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        playlistId: playlist.id,
        mediaItemId: mediaItem.id,
        orderIndex: playlist.items.length,
        addedAt: new Date().toISOString(),
        mediaItem
      };
      playlist.items.push(newItem);
      addedPlaylistItems.push(newItem);
    }

    playlist.itemCount = playlist.items.length;
    playlist.updatedAt = new Date().toISOString();
    db.saveToDisk();

    res.status(201).json({
      success: true,
      message: `Added ${addedPlaylistItems.length} track(s) to playlist`,
      addedCount: addedPlaylistItems.length,
      itemsCount: playlist.items.length,
      itemCount: playlist.items.length,
      items: addedPlaylistItems.map(i => i.mediaItem),
      importedItems: addedPlaylistItems.map(i => i.mediaItem),
      playlist
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to import URL into playlist' });
  }
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
