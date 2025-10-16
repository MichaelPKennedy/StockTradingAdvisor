import { Request, Response } from 'express';
import finnhubService from '../services/finnhubService';
import alphaVantageService from '../services/alphaVantageService';

export const getQuote = async (req: Request, res: Response): Promise<void> => {
  const { symbol } = req.params;

  if (!symbol) {
    res.status(400).json({ error: 'Symbol is required' });
    return;
  }

  try {
    const quote = await finnhubService.getQuote(symbol.toUpperCase());
    res.json(quote);
  } catch (error) {
    console.error('Get quote error:', error);
    res.status(500).json({ error: 'Failed to fetch stock quote' });
  }
};

export const searchSymbol = async (req: Request, res: Response): Promise<void> => {
  const { q } = req.query;

  if (!q || typeof q !== 'string') {
    res.status(400).json({ error: 'Search query (q) is required' });
    return;
  }

  try {
    const results = await finnhubService.searchSymbol(q);
    res.json(results);
  } catch (error) {
    console.error('Search symbol error:', error);
    res.status(500).json({ error: 'Failed to search symbols' });
  }
};

export const getCompanyOverview = async (req: Request, res: Response): Promise<void> => {
  const { symbol } = req.params;

  if (!symbol) {
    res.status(400).json({ error: 'Symbol is required' });
    return;
  }

  try {
    const overview = await finnhubService.getCompanyOverview(symbol.toUpperCase());
    res.json(overview);
  } catch (error) {
    console.error('Get company overview error:', error);
    res.status(500).json({ error: 'Failed to fetch company overview' });
  }
};

export const getCacheStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const stats = finnhubService.getCacheStats();
    res.json(stats);
  } catch (error) {
    console.error('Get cache stats error:', error);
    res.status(500).json({ error: 'Failed to get cache stats' });
  }
};

export const getHistoricalData = async (req: Request, res: Response): Promise<void> => {
  const { symbol } = req.params;
  const { period } = req.query;

  if (!symbol) {
    res.status(400).json({ error: 'Symbol is required' });
    return;
  }

  const validPeriod = ['daily', 'weekly', 'monthly'].includes(period as string)
    ? (period as 'daily' | 'weekly' | 'monthly')
    : 'daily';

  try {
    // Use Alpha Vantage for historical data (Finnhub requires paid plan)
    const historicalData = await alphaVantageService.getHistoricalData(symbol.toUpperCase(), validPeriod);
    res.json(historicalData);
  } catch (error) {
    console.error('Get historical data error:', error);
    res.status(500).json({ error: 'Failed to fetch historical data' });
  }
};
