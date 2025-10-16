import axios from 'axios';

interface CachedData {
  data: any;
  timestamp: number;
}

interface DataCache {
  [key: string]: CachedData;
}

class FinnhubService {
  private apiKey: string;
  private baseUrl = 'https://finnhub.io/api/v1';
  private cache: DataCache = {};
  private cacheExpiry = 15 * 60 * 1000; // 15 minutes in milliseconds

  constructor() {
    this.apiKey = process.env.FINNHUB_API_KEY || '';
    if (!this.apiKey) {
      console.warn('⚠️  Finnhub API key not found in environment variables');
    }
  }

  private isCacheValid(key: string): boolean {
    const cached = this.cache[key];
    if (!cached) return false;

    const now = Date.now();
    return (now - cached.timestamp) < this.cacheExpiry;
  }

  async getQuote(symbol: string) {
    const cacheKey = `quote_${symbol}`;

    // Check cache first
    if (this.isCacheValid(cacheKey)) {
      console.log(`📦 Returning cached quote for ${symbol}`);
      return this.cache[cacheKey]!.data;
    }

    try {
      console.log(`🔍 Fetching fresh quote for ${symbol} from Finnhub`);

      const response = await axios.get(`${this.baseUrl}/quote`, {
        params: {
          symbol: symbol,
          token: this.apiKey
        }
      });

      const data = response.data;

      // Finnhub returns { c, d, dp, h, l, o, pc, t }
      // c = current price, d = change, dp = percent change, h = high, l = low, o = open, pc = previous close, t = timestamp

      if (!data.c || data.c === 0) {
        throw new Error(`No data returned for symbol ${symbol}`);
      }

      const quote = {
        symbol: symbol,
        price: data.c,
        change: data.d,
        changePercent: data.dp,
        high: data.h,
        low: data.l,
        open: data.o,
        previousClose: data.pc,
        timestamp: new Date(data.t * 1000) // Convert Unix timestamp to Date
      };

      // Store in cache
      this.cache[cacheKey] = {
        data: quote,
        timestamp: Date.now()
      };

      return quote;
    } catch (error) {
      console.error(`Error fetching quote for ${symbol}:`, error);
      throw error;
    }
  }

  async searchSymbol(keywords: string) {
    try {
      const response = await axios.get(`${this.baseUrl}/search`, {
        params: {
          q: keywords,
          token: this.apiKey
        }
      });

      const results = response.data.result || [];

      // Filter to only US stocks for better UX
      return results
        .filter((item: any) => item.type === 'Common Stock')
        .slice(0, 10)
        .map((item: any) => ({
          symbol: item.symbol,
          name: item.description,
          type: item.type,
          region: 'US'
        }));
    } catch (error) {
      console.error(`Error searching for symbol ${keywords}:`, error);
      throw error;
    }
  }

  async getCompanyOverview(symbol: string) {
    const cacheKey = `company_${symbol}`;

    if (this.isCacheValid(cacheKey)) {
      console.log(`📦 Returning cached company data for ${symbol}`);
      return this.cache[cacheKey]!.data;
    }

    try {
      const response = await axios.get(`${this.baseUrl}/stock/profile2`, {
        params: {
          symbol: symbol,
          token: this.apiKey
        }
      });

      const data = response.data;

      const overview = {
        symbol: data.ticker,
        name: data.name,
        description: data.description || '',
        sector: data.finnhubIndustry || '',
        industry: data.finnhubIndustry || '',
        marketCap: data.marketCapitalization || 0,
        country: data.country,
        currency: data.currency,
        exchange: data.exchange,
        ipo: data.ipo,
        logo: data.logo,
        weburl: data.weburl
      };

      this.cache[cacheKey] = {
        data: overview,
        timestamp: Date.now()
      };

      return overview;
    } catch (error) {
      console.error(`Error fetching company overview for ${symbol}:`, error);
      throw error;
    }
  }

  async getHistoricalData(symbol: string, period: 'daily' | 'weekly' | 'monthly' = 'daily') {
    const cacheKey = `${symbol}_${period}_historical`;

    // Check cache first
    if (this.isCacheValid(cacheKey)) {
      console.log(`📦 Returning cached historical data for ${symbol}`);
      return this.cache[cacheKey]!.data;
    }

    try {
      console.log(`🔍 Fetching historical data for ${symbol} from Finnhub`);

      const resolutionMap = {
        daily: 'D',
        weekly: 'W',
        monthly: 'M'
      };

      // Calculate time range (last 6 months for daily, 2 years for weekly, 5 years for monthly)
      const now = Math.floor(Date.now() / 1000);
      const timeRanges = {
        daily: 180 * 24 * 60 * 60,    // 180 days
        weekly: 2 * 365 * 24 * 60 * 60, // 2 years
        monthly: 5 * 365 * 24 * 60 * 60 // 5 years
      };

      const from = now - timeRanges[period];

      const response = await axios.get(`${this.baseUrl}/stock/candle`, {
        params: {
          symbol: symbol,
          resolution: resolutionMap[period],
          from: from,
          to: now,
          token: this.apiKey
        }
      });

      const data = response.data;

      if (data.s === 'no_data' || !data.c) {
        throw new Error(`No historical data returned for symbol ${symbol}`);
      }

      // Finnhub returns arrays: c (close), h (high), l (low), o (open), t (timestamp), v (volume)
      const historicalData = data.t.map((timestamp: number, index: number) => ({
        date: new Date(timestamp * 1000).toISOString().split('T')[0],
        open: data.o[index],
        high: data.h[index],
        low: data.l[index],
        close: data.c[index],
        volume: data.v[index]
      }));

      // Store in cache
      this.cache[cacheKey] = {
        data: historicalData,
        timestamp: Date.now()
      };

      return historicalData;
    } catch (error) {
      console.error(`Error fetching historical data for ${symbol}:`, error);
      throw error;
    }
  }

  clearCache() {
    this.cache = {};
    console.log('🗑️  Cache cleared');
  }

  getCacheStats() {
    return {
      cachedItems: Object.keys(this.cache).length,
      cacheExpiryMinutes: this.cacheExpiry / (60 * 1000)
    };
  }
}

export default new FinnhubService();
