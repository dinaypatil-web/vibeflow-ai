import { createClient, Client } from '@libsql/client';
import path from 'path';
import fs from 'fs';
import { 
  User, 
  Playlist, 
  PlaylistItem, 
  MediaItem,
  UserPreferences 
} from '../types';
import { DatabaseSchema } from './database';

const DATA_DIR = path.join(__dirname, '../../data');
const LOCAL_TURSO_FILE = process.env.VERCEL 
  ? 'file:/tmp/vibeflow_turso.db' 
  : `file:${path.join(DATA_DIR, 'vibeflow_turso.db')}`;

const tursoUrl = process.env.TURSO_DATABASE_URL || 
                 process.env.TURSO_URL || 
                 process.env.LIBSQL_URL || 
                 LOCAL_TURSO_FILE;

const tursoAuthToken = process.env.TURSO_AUTH_TOKEN;

export const isRemoteTurso = Boolean(
  (process.env.TURSO_DATABASE_URL || process.env.TURSO_URL || process.env.LIBSQL_URL) && 
  !tursoUrl.startsWith('file:')
);

export const tursoClient: Client = createClient({
  url: tursoUrl,
  authToken: tursoAuthToken
});

console.log(`[VibeFlow AI] 🗄️  Database engine: ${isRemoteTurso ? 'Turso Edge Cloud' : 'Turso SQLite Local'} (${tursoUrl.startsWith('file:') ? 'local' : tursoUrl})`);

let isInitialized = false;

export async function initTurso(): Promise<void> {
  if (isInitialized) return;
  try {
    if (!fs.existsSync(DATA_DIR) && !process.env.VERCEL) {
      try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch {}
    }

    // 1. Create tables
    await tursoClient.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE,
        username TEXT,
        name TEXT,
        avatar TEXT,
        role TEXT DEFAULT 'user',
        sync_code TEXT,
        password_hash TEXT,
        preferences TEXT,
        created_at TEXT
      );
    `);

    await tursoClient.execute(`
      CREATE TABLE IF NOT EXISTS playlists (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        title TEXT,
        description TEXT,
        cover_art TEXT,
        is_smart INTEGER DEFAULT 0,
        smart_definition TEXT,
        is_private INTEGER DEFAULT 1,
        is_shareable INTEGER DEFAULT 1,
        is_pinned INTEGER DEFAULT 0,
        share_token TEXT,
        shared_with TEXT,
        shared_with_users TEXT,
        creator TEXT,
        item_count INTEGER DEFAULT 0,
        created_at TEXT,
        updated_at TEXT
      );
    `);

    await tursoClient.execute(`
      CREATE TABLE IF NOT EXISTS playlist_items (
        id TEXT PRIMARY KEY,
        playlist_id TEXT,
        media_item_id TEXT,
        order_index INTEGER,
        added_at TEXT,
        media_item TEXT
      );
    `);

    await tursoClient.execute(`
      CREATE TABLE IF NOT EXISTS favorites (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        media_item_id TEXT,
        created_at TEXT
      );
    `);

    await tursoClient.execute(`
      CREATE TABLE IF NOT EXISTS history (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        media_item_id TEXT,
        played_seconds REAL,
        completion_rate REAL,
        listened_at TEXT,
        media_item TEXT
      );
    `);

    await tursoClient.execute(`
      CREATE TABLE IF NOT EXISTS deleted_playlists (
        id TEXT PRIMARY KEY,
        deleted_at TEXT
      );
    `);

    // Indexes for fast lookup
    await tursoClient.execute(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);`);
    await tursoClient.execute(`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);`);
    await tursoClient.execute(`CREATE INDEX IF NOT EXISTS idx_users_sync_code ON users(sync_code);`);
    await tursoClient.execute(`CREATE INDEX IF NOT EXISTS idx_playlists_user ON playlists(user_id);`);
    await tursoClient.execute(`CREATE INDEX IF NOT EXISTS idx_playlists_token ON playlists(share_token);`);
    await tursoClient.execute(`CREATE INDEX IF NOT EXISTS idx_items_playlist ON playlist_items(playlist_id);`);
    await tursoClient.execute(`CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);`);

    isInitialized = true;
  } catch (err) {
    console.warn('[Turso] Table initialization warning:', err);
  }
}

// ── User Operations in Turso ──────────────────────────────────────────

