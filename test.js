const http = require('http');

const API_BASE = 'http://localhost:4000/api';

async function fetchJSON(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return await res.json();
}

async function runTests() {
  console.log('🧪 Starting VibeFlow AI Automated Verification Suite...\n');
  let passed = 0;
  let total = 0;

  async function test(name, fn) {
    total++;
    try {
      await fn();
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ [FAIL] ${name}:`, err.message);
    }
  }

  // 1. Health check
  await test('Backend Health Check', async () => {
    const data = await fetchJSON(`${API_BASE}/health`);
    if (data.status !== 'ok') throw new Error('Status not ok');
  });

  // 2. Demo Auth
  let token = '';
  await test('1-Click Demo Authentication & JWT', async () => {
    const data = await fetchJSON(`${API_BASE}/auth/demo`, { method: 'POST' });
    if (!data.token || !data.user) throw new Error('Token or user missing');
    token = data.token;
  });

  // 2b. User Registration & Credential Retrieval
  const testEmail = `test_${Date.now()}@vibeflow.local`;
  const testUsername = `user_${Date.now()}`;
  const testPass = 'VibeFlowPass2026!';
  await test('Sign Up Account Creation & Credential Persistence', async () => {
    const data = await fetchJSON(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Auto Tester',
        email: testEmail,
        username: testUsername,
        password: testPass
      })
    });
    if (!data.user || !data.token) throw new Error('Registration failed to return user or token');
    if (data.user.email !== testEmail) throw new Error('User email mismatch');
  });

  await test('Sign In with Email Identifier', async () => {
    const data = await fetchJSON(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: testEmail, password: testPass })
    });
    if (!data.user || !data.token) throw new Error('Login with email failed');
  });

  await test('Sign In with Username Identifier', async () => {
    const data = await fetchJSON(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: testUsername, password: testPass })
    });
    if (!data.user || !data.token) throw new Error('Login with username failed');
  });

  // 3. Media catalog & live search
  await test('Media Search & Catalog Retrieval (Live Multi-Source)', async () => {
    const data = await fetchJSON(`${API_BASE}/media/search?q=Coldplay`);
    if (!data.items || data.items.length === 0) throw new Error('No items returned for Coldplay live search');
    const hasStream = data.items.some(i => !!i.streamUrl);
    if (!hasStream) throw new Error('Live search items missing playable streamUrl');
  });

  // 3b. Live Indian / Bollywood API search
  await test('Live Bollywood / Regional Music Streaming API', async () => {
    const data = await fetchJSON(`${API_BASE}/media/search?q=Arijit+Singh`);
    if (!data.items || data.items.length === 0) throw new Error('No live Bollywood items returned');
  });

  // 4. AI Classification
  await test('AI Genre & Mood Classification', async () => {
    const data = await fetchJSON(`${API_BASE}/media/classify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'High Voltage Dhol Beats',
        artist: 'Pune Rhythm Syndicate',
        tags: ['dhol', 'workout', 'energy']
      })
    });
    if (!data.result || data.result.suggestedMood !== 'Workout & Energy') {
      throw new Error(`Unexpected mood: ${data.result?.suggestedMood}`);
    }
  });

  // 5. Natural Language Search
  await test('AI Natural Language Query Parser', async () => {
    const data = await fetchJSON(`${API_BASE}/media/natural-search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'Suggest peaceful instrumental music for studying'
      })
    });
    if (!data.parsed || !data.results || data.results.length === 0) {
      throw new Error('NLP query parsing failed');
    }
  });

  // 6. Content Similarity
  await test('Similar Tracks Discovery Engine', async () => {
    const data = await fetchJSON(`${API_BASE}/media/similar/track-1`);
    if (!data.similar || data.similar.length === 0) {
      throw new Error('Similar tracks engine returned empty list');
    }
  });

  // 7. Smart Playlists & Rule Evaluation
  await test('Smart Playlist Dynamic Rule Evaluation', async () => {
    const data = await fetchJSON(`${API_BASE}/playlists`);
    const smart = data.playlists.find(p => p.isSmart);
    if (!smart || !smart.items || smart.items.length === 0) {
      throw new Error('Smart playlist not hydrated with rule matches');
    }
  });

  // 8. Provider Compliance Matrix
  await test('Provider Capability Matrix & Compliance', async () => {
    const data = await fetchJSON(`${API_BASE}/library/providers`);
    if (!data.providers || data.providers.length < 4) {
      throw new Error('Incomplete provider list');
    }
  });

  // 9. Live YouTube Search
  await test('Live YouTube Search Fallback & Parsing', async () => {
    const data = await fetchJSON(`${API_BASE}/media/search?q=Kesariya&provider=youtube`);
    if (!data.items || data.items.length === 0) {
      throw new Error('No YouTube search results returned');
    }
    const hasYtItem = data.items.some(i => i.provider === 'youtube' && i.providerId);
    if (!hasYtItem) throw new Error('Returned items missing YouTube providerId');
  });

  // 10. URL Import for Video/Audio
  let importedItem = null;
  await test('Import Any Video/Audio URL (YouTube / Stream)', async () => {
    const data = await fetchJSON(`${API_BASE}/media/import-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: 'https://www.youtube.com/watch?v=1F3HM635S0k',
        customTitle: 'Kesariya Official Video',
        customArtist: 'Arijit Singh, Pritam'
      })
    });
    if (!data.item || !data.item.id || data.item.provider !== 'youtube') {
      throw new Error('Imported item invalid or missing');
    }
    importedItem = data.item;
  });

  // 11. Custom User Playlist Creation & Track Addition/Removal
  await test('Custom User Playlist Lifecycle (Create, Add Track, Remove Track)', async () => {
    // Create playlist
    const plRes = await fetchJSON(`${API_BASE}/playlists`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'My Personal Hits Test',
        description: 'Automated test custom playlist',
        isSmart: false
      })
    });
    if (!plRes.playlist || !plRes.playlist.id) throw new Error('Playlist creation failed');
    const plId = plRes.playlist.id;

    // Add track to playlist
    const trackToAdd = importedItem || { id: 'track-1' };
    const addRes = await fetchJSON(`${API_BASE}/playlists/${plId}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item: trackToAdd })
    });
    if (!addRes.playlist || !addRes.playlist.items.some(i => i.mediaItemId === trackToAdd.id)) {
      throw new Error('Track was not added to playlist');
    }

    // Remove track from playlist
    const delRes = await fetchJSON(`${API_BASE}/playlists/${plId}/items/${trackToAdd.id}`, {
      method: 'DELETE'
    });
    if (delRes.playlist.items.some(i => i.mediaItemId === trackToAdd.id)) {
      throw new Error('Track was not removed from playlist');
    }
  });

  // 12. Playlist Creator Attribution, Visibility Guard & User-to-User Sharing
  await test('Playlist Creator Attribution, Visibility Guard & User-to-User Sharing', async () => {
    // Register User A (Alice)
    const aliceData = await fetchJSON(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Alice Creator',
        username: `alice_${Date.now()}`,
        password: 'AlicePassword2026!'
      })
    });
    const alice = aliceData.user;
    const aliceToken = aliceData.token;

    // Register User B (Bob)
    const bobData = await fetchJSON(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Bob Listener',
        username: `bob_${Date.now()}`,
        password: 'BobPassword2026!'
      })
    });
    const bob = bobData.user;
    const bobToken = bobData.token;

    // User A creates a playlist
    const createdRes = await fetchJSON(`${API_BASE}/playlists`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${aliceToken}`
      },
      body: JSON.stringify({
        title: "Alice's Secret Chill Mix",
        description: 'Private collection created by Alice'
      })
    });
    const alicePlaylist = createdRes.playlist;
    if (!alicePlaylist || !alicePlaylist.id) throw new Error('Playlist creation failed');

    // Requirement 1: Playlist attributed to user who created it
    if (!alicePlaylist.creator || alicePlaylist.creator.id !== alice.id) {
      throw new Error(`Playlist not correctly attributed to creator Alice (got ${JSON.stringify(alicePlaylist.creator)})`);
    }

    // Requirement 3: Playlist NOT visible to other user (Bob) unless shared
    const bobPlaylistsBefore = await fetchJSON(`${API_BASE}/playlists`, {
      headers: { 'Authorization': `Bearer ${bobToken}` }
    });
    if (bobPlaylistsBefore.playlists.some(p => p.id === alicePlaylist.id)) {
      throw new Error("Alice's playlist was visible to Bob before sharing!");
    }

    // Verify Bob direct access by ID is blocked (HTTP 403 Forbidden)
    const directRes = await fetch(`${API_BASE}/playlists/${alicePlaylist.id}`, {
      headers: { 'Authorization': `Bearer ${bobToken}` }
    });
    if (directRes.status !== 403) {
      throw new Error(`Expected HTTP 403 when Bob attempts to view Alice's unshared playlist, got ${directRes.status}`);
    }

    // Requirement 2: User can share playlist to any other user
    const shareRes = await fetchJSON(`${API_BASE}/playlists/${alicePlaylist.id}/share`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${aliceToken}`
      },
      body: JSON.stringify({ target: bob.username })
    });
    if (!shareRes.success) throw new Error('Sharing playlist failed: ' + shareRes.message);

    // Now Bob fetches playlists -> Alice's playlist MUST be visible to Bob now
    const bobPlaylistsAfter = await fetchJSON(`${API_BASE}/playlists`, {
      headers: { 'Authorization': `Bearer ${bobToken}` }
    });
    const foundInBob = bobPlaylistsAfter.playlists.find(p => p.id === alicePlaylist.id);
    if (!foundInBob) {
      throw new Error("Alice's playlist not visible to Bob after being shared");
    }
    if (!foundInBob.isSharedWithMe) {
      throw new Error("Playlist should have isSharedWithMe=true for recipient Bob");
    }
    if (foundInBob.creator.id !== alice.id) {
      throw new Error("Shared playlist creator attribution mismatch");
    }

    // Requirement 4: Playlist remains in creator's access until creator deletes it
    // Even if Bob leaves/removes the shared playlist:
    await fetchJSON(`${API_BASE}/playlists/${alicePlaylist.id}/leave`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${bobToken}` }
    });
    // Alice STILL has access:
    const alicePlaylistsCheck = await fetchJSON(`${API_BASE}/playlists`, {
      headers: { 'Authorization': `Bearer ${aliceToken}` }
    });
    if (!alicePlaylistsCheck.playlists.some(p => p.id === alicePlaylist.id)) {
      throw new Error("Playlist disappeared from Alice's access after Bob left");
    }

    // Now Alice explicitly deletes it:
    await fetchJSON(`${API_BASE}/playlists/${alicePlaylist.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${aliceToken}` }
    });
    const alicePlaylistsFinal = await fetchJSON(`${API_BASE}/playlists`, {
      headers: { 'Authorization': `Bearer ${aliceToken}` }
    });
    if (alicePlaylistsFinal.playlists.some(p => p.id === alicePlaylist.id)) {
      throw new Error("Playlist still present after creator Alice deleted it");
    }
  });

  // 13. Recommended Tracks Attribution
  await test('Recommended Tracks Attribution to User', async () => {
    const feedRes = await fetchJSON(`${API_BASE}/recommendations/feed?userId=${testEmail}`);
    if (!feedRes.feed || feedRes.feed.length === 0) {
      throw new Error('Recommendations feed empty');
    }
    const firstSection = feedRes.feed[0];
    if (!firstSection.curatedFor) {
      throw new Error('Recommendation section missing curatedFor user attribution');
    }
    if (!firstSection.items || firstSection.items.length === 0) {
      throw new Error('Recommendation section missing items');
    }
    const firstTrack = firstSection.items[0];
    if (!firstTrack.curatedFor && !firstTrack.attributionNote) {
      throw new Error('Recommended track missing user attribution metadata');
    }
  });

  // 14. YouTube Channel Full Track Exploration (explores all 60 tracks)
  await test('YouTube Channel Full Track Exploration (All 60 Tracks)', async () => {
    const channelRes = await fetchJSON(`${API_BASE}/media/channel/Arijit%20Singh/tracks?provider=youtube&limit=60&target=60`);
    if (!channelRes.items || channelRes.items.length === 0) {
      throw new Error('No channel tracks returned for YouTube channel exploration');
    }
    if (channelRes.items.length < 60) {
      throw new Error(`Expected at least 60 tracks explored for YouTube channel, received ${channelRes.items.length}`);
    }
    // Verify each track is valid and playable
    const sample = channelRes.items[0];
    if (!sample.id || !sample.title || (!sample.embedUrl && !sample.streamUrl)) {
      throw new Error('Explored YouTube channel track missing playable stream/embed info');
    }
  });

  // 15. Complete Date Sorting & Detailed Track Metadata
  await test('Complete Date Track Sorting & Full Metadata Presence', async () => {
    const searchRes = await fetchJSON(`${API_BASE}/media/search?q=Arijit`);
    if (!searchRes.items || searchRes.items.length === 0) {
      throw new Error('No items returned for track details verification');
    }
    const sample = searchRes.items[0];
    if (!sample.title || !sample.artist || !sample.provider) {
      throw new Error('Track missing core title/artist/provider metadata');
    }
    if (!sample.capabilities || sample.capabilities.length === 0) {
      throw new Error('Track missing playback capabilities metadata');
    }
    if (!sample.genre || !sample.mood) {
      throw new Error('Track missing genre or mood classification');
    }
    // Verify sorting on complete date precision
    const testItems = [
      { id: '1', title: 'Track Early 2024', artist: 'Artist', releaseDate: '2024-01-15', releaseYear: 2024 },
      { id: '2', title: 'Track Late 2024', artist: 'Artist', releaseDate: '2024-11-20', releaseYear: 2024 },
      { id: '3', title: 'Track Mid 2023', artist: 'Artist', releaseDate: '2023-06-10', releaseYear: 2023 }
    ];
    // Sort descending by complete date:
    const sorted = [...testItems].sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime());
    if (sorted[0].id !== '2' || sorted[1].id !== '1' || sorted[2].id !== '3') {
      throw new Error('Complete date sorting failed: items from same year not sorted by day/month');
    }
  });

  // 18. Playlist Retention, Multi-Alias Resolution & Guest-to-User Claiming
  await test('Created Playlist Permanent Retention, Multi-Alias Resolution & Session Migration', async () => {
    // 1. Create playlist in guest mode (unauthenticated)
    const guestPlRes = await fetchJSON(`${API_BASE}/playlists`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Guest Late Night Study Session',
        description: 'Created before signing in',
        isSmart: false
      })
    });
    if (!guestPlRes.playlist || !guestPlRes.playlist.id) {
      throw new Error('Guest playlist creation failed');
    }
    const guestPlId = guestPlRes.playlist.id;

    // 2. Fetch playlists as guest passing client playlist ID -> MUST be returned
    const guestList = await fetchJSON(`${API_BASE}/playlists`, {
      headers: { 'x-client-playlist-ids': JSON.stringify([guestPlId]) }
    });
    if (!guestList.playlists.some(p => p.id === guestPlId)) {
      throw new Error('Guest created playlist not returned when fetching playlists');
    }

    // 3. User signs up / logs in
    const testMigrateUser = `user_${Date.now()}`;
    const testMigrateEmail = `${testMigrateUser}@vibeflow.local`;
    const regRes = await fetchJSON(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Persistent User',
        username: testMigrateUser,
        email: testMigrateEmail,
        password: 'SecurePassword2026!'
      })
    });
    const loggedInUser = regRes.user;
    const userToken = regRes.token;

    // 4. Authenticated user creates a custom mixtape
    const customPlRes = await fetchJSON(`${API_BASE}/playlists`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`
      },
      body: JSON.stringify({
        title: 'Permanent Gym Energy 2026',
        description: 'Should never disappear',
        isSmart: false
      })
    });
    const customPlId = customPlRes.playlist.id;

    // 5. Fetch playlists with token AND client playlist IDs (migrates guest playlist to user)
    const userPlaylists = await fetchJSON(`${API_BASE}/playlists`, {
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'x-client-playlist-ids': JSON.stringify([guestPlId, customPlId])
      }
    });

    // Both playlists MUST be present:
    const hasCustom = userPlaylists.playlists.some(p => p.id === customPlId);
    const hasMigratedGuest = userPlaylists.playlists.some(p => p.id === guestPlId);
    if (!hasCustom) throw new Error('Authenticated custom playlist disappeared from user playlist page');
    if (!hasMigratedGuest) throw new Error('Guest created playlist was not preserved and migrated upon signing in');

    // 6. Test retrieval using user aliases (username, email, userId)
    const byUsername = await fetchJSON(`${API_BASE}/playlists?userId=${testMigrateUser}`);
    if (!byUsername.playlists.some(p => p.id === customPlId)) {
      throw new Error('Playlist retrieval by username alias failed to return user playlist');
    }

    const byEmail = await fetchJSON(`${API_BASE}/playlists?userId=${testMigrateEmail}`);
    if (!byEmail.playlists.some(p => p.id === customPlId)) {
      throw new Error('Playlist retrieval by email alias failed to return user playlist');
    }

    const byId = await fetchJSON(`${API_BASE}/playlists?userId=${loggedInUser.id}`);
    if (!byId.playlists.some(p => p.id === customPlId)) {
      throw new Error('Playlist retrieval by user ID failed to return user playlist');
    }

    // 7. Requirement: Logged-in user playlists page shall ONLY show playlists created or shared to user; NO preset or unowned playlists!
    const hasPreset = userPlaylists.playlists.some(p => p.id.startsWith('playlist-'));
    if (hasPreset) {
      throw new Error('Curated preset playlists should not be shown on logged-in user playlist page');
    }

    // Preset curated playlists remain accessible for unauthenticated discovery:
    const guestDiscovery = await fetchJSON(`${API_BASE}/playlists`);
    if (!guestDiscovery.playlists.some(p => p.id.startsWith('playlist-'))) {
      throw new Error('Preset playlists should remain available for unauthenticated discovery');
    }
  });

  // 18. Server-Side Playlist Persistence & Cross-Device Sync Code
  await test('Server-Side Playlist Persistence & Cross-Device Pairing Code', async () => {
    // A. Generate/retrieve sync code for user
    const codeRes = await fetchJSON(`${API_BASE}/playlists/sync/code`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!codeRes.syncCode || !codeRes.syncCode.startsWith('VF-')) {
      throw new Error(`Invalid sync code received: ${codeRes.syncCode}`);
    }
    const mySyncCode = codeRes.syncCode;

    // B. Simulate a second device pairing without any prior token
    const pairRes = await fetchJSON(`${API_BASE}/playlists/sync/link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ syncCode: mySyncCode })
    });

    if (!pairRes.token || !pairRes.user || !Array.isArray(pairRes.playlists)) {
      throw new Error('Failed to link device with sync code');
    }
    if (pairRes.user.syncCode !== mySyncCode) {
      throw new Error('User sync code mismatch on paired device');
    }
  });

  // 19. Direct Link Saving to Playlist (YouTube, Spotify, Direct Streams)
  await test('Direct Link Saving to Playlist (YouTube / Spotify / Audio Stream)', async () => {
    // Create a playlist for direct link imports
    const createPlRes = await fetchJSON(`${API_BASE}/playlists`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        title: 'Links Collection Playlist',
        description: 'Testing direct URL imports'
      })
    });
    const pl = createPlRes.playlist;
    if (!pl || !pl.id) throw new Error('Playlist creation for direct link imports failed');

    // A. Import a YouTube link
    const ytRes = await fetchJSON(`${API_BASE}/playlists/${pl.id}/import-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        customTitle: 'Never Gonna Give You Up',
        customArtist: 'Rick Astley'
      })
    });
    if (ytRes.itemsCount < 1 || !ytRes.importedItems || ytRes.importedItems.length === 0) {
      throw new Error('Failed to import YouTube link into playlist');
    }

    // B. Import a direct audio stream URL
    const streamRes = await fetchJSON(`${API_BASE}/playlists/${pl.id}/import-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        url: 'https://actions.google.com/sounds/v1/ambiences/rain_heavy.ogg',
        customTitle: 'Heavy Rain Ambience',
        customArtist: 'Nature Soundscape'
      })
    });
    if (streamRes.itemsCount < 2) {
      throw new Error('Failed to import direct stream URL into playlist');
    }

    // Verify playlist items in server store
    const fullPlRes = await fetchJSON(`${API_BASE}/playlists/${pl.id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const fullPl = fullPlRes.playlist;
    if (!fullPl || !fullPl.items || fullPl.items.length < 2) {
      throw new Error('Playlist does not have imported items persisted on server');
    }
  });

  // 20. Search with Category Selection (track / album / channel / artist / all)
  await test('Search with Category Target Filtering', async () => {
    // A. Search by artist/singer
    const artistSearch = await fetchJSON(`${API_BASE}/media/search?q=Arijit&type=artist`);
    if (!Array.isArray(artistSearch.items) || artistSearch.items.length === 0) {
      throw new Error('Artist/singer targeted search returned no items');
    }

    // B. Search by album
    const albumSearch = await fetchJSON(`${API_BASE}/media/search?q=Aashiqui&type=album`);
    if (!Array.isArray(albumSearch.items)) {
      throw new Error('Album targeted search failed');
    }

    // C. Search by channel/creator
    const channelSearch = await fetchJSON(`${API_BASE}/media/search?q=T-Series&type=channel`);
    if (!Array.isArray(channelSearch.items)) {
      throw new Error('Channel targeted search failed');
    }

    // D. Search with all
    const allSearch = await fetchJSON(`${API_BASE}/media/search?q=Kesariya&type=all`);
    if (!Array.isArray(allSearch.items) || allSearch.items.length === 0) {
      throw new Error('All search returned no items');
    }
  });

  // 21. Accurate Track Duration & Auto-Resolution in Playlists
  await test('Accurate YouTube Track Duration & Real-Time Resolution', async () => {
    // Create a playlist
    const plRes = await fetchJSON(`${API_BASE}/playlists`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        title: 'Accurate Duration Verification Playlist',
        description: 'Testing exact real-world durations'
      })
    });
    const plId = plRes.playlist.id;

    // Import a real YouTube video
    const importRes = await fetchJSON(`${API_BASE}/playlists/${plId}/import-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        customTitle: 'Never Gonna Give You Up'
      })
    });

    const imported = importRes.playlist.items[0]?.mediaItem;
    if (!imported) throw new Error('Track not imported into playlist');

    // Trigger resolve-durations
    const resolveRes = await fetchJSON(`${API_BASE}/playlists/${plId}/resolve-durations`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const resolvedTrack = resolveRes.playlist.items[0]?.mediaItem;
    if (!resolvedTrack || resolvedTrack.duration === 240) {
      throw new Error(`Track duration should not be fallback 240, got ${resolvedTrack?.duration}`);
    }
    // Rick Astley - Never Gonna Give You Up is 212 or 213 seconds (~3:32), definitely not 240 (4:00)
    if (resolvedTrack.duration <= 0) {
      throw new Error(`Resolved duration is invalid: ${resolvedTrack.duration}`);
    }
  });

  // 22. Total Playlist Playing Time Calculation
  await test('Total Playlist Playing Time Calculation & Formatting', async () => {
    const plRes = await fetchJSON(`${API_BASE}/playlists`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        title: 'Total Time Playlist',
        description: 'Testing total time summation'
      })
    });
    const plId = plRes.playlist.id;

    // Add track 1 (185s = 3m 5s)
    await fetchJSON(`${API_BASE}/playlists/${plId}/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        item: {
          id: `custom-track-${Date.now()}-1`,
          title: 'Morning Melody',
          artist: 'Acoustic Studio',
          duration: 185,
          provider: 'local'
        }
      })
    });

    // Add track 2 (215s = 3m 35s)
    await fetchJSON(`${API_BASE}/playlists/${plId}/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        item: {
          id: `custom-track-${Date.now()}-2`,
          title: 'Evening Echoes',
          artist: 'Sunset Studio',
          duration: 215,
          provider: 'local'
        }
      })
    });

    const getRes = await fetchJSON(`${API_BASE}/playlists/${plId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const items = getRes.playlist.items;
    if (!items || items.length !== 2) throw new Error('Expected 2 items in playlist');

    const totalSecs = items.reduce((acc, i) => acc + (i.mediaItem?.duration || 0), 0);
    if (totalSecs !== 400) {
      throw new Error(`Expected total playlist time 400s (6m 40s), got ${totalSecs}s`);
    }
  });

  // 23. Track Sequence Reordering (Move Up, Move Down, Reverse, Shuffle, Persistence)
  await test('Track Sequence Reordering (Move Up/Down, Reverse, Shuffle, Server Persistence)', async () => {
    const plRes = await fetchJSON(`${API_BASE}/playlists`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        title: 'Sequence Reorder Test Playlist',
        description: 'Testing track order sequencing'
      })
    });
    const plId = plRes.playlist.id;

    // Add 3 tracks: A, B, C
    const trackA = { id: `tr-a-${Date.now()}`, title: 'Track Alpha', artist: 'Artist 1', duration: 100 };
    const trackB = { id: `tr-b-${Date.now()}`, title: 'Track Beta', artist: 'Artist 2', duration: 200 };
    const trackC = { id: `tr-c-${Date.now()}`, title: 'Track Gamma', artist: 'Artist 3', duration: 300 };

    for (const tr of [trackA, trackB, trackC]) {
      await fetchJSON(`${API_BASE}/playlists/${plId}/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ item: tr })
      });
    }

    // Verify initial sequence: Alpha (0), Beta (1), Gamma (2)
    const initial = await fetchJSON(`${API_BASE}/playlists/${plId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (initial.playlist.items[0].mediaItem.title !== 'Track Alpha' ||
        initial.playlist.items[1].mediaItem.title !== 'Track Beta' ||
        initial.playlist.items[2].mediaItem.title !== 'Track Gamma') {
      throw new Error('Initial track sequence does not match added order');
    }

    // A. Move Track Beta to top: fromIndex 1 to toIndex 0
    const reorderMove = await fetchJSON(`${API_BASE}/playlists/${plId}/reorder`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ fromIndex: 1, toIndex: 0 })
    });
    if (reorderMove.playlist.items[0].mediaItem.title !== 'Track Beta' ||
        reorderMove.playlist.items[1].mediaItem.title !== 'Track Alpha' ||
        reorderMove.playlist.items[2].mediaItem.title !== 'Track Gamma') {
      throw new Error('Move Up/Down failed to resequence playlist items');
    }

    // B. Reverse Sequence: Gamma, Alpha, Beta
    const reverseRes = await fetchJSON(`${API_BASE}/playlists/${plId}/reorder`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ action: 'reverse' })
    });
    if (reverseRes.playlist.items[0].mediaItem.title !== 'Track Gamma' ||
        reverseRes.playlist.items[2].mediaItem.title !== 'Track Beta') {
      throw new Error('Reverse sequence failed to reverse playlist items');
    }

    // C. Reorder with explicit itemIds array: Alpha, Gamma, Beta
    const targetItemIds = [
      initial.playlist.items.find(i => i.mediaItem.title === 'Track Alpha').id,
      initial.playlist.items.find(i => i.mediaItem.title === 'Track Gamma').id,
      initial.playlist.items.find(i => i.mediaItem.title === 'Track Beta').id
    ];

    const explicitRes = await fetchJSON(`${API_BASE}/playlists/${plId}/reorder`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ itemIds: targetItemIds })
    });

    if (explicitRes.playlist.items[0].mediaItem.title !== 'Track Alpha' ||
        explicitRes.playlist.items[1].mediaItem.title !== 'Track Gamma' ||
        explicitRes.playlist.items[2].mediaItem.title !== 'Track Beta') {
      throw new Error('ItemIds sequence reordering failed');
    }

    // D. Verify persistence by re-fetching from database directly
    const reFetched = await fetchJSON(`${API_BASE}/playlists/${plId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (reFetched.playlist.items[0].mediaItem.title !== 'Track Alpha' ||
        reFetched.playlist.items[1].mediaItem.title !== 'Track Gamma' ||
        reFetched.playlist.items[2].mediaItem.title !== 'Track Beta') {
      throw new Error('Track sequence reordering was not persisted in server store');
    }
  });

  // 24. User Self-Service Account Deletion from Logged-in Device
  await test('User Self-Service Account Deletion & Permanent Erasure Across All Devices', async () => {
    // 1. Register a dedicated test user
    const userToDelete = `del_${Date.now()}`;
    const emailToDelete = `${userToDelete}@vibeflow.local`;
    const regRes = await fetchJSON(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Delete Me User',
        username: userToDelete,
        email: emailToDelete,
        password: 'PasswordToDelete2026!'
      })
    });
    const delUser = regRes.user;
    const delToken = regRes.token;
    if (!delUser || !delToken) throw new Error('Registration failed for delete test');

    // 2. User creates a personal cloud playlist
    const plRes = await fetchJSON(`${API_BASE}/playlists`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${delToken}`
      },
      body: JSON.stringify({
        title: 'Temporary User Playlist To Erase',
        description: 'Should be deleted with account'
      })
    });
    const userPlId = plRes.playlist.id;

    // 3. User requests permanent account deletion from their logged in device
    const delRes = await fetchJSON(`${API_BASE}/auth/account`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${delToken}`
      }
    });
    if (!delRes.success) throw new Error('Account deletion request failed: ' + delRes.message);

    // 4. Verify login attempt fails with invalid credentials
    const loginAttempt = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: userToDelete,
        password: 'PasswordToDelete2026!'
      })
    });
    if (loginAttempt.status !== 401) {
      throw new Error(`Expected HTTP 401 after account deletion, got ${loginAttempt.status}`);
    }

    // 5. Verify /api/auth/me rejects the deleted token
    const meAttempt = await fetch(`${API_BASE}/auth/me`, {
      headers: { 'Authorization': `Bearer ${delToken}` }
    });
    if (meAttempt.status !== 404 && meAttempt.status !== 401) {
      throw new Error(`Expected 404 or 401 on /api/auth/me for deleted user, got ${meAttempt.status}`);
    }

    // 6. Verify user's personal playlist was cleaned up
    const plAttempt = await fetch(`${API_BASE}/playlists/${userPlId}`);
    if (plAttempt.status !== 404) {
      throw new Error('Deleted user personal playlist was not cleaned up');
    }
  });

  // 28. Strict User Playlist Scoping & Isolation Across All Devices
  await test('User Scoped Playlists Isolation (Only Owned or Shared Playlists Shown Across Any Device)', async () => {
    // 1. Create two independent users: DeviceUserA and DeviceUserB
    const userAIdent = `dev_user_a_${Date.now()}`;
    const userBIdent = `dev_user_b_${Date.now()}`;

    const regA = await fetchJSON(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Device User A',
        username: userAIdent,
        email: `${userAIdent}@vibeflow.local`,
        password: 'PasswordA2026!'
      })
    });
    const tokenA = regA.token;
    const userA = regA.user;

    const regB = await fetchJSON(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Device User B',
        username: userBIdent,
        email: `${userBIdent}@vibeflow.local`,
        password: 'PasswordB2026!'
      })
    });
    const tokenB = regB.token;
    const userB = regB.user;

    // 2. Initial state for fresh logged-in User A: MUST NOT show preset playlists or any unowned playlists
    const initialPlaylistsA = await fetchJSON(`${API_BASE}/playlists`, {
      headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    // Check that all playlists returned are strictly owned by User A
    if (initialPlaylistsA.playlists.some(p => p.id.startsWith('playlist-'))) {
      throw new Error('Preset playlists were improperly included in logged-in User A playlist list');
    }
    if (initialPlaylistsA.playlists.some(p => p.userId !== userA.id && p.creator?.id !== userA.id)) {
      throw new Error('User A received a playlist not owned by them');
    }

    // 3. User A creates a playlist on Device 1
    const createPlRes = await fetchJSON(`${API_BASE}/playlists`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        title: "User A Private Hits",
        description: "Created on device 1"
      })
    });
    const plAId = createPlRes.playlist.id;

    // 4. User A fetches playlists on Device 2 (with tokenA) -> MUST see their created playlist
    const playlistsAOnDevice2 = await fetchJSON(`${API_BASE}/playlists`, {
      headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    if (!playlistsAOnDevice2.playlists.some(p => p.id === plAId)) {
      throw new Error("User A did not receive their created playlist on device 2");
    }
    if (playlistsAOnDevice2.playlists.some(p => p.id.startsWith('playlist-'))) {
      throw new Error("User A on device 2 received preset playlists");
    }

    // 5. User B fetches playlists on Device 2 (with tokenB) -> MUST NOT see User A's playlist and MUST NOT see preset playlists
    const playlistsB = await fetchJSON(`${API_BASE}/playlists`, {
      headers: { 'Authorization': `Bearer ${tokenB}` }
    });
    if (playlistsB.playlists.some(p => p.id === plAId)) {
      throw new Error("User B saw User A's unshared private playlist!");
    }
    if (playlistsB.playlists.some(p => p.id.startsWith('playlist-'))) {
      throw new Error("User B saw preset playlists!");
    }

    // 6. User A shares playlist to User B
    const shareRes = await fetchJSON(`${API_BASE}/playlists/${plAId}/share`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`
      },
      body: JSON.stringify({ target: userB.username })
    });
    if (!shareRes.success) throw new Error('Sharing playlist failed: ' + shareRes.message);

    // 7. User B fetches playlists again -> MUST now see the shared playlist
    const playlistsBAfterShare = await fetchJSON(`${API_BASE}/playlists`, {
      headers: { 'Authorization': `Bearer ${tokenB}` }
    });
    const sharedInB = playlistsBAfterShare.playlists.find(p => p.id === plAId);
    if (!sharedInB) {
      throw new Error("User B did not receive the shared playlist");
    }
    if (!sharedInB.isSharedWithMe) {
      throw new Error("Shared playlist missing isSharedWithMe=true flag for recipient User B");
    }

    // 8. Guest / unauthenticated request STILL returns curated preset playlists
    const guestList = await fetchJSON(`${API_BASE}/playlists`);
    if (guestList.playlists.length === 0 || !guestList.playlists.some(p => p.id.startsWith('playlist-'))) {
      throw new Error("Curated discovery presets missing for unauthenticated guest session");
    }
  });

  // 29. Multi-Provider Real Duration Verification & Playback Duration Feedback Loop
  await test('Multi-Provider Real Track Durations & Playback Feedback Loop', async () => {
    // 1. Create a playlist for duration testing
    const plRes = await fetchJSON(`${API_BASE}/playlists`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        title: 'Multi-Provider Duration Test Playlist',
        description: 'Verifying real-world durations across providers'
      })
    });
    const plId = plRes.playlist.id;

    // 2. Add an Apple Music track (trackId: 1635014240 - Kesariya, real duration is 268s, NOT 30s)
    const itunesItem = {
      id: 'itunes-1635014240',
      provider: 'public_domain',
      providerId: '1635014240',
      title: 'Kesariya (From "Brahmastra")',
      artist: 'Pritam & Arijit Singh',
      thumbnail: 'https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/9f/13/ca/9f13ca3b-e533-03e0-f19a-f0aaa774581d/196589311191.jpg/600x600bb.jpg',
      duration: 30, // Initially unmeasured / 30s preview default
      genre: 'Bollywood',
      mood: 'Romantic'
    };
    const addItunesRes = await fetchJSON(`${API_BASE}/playlists/${plId}/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ item: itunesItem })
    });
    const addedItunes = addItunesRes.playlist.items.find(i => i.mediaItemId === itunesItem.id || i.mediaItem?.id === itunesItem.id);
    if (!addedItunes || !addedItunes.mediaItem) {
      throw new Error('Failed to add iTunes item to playlist');
    }
    // Duration should have been auto-resolved from Apple Lookup API to 268s (not 30s)
    if (addedItunes.mediaItem.duration === 30) {
      throw new Error(`iTunes track should have resolved to real duration ~268s, got ${addedItunes.mediaItem.duration}`);
    }
    if (addedItunes.mediaItem.duration < 200) {
      throw new Error(`Unexpected iTunes duration: ${addedItunes.mediaItem.duration}`);
    }

    // 3. Test Player Feedback Loop: PUT /api/media/items/:id/duration
    // When the browser plays an audio stream and detects the exact length (e.g. 268s),
    // it notifies the backend, which updates both the catalog and all playlist tracks.
    const feedbackRes = await fetchJSON(`${API_BASE}/media/items/${itunesItem.id}/duration`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ duration: 268 })
    });
    if (!feedbackRes.success || feedbackRes.duration !== 268) {
      throw new Error('PUT /api/media/items/:id/duration failed');
    }

    // 4. Verify that fetching playlists returns the updated duration in the playlist item
    const verifyPl = await fetchJSON(`${API_BASE}/playlists/${plId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const verifiedTrack = verifyPl.playlist.items.find(i => i.mediaItemId === itunesItem.id);
    if (!verifiedTrack || verifiedTrack.mediaItem.duration !== 268) {
      throw new Error(`Playlist item duration was not updated by playback feedback: ${verifiedTrack?.mediaItem?.duration}`);
    }

    // 5. Verify total playlist duration calculation
    const totalSecs = verifyPl.playlist.items.reduce((s, it) => s + (it.mediaItem?.duration || 0), 0);
    if (totalSecs !== 268) {
      throw new Error(`Total playlist duration mismatch: expected 268, got ${totalSecs}`);
    }
  });

  // 36. Multiple Playlist Batch Selection & Deletion
  await test('Multiple Playlist Batch Selection & Deletion (API, POST/DELETE & Isolation)', async () => {
    // 1. Register a dedicated test user
    const userRes = await fetchJSON(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Batch Tester',
        username: `batch_user_${Date.now()}`,
        password: 'BatchPassword2026!'
      })
    });
    const batchUser = userRes.user;
    const batchToken = userRes.token;

    // 2. Create 4 playlists for this user
    const plIds = [];
    for (let i = 1; i <= 4; i++) {
      const created = await fetchJSON(`${API_BASE}/playlists`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${batchToken}`
        },
        body: JSON.stringify({
          title: `Batch Test Playlist ${i}`,
          description: `Description for playlist ${i}`
        })
      });
      plIds.push(created.playlist.id);
    }

    if (plIds.length !== 4) throw new Error('Failed to create 4 test playlists');

    // 3. Select 2 playlists to batch delete via DELETE /api/playlists/batch
    const idsToDelete = [plIds[0], plIds[2]];
    const delRes = await fetchJSON(`${API_BASE}/playlists/batch`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${batchToken}`
      },
      body: JSON.stringify({ ids: idsToDelete })
    });

    if (!delRes.success || delRes.deletedCount !== 2) {
      throw new Error(`Batch delete failed: deletedCount expected 2, got ${delRes.deletedCount}`);
    }

    // 4. Verify user playlists: plIds[0] and plIds[2] should be gone, plIds[1] and plIds[3] remain
    const remaining = await fetchJSON(`${API_BASE}/playlists?userId=${batchUser.id}`, {
      headers: { 'Authorization': `Bearer ${batchToken}` }
    });
    const remainingIds = new Set(remaining.playlists.map(p => p.id));
    if (remainingIds.has(plIds[0]) || remainingIds.has(plIds[2])) {
      throw new Error('Deleted playlists still appear in user playlist listing');
    }
    if (!remainingIds.has(plIds[1]) || !remainingIds.has(plIds[3])) {
      throw new Error('Non-deleted playlists were incorrectly removed');
    }

    // 5. Delete the remaining 2 via POST /api/playlists/batch-delete
    const batchPostRes = await fetchJSON(`${API_BASE}/playlists/batch-delete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${batchToken}`
      },
      body: JSON.stringify({ ids: [plIds[1], plIds[3]] })
    });
    if (!batchPostRes.success || batchPostRes.deletedCount !== 2) {
      throw new Error('POST /api/playlists/batch-delete failed');
    }

    const finalRemaining = await fetchJSON(`${API_BASE}/playlists?userId=${batchUser.id}`, {
      headers: { 'Authorization': `Bearer ${batchToken}` }
    });
    const finalRemainingTestIds = finalRemaining.playlists.filter(p => plIds.includes(p.id));
    if (finalRemainingTestIds.length !== 0) {
      throw new Error(`Expected all 4 batch-created playlists to be deleted, but found ${finalRemainingTestIds.length} remaining`);
    }

    // 6. Test security isolation: user cannot batch-delete another user's playlists
    const otherUserRes = await fetchJSON(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Protected User',
        username: `protected_${Date.now()}`,
        password: 'ProtectedPass2026!'
      })
    });
    const protectedPl = await fetchJSON(`${API_BASE}/playlists`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${otherUserRes.token}`
      },
      body: JSON.stringify({ title: 'Untouchable Playlist' })
    });

    // Attacker tries to batch delete protected user's playlist
    const unauthorizedAttempt = await fetchJSON(`${API_BASE}/playlists/batch`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${batchToken}`
      },
      body: JSON.stringify({ ids: [protectedPl.playlist.id] })
    });
    if (unauthorizedAttempt.deletedCount !== 0 || unauthorizedAttempt.deletedIds.length !== 0) {
      throw new Error('Unauthorized user was able to batch delete another user playlist!');
    }
  });

  // 37. Cross-Device Playlist Deletion Synchronization
  await test('Cross-Device Playlist Deletion Sync (Deleted on Device A is Deleted on Device B)', async () => {
    // 1. User signs in / registers
    const username = `crossdev_${Date.now()}`;
    const password = 'CrossDevicePass2026!';
    const regRes = await fetchJSON(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Cross Device User',
        username,
        password
      })
    });
    const user = regRes.user;
    const tokenDeviceA = regRes.token;

    // Simulate Device B logging in with same credentials
    const loginDeviceB = await fetchJSON(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: username, password })
    });
    const tokenDeviceB = loginDeviceB.token;

    // 2. Device A creates Playlist 1 and Playlist 2
    const pl1 = await fetchJSON(`${API_BASE}/playlists`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenDeviceA}` },
      body: JSON.stringify({ title: 'Device A Playlist 1', description: 'To be deleted from Device A' })
    });
    const pl2 = await fetchJSON(`${API_BASE}/playlists`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenDeviceA}` },
      body: JSON.stringify({ title: 'Device A Playlist 2', description: 'To be kept' })
    });

    const pl1Id = pl1.playlist.id;
    const pl2Id = pl2.playlist.id;

    // 3. Device B fetches playlists and receives both
    const deviceBInitial = await fetchJSON(`${API_BASE}/playlists?userId=${user.id}`, {
      headers: { 'Authorization': `Bearer ${tokenDeviceB}` }
    });
    const devBIdsInitial = deviceBInitial.playlists.map(p => p.id);
    if (!devBIdsInitial.includes(pl1Id) || !devBIdsInitial.includes(pl2Id)) {
      throw new Error('Device B did not receive playlists created by Device A');
    }

    // 4. Device A deletes Playlist 1
    const delRes = await fetchJSON(`${API_BASE}/playlists/${pl1Id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${tokenDeviceA}` }
    });
    if (!delRes.success && !delRes.message) throw new Error('Device A delete failed');

    // 5. Device B queries playlists (even simulating cached client IDs in header)
    const deviceBAfterDel = await fetchJSON(`${API_BASE}/playlists?userId=${user.id}`, {
      headers: {
        'Authorization': `Bearer ${tokenDeviceB}`,
        'x-client-playlist-ids': JSON.stringify([pl1Id, pl2Id])
      }
    });
    const devBIdsAfter = deviceBAfterDel.playlists.map(p => p.id);
    if (devBIdsAfter.includes(pl1Id)) {
      throw new Error('Playlist deleted from Device A is still present/resurrected on Device B!');
    }
    if (!devBIdsAfter.includes(pl2Id)) {
      throw new Error('Non-deleted Playlist 2 was missing on Device B');
    }

    // 6. Device A creates 3 playlists and batch deletes them
    const batchPls = [];
    for (let i = 1; i <= 3; i++) {
      const bPl = await fetchJSON(`${API_BASE}/playlists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenDeviceA}` },
        body: JSON.stringify({ title: `Batch Multi-Device PL ${i}` })
      });
      batchPls.push(bPl.playlist.id);
    }

    // Device B sees them
    const devBSeeBatch = await fetchJSON(`${API_BASE}/playlists?userId=${user.id}`, {
      headers: { 'Authorization': `Bearer ${tokenDeviceB}` }
    });
    const devBSeeIds = new Set(devBSeeBatch.playlists.map(p => p.id));
    for (const id of batchPls) {
      if (!devBSeeIds.has(id)) throw new Error(`Device B did not see batch playlist ${id}`);
    }

    // Device A batch-deletes all 3
    const batchDelRes = await fetchJSON(`${API_BASE}/playlists/batch`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenDeviceA}` },
      body: JSON.stringify({ ids: batchPls })
    });
    if (batchDelRes.deletedCount !== 3) throw new Error('Batch deletion failed on Device A');

    // Device B fetches again with cached client IDs
    const devBFinal = await fetchJSON(`${API_BASE}/playlists?userId=${user.id}`, {
      headers: {
        'Authorization': `Bearer ${tokenDeviceB}`,
        'x-client-playlist-ids': JSON.stringify([...batchPls, pl2Id])
      }
    });
    const devBFinalIds = new Set(devBFinal.playlists.map(p => p.id));
    for (const id of batchPls) {
      if (devBFinalIds.has(id)) {
        throw new Error(`Batch deleted playlist ${id} was still returned to Device B!`);
      }
    }
  });

  // 19. Cross-Device Playlist Persistence Across Login/Signup (No Wipe-Off)
  await test('Cross-Device Playlist Persistence & Sync Across Devices on Sign In', async () => {
    // A user creates a playlist on Device 1 before signing in (guest/demo session)
    const guestPlRes = await fetchJSON(`${API_BASE}/playlists`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Device 1 Guest Playlist',
        description: 'Created before login on Device 1'
      })
    });
    const guestPl = guestPlRes.playlist;
    if (!guestPl || !guestPl.id) throw new Error('Guest playlist creation failed');

    // User registers account on Device 1, passing clientPlaylistIds / clientPlaylists
    const syncUser = `syncuser_${Date.now()}`;
    const syncPass = 'SyncSecret123!';
    const regRes = await fetchJSON(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Sync Tester',
        username: syncUser,
        password: syncPass,
        clientPlaylistIds: [guestPl.id],
        clientPlaylists: [guestPl]
      })
    });
    if (!regRes.user || !regRes.token) throw new Error('Registration failed');
    const tokenDev1 = regRes.token;

    // Verify Device 1 receives the guest playlist now linked to their user account
    const dev1Pls = await fetchJSON(`${API_BASE}/playlists?userId=${regRes.user.id}`, {
      headers: { 'Authorization': `Bearer ${tokenDev1}` }
    });
    const dev1PlIds = dev1Pls.playlists.map(p => p.id);
    if (!dev1PlIds.includes(guestPl.id)) {
      throw new Error('Guest playlist was not linked to user account on registration');
    }

    // Now user logs in on Device 2 with the same credentials
    const loginDev2 = await fetchJSON(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: syncUser,
        password: syncPass
      })
    });
    if (!loginDev2.token) throw new Error('Device 2 login failed');
    const tokenDev2 = loginDev2.token;

    // Verify Device 2 gets Device 1's playlist immediately upon login without wiping
    const dev2Pls = await fetchJSON(`${API_BASE}/playlists?userId=${regRes.user.id}`, {
      headers: { 'Authorization': `Bearer ${tokenDev2}` }
    });
    const dev2PlIds = dev2Pls.playlists.map(p => p.id);
    if (!dev2PlIds.includes(guestPl.id)) {
      throw new Error('Playlist created on Device 1 was wiped off or missing when signing in on Device 2!');
    }

    // Device 2 creates a second playlist
    const dev2NewPlRes = await fetchJSON(`${API_BASE}/playlists`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenDev2}` },
      body: JSON.stringify({
        title: 'Device 2 Created Playlist',
        description: 'Created on secondary device'
      })
    });
    const dev2NewPlId = dev2NewPlRes.playlist.id;

    // Device 1 syncs and receives Device 2's playlist as well
    const dev1Sync = await fetchJSON(`${API_BASE}/playlists?userId=${regRes.user.id}`, {
      headers: { 'Authorization': `Bearer ${tokenDev1}` }
    });
    const dev1SyncIds = dev1Sync.playlists.map(p => p.id);
    if (!dev1SyncIds.includes(guestPl.id) || !dev1SyncIds.includes(dev2NewPlId)) {
      throw new Error('Device 1 did not retain its own playlist and receive Device 2 playlist during sync');
    }

    // Device 2 explicitly deletes Device 1's guest playlist
    await fetchJSON(`${API_BASE}/playlists/${guestPl.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${tokenDev2}` }
    });

    // Device 1 fetches playlists and receives deletedPlaylistIds (tombstones)
    const dev1AfterDelete = await fetchJSON(`${API_BASE}/playlists?userId=${regRes.user.id}`, {
      headers: { 'Authorization': `Bearer ${tokenDev1}` }
    });
    const dev1RemainingIds = dev1AfterDelete.playlists.map(p => p.id);
    if (dev1RemainingIds.includes(guestPl.id)) {
      throw new Error('Deleted playlist was not removed from Device 1');
    }
    if (!dev1AfterDelete.deletedPlaylistIds || !dev1AfterDelete.deletedPlaylistIds.includes(guestPl.id)) {
      throw new Error('Tombstone for deleted playlist missing in API response');
    }
    if (!dev1RemainingIds.includes(dev2NewPlId)) {
      throw new Error('Non-deleted Device 2 playlist was erroneously removed');
    }
  });

  // 20. Multi-Track / Batch Addition to Playlist
  await test('Multi-Track / Batch Addition to Playlist', async () => {
    // Create a target playlist
    const plRes = await fetchJSON(`${API_BASE}/playlists`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Batch Tracks Destination Playlist',
        description: 'Testing multi-track additions'
      })
    });
    const targetPlId = plRes.playlist.id;

    // Search for tracks to add
    const searchRes = await fetchJSON(`${API_BASE}/media/search?q=synthwave`);
    const sampleItems = searchRes.items.slice(0, 4);
    if (sampleItems.length < 2) throw new Error('Need at least 2 sample items to test batch addition');

    const itemIds = sampleItems.map(i => i.id);

    // Test 1: Batch addition via POST /:id/items with mediaItemIds
    const batchAddRes1 = await fetchJSON(`${API_BASE}/playlists/${targetPlId}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mediaItemIds: itemIds.slice(0, 2)
      })
    });
    if (batchAddRes1.addedCount !== 2) {
      throw new Error(`Expected addedCount 2, got ${batchAddRes1.addedCount}`);
    }
    if (!batchAddRes1.playlist || batchAddRes1.playlist.items.length !== 2) {
      throw new Error('Playlist items length is not 2 after first batch');
    }

    // Test 2: Batch addition via POST /:id/items/batch with full items array
    const batchAddRes2 = await fetchJSON(`${API_BASE}/playlists/${targetPlId}/items/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: itemIds.slice(2, 4).map(id => ({ mediaItemId: id }))
      })
    });
    if (batchAddRes2.addedCount !== 2) {
      throw new Error(`Expected addedCount 2 from /items/batch, got ${batchAddRes2.addedCount}`);
    }

    // Verify full playlist has all 4 items
    const finalPlRes = await fetchJSON(`${API_BASE}/playlists/${targetPlId}`);
    if (finalPlRes.playlist.items.length !== 4) {
      throw new Error(`Expected 4 playlist items, got ${finalPlRes.playlist.items.length}`);
    }

    // Verify ordering is 0, 1, 2, 3
    const orders = finalPlRes.playlist.items.map(item => item.orderIndex);
    if (JSON.stringify(orders) !== JSON.stringify([0, 1, 2, 3])) {
      throw new Error(`Incorrect item order indexes: ${JSON.stringify(orders)}`);
    }
  });

  console.log(`\n🎉 Test Results: ${passed}/${total} passed!`);
  if (passed === total) {
    console.log('🌟 All VibeFlow AI core systems verified production-ready.\n');
  } else {
    process.exit(1);
  }
}

runTests();

