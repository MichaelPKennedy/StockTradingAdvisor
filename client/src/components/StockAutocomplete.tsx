import { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';

interface StockAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (symbol: string) => void;
  placeholder?: string;
}

interface SearchResult {
  symbol: string;
  name: string;
  type?: string;
  region?: string;
}

export default function StockAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = 'Symbol (e.g., AAPL)'
}: StockAutocompleteProps) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const searchStocks = async () => {
      if (value.length < 1) {
        setResults([]);
        setShowDropdown(false);
        return;
      }

      setLoading(true);
      try {
        const searchResults = await api.searchStocks(value);
        setResults(searchResults.slice(0, 8)); // Limit to 8 results
        setShowDropdown(searchResults.length > 0);
      } catch (error) {
        console.error('Search failed:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchStocks, 300);
    return () => clearTimeout(debounceTimer);
  }, [value]);

  const handleSelect = (result: SearchResult) => {
    onChange(result.symbol);
    setShowDropdown(false);
    if (onSelect) {
      onSelect(result.symbol);
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        className="border border-gray-300 rounded-md px-3 py-2 w-full"
      />

      {loading && (
        <div className="absolute right-3 top-3">
          <svg className="animate-spin h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      )}

      {showDropdown && results.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          {results.map((result, idx) => (
            <button
              key={idx}
              onClick={() => handleSelect(result)}
              className="w-full text-left px-4 py-2 hover:bg-blue-50 flex justify-between items-center"
            >
              <div className="flex-1">
                <div className="font-semibold text-gray-900">{result.symbol}</div>
                <div className="text-sm text-gray-600 truncate">{result.name}</div>
              </div>
              {result.region && (
                <span className="text-xs text-gray-500 ml-2">{result.region}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
