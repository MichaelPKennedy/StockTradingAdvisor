import { Router } from 'express';
import { getQuote, searchSymbol, getCompanyOverview, getCacheStats, getHistoricalData } from '../controllers/stockController';

const router = Router();

// No auth required - stock data is public
router.get('/quote/:symbol', getQuote);
router.get('/search', searchSymbol);
router.get('/overview/:symbol', getCompanyOverview);
router.get('/historical/:symbol', getHistoricalData);
router.get('/cache-stats', getCacheStats);

export default router;
