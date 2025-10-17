import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePortfolio } from '../context/PortfolioContext';
import { api } from '../services/api';
import AIQuestionnaire from '../components/AIQuestionnaire';
import Toast from '../components/Toast';

export default function Home() {
  const { isAuthenticated } = useAuth();
  const { createPortfolio, batchExecuteTrades } = usePortfolio();
  const navigate = useNavigate();
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const [suggestions, setSuggestions] = useState<any>(null);
  const [selectedStocks, setSelectedStocks] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const handleSuggestionsComplete = (aiSuggestions: any) => {
    setSuggestions(aiSuggestions);
    // Select all stocks by default
    if (aiSuggestions.stocks) {
      setSelectedStocks(new Set(aiSuggestions.stocks.map((s: any) => s.symbol)));
    }
  };

  const toggleStockSelection = (symbol: string) => {
    const newSelected = new Set(selectedStocks);
    if (newSelected.has(symbol)) {
      newSelected.delete(symbol);
    } else {
      newSelected.add(symbol);
    }
    setSelectedStocks(newSelected);
  };

  const handleCreatePortfolio = async () => {
    if (!suggestions) return;

    try {
      // Extract budget from suggestions or use default
      const budget = parseFloat(suggestions.budget || '100000');

      // Prepare trades only for selected stocks
      if (suggestions.stocks && Array.isArray(suggestions.stocks)) {
        const selectedStocksList = suggestions.stocks.filter((stock: any) =>
          selectedStocks.has(stock.symbol)
        );

        // Recalculate allocations to total 100% for selected stocks only
        const totalSelectedAllocation = selectedStocksList.reduce(
          (sum: number, stock: any) => sum + stock.allocation,
          0
        );

        const trades = [];
        const skippedStocks = [];

        for (const stock of selectedStocksList) {
          try {
            // Normalize allocation based on selected stocks
            const normalizedAllocation = (stock.allocation / totalSelectedAllocation) * 100;
            const allocationAmount = (budget * normalizedAllocation) / 100;

            // Get current stock price
            const quote = await api.getQuote(stock.symbol);
            const quantity = Math.floor(allocationAmount / quote.price);

            if (quantity > 0) {
              trades.push({
                symbol: stock.symbol,
                quantity,
                type: 'buy' as const,
              });
            } else {
              skippedStocks.push(stock.symbol);
            }
          } catch (error) {
            console.error(`Failed to get quote for ${stock.symbol}:`, error);
            skippedStocks.push(stock.symbol);
          }
        }

        // Create portfolio FIRST and get the created portfolio object
        const newPortfolio = await createPortfolio('AI Recommended Portfolio', budget);

        // Execute all trades in a single batch, passing the newly created portfolio
        if (trades.length > 0) {
          await batchExecuteTrades(trades, newPortfolio);
          setToast({
            message: `Portfolio created with ${trades.length} stock${trades.length > 1 ? 's' : ''}!`,
            type: 'success',
          });
        }

        if (skippedStocks.length > 0) {
          setToast({
            message: `Note: ${skippedStocks.join(', ')} could not be purchased`,
            type: 'info',
          });
        }
      } else {
        // No stocks selected, just create empty portfolio
        await createPortfolio('AI Recommended Portfolio', budget);
      }

      // Navigate to dashboard after a brief delay to show toast
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (error: any) {
      console.error('Error creating portfolio:', error);
      const errorMessage = error.message || 'Failed to create portfolio';

      // Check if it's a rate limit error
      if (errorMessage.includes('rate limit')) {
        setToast({
          message: 'Alpha Vantage API rate limit reached. Please wait a minute and try again.',
          type: 'error',
        });
      } else {
        setToast({
          message: errorMessage,
          type: 'error',
        });
      }
    }
  };

  const handleSkipToManualPortfolio = () => {
    // Create empty portfolio and go to dashboard for manual trading
    const budget = parseFloat(suggestions?.budget || '100000');
    createPortfolio('My Portfolio', budget)
      .then(() => navigate('/dashboard'))
      .catch((error) => {
        console.error('Error creating portfolio:', error);
        alert('Failed to create portfolio: ' + error.message);
      });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">Stock Trading Advisor</h1>
            </div>
            <div className="flex items-center space-x-4">
              {isAuthenticated ? (
                <Link
                  to="/dashboard"
                  className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
                >
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Sign in
                  </Link>
                  <Link
                    to="/register"
                    className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
            AI-Powered Stock Trading
          </h2>
          <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
            Get personalized portfolio recommendations from our AI advisor. Practice with paper money, no risk involved.
          </p>
        </div>

        {!showQuestionnaire && !suggestions && (
          <div className="max-w-2xl mx-auto text-center">
            <div className="bg-white rounded-lg shadow-lg p-12">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Build Your Perfect Portfolio
              </h3>
              <p className="text-gray-600 mb-8">
                Answer a few quick questions and our AI will recommend stocks tailored to your goals and risk tolerance.
              </p>
              <button
                onClick={() => setShowQuestionnaire(true)}
                className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 font-medium text-lg"
              >
                Get Started
              </button>
            </div>
          </div>
        )}

        {showQuestionnaire && !suggestions && (
          <AIQuestionnaire onComplete={handleSuggestionsComplete} />
        )}

        {suggestions && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-lg p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Your AI-Recommended Portfolio</h3>
              <p className="text-gray-600 mb-6">{suggestions.overall_strategy}</p>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-900 font-medium">
                  Select which stocks you'd like to include in your portfolio, or skip to create your own manually.
                </p>
              </div>

              <div className="space-y-3 mb-8">
                {suggestions.stocks?.map((stock: any, idx: number) => (
                  <div
                    key={idx}
                    className={`border-2 rounded-lg p-4 transition-all cursor-pointer ${
                      selectedStocks.has(stock.symbol)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                    onClick={() => toggleStockSelection(stock.symbol)}
                  >
                    <div className="flex items-start space-x-4">
                      <div className="flex items-center pt-1">
                        <input
                          type="checkbox"
                          checked={selectedStocks.has(stock.symbol)}
                          onChange={() => toggleStockSelection(stock.symbol)}
                          className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="text-lg font-bold text-gray-900">{stock.symbol}</span>
                          <span className="text-gray-600">-</span>
                          <span className="text-gray-700">{stock.name}</span>
                        </div>
                        <p className="text-sm text-gray-600">{stock.reasoning}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-blue-600">{stock.allocation}%</div>
                        <div className="text-xs text-gray-500">Suggested</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {selectedStocks.size === 0 && (
                <div className="mb-4 bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded">
                  Please select at least one stock or skip to create a manual portfolio.
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <button
                  onClick={handleCreatePortfolio}
                  disabled={selectedStocks.size === 0}
                  className="bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create with Selected ({selectedStocks.size})
                </button>
                <button
                  onClick={handleSkipToManualPortfolio}
                  className="bg-gray-600 text-white py-3 px-6 rounded-lg hover:bg-gray-700 font-medium"
                >
                  Skip & Build Manually
                </button>
                <button
                  onClick={() => {
                    setSuggestions(null);
                    setShowQuestionnaire(false);
                    setSelectedStocks(new Set());
                  }}
                  className="px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Start Over
                </button>
              </div>
              {!isAuthenticated && (
                <p className="mt-4 text-sm text-gray-500 text-center">
                  You can start trading right away! Sign up later to save your portfolio.
                </p>
              )}
            </div>
          </div>
        )}

        <div className="mt-12 text-center">
          <p className="text-sm text-gray-600">
            Data is delayed by 15 minutes. This is for educational purposes only.
          </p>
        </div>
      </main>
    </div>
  );
}
