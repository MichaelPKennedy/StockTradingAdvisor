import { Response } from 'express';
import { pool } from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import yahooFinanceService from '../services/yahooFinanceService';

export const getPortfolio = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Get user's portfolio
    const [portfolios] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM portfolios WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
      [req.userId]
    );

    if (portfolios.length === 0) {
      res.status(404).json({ error: 'Portfolio not found' });
      return;
    }

    const portfolio = portfolios[0];

    // Get holdings
    const [holdings] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM holdings WHERE portfolio_id = ?',
      [portfolio.id]
    );

    res.json({
      portfolio,
      holdings
    });
  } catch (error) {
    console.error('Get portfolio error:', error);
    res.status(500).json({ error: 'Failed to get portfolio' });
  }
};

export const createPortfolio = async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, initialBalance } = req.body;

  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const balance = initialBalance || 100000;

    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO portfolios (user_id, name, initial_balance, current_balance) VALUES (?, ?, ?, ?)',
      [req.userId, name || 'My Portfolio', balance, balance]
    );

    const portfolioId = result.insertId;

    const [portfolios] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM portfolios WHERE id = ?',
      [portfolioId]
    );

    res.status(201).json(portfolios[0]);
  } catch (error) {
    console.error('Create portfolio error:', error);
    res.status(500).json({ error: 'Failed to create portfolio' });
  }
};

