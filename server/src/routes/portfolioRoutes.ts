import { Router } from 'express';
import {
  getPortfolio,
  createPortfolio,
  migrateGuestPortfolio,
  executeTrade,
  getTransactions,
  getPortfolioPerformance
} from '../controllers/portfolioController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All portfolio routes require authentication
router.get('/', authenticateToken, getPortfolio);
router.post('/', authenticateToken, createPortfolio);
router.post('/migrate', authenticateToken, migrateGuestPortfolio);
router.post('/trade', authenticateToken, executeTrade);
router.get('/transactions', authenticateToken, getTransactions);
router.get('/performance', authenticateToken, getPortfolioPerformance);

export default router;
