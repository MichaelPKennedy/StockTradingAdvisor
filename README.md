# Stock Trading Advisor

An AI-powered paper trading platform that helps users learn about stock investing through an intelligent advisor.

## Features

- **AI Stock Advisor**: Interactive chatbot that helps assess risk tolerance and suggests portfolios
- **Paper Trading**: Practice trading with virtual money (no real money involved)
- **Guest Mode**: Try the platform without creating an account
- **Portfolio Management**: Track your virtual stocks and performance
- **Real-time Stock Data**: 15-minute delayed quotes from Alpha Vantage API
- **Account Creation**: Save your portfolio by creating an account when ready

## Tech Stack

### Frontend
- React 18 with TypeScript
- Vite for fast development
- TailwindCSS for styling
- React Router for navigation
- React Context API for state management

### Backend
- Node.js with Express
- TypeScript
- MySQL database
- JWT authentication
- OpenAI GPT-4o-mini for AI advisor
- Alpha Vantage API for stock data

### Project Structure
```
stock-trading-advisor/
├── client/          # React frontend
├── server/          # Express backend
└── shared/          # Shared TypeScript types
```

## Getting Started

### Prerequisites
- Node.js 18+
- MySQL 8+
- Alpha Vantage API key (free tier: https://www.alphavantage.co/support/#api-key)
- OpenAI API key (https://platform.openai.com/api-keys)

### Database Setup

1. Create MySQL database:
```bash
mysql -u root -p
```

2. Run the schema:
```bash
mysql -u root -p < server/schema.sql
```

### Backend Setup

1. Navigate to server directory:
```bash
cd server
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file (copy from `.env.example`):
```bash
cp .env.example .env
```

4. Update `.env` with your credentials:
```env
PORT=3001
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=stock_trading_advisor
JWT_SECRET=your_secret_key
ALPHA_VANTAGE_API_KEY=your_api_key
OPENAI_API_KEY=your_api_key
```

5. Start development server:
```bash
npm run dev
```

Server will run on http://localhost:3001

### Frontend Setup

1. Navigate to client directory:
```bash
cd client
```

2. Install dependencies:
```bash
npm install
```

3. Start development server:
```bash
npm run dev
```

Frontend will run on http://localhost:5173

## Architecture Overview

### Guest to Authenticated Flow

1. **Guest Mode**: Users can interact with AI advisor and build portfolios (stored in LocalStorage)
2. **Account Trigger**: When user wants to save portfolio, they're prompted to create account
3. **Migration**: Portfolio data migrates from LocalStorage to MySQL database
4. **Authenticated Mode**: User can now access portfolio across devices

### API Caching Strategy

**Alpha Vantage**:
- Free tier: 25 API calls/day
- Cache: 15-minute in-memory cache per stock symbol
- Sufficient for 1-2 concurrent users

**OpenAI**:
- Using GPT-4o-mini for cost efficiency
- Streaming responses for better UX
- 500 token limit per response

## Development Notes

### Running Both Services

Terminal 1 (Backend):
```bash
cd server && npm run dev
```

Terminal 2 (Frontend):
```bash
cd client && npm run dev
```

### Building for Production

Backend:
```bash
cd server
npm run build
npm start
```

Frontend:
```bash
cd client
npm run build
```

## API Endpoints (To Be Implemented)

### Authentication
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### AI Advisor
- `POST /api/ai/chat` - Chat with AI advisor
- `POST /api/ai/analyze-risk` - Analyze risk profile
- `POST /api/ai/suggest-portfolio` - Get portfolio suggestions

### Stocks
- `GET /api/stocks/quote/:symbol` - Get stock quote
- `GET /api/stocks/search?q=query` - Search stocks
- `GET /api/stocks/overview/:symbol` - Get company info

### Portfolio
- `GET /api/portfolio` - Get user's portfolio
- `POST /api/portfolio` - Create portfolio
- `POST /api/portfolio/migrate` - Migrate guest portfolio
- `POST /api/portfolio/trade` - Execute trade
- `GET /api/portfolio/transactions` - Get transaction history

## Next Steps

1. Implement authentication routes and middleware
2. Create portfolio management endpoints
3. Build React components and pages
4. Implement LocalStorage guest mode
5. Create portfolio migration logic
6. Add portfolio performance calculations
7. Build AI chat interface
8. Add stock search and quote display
9. Implement trade execution
10. Create dashboard with charts

## License

MIT