export const migrateGuestPortfolio = async (req: AuthRequest, res: Response): Promise<void> => {
  const { portfolio, holdings, transactions } = req.body;

  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Start transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Create portfolio
      const [portfolioResult] = await connection.query<ResultSetHeader>(
        'INSERT INTO portfolios (user_id, name, initial_balance, current_balance) VALUES (?, ?, ?, ?)',
        [req.userId, portfolio.name, portfolio.initialBalance, portfolio.currentBalance]
      );

      const portfolioId = portfolioResult.insertId;

      // Insert holdings
      if (holdings && holdings.length > 0) {
        for (const holding of holdings) {
          await connection.query(
            'INSERT INTO holdings (portfolio_id, symbol, quantity, purchase_price, current_price, purchase_date) VALUES (?, ?, ?, ?, ?, ?)',
            [
              portfolioId,
              holding.symbol,
              holding.quantity,
              holding.purchasePrice,
              holding.currentPrice,
              holding.purchaseDate || new Date()
            ]
          );
        }
      }

      // Insert transactions
      if (transactions && transactions.length > 0) {
        for (const transaction of transactions) {
          await connection.query(
            'INSERT INTO transactions (portfolio_id, type, symbol, quantity, price, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
            [
              portfolioId,
              transaction.type,
              transaction.symbol,
              transaction.quantity,
              transaction.price,
              transaction.timestamp || new Date()
            ]
          );
        }
      }

      await connection.commit();

      // Get the created portfolio with holdings
      const [newPortfolio] = await pool.query<RowDataPacket[]>(
        'SELECT * FROM portfolios WHERE id = ?',
        [portfolioId]
      );

      const [newHoldings] = await pool.query<RowDataPacket[]>(
        'SELECT * FROM holdings WHERE portfolio_id = ?',
        [portfolioId]
      );

      res.status(201).json({
        portfolio: newPortfolio[0],
        holdings: newHoldings
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Migrate portfolio error:', error);
    res.status(500).json({ error: 'Failed to migrate portfolio' });
  }
};

export const executeTrade = async (req: AuthRequest, res: Response): Promise<void> => {
  const { symbol, quantity, type } = req.body;

  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!symbol || !quantity || !type || (type !== 'buy' && type !== 'sell')) {
      res.status(400).json({ error: 'Invalid trade parameters' });
      return;
    }

    // Get current stock price
    const quote = await yahooFinanceService.getQuote(symbol.toUpperCase());
    const price = quote.price;

    // Get user's portfolio
    const [portfolios] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM portfolios WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
      [req.userId]
    );

    if (portfolios.length === 0) {
      res.status(404).json({ error: 'Portfolio not found' });
      return;
    }

    const portfolio = portfolios[0];
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      const totalCost = price * quantity;

      if (type === 'buy') {
        // Check if user has enough balance
        if (portfolio.current_balance < totalCost) {
          await connection.rollback();
          connection.release();
          res.status(400).json({ error: 'Insufficient balance' });
          return;
        }

        // Update balance
        await connection.query(
          'UPDATE portfolios SET current_balance = current_balance - ? WHERE id = ?',
          [totalCost, portfolio.id]
        );

        // Check if holding exists
        const [existingHoldings] = await connection.query<RowDataPacket[]>(
          'SELECT * FROM holdings WHERE portfolio_id = ? AND symbol = ?',
          [portfolio.id, symbol.toUpperCase()]
        );

        if (existingHoldings.length > 0) {
          // Update existing holding
          const holding = existingHoldings[0];
          const existingQty = parseFloat(holding.quantity);
          const existingPrice = parseFloat(holding.purchase_price);
          const newQuantity = existingQty + quantity;
          const avgPrice = ((existingPrice * existingQty) + (price * quantity)) / newQuantity;

          await connection.query(
            'UPDATE holdings SET quantity = ?, purchase_price = ?, current_price = ? WHERE id = ?',
            [newQuantity, avgPrice, price, holding.id]
          );
        } else {
          // Create new holding
          await connection.query(
            'INSERT INTO holdings (portfolio_id, symbol, quantity, purchase_price, current_price) VALUES (?, ?, ?, ?, ?)',
            [portfolio.id, symbol.toUpperCase(), quantity, price, price]
          );
        }
      } else {
        // Sell
        const [holdings] = await connection.query<RowDataPacket[]>(
          'SELECT * FROM holdings WHERE portfolio_id = ? AND symbol = ?',
          [portfolio.id, symbol.toUpperCase()]
        );

        const holding = holdings[0];
        const existingQty = parseFloat(holding.quantity);

        if (holdings.length === 0 || existingQty < quantity) {
          await connection.rollback();
          connection.release();
          res.status(400).json({ error: 'Insufficient shares to sell' });
          return;
        }

        // Update balance
        await connection.query(
          'UPDATE portfolios SET current_balance = current_balance + ? WHERE id = ?',
          [totalCost, portfolio.id]
        );

        const newQuantity = existingQty - quantity;

        if (newQuantity === 0) {
          // Remove holding
          await connection.query('DELETE FROM holdings WHERE id = ?', [holding.id]);
        } else {
          // Update holding
          await connection.query(
            'UPDATE holdings SET quantity = ?, current_price = ? WHERE id = ?',
            [newQuantity, price, holding.id]
          );
        }
      }

      // Record transaction
      await connection.query(
        'INSERT INTO transactions (portfolio_id, type, symbol, quantity, price) VALUES (?, ?, ?, ?, ?)',
        [portfolio.id, type, symbol.toUpperCase(), quantity, price]
      );

      await connection.commit();
      connection.release();

      res.json({
        success: true,
        message: `Successfully ${type === 'buy' ? 'bought' : 'sold'} ${quantity} shares of ${symbol.toUpperCase()} at $${price}`,
        price,
        quantity,
        total: totalCost
      });
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (error) {
    console.error('Execute trade error:', error);
    res.status(500).json({ error: 'Failed to execute trade' });
  }
};

export const getTransactions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Get user's portfolio
    const [portfolios] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM portfolios WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
      [req.userId]
    );

    if (portfolios.length === 0) {
      res.status(404).json({ error: 'Portfolio not found' });
      return;
    }

    const portfolioId = portfolios[0].id;

    // Get transactions
    const [transactions] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM transactions WHERE portfolio_id = ? ORDER BY timestamp DESC',
      [portfolioId]
    );

    res.json(transactions);
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Failed to get transactions' });
  }
};

