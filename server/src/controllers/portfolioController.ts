import { Response } from 'express';
import { pool } from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import alphaVantageService from '../services/alphaVantageService';

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
    const quote = await alphaVantageService.getQuote(symbol.toUpperCase());
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
          const newQuantity = holding.quantity + quantity;
          const avgPrice = ((holding.purchase_price * holding.quantity) + (price * quantity)) / newQuantity;

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

        if (holdings.length === 0 || holdings[0].quantity < quantity) {
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

        const holding = holdings[0];
        const newQuantity = holding.quantity - quantity;

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
