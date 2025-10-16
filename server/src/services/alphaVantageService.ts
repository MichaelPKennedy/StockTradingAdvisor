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
  private requestQueue: Array<() => Promise<any>> = [];
  private isProcessing = false;
  private minRequestInterval = 12000; // 12 seconds between requests (5 per minute max)

  constructor() {
    this.apiKey = process.env.ALPHA_VANTAGE_API_KEY || '';
    if (!this.apiKey) {
      console.warn('⚠️  Alpha Vantage API key not found in environment variables');
    }
  }

  private async processQueue() {
    if (this.isProcessing || this.requestQueue.length === 0) return;

    this.isProcessing = true;

    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift();
      if (request) {
        try {
          await request();
        } catch (error) {
          console.error('Queue request failed:', error);
        }
        // Wait before processing next request
        if (this.requestQueue.length > 0) {
          await new Promise(resolve => setTimeout(resolve, this.minRequestInterval));
        }
      }
    }

    this.isProcessing = false;
  }

  private async queueRequest<T>(requestFn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          const result = await requestFn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      this.processQueue();
    });
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

    return this.queueRequest(async () => {
      try {
        console.log(`🔍 Fetching fresh quote for ${symbol} from Alpha Vantage`);

        const response = await axios.get(this.baseUrl, {
          params: {
            function: 'GLOBAL_QUOTE',
            symbol: symbol,
            apikey: this.apiKey
          }
        });

        // Check for rate limit message
        if (response.data.Note) {
          console.warn(`⚠️  Alpha Vantage rate limit reached: ${response.data.Note}`);
          throw new Error('API rate limit reached. Please wait a moment and try again.');
        }

        // Check for error message
        if (response.data['Error Message']) {
          throw new Error(`Invalid symbol: ${symbol}`);
        }

        const data = response.data['Global Quote'];

        if (!data || Object.keys(data).length === 0) {
          console.error(`No data in response for ${symbol}:`, JSON.stringify(response.data));
          throw new Error(`No data returned for symbol ${symbol}. This may be due to API rate limits.`);
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
    });
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

  async getHistoricalData(symbol: string, period: 'daily' | 'weekly' | 'monthly' = 'daily') {
    const cacheKey = `${symbol}_${period}_historical`;

    // Check cache first
    if (this.isCacheValid(cacheKey)) {
      console.log(`📦 Returning cached historical data for ${symbol}`);
      return this.cache[cacheKey]!.data;
    }

    try {
      console.log(`🔍 Fetching historical data for ${symbol} from Alpha Vantage`);

      const functionMap = {
        daily: 'TIME_SERIES_DAILY',
        weekly: 'TIME_SERIES_WEEKLY',
        monthly: 'TIME_SERIES_MONTHLY'
      };

      const response = await axios.get(this.baseUrl, {
        params: {
          function: functionMap[period],
          symbol: symbol,
          apikey: this.apiKey
        }
      });

      const timeSeriesKey = period === 'daily'
        ? 'Time Series (Daily)'
        : period === 'weekly'
        ? 'Weekly Time Series'
        : 'Monthly Time Series';

      // Check for rate limit or error messages
      if (response.data.Note) {
        console.warn(`⚠️  Alpha Vantage rate limit: ${response.data.Note}`);
        throw new Error('Alpha Vantage API rate limit reached. Please try again later.');
      }

      if (response.data['Error Message']) {
        throw new Error(`Invalid symbol: ${symbol}`);
      }

      if (response.data.Information) {
        console.warn(`⚠️  Alpha Vantage limit: ${response.data.Information}`);
        throw new Error('Alpha Vantage API limit reached. Please try again later.');
      }

      const timeSeries = response.data[timeSeriesKey];

      if (!timeSeries) {
        console.error(`No time series data for ${symbol}. Response:`, JSON.stringify(response.data).substring(0, 500));
        throw new Error(`No historical data available for ${symbol}. You may have reached your API limit.`);
      }

      // Convert to array and sort by date
      const historicalData = Object.entries(timeSeries).map(([date, values]: [string, any]) => ({
        date,
        open: parseFloat(values['1. open']),
        high: parseFloat(values['2. high']),
        low: parseFloat(values['3. low']),
        close: parseFloat(values['4. close']),
        volume: parseInt(values['5. volume'])
      })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

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
      cachedSymbols: Object.keys(this.cache).length,
      cacheExpiryMinutes: this.cacheExpiry / (60 * 1000)
    };
  }
}

export default new AlphaVantageService();
