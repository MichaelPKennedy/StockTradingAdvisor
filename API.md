# API Documentation

Base URL: `http://localhost:3001/api`

## Authentication

### Register
```
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

Response:
{
  "token": "jwt_token_here",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "createdAt": "2025-10-11T..."
  }
}
```

### Login
```
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

Response: Same as register
```

### Get Current User
```
GET /auth/me
Authorization: Bearer {token}

Response:
{
  "id": 1,
  "email": "user@example.com",
  "createdAt": "2025-10-11T..."
}
```

## AI Advisor

All AI routes work for both guest and authenticated users (optional auth).

### Chat
```
POST /ai/chat
Content-Type: application/json

{
  "messages": [
    { "role": "user", "content": "What stocks should I invest in?" }
  ]
}

Response:
{
  "response": "Based on your profile..."
}
```

### Streaming Chat
```
POST /ai/chat/stream
Content-Type: application/json

{
  "messages": [
    { "role": "user", "content": "Explain diversification" }
  ]
}

Response: Server-Sent Events (SSE)
data: {"content": "Diversification"}
data: {"content": " is..."}
data: [DONE]
```

### Analyze Risk Profile
```
POST /ai/analyze-risk
Content-Type: application/json

{
  "age": 30,
  "goals": "Retirement savings",
  "investmentHorizon": "long-term",
  "riskComfort": "moderate"
}

Response:
{
  "riskTolerance": "medium",
  "reasoning": "...",
  "recommendations": ["...", "..."]
}
```

### Suggest Portfolio
```
POST /ai/suggest-portfolio
Content-Type: application/json

{
  "riskTolerance": "medium",
  "investmentHorizon": "long",
  "goals": "Build wealth for retirement",
  "budget": 100000
}

Response:
{
  "stocks": [
    {
      "symbol": "AAPL",
      "name": "Apple Inc.",
      "allocation": 20,
      "reasoning": "..."
    }
  ],
  "overall_strategy": "..."
}
```

## Stocks

No authentication required.

### Get Quote
```
GET /stocks/quote/:symbol

Example: GET /stocks/quote/AAPL

Response:
{
  "symbol": "AAPL",
  "price": 175.43,
  "change": 2.15,
  "changePercent": 1.24,
  "volume": 52847391,
  "timestamp": "2025-10-11T..."
}
```

### Search Symbols
```
GET /stocks/search?q=apple

Response:
[
  {
    "symbol": "AAPL",
    "name": "Apple Inc.",
    "type": "Equity",
    "region": "United States",
    "currency": "USD"
  }
]
```

### Get Company Overview
```
GET /stocks/overview/:symbol

Example: GET /stocks/overview/AAPL

Response:
{
  "symbol": "AAPL",
  "name": "Apple Inc.",
  "description": "...",
  "sector": "Technology",
  "industry": "Consumer Electronics",
  "marketCap": 2800000000000,
  "peRatio": 28.5,
  "dividendYield": 0.52
}
```

### Get Cache Statistics
```
GET /stocks/cache-stats

Response:
{
  "cachedSymbols": 5,
  "cacheExpiryMinutes": 15
}
```

## Portfolio

All portfolio routes require authentication.

### Get Portfolio
```
GET /portfolio
Authorization: Bearer {token}

Response:
{
  "portfolio": {
    "id": 1,
    "userId": 1,
    "name": "My Portfolio",
    "initialBalance": 100000.00,
    "currentBalance": 98500.00,
    "createdAt": "...",
    "updatedAt": "..."
  },
  "holdings": [
    {
      "id": 1,
      "portfolioId": 1,
      "symbol": "AAPL",
      "quantity": 10,
      "purchasePrice": 150.00,
      "currentPrice": 175.43,
      "purchaseDate": "..."
    }
  ]
}
```

### Create Portfolio
```
POST /portfolio
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "My Investment Portfolio",
  "initialBalance": 100000
}

Response:
{
  "id": 1,
  "userId": 1,
  "name": "My Investment Portfolio",
  "initialBalance": 100000.00,
  "currentBalance": 100000.00,
  "createdAt": "...",
  "updatedAt": "..."
}
```

### Migrate Guest Portfolio
```
POST /portfolio/migrate
Authorization: Bearer {token}
Content-Type: application/json

{
  "portfolio": {
    "name": "My Portfolio",
    "initialBalance": 100000,
    "currentBalance": 98500
  },
  "holdings": [
    {
      "symbol": "AAPL",
      "quantity": 10,
      "purchasePrice": 150.00,
      "currentPrice": 175.43
    }
  ],
  "transactions": [
    {
      "type": "buy",
      "symbol": "AAPL",
      "quantity": 10,
      "price": 150.00
    }
  ]
}

Response:
{
  "portfolio": {...},
  "holdings": [...]
}
```

### Execute Trade
```
POST /portfolio/trade
Authorization: Bearer {token}
Content-Type: application/json

{
  "symbol": "AAPL",
  "quantity": 5,
  "type": "buy"
}

Response:
{
  "success": true,
  "message": "Successfully bought 5 shares of AAPL at $175.43",
  "price": 175.43,
  "quantity": 5,
  "total": 877.15
}
```

### Get Transactions
```
GET /portfolio/transactions
Authorization: Bearer {token}

Response:
[
  {
    "id": 1,
    "portfolioId": 1,
    "type": "buy",
    "symbol": "AAPL",
    "quantity": 5,
    "price": 175.43,
    "timestamp": "2025-10-11T..."
  }
]
```

## Error Responses

All endpoints return standard error responses:

```json
{
  "error": "Error message here"
}
```

HTTP Status Codes:
- 200: Success
- 201: Created
- 400: Bad Request (validation error)
- 401: Unauthorized (authentication required)
- 403: Forbidden (invalid token)
- 404: Not Found
- 500: Internal Server Error
