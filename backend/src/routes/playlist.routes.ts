import { Router, Request, Response } from 'express';
import { db } from '../store/database';
import { Playlist, PlaylistItem, MediaItem } from '../types';
import { AIRecommendationService } from '../services/aiRecommendationService';

const router = Router();

// Get playlists
router.get('/', (req: Request, res: Response) => {
  const userId = (req.query.userId as string) || 'demo-user-id';
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
    userId: userId || 'demo-user-id',
    title,
    description: description || '',
    coverArt: coverArt || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80',
    isSmart: Boolean(isSmart),
    smartDefinition: smartDefinition || undefined,
    isPrivate: Boolean(isPrivate),
    isShareable: isShareable !== undefined ? Boolean(isShareable) : true,
    itemCount: initialItems.length,
    items: initialItems,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.createPlaylist(newPlaylist);
  res.status(201).json({ playlist: newPlaylist });
});

// Get playlist by ID
router.get('/:id', (req: Request, res: Response) => {
  const playlist = db.findPlaylistById(req.params.id);
  if (!playlist) {
    return res.status(404).json({ error: 'Playlist not found' });
  }

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
    return res.json({ playlist: { ...playlist, itemCount: items.length, items } });
  }

  res.json({ playlist });
});

// Update playlist
router.put('/:id', (req: Request, res: Response) => {
  const updated = db.updatePlaylist(req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ error: 'Playlist not found' });
  }
  res.json({ playlist: updated });
});

// Delete playlist
router.delete('/:id', (req: Request, res: Response) => {
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
