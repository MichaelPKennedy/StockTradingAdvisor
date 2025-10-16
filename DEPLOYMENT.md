# Deployment Guide for Railway

This application uses a monorepo structure with separate client and server folders. You need to deploy them as **two separate services** on Railway.

## Prerequisites

1. Railway account
2. GitHub repository connected to Railway
3. MySQL database provisioned on Railway (or external)
4. API keys:
   - Alpha Vantage API key
   - Finnhub API key
   - OpenAI API key

## Step 1: Deploy the Backend Service

1. **Create a new project** in Railway dashboard
2. **Add a new service** → Select "GitHub Repo"
3. **Configure the service:**
   - **Root Directory:** `server`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`

4. **Set Environment Variables:**
   ```
   PORT=3001
   NODE_ENV=production

   # Database
   DATABASE_HOST=your-mysql-host
   DATABASE_PORT=3306
   DATABASE_NAME=stock_trading_advisor
   DATABASE_USER=your-db-user
   DATABASE_PASSWORD=your-db-password

   # API Keys
   ALPHA_VANTAGE_API_KEY=your-alpha-vantage-key
   FINNHUB_API_KEY=your-finnhub-key
   OPENAI_API_KEY=your-openai-key

   # Auth
   JWT_SECRET=your-very-secure-random-jwt-secret
   ```

5. **Deploy** and note the service URL (e.g., `https://your-backend.railway.app`)

## Step 2: Set Up MySQL Database

If you haven't already:

1. **Add MySQL** from Railway's database services
2. **Run migrations** to create tables:
   - Connect to the database using the provided credentials
   - Execute the SQL schema from your database setup files

## Step 3: Deploy the Frontend Service

1. **Add another service** to the same Railway project
2. **Select the same GitHub repo**
3. **Configure the service:**
   - **Root Directory:** `client`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm run preview -- --host 0.0.0.0 --port $PORT`

4. **Set Environment Variables:**
   ```
   VITE_API_URL=https://your-backend.railway.app/api
   ```

   ⚠️ **Important:** Replace `your-backend.railway.app` with your actual backend service URL from Step 1

5. **Deploy** the frontend

## Step 4: Verify Deployment

1. **Check Backend Health:**
   - Visit: `https://your-backend.railway.app/api/health`
   - Should return: `{"status":"ok","message":"Server is running"}`

2. **Test Frontend:**
   - Visit your frontend URL
   - Try creating a guest portfolio
   - Execute a test trade

## Configuration Files

The following files are included for Railway deployment:

- **`railway.json`** - Global Railway configuration
- **`server/railway.toml`** - Backend-specific Railway config
- **`client/railway.toml`** - Frontend-specific Railway config

## CORS Configuration

The backend is configured to accept requests from any origin in the CORS settings. For production, you may want to restrict this to only your frontend domain.

Edit `server/src/index.ts`:
```typescript
app.use(cors({
  origin: 'https://your-frontend.railway.app'
}));
```

## Troubleshooting

### Backend fails to start
- Check that all environment variables are set correctly
- Verify database connection credentials
- Check Railway logs for specific error messages

### Frontend can't connect to backend
- Verify `VITE_API_URL` is set correctly
- Check that backend service is running
- Ensure CORS is configured properly

### Database connection errors
- Verify DATABASE_HOST and credentials
- Check that MySQL service is running
- Ensure database has been initialized with proper schema

### API rate limit errors
- Alpha Vantage: 5 calls/min, 500 calls/day (free tier)
- Finnhub: 60 calls/min (free tier)
- Consider caching strategies or upgrading API plans

## Environment Variables Summary

### Backend Required Variables:
- `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME`, `DATABASE_USER`, `DATABASE_PASSWORD`
- `ALPHA_VANTAGE_API_KEY`
- `FINNHUB_API_KEY`
- `OPENAI_API_KEY`
- `JWT_SECRET`

### Frontend Required Variables:
- `VITE_API_URL` - Must point to your backend service

## Post-Deployment

1. **Test all features:**
   - User registration/login
   - Portfolio creation
   - Stock trading
   - AI advisor
   - Chart visualization

2. **Monitor logs** in Railway dashboard for any errors

3. **Set up custom domains** (optional) for better branding
