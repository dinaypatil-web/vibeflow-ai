import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import mediaRoutes from './routes/media.routes';
import playlistRoutes from './routes/playlist.routes';
import libraryRoutes from './routes/library.routes';
import recommendationRoutes from './routes/recommendation.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-client-playlist-ids', 'x-sync-code', 'x-share-token', 'x-device-id']
}));
app.use(express.json({ limit: '10mb' }));

// Request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/playlists', playlistRoutes);
app.use('/api/library', libraryRoutes);
app.use('/api/recommendations', recommendationRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'VibeFlow AI Backend',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// OpenAPI Documentation JSON
app.get('/api/docs', (req, res) => {
  res.json({
    openapi: '3.0.0',
    info: {
      title: 'VibeFlow AI API',
      version: '1.0.0',
      description: 'Intelligent Music & Video Discovery Platform REST API'
    },
    paths: {
      '/api/auth/register': { post: { summary: 'Register user' } },
      '/api/auth/login': { post: { summary: 'Login user' } },
      '/api/auth/demo': { post: { summary: 'Instant 1-click demo login' } },
      '/api/media/search': { get: { summary: 'Unified search across providers' } },
      '/api/media/classify': { post: { summary: 'AI Genre & Mood classification' } },
      '/api/media/natural-search': { post: { summary: 'Natural language search query parser' } },
      '/api/media/similar/{id}': { get: { summary: 'Find similar tracks with reasoning' } },
      '/api/playlists': { get: { summary: 'List playlists' }, post: { summary: 'Create playlist' } },
      '/api/recommendations/feed': { get: { summary: 'Personalized AI discovery feed' } }
    }
  });
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`=================================================`);
    console.log(`  🎵 VibeFlow AI Backend running on port ${PORT}`);
    console.log(`  API Base: http://localhost:${PORT}/api`);
    console.log(`  Health:   http://localhost:${PORT}/api/health`);
    console.log(`=================================================`);
  });
}

export default app;

