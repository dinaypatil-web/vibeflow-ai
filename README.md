# VibeFlow AI – Intelligent Music & Video Discovery Platform

VibeFlow AI is a production-oriented, cross-platform audio streaming, video discovery, and intelligent playlist orchestration platform. It unifies YouTube content discovery, background audio playback, personalized AI recommendations, offline listening for permitted media, and dynamic smart playlist management.

---

## 🚀 Key Architectural Pillars

### 1. Unified Media Source Integration
- **YouTube & YouTube Music**: Platform-compliant embedded streaming via official YouTube IFrame API and YouTube Data API v3. Strictly adheres to developer policies without stream ripping or DRM circumvention.
- **Local Audio Importer**: Drag-and-drop or select MP3, WAV, FLAC, M4A, or OGG tracks directly from your device with zero upload latency, automatic AI mood/genre tagging, and full offline playback.
- **Master Audio Streams**: Curated Creative Commons and open-licensed high-fidelity audio streams with offline caching support.
- **Modular Provider Framework**: Pluggable provider adapter architecture with dynamic capability detection (`stream_embed`, `stream_direct`, `preview_only`, `offline_download`).

### 2. Native & Web Audio Playback Experience
- **Persistent Mini-Player**: Bottom docked player across all application tabs with timeline scrubbing, volume control, repeat modes, and shuffle.
- **Immersive Now Playing Experience**:
  - Spinning vinyl record animation with pulsing ambient glow
  - Real-time HTML5 Audio Canvas Frequency Visualizer
  - Synced lyrics and spoken transcript panel
  - Configurable sleep timer (15m, 30m, 45m, 60m, custom)
  - Speed controller (0.5x, 0.75x, 1.0x, 1.25x, 1.5x, 2.0x)
  - Interactive queue manager with one-click reordering
- **Mobile Background Audio**: Configured with `expo-av` and native background audio permissions (`FOREGROUND_SERVICE`, `WAKE_LOCK`, `UIBackgroundModes: ["audio"]`).

### 3. AI-Powered Classification & Recommendation Engine
- **Acoustic & Semantic Classifier**: Evaluates track title, artist, audio tags, and descriptions to assign Genre and Mood with confidence metrics and explainable reasoning.
- **Natural Language Search Parser**: Translates conversational prompts into structured filter queries (e.g. *"Suggest peaceful instrumental music for studying"*, *"45-minute Marathi workout playlist"*).
- **Personalized Discovery Feed**: Hybrid recommendation algorithm blending user genre affinities, mood weights, listening completion rate, and content similarity vectors.
- **User Feedback & Ground Truth Learning**: Users can correct suggested classifications to tune their recommendation profile.

### 4. Smart Playlists & Rule Engine
- **Dynamic Rule Combinations**: Build smart playlists with `AND`/`OR` conditions across Genre, Mood, Artist, Language, Duration, and Play Count.
- **Pre-Built Smart Mixes**:
  - *My Morning Motivation*
  - *Relaxing Instrumentals*
  - *Workout Energy & Dhol Beats*
  - *Hindi Retro Favorites*
- **Playlist Export & Import**: Native export to **M3U** playlist files and **JSON** metadata.

### 5. Offline Listening & Media Library
- **Local Device Audio Storage**: Zero-cloud client-side storage for user-owned audio files.
- **Download Manager**: Tracks download jobs, progress percentage, and device storage cache usage.
- **Wi-Fi Only Toggle**: Safeguard mobile cellular data during downloads.

---

## 📂 Project Structure

