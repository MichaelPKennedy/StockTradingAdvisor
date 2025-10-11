-- Create database
CREATE DATABASE IF NOT EXISTS StockAdvisor;
USE StockAdvisor;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_email (email)
);

-- AI Preferences table
CREATE TABLE IF NOT EXISTS ai_preferences (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  risk_tolerance ENUM('low', 'medium', 'high') NOT NULL,
  investment_horizon ENUM('short', 'medium', 'long') NOT NULL,
  goals TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id)
);

-- Portfolios table
CREATE TABLE IF NOT EXISTS portfolios (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NULL,
  name VARCHAR(255) NOT NULL,
  initial_balance DECIMAL(15, 2) NOT NULL DEFAULT 100000.00,
  current_balance DECIMAL(15, 2) NOT NULL DEFAULT 100000.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id)
);

-- Holdings table
CREATE TABLE IF NOT EXISTS holdings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  portfolio_id INT NOT NULL,
  symbol VARCHAR(10) NOT NULL,
  quantity DECIMAL(15, 4) NOT NULL,
  purchase_price DECIMAL(15, 2) NOT NULL,
  current_price DECIMAL(15, 2) NOT NULL,
  purchase_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON DELETE CASCADE,
  INDEX idx_portfolio_id (portfolio_id),
  INDEX idx_symbol (symbol)
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  portfolio_id INT NOT NULL,
  type ENUM('buy', 'sell') NOT NULL,
  symbol VARCHAR(10) NOT NULL,
  quantity DECIMAL(15, 4) NOT NULL,
  price DECIMAL(15, 2) NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON DELETE CASCADE,
  INDEX idx_portfolio_id (portfolio_id),
  INDEX idx_symbol (symbol),
  INDEX idx_timestamp (timestamp)
);

-- Chat history table (optional, for storing AI conversations)
CREATE TABLE IF NOT EXISTS chat_history (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NULL,
  role ENUM('user', 'assistant', 'system') NOT NULL,
  content TEXT NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_timestamp (timestamp)
);
