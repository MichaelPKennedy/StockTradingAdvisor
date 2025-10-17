import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '../services/api';

interface StockDetailModalProps {
  symbol: string;
  onClose: () => void;
}

export default function StockDetailModal({ symbol, onClose }: StockDetailModalProps) {
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [period, setPeriod] = useState<'1W' | '1M' | '3M' | '1Y' | 'Max'>('1M');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Determine tick interval based on data point count
  const getTickInterval = () => {
    if (historicalData.length <= 5) return 0; // Show all
    if (historicalData.length <= 10) return 1; // Skip every other
    if (historicalData.length <= 20) return 2; // Skip 2
    return Math.floor(historicalData.length / 6); // Show ~6 dates
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        // Determine which API period to use based on time range
        let apiPeriod: 'daily' | 'weekly' | 'monthly' = 'daily';
        let dataPoints = 100;

        if (period === '1W') {
          apiPeriod = 'daily';
          dataPoints = 7; // 1 week of daily data
        } else if (period === '1M') {
          apiPeriod = 'daily';
          dataPoints = 30; // 1 month of daily data
        } else if (period === '3M') {
          apiPeriod = 'daily';
          dataPoints = 90; // 3 months of daily data
        } else if (period === '1Y') {
          apiPeriod = 'weekly';
          dataPoints = 52; // 1 year of weekly data
        } else if (period === 'Max') {
          apiPeriod = 'monthly';
          dataPoints = 100; // All available monthly data
        }

        const data = await api.getHistoricalData(symbol, apiPeriod);
        const limitedData = data.slice(-dataPoints);

        // Format dates based on the API period
        const formattedData = limitedData.map((point: any) => {
          const date = new Date(point.date);
          let formattedDate = point.date;

          if (apiPeriod === 'daily') {
            // Show month and day for daily (e.g., "Jan 15")
            formattedDate = date.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric'
            });
          } else if (apiPeriod === 'weekly') {
            // Show month and day for weekly (e.g., "Jan 15")
            formattedDate = date.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric'
            });
          } else if (apiPeriod === 'monthly') {
            // Show month and year for monthly (e.g., "Jan 2024")
            formattedDate = date.toLocaleDateString('en-US', {
              month: 'short',
              year: 'numeric'
            });
          }

          return {
            ...point,
            date: formattedDate,
            fullDate: date.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })
          };
        });

        setHistoricalData(formattedData);
      } catch (err: any) {
        const errorMessage = err.message || 'Failed to load chart data';
        if (errorMessage.includes('limit') || errorMessage.includes('rate')) {
          setError('API limit reached. Historical charts are temporarily unavailable. Please try again later.');
        } else {
          setError('Failed to load chart data. Please try again later.');
        }
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [symbol, period]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">{symbol} Price Chart</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
            >
              ×
            </button>
          </div>

          <div className="mb-4 flex space-x-1">
            {(['1W', '1M', '3M', '1Y', 'Max'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setPeriod(range)}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                  period === range
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {range}
              </button>
            ))}
          </div>

          {loading && (
            <div className="flex items-center justify-center h-64">
              <svg
                className="animate-spin h-8 w-8 text-blue-600"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {!loading && !error && historicalData.length > 0 && (
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={historicalData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorStockPrice" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    tickLine={false}
                    axisLine={false}
                    interval={getTickInterval()}
                    height={30}
                  />
                  <YAxis
                    domain={['auto', 'auto']}
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `$${value.toFixed(0)}`}
                    width={60}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-gray-900 text-white px-3 py-2 rounded shadow-lg text-sm">
                            <div className="font-semibold">${payload[0].value?.toFixed(2)}</div>
                            <div className="text-xs text-gray-300">{payload[0].payload.date}</div>
                          </div>
                        );
                      }
                      return null;
                    }}
                    cursor={{ stroke: '#9ca3af', strokeWidth: 1, strokeDasharray: '3 3' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="close"
                    stroke="#2563eb"
                    strokeWidth={2}
                    fill="url(#colorStockPrice)"
                    dot={false}
                    activeDot={{ r: 4, fill: "#2563eb" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {!loading && !error && historicalData.length > 0 && (
            <div className="mt-6 grid grid-cols-4 gap-4">
              <div className="bg-gray-50 p-4 rounded">
                <div className="text-sm text-gray-500">Latest Price</div>
                <div className="text-xl font-bold text-gray-900">
                  ${historicalData[historicalData.length - 1].close.toFixed(2)}
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded">
                <div className="text-sm text-gray-500">High</div>
                <div className="text-xl font-bold text-gray-900">
                  ${Math.max(...historicalData.map(d => d.high)).toFixed(2)}
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded">
                <div className="text-sm text-gray-500">Low</div>
                <div className="text-xl font-bold text-gray-900">
                  ${Math.min(...historicalData.map(d => d.low)).toFixed(2)}
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded">
                <div className="text-sm text-gray-500">Avg Volume</div>
                <div className="text-xl font-bold text-gray-900">
                  {(historicalData.reduce((sum, d) => sum + d.volume, 0) / historicalData.length / 1000000).toFixed(2)}M
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
