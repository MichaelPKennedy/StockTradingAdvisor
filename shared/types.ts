// User types
export interface User {
  id: number;
  email: string;
  createdAt: Date;
}

export interface UserRegistration {
  email: string;
  password: string;
}

export interface UserLogin {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

// AI Advisor types
export interface AIPreferences {
  id: number;
  userId: number;
  riskTolerance: 'low' | 'medium' | 'high';
  investmentHorizon: 'short' | 'medium' | 'long';
  goals: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export interface AIRecommendation {
  symbol: string;
  allocation: number; // percentage
  reasoning: string;
}

// Portfolio types
export interface Portfolio {
  id: number;
  userId: number | null; // null for guest users
  name: string;
  initialBalance: number;
  currentBalance: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Holding {
  id: number;
  portfolioId: number;
  symbol: string;
  quantity: number;
  purchasePrice: number;
  currentPrice: number;
  purchaseDate: Date;
}

export interface Transaction {
  id: number;
  portfolioId: number;
  type: 'buy' | 'sell';
  symbol: string;
  quantity: number;
  price: number;
  timestamp: Date;
}

// Stock data types
export interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: Date;
}

export interface StockDetails {
  symbol: string;
  name: string;
  description: string;
  sector: string;
  marketCap: number;
}

// Guest portfolio migration
export interface GuestPortfolioData {
  portfolio: Omit<Portfolio, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;
  holdings: Omit<Holding, 'id' | 'portfolioId'>[];
  transactions: Omit<Transaction, 'id' | 'portfolioId'>[];
}