```
vibeflow-ai/
├── backend/                  # Node.js + Express + TypeScript REST API
│   ├── src/
│   │   ├── routes/           # Auth, Media, Playlists, Library, Recommendations
│   │   ├── services/         # AI Recommendation Service, Provider Registry
│   │   ├── store/            # In-memory & disk-persisted database engine
│   │   ├── types/            # TypeScript data contracts & DTOs
│   │   └── index.ts          # Express server entry point (Port 4000)
│   ├── prisma/               # PostgreSQL & SQLite Prisma schemas
│   └── package.json
├── web/                      # React + TypeScript + Vite + Tailwind CSS Web Companion
│   ├── src/
│   │   ├── components/       # MiniPlayer, NowPlayingModal, AudioEngine, Navbar, Sidebar, TrackCard, SmartPlaylistModal
│   │   ├── views/            # HomeView, ExploreView, PlaylistsView, LibraryView, AIStudioView, SettingsView
│   │   ├── store/            # Zustand player & UI state
│   │   ├── services/         # API HTTP client
│   │   └── App.tsx
│   └── package.json          # Runs on Port 5173
├── mobile/                   # React Native with Expo and TypeScript
│   ├── App.tsx               # Native audio player with background service setup
│   ├── app.json              # Android foreground permissions & iOS audio modes
│   └── package.json
├── shared/                   # Shared TypeScript interfaces
├── docker-compose.yml        # PostgreSQL 16 + Backend + Web stack
├── test.js                   # Automated test verification suite
└── README.md
```

---

## 🛠️ Quickstart Guide

### Prerequisites
- Node.js v18+ (Node v24 recommended)
- npm v9+

### 1. Running the Backend Server
```bash
cd backend
npm install
npm start
```
The REST API will launch on **`http://localhost:4000`**.
- Health Check: `http://localhost:4000/api/health`
- OpenAPI Documentation: `http://localhost:4000/api/docs`

### 2. Running the Web Companion
In a second terminal:
```bash
cd web
npm install
npm run dev
```
Open **`http://localhost:5173`** in your browser.

---

## 📱 Mobile App (Android APK & iOS) Build Instructions

The mobile client is created using **Expo 52** and **TypeScript** with native background audio configured.

### Running in Local Simulator / Expo Go
```bash
cd mobile
npm install
npx expo start
```
- Press `a` to run on connected Android Device or Android Studio Emulator.
- Press `i` to run on iOS Simulator (macOS only).

### Generating a Standalone Android APK (via EAS Build)
1. Install the EAS CLI:
   ```bash
   npm install -g eas-cli
   ```
2. Log in to your Expo account:
   ```bash
   eas login
   ```
3. Initialize build configuration:
   ```bash
   eas build:configure
   ```
4. Build a standalone preview APK for direct installation on Android devices:
   ```bash
   eas build -p android --profile preview
   ```
   EAS will generate a direct download link for the `.apk` file.

---

## 🐳 Docker Deployment

To run PostgreSQL 16, the backend API, and the web companion in Docker containers:
```bash
docker-compose up --build
```
- Web Companion: `http://localhost:5173`
- Backend API: `http://localhost:4000`
- PostgreSQL: `localhost:5432`

---

## 🧪 Automated Test Suite

Run the end-to-end API verification suite:
```bash
node test.js
```

### Verified Test Cases:
1. `Backend Health Check` (200 OK)
2. `1-Click Demo Authentication & JWT`
3. `Media Search & Catalog Retrieval`
4. `AI Genre & Mood Classification` (Predictive confidence scoring)
5. `AI Natural Language Query Parser` (Semantic parameter extraction)
6. `Similar Tracks Discovery Engine` (Content similarity vector matching)
7. `Smart Playlist Dynamic Rule Evaluation` (Hydrated rule match)
8. `Provider Capability Matrix & Compliance` (YouTube, Local, Spotify, SoundCloud)

---

## ⚖️ Legal & Compliance Notice

- **YouTube**: Streams are rendered via the official YouTube IFrame Embed Player API. Background playback and offline storage for YouTube media adhere strictly to YouTube Terms of Service and official subscription requirements.
- **Offline Storage**: Downloads are strictly restricted to user-owned local audio files and open-licensed Creative Commons master recordings. DRM circumvention and stream ripping are disabled by design.
