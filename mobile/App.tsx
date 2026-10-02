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
  ActivityIndicator
} from 'react-native';
import { Audio } from 'expo-av';

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

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'explore' | 'playlists' | 'library' | 'ai'>('home');
  const [currentTrack, setCurrentTrack] = useState<MediaItem | null>(SAMPLE_TRACKS[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [positionMillis, setPositionMillis] = useState(0);
  const [durationMillis, setDurationMillis] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [queue, setQueue] = useState<MediaItem[]>(SAMPLE_TRACKS);
  const [queueIndex, setQueueIndex] = useState(0);
  const queueRef = useRef<MediaItem[]>(SAMPLE_TRACKS);
  const queueIndexRef = useRef(0);
  const repeatModeRef = useRef<'all' | 'one' | 'off'>('all');
  const isShuffleRef = useRef(false);

  // Playlists & Cloud Sync across devices
  const [playlists, setPlaylists] = useState<Playlist[]>(INITIAL_MOBILE_PLAYLISTS);
  const [apiBaseUrl, setApiBaseUrl] = useState<string>('http://localhost:4000/api');
  const [isSyncModalVisible, setIsSyncModalVisible] = useState(false);
  const [syncCodeInput, setSyncCodeInput] = useState('');
  const [mySyncCode, setMySyncCode] = useState<string>('');
  const [syncUser, setSyncUser] = useState<{ id: string; name: string; email?: string; syncCode?: string } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncSuccess, setSyncSuccess] = useState<string | null>(null);

  const fetchPlaylists = async (baseUrl = apiBaseUrl, uid = syncUser?.id || 'demo-user-id') => {
    try {
      const res = await fetch(`${baseUrl}/playlists?userId=${encodeURIComponent(uid)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.playlists && data.playlists.length > 0) {
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
        }
      }
    } catch (err) {
      console.warn('Network fetch playlists error:', err);
    }
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
        } else {
          fetchPlaylists(apiBaseUrl, data.user.id);
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
      const sizeMB = (downloadTargetTrack.duration / 60) * rate;
      const newOfflineItem: OfflineTrackItem = {
        id: downloadTargetTrack.id,
        track: {
          ...downloadTargetTrack,
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

  // Configure Expo AV for Background Audio Playback like VLC
  useEffect(() => {
    async function initAudio() {
      try {
        await Audio.setAudioModeAsync({
          staysActiveInBackground: true,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false
        });
      } catch (err) {
        console.warn('Failed to set audio mode for background playback', err);
      }
    }
    initAudio();

    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  const playTrack = async (track: MediaItem, newQueue?: MediaItem[], startIndex?: number) => {
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }

      const activeQueue = newQueue || queueRef.current;
      queueRef.current = activeQueue;
      setQueue(activeQueue);

      const idx = startIndex !== undefined ? startIndex : activeQueue.findIndex((t: MediaItem) => t.id === track.id);
      const safeIdx = idx >= 0 ? idx : 0;
      queueIndexRef.current = safeIdx;
      setQueueIndex(safeIdx);

      setCurrentTrack(track);
      if (!track.streamUrl) return;

      const { sound } = await Audio.Sound.createAsync(
        { uri: track.streamUrl },
        { shouldPlay: true },
        (status: any) => {
          if (status.isLoaded) {
            setPositionMillis(status.positionMillis);
            setDurationMillis(status.durationMillis || 0);
            setIsPlaying(status.isPlaying);
            if (status.didJustFinish) {
              // Seamless continuous background playback of next track
              playNextTrack();
            }
          }
        }
      );

      soundRef.current = sound;
      setIsPlaying(true);
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
    } else {
      await soundRef.current.playAsync();
      setIsPlaying(true);
    }
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
            {syncUser ? `☁️ ${syncUser.name.split(' ')[0]}` : '☁️ Sync'}
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

            {/* Recommended Tracks */}
            <Text style={styles.sectionTitle}>Recommended for You</Text>
            {SAMPLE_TRACKS.map(track => (
              <TouchableOpacity 
                key={track.id} 
                style={styles.trackCard}
                onPress={() => playTrack(track)}
              >
                <Image source={{ uri: track.thumbnail }} style={styles.trackThumb} />
                <View style={styles.trackMeta}>
                  <Text style={styles.trackTitle} numberOfLines={1}>{track.title}</Text>
                  <Text style={styles.trackArtist}>{track.artist}</Text>
                  <View style={styles.tagRow}>
                    <Text style={styles.genreTag}>{track.genre}</Text>
                    <Text style={styles.moodTag}>{track.mood}</Text>
                  </View>
                </View>
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
              </TouchableOpacity>
            ))}
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
                style={styles.syncSmallBtn} 
                onPress={() => {
                  fetchMySyncCode();
                  setIsSyncModalVisible(true);
                }}
              >
                <Text style={styles.syncSmallBtnText}>🔄 Pair Code</Text>
              </TouchableOpacity>
            </View>

            {playlists.map((pl: Playlist) => (
              <View key={pl.id} style={styles.playlistCard}>
                <Image source={{ uri: pl.coverArt || SAMPLE_TRACKS[0].thumbnail }} style={styles.playlistThumb} />
                <View style={styles.playlistMeta}>
                  <Text style={styles.playlistTitle} numberOfLines={1}>{pl.title}</Text>
                  <Text style={styles.playlistDesc} numberOfLines={1}>{pl.description || 'Personal music mix'}</Text>
                  <Text style={styles.playlistCount}>
                    {pl.items?.length || pl.itemCount || 0} tracks • By {pl.creator?.name || 'You'}
                  </Text>
                </View>
                <TouchableOpacity 
                  style={styles.playlistPlayBtn}
                  onPress={() => playPlaylist(pl)}
                >
                  <Text style={styles.playlistPlayText}>▶ Play All</Text>
                </TouchableOpacity>
              </View>
            ))}

            {playlists.length === 0 && (
              <View style={styles.emptyPlaylistCard}>
                <Text style={styles.emptyIcon}>☁️</Text>
                <Text style={styles.emptyTitle}>No Synced Playlists</Text>
                <Text style={styles.emptyDesc}>
                  Enter the 6-character sync code from your web browser or another device to load all your playlists instantly!
                </Text>
                <TouchableOpacity 
                  style={styles.linkSyncBtn}
                  onPress={() => {
                    fetchMySyncCode();
                    setIsSyncModalVisible(true);
                  }}
                >
                  <Text style={styles.linkSyncBtnText}>Pair with Device Sync Code</Text>
                </TouchableOpacity>
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
          onPress={() => setIsModalOpen(true)}
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
            onPress={() => setActiveTab(item.id as any)}
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

      {/* Cross-Device Cloud Sync Modal */}
      <Modal visible={isSyncModalVisible} animationType="slide" transparent>
        <View style={styles.downloadModalBackdrop}>
          <View style={styles.syncModalCard}>
            <View style={styles.downloadModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 20 }}>☁️</Text>
                <Text style={styles.downloadModalTitle}>Cross-Device Playlist Sync</Text>
              </View>
              <TouchableOpacity onPress={() => setIsSyncModalVisible(false)}>
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 460 }}>
              {/* Device Sync Info Box */}
              <View style={styles.syncInfoBox}>
                <Text style={styles.syncInfoTitle}>🔄 Anywhere Access Active</Text>
                <Text style={styles.syncInfoDesc}>
                  Playlists created on your computer or phone are saved centrally. Pair your devices to seamlessly access your custom playlists anywhere.
                </Text>
              </View>

              {/* Current Device Code */}
              <View style={styles.syncCodeCard}>
                <Text style={styles.syncCodeCardLabel}>THIS DEVICE SYNC CODE:</Text>
                <Text style={styles.syncCodeDisplay}>{mySyncCode || 'VF-8492'}</Text>
                <Text style={styles.syncCodeSub}>Enter this code on your desktop browser to link it.</Text>
              </View>

              {/* Enter Sync Code from other device */}
              <Text style={styles.qualitySectionTitle}>Pair with Another Device Code:</Text>
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
                    <Text style={styles.syncSubmitBtnText}>Link Device</Text>
                  )}
                </TouchableOpacity>
              </View>

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
              <Text style={[styles.qualitySectionTitle, { marginTop: 14 }]}>Server API Endpoint:</Text>
              <TextInput
                style={styles.syncUrlInput}
                value={apiBaseUrl}
                onChangeText={setApiBaseUrl}
                placeholder="http://localhost:4000/api"
                placeholderTextColor="#64748b"
                autoCapitalize="none"
              />
              <View style={styles.lanHelpersRow}>
                <TouchableOpacity onPress={() => setApiBaseUrl('http://localhost:4000/api')}>
                  <Text style={styles.lanHelperChip}>localhost</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setApiBaseUrl('http://10.0.2.2:4000/api')}>
                  <Text style={styles.lanHelperChip}>Android Emulator (10.0.2.2)</Text>
                </TouchableOpacity>
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
});


