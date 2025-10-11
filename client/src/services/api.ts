const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface RequestOptions extends RequestInit {
  token?: string;
}

async function request<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { token, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export const api = {
  // Auth
  register: (email: string, password: string) =>
    request<{ token: string; user: any }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  login: (email: string, password: string) =>
    request<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  getCurrentUser: (token: string) =>
    request<any>('/auth/me', { token }),

  // AI
  chat: (messages: any[], token?: string) =>
    request<{ response: string }>('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ messages }),
      token,
    }),

  analyzeRisk: (data: any, token?: string) =>
    request<any>('/ai/analyze-risk', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    }),

  suggestPortfolio: (data: any, token?: string) =>
    request<any>('/ai/suggest-portfolio', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    }),

  // Stocks
  getQuote: (symbol: string) =>
    request<any>(`/stocks/quote/${symbol}`),

  searchStocks: (query: string) =>
    request<any[]>(`/stocks/search?q=${encodeURIComponent(query)}`),

  getCompanyOverview: (symbol: string) =>
    request<any>(`/stocks/overview/${symbol}`),

  // Portfolio
  getPortfolio: (token: string) =>
    request<{ portfolio: any; holdings: any[] }>('/portfolio', { token }),

  createPortfolio: (data: any, token: string) =>
    request<any>('/portfolio', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    }),

  migratePortfolio: (data: any, token: string) =>
    request<any>('/portfolio/migrate', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    }),

  executeTrade: (data: any, token: string) =>
    request<any>('/portfolio/trade', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    }),

  getTransactions: (token: string) =>
    request<any[]>('/portfolio/transactions', { token }),
};
