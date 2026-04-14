import React, { useState, useEffect } from "react";
import "../styles/dashboard.css";

const SearchHistory = ({ onSelectSearch }) => {
  const [searches, setSearches] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    loadSearchHistory();
  }, []);

  const loadSearchHistory = () => {
    try {
      const history = localStorage.getItem("searchHistory");
      if (history) {
        const parsed = JSON.parse(history);
        setSearches(parsed.slice(0, 5)); // Show last 5 searches
      }
    } catch (e) {
      console.error("Error loading search history:", e);
    }
  };

  const handleClearHistory = () => {
    localStorage.removeItem("searchHistory");
    setSearches([]);
  };

  const addSearch = (keyword, location) => {
    try {
      let history = [];
      const stored = localStorage.getItem("searchHistory");
      if (stored) {
        history = JSON.parse(stored);
      }

      const newSearch = {
        keyword: keyword || "All Jobs",
        location: location || "All Locations",
        timestamp: new Date().toISOString(),
      };

      // Remove duplicates
      history = history.filter(
        (s) =>
          !(
            s.keyword === newSearch.keyword && s.location === newSearch.location
          ),
      );

      // Add to beginning
      history.unshift(newSearch);

      // Keep only last 20
      history = history.slice(0, 20);

      localStorage.setItem("searchHistory", JSON.stringify(history));
      setSearches(history.slice(0, 5));
    } catch (e) {
      console.error("Error saving search history:", e);
    }
  };

  if (searches.length === 0) {
    return null;
  }

  return (
    <div className="search-history-section">
      <div className="history-header">
        <h3>Recent Searches</h3>
        <button
          type="button"
          className="history-toggle"
          onClick={() => setShowHistory(!showHistory)}
        >
          {showHistory ? "Hide" : "Show"}
        </button>
      </div>

      {showHistory && (
        <div className="history-list">
          {searches.map((search, index) => (
            <button
              key={index}
              type="button"
              className="history-item"
              onClick={() => {
                onSelectSearch(search.keyword, search.location);
                setShowHistory(false);
              }}
              title={`${search.keyword} in ${search.location}`}
            >
              <span className="history-icon">🔍</span>
              <span className="history-text">
                {search.keyword}
                {search.location !== "All Locations" && ` • ${search.location}`}
              </span>
            </button>
          ))}
          <button
            type="button"
            className="history-item clear"
            onClick={handleClearHistory}
          >
            <span className="history-icon">🗑️</span>
            <span className="history-text">Clear History</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default SearchHistory;
