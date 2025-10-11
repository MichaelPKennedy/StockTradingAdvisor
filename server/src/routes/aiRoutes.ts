import { Router } from 'express';
import { chat, streamChat, analyzeRiskProfile, suggestPortfolio } from '../controllers/aiController';
import { optionalAuth } from '../middleware/auth';

const router = Router();

// All AI routes use optional auth - works for both guest and authenticated users
router.post('/chat', optionalAuth, chat);
router.post('/chat/stream', optionalAuth, streamChat);
router.post('/analyze-risk', optionalAuth, analyzeRiskProfile);
router.post('/suggest-portfolio', optionalAuth, suggestPortfolio);

export default router;
