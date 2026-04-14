import React, { useState, useEffect, useCallback } from "react";
import { jobService, applicationService } from "../services/apiService";
import JobCard from "../components/JobCard";
import SearchHistory from "../components/SearchHistory";
import TrendingSkills from "../components/TrendingSkills";
import RecommendedJobs from "../components/RecommendedJobs";
import "../styles/jobs.css";
import "../styles/dashboard.css";

const JobListing = () => {
  const [jobs, setJobs] = useState([]);
  const [filteredJobs, setFilteredJobs] = useState([]);
  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("");
  const [selectedSource, setSelectedSource] = useState("");
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [savedJobIds, setSavedJobIds] = useState(new Set());
  const [sources, setSources] = useState([]);

  useEffect(() => {
    fetchJobs();
    fetchUserApplications();
  }, []);

  const applyFilters = useCallback(() => {
    let filtered = jobs;

    if (keyword) {
      filtered = filtered.filter((job) =>
        job.title.toLowerCase().includes(keyword.toLowerCase()),
      );
    }

    if (location) {
      filtered = filtered.filter((job) =>
        job.location.toLowerCase().includes(location.toLowerCase()),
      );
    }

    if (selectedSource) {
      filtered = filtered.filter((job) => job.source === selectedSource);
    }

    setFilteredJobs(filtered);
  }, [jobs, keyword, location, selectedSource]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const fetchJobs = async () => {
    setLoading(true);
    setError("");
    try {
      const tokenBeforeFetch =
        localStorage.getItem("token") || localStorage.getItem("jwtToken");
      console.debug(
        "[JobListing] token before /api/jobs/all call:",
        tokenBeforeFetch ? "present" : "missing",
      );

      const response = await jobService.getAllJobs();
      console.debug("[JobListing] /api/jobs/all response:", response.data);

      // Handle paginated response from new API
      const jobsList = response.data.content || response.data;

      setJobs(jobsList);

      const uniqueSources = [
        ...new Set(jobsList.map((job) => job.source).filter(Boolean)),
      ];
      setSources(uniqueSources.sort());
    } catch (err) {
      console.error("[JobListing] Failed to fetch jobs:", err);
      setError(err.message || "Failed to fetch jobs");
    } finally {
      setLoading(false);
    }
  };

  const fetchUserApplications = async () => {
    try {
      const response = await applicationService.getApplications();
      const saved = new Set(
        response.data
          .map((app) => app.jobId || app.job?.id)
          .filter((id) => id !== null && id !== undefined),
      );
      setSavedJobIds(saved);
    } catch {
      // Ignore silently because users can still browse/apply jobs.
    }
  };

  const addSearchToHistory = (kw, loc) => {
    try {
      let history = [];
      const stored = localStorage.getItem("searchHistory");
      if (stored) {
        history = JSON.parse(stored);
      }

      const newSearch = {
        keyword: kw || "All Jobs",
        location: loc || "All Locations",
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
    } catch (e) {
      console.error("Error saving search history:", e);
    }
  };

  const handleSearch = async () => {
    setSearching(true);
    setError("");
    try {
      // Add to search history
      addSearchToHistory(keyword, location);

      const response = await jobService.searchJobs(
        keyword || null,
        location || null,
        selectedSource || null,
      );

      // Handle paginated response from new API
      const jobsList = response.data.content || response.data;

      setJobs(jobsList);

      const uniqueSources = [
        ...new Set(jobsList.map((job) => job.source).filter(Boolean)),
      ];
      setSources(uniqueSources.sort());
    } catch (err) {
      setError(err.message || "Failed to search jobs");
    } finally {
      setSearching(false);
    }
  };

  const handleSelectSearch = (kw, loc) => {
    setKeyword(kw === "All Jobs" ? "" : kw);
    setLocation(loc === "All Locations" ? "" : loc);
    // Trigger search after setting values
    setSearching(true);
    setTimeout(() => {
      handleSearch();
    }, 0);
  };

  const handleSaveJob = async (jobId) => {
    try {
      await applicationService.saveJob(jobId);
      setSavedJobIds((prev) => new Set(prev).add(jobId));
    } catch (err) {
      setError(err.message || "Failed to save job");
    }
  };

  const handleApply = (applyLink) => {
    if (!applyLink) {
      setError("This job does not have a valid apply link.");
      return;
    }
    window.open(applyLink, "_blank", "noopener,noreferrer");
  };

  return (
    <section className="jobs-page">
      <header className="jobs-header">
        <p className="page-kicker">Job Aggregation Platform</p>
        <h1>Find your next role faster</h1>
        <p className="page-subtitle">
          Search across platforms, compare opportunities, and save what matters.
        </p>
      </header>

      {error && <div className="ui-alert error">{error}</div>}

      {/* Search History */}
      <SearchHistory onSelectSearch={handleSelectSearch} />

      <div className="jobs-toolbar">
        <div className="search-group glass">
          <input
            type="text"
            placeholder="Search by role or keyword"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSearch()}
          />
          <input
            type="text"
            placeholder="Search by location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSearch()}
          />
          <button
            className="btn btn-primary"
            onClick={handleSearch}
            disabled={searching}
          >
            {searching ? "Searching..." : "Search"}
          </button>
        </div>

        <div className="filter-group glass">
          <label htmlFor="source-filter">Platform</label>
          <select
            id="source-filter"
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value)}
          >
            <option value="">All Platforms</option>
            {sources.map((source) => (
              <option key={source} value={source}>
                {source}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Trending Skills Dashboard */}
      {jobs.length > 0 && <TrendingSkills jobs={jobs} />}

      {/* Recommended Jobs */}
      {jobs.length > 0 && (
        <RecommendedJobs jobs={jobs} savedJobIds={savedJobIds} />
      )}

      {loading && (
        <div className="loading-block">
          <span className="spinner" />
          <p>Loading jobs...</p>
        </div>
      )}

      {!loading && filteredJobs.length > 0 && (
        <div className="jobs-section">
          <div className="jobs-section-header">
            <h2>Available Positions ({filteredJobs.length})</h2>
          </div>
          <div className="jobs-grid">
            {filteredJobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                isSaved={savedJobIds.has(job.id)}
                onSave={handleSaveJob}
                onApply={handleApply}
              />
            ))}
          </div>
        </div>
      )}

      {filteredJobs.length === 0 && !loading && jobs.length > 0 && (
        <div className="no-jobs">
          <p>📭 No jobs match your search criteria</p>
          <p style={{ fontSize: "0.95rem", marginTop: "0.5rem" }}>
            Try adjusting your filters or search terms
          </p>
        </div>
      )}

      {filteredJobs.length === 0 && !loading && jobs.length === 0 && (
        <div className="no-jobs">
          <p>🔍 No jobs found</p>
          <p style={{ fontSize: "0.95rem", marginTop: "0.5rem" }}>
            Try searching with different keywords
          </p>
        </div>
      )}
    </section>
  );
};

export default JobListing;
