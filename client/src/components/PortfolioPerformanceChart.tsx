import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { useEffect, useState } from 'react';

interface PortfolioPerformanceChartProps {
  initialBalance: number;
  currentBalance: number;
  holdings: Array<{
    symbol: string;
    quantity: number;
    purchasePrice: number;
    currentPrice: number;
    purchaseDate?: string;
  }>;
  transactions: Array<{
    type: 'buy' | 'sell';
    symbol: string;
    quantity: number;
    price: number;
    timestamp?: string;
  }>;
}

export default function PortfolioPerformanceChart({
  initialBalance,
  currentBalance,
  holdings,
  transactions
}: PortfolioPerformanceChartProps) {
  const [chartData, setChartData] = useState<any[]>([]);
  const [timeRange, setTimeRange] = useState<'1D' | '5D' | '1M' | '6M' | 'YTD' | '1Y' | '5Y' | 'Max'>('Max');

  useEffect(() => {
    // Check if all transactions are from the same day
    const isSameDay = (dates: Date[]) => {
      if (dates.length <= 1) return true;
      const firstDay = dates[0].toDateString();
      return dates.every(d => d.toDateString() === firstDay);
    };

    // Format date/time based on whether it's same day or not
    const formatDateTime = (dateStr: string, useTimes: boolean) => {
      const date = new Date(dateStr);
      if (useTimes) {
        // Show time for same-day transactions
        return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      } else {
        // Show date for multi-day
        const month = date.toLocaleDateString('en-US', { month: 'short' });
        const day = date.getDate();
        return `${month} ${day}`;
      }
    };

    // Filter data based on time range
    const filterDataByTimeRange = (data: any[], range: typeof timeRange) => {
      if (range === 'Max' || data.length === 0) return data;

      const now = new Date();
      const cutoffDate = new Date();

      switch (range) {
        case '1D':
          cutoffDate.setDate(now.getDate() - 1);
          break;
        case '5D':
          cutoffDate.setDate(now.getDate() - 5);
          break;
        case '1M':
          cutoffDate.setMonth(now.getMonth() - 1);
          break;
        case '6M':
          cutoffDate.setMonth(now.getMonth() - 6);
          break;
        case 'YTD':
          cutoffDate.setMonth(0);
          cutoffDate.setDate(1);
          break;
        case '1Y':
          cutoffDate.setFullYear(now.getFullYear() - 1);
          break;
        case '5Y':
          cutoffDate.setFullYear(now.getFullYear() - 5);
          break;
      }

      return data.filter(point => {
        const pointDate = new Date(point.fullDate);
        return pointDate >= cutoffDate;
      });
    };

    // Calculate portfolio value over time based on transactions
    const calculatePerformance = () => {
      if (transactions.length === 0) {
        // No transactions yet, just show initial balance
        return {
          data: [
            {
              date: 'Now',
              fullDate: new Date().toLocaleDateString(),
              value: initialBalance,
              displayValue: initialBalance.toFixed(2)
            }
          ],
          useTimes: false
        };
      }

      // Sort transactions by date
      const sortedTransactions = [...transactions].sort((a, b) => {
        const dateA = new Date(a.timestamp || 0).getTime();
        const dateB = new Date(b.timestamp || 0).getTime();
        return dateA - dateB;
      });

      // Check if all transactions are from the same day
      const txnDates = sortedTransactions.map(t => new Date(t.timestamp || Date.now()));
      const useTimes = isSameDay(txnDates);

      const dataPoints: any[] = [];
      let runningCash = initialBalance;
      const holdingsMap = new Map<string, { quantity: number; avgPrice: number }>();

      // Process each transaction
      sortedTransactions.forEach((txn, index) => {
        if (txn.type === 'buy') {
          runningCash -= txn.price * txn.quantity;

          const existing = holdingsMap.get(txn.symbol);
          if (existing) {
            const newQuantity = existing.quantity + txn.quantity;
            const newAvgPrice = ((existing.avgPrice * existing.quantity) + (txn.price * txn.quantity)) / newQuantity;
            holdingsMap.set(txn.symbol, { quantity: newQuantity, avgPrice: newAvgPrice });
          } else {
            holdingsMap.set(txn.symbol, { quantity: txn.quantity, avgPrice: txn.price });
          }
        } else {
          runningCash += txn.price * txn.quantity;

          const existing = holdingsMap.get(txn.symbol);
          if (existing) {
            const newQuantity = existing.quantity - txn.quantity;
            if (newQuantity <= 0) {
              holdingsMap.delete(txn.symbol);
            } else {
              holdingsMap.set(txn.symbol, { ...existing, quantity: newQuantity });
            }
          }
        }

        // Calculate current holdings value
        let holdingsValue = 0;
        holdingsMap.forEach((holding, symbol) => {
          const isLatest = index === sortedTransactions.length - 1;
          const currentHolding = holdings.find(h => h.symbol === symbol);
          const price = (isLatest && currentHolding) ? currentHolding.currentPrice : holding.avgPrice;
          holdingsValue += holding.quantity * price;
        });

        const portfolioValue = runningCash + holdingsValue;

        dataPoints.push({
          date: formatDateTime(txn.timestamp || '', useTimes),
          fullDate: new Date(txn.timestamp || Date.now()).toLocaleString(),
          value: portfolioValue,
          displayValue: portfolioValue.toFixed(2)
        });
      });

      // Add current point with latest prices
      const currentHoldingsValue = holdings.reduce((sum, h) => sum + (h.currentPrice * h.quantity), 0);
      const currentPortfolioValue = currentBalance + currentHoldingsValue;

      dataPoints.push({
        date: useTimes ? 'Now' : formatDateTime(new Date().toISOString(), false),
        fullDate: new Date().toLocaleString(),
        value: currentPortfolioValue,
        displayValue: currentPortfolioValue.toFixed(2)
      });

      return { data: dataPoints, useTimes };
    };

    const result = calculatePerformance();
    const filteredData = filterDataByTimeRange(result.data, timeRange);
    setChartData(filteredData);
  }, [initialBalance, currentBalance, holdings, transactions, timeRange]);

  const currentValue = chartData[chartData.length - 1]?.value || initialBalance;
  const totalChange = currentValue - initialBalance;
  const totalChangePercent = ((totalChange / initialBalance) * 100);

  // Determine if we should skip some dates based on data point count
  const getTickInterval = () => {
    if (chartData.length <= 5) return 0; // Show all
    if (chartData.length <= 10) return 1; // Skip every other
    if (chartData.length <= 20) return 2; // Skip 2
    return Math.floor(chartData.length / 6); // Show ~6 dates
  };

  const isPositive = totalChange >= 0;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-2">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Portfolio Performance</h3>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-gray-900">
            ${currentValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className={`text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {isPositive ? '+' : ''}${Math.abs(totalChange).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({totalChangePercent.toFixed(2)}%)
          </div>
        </div>
      </div>

      <div className="flex justify-start space-x-1 mb-4">
        {(['1D', '5D', '1M', '6M', 'YTD', '1Y', '5Y', 'Max'] as const).map((range) => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
              timeRange === range
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {range}
          </button>
        ))}
      </div>

      {chartData.length > 1 && (
        <div className="h-80 mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity={0}/>
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
                tick={{ fontSize: 11, fill: '#6b7280' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                domain={['dataMin - 1000', 'dataMax + 1000']}
                width={60}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-gray-900 text-white px-3 py-2 rounded shadow-lg text-sm">
                        <div className="font-semibold">${payload[0].payload.displayValue}</div>
                        <div className="text-xs text-gray-300">{payload[0].payload.fullDate}</div>
                      </div>
                    );
                  }
                  return null;
                }}
                cursor={{ stroke: '#9ca3af', strokeWidth: 1, strokeDasharray: '3 3' }}
              />
              <ReferenceLine y={initialBalance} stroke="#9ca3af" strokeDasharray="3 3" strokeWidth={1} />
              <Area
                type="monotone"
                dataKey="value"
                stroke={isPositive ? "#10b981" : "#ef4444"}
                strokeWidth={2}
                fill="url(#colorValue)"
                dot={false}
                activeDot={{ r: 4, fill: isPositive ? "#10b981" : "#ef4444" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {chartData.length <= 1 && (
        <div className="h-64 flex items-center justify-center text-gray-500 border-t border-gray-200 mt-4">
          <div className="text-center">
            <p className="mb-2">No trading activity yet</p>
            <p className="text-sm">Make your first trade to see performance over time</p>
          </div>
        </div>
      )}
    </div>
  );
}