export const getPortfolioPerformance = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Get user's portfolio
    const [portfolios] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM portfolios WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
      [req.userId]
    );

    if (portfolios.length === 0) {
      res.status(404).json({ error: 'Portfolio not found' });
      return;
    }

    const portfolio = portfolios[0];
    const portfolioId = portfolio.id;

    // Get all transactions sorted by timestamp
    const [transactions] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM transactions WHERE portfolio_id = ? ORDER BY timestamp ASC',
      [portfolioId]
    );

    if (transactions.length === 0) {
      // No transactions, return just the initial balance
      res.json([{
        date: new Date().toISOString().split('T')[0],
        value: parseFloat(portfolio.initial_balance)
      }]);
      return;
    }

    // Get unique symbols from transactions
    const symbols = Array.from(new Set(transactions.map((t: any) => t.symbol)));

    // Get date range from first transaction to now
    const firstTransaction = new Date(transactions[0].timestamp);
    const now = new Date();

    // Fetch historical data for all symbols
    const historicalDataMap = await yahooFinanceService.getBulkHistoricalData(
      symbols,
      firstTransaction,
      now,
      '1d'
    );

    // Build a map of dates to portfolio values
    const dateValueMap = new Map<string, number>();

    // Get all unique dates from historical data
    const allDates = new Set<string>();
    historicalDataMap.forEach((data) => {
      data.forEach((point) => allDates.add(point.date));
    });

    // Sort dates
    const sortedDates = Array.from(allDates).sort();

    // For each date, calculate portfolio value
    for (const date of sortedDates) {
      const dateObj = new Date(date);

      // Start with initial balance
      let cash = parseFloat(portfolio.initial_balance);
      const holdings = new Map<string, { quantity: number; avgPrice: number }>();

      // Replay transactions up to this date
      for (const txn of transactions) {
        const txnDate = new Date(txn.timestamp);
        if (txnDate > dateObj) break;

        const symbol = txn.symbol;
        const quantity = parseFloat(txn.quantity);
        const price = parseFloat(txn.price);

        if (txn.type === 'buy') {
          cash -= price * quantity;

          const existing = holdings.get(symbol);
          if (existing) {
            const newQuantity = existing.quantity + quantity;
            const newAvgPrice = ((existing.avgPrice * existing.quantity) + (price * quantity)) / newQuantity;
            holdings.set(symbol, { quantity: newQuantity, avgPrice: newAvgPrice });
          } else {
            holdings.set(symbol, { quantity, avgPrice: price });
          }
        } else {
          cash += price * quantity;

          const existing = holdings.get(symbol);
          if (existing) {
            const newQuantity = existing.quantity - quantity;
            if (newQuantity <= 0) {
              holdings.delete(symbol);
            } else {
              holdings.set(symbol, { ...existing, quantity: newQuantity });
            }
          }
        }
      }

      // Calculate holdings value at this date
      let holdingsValue = 0;
      for (const [symbol, holding] of holdings.entries()) {
        const historicalData = historicalDataMap.get(symbol);
        if (historicalData) {
          // Find the price for this date (or closest before)
          const priceData = historicalData.find(p => p.date === date);
          if (priceData) {
            holdingsValue += holding.quantity * priceData.close;
          } else {
            // Use the closest previous date
            const previousData = historicalData
              .filter(p => p.date <= date)
              .sort((a, b) => b.date.localeCompare(a.date))[0];
            if (previousData) {
              holdingsValue += holding.quantity * previousData.close;
            }
          }
        }
      }

      const totalValue = cash + holdingsValue;
      dateValueMap.set(date, totalValue);
    }

    // Convert to array format
    const performanceData = Array.from(dateValueMap.entries())
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => a.date.localeCompare(b.date));

    res.json(performanceData);
  } catch (error) {
    console.error('Get portfolio performance error:', error);
    res.status(500).json({ error: 'Failed to get portfolio performance' });
  }
};
