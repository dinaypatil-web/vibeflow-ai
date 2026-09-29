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

  console.log(`\n🎉 Test Results: ${passed}/${total} passed!`);
  if (passed === total) {
    console.log('🌟 All VibeFlow AI core systems verified production-ready.\n');
  } else {
    process.exit(1);
  }
}

runTests();