export async function tursoSaveUser(user: User, passwordHash: string): Promise<void> {
  try {
    await initTurso();
    await tursoClient.execute({
      sql: `
        INSERT OR REPLACE INTO users 
        (id, email, username, name, avatar, role, sync_code, password_hash, preferences, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        user.id,
        user.email.toLowerCase(),
        (user.username || user.email.split('@')[0] || user.name).toLowerCase(),
        user.name,
        user.avatar || '',
        user.role || 'user',
        user.syncCode || null,
        passwordHash || '',
        JSON.stringify(user.preferences || {}),
        user.createdAt || new Date().toISOString()
      ]
    });
  } catch (err) {
    console.warn('[Turso] tursoSaveUser error:', err);
  }
}

export async function tursoUpdatePassword(userIdOrEmail: string, passwordHash: string): Promise<void> {
  try {
    await initTurso();
    const clean = userIdOrEmail.trim().toLowerCase();
    await tursoClient.execute({
      sql: `UPDATE users SET password_hash = ? WHERE id = ? OR email = ? OR username = ?`,
      args: [passwordHash, userIdOrEmail, clean, clean]
    });
  } catch (err) {
    console.warn('[Turso] tursoUpdatePassword error:', err);
  }
}

export async function tursoUpdatePreferences(userId: string, prefs: UserPreferences): Promise<void> {
  try {
    await initTurso();
    await tursoClient.execute({
      sql: `UPDATE users SET preferences = ? WHERE id = ?`,
      args: [JSON.stringify(prefs), userId]
    });
  } catch (err) {
    console.warn('[Turso] tursoUpdatePreferences error:', err);
  }
}

export async function tursoDeleteUser(userId: string): Promise<void> {
  try {
    await initTurso();
    await tursoClient.execute({ sql: `DELETE FROM users WHERE id = ?`, args: [userId] });
    await tursoClient.execute({ sql: `DELETE FROM playlists WHERE user_id = ?`, args: [userId] });
    await tursoClient.execute({ sql: `DELETE FROM favorites WHERE user_id = ?`, args: [userId] });
    await tursoClient.execute({ sql: `DELETE FROM history WHERE user_id = ?`, args: [userId] });
  } catch (err) {
    console.warn('[Turso] tursoDeleteUser error:', err);
  }
}

// ── Playlist Operations in Turso ──────────────────────────────────────

export async function tursoSavePlaylist(playlist: Playlist): Promise<void> {
  try {
    await initTurso();
    const batchStatements: any[] = [
      {
        sql: `
          INSERT OR REPLACE INTO playlists 
          (id, user_id, title, description, cover_art, is_smart, smart_definition, is_private, is_shareable, is_pinned, share_token, shared_with, shared_with_users, creator, item_count, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
          playlist.id,
          playlist.userId,
          playlist.title,
          playlist.description || '',
          playlist.coverArt || '',
          playlist.isSmart ? 1 : 0,
          playlist.smartDefinition ? JSON.stringify(playlist.smartDefinition) : null,
          playlist.isPrivate ? 1 : 0,
          playlist.isShareable ? 1 : 0,
          playlist.isPinned ? 1 : 0,
          playlist.shareToken || `st-${playlist.id}`,
          JSON.stringify(playlist.sharedWith || []),
          JSON.stringify(playlist.sharedWithUsers || []),
          JSON.stringify(playlist.creator || {}),
          playlist.itemCount || (playlist.items ? playlist.items.length : 0),
          playlist.createdAt || new Date().toISOString(),
          playlist.updatedAt || new Date().toISOString()
        ]
      }
    ];

    if (playlist.items && Array.isArray(playlist.items)) {
      batchStatements.push({
        sql: `DELETE FROM playlist_items WHERE playlist_id = ?`,
        args: [playlist.id]
      });

      for (let idx = 0; idx < playlist.items.length; idx++) {
        const it = playlist.items[idx];
        if (!it) continue;
        batchStatements.push({
          sql: `
            INSERT OR REPLACE INTO playlist_items 
            (id, playlist_id, media_item_id, order_index, added_at, media_item)
            VALUES (?, ?, ?, ?, ?, ?)
          `,
          args: [
            it.id || `item-${playlist.id}-${idx}`,
            playlist.id,
            it.mediaItemId || it.mediaItem?.id || '',
            it.orderIndex !== undefined ? it.orderIndex : idx,
            it.addedAt || new Date().toISOString(),
            JSON.stringify(it.mediaItem || {})
          ]
        });
      }
    }

    await tursoClient.batch(batchStatements, 'write');
  } catch (err) {
    console.warn('[Turso] tursoSavePlaylist error:', err);
  }
}

