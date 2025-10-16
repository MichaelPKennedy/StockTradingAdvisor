import { useState } from 'react';
import { api } from '../services/api';

interface QuestionnaireProps {
  onComplete: (suggestions: any) => void;
}

export default function AIQuestionnaire({ onComplete }: QuestionnaireProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [answers, setAnswers] = useState({
    riskTolerance: '',
    investmentHorizon: '',
    goals: '',
    budget: '100000',
  });

  const handleNext = () => {
    setStep(step + 1);
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const suggestions = await api.suggestPortfolio(answers);
      onComplete(suggestions);
    } catch (error) {
      console.error('Failed to get suggestions:', error);
      alert('Failed to get AI suggestions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Build Your Portfolio</h2>
          <span className="text-sm text-gray-500">Step {step} of 4</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(step / 4) * 100}%` }}
          ></div>
        </div>
      </div>

      {step === 1 && (
        <div>
          <h3 className="text-xl font-semibold mb-4">What's your investment goal?</h3>
          <p className="text-gray-600 mb-6">This helps us understand what you're trying to achieve.</p>
          <div className="space-y-3">
            {[
              { value: 'Build wealth for retirement', label: 'Long-term growth for retirement' },
              { value: 'Generate passive income', label: 'Income through dividends' },
              { value: 'Grow savings over time', label: 'Steady growth over 3-5 years' },
              { value: 'Learn about investing', label: 'Learn and experiment with paper trading' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  setAnswers({ ...answers, goals: option.value });
                  handleNext();
                }}
                className={`w-full text-left p-4 border-2 rounded-lg hover:border-blue-500 transition-colors ${
                  answers.goals === option.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <h3 className="text-xl font-semibold mb-4">How long do you plan to invest?</h3>
          <p className="text-gray-600 mb-6">Your time horizon affects the types of stocks we recommend.</p>
          <div className="space-y-3">
            {[
              { value: 'short', label: 'Short-term (Less than 1 year)', desc: 'Quick gains, higher risk' },
              { value: 'medium', label: 'Medium-term (1-3 years)', desc: 'Balanced approach' },
              { value: 'long', label: 'Long-term (3+ years)', desc: 'Focus on growth' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  setAnswers({ ...answers, investmentHorizon: option.value });
                  handleNext();
                }}
                className={`w-full text-left p-4 border-2 rounded-lg hover:border-blue-500 transition-colors ${
                  answers.investmentHorizon === option.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
              >
                <div className="font-medium">{option.label}</div>
                <div className="text-sm text-gray-500">{option.desc}</div>
              </button>
            ))}
          </div>
          <button
            onClick={handleBack}
            className="mt-4 text-gray-600 hover:text-gray-900"
          >
            ← Back
          </button>
        </div>
      )}

      {step === 3 && (
        <div>
          <h3 className="text-xl font-semibold mb-4">What's your risk tolerance?</h3>
          <p className="text-gray-600 mb-6">How comfortable are you with potential losses?</p>
          <div className="space-y-3">
            {[
              { value: 'low', label: 'Conservative', desc: 'Prefer stable, lower-risk investments' },
              { value: 'medium', label: 'Moderate', desc: 'Balance between risk and reward' },
              { value: 'high', label: 'Aggressive', desc: 'Willing to take risks for higher returns' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  setAnswers({ ...answers, riskTolerance: option.value });
                  handleNext();
                }}
                className={`w-full text-left p-4 border-2 rounded-lg hover:border-blue-500 transition-colors ${
                  answers.riskTolerance === option.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
              >
                <div className="font-medium">{option.label}</div>
                <div className="text-sm text-gray-500">{option.desc}</div>
              </button>
            ))}
          </div>
          <button
            onClick={handleBack}
            className="mt-4 text-gray-600 hover:text-gray-900"
          >
            ← Back
          </button>
        </div>
      )}

      {step === 4 && (
        <div>
          <h3 className="text-xl font-semibold mb-4">Starting capital</h3>
          <p className="text-gray-600 mb-6">How much paper money do you want to start with?</p>
          <div className="space-y-3">
            {[
              { value: '10000', label: '$10,000' },
              { value: '50000', label: '$50,000' },
              { value: '100000', label: '$100,000' },
              { value: '500000', label: '$500,000' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setAnswers({ ...answers, budget: option.value })}
                className={`w-full text-left p-4 border-2 rounded-lg hover:border-blue-500 transition-colors ${
                  answers.budget === option.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="mt-6 space-y-3">
            <button
              onClick={handleBack}
              className="text-gray-600 hover:text-gray-900"
            >
              ← Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium flex items-center justify-center space-x-2"
            >
              {loading && (
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              <span>{loading ? 'Getting AI Recommendations...' : 'Get AI Recommendations'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
