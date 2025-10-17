import YahooFinance from 'yahoo-finance2';

interface HistoricalDataPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

class YahooFinanceService {
  private yf: YahooFinance;

  constructor() {
    this.yf = new YahooFinance();
  }

  /**
   * Get historical price data for a symbol
   * @param symbol Stock symbol
   * @param period1 Start date (Date object or timestamp)
   * @param period2 End date (Date object or timestamp)
   * @param interval '1d' | '1wk' | '1mo'
   */
  async getHistoricalData(
    symbol: string,
    period1: Date,
    period2: Date,
    interval: '1d' | '1wk' | '1mo' = '1d'
  ): Promise<HistoricalDataPoint[]> {
    try {
      console.log(`🔍 Fetching historical data for ${symbol} from Yahoo Finance`);

      const queryOptions = {
        period1,
        period2,
        interval
      };

      const result: any = await this.yf.historical(symbol, queryOptions);

      if (!result || result.length === 0) {
        return [];
      }

      const historicalData = result.map((item: any) => ({
        date: new Date(item.date).toISOString().split('T')[0], // Format as YYYY-MM-DD
        open: item.open || 0,
        high: item.high || 0,
        low: item.low || 0,
        close: item.close || 0,
        volume: item.volume || 0,
      }));

      return historicalData;
    } catch (error) {
      console.error(`Error fetching historical data for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Get historical data with a simplified period parameter
   * @param symbol Stock symbol
   * @param period 'daily' | 'weekly' | 'monthly'
   */
  async getHistoricalDataByPeriod(
    symbol: string,
    period: 'daily' | 'weekly' | 'monthly' = 'daily'
  ): Promise<HistoricalDataPoint[]> {
    const period2 = new Date(); // End date is today
    const period1 = new Date();

    // Default to 2 years of data for daily, more for weekly/monthly
    if (period === 'daily') {
      period1.setFullYear(period1.getFullYear() - 2);
    } else if (period === 'weekly') {
      period1.setFullYear(period1.getFullYear() - 5);
    } else {
      period1.setFullYear(period1.getFullYear() - 10);
    }

    const interval = period === 'daily' ? '1d' : period === 'weekly' ? '1wk' : '1mo';

    return this.getHistoricalData(symbol, period1, period2, interval);
  }

  /**
   * Get current quote for a symbol
   * @param symbol Stock symbol
   */
  async getQuote(symbol: string) {
    try {
      console.log(`🔍 Fetching quote for ${symbol} from Yahoo Finance`);

      const result: any = await this.yf.quote(symbol);

      if (!result) {
        throw new Error(`No quote data found for ${symbol}`);
      }

      return {
        symbol: result.symbol,
        price: result.regularMarketPrice || 0,
        change: result.regularMarketChange || 0,
        changePercent: result.regularMarketChangePercent || 0,
        volume: result.regularMarketVolume || 0,
        previousClose: result.regularMarketPreviousClose || 0,
        open: result.regularMarketOpen || 0,
        dayHigh: result.regularMarketDayHigh || 0,
        dayLow: result.regularMarketDayLow || 0,
        timestamp: result.regularMarketTime || new Date()
      };
    } catch (error) {
      console.error(`Error fetching quote for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Search for stock symbols
   * @param query Search query
   */
  async searchSymbol(query: string) {
    try {
      console.log(`🔍 Searching for "${query}" from Yahoo Finance`);

      const result: any = await this.yf.search(query);

      if (!result || !result.quotes) {
        return [];
      }

      return result.quotes
        .filter((item: any) => item.quoteType === 'EQUITY')
        .slice(0, 10)
        .map((item: any) => ({
          symbol: item.symbol,
          name: item.longname || item.shortname || item.symbol,
          type: item.quoteType,
          exchange: item.exchange || ''
        }));
    } catch (error) {
      console.error(`Error searching for ${query}:`, error);
      throw error;
    }
  }

  /**
   * Get company overview/profile
   * @param symbol Stock symbol
   */
  async getCompanyOverview(symbol: string) {
    try {
      console.log(`🔍 Fetching company overview for ${symbol} from Yahoo Finance`);

      const result: any = await this.yf.quoteSummary(symbol, {
        modules: ['assetProfile', 'summaryDetail', 'price']
      });

      const profile = result.assetProfile || {};
      const details = result.summaryDetail || {};
      const priceData = result.price || {};

      return {
        symbol: priceData.symbol || symbol,
        name: priceData.longName || priceData.shortName || symbol,
        description: profile.longBusinessSummary || '',
        sector: profile.sector || '',
        industry: profile.industry || '',
        website: profile.website || '',
        employees: profile.fullTimeEmployees || 0,
        marketCap: details.marketCap || 0,
        peRatio: details.trailingPE || 0,
        dividendYield: details.dividendYield || 0,
        beta: details.beta || 0
      };
    } catch (error) {
      console.error(`Error fetching company overview for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Get historical price for a specific date
   * @param symbol Stock symbol
   * @param date Date to get price for
   */
  async getHistoricalPrice(symbol: string, date: Date): Promise<number> {
    try {
      // Get data from 1 day before to 1 day after to ensure we capture the date
      const period1 = new Date(date);
      period1.setDate(period1.getDate() - 1);

      const period2 = new Date(date);
      period2.setDate(period2.getDate() + 1);

      const data = await this.getHistoricalData(symbol, period1, period2, '1d');

      if (data.length === 0) {
        throw new Error(`No historical data found for ${symbol} on ${date.toISOString().split('T')[0]}`);
      }

      // Return the close price of the closest date
      return data[0].close;
    } catch (error) {
      console.error(`Error fetching historical price for ${symbol} on ${date}:`, error);
      throw error;
    }
  }

  /**
   * Get multiple symbols' historical data in parallel
   * @param symbols Array of stock symbols
   * @param period1 Start date
   * @param period2 End date
   * @param interval '1d' | '1wk' | '1mo'
   */
  async getBulkHistoricalData(
    symbols: string[],
    period1: Date,
    period2: Date,
    interval: '1d' | '1wk' | '1mo' = '1d'
  ): Promise<Map<string, HistoricalDataPoint[]>> {
    try {
      console.log(`🔍 Fetching bulk historical data for ${symbols.length} symbols`);

      const results = await Promise.all(
        symbols.map(async (symbol) => {
          try {
            const data = await this.getHistoricalData(symbol, period1, period2, interval);
            return { symbol, data };
          } catch (error) {
            console.error(`Error fetching data for ${symbol}:`, error);
            return { symbol, data: [] };
          }
        })
      );

      const dataMap = new Map<string, HistoricalDataPoint[]>();
      results.forEach(({ symbol, data }) => {
        dataMap.set(symbol, data);
      });

      return dataMap;
    } catch (error) {
      console.error('Error fetching bulk historical data:', error);
      throw error;
    }
  }
}

export default new YahooFinanceService();