export async function tursoSavePlaylistItems(playlistId: string, items: PlaylistItem[]): Promise<void> {
  try {
    await initTurso();
    const batchStatements: any[] = [
      {
        sql: `DELETE FROM playlist_items WHERE playlist_id = ?`,
        args: [playlistId]
      }
    ];

    for (let idx = 0; idx < items.length; idx++) {
      const it = items[idx];
      if (!it) continue;
      batchStatements.push({
        sql: `
          INSERT OR REPLACE INTO playlist_items 
          (id, playlist_id, media_item_id, order_index, added_at, media_item)
          VALUES (?, ?, ?, ?, ?, ?)
        `,
        args: [
          it.id || `item-${playlistId}-${idx}`,
          playlistId,
          it.mediaItemId || it.mediaItem?.id || '',
          it.orderIndex !== undefined ? it.orderIndex : idx,
          it.addedAt || new Date().toISOString(),
          JSON.stringify(it.mediaItem || {})
        ]
      });
    }

    batchStatements.push({
      sql: `UPDATE playlists SET item_count = ?, updated_at = ? WHERE id = ?`,
      args: [items.length, new Date().toISOString(), playlistId]
    });

    await tursoClient.batch(batchStatements, 'write');
  } catch (err) {
    console.warn('[Turso] tursoSavePlaylistItems error:', err);
  }
}

export async function tursoRemovePlaylistItem(playlistId: string, itemIdOrMediaItemId: string): Promise<void> {
  try {
    await initTurso();
    await tursoClient.batch([
      {
        sql: `DELETE FROM playlist_items WHERE playlist_id = ? AND (id = ? OR media_item_id = ?)`,
        args: [playlistId, itemIdOrMediaItemId, itemIdOrMediaItemId]
      },
      {
        sql: `
          UPDATE playlists 
          SET item_count = (SELECT COUNT(*) FROM playlist_items WHERE playlist_id = ?),
              updated_at = ?
          WHERE id = ?
        `,
        args: [playlistId, new Date().toISOString(), playlistId]
      }
    ], 'write');
  } catch (err) {
    console.warn('[Turso] tursoRemovePlaylistItem error:', err);
  }
}

export async function tursoGetPlaylist(playlistId: string): Promise<Playlist | undefined> {
  try {
    await initTurso();
    const res = await tursoClient.execute({
      sql: `SELECT * FROM playlists WHERE id = ? LIMIT 1`,
      args: [playlistId]
    });
    if (!res.rows || res.rows.length === 0) return undefined;
    const row = res.rows[0];

    const itemsRes = await tursoClient.execute({
      sql: `SELECT * FROM playlist_items WHERE playlist_id = ? ORDER BY order_index ASC`,
      args: [playlistId]
    });

    let creator: any;
    let sharedWith: string[] = [];
    let sharedWithUsers: any[] = [];
    let smartDef: any;

    try { if (row.creator) creator = JSON.parse(String(row.creator)); } catch {}
    try { if (row.shared_with) sharedWith = JSON.parse(String(row.shared_with)); } catch {}
    try { if (row.shared_with_users) sharedWithUsers = JSON.parse(String(row.shared_with_users)); } catch {}
    try { if (row.smart_definition) smartDef = JSON.parse(String(row.smart_definition)); } catch {}

    const items: PlaylistItem[] = itemsRes.rows.map(itRow => {
      let mediaItem: any;
      try { if (itRow.media_item) mediaItem = JSON.parse(String(itRow.media_item)); } catch {}
      return {
        id: String(itRow.id),
        playlistId: playlistId,
        mediaItemId: String(itRow.media_item_id),
        orderIndex: Number(itRow.order_index || 0),
        addedAt: String(itRow.added_at || ''),
        mediaItem
      };
    });

    return {
      id: String(row.id),
      userId: String(row.user_id),
      title: String(row.title),
      description: String(row.description || ''),
      coverArt: String(row.cover_art || ''),
      isSmart: Boolean(row.is_smart),
      smartDefinition: smartDef,
      isPrivate: Boolean(row.is_private),
      isShareable: Boolean(row.is_shareable),
      isPinned: Boolean(row.is_pinned),
      shareToken: String(row.share_token || `st-${row.id}`),
      sharedWith,
      sharedWithUsers,
      creator,
      itemCount: items.length || Number(row.item_count || 0),
      items,
      createdAt: String(row.created_at || ''),
      updatedAt: String(row.updated_at || '')
    };
  } catch (err) {
    console.warn('[Turso] tursoGetPlaylist error:', err);
    return undefined;
  }
}

