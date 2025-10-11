import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

interface Holding {
  id?: number;
  symbol: string;
  quantity: number;
  purchasePrice: number;
  currentPrice: number;
  purchaseDate?: string;
}

interface Transaction {
  id?: number;
  type: 'buy' | 'sell';
  symbol: string;
  quantity: number;
  price: number;
  timestamp?: string;
}

interface Portfolio {
  id?: number;
  name: string;
  initialBalance: number;
  currentBalance: number;
}

interface PortfolioContextType {
  portfolio: Portfolio | null;
  holdings: Holding[];
  transactions: Transaction[];
  loading: boolean;
  isGuestMode: boolean;
  createPortfolio: (name: string, initialBalance: number) => Promise<void>;
  executeTrade: (symbol: string, quantity: number, type: 'buy' | 'sell') => Promise<void>;
  migrateToAccount: () => Promise<void>;
  refreshPortfolio: () => Promise<void>;
}

const PortfolioContext = createContext<PortfolioContextType | undefined>(undefined);

const GUEST_PORTFOLIO_KEY = 'guestPortfolio';
const GUEST_HOLDINGS_KEY = 'guestHoldings';
const GUEST_TRANSACTIONS_KEY = 'guestTransactions';

export function PortfolioProvider({ children }: { children: ReactNode }) {
  const { token, isAuthenticated } = useAuth();
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);

  const isGuestMode = !isAuthenticated && portfolio !== null;

  // Load portfolio on auth change
  useEffect(() => {
    if (isAuthenticated && token) {
      loadAuthenticatedPortfolio();
    } else {
      loadGuestPortfolio();
    }
  }, [isAuthenticated, token]);

  const loadAuthenticatedPortfolio = async () => {
    if (!token) return;

    setLoading(true);
    try {
      const data = await api.getPortfolio(token);
      setPortfolio(data.portfolio);
      setHoldings(data.holdings);

      const txns = await api.getTransactions(token);
      setTransactions(txns);
    } catch (error) {
      console.error('Failed to load portfolio:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadGuestPortfolio = () => {
    const savedPortfolio = localStorage.getItem(GUEST_PORTFOLIO_KEY);
    const savedHoldings = localStorage.getItem(GUEST_HOLDINGS_KEY);
    const savedTransactions = localStorage.getItem(GUEST_TRANSACTIONS_KEY);

    if (savedPortfolio) {
      setPortfolio(JSON.parse(savedPortfolio));
    }
    if (savedHoldings) {
      setHoldings(JSON.parse(savedHoldings));
    }
    if (savedTransactions) {
      setTransactions(JSON.parse(savedTransactions));
    }
  };

  const saveGuestPortfolio = (p: Portfolio, h: Holding[], t: Transaction[]) => {
    localStorage.setItem(GUEST_PORTFOLIO_KEY, JSON.stringify(p));
    localStorage.setItem(GUEST_HOLDINGS_KEY, JSON.stringify(h));
    localStorage.setItem(GUEST_TRANSACTIONS_KEY, JSON.stringify(t));
  };

  const createPortfolio = async (name: string, initialBalance: number) => {
    if (isAuthenticated && token) {
      // Create authenticated portfolio
      const newPortfolio = await api.createPortfolio({ name, initialBalance }, token);
      setPortfolio(newPortfolio);
      setHoldings([]);
      setTransactions([]);
    } else {
      // Create guest portfolio
      const newPortfolio: Portfolio = {
        name,
        initialBalance,
        currentBalance: initialBalance,
      };
      setPortfolio(newPortfolio);
      setHoldings([]);
      setTransactions([]);
      saveGuestPortfolio(newPortfolio, [], []);
    }
  };

  const executeTrade = async (symbol: string, quantity: number, type: 'buy' | 'sell') => {
    if (!portfolio) throw new Error('No portfolio found');

    if (isAuthenticated && token) {
      // Execute authenticated trade
      await api.executeTrade({ symbol, quantity, type }, token);
      await refreshPortfolio();
    } else {
      // Execute guest trade
      const quote = await api.getQuote(symbol);
      const price = quote.price;
      const totalCost = price * quantity;

      let updatedPortfolio = { ...portfolio };
      let updatedHoldings = [...holdings];

      if (type === 'buy') {
        if (portfolio.currentBalance < totalCost) {
          throw new Error('Insufficient balance');
        }

        updatedPortfolio.currentBalance -= totalCost;

        const existingHolding = updatedHoldings.find(h => h.symbol === symbol);
        if (existingHolding) {
          const newQuantity = existingHolding.quantity + quantity;
          const avgPrice = ((existingHolding.purchasePrice * existingHolding.quantity) + (price * quantity)) / newQuantity;
          existingHolding.quantity = newQuantity;
          existingHolding.purchasePrice = avgPrice;
          existingHolding.currentPrice = price;
        } else {
          updatedHoldings.push({
            symbol,
            quantity,
            purchasePrice: price,
            currentPrice: price,
            purchaseDate: new Date().toISOString(),
          });
        }
      } else {
        const holding = updatedHoldings.find(h => h.symbol === symbol);
        if (!holding || holding.quantity < quantity) {
          throw new Error('Insufficient shares to sell');
        }

        updatedPortfolio.currentBalance += totalCost;

        if (holding.quantity === quantity) {
          updatedHoldings = updatedHoldings.filter(h => h.symbol !== symbol);
        } else {
          holding.quantity -= quantity;
          holding.currentPrice = price;
        }
      }

      const newTransaction: Transaction = {
        type,
        symbol,
        quantity,
        price,
        timestamp: new Date().toISOString(),
      };

      const updatedTransactions = [newTransaction, ...transactions];

      setPortfolio(updatedPortfolio);
      setHoldings(updatedHoldings);
      setTransactions(updatedTransactions);
      saveGuestPortfolio(updatedPortfolio, updatedHoldings, updatedTransactions);
    }
  };

  const migrateToAccount = async () => {
    if (!token || !portfolio) return;

    const data = {
      portfolio: {
        name: portfolio.name,
        initialBalance: portfolio.initialBalance,
        currentBalance: portfolio.currentBalance,
      },
      holdings: holdings.map(h => ({
        symbol: h.symbol,
        quantity: h.quantity,
        purchasePrice: h.purchasePrice,
        currentPrice: h.currentPrice,
        purchaseDate: h.purchaseDate,
      })),
      transactions: transactions.map(t => ({
        type: t.type,
        symbol: t.symbol,
        quantity: t.quantity,
        price: t.price,
        timestamp: t.timestamp,
      })),
    };

    await api.migratePortfolio(data, token);

    // Clear guest data
    localStorage.removeItem(GUEST_PORTFOLIO_KEY);
    localStorage.removeItem(GUEST_HOLDINGS_KEY);
    localStorage.removeItem(GUEST_TRANSACTIONS_KEY);

    // Reload authenticated portfolio
    await loadAuthenticatedPortfolio();
  };

  const refreshPortfolio = async () => {
    if (isAuthenticated && token) {
      await loadAuthenticatedPortfolio();
    }
  };

  return (
    <PortfolioContext.Provider
      value={{
        portfolio,
        holdings,
        transactions,
        loading,
        isGuestMode,
        createPortfolio,
        executeTrade,
        migrateToAccount,
        refreshPortfolio,
      }}
    >
      {children}
    </PortfolioContext.Provider>
  );
}

export function usePortfolio() {
  const context = useContext(PortfolioContext);
  if (context === undefined) {
    throw new Error('usePortfolio must be used within a PortfolioProvider');
  }
  return context;
}
