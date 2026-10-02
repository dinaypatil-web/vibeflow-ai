import { MediaItem, OfflineTrack } from '../types';

const DB_NAME = 'vibeflow_offline_vault';
const DB_VERSION = 1;
const STORE_NAME = 'offline_tracks';

interface StoredOfflineRecord {
  id: string; // track id
  mediaItem: MediaItem;
  quality: '320' | '256' | '128' | '64';
  bitrateKbps: number;
  format: 'mp3';
  fileSizeBytes: number;
  downloadedAt: string;
  blob: Blob;
  copyrightAcknowledged: boolean;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported on this platform.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Memory cache of generated Object URLs to avoid leaking or re-allocating
const activeObjectUrls = new Map<string, string>();

export const offlineStorage = {
  /**
   * Save an MP3 track and its audio Blob into IndexedDB for offline play
   */
  async saveOfflineTrack(
    track: MediaItem,
    quality: '320' | '256' | '128' | '64',
    audioBlob: Blob
  ): Promise<OfflineTrack> {
    const db = await openDatabase();
    const bitrateMap: Record<string, number> = {
      '320': 320,
      '256': 256,
      '128': 128,
      '64': 64
    };

    const record: StoredOfflineRecord = {
      id: track.id,
      mediaItem: {
        ...track,
        isOfflinePermitted: true,
      },
      quality,
      bitrateKbps: bitrateMap[quality] || 320,
      format: 'mp3',
      fileSizeBytes: audioBlob.size,
      downloadedAt: new Date().toISOString(),
      blob: audioBlob,
      copyrightAcknowledged: true
    };

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });

    // Revoke previous URL if any
    if (activeObjectUrls.has(track.id)) {
      URL.revokeObjectURL(activeObjectUrls.get(track.id)!);
    }
    const offlineUrl = URL.createObjectURL(audioBlob);
    activeObjectUrls.set(track.id, offlineUrl);

    return {
      id: record.id,
      mediaItem: record.mediaItem,
      quality: record.quality,
      bitrateKbps: record.bitrateKbps,
      format: record.format,
      fileSizeBytes: record.fileSizeBytes,
      downloadedAt: record.downloadedAt,
      offlineUrl,
      copyrightAcknowledged: true
    };
  },

  /**
   * Retrieve all offline tracks metadata
   */
  async getAllOfflineTracks(): Promise<OfflineTrack[]> {
    try {
      const db = await openDatabase();
      const records = await new Promise<StoredOfflineRecord[]>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });

      return records.map(r => {
        let offlineUrl = activeObjectUrls.get(r.id);
        if (!offlineUrl && r.blob) {
          offlineUrl = URL.createObjectURL(r.blob);
          activeObjectUrls.set(r.id, offlineUrl);
        }
        return {
          id: r.id,
          mediaItem: {
            ...r.mediaItem,
            streamUrl: offlineUrl || r.mediaItem.streamUrl
          },
          quality: r.quality,
          bitrateKbps: r.bitrateKbps,
          format: r.format,
          fileSizeBytes: r.fileSizeBytes,
          downloadedAt: r.downloadedAt,
          offlineUrl,
          copyrightAcknowledged: r.copyrightAcknowledged
        };
      });
    } catch (e) {
      console.warn('Failed to load offline tracks from IndexedDB:', e);
      return [];
    }
  },

  /**
   * Get raw Blob for a single offline track
   */
  async getOfflineAudioBlob(trackId: string): Promise<Blob | null> {
    try {
      const db = await openDatabase();
      return await new Promise<Blob | null>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(trackId);
        req.onsuccess = () => {
          const rec: StoredOfflineRecord | undefined = req.result;
          resolve(rec?.blob || null);
        };
        req.onerror = () => reject(req.error);
      });
    } catch {
      return null;
    }
  },

  /**
   * Get playable Object URL for a single offline track
   */
  async getOfflineAudioUrl(trackId: string): Promise<string | null> {
    if (activeObjectUrls.has(trackId)) {
      return activeObjectUrls.get(trackId)!;
    }
    const blob = await this.getOfflineAudioBlob(trackId);
    if (!blob) return null;
    const url = URL.createObjectURL(blob);
    activeObjectUrls.set(trackId, url);
    return url;
  },

  /**
   * Delete single offline track
   */
  async deleteOfflineTrack(trackId: string): Promise<void> {
    try {
      const db = await openDatabase();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(trackId);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });

      if (activeObjectUrls.has(trackId)) {
        URL.revokeObjectURL(activeObjectUrls.get(trackId)!);
        activeObjectUrls.delete(trackId);
      }
    } catch (e) {
      console.warn('Failed to delete offline track:', e);
    }
  },

  /**
   * Clear all offline cached audio files
   */
  async clearAllOfflineStorage(): Promise<void> {
    try {
      const db = await openDatabase();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.clear();
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });

      for (const url of activeObjectUrls.values()) {
        URL.revokeObjectURL(url);
      }
      activeObjectUrls.clear();
    } catch (e) {
      console.warn('Failed to clear offline storage:', e);
    }
  },

  /**
   * Get total offline storage size in bytes and count
   */
  async getOfflineStorageStats(): Promise<{ totalBytes: number; count: number }> {
    try {
      const db = await openDatabase();
      const records = await new Promise<StoredOfflineRecord[]>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });

      const totalBytes = records.reduce((sum, r) => sum + (r.fileSizeBytes || 0), 0);
      return { totalBytes, count: records.length };
    } catch {
      return { totalBytes: 0, count: 0 };
    }
  }
};
