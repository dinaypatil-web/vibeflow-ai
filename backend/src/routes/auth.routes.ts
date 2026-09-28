import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../store/database';
import { User, UserPreferences, Playlist } from '../types';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'vibeflow-super-secret-key-2026';

const DEFAULT_PREFERENCES: UserPreferences = {
  userId: '',
  favoriteGenres: ['Bollywood', 'Lo-Fi & Chill', 'Hindi Retro', 'Marathi'],
  favoriteMoods: ['Calm & Peaceful', 'Focus & Study', 'Workout & Energy', 'Romantic'],
  preferredLanguages: ['Hindi', 'English', 'Marathi', 'Punjabi'],
  favoriteArtists: ['Arijit Singh', 'Lata Mangeshkar', 'Bombay Chill Collective'],
  autoPlaySimilar: true,
  streamQuality: 'high',
  downloadQuality: 'high',
  wifiOnlyDownloads: true,
  enableListeningHistory: true,
  theme: 'dark'
};

// Seed demo user
const DEMO_USER: User = {
  id: 'demo-user-id',
  email: 'demo@vibeflow.ai',
  username: 'demo',
  name: 'Aarav Sharma',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
  role: 'user',
  preferences: { ...DEFAULT_PREFERENCES, userId: 'demo-user-id' },
  createdAt: new Date().toISOString()
};

if (!db.findUserById(DEMO_USER.id) || !db.getPasswordHash(DEMO_USER.id)) {
  db.createUser(DEMO_USER, bcrypt.hashSync('demo1234', 10));
}

// Register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const rawEmail = (req.body.email || '').trim();
    const rawUsername = (req.body.username || '').trim();
    const rawName = (req.body.name || '').trim();
    const password = (req.body.password || '').trim();

    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const identifier = rawEmail || rawUsername;
    if (!identifier) {
      return res.status(400).json({ error: 'Username or email is required' });
    }

    const name = rawName || rawUsername || rawEmail.split('@')[0] || 'Music Lover';
    // If rawEmail has no @, treat it as username or assign a valid local email domain
    const email = rawEmail.includes('@')
      ? rawEmail.toLowerCase()
      : (rawUsername.includes('@') ? rawUsername.toLowerCase() : `${(rawUsername || rawEmail).toLowerCase()}@vibeflow.local`);
    
    const username = (rawUsername || rawEmail.split('@')[0] || name.replace(/\s+/g, '')).toLowerCase();

    // Check if user already exists by email, username, or identifier
    const existing = db.findUserByIdentifier(email) || db.findUserByIdentifier(username);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email or username already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = `usr-${Date.now()}`;
    const newUser: User = {
      id: userId,
      email,
      name,
      username,
      role: 'user',
      preferences: { ...DEFAULT_PREFERENCES, userId },
      createdAt: new Date().toISOString()
    };

    db.createUser(newUser, hashedPassword);

    // Seed initial personal playlist for this new user
    const welcomePlaylist: Playlist = {
      id: `pl-${Date.now()}`,
      userId: newUser.id,
      title: `${newUser.name.split(' ')[0]}'s Favorites`,
      description: 'Personal cloud playlist synced across all your devices.',
      coverArt: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80',
      isSmart: false,
      isPrivate: false,
      isShareable: true,
      itemCount: 0,
      items: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.createPlaylist(welcomePlaylist);

    const token = jwt.sign({ userId: newUser.id, email: newUser.email }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({ user: newUser, token });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const identifier = (req.body.identifier || req.body.email || req.body.username || '').trim();
    const password = (req.body.password || '').trim();

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Username/email and password are required' });
    }

    const user = db.findUserByIdentifier(identifier);
    if (!user) {
      return res.status(401).json({ error: 'Invalid username/email or password' });
    }

    const hash = db.getPasswordHash(user.id) || db.getPasswordHash(identifier) || (user.email ? db.getPasswordHash(user.email) : undefined);
    if (!hash) {
      return res.status(401).json({ error: 'Invalid username/email or password' });
    }

    const isMatch = await bcrypt.compare(password, hash);
    if (!isMatch && password !== hash) {
      return res.status(401).json({ error: 'Invalid username/email or password' });
    }

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ user, token });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// 1-Click Demo Login
router.post('/demo', (req: Request, res: Response) => {
  const token = jwt.sign({ userId: DEMO_USER.id, email: DEMO_USER.email }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ user: DEMO_USER, token });
});

// Get Current User
router.get('/me', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Authorization header required' });
  }

  const token = authHeader.replace('Bearer ', '');
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    const user = db.findUserById(decoded.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user });
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
});

// Update Preferences
router.put('/preferences', (req: Request, res: Response) => {
  try {
    let userId: string | null = null;
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
        userId = decoded.userId;
      } catch (err) {}
    }

    if (!userId) {
      userId = (req.body.userId || req.query.userId as string || '').trim();
    }

    if (!userId) {
      return res.status(400).json({ error: 'Authorization token or userId required' });
    }

    const prefsPayload = req.body.preferences || req.body;
    const updated = db.updateUserPreferences(userId, prefsPayload);
    if (!updated) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = db.findUserById(userId);
    res.json({ preferences: updated, user });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

export default router;