export async function tursoGetPlaylistByShareToken(shareToken: string): Promise<Playlist | undefined> {
  try {
    await initTurso();
    const cleanToken = shareToken.trim().toLowerCase();
    const res = await tursoClient.execute({
      sql: `SELECT * FROM playlists WHERE lower(share_token) = ? OR lower(share_token) = ? OR lower(id) = ? LIMIT 1`,
      args: [cleanToken, `st-${cleanToken}`, cleanToken]
    });
    if (!res.rows || res.rows.length === 0) return undefined;
    return await tursoGetPlaylist(String(res.rows[0].id));
  } catch (err) {
    console.warn('[Turso] tursoGetPlaylistByShareToken error:', err);
    return undefined;
  }
}

export async function tursoDeletePlaylist(playlistId: string): Promise<void> {
  try {
    await initTurso();
    await tursoClient.execute({ sql: `DELETE FROM playlists WHERE id = ?`, args: [playlistId] });
    await tursoClient.execute({ sql: `DELETE FROM playlist_items WHERE playlist_id = ?`, args: [playlistId] });
    await tursoClient.execute({
      sql: `INSERT OR REPLACE INTO deleted_playlists (id, deleted_at) VALUES (?, ?)`,
      args: [playlistId, new Date().toISOString()]
    });
  } catch (err) {
    console.warn('[Turso] tursoDeletePlaylist error:', err);
  }
}

export async function tursoDeleteMultiplePlaylists(ids: string[]): Promise<void> {
  if (!ids || ids.length === 0) return;
  try {
    await initTurso();
    for (const id of ids) {
      await tursoDeletePlaylist(id);
    }
  } catch (err) {
    console.warn('[Turso] tursoDeleteMultiplePlaylists error:', err);
  }
}

export async function tursoClearPlaylists(userId?: string): Promise<void> {
  try {
    await initTurso();
    const defaultIds = ['playlist-morning', 'playlist-instrumentals', 'playlist-workout', 'playlist-retro', 'mobile-pl-1'];
    const placeholders = defaultIds.map(() => '?').join(',');

    if (userId && userId !== 'demo-user-id') {
      await tursoClient.execute({
        sql: `DELETE FROM playlists WHERE user_id = ? AND id NOT IN (${placeholders})`,
        args: [userId, ...defaultIds]
      });
    } else {
      await tursoClient.execute({
        sql: `DELETE FROM playlists WHERE id NOT IN (${placeholders})`,
        args: defaultIds
      });
    }
    await tursoClient.execute(`DELETE FROM deleted_playlists`);
  } catch (err) {
    console.warn('[Turso] tursoClearPlaylists error:', err);
  }
}

// ── Favorites & History in Turso ──────────────────────────────────────

export async function tursoToggleFavorite(userId: string, mediaItemId: string): Promise<boolean> {
  try {
    await initTurso();
    const check = await tursoClient.execute({
      sql: `SELECT id FROM favorites WHERE user_id = ? AND media_item_id = ?`,
      args: [userId, mediaItemId]
    });
    if (check.rows.length > 0) {
      await tursoClient.execute({
        sql: `DELETE FROM favorites WHERE user_id = ? AND media_item_id = ?`,
        args: [userId, mediaItemId]
      });
      return false; // un-favorited
    } else {
      await tursoClient.execute({
        sql: `INSERT INTO favorites (id, user_id, media_item_id, created_at) VALUES (?, ?, ?, ?)`,
        args: [`fav-${Date.now()}`, userId, mediaItemId, new Date().toISOString()]
      });
      return true; // favorited
    }
  } catch (err) {
    console.warn('[Turso] tursoToggleFavorite error:', err);
    return false;
  }
}

export async function tursoRecordHistory(userId: string, mediaItemId: string, playedSeconds: number, completionRate: number, mediaItem?: MediaItem): Promise<void> {
  try {
    await initTurso();
    await tursoClient.execute({
      sql: `
        INSERT OR REPLACE INTO history 
        (id, user_id, media_item_id, played_seconds, completion_rate, listened_at, media_item)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        `hist-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        userId,
        mediaItemId,
        playedSeconds,
        completionRate,
        new Date().toISOString(),
        mediaItem ? JSON.stringify(mediaItem) : null
      ]
    });
  } catch (err) {
    console.warn('[Turso] tursoRecordHistory error:', err);
  }
}

