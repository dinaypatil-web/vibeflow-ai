import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../store/database';
import { AIRecommendationService } from '../services/aiRecommendationService';

const router = Router();

function resolveUserId(req: Request): string {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    try {
      const token = auth.slice(7);
      const decoded = jwt.decode(token) as any;
      if (decoded?.userId) return decoded.userId;
    } catch {}
  }
  const rawId = (req.headers['x-user-id'] || req.query.userId || req.body?.userId) as string;
  if (rawId && rawId !== 'demo-user-id') {
    const u = db.findUserById(rawId) || db.findUserByIdentifier(rawId) || db.findUserBySyncCode(rawId);
    if (u) return u.id;
    return rawId;
  }
  return 'demo-user-id';
}

// Get personalized recommendations feed
router.get('/feed', (req: Request, res: Response) => {
  const userId = resolveUserId(req);
  const feed = AIRecommendationService.getPersonalizedFeed(userId);
  res.json({ feed });
});

export default router;
