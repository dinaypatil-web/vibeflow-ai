import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  TextInput, 
  SafeAreaView, 
  Modal, 
  StatusBar,
  ActivityIndicator,
  AppState,
  Alert,
  Platform
} from 'react-native';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface MediaItem {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
  duration: number;
  genre: string;
  mood: string;
  streamUrl?: string;
  isOfflinePermitted: boolean;
  provider?: string;
  providerId?: string;
  capabilities?: string[];
  tags?: string[];
}

interface OfflineTrackItem {
  id: string;
  track: MediaItem;
  quality: '320' | '256' | '128' | '64';
  fileSizeBytes: number;
  downloadedAt: string;
}

interface PlaylistItem {
  id: string;
  mediaItemId: string;
  mediaItem: MediaItem;
}

interface Playlist {
  id: string;
  title: string;
  description?: string;
  coverArt?: string;
  userId?: string;
  itemCount?: number;
  items?: PlaylistItem[];
  shareToken?: string;
  creator?: {
    id?: string;
    name: string;
    username?: string;
    email?: string;
  };
}

const SAMPLE_TRACKS: MediaItem[] = [
  {
    id: 'track-1',
    title: 'Kesariya (Soulful Acoustic)',
    artist: 'Arijit Singh & Pritam',
    thumbnail: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=600&q=80',
    duration: 268,
    genre: 'Bollywood',
    mood: 'Romantic',
    streamUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    isOfflinePermitted: false
  },
  {
    id: 'track-2',
    title: 'Midnight Marine Drive (Lo-Fi Beats)',
    artist: 'Bombay Chill Collective',
    thumbnail: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80',
    duration: 215,
    genre: 'Lo-Fi & Chill',
    mood: 'Focus & Study',
    streamUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    isOfflinePermitted: true
  },
  {
    id: 'track-4',
    title: 'Dhol Tasha High-Voltage Groove',
    artist: 'Pune Rhythm Syndicate',
    thumbnail: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80',
    duration: 290,
    genre: 'Marathi',
    mood: 'Workout & Energy',
    streamUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
    isOfflinePermitted: true
  }
];

const INITIAL_MOBILE_PLAYLISTS: Playlist[] = [
  {
    id: 'mobile-pl-1',
    title: 'Daily Cloud Flow Mix',
    description: 'Synced across devices • Bollywood, Lo-Fi & High-Energy',
    coverArt: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=600&q=80',
    itemCount: 3,
    creator: { name: 'VibeFlow Cloud' },
    items: [
      { id: 'pi-1', mediaItemId: 'track-1', mediaItem: SAMPLE_TRACKS[0] },
      { id: 'pi-2', mediaItemId: 'track-2', mediaItem: SAMPLE_TRACKS[1] },
      { id: 'pi-3', mediaItemId: 'track-4', mediaItem: SAMPLE_TRACKS[2] },
    ]
  }
];

const detectDefaultApiUrl = (): string => {
  try {
    const rn = require('react-native') as any;
    const scriptURL = rn.NativeModules?.SourceCode?.scriptURL;
    if (scriptURL && typeof scriptURL === 'string') {
      const match = scriptURL.match(/https?:\/\/([^/:]+)/);
      if (match && match[1] && match[1] !== 'localhost' && match[1] !== '127.0.0.1') {
        return `http://${match[1]}:4000/api`;
      }
    }
  } catch {}
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:4000/api';
  }
  return 'http://localhost:4000/api';
};

