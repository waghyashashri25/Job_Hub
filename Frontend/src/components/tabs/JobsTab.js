import React, { useState, useMemo } from "react";
import JobCard from "../JobCard";
import "../../styles/tabs.css";

const JobsTab = ({
  jobs,
  allJobs,
  savedJobIds,
  sources,
  loading,
  isSearching,
  onSearch,
  onClearSearch,
  onSaveJob,
  onApply,
  userSkills = [],
}) => {
  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("");
  const [selectedSource, setSelectedSource] = useState("");
  const [lastSearch, setLastSearch] = useState({
    keyword: "",
    location: "",
  });

  const handleSearchClick = () => {
    if (!keyword && !location && !selectedSource) {
      // If all empty, load all jobs
      setLastSearch({ keyword: "", location: "" });
      onClearSearch();
      return;
    }
    setLastSearch({ keyword, location });
    onSearch(keyword, location, selectedSource);
  };

  const handleClearFilters = () => {
    setKeyword("");
    setLocation("");
    setSelectedSource("");
    setLastSearch({ keyword: "", location: "" });
    onClearSearch();
  };

  // Generate intelligent suggestions based on search
  const searchSuggestion = useMemo(() => {
    if (!lastSearch.keyword && !lastSearch.location) {
      return null;
    }

    const kw = lastSearch.keyword.toLowerCase();
    const loc = lastSearch.location.toLowerCase();

    let suggestion = "";
    let icon = "💡";

    if (kw.includes("intern")) {
      suggestion = "Try searching for 'entry-level' or 'fresher' roles too!";
    } else if (kw.includes("fresher")) {
      suggestion =
        "Explore 'graduate' and 'junior' positions for more opportunities!";
    } else if (kw.includes("developer")) {
      suggestion =
        "Filter by your preferred tech stack (React, Java, Python, etc.)";
    } else if (kw.includes("remote")) {
      suggestion =
        "Found remote jobs! Most support flexible work arrangements.";
    } else if (kw === "job" || kw === "jobs") {
      suggestion =
        "Browse jobs from all categories. Refine your search to narrow down results.";
    }

    if (loc && suggestion) {
      suggestion += ` in ${loc}`;
    }

    return suggestion ? { text: suggestion, icon } : null;
  }, [lastSearch]);

  return (
    <div className="jobs-tab">
      {/* Header */}
      <div className="tab-header">
        <h1>Find Your Next Opportunity</h1>
        <p className="subtitle">
          Search across all job platforms and find the perfect match
        </p>
      </div>

      {/* Search & Filter Bar */}
      <div className="search-section">
        <div className="search-inputs">
          <div className="input-group">
            <label htmlFor="keyword">Job Title or Keyword</label>
            <input
              id="keyword"
              type="text"
              placeholder="e.g., React Developer, internship, fresher, job"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSearchClick()}
            />
          </div>

          <div className="input-group">
            <label htmlFor="location">Location</label>
            <input
              id="location"
              type="text"
              placeholder="e.g., Mumbai, Remote, SF"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSearchClick()}
            />
          </div>

          <div className="input-group">
            <label htmlFor="source">Platform</label>
            <select
              id="source"
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
            >
              <option value="">All Platforms</option>
              {sources.map((src) => (
                <option key={src} value={src}>
                  {src}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="search-actions">
          <button
            className="btn btn-primary"
            onClick={handleSearchClick}
            disabled={isSearching || loading}
          >
            {isSearching || loading ? (
              <>
                <span className="spinner-small"></span>
                Searching...
              </>
            ) : (
              <>
                <span className="icon">🔍</span>
                Search
              </>
            )}
          </button>

          <button
            className="btn btn-secondary"
            onClick={handleClearFilters}
            disabled={!keyword && !location && !selectedSource}
          >
            Clear
          </button>
        </div>
      </div>

      {/* Smart Suggestion */}
      {searchSuggestion && !loading && !isSearching && (
        <div className="search-suggestion">
          <span>{searchSuggestion.icon}</span>
          <p>{searchSuggestion.text}</p>
        </div>
      )}

      {/* Job Count & Status */}
      <div className="jobs-status">
        {loading ? (
          <>
            <span className="spinner-small"></span>
            Loading jobs...
          </>
        ) : isSearching ? (
          <>
            <span className="spinner-small"></span>
            Searching...
          </>
        ) : (
          <>
            <strong>{jobs.length}</strong> jobs found
            {lastSearch.keyword && (
              <span className="search-filter-badge">
                for "{lastSearch.keyword}"
              </span>
            )}
          </>
        )}
      </div>

      {/* Jobs Grid - Always shows results or helpful message */}
      {jobs.length > 0 ? (
        <div className="jobs-grid">
          {jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              isSaved={savedJobIds.has(job.id)}
              onSave={onSaveJob}
              onApply={onApply}
              userSkills={userSkills}
            />
          ))}
        </div>
      ) : !loading && !isSearching ? (
        <div className="empty-state">
          <p className="empty-icon">🎯</p>
          <h3>Jobs Are Loading</h3>
          <p>Our system is gathering the latest opportunities for you.</p>
          <p
            style={{ fontSize: "0.9rem", color: "#6b7280", marginTop: "1rem" }}
          >
            💡 <strong>Tip:</strong> Try:
          </p>
          <ul
            style={{
              fontSize: "0.9rem",
              color: "#6b7280",
              marginTop: "0.5rem",
              textAlign: "left",
              display: "inline-block",
            }}
          >
            <li>Searching "internship" for entry-level opportunities</li>
            <li>Searching "developer" to filter tech roles</li>
            <li>Using "remote" to find work-from-home positions</li>
            <li>Browse all jobs by clicking "Clear" filters</li>
          </ul>
          <button
            className="btn btn-outline"
            onClick={handleClearFilters}
            style={{ marginTop: "1rem" }}
          >
            Show All Jobs
          </button>
        </div>
      ) : null}
    </div>
  );
};

export default JobsTab;