// ── Full Hydration from Turso ─────────────────────────────────────────

export async function tursoLoadAll(): Promise<Partial<DatabaseSchema>> {
  try {
    await initTurso();
    
    // 1. Users & Passwords
    const usersRes = await tursoClient.execute(`SELECT * FROM users`);
    const users: User[] = [];
    const passwords: Record<string, string> = {};

    for (const row of usersRes.rows) {
      const uId = String(row.id);
      const email = String(row.email || '');
      const username = String(row.username || '');
      const hash = String(row.password_hash || '');
      let prefs: UserPreferences | undefined;
      try {
        if (row.preferences) prefs = JSON.parse(String(row.preferences));
      } catch {}

      users.push({
        id: uId,
        email,
        username,
        name: String(row.name || ''),
        avatar: String(row.avatar || ''),
        role: (String(row.role || 'user')) as 'user' | 'admin',
        syncCode: row.sync_code ? String(row.sync_code) : undefined,
        preferences: prefs,
        createdAt: String(row.created_at || '')
      });

      if (hash) {
        passwords[uId] = hash;
        if (email) passwords[email.toLowerCase()] = hash;
        if (username) passwords[username.toLowerCase()] = hash;
      }
    }

    // 2. Playlists
    const plRes = await tursoClient.execute(`SELECT * FROM playlists`);
    const playlists: Playlist[] = [];

    for (const row of plRes.rows) {
      const pId = String(row.id);
      let creator: any;
      let sharedWith: string[] = [];
      let sharedWithUsers: any[] = [];
      let smartDef: any;

      try { if (row.creator) creator = JSON.parse(String(row.creator)); } catch {}
      try { if (row.shared_with) sharedWith = JSON.parse(String(row.shared_with)); } catch {}
      try { if (row.shared_with_users) sharedWithUsers = JSON.parse(String(row.shared_with_users)); } catch {}
      try { if (row.smart_definition) smartDef = JSON.parse(String(row.smart_definition)); } catch {}

      // Get playlist items
      const itemsRes = await tursoClient.execute({
        sql: `SELECT * FROM playlist_items WHERE playlist_id = ? ORDER BY order_index ASC`,
        args: [pId]
      });

      const items: PlaylistItem[] = itemsRes.rows.map(itRow => {
        let mediaItem: any;
        try { if (itRow.media_item) mediaItem = JSON.parse(String(itRow.media_item)); } catch {}
        return {
          id: String(itRow.id),
          playlistId: pId,
          mediaItemId: String(itRow.media_item_id),
          orderIndex: Number(itRow.order_index || 0),
          addedAt: String(itRow.added_at || ''),
          mediaItem
        };
      });

      playlists.push({
        id: pId,
        userId: String(row.user_id),
        title: String(row.title),
        description: String(row.description || ''),
        coverArt: String(row.cover_art || ''),
        isSmart: Boolean(row.is_smart),
        smartDefinition: smartDef,
        isPrivate: Boolean(row.is_private),
        isShareable: Boolean(row.is_shareable),
        isPinned: Boolean(row.is_pinned),
        shareToken: String(row.share_token || `st-${pId}`),
        sharedWith,
        sharedWithUsers,
        creator,
        itemCount: items.length || Number(row.item_count || 0),
        items,
        createdAt: String(row.created_at || ''),
        updatedAt: String(row.updated_at || '')
      });
    }

    // 3. Favorites
    const favRes = await tursoClient.execute(`SELECT * FROM favorites`);
    const favorites = favRes.rows.map(row => ({
      id: String(row.id),
      userId: String(row.user_id),
      mediaItemId: String(row.media_item_id),
      createdAt: String(row.created_at || '')
    }));

    // 4. Deleted Playlist IDs
    const delRes = await tursoClient.execute(`SELECT id FROM deleted_playlists`);
    const deletedPlaylistIds = delRes.rows.map(r => String(r.id));

    return {
      users,
      passwords,
      playlists,
      favorites,
      deletedPlaylistIds
    };
  } catch (err) {
    console.warn('[Turso] tursoLoadAll error:', err);
    return {};
  }
}

