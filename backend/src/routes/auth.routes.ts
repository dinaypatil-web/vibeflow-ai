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
  name: 'Aarav Sharma',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
  role: 'user',
  preferences: { ...DEFAULT_PREFERENCES, userId: 'demo-user-id' },
  createdAt: new Date().toISOString()
};

if (!db.findUserById(DEMO_USER.id)) {
  db.createUser(DEMO_USER, bcrypt.hashSync('demo1234', 10));
}

// Register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    const existing = db.findUserByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = `usr-${Date.now()}`;
    const newUser: User = {
      id: userId,
      email: email.toLowerCase(),
      name,
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
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = db.findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const hash = db.getPasswordHash(user.id);
    if (!hash || !(await bcrypt.compare(password, hash))) {
      return res.status(401).json({ error: 'Invalid email or password' });
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
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Authorization header required' });
  }

  const token = authHeader.replace('Bearer ', '');
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    const updated = db.updateUserPreferences(decoded.userId, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ preferences: updated });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;