const AUTH_USER_KEY = '@vibeflow:auth_user';
const AUTH_TOKEN_KEY = '@vibeflow:auth_token';
const CACHED_PLAYLISTS_KEY = '@vibeflow:cached_playlists';
const API_BASE_URL_KEY = '@vibeflow:api_base_url';

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'explore' | 'playlists' | 'library' | 'ai'>('home');
  const [currentTrack, setCurrentTrack] = useState<MediaItem | null>(SAMPLE_TRACKS[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const isPlayingRef = useRef(false);
  const [positionMillis, setPositionMillis] = useState(0);
  const [durationMillis, setDurationMillis] = useState(0);
  const positionMillisRef = useRef(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const isModalOpenRef = useRef(false);
  isModalOpenRef.current = isModalOpen;
  const [qrSharePlaylist, setQrSharePlaylist] = useState<Playlist | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [queue, setQueue] = useState<MediaItem[]>(SAMPLE_TRACKS);
  const [queueIndex, setQueueIndex] = useState(0);
  const queueRef = useRef<MediaItem[]>(SAMPLE_TRACKS);
  const queueIndexRef = useRef(0);
  const repeatModeRef = useRef<'all' | 'one' | 'off'>('all');
  const isShuffleRef = useRef(false);

  // Playlists & Cloud Sync across devices
  const [playlists, setPlaylists] = useState<Playlist[]>(INITIAL_MOBILE_PLAYLISTS);
  const [apiBaseUrl, setApiBaseUrl] = useState<string>(detectDefaultApiUrl());
  const [isSyncModalVisible, setIsSyncModalVisible] = useState(false);
  const [syncCodeInput, setSyncCodeInput] = useState('');
  const [mySyncCode, setMySyncCode] = useState<string>('');
  const [syncUser, setSyncUser] = useState<{ id: string; name: string; email?: string; username?: string; syncCode?: string } | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [authTab, setAuthTab] = useState<'login' | 'register' | 'syncCode'>('login');
  const [authIdentifier, setAuthIdentifier] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authUsername, setAuthUsername] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncSuccess, setSyncSuccess] = useState<string | null>(null);
  const syncUserRef = useRef(syncUser);
  syncUserRef.current = syncUser;
  const historyRecordedTrackIdRef = useRef<string | null>(null);

  // Standalone Playlist Creation on Mobile
  const [isCreatePlaylistModalVisible, setIsCreatePlaylistModalVisible] = useState(false);
  const [newStandalonePlaylistTitle, setNewStandalonePlaylistTitle] = useState('');
  const [newStandalonePlaylistDesc, setNewStandalonePlaylistDesc] = useState('');
  const [isCreatingStandalonePlaylist, setIsCreatingStandalonePlaylist] = useState(false);

  // Multi-select playlists & bulk deletion
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedPlaylistIds, setSelectedPlaylistIds] = useState<string[]>([]);
  const [isDeletingBatch, setIsDeletingBatch] = useState(false);

  // Multi-select tracks & bulk add to playlist
  const [isTrackSelectMode, setIsTrackSelectMode] = useState(false);
  const [selectedTrackIds, setSelectedTrackIds] = useState<string[]>([]);
  const [isAddToPlaylistModalVisible, setIsAddToPlaylistModalVisible] = useState(false);
  const [isAddingTracksBatch, setIsAddingTracksBatch] = useState(false);
  const [newMobilePlaylistTitle, setNewMobilePlaylistTitle] = useState('');

  // In-app QR Code Scanning for Shared Playlists
  const [isScanQrModalVisible, setIsScanQrModalVisible] = useState(false);
  const [scannedQrInput, setScannedQrInput] = useState('');
  const [isScanningQr, setIsScanningQr] = useState(false);
  const [scanQrError, setScanQrError] = useState<string | null>(null);
  const [scannedPlaylistSuccess, setScannedPlaylistSuccess] = useState<Playlist | null>(null);

  const handleScanSharedPlaylist = async (customPayload?: string) => {
    const raw = (customPayload || scannedQrInput).trim();
    if (!raw) {
      setScanQrError('Please enter or scan a QR code payload / share link');
      return;
    }

    setIsScanningQr(true);
    setScanQrError(null);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
      if (syncUser?.id) headers['x-user-id'] = syncUser.id;

      const res = await fetch(`${apiBaseUrl}/playlists/share/scan`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ qrData: raw, userId: syncUser?.id || undefined })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to process QR code');
      }

      if (data.playlist) {
        setScannedPlaylistSuccess(data.playlist);
        setPlaylists(prev => {
          if (prev.some(p => p.id === data.playlist.id)) {
            return prev.map(p => p.id === data.playlist.id ? data.playlist : p);
          }
          return [data.playlist, ...prev];
        });
        fetchPlaylists();
      }
    } catch (err: any) {
      setScanQrError(err.message || 'Error processing QR code');
    } finally {
      setIsScanningQr(false);
    }
  };

  const toggleSelectTrack = (trackId: string) => {
    setSelectedTrackIds(prev => 
      prev.includes(trackId) ? prev.filter(x => x !== trackId) : [...prev, trackId]
    );
  };

  const handleBatchAddToPlaylist = async (playlistId: string) => {
    if (selectedTrackIds.length === 0) return;
    setIsAddingTracksBatch(true);
    try {
      const selectedMedia = SAMPLE_TRACKS.filter(t => selectedTrackIds.includes(t.id));
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
      if (syncUser?.id) headers['x-user-id'] = syncUser.id;

      const res = await fetch(`${apiBaseUrl}/playlists/${playlistId}/items`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          mediaItemIds: selectedTrackIds,
          items: selectedMedia
        })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to add tracks to playlist');
      }
      const count = selectedTrackIds.length;
      setSelectedTrackIds([]);
      setIsTrackSelectMode(false);
      setIsAddToPlaylistModalVisible(false);
      fetchPlaylists();
      Alert.alert('Success', `Added ${count} track${count > 1 ? 's' : ''} to playlist!`);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not add tracks to playlist');
    } finally {
      setIsAddingTracksBatch(false);
    }
  };

  const handleCreateAndAddBatchTracks = async () => {
    const title = newMobilePlaylistTitle.trim();
    if (!title) return;
    setIsAddingTracksBatch(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
      if (syncUser?.id) headers['x-user-id'] = syncUser.id;

      const createRes = await fetch(`${apiBaseUrl}/playlists`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title,
          description: 'Created on mobile',
          userId: syncUser?.id || 'demo-user-id'
        })
      });
      if (!createRes.ok) {
        const err = await createRes.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to create playlist');
      }
      const createData = await createRes.json();
      const newPlId = createData.playlist?.id;
      if (newPlId) {
        await handleBatchAddToPlaylist(newPlId);
      }
      setNewMobilePlaylistTitle('');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create and add');
    } finally {
      setIsAddingTracksBatch(false);
    }
  };

  const toggleSelectPlaylist = (id: string) => {
    setSelectedPlaylistIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAllPlaylists = () => {
    if (selectedPlaylistIds.length === playlists.length) {
      setSelectedPlaylistIds([]);
    } else {
      setSelectedPlaylistIds(playlists.map(p => p.id));
    }
  };

  const handleDeleteSelectedPlaylists = async () => {
    if (selectedPlaylistIds.length === 0) return;

    setIsDeletingBatch(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
      if (syncUser?.id) headers['x-user-id'] = syncUser.id;

      const res = await fetch(`${apiBaseUrl}/playlists/batch`, {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ ids: selectedPlaylistIds })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to delete selected playlists');
      }
      const data = await res.json();
      const deletedSet = new Set(data.deletedIds || selectedPlaylistIds);
      setPlaylists(prev => prev.filter(p => !deletedSet.has(p.id)));
      setSelectedPlaylistIds([]);
      setIsSelectMode(false);
      fetchPlaylists();
    } catch (err: any) {
      console.warn('Batch delete error:', err);
      Alert.alert('Delete Failed', err.message || 'Could not delete playlists');
    } finally {
      setIsDeletingBatch(false);
    }
  };

  const confirmDeleteSelected = () => {
    const count = selectedPlaylistIds.length;
    if (count === 0) return;
    if (typeof window !== 'undefined' && (window as any).confirm) {
      const ok = (window as any).confirm(`Delete ${count} selected playlist${count > 1 ? 's' : ''}? This cannot be undone.`);
      if (ok) {
        handleDeleteSelectedPlaylists();
        return;
      }
    }
    Alert.alert(
      'Delete Playlists',
      `Delete ${count} selected playlist${count > 1 ? 's' : ''}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: handleDeleteSelectedPlaylists }
      ]
    );
  };

  const fetchPlaylists = async (baseUrl = apiBaseUrl, uid = syncUser?.id || 'demo-user-id', token = authToken) => {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      headers['x-user-id'] = uid;

      const res = await fetch(`${baseUrl}/playlists?userId=${encodeURIComponent(uid)}`, { headers });
      if (res.ok) {
        const data = await res.json();
        const serverList = data.playlists || [];
        const deletedIds = new Set<string>(data.deletedPlaylistIds || []);
        if (serverList.length > 0) {
          const transformed = serverList
            .filter((p: any) => !deletedIds.has(p.id))
            .map((p: any) => ({
            ...p,
            items: (p.items || []).map((it: any) => ({
              id: it.id,
              mediaItemId: it.mediaItemId || it.mediaItem?.id,
              mediaItem: it.mediaItem || {
                id: it.mediaItemId || `track-${Math.random()}`,
                title: it.title || 'Unknown Track',
                artist: it.artist || 'Unknown Artist',
                thumbnail: p.coverArt || SAMPLE_TRACKS[0].thumbnail,
                duration: it.duration || 210,
                genre: 'Electronic',
                mood: 'Chill',
                streamUrl: it.streamUrl || 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
                isOfflinePermitted: true
              }
            }))
          }));
          setPlaylists(transformed);
          AsyncStorage.setItem(CACHED_PLAYLISTS_KEY, JSON.stringify(transformed)).catch(() => {});
          // Immediately prune any selected playlist IDs that were deleted on another device
          setSelectedPlaylistIds(prev => prev.filter(id => serverList.some((p: any) => p.id === id)));
          if (qrSharePlaylist && !serverList.some((p: any) => p.id === qrSharePlaylist.id)) {
            setQrSharePlaylist(null);
          }
        } else if (Array.isArray(serverList)) {
          setPlaylists([]);
          setSelectedPlaylistIds([]);
          setQrSharePlaylist(null);
          AsyncStorage.setItem(CACHED_PLAYLISTS_KEY, JSON.stringify([])).catch(() => {});
        }
      }
    } catch (err) {
      console.warn('Network fetch playlists error:', err);
    }
  };

  const handleCreateStandalonePlaylist = async () => {
    const title = newStandalonePlaylistTitle.trim();
    if (!title) {
      Alert.alert('Required', 'Please enter a playlist title.');
      return;
    }
    setIsCreatingStandalonePlaylist(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
      if (syncUser?.id) headers['x-user-id'] = syncUser.id;

      const res = await fetch(`${apiBaseUrl}/playlists`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title,
          description: newStandalonePlaylistDesc.trim() || 'Created on mobile device',
          userId: syncUser?.id || 'demo-user-id',
          creator: syncUser ? {
            id: syncUser.id,
            name: syncUser.name,
            username: syncUser.username || syncUser.name,
            email: syncUser.email
          } : undefined
        })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to create playlist');
      }
      const data = await res.json();
      const created = data.playlist;
      if (created) {
        const updated = [created, ...playlists.filter(p => p.id !== created.id)];
        setPlaylists(updated);
        setIsCreatePlaylistModalVisible(false);
        setNewStandalonePlaylistTitle('');
        setNewStandalonePlaylistDesc('');
        AsyncStorage.setItem(CACHED_PLAYLISTS_KEY, JSON.stringify(updated)).catch(() => {});
        Alert.alert('Success', `Playlist "${created.title}" created and saved to server!`);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not create playlist');
    } finally {
      setIsCreatingStandalonePlaylist(false);
    }
  };

  const handleLogin = async () => {
    const ident = authIdentifier.trim();
    const pass = authPassword.trim();
    if (!ident || !pass) {
      setSyncError('Please enter your username/email and password.');
      return;
    }
    setIsSyncing(true);
    setSyncError(null);
    setSyncSuccess(null);
    try {
      const clientPlaylistIds = playlists.filter(p => !p.id.startsWith('mobile-pl-')).map(p => p.id);
      const res = await fetch(`${apiBaseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: ident, password: pass, clientPlaylistIds })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid credentials');
      setSyncUser(data.user);
      setAuthToken(data.token);
      AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user)).catch(() => {});
      if (data.token) AsyncStorage.setItem(AUTH_TOKEN_KEY, data.token).catch(() => {});
      if (data.user.syncCode) setMySyncCode(data.user.syncCode);
      if (data.playlists && Array.isArray(data.playlists)) {
        const transformed = data.playlists.map((p: any) => ({
          ...p,
          items: (p.items || []).map((it: any) => ({
            id: it.id,
            mediaItemId: it.mediaItemId || it.mediaItem?.id,
            mediaItem: it.mediaItem || {
              id: it.mediaItemId || `track-${Math.random()}`,
              title: it.title || 'Unknown Track',
              artist: it.artist || 'Unknown Artist',
              thumbnail: p.coverArt || SAMPLE_TRACKS[0].thumbnail,
              duration: it.duration || 210,
              genre: 'Electronic',
              mood: 'Chill',
              streamUrl: it.streamUrl || 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
              isOfflinePermitted: true
            }
          }))
        }));
        setPlaylists(transformed);
        AsyncStorage.setItem(CACHED_PLAYLISTS_KEY, JSON.stringify(transformed)).catch(() => {});
      }
      setSyncSuccess(`Logged in as ${data.user.name}! Syncing all your cloud playlists...`);
      await fetchPlaylists(apiBaseUrl, data.user.id, data.token);
      setTimeout(() => {
        setIsSyncModalVisible(false);
        setSyncSuccess(null);
      }, 1200);
    } catch (err: any) {
      setSyncError(err.message || 'Login failed. Check server address and credentials.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRegister = async () => {
    const name = authName.trim();
    const ident = authIdentifier.trim();
    const username = authUsername.trim() || (ident.includes('@') ? ident.split('@')[0] : ident);
    const email = ident.includes('@') ? ident : `${username}@vibeflow.local`;
    const password = authPassword.trim();
    if (!password || password.length < 6) {
      setSyncError('Password must be at least 6 characters.');
      return;
    }
    if (!ident) {
      setSyncError('Please enter an email or username.');
      return;
    }
    setIsSyncing(true);
    setSyncError(null);
    setSyncSuccess(null);
    try {
      const clientPlaylistIds = playlists.filter(p => !p.id.startsWith('mobile-pl-')).map(p => p.id);
      const res = await fetch(`${apiBaseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name || username, email, username, password, clientPlaylistIds })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      setSyncUser(data.user);
      setAuthToken(data.token);
      AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user)).catch(() => {});
      if (data.token) AsyncStorage.setItem(AUTH_TOKEN_KEY, data.token).catch(() => {});
      setSyncSuccess(`Account created for ${data.user.name}! Playlists ready.`);
      await fetchPlaylists(apiBaseUrl, data.user.id, data.token);
      setTimeout(() => {
        setIsSyncModalVisible(false);
        setSyncSuccess(null);
      }, 1200);
    } catch (err: any) {
      setSyncError(err.message || 'Registration failed.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDemoLogin = async () => {
    setIsSyncing(true);
    setSyncError(null);
    setSyncSuccess(null);
    try {
      const res = await fetch(`${apiBaseUrl}/auth/demo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Demo login failed');
      setSyncUser(data.user);
      setAuthToken(data.token);
      AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user)).catch(() => {});
      if (data.token) AsyncStorage.setItem(AUTH_TOKEN_KEY, data.token).catch(() => {});
      setSyncSuccess(`Logged in as Demo User (${data.user.name})!`);
      await fetchPlaylists(apiBaseUrl, data.user.id, data.token);
      setTimeout(() => {
        setIsSyncModalVisible(false);
        setSyncSuccess(null);
      }, 1200);
    } catch (err: any) {
      setSyncError(err.message || 'Demo login failed.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogout = () => {
    setSyncUser(null);
    setAuthToken(null);
    setPlaylists(INITIAL_MOBILE_PLAYLISTS);
    AsyncStorage.removeItem(AUTH_USER_KEY).catch(() => {});
    AsyncStorage.removeItem(AUTH_TOKEN_KEY).catch(() => {});
    AsyncStorage.removeItem(CACHED_PLAYLISTS_KEY).catch(() => {});
    setSyncSuccess('Signed out. Switched to offline guest mode.');
    setTimeout(() => {
      setSyncSuccess(null);
      setIsSyncModalVisible(false);
    }, 900);
  };

  const fetchMySyncCode = async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/playlists/sync/code`);
      if (res.ok) {
        const data = await res.json();
        if (data.syncCode) setMySyncCode(data.syncCode);
      }
    } catch {}
  };

  const handleLinkSyncCode = async () => {
    const code = syncCodeInput.trim().toUpperCase();
    if (!code) return;
    setIsSyncing(true);
    setSyncError(null);
    setSyncSuccess(null);
    try {
      const res = await fetch(`${apiBaseUrl}/playlists/sync/link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ syncCode: code })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid sync code');
      if (data.user) {
        setSyncUser(data.user);
        setAuthToken(data.token || null);
        AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user)).catch(() => {});
        if (data.token) AsyncStorage.setItem(AUTH_TOKEN_KEY, data.token).catch(() => {});
        setMySyncCode(data.user.syncCode || code);
        if (Array.isArray(data.playlists) && data.playlists.length > 0) {
          const transformed = data.playlists.map((p: any) => ({
            ...p,
            items: (p.items || []).map((it: any) => ({
              id: it.id,
              mediaItemId: it.mediaItemId || it.mediaItem?.id,
              mediaItem: it.mediaItem || {
                id: it.mediaItemId || `track-${Math.random()}`,
                title: it.title || 'Unknown Track',
                artist: it.artist || 'Unknown Artist',
                thumbnail: p.coverArt || SAMPLE_TRACKS[0].thumbnail,
                duration: it.duration || 210,
                genre: 'Electronic',
                mood: 'Chill',
                streamUrl: it.streamUrl || 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
                isOfflinePermitted: true
              }
            }))
          }));
          setPlaylists(transformed);
          AsyncStorage.setItem(CACHED_PLAYLISTS_KEY, JSON.stringify(transformed)).catch(() => {});
        } else {
          fetchPlaylists(apiBaseUrl, data.user.id, data.token);
        }
        setSyncSuccess(`Connected to ${data.user.name}'s account! Playlists synced.`);
        setTimeout(() => setIsSyncModalVisible(false), 1400);
      }
    } catch (err: any) {
      setSyncError(err.message || 'Failed to sync. Please verify server address & code.');
    } finally {
      setIsSyncing(false);
    }
  };

  const playPlaylist = (pl: Playlist, startIndex = 0) => {
    if (!pl.items || pl.items.length === 0) return;
    const mediaTracks = pl.items.map(it => it.mediaItem).filter(Boolean);
    if (mediaTracks.length === 0) return;
    playTrack(mediaTracks[startIndex] || mediaTracks[0], mediaTracks, startIndex);
  };

  useEffect(() => {
    fetchPlaylists();
    fetchMySyncCode();
  }, []);

  // Offline Audio & Download State
  const [offlineTracks, setOfflineTracks] = useState<OfflineTrackItem[]>([
    {
      id: 'track-2',
      track: SAMPLE_TRACKS[1],
      quality: '320',
      fileSizeBytes: 6.8 * 1024 * 1024,
      downloadedAt: 'Cached'
    }
  ]);
  const [downloadTargetTrack, setDownloadTargetTrack] = useState<MediaItem | null>(null);
  const [isDownloadModalVisible, setIsDownloadModalVisible] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState<'320' | '256' | '128' | '64'>('320');
  const [isCopyrightAgreed, setIsCopyrightAgreed] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const handleStartDownload = () => {
    if (!isCopyrightAgreed || !downloadTargetTrack) return;
    setIsDownloading(true);
    setTimeout(() => {
      const bitrates: Record<string, number> = { '320': 2.4, '256': 1.9, '128': 0.96, '64': 0.48 };
      const rate = bitrates[selectedQuality] || 2.0;
      const effectiveDuration = (downloadTargetTrack.duration && downloadTargetTrack.duration > 35) ? downloadTargetTrack.duration : 210;
      const sizeMB = (effectiveDuration / 60) * rate;
      const newOfflineItem: OfflineTrackItem = {
        id: downloadTargetTrack.id,
        track: {
          ...downloadTargetTrack,
          duration: effectiveDuration,
          isOfflinePermitted: true
        },
        quality: selectedQuality,
        fileSizeBytes: Math.round(sizeMB * 1024 * 1024),
        downloadedAt: 'Just now'
      };
      setOfflineTracks((prev: OfflineTrackItem[]) => [newOfflineItem, ...prev.filter((t: OfflineTrackItem) => t.id !== downloadTargetTrack.id)]);
      setIsDownloading(false);
      setDownloadSuccess(true);
    }, 1200);
  };

  const soundRef = useRef<Audio.Sound | null>(null);
  const playbackRequestIdRef = useRef<number>(0);

  // ── Playback Persistence ──────────────────────────────────────────────────
  const PLAYBACK_STATE_KEY = '@vibeflow:playback_state';
  // Tracks last position persisted to AsyncStorage so we throttle writes to once per 5s
  const lastPersistedPositionRef = useRef<number>(-1);
  const lastPersistedTimeRef = useRef<number>(0);

  const savePlaybackState = async (trackId: string, positionMs: number) => {
    try {
      await AsyncStorage.setItem(
        PLAYBACK_STATE_KEY,
        JSON.stringify({ trackId, positionMs })
      );
    } catch (err) {
      console.warn('[VibeFlow] Failed to save playback state:', err);
    }
  };

  const clearPlaybackState = async () => {
    try {
      await AsyncStorage.removeItem(PLAYBACK_STATE_KEY);
    } catch {}
  };
  // ─────────────────────────────────────────────────────────────────────────

  // ── Stream Source Hardening (Saavn, Spotify, etc.) ────────────────────────
  // Remote streams need browser-like headers so CDNs don't drop connections in background/locked modes.
  // Saavn streams are AAC wrapped in .mp4 containers, which need overrideFileExtensionWithSourceFormat: 'm4a'.
  const buildAudioSource = (streamUrl: string): { uri: string; headers?: Record<string, string>; overrideFileExtensionWithSourceFormat?: string } => {
    const isSaavn = streamUrl.includes('saavncdn.com') || streamUrl.includes('jiosaavn.com');
    const isRemote = streamUrl.startsWith('http://') || streamUrl.startsWith('https://');

    if (isRemote) {
      const headers: Record<string, string> = {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
        'Accept': '*/*',
        'Accept-Ranges': 'bytes',
        'Connection': 'keep-alive',
      };
      if (isSaavn) {
        return {
          uri: streamUrl,
          headers,
          // Tell ExoPlayer this is an m4a/AAC stream despite the .mp4 extension
          overrideFileExtensionWithSourceFormat: 'm4a',
        };
      }
      return {
        uri: streamUrl,
        headers,
      };
    }
    return { uri: streamUrl };
  };
  // ─────────────────────────────────────────────────────────────────────────

  // Configure Expo AV for Background & Lock-Screen Audio Playback like Spotify / VLC
  useEffect(() => {
    async function initAudio() {
      try {
        await Audio.setAudioModeAsync({
          staysActiveInBackground: true,
          playsInSilentModeIOS: true,
          // CRITICAL: shouldDuckAndroid MUST be true! If false, transient audio focus losses
          // (such as screen-lock sound, power button click, or notifications) trigger
          // AUDIOFOCUS_LOSS_TRANSIENT which causes expo-av to PAUSE the music immediately.
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
          interruptionModeAndroid: 1, // InterruptionModeAndroid.DO_NOT_MIX (1)
          interruptionModeIOS: 1,     // InterruptionModeIOS.DO_NOT_MIX (1)
        });
      } catch (err) {
        console.warn('Failed to set audio mode for background playback', err);
      }

      // ── Restore server URL & user session across app restarts ─────────────
      try {
        const savedUrl = await AsyncStorage.getItem(API_BASE_URL_KEY);
        const activeUrl = savedUrl || detectDefaultApiUrl();
        setApiBaseUrl(activeUrl);

        const savedUserStr = await AsyncStorage.getItem(AUTH_USER_KEY);
        const savedToken = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
        const savedCachedPls = await AsyncStorage.getItem(CACHED_PLAYLISTS_KEY);

        if (savedCachedPls) {
          try {
            const parsed = JSON.parse(savedCachedPls);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setPlaylists(parsed);
            }
          } catch {}
        }

        if (savedUserStr && savedToken) {
          const parsedUser = JSON.parse(savedUserStr);
          setSyncUser(parsedUser);
          setAuthToken(savedToken);
          if (parsedUser.syncCode) setMySyncCode(parsedUser.syncCode);
          fetchPlaylists(activeUrl, parsedUser.id, savedToken);
        } else {
          fetchPlaylists(activeUrl);
        }
      } catch (err) {
        console.warn('[VibeFlow] Startup session restore error:', err);
      }

      // ── Restore last playback session ──────────────────────────────────────
      try {
        const saved = await AsyncStorage.getItem(PLAYBACK_STATE_KEY);
        if (saved) {
          const { trackId, positionMs } = JSON.parse(saved) as { trackId: string; positionMs: number };
          const allTracks = [...SAMPLE_TRACKS];
          const track = allTracks.find(t => t.id === trackId);
          if (track && track.streamUrl && positionMs >= 0) {
            try {
              await Audio.setAudioModeAsync({
                staysActiveInBackground: true,
                playsInSilentModeIOS: true,
                shouldDuckAndroid: true,
                playThroughEarpieceAndroid: false,
                interruptionModeAndroid: 1,
                interruptionModeIOS: 1,
              });
              const { sound } = await Audio.Sound.createAsync(
                buildAudioSource(track.streamUrl),
                {
                  shouldPlay: false,       // paused — user taps ▶ to resume
                  positionMillis: positionMs,
                  staysActiveInBackground: true,
                  progressUpdateIntervalMillis: 1000, // 1s interval reduces CPU load & phone heating
                  // Use default ExoPlayer backend — robust HTTPS streaming in background
                },
                (status: any) => {
                  if (status.isLoaded) {
                    positionMillisRef.current = status.positionMillis;
                    // Only trigger React state render if Now Playing modal is visible
                    if (isModalOpenRef.current) {
                      setPositionMillis(status.positionMillis);
                      setDurationMillis(status.durationMillis || 0);
                    }
                    if (isPlayingRef.current !== status.isPlaying) {
                      setIsPlaying(status.isPlaying);
                      isPlayingRef.current = status.isPlaying;
                    }
                    if (status.didJustFinish) {
                      clearPlaybackState();
                      playNextTrack();
                    }
                  }
                }
              );
              // Guard against race if user already tapped play or selected a track
              if (playbackRequestIdRef.current > 0) {
                try {
                  await sound.stopAsync();
                  await sound.unloadAsync();
                } catch {}
                return;
              }
              soundRef.current = sound;
              const idx = queueRef.current.findIndex(t => t.id === track.id);
              const safeIdx = idx >= 0 ? idx : 0;
              queueIndexRef.current = safeIdx;
              setQueueIndex(safeIdx);
              setCurrentTrack(track);
              currentTrackRef.current = track;
              setPositionMillis(positionMs);
              setIsPlaying(false);
              isPlayingRef.current = false;
            } catch (restoreErr) {
              console.warn('[VibeFlow] Failed to restore playback session:', restoreErr);
            }
          }
        }
      } catch (readErr) {
        console.warn('[VibeFlow] Failed to read saved playback state:', readErr);
      }
      // ──────────────────────────────────────────────────────────────────────
    }
    initAudio();

    // AppState listener:
    // • background / inactive → persist position in case OS kills process
    // • active (foreground) → sync UI status without interrupting ExoPlayer background thread
    const sub = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        // Persist position so a cold restart can resume from here
        const currentTrackSnapshot = currentTrackRef.current;
        if (currentTrackSnapshot && soundRef.current) {
          soundRef.current.getStatusAsync().then((status: any) => {
            if (status.isLoaded) {
              savePlaybackState(currentTrackSnapshot.id, status.positionMillis);
            }
          }).catch(() => {});
        }
        // NOTE: Do NOT call setAudioModeAsync or playAsync from background!
        // ExoPlayer with staysActiveInBackground: true continues playing natively.
        // Calling setAudioModeAsync or playAsync from background disrupts audio focus and stops playback.
      } else if (nextAppState === 'active') {
        // App returned to foreground: sync UI playback status with background player
        if (soundRef.current) {
          soundRef.current.getStatusAsync().then((status: any) => {
            if (status.isLoaded) {
              setPositionMillis(status.positionMillis);
              setDurationMillis(status.durationMillis || 0);
              setIsPlaying(status.isPlaying);
              isPlayingRef.current = status.isPlaying;
            }
          }).catch(() => {});
        }
        // Cross-device sync: refresh playlists when app returns to foreground
        fetchPlaylists();
      }
    });

    return () => {
      sub.remove();
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  // Cross-device sync: poll playlists every 5s while on the playlists tab to immediately catch deletions made on other devices
  useEffect(() => {
    if (activeTab === 'playlists') {
      fetchPlaylists();
      const interval = setInterval(() => {
        fetchPlaylists();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [activeTab, syncUser?.id, authToken]);

  // Ref so AppState handler can read currentTrack without stale closure
  const currentTrackRef = useRef<MediaItem | null>(SAMPLE_TRACKS[0]);

  const playTrack = async (track: MediaItem, newQueue?: MediaItem[], startIndex?: number) => {
    const reqId = ++playbackRequestIdRef.current;
    try {
      // Immediately stop and unload any existing sound instance
      if (soundRef.current) {
        const oldSound = soundRef.current;
        soundRef.current = null;
        try {
          await oldSound.stopAsync();
          await oldSound.unloadAsync();
        } catch {}
      }

      const activeQueue = newQueue || queueRef.current;
      queueRef.current = activeQueue;
      setQueue(activeQueue);

      const idx = startIndex !== undefined ? startIndex : activeQueue.findIndex((t: MediaItem) => t.id === track.id);
      const safeIdx = idx >= 0 ? idx : 0;
      queueIndexRef.current = safeIdx;
      setQueueIndex(safeIdx);

      setCurrentTrack(track);
      currentTrackRef.current = track; // keep ref in sync
      historyRecordedTrackIdRef.current = null;
      // Reset position persistence tracking for new track
      lastPersistedPositionRef.current = -1;
      lastPersistedTimeRef.current = 0;

      // Full-length stream resolution for preview tracks on mobile (Spotify, Deezer, iTunes, duration <= 45)
      let effectiveStreamUrl = track.streamUrl;
      const isPreview = !effectiveStreamUrl ||
        (track.duration && track.duration <= 45) ||
        effectiveStreamUrl.includes('preview') ||
        effectiveStreamUrl.includes('audio-ssl.itunes.apple.com') ||
        effectiveStreamUrl.includes('dzcdn.net') ||
        effectiveStreamUrl.includes('mzstatic.com') ||
        effectiveStreamUrl.includes('p.scdn.co') ||
        effectiveStreamUrl.includes('open.spotify.com') ||
        effectiveStreamUrl.includes('mpthreetest.mp3') ||
        track.provider === 'spotify' ||
        track.provider === 'deezer' ||
        (track.provider as string) === 'itunes' ||
        track.id.startsWith('itunes-') ||
        track.id.startsWith('deezer-') ||
        (track.capabilities && track.capabilities.includes('preview_only'));

      if (isPreview) {
        try {
          const res = await fetch(`${apiBaseUrl}/media/resolve-stream?title=${encodeURIComponent(track.title)}&artist=${encodeURIComponent(track.artist)}&id=${encodeURIComponent(track.id)}`);
          if (res.ok) {
            const data = await res.json();
            if (playbackRequestIdRef.current !== reqId) return; // Stale request check
            if (data?.streamUrl && data.streamUrl.startsWith('http')) {
              effectiveStreamUrl = data.streamUrl;
              track.streamUrl = data.streamUrl;
              if (data.duration && data.duration > 40) {
                track.duration = data.duration;
              }
            }
          }
        } catch (e) {
          console.warn('[Mobile] Failed to resolve full track stream:', e);
        }
      }

      if (playbackRequestIdRef.current !== reqId) return;
      if (!effectiveStreamUrl) return;

      // Re-apply background audio mode before starting playback
      try {
        await Audio.setAudioModeAsync({
          staysActiveInBackground: true,
          playsInSilentModeIOS: true,
          // CRITICAL: shouldDuckAndroid MUST be true! Prevents lock screen sounds / power button from pausing audio
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
          interruptionModeAndroid: 1, // DO_NOT_MIX
          interruptionModeIOS: 1,
        });
      } catch {}

      const { sound } = await Audio.Sound.createAsync(
        buildAudioSource(effectiveStreamUrl),
        { 
          shouldPlay: true, 
          staysActiveInBackground: true,
          progressUpdateIntervalMillis: 1000, // 1s interval prevents CPU churn and battery heating
          // ExoPlayer (default in expo-av) reliably handles streaming chunks, headers, and background audio
        },
        (status: any) => {
          if (status.isLoaded) {
            positionMillisRef.current = status.positionMillis;
            // Only re-render root component timer when modal is currently open
            if (isModalOpenRef.current) {
              setPositionMillis(status.positionMillis);
              setDurationMillis(status.durationMillis || 0);
            }
            if (isPlayingRef.current !== status.isPlaying) {
              setIsPlaying(status.isPlaying);
              isPlayingRef.current = status.isPlaying;
            }

            // Record listening history once track plays for >= 5 seconds
            if (status.positionMillis >= 5000 && track?.id && historyRecordedTrackIdRef.current !== track.id) {
              historyRecordedTrackIdRef.current = track.id;
              const uid = syncUserRef.current?.id || syncUserRef.current?.email || 'demo-user-id';
              const durSecs = (status.durationMillis || 180000) / 1000;
              const rate = durSecs > 0 ? Math.min(1.0, (status.positionMillis / 1000) / durSecs) : 0.5;
              fetch(`${apiBaseUrl}/library/history`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  userId: uid,
                  mediaItemId: track.id,
                  playedSeconds: Math.floor(status.positionMillis / 1000),
                  completionRate: rate,
                  mediaItem: track
                })
              }).catch(() => {});
            }

            if (status.didJustFinish) {
              const uid = syncUserRef.current?.id || syncUserRef.current?.email || 'demo-user-id';
              fetch(`${apiBaseUrl}/library/history`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  userId: uid,
                  mediaItemId: track.id,
                  playedSeconds: Math.floor((status.durationMillis || 180000) / 1000),
                  completionRate: 1.0,
                  mediaItem: track
                })
              }).catch(() => {});
              historyRecordedTrackIdRef.current = null;
              clearPlaybackState(); // track finished — nothing to resume
              // Seamless continuous background playback of next track
              playNextTrack();
            }
          }
        }
      );

      // CRITICAL: Check if another track was requested while loading this one!
      if (playbackRequestIdRef.current !== reqId) {
        try {
          await sound.stopAsync();
          await sound.unloadAsync();
        } catch {}
        return;
      }

      // If another sound was assigned in between, ensure it is unloaded
      if (soundRef.current) {
        try {
          await soundRef.current.stopAsync();
          await soundRef.current.unloadAsync();
        } catch {}
      }

      soundRef.current = sound;
      setIsPlaying(true);
      isPlayingRef.current = true;
    } catch (err) {
      console.warn('Failed to play audio track on mobile', err);
    }
  };

  const playNextTrack = () => {
    const q = queueRef.current;
    if (!q || q.length === 0) return;

    if (repeatModeRef.current === 'one') {
      const cur = q[queueIndexRef.current];
      if (cur) playTrack(cur);
      return;
    }

    let nextIdx = queueIndexRef.current + 1;
    if (isShuffleRef.current) {
      nextIdx = Math.floor(Math.random() * q.length);
    } else if (nextIdx >= q.length) {
      if (repeatModeRef.current === 'all') {
        nextIdx = 0;
      } else {
        setIsPlaying(false);
        isPlayingRef.current = false;
        return;
      }
    }

    const next = q[nextIdx];
    if (next) {
      playTrack(next, q, nextIdx);
    }
  };

  const playPreviousTrack = () => {
    const q = queueRef.current;
    if (!q || q.length === 0) return;
    let prevIdx = queueIndexRef.current - 1;
    if (prevIdx < 0) prevIdx = q.length - 1;
    const prev = q[prevIdx];
    if (prev) {
      playTrack(prev, q, prevIdx);
    }
  };

  const togglePlay = async () => {
    if (!soundRef.current) {
      if (currentTrack) playTrack(currentTrack);
      return;
    }

    if (isPlaying) {
      await soundRef.current.pauseAsync();
      setIsPlaying(false);
      isPlayingRef.current = false;
      if (currentTrackRef.current) {
        savePlaybackState(currentTrackRef.current.id, positionMillisRef.current);
      }
    } else {
      await soundRef.current.playAsync();
      setIsPlaying(true);
      isPlayingRef.current = true;
    }
  };

  const openNowPlaying = () => {
    setPositionMillis(positionMillisRef.current);
    setIsModalOpen(true);
  };

  const formatTime = (millis: number) => {
    const totalSecs = Math.floor(millis / 1000);
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0d0f17" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoText}>⚡</Text>
          </View>
          <View>
            <Text style={styles.brandTitle}>VibeFlow AI</Text>
            <Text style={styles.brandSubtitle}>Intelligent Music & Video</Text>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.syncHeaderBtn} 
          onPress={() => {
            fetchMySyncCode();
            setIsSyncModalVisible(true);
          }}
        >
          <Text style={styles.syncHeaderBtnText}>
            {syncUser ? `👤 ${syncUser.name.split(' ')[0]}` : '👤 Sign In'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Content Area */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {activeTab === 'home' && (
          <View style={styles.section}>
            {/* Hero Card */}
            <View style={styles.heroCard}>
              <Text style={styles.aiTag}>✨ AI RECOMMENDATION ENGINE</Text>
              <Text style={styles.heroTitle}>Discover Your Sonic Flow</Text>
              <Text style={styles.heroDesc}>
                YouTube streams, local offline library, and AI mood classification with background playback.
              </Text>
              <TouchableOpacity 
                style={styles.heroButton} 
                onPress={() => playTrack(SAMPLE_TRACKS[0])}
              >
                <Text style={styles.heroButtonText}>▶ Start Daily Vibe Mix</Text>
              </TouchableOpacity>
            </View>

            {/* Quick Mood Chips */}
            <Text style={styles.sectionTitle}>Moods & Vibes</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.moodScroll}>
              {['Workout & Energy', 'Calm & Peaceful', 'Focus & Study', 'Romantic', 'Hindi Retro'].map(m => (
                <View key={m} style={styles.moodChip}>
                  <Text style={styles.moodChipText}>{m}</Text>
                </View>
              ))}
            </ScrollView>

            {/* Recommended Tracks Header with Multi-Select Toggle */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={styles.sectionTitle}>Recommended for You</Text>
              <TouchableOpacity
                style={[
                  styles.syncSmallBtn,
                  isTrackSelectMode && { backgroundColor: 'rgba(99,102,241,0.2)', borderColor: '#6366f1' }
                ]}
                onPress={() => {
                  const next = !isTrackSelectMode;
                  setIsTrackSelectMode(next);
                  if (!next) setSelectedTrackIds([]);
                }}
              >
                <Text style={[styles.syncSmallBtnText, isTrackSelectMode && { color: '#818cf8', fontWeight: 'bold' }]}>
                  {isTrackSelectMode ? 'Cancel' : 'Select Multiple'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Batch Action Bar for Tracks */}
            {isTrackSelectMode && selectedTrackIds.length > 0 && (
              <View style={[styles.batchActionBar, { marginBottom: 14 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={styles.batchCountText}>
                    {selectedTrackIds.length} track{selectedTrackIds.length > 1 ? 's' : ''} selected
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.batchDeleteBtn, { backgroundColor: '#4f46e5', borderColor: '#6366f1' }]}
                  onPress={() => setIsAddToPlaylistModalVisible(true)}
                >
                  <Text style={[styles.batchDeleteText, { color: '#fff' }]}>
                    ➕ Add to Playlist ({selectedTrackIds.length})
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {SAMPLE_TRACKS.map(track => {
              const isChecked = selectedTrackIds.includes(track.id);
              return (
                <TouchableOpacity 
                  key={track.id} 
                  style={[
                    styles.trackCard,
                    isTrackSelectMode && isChecked && {
                      borderColor: '#6366f1',
                      backgroundColor: 'rgba(99,102,241,0.14)'
                    }
                  ]}
                  onPress={() => {
                    if (isTrackSelectMode) {
                      toggleSelectTrack(track.id);
                    } else {
                      playTrack(track);
                    }
                  }}
                >
                  {isTrackSelectMode && (
                    <TouchableOpacity
                      onPress={() => toggleSelectTrack(track.id)}
                      style={[
                        styles.playlistCheckbox,
                        isChecked && styles.playlistCheckboxChecked,
                        { marginRight: 8 }
                      ]}
                    >
                      {isChecked && <Text style={styles.playlistCheckboxCheck}>✓</Text>}
                    </TouchableOpacity>
                  )}
                  <Image source={{ uri: track.thumbnail }} style={styles.trackThumb} />
                  <View style={styles.trackMeta}>
                    <Text style={styles.trackTitle} numberOfLines={1}>{track.title}</Text>
                    <Text style={styles.trackArtist}>{track.artist}</Text>
                    <View style={styles.tagRow}>
                      <Text style={styles.genreTag}>{track.genre}</Text>
                      <Text style={styles.moodTag}>{track.mood}</Text>
                    </View>
                  </View>
                  {!isTrackSelectMode && (
                    <TouchableOpacity
                      style={styles.cardDownloadBtn}
                      onPress={() => {
                        setDownloadTargetTrack(track);
                        setSelectedQuality('320');
                        setIsCopyrightAgreed(false);
                        setDownloadSuccess(false);
                        setIsDownloadModalVisible(true);
                      }}
                    >
                      <Text style={styles.cardDownloadIcon}>📥</Text>
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {activeTab === 'explore' && (
          <View style={styles.section}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search or ask AI: 'Peaceful study music'..."
              placeholderTextColor="#64748b"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <Text style={styles.sectionTitle}>Explore by Genre</Text>
            <View style={styles.genreGrid}>
              {['Bollywood', 'Marathi Dhol', 'Punjabi', 'Lo-Fi Chill', 'Classical Sitar'].map(g => (
                <View key={g} style={styles.genreCard}>
                  <Text style={styles.genreCardText}>{g}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {activeTab === 'playlists' && (
          <View style={styles.section}>
            <View style={styles.playlistsHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>Cloud Playlists</Text>
                <Text style={styles.sectionSubtitle}>
                  {syncUser ? `Account: ${syncUser.name} • Cross-Device Active` : 'Playlists synced across all your devices'}
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.syncSmallBtn,
                  { backgroundColor: '#6366f1', borderColor: '#818cf8', marginRight: 6 }
                ]}
                onPress={() => {
                  setNewStandalonePlaylistTitle('');
                  setNewStandalonePlaylistDesc('');
                  setIsCreatePlaylistModalVisible(true);
                }}
              >
                <Text style={[styles.syncSmallBtnText, { color: '#ffffff', fontWeight: 'bold' }]}>
                  + New
                </Text>
              </TouchableOpacity>
              {playlists.length > 0 && (
                <TouchableOpacity
                  style={[
                    styles.syncSmallBtn,
                    {
                      backgroundColor: isSelectMode ? 'rgba(99,102,241,0.2)' : '#181d30',
                      borderColor: isSelectMode ? '#6366f1' : 'rgba(255,255,255,0.08)',
                      marginRight: 6
                    }
                  ]}
                  onPress={() => {
                    const next = !isSelectMode;
                    setIsSelectMode(next);
                    if (!next) setSelectedPlaylistIds([]);
                  }}
                >
                  <Text style={[styles.syncSmallBtnText, isSelectMode && { color: '#818cf8', fontWeight: 'bold' }]}>
                    {isSelectMode ? 'Cancel' : 'Select'}
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity 
                style={[styles.syncSmallBtn, { backgroundColor: '#1e2438', borderColor: 'rgba(56,189,248,0.35)', marginRight: 6 }]} 
                onPress={() => {
                  setScanQrError(null);
                  setScannedPlaylistSuccess(null);
                  setScannedQrInput('');
                  setIsScanQrModalVisible(true);
                }}
              >
                <Text style={[styles.syncSmallBtnText, { color: '#38bdf8', fontWeight: 'bold' }]}>
                  📷 Scan QR
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.syncSmallBtn} 
                onPress={() => {
                  fetchMySyncCode();
                  setIsSyncModalVisible(true);
                }}
              >
                <Text style={styles.syncSmallBtnText}>
                  {syncUser ? '⚙️ Account' : '🔑 Sign In'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Batch Selection Action Bar */}
            {isSelectMode && playlists.length > 0 && (
              <View style={styles.batchActionBar}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <TouchableOpacity
                    style={styles.batchSelectAllBtn}
                    onPress={handleSelectAllPlaylists}
                  >
                    <Text style={styles.batchSelectAllText}>
                      {selectedPlaylistIds.length === playlists.length ? 'Deselect All' : 'Select All'}
                    </Text>
                  </TouchableOpacity>
                  <Text style={styles.batchCountText}>
                    {selectedPlaylistIds.length} selected
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.batchDeleteBtn,
                    (selectedPlaylistIds.length === 0 || isDeletingBatch) && { opacity: 0.5 }
                  ]}
                  disabled={selectedPlaylistIds.length === 0 || isDeletingBatch}
                  onPress={confirmDeleteSelected}
                >
                  <Text style={styles.batchDeleteText}>
                    {isDeletingBatch ? 'Deleting...' : `🗑️ Delete (${selectedPlaylistIds.length})`}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {playlists.map((pl: Playlist) => {
              const isChecked = selectedPlaylistIds.includes(pl.id);
              return (
                <TouchableOpacity
                  key={pl.id}
                  activeOpacity={0.8}
                  onPress={() => {
                    if (isSelectMode) {
                      toggleSelectPlaylist(pl.id);
                    }
                  }}
                  style={[
                    styles.playlistCard,
                    isSelectMode && isChecked && {
                      borderColor: '#6366f1',
                      backgroundColor: 'rgba(99,102,241,0.14)'
                    }
                  ]}
                >
                  {isSelectMode && (
                    <TouchableOpacity
                      onPress={() => toggleSelectPlaylist(pl.id)}
                      style={[
                        styles.playlistCheckbox,
                        isChecked && styles.playlistCheckboxChecked
                      ]}
                    >
                      {isChecked && <Text style={styles.playlistCheckboxCheck}>✓</Text>}
                    </TouchableOpacity>
                  )}
                  <Image source={{ uri: pl.coverArt || SAMPLE_TRACKS[0].thumbnail }} style={styles.playlistThumb} />
                  <View style={styles.playlistMeta}>
                    <Text style={styles.playlistTitle} numberOfLines={1}>{pl.title}</Text>
                    <Text style={styles.playlistDesc} numberOfLines={1}>{pl.description || 'Personal music mix'}</Text>
                    <Text style={styles.playlistCount}>
                      {pl.items?.length || pl.itemCount || 0} tracks • By {pl.creator?.name || (syncUser?.name ? syncUser.name : 'You')}
                    </Text>
                  </View>
                  {!isSelectMode && (
                    <View style={{ flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                      <TouchableOpacity 
                        style={styles.playlistPlayBtn}
                        onPress={() => playPlaylist(pl)}
                      >
                        <Text style={styles.playlistPlayText}>▶ Play All</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.playlistPlayBtn, { backgroundColor: '#1e2438', borderWidth: 1, borderColor: 'rgba(56,189,248,0.25)', paddingVertical: 4, paddingHorizontal: 8 }]}
                        onPress={() => setQrSharePlaylist(pl)}
                      >
                        <Text style={[styles.playlistPlayText, { color: '#38bdf8', fontSize: 11 }]}>📱 Share QR</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}

            {playlists.length === 0 && (
              <View style={styles.emptyPlaylistCard}>
                <Text style={styles.emptyIcon}>☁️</Text>
                <Text style={styles.emptyTitle}>No Synced Playlists</Text>
                <Text style={styles.emptyDesc}>
                  Sign in with your username or email to automatically load all playlists created on your other devices!
                </Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
                  <TouchableOpacity 
                    style={[styles.linkSyncBtn, { backgroundColor: '#1e2438', borderWidth: 1, borderColor: '#38bdf8' }]}
                    onPress={() => {
                      setScanQrError(null);
                      setScannedPlaylistSuccess(null);
                      setScannedQrInput('');
                      setIsScanQrModalVisible(true);
                    }}
                  >
                    <Text style={[styles.linkSyncBtnText, { color: '#38bdf8' }]}>📷 Scan Shared QR</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.linkSyncBtn}
                    onPress={() => {
                      setAuthTab('login');
                      setIsSyncModalVisible(true);
                    }}
                  >
                    <Text style={styles.linkSyncBtnText}>Sign In with Account</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.linkSyncBtn, { backgroundColor: '#1e2436', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }]}
                    onPress={() => {
                      setAuthTab('syncCode');
                      fetchMySyncCode();
                      setIsSyncModalVisible(true);
                    }}
                  >
                    <Text style={styles.linkSyncBtnText}>Pair Code</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}

        {activeTab === 'library' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Offline Audio Vault</Text>
            <View style={styles.libraryBox}>
              <Text style={styles.libraryBoxTitle}>📥 Local In-App Offline Vault</Text>
              <Text style={styles.libraryBoxDesc}>
                {offlineTracks.length} tracks cached ({((offlineTracks.reduce((a: number, b: OfflineTrackItem) => a + b.fileSizeBytes, 0)) / (1024 * 1024)).toFixed(1)} MB). Full background audio without internet.
              </Text>
            </View>

            <Text style={[styles.sectionTitle, { marginTop: 14 }]}>Offline Tracks ({offlineTracks.length})</Text>
            {offlineTracks.map((item: OfflineTrackItem) => (
              <View key={item.id} style={styles.trackCard}>
                <Image source={{ uri: item.track.thumbnail }} style={styles.trackThumb} />
                <View style={styles.trackMeta}>
                  <Text style={styles.trackTitle} numberOfLines={1}>{item.track.title}</Text>
                  <Text style={styles.trackArtist}>{item.track.artist}</Text>
                  <View style={styles.tagRow}>
                    <Text style={styles.qualityBadge}>{item.quality} kbps MP3</Text>
                    <Text style={styles.offlineBadge}>Offline Ready</Text>
                  </View>
                </View>
                <TouchableOpacity 
                  style={styles.offlinePlayBtn} 
                  onPress={() => playTrack(item.track)}
                >
                  <Text style={styles.offlinePlayText}>▶</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {activeTab === 'ai' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>AI Taste Studio</Text>
            <View style={styles.libraryBox}>
              <Text style={styles.libraryBoxTitle}>🧠 Acoustic Classifier Active</Text>
              <Text style={styles.libraryBoxDesc}>
                Predicts genre & mood with 96% confidence based on acoustic timbre and linguistic tags.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Floating Mini-Player */}
      {currentTrack && (
        <TouchableOpacity 
          style={styles.miniPlayer}
          onPress={openNowPlaying}
          activeOpacity={0.9}
        >
          <Image source={{ uri: currentTrack.thumbnail }} style={styles.miniThumb} />
          <View style={styles.miniMeta}>
            <Text style={styles.miniTitle} numberOfLines={1}>{currentTrack.title}</Text>
            <Text style={styles.miniArtist} numberOfLines={1}>{currentTrack.artist}</Text>
          </View>
          <TouchableOpacity onPress={togglePlay} style={styles.playButton}>
            <Text style={styles.playButtonText}>{isPlaying ? '⏸' : '▶'}</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      )}

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        {[
          { id: 'home', label: 'Home', icon: '🏠' },
          { id: 'explore', label: 'Explore', icon: '🧭' },
          { id: 'playlists', label: 'Playlists', icon: '📋' },
          { id: 'library', label: 'Library', icon: '📚' },
          { id: 'ai', label: 'AI Studio', icon: '✨' },
        ].map(item => (
          <TouchableOpacity 
            key={item.id} 
            onPress={() => {
              setActiveTab(item.id as any);
              if (item.id === 'playlists') {
                fetchPlaylists();
              }
            }}
            style={styles.navItem}
          >
            <Text style={styles.navIcon}>{item.icon}</Text>
            <Text style={[styles.navText, activeTab === item.id && styles.navTextActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Fullscreen Now Playing Modal - Fully Vertically Scrollable */}
      <Modal visible={isModalOpen} animationType="slide" transparent={false}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTag}>NOW PLAYING</Text>
            <TouchableOpacity onPress={() => setIsModalOpen(false)}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {currentTrack && (
            <ScrollView 
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={true}
              bounces={true}
            >
              <View style={styles.modalBody}>
                <Image source={{ uri: currentTrack.thumbnail }} style={styles.modalArtwork} />
                <Text style={styles.modalTitle}>{currentTrack.title}</Text>
                <Text style={styles.modalArtist}>{currentTrack.artist}</Text>
                <Text style={styles.modalMoodBadge}>{currentTrack.genre} • {currentTrack.mood}</Text>

                {/* Progress */}
                <View style={styles.progressRow}>
                  <Text style={styles.timeText}>{formatTime(positionMillis)}</Text>
                  <Text style={styles.timeText}>{formatTime(durationMillis || currentTrack.duration * 1000)}</Text>
                </View>

                {/* Controls */}
                <View style={styles.modalControls}>
                  <TouchableOpacity onPress={playPreviousTrack} style={styles.modalSecondaryButton}>
                    <Text style={styles.modalSecondaryButtonText}>⏮</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={togglePlay} style={styles.modalPlayButton}>
                    <Text style={styles.modalPlayText}>{isPlaying ? '⏸' : '▶'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={playNextTrack} style={styles.modalSecondaryButton}>
                    <Text style={styles.modalSecondaryButtonText}>⏭</Text>
                  </TouchableOpacity>
                </View>

                {/* Download Option for Offline Play in App */}
                <TouchableOpacity
                  onPress={() => {
                    setDownloadTargetTrack(currentTrack);
                    setSelectedQuality('320');
                    setIsCopyrightAgreed(false);
                    setDownloadSuccess(false);
                    setIsDownloadModalVisible(true);
                  }}
                  style={styles.modalDownloadAction}
                >
                  <Text style={styles.modalDownloadActionText}>📥 Download MP3 (All Qualities)</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* Cross-Device Cloud Sync & Account Modal */}
      <Modal visible={isSyncModalVisible} animationType="slide" transparent>
        <View style={styles.downloadModalBackdrop}>
          <View style={styles.syncModalCard}>
            <View style={styles.downloadModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 20 }}>👤</Text>
                <Text style={styles.downloadModalTitle}>
                  {syncUser ? 'Account & Device Sync' : 'Sign In / Device Sync'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setIsSyncModalVisible(false)}>
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 520 }} showsVerticalScrollIndicator={false}>
              {syncUser ? (
                /* Authenticated Profile View */
                <View style={styles.profileSection}>
                  <View style={styles.profileCard}>
                    <View style={styles.profileAvatar}>
                      <Text style={styles.profileAvatarText}>
                        {(syncUser.name || 'U').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.profileName}>{syncUser.name}</Text>
                      <Text style={styles.profileEmail}>{syncUser.email || syncUser.username || 'Logged In User'}</Text>
                      <Text style={styles.profileSyncBadge}>☁️ Cross-Device Cloud Sync Active</Text>
                    </View>
                  </View>

                  <View style={styles.syncInfoBox}>
                    <Text style={styles.syncInfoTitle}>✓ Synced with Web & Devices</Text>
                    <Text style={styles.syncInfoDesc}>
                      {playlists.length} playlists loaded. Playlists created on your computer or here appear everywhere automatically.
                    </Text>
                  </View>

                  {mySyncCode ? (
                    <View style={styles.syncCodeCard}>
                      <Text style={styles.syncCodeCardLabel}>YOUR ACCOUNT SYNC CODE:</Text>
                      <Text style={styles.syncCodeDisplay}>{mySyncCode}</Text>
                      <Text style={styles.syncCodeSub}>Use this code on any device without entering passwords.</Text>
                    </View>
                  ) : null}

                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                    <TouchableOpacity 
                      style={[styles.syncSubmitBtn, { flex: 1, paddingVertical: 12 }]}
                      onPress={() => {
                        fetchPlaylists(apiBaseUrl, syncUser.id, authToken);
                        setSyncSuccess('Playlists refreshed from cloud!');
                        setTimeout(() => setSyncSuccess(null), 2000);
                      }}
                    >
                      <Text style={styles.syncSubmitBtnText}>🔄 Refresh</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.syncSubmitBtn, { flex: 1, backgroundColor: '#334155', paddingVertical: 12 }]}
                      onPress={handleLogout}
                    >
                      <Text style={styles.syncSubmitBtnText}>🚪 Sign Out</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                /* Auth Tabs */
                <View>
                  <View style={styles.authTabsRow}>
                    <TouchableOpacity 
                      style={[styles.authTabBtn, authTab === 'login' && styles.authTabBtnActive]}
                      onPress={() => { setAuthTab('login'); setSyncError(null); }}
                    >
                      <Text style={[styles.authTabBtnText, authTab === 'login' && styles.authTabBtnTextActive]}>
                        Sign In
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.authTabBtn, authTab === 'register' && styles.authTabBtnActive]}
                      onPress={() => { setAuthTab('register'); setSyncError(null); }}
                    >
                      <Text style={[styles.authTabBtnText, authTab === 'register' && styles.authTabBtnTextActive]}>
                        Register
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.authTabBtn, authTab === 'syncCode' && styles.authTabBtnActive]}
                      onPress={() => { setAuthTab('syncCode'); setSyncError(null); }}
                    >
                      <Text style={[styles.authTabBtnText, authTab === 'syncCode' && styles.authTabBtnTextActive]}>
                        Sync Code
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {authTab === 'login' && (
                    <View style={styles.authForm}>
                      <Text style={styles.authFormDesc}>
                        Sign in with the same credentials used on web to access all your playlists.
                      </Text>
                      <Text style={styles.inputLabel}>Username or Email:</Text>
                      <TextInput
                        style={styles.authTextInput}
                        value={authIdentifier}
                        onChangeText={setAuthIdentifier}
                        placeholder="e.g. aarav@vibeflow.ai or demo"
                        placeholderTextColor="#64748b"
                        autoCapitalize="none"
                      />
                      <Text style={styles.inputLabel}>Password:</Text>
                      <TextInput
                        style={styles.authTextInput}
                        value={authPassword}
                        onChangeText={setAuthPassword}
                        placeholder="••••••••"
                        placeholderTextColor="#64748b"
                        secureTextEntry
                      />
                      <TouchableOpacity 
                        style={[styles.authPrimaryBtn, isSyncing && { opacity: 0.6 }]}
                        disabled={isSyncing}
                        onPress={handleLogin}
                      >
                        {isSyncing ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text style={styles.authPrimaryBtnText}>Sign In & Load Playlists</Text>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity 
                        style={styles.demoLoginBtn}
                        disabled={isSyncing}
                        onPress={handleDemoLogin}
                      >
                        <Text style={styles.demoLoginBtnText}>⚡ 1-Click Demo Login</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {authTab === 'register' && (
                    <View style={styles.authForm}>
                      <Text style={styles.authFormDesc}>
                        Create an account to save playlists and sync across all devices.
                      </Text>
                      <Text style={styles.inputLabel}>Full Name:</Text>
                      <TextInput
                        style={styles.authTextInput}
                        value={authName}
                        onChangeText={setAuthName}
                        placeholder="e.g. Arjun Sharma"
                        placeholderTextColor="#64748b"
                      />
                      <Text style={styles.inputLabel}>Email Address:</Text>
                      <TextInput
                        style={styles.authTextInput}
                        value={authIdentifier}
                        onChangeText={setAuthIdentifier}
                        placeholder="e.g. arjun@example.com"
                        placeholderTextColor="#64748b"
                        autoCapitalize="none"
                      />
                      <Text style={styles.inputLabel}>Username (optional):</Text>
                      <TextInput
                        style={styles.authTextInput}
                        value={authUsername}
                        onChangeText={setAuthUsername}
                        placeholder="e.g. arjun_beats"
                        placeholderTextColor="#64748b"
                        autoCapitalize="none"
                      />
                      <Text style={styles.inputLabel}>Password:</Text>
                      <TextInput
                        style={styles.authTextInput}
                        value={authPassword}
                        onChangeText={setAuthPassword}
                        placeholder="Min 6 characters"
                        placeholderTextColor="#64748b"
                        secureTextEntry
                      />
                      <TouchableOpacity 
                        style={[styles.authPrimaryBtn, isSyncing && { opacity: 0.6 }]}
                        disabled={isSyncing}
                        onPress={handleRegister}
                      >
                        {isSyncing ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text style={styles.authPrimaryBtnText}>Create Account & Sync</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}

                  {authTab === 'syncCode' && (
                    <View style={styles.authForm}>
                      <View style={styles.syncCodeCard}>
                        <Text style={styles.syncCodeCardLabel}>THIS DEVICE SYNC CODE:</Text>
                        <Text style={styles.syncCodeDisplay}>{mySyncCode || 'VF-8492'}</Text>
                        <Text style={styles.syncCodeSub}>Enter this code on your web browser to link this device.</Text>
                      </View>

                      <Text style={styles.qualitySectionTitle}>Or Enter Code from Another Device:</Text>
                      <View style={styles.syncInputRow}>
                        <TextInput
                          style={styles.syncTextInput}
                          value={syncCodeInput}
                          onChangeText={(t: string) => setSyncCodeInput(t.toUpperCase())}
                          placeholder="e.g. VF-2849"
                          placeholderTextColor="#64748b"
                          autoCapitalize="characters"
                        />
                        <TouchableOpacity 
                          style={[styles.syncSubmitBtn, (!syncCodeInput.trim() || isSyncing) && { opacity: 0.6 }]}
                          disabled={!syncCodeInput.trim() || isSyncing}
                          onPress={handleLinkSyncCode}
                        >
                          {isSyncing ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <Text style={styles.syncSubmitBtnText}>Link</Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              )}

              {syncError && (
                <View style={styles.syncErrorBox}>
                  <Text style={styles.syncErrorText}>⚠️ {syncError}</Text>
                </View>
              )}

              {syncSuccess && (
                <View style={styles.syncSuccessBox}>
                  <Text style={styles.syncSuccessText}>✓ {syncSuccess}</Text>
                </View>
              )}

              {/* Backend URL config for LAN/Wi-Fi devices */}
              <View style={{ marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' }}>
                <Text style={styles.qualitySectionTitle}>🌐 Server API Endpoint (Cross-Device):</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                  <TextInput
                    style={[styles.syncUrlInput, { flex: 1, marginBottom: 0 }]}
                    value={apiBaseUrl}
                    onChangeText={(val) => {
                      setApiBaseUrl(val);
                      AsyncStorage.setItem(API_BASE_URL_KEY, val.trim()).catch(() => {});
                    }}
                    placeholder="http://192.168.1.x:4000/api"
                    placeholderTextColor="#64748b"
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    style={[styles.syncSmallBtn, { backgroundColor: '#4f46e5', borderColor: '#6366f1' }]}
                    onPress={async () => {
                      const trimmed = apiBaseUrl.trim();
                      try {
                        await AsyncStorage.setItem(API_BASE_URL_KEY, trimmed);
                        Alert.alert('Server Endpoint Saved', `Saved: ${trimmed}\nFetching playlists...`);
                        fetchPlaylists(trimmed);
                      } catch {}
                    }}
                  >
                    <Text style={[styles.syncSmallBtnText, { color: '#ffffff', fontWeight: 'bold' }]}>Save</Text>
                  </TouchableOpacity>
                </View>
                <View style={[styles.lanHelpersRow, { marginTop: 8 }]}>
                  <TouchableOpacity onPress={() => {
                    const detected = detectDefaultApiUrl();
                    setApiBaseUrl(detected);
                    AsyncStorage.setItem(API_BASE_URL_KEY, detected).catch(() => {});
                  }}>
                    <Text style={[styles.lanHelperChip, { color: '#38bdf8', borderColor: 'rgba(56,189,248,0.3)' }]}>⚡ Auto-Detect</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => {
                    setApiBaseUrl('http://localhost:4000/api');
                    AsyncStorage.setItem(API_BASE_URL_KEY, 'http://localhost:4000/api').catch(() => {});
                  }}>
                    <Text style={styles.lanHelperChip}>localhost</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => {
                    setApiBaseUrl('http://10.0.2.2:4000/api');
                    AsyncStorage.setItem(API_BASE_URL_KEY, 'http://10.0.2.2:4000/api').catch(() => {});
                  }}>
                    <Text style={styles.lanHelperChip}>Android Emulator (10.0.2.2)</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Download & Copyright Disclaimer Modal */}
      <Modal visible={isDownloadModalVisible} animationType="slide" transparent>
        <View style={styles.downloadModalBackdrop}>
          <View style={styles.downloadModalCard}>
            <View style={styles.downloadModalHeader}>
              <Text style={styles.downloadModalTitle}>Download for Offline Play</Text>
              <TouchableOpacity onPress={() => setIsDownloadModalVisible(false)}>
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>
            </View>

            {downloadTargetTrack && (
              <ScrollView style={{ maxHeight: 440 }}>
                {/* Track Info */}
                <View style={styles.downloadTrackInfo}>
                  <Image source={{ uri: downloadTargetTrack.thumbnail }} style={styles.downloadThumb} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.downloadTrackTitle} numberOfLines={1}>{downloadTargetTrack.title}</Text>
                    <Text style={styles.downloadTrackArtist}>{downloadTargetTrack.artist}</Text>
                    <Text style={styles.downloadMeta}>Duration: {formatTime(downloadTargetTrack.duration * 1000)}</Text>
                  </View>
                </View>

                {!downloadSuccess ? (
                  <>
                    {/* Quality Options */}
                    <Text style={styles.qualitySectionTitle}>Select MP3 Quality:</Text>
                    <View style={styles.qualityChipsContainer}>
                      {[
                        { q: '320', label: '320 kbps (Ultra HQ Master)' },
                        { q: '256', label: '256 kbps (High Quality)' },
                        { q: '128', label: '128 kbps (Standard Saver)' },
                        { q: '64', label: '64 kbps (Eco Data)' },
                      ].map(opt => (
                        <TouchableOpacity
                          key={opt.q}
                          onPress={() => setSelectedQuality(opt.q as any)}
                          style={[
                            styles.qualityChip,
                            selectedQuality === opt.q && styles.qualityChipSelected
                          ]}
                        >
                          <Text style={[
                            styles.qualityChipText,
                            selectedQuality === opt.q && styles.qualityChipTextSelected
                          ]}>
                            {opt.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* Clear Copyright Disclaimer Box */}
                    <View style={styles.disclaimerBox}>
                      <Text style={styles.disclaimerTitle}>⚠️ Copyright & Fair-Use Notice</Text>
                      <Text style={styles.disclaimerText}>
                        Audio recordings are protected by copyright. Downloads are strictly authorized for personal, non-commercial offline listening only. Commercial exploitation, broadcasting, or redistribution without rights-holder permission is strictly prohibited by law.
                      </Text>

                      <TouchableOpacity
                        onPress={() => setIsCopyrightAgreed(!isCopyrightAgreed)}
                        style={styles.checkboxRow}
                      >
                        <View style={[styles.checkboxBox, isCopyrightAgreed && styles.checkboxBoxChecked]}>
                          {isCopyrightAgreed && <Text style={styles.checkmark}>✓</Text>}
                        </View>
                        <Text style={styles.checkboxLabel}>
                          I acknowledge and confirm this download is solely for my personal, non-commercial offline listening.
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* Download Button */}
                    <TouchableOpacity
                      onPress={handleStartDownload}
                      disabled={!isCopyrightAgreed || isDownloading}
                      style={[
                        styles.startDownloadBtn,
                        (!isCopyrightAgreed || isDownloading) && styles.startDownloadBtnDisabled
                      ]}
                    >
                      {isDownloading ? (
                        <ActivityIndicator color="#ffffff" size="small" />
                      ) : (
                        <Text style={styles.startDownloadText}>Download MP3 ({selectedQuality} kbps)</Text>
                      )}
                    </TouchableOpacity>
                  </>
                ) : (
                  <View style={styles.successBox}>
                    <Text style={styles.successIcon}>✓</Text>
                    <Text style={styles.successTitle}>Track Cached Offline!</Text>
                    <Text style={styles.successDesc}>
                      "{downloadTargetTrack.title}" is saved in your Offline Audio Vault ({selectedQuality} kbps MP3). You can play it anywhere without an active internet connection.
                    </Text>
                    <TouchableOpacity
                      onPress={() => {
                        setIsDownloadModalVisible(false);
                        playTrack(downloadTargetTrack);
                      }}
                      style={styles.startDownloadBtn}
                    >
                      <Text style={styles.startDownloadText}>▶ Play Offline Now</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
      {/* Playlist Share QR Code Modal */}
      <Modal visible={!!qrSharePlaylist} animationType="fade" transparent>
        <View style={styles.downloadModalBackdrop}>
          <View style={[styles.syncModalCard, { alignItems: 'center', padding: 24 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', alignItems: 'center', marginBottom: 12 }}>
              <Text style={styles.downloadModalTitle}>Share Playlist via QR</Text>
              <TouchableOpacity onPress={() => setQrSharePlaylist(null)} style={{ padding: 6 }}>
                <Text style={{ color: '#94a3b8', fontSize: 18, fontWeight: 'bold' }}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={{ color: '#e2e8f0', fontSize: 15, fontWeight: 'bold', marginBottom: 4, textAlign: 'center' }}>
              {qrSharePlaylist?.title}
            </Text>
            <Text style={{ color: '#94a3b8', fontSize: 12, textAlign: 'center', marginBottom: 16 }}>
              Scan this QR code with any device camera or scanner to instantly open and save this playlist.
            </Text>
            {qrSharePlaylist && (
              <View style={{ backgroundColor: '#ffffff', padding: 14, borderRadius: 20, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10, elevation: 8 }}>
                <Image
                  source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${apiBaseUrl.replace('/api', '')}/?shareToken=${qrSharePlaylist.shareToken || qrSharePlaylist.id}`)}&margin=4` }}
                  style={{ width: 180, height: 180, borderRadius: 12 }}
                />
              </View>
            )}
            <Text style={{ color: '#38bdf8', fontSize: 11, marginTop: 14, textAlign: 'center' }}>
              Attributed Creator: {qrSharePlaylist?.creator?.name || 'You'}
            </Text>
            <TouchableOpacity 
              style={[styles.linkSyncBtn, { marginTop: 18, width: '100%' }]}
              onPress={() => setQrSharePlaylist(null)}
            >
              <Text style={styles.linkSyncBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Add Selected Tracks to Playlist Modal */}
      <Modal visible={isAddToPlaylistModalVisible} animationType="slide" transparent>
        <View style={styles.downloadModalBackdrop}>
          <View style={[styles.syncModalCard, { maxHeight: '80%' }]}>
            <View style={styles.downloadModalHeader}>
              <View>
                <Text style={styles.downloadModalTitle}>Add Tracks to Playlist</Text>
                <Text style={{ color: '#94a3b8', fontSize: 12, marginTop: 2 }}>
                  {selectedTrackIds.length} tracks selected
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsAddToPlaylistModalVisible(false)}
                style={{ padding: 6 }}
              >
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 220, marginVertical: 12 }}>
              <Text style={[styles.inputLabel, { marginBottom: 6 }]}>Choose Destination Playlist:</Text>
              {playlists.map(pl => (
                <TouchableOpacity
                  key={pl.id}
                  disabled={isAddingTracksBatch}
                  onPress={() => handleBatchAddToPlaylist(pl.id)}
                  style={[styles.playlistCard, { marginBottom: 8, padding: 10 }]}
                >
                  <Image source={{ uri: pl.coverArt || SAMPLE_TRACKS[0].thumbnail }} style={[styles.playlistThumb, { width: 40, height: 40 }]} />
                  <View style={styles.playlistMeta}>
                    <Text style={styles.playlistTitle} numberOfLines={1}>{pl.title}</Text>
                    <Text style={styles.playlistCount}>{pl.items?.length || pl.itemCount || 0} tracks</Text>
                  </View>
                  <Text style={{ color: '#818cf8', fontWeight: 'bold', fontSize: 13 }}>➕ Add</Text>
                </TouchableOpacity>
              ))}
              {playlists.length === 0 && (
                <Text style={{ color: '#94a3b8', fontSize: 12, textAlign: 'center', marginVertical: 8 }}>
                  No existing playlists found. Create one below!
                </Text>
              )}
            </ScrollView>

            {/* Quick create new playlist */}
            <View style={{ borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)', paddingTop: 12 }}>
              <Text style={styles.inputLabel}>Or Create New Playlist:</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                <TextInput
                  style={[styles.authTextInput, { flex: 1, marginBottom: 0 }]}
                  placeholder="New playlist name..."
                  placeholderTextColor="#64748b"
                  value={newMobilePlaylistTitle}
                  onChangeText={setNewMobilePlaylistTitle}
                />
                <TouchableOpacity
                  disabled={isAddingTracksBatch || !newMobilePlaylistTitle.trim()}
                  onPress={handleCreateAndAddBatchTracks}
                  style={[styles.authPrimaryBtn, { paddingHorizontal: 14, marginBottom: 0, opacity: !newMobilePlaylistTitle.trim() ? 0.5 : 1 }]}
                >
                  <Text style={styles.authPrimaryBtnText}>Create & Add</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* In-App Shared Playlist QR Code Scanner Modal */}
      <Modal visible={isScanQrModalVisible} animationType="slide" transparent>
        <View style={styles.downloadModalBackdrop}>
          <View style={[styles.syncModalCard, { maxHeight: '85%' }]}>
            <View style={styles.downloadModalHeader}>
              <View>
                <Text style={styles.downloadModalTitle}>Scan Shared QR Code</Text>
                <Text style={{ color: '#94a3b8', fontSize: 12, marginTop: 2 }}>
                  Add a shared playlist directly into your library
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsScanQrModalVisible(false)}
                style={{ padding: 6 }}
              >
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>
            </View>

            {scannedPlaylistSuccess ? (
              <View style={{ alignItems: 'center', paddingVertical: 14 }}>
                <Text style={{ fontSize: 44, marginBottom: 8 }}>🎉</Text>
                <Text style={{ color: '#10b981', fontSize: 13, fontWeight: 'bold' }}>Playlist Added to Library!</Text>
                <Text style={{ color: '#ffffff', fontSize: 18, fontWeight: 'bold', marginTop: 4, textAlign: 'center' }}>
                  {scannedPlaylistSuccess.title}
                </Text>
                <Text style={{ color: '#94a3b8', fontSize: 12, textAlign: 'center', marginTop: 2 }}>
                  {scannedPlaylistSuccess.items?.length || scannedPlaylistSuccess.itemCount || 0} tracks • By {scannedPlaylistSuccess.creator?.name || 'VibeFlow User'}
                </Text>

                <TouchableOpacity
                  style={[styles.authPrimaryBtn, { width: '100%', marginTop: 20 }]}
                  onPress={() => {
                    playPlaylist(scannedPlaylistSuccess);
                    setIsScanQrModalVisible(false);
                  }}
                >
                  <Text style={styles.authPrimaryBtnText}>▶ Play Playlist Now</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.syncSubmitBtn, { width: '100%', marginTop: 8 }]}
                  onPress={() => setIsScanQrModalVisible(false)}
                >
                  <Text style={styles.syncSubmitBtnText}>Done</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView style={{ marginTop: 10 }}>
                {/* Viewfinder Mockup Frame with Neon Target Corners */}
                <View style={{
                  height: 160,
                  backgroundColor: '#0a0d14',
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: 'rgba(56, 189, 248, 0.3)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 14,
                  position: 'relative'
                }}>
                  <View style={{
                    width: 110,
                    height: 110,
                    borderWidth: 2,
                    borderColor: '#38bdf8',
                    borderRadius: 12,
                    borderStyle: 'dashed',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Text style={{ fontSize: 28 }}>📷</Text>
                    <Text style={{ color: '#38bdf8', fontSize: 11, fontWeight: 'bold', marginTop: 4 }}>
                      Scan QR Code
                    </Text>
                  </View>
                  <Text style={{ color: '#94a3b8', fontSize: 10, marginTop: 8 }}>
                    Align QR code within the frame or paste link below
                  </Text>
                </View>

                {scanQrError && (
                  <View style={[styles.syncInfoBox, { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)', marginBottom: 12 }]}>
                    <Text style={{ color: '#fca5a5', fontSize: 12, textAlign: 'center' }}>⚠️ {scanQrError}</Text>
                  </View>
                )}

                {/* Input for QR Code Payload or Share Link */}
                <Text style={styles.inputLabel}>Enter or Paste QR Code / Share Link:</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 4, marginBottom: 14 }}>
                  <TextInput
                    style={[styles.authTextInput, { flex: 1, marginBottom: 0 }]}
                    placeholder="e.g. st-workout-energy or share link..."
                    placeholderTextColor="#64748b"
                    value={scannedQrInput}
                    onChangeText={setScannedQrInput}
                  />
                  <TouchableOpacity
                    disabled={isScanningQr || !scannedQrInput.trim()}
                    onPress={() => handleScanSharedPlaylist()}
                    style={[styles.authPrimaryBtn, { paddingHorizontal: 16, marginBottom: 0, opacity: (!scannedQrInput.trim() || isScanningQr) ? 0.5 : 1 }]}
                  >
                    <Text style={styles.authPrimaryBtnText}>
                      {isScanningQr ? 'Scanning...' : 'Add'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Quick 1-Click Available Shared Playlists */}
                <View style={{ borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)', paddingTop: 12, marginBottom: 10 }}>
                  <Text style={[styles.inputLabel, { marginBottom: 6 }]}>Or Test With Available Shared QR Codes:</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {[
                      { label: 'Morning Motivation', token: 'st-morning-motivation' },
                      { label: 'Instrumentals Flow', token: 'st-instrumentals' },
                      { label: 'Workout Energy', token: 'st-workout-energy' },
                      { label: 'Retro Favorites', token: 'st-retro-favorites' }
                    ].map(sample => (
                      <TouchableOpacity
                        key={sample.token}
                        disabled={isScanningQr}
                        onPress={() => handleScanSharedPlaylist(sample.token)}
                        style={{
                          backgroundColor: '#181d30',
                          paddingVertical: 6,
                          paddingHorizontal: 10,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: 'rgba(255,255,255,0.06)'
                        }}
                      >
                        <Text style={{ color: '#e2e8f0', fontSize: 11, fontWeight: '600' }}>{sample.label}</Text>
                        <Text style={{ color: '#64748b', fontSize: 9 }}>{sample.token}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
      {/* Create Standalone Playlist Modal */}
      <Modal visible={isCreatePlaylistModalVisible} animationType="slide" transparent>
        <View style={styles.downloadModalBackdrop}>
          <View style={[styles.syncModalCard, { padding: 20 }]}>
            <View style={styles.downloadModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 20 }}>📋</Text>
                <Text style={styles.downloadModalTitle}>Create New Playlist</Text>
              </View>
              <TouchableOpacity onPress={() => setIsCreatePlaylistModalVisible(false)}>
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={{ marginTop: 14 }}>
              <Text style={styles.inputLabel}>Playlist Title:</Text>
              <TextInput
                style={styles.authTextInput}
                value={newStandalonePlaylistTitle}
                onChangeText={setNewStandalonePlaylistTitle}
                placeholder="e.g. Chillout Beats, Gym Motivation..."
                placeholderTextColor="#64748b"
                autoFocus
              />

              <Text style={styles.inputLabel}>Description (optional):</Text>
              <TextInput
                style={[styles.authTextInput, { height: 70, textAlignVertical: 'top' }]}
                value={newStandalonePlaylistDesc}
                onChangeText={setNewStandalonePlaylistDesc}
                placeholder="Describe your vibe or collection..."
                placeholderTextColor="#64748b"
                multiline
              />

              <TouchableOpacity
                style={[
                  styles.authPrimaryBtn,
                  (!newStandalonePlaylistTitle.trim() || isCreatingStandalonePlaylist) && { opacity: 0.6 }
                ]}
                disabled={!newStandalonePlaylistTitle.trim() || isCreatingStandalonePlaylist}
                onPress={handleCreateStandalonePlaylist}
              >
                {isCreatingStandalonePlaylist ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.authPrimaryBtnText}>Create & Save to Server</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.demoLoginBtn, { marginTop: 4 }]}
                onPress={() => setIsCreatePlaylistModalVisible(false)}
              >
                <Text style={styles.demoLoginBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0f17',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e2436',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  syncHeaderBtn: {
    backgroundColor: 'rgba(124, 58, 237, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.4)',
  },
  syncHeaderBtnText: {
    color: '#c4b5fd',
    fontSize: 12,
    fontWeight: 'bold',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#7c3aed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 18,
    color: '#ffffff',
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  brandSubtitle: {
    fontSize: 11,
    color: '#a78bfa',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 110,
  },
  section: {
    gap: 14,
  },
  heroCard: {
    backgroundColor: '#181d30',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  aiTag: {
    color: '#a78bfa',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 6,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 6,
  },
  heroDesc: {
    fontSize: 12,
    color: '#94a3b8',
    lineHeight: 18,
    marginBottom: 16,
  },
  heroButton: {
    backgroundColor: '#7c3aed',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  heroButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 6,
  },
  moodScroll: {
    flexDirection: 'row',
    marginVertical: 4,
  },
  moodChip: {
    backgroundColor: '#1e2436',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  moodChipText: {
    color: '#e2e8f0',
    fontSize: 12,
  },
  trackCard: {
    flexDirection: 'row',
    backgroundColor: '#121624',
    padding: 10,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  trackThumb: {
    width: 52,
    height: 52,
    borderRadius: 10,
    marginRight: 12,
  },
  trackMeta: {
    flex: 1,
  },
  trackTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  trackArtist: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },
  tagRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  genreTag: {
    backgroundColor: '#20263f',
    color: '#cbd5e1',
    fontSize: 9,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  moodTag: {
    backgroundColor: 'rgba(124, 58, 237, 0.2)',
    color: '#c4b5fd',
    fontSize: 9,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  searchInput: {
    backgroundColor: '#181d30',
    color: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    fontSize: 13,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  genreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  genreCard: {
    backgroundColor: '#181d30',
    padding: 16,
    borderRadius: 14,
    width: '48%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  genreCardText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  libraryBox: {
    backgroundColor: '#181d30',
    padding: 16,
    borderRadius: 16,
  },
  libraryBoxTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  libraryBoxDesc: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 18,
  },
  miniPlayer: {
    position: 'absolute',
    bottom: 58,
    left: 10,
    right: 10,
    backgroundColor: '#181d30',
    borderRadius: 16,
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  miniThumb: {
    width: 42,
    height: 42,
    borderRadius: 8,
    marginRight: 10,
  },
  miniMeta: {
    flex: 1,
  },
  miniTitle: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  miniArtist: {
    color: '#94a3b8',
    fontSize: 10,
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#7c3aed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButtonText: {
    color: '#ffffff',
    fontSize: 14,
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0d0f17',
    borderTopWidth: 1,
    borderTopColor: '#1e2436',
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
  },
  navItem: {
    alignItems: 'center',
  },
  navIcon: {
    fontSize: 16,
  },
  navText: {
    color: '#64748b',
    fontSize: 10,
    marginTop: 2,
  },
  navTextActive: {
    color: '#a78bfa',
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#0d0f17',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTag: {
    color: '#a78bfa',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  closeText: {
    color: '#ffffff',
    fontSize: 18,
    padding: 6,
  },
  modalScroll: {
    flex: 1,
    width: '100%',
  },
  modalScrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  modalBody: {
    alignItems: 'center',
    width: '100%',
  },
  modalArtwork: {
    width: 250,
    height: 250,
    borderRadius: 20,
    marginBottom: 20,
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modalArtist: {
    color: '#94a3b8',
    fontSize: 14,
    marginTop: 4,
  },
  modalMoodBadge: {
    color: '#a78bfa',
    fontSize: 12,
    marginTop: 8,
    backgroundColor: 'rgba(124,58,237,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '80%',
    marginTop: 24,
  },
  timeText: {
    color: '#64748b',
    fontSize: 11,
    fontFamily: 'monospace',
  },
  modalControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 28,
    marginTop: 28,
  },
  modalSecondaryButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1e2436',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  modalSecondaryButtonText: {
    color: '#ffffff',
    fontSize: 18,
  },
  modalPlayButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#7c3aed',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  modalPlayText: {
    color: '#ffffff',
    fontSize: 26,
  },
  modalDownloadAction: {
    marginTop: 22,
    backgroundColor: 'rgba(124,58,237,0.15)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.3)',
  },
  modalDownloadActionText: {
    color: '#c4b5fd',
    fontSize: 12,
    fontWeight: 'bold',
  },
  cardDownloadBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#181d30',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  cardDownloadIcon: {
    fontSize: 14,
  },
  qualityBadge: {
    backgroundColor: '#7c3aed',
    color: '#ffffff',
    fontSize: 9,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: 'bold',
  },
  offlineBadge: {
    backgroundColor: '#065f46',
    color: '#6ee7b7',
    fontSize: 9,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: 'bold',
  },
  offlinePlayBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#7c3aed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  offlinePlayText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  downloadModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  downloadModalCard: {
    backgroundColor: '#121624',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  downloadModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  downloadModalTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  downloadTrackInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#181d30',
    padding: 12,
    borderRadius: 14,
    gap: 12,
    marginBottom: 14,
  },
  downloadThumb: {
    width: 48,
    height: 48,
    borderRadius: 10,
  },
  downloadTrackTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  downloadTrackArtist: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },
  downloadMeta: {
    color: '#64748b',
    fontSize: 10,
    marginTop: 2,
    fontFamily: 'monospace',
  },
  qualitySectionTitle: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  qualityChipsContainer: {
    gap: 6,
    marginBottom: 14,
  },
  qualityChip: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#181d30',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  qualityChipSelected: {
    backgroundColor: 'rgba(124,58,237,0.2)',
    borderColor: '#7c3aed',
  },
  qualityChipText: {
    color: '#94a3b8',
    fontSize: 12,
  },
  qualityChipTextSelected: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  disclaimerBox: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    gap: 8,
  },
  disclaimerTitle: {
    color: '#fbbf24',
    fontSize: 11,
    fontWeight: 'bold',
  },
  disclaimerText: {
    color: '#cbd5e1',
    fontSize: 11,
    lineHeight: 16,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(245, 158, 11, 0.2)',
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#fbbf24',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxBoxChecked: {
    backgroundColor: '#7c3aed',
    borderColor: '#7c3aed',
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    flex: 1,
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
  startDownloadBtn: {
    backgroundColor: '#7c3aed',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  startDownloadBtnDisabled: {
    backgroundColor: '#262d40',
    opacity: 0.6,
  },
  startDownloadText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  successBox: {
    padding: 16,
    alignItems: 'center',
    gap: 10,
  },
  successIcon: {
    fontSize: 36,
    color: '#10b981',
  },
  successTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  successDesc: {
    color: '#94a3b8',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  playlistsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  sectionSubtitle: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },
  syncSmallBtn: {
    backgroundColor: '#181d30',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  syncSmallBtnText: {
    color: '#a78bfa',
    fontSize: 11,
    fontWeight: 'bold',
  },
  batchActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#181d30',
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.35)',
    marginBottom: 8,
  },
  batchSelectAllBtn: {
    backgroundColor: '#232b45',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  batchSelectAllText: {
    color: '#e2e8f0',
    fontSize: 11,
    fontWeight: '600',
  },
  batchCountText: {
    color: '#a5b4fc',
    fontSize: 11,
    fontWeight: 'bold',
  },
  batchDeleteBtn: {
    backgroundColor: '#e11d48',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  batchDeleteText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  playlistCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  playlistCheckboxChecked: {
    backgroundColor: '#6366f1',
    borderColor: '#818cf8',
  },
  playlistCheckboxCheck: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  playlistCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#181d30',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    gap: 12,
  },
  playlistThumb: {
    width: 54,
    height: 54,
    borderRadius: 12,
  },
  playlistMeta: {
    flex: 1,
    gap: 2,
  },
  playlistTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  playlistDesc: {
    color: '#94a3b8',
    fontSize: 11,
  },
  playlistCount: {
    color: '#64748b',
    fontSize: 10,
    marginTop: 2,
  },
  playlistPlayBtn: {
    backgroundColor: '#7c3aed',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  playlistPlayText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  emptyPlaylistCard: {
    padding: 30,
    backgroundColor: '#181d30',
    borderRadius: 20,
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  emptyIcon: {
    fontSize: 32,
  },
  emptyTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyDesc: {
    color: '#94a3b8',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  linkSyncBtn: {
    marginTop: 8,
    backgroundColor: '#7c3aed',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  linkSyncBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  syncModalCard: {
    backgroundColor: '#121624',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  syncInfoBox: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    gap: 4,
  },
  syncInfoTitle: {
    color: '#34d399',
    fontSize: 12,
    fontWeight: 'bold',
  },
  syncInfoDesc: {
    color: '#cbd5e1',
    fontSize: 11,
    lineHeight: 16,
  },
  syncCodeCard: {
    backgroundColor: '#181d30',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  syncCodeCardLabel: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 6,
  },
  syncCodeDisplay: {
    color: '#c4b5fd',
    fontSize: 22,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    letterSpacing: 3,
  },
  syncCodeSub: {
    color: '#64748b',
    fontSize: 10,
    marginTop: 4,
  },
  syncInputRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  syncTextInput: {
    flex: 1,
    backgroundColor: '#181d30',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#ffffff',
    fontSize: 13,
    fontFamily: 'monospace',
  },
  syncSubmitBtn: {
    backgroundColor: '#7c3aed',
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncSubmitBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  syncErrorBox: {
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  syncErrorText: {
    color: '#fb7185',
    fontSize: 11,
  },
  syncSuccessBox: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  syncSuccessText: {
    color: '#34d399',
    fontSize: 11,
    fontWeight: 'bold',
  },
  syncUrlInput: {
    backgroundColor: '#181d30',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#cbd5e1',
    fontSize: 11,
    fontFamily: 'monospace',
    marginBottom: 8,
  },
  lanHelpersRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  lanHelperChip: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    color: '#94a3b8',
    fontSize: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  profileSection: {
    gap: 12,
    marginBottom: 16,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#181d30',
    padding: 14,
    borderRadius: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  profileAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#7c3aed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  profileName: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  profileEmail: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 1,
  },
  profileSyncBadge: {
    color: '#34d399',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
  },
  authTabsRow: {
    flexDirection: 'row',
    backgroundColor: '#181d30',
    borderRadius: 12,
    padding: 3,
    marginBottom: 14,
  },
  authTabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  authTabBtnActive: {
    backgroundColor: '#7c3aed',
  },
  authTabBtnText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: 'bold',
  },
  authTabBtnTextActive: {
    color: '#ffffff',
  },
  authForm: {
    gap: 10,
    marginBottom: 14,
  },
  authFormDesc: {
    color: '#94a3b8',
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 4,
  },
  inputLabel: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: -4,
  },
  authTextInput: {
    backgroundColor: '#181d30',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#ffffff',
    fontSize: 13,
  },
  authPrimaryBtn: {
    backgroundColor: '#7c3aed',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  authPrimaryBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  demoLoginBtn: {
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.3)',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  demoLoginBtnText: {
    color: '#c4b5fd',
    fontSize: 12,
    fontWeight: 'bold',
  },
});


