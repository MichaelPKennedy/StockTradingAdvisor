import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePortfolio } from '../context/PortfolioContext';
import { api } from '../services/api';
import AIQuestionnaire from '../components/AIQuestionnaire';

export default function Home() {
  const { isAuthenticated } = useAuth();
  const { createPortfolio, executeTrade } = usePortfolio();
  const navigate = useNavigate();
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const [suggestions, setSuggestions] = useState<any>(null);

  const handleSuggestionsComplete = (aiSuggestions: any) => {
    setSuggestions(aiSuggestions);
  };

  const handleCreatePortfolio = async () => {
    if (!suggestions) return;

    try {
      // Extract budget from suggestions or use default
      const budget = parseFloat(suggestions.budget || '100000');

      // Create portfolio for both guests and authenticated users
      await createPortfolio('AI Recommended Portfolio', budget);

      // Execute trades for each recommended stock based on allocation
      if (suggestions.stocks && Array.isArray(suggestions.stocks)) {
        for (const stock of suggestions.stocks) {
          const allocationAmount = (budget * stock.allocation) / 100;

          // Get current stock price
          const quote = await api.getQuote(stock.symbol);
          const quantity = Math.floor(allocationAmount / quote.price);

          if (quantity > 0) {
            await executeTrade(stock.symbol, quantity, 'buy');
          }
        }
      }

      // Navigate to dashboard
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Error creating portfolio:', error);
      alert('Failed to create portfolio: ' + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
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
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Your AI-Recommended Portfolio</h3>
              <p className="text-gray-600 mb-6">{suggestions.overall_strategy}</p>

              <div className="space-y-4 mb-8">
                {suggestions.stocks?.map((stock: any, idx: number) => (
                  <div key={idx} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="text-lg font-bold text-gray-900">{stock.symbol}</span>
                          <span className="text-gray-600">-</span>
                          <span className="text-gray-700">{stock.name}</span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{stock.reasoning}</p>
                      </div>
                      <div className="ml-4 text-right">
                        <div className="text-2xl font-bold text-blue-600">{stock.allocation}%</div>
                        <div className="text-sm text-gray-500">Allocation</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={handleCreatePortfolio}
                  className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 font-medium"
                >
                  Create Portfolio & Start Trading
                </button>
                <button
                  onClick={() => {
                    setSuggestions(null);
                    setShowQuestionnaire(false);
                  }}
                  className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
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
