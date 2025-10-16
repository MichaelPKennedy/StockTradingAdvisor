import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePortfolio } from '../context/PortfolioContext';
import StockAutocomplete from '../components/StockAutocomplete';
import StockDetailModal from '../components/StockDetailModal';
import PortfolioPerformanceChart from '../components/PortfolioPerformanceChart';

export default function Dashboard() {
  const { user, logout, isAuthenticated } = useAuth();
  const { portfolio, holdings, transactions, createPortfolio, executeTrade, refreshPortfolio, isGuestMode } = usePortfolio();
  const navigate = useNavigate();
  const [showCreatePortfolio, setShowCreatePortfolio] = useState(false);
  const [showTrade, setShowTrade] = useState(false);
  const [tradeSymbol, setTradeSymbol] = useState('');
  const [tradeQuantity, setTradeQuantity] = useState('');
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedStock, setSelectedStock] = useState<string | null>(null);

  useEffect(() => {
    if (!portfolio) {
      setShowCreatePortfolio(true);
    }
  }, [portfolio]);

  const handleCreatePortfolio = async () => {
    try {
      await createPortfolio('My Portfolio', 100000);
      setShowCreatePortfolio(false);
      setSuccess('Portfolio created successfully!');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleTrade = async () => {
    setError('');
    setSuccess('');

    try {
      await executeTrade(tradeSymbol.toUpperCase(), parseFloat(tradeQuantity), tradeType);
      setSuccess(`Successfully ${tradeType === 'buy' ? 'bought' : 'sold'} ${tradeQuantity} shares of ${tradeSymbol.toUpperCase()}!`);
      setShowTrade(false);
      setTradeSymbol('');
      setTradeQuantity('');
      await refreshPortfolio();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const totalValue = holdings.reduce((sum, h) => sum + (h.currentPrice * h.quantity), 0);
  const cashBalance = portfolio?.currentBalance || 0;
  const portfolioValue = totalValue + cashBalance;

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="text-xl font-bold text-gray-900">
                Stock Trading Advisor
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              {isAuthenticated ? (
                <>
                  <span className="text-sm text-gray-700">{user?.email}</span>
                  <button
                    onClick={logout}
                    className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isGuestMode && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="font-medium text-blue-900">You're using a guest portfolio</p>
                  <p className="text-sm text-blue-700">Sign up to save your portfolio and access it from any device</p>
                </div>
              </div>
              <Link
                to="/register"
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 font-medium whitespace-nowrap"
              >
                Sign Up to Save
              </Link>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 bg-green-50 border border-green-400 text-green-700 px-4 py-3 rounded">
            {success}
          </div>
        )}

        {showCreatePortfolio ? (
          <div className="bg-white shadow sm:rounded-lg p-6 max-w-md mx-auto mt-20">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Create Your Portfolio</h2>
            <p className="text-gray-600 mb-6">
              Start with $100,000 in paper money to practice trading
            </p>
            <button
              onClick={handleCreatePortfolio}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Create Portfolio
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 mb-8">
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <dt className="text-sm font-medium text-gray-500 truncate">Portfolio Value</dt>
                  <dd className="mt-1 text-3xl font-semibold text-gray-900">
                    ${portfolioValue.toFixed(2)}
                  </dd>
                </div>
              </div>
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <dt className="text-sm font-medium text-gray-500 truncate">Cash Balance</dt>
                  <dd className="mt-1 text-3xl font-semibold text-gray-900">
                    ${cashBalance.toFixed(2)}
                  </dd>
                </div>
              </div>
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <dt className="text-sm font-medium text-gray-500 truncate">Holdings Value</dt>
                  <dd className="mt-1 text-3xl font-semibold text-gray-900">
                    ${totalValue.toFixed(2)}
                  </dd>
                </div>
              </div>
            </div>

            {portfolio && (
              <PortfolioPerformanceChart
                initialBalance={portfolio.initialBalance}
                currentBalance={portfolio.currentBalance}
                holdings={holdings}
                transactions={transactions}
              />
            )}

            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Your Holdings</h3>
                <button
                  onClick={() => setShowTrade(!showTrade)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700"
                >
                  Trade Stocks
                </button>
              </div>

              {showTrade && (
                <div className="border-b border-gray-200 bg-gray-50 px-4 py-4">
                  <div className="grid grid-cols-4 gap-4">
                    <StockAutocomplete
                      value={tradeSymbol}
                      onChange={setTradeSymbol}
                      placeholder="Symbol (e.g., AAPL)"
                    />
                    <input
                      type="number"
                      placeholder="Quantity"
                      value={tradeQuantity}
                      onChange={(e) => setTradeQuantity(e.target.value)}
                      className="border border-gray-300 rounded-md px-3 py-2"
                    />
                    <select
                      value={tradeType}
                      onChange={(e) => setTradeType(e.target.value as 'buy' | 'sell')}
                      className="border border-gray-300 rounded-md px-3 py-2"
                    >
                      <option value="buy">Buy</option>
                      <option value="sell">Sell</option>
                    </select>
                    <button
                      onClick={handleTrade}
                      className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                    >
                      Execute Trade
                    </button>
                  </div>
                </div>
              )}

              <div className="px-4 py-5 sm:p-6">
                {holdings.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">
                    No holdings yet. Start trading to build your portfolio!
                  </p>
                ) : (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Symbol
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Quantity
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Avg Price
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Current Price
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Today's Change
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Value
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Gain/Loss
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {holdings.map((holding, idx) => {
                        const totalValue = holding.currentPrice * holding.quantity;
                        const totalCost = holding.purchasePrice * holding.quantity;
                        const gainLoss = totalValue - totalCost;
                        const gainLossPercent = (gainLoss / totalCost) * 100;

                        // Today's change from the quote data (changePercent)
                        const todayChange = holding.changePercent || 0;

                        return (
                          <tr
                            key={idx}
                            onClick={() => setSelectedStock(holding.symbol)}
                            className="hover:bg-gray-50 cursor-pointer transition-colors"
                          >
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600 hover:text-blue-800">
                              {holding.symbol}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {holding.quantity}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              ${holding.purchasePrice.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              ${holding.currentPrice.toFixed(2)}
                            </td>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                              todayChange >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {todayChange >= 0 ? '+' : ''}{todayChange.toFixed(2)}%
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              ${totalValue.toFixed(2)}
                            </td>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                              gainLoss >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              ${gainLoss.toFixed(2)} ({gainLossPercent.toFixed(2)}%)
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </>
        )}
      </main>

      {selectedStock && (
        <StockDetailModal
          symbol={selectedStock}
          onClose={() => setSelectedStock(null)}
        />
      )}
    </div>
  );
}
