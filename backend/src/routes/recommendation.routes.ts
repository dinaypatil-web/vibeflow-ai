import { Router, Request, Response } from 'express';
import { AIRecommendationService } from '../services/aiRecommendationService';

const router = Router();

// Get personalized recommendations feed
router.get('/feed', (req: Request, res: Response) => {
  const userId = (req.query.userId as string) || 'demo-user-id';
  const feed = AIRecommendationService.getPersonalizedFeed(userId);
  res.json({ feed });
});

export default router;
