import axios from 'axios';

interface CachedQuote {
  data: any;
  timestamp: number;
}

interface QuoteCache {
  [symbol: string]: CachedQuote;
}

class AlphaVantageService {
  private apiKey: string;
  private baseUrl = 'https://www.alphavantage.co/query';
  private cache: QuoteCache = {};
  private cacheExpiry = 15 * 60 * 1000; // 15 minutes in milliseconds

  constructor() {
    this.apiKey = process.env.ALPHA_VANTAGE_API_KEY || '';
    if (!this.apiKey) {
      console.warn('⚠️  Alpha Vantage API key not found in environment variables');
    }
  }

  private isCacheValid(symbol: string): boolean {
    const cached = this.cache[symbol];
    if (!cached) return false;

    const now = Date.now();
    return (now - cached.timestamp) < this.cacheExpiry;
  }

  async getQuote(symbol: string) {
    // Check cache first
    if (this.isCacheValid(symbol)) {
      console.log(`📦 Returning cached quote for ${symbol}`);
      return this.cache[symbol]!.data;
    }

    try {
      console.log(`🔍 Fetching fresh quote for ${symbol} from Alpha Vantage`);

      const response = await axios.get(this.baseUrl, {
        params: {
          function: 'GLOBAL_QUOTE',
          symbol: symbol,
          apikey: this.apiKey
        }
      });

      const data = response.data['Global Quote'];

      if (!data || Object.keys(data).length === 0) {
        throw new Error(`No data returned for symbol ${symbol}`);
      }

      const quote = {
        symbol: data['01. symbol'],
        price: parseFloat(data['05. price']),
        change: parseFloat(data['09. change']),
        changePercent: parseFloat(data['10. change percent'].replace('%', '')),
        volume: parseInt(data['06. volume']),
        timestamp: new Date(data['07. latest trading day'])
      };

      // Store in cache
      this.cache[symbol] = {
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
      const response = await axios.get(this.baseUrl, {
        params: {
          function: 'SYMBOL_SEARCH',
          keywords: keywords,
          apikey: this.apiKey
        }
      });

      const matches = response.data.bestMatches || [];
      return matches.map((match: any) => ({
        symbol: match['1. symbol'],
        name: match['2. name'],
        type: match['3. type'],
        region: match['4. region'],
        currency: match['8. currency']
      }));
    } catch (error) {
      console.error(`Error searching for symbol ${keywords}:`, error);
      throw error;
    }
  }

  async getCompanyOverview(symbol: string) {
    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          function: 'OVERVIEW',
          symbol: symbol,
          apikey: this.apiKey
        }
      });

      const data = response.data;
      return {
        symbol: data.Symbol,
        name: data.Name,
        description: data.Description,
        sector: data.Sector,
        industry: data.Industry,
        marketCap: parseInt(data.MarketCapitalization || '0'),
        peRatio: parseFloat(data.PERatio || '0'),
        dividendYield: parseFloat(data.DividendYield || '0')
      };
    } catch (error) {
      console.error(`Error fetching company overview for ${symbol}:`, error);
      throw error;
    }
  }

  clearCache() {
    this.cache = {};
    console.log('🗑️  Cache cleared');
  }

  getCacheStats() {
    return {
      cachedSymbols: Object.keys(this.cache).length,
      cacheExpiryMinutes: this.cacheExpiry / (60 * 1000)
    };
  }
}

export default new AlphaVantageService();
