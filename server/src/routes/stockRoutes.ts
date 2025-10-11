import { Router } from 'express';
import { getQuote, searchSymbol, getCompanyOverview, getCacheStats } from '../controllers/stockController';

const router = Router();

// No auth required - stock data is public
router.get('/quote/:symbol', getQuote);
router.get('/search', searchSymbol);
router.get('/overview/:symbol', getCompanyOverview);
router.get('/cache-stats', getCacheStats);

export default router;
