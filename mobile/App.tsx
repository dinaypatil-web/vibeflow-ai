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

      const idx = startIndex !== undefined ? startIndex : activeQueue.findIndex(t => t.id === track.id);
      const safeIdx = idx >= 0 ? idx : 0;
      queueIndexRef.current = safeIdx;
      setQueueIndex(safeIdx);

      setCurrentTrack(track);
      if (!track.streamUrl) return;

      const { sound } = await Audio.Sound.createAsync(
        { uri: track.streamUrl },
        { shouldPlay: true },
        (status) => {
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

        {activeTab === 'library' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Offline Audio & Device Library</Text>
            <View style={styles.libraryBox}>
              <Text style={styles.libraryBoxTitle}>📥 Local Audio Storage</Text>
              <Text style={styles.libraryBoxDesc}>
                MP3, WAV, and FLAC files saved on device have full offline background playback.
              </Text>
            </View>
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

      {/* Fullscreen Now Playing Modal */}
      <Modal visible={isModalOpen} animationType="slide" transparent={false}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTag}>NOW PLAYING</Text>
            <TouchableOpacity onPress={() => setIsModalOpen(false)}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {currentTrack && (
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
            </View>
          )}
        </SafeAreaView>
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
  modalBody: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
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
});

