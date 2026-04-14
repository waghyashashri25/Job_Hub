import React, { useState, useEffect } from "react";
import {
  jobService,
  applicationService,
  userService,
} from "../services/apiService";
import JobsTab from "../components/tabs/JobsTab";
import RecommendedTab from "../components/tabs/RecommendedTab";
import TrendingSkillsTab from "../components/tabs/TrendingSkillsTab";
import ApplicationsTab from "../components/tabs/ApplicationsTab";
import InsightsTab from "../components/tabs/InsightsTab";
import SkillsInput from "../components/SkillsInput";
import PlatformGrid from "../components/PlatformGrid";
import "../styles/dashboard-layout.css";

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("jobs");
  const [jobs, setJobs] = useState([]);
  const [allJobs, setAllJobs] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [savedJobIds, setSavedJobIds] = useState(new Set());
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sources, setSources] = useState([]);
  const [userSkills, setUserSkills] = useState([]);
  const [showSkillsInput, setShowSkillsInput] = useState(false);
  const [initError, setInitError] = useState(null);
  const [platforms, setPlatforms] = useState([]);
  const [platformLinks, setPlatformLinks] = useState({});

  // Initialize: Load all jobs, user applications, user skills, and platforms
  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        console.log("Dashboard: Starting initialization...");
        await fetchAllJobs();
        await fetchUserApplications();
        await fetchUserSkills();
        await fetchPlatforms("", "");
        console.log("Dashboard: Initialization complete");
      } catch (err) {
        console.error("Dashboard: Initialization error:", err);
        setInitError(err.message || "Failed to initialize dashboard");
      }
    };

    initializeDashboard();
  }, []);

  const fetchAllJobs = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await jobService.getAllJobs();

      // Extract from Spring Data paginated response: { content: [...], totalElements, ... }
      const jobsList = (response.data && response.data.content) || [];

      console.log(
        "[DEBUG-FetchAllJobs] Response structure:",
        response.data ? Object.keys(response.data) : "null",
      );
      console.log(
        "[DEBUG-FetchAllJobs] Content array length:",
        jobsList.length,
      );

      setJobs(jobsList);
      setAllJobs(jobsList);

      const uniqueSources = [
        ...new Set(jobsList.map((job) => job.source).filter(Boolean)),
      ];
      setSources(uniqueSources.sort());
    } catch (err) {
      console.error("Failed to fetch jobs:", err);
      setError("Failed to load jobs. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchUserApplications = async () => {
    try {
      const response = await applicationService.getApplications();
      setApplications(response.data || []);

      const saved = new Set(
        response.data
          .map((app) => app.jobId || app.job?.id)
          .filter((id) => id !== null && id !== undefined),
      );
      setSavedJobIds(saved);
    } catch (err) {
      console.error("Failed to fetch applications:", err);
    }
  };

  /**
   * Load user skills from backend
   */
  const fetchUserSkills = async () => {
    try {
      const response = await userService.getSkills();
      const skills = response.data.skills || [];
      setUserSkills(skills);
    } catch (err) {
      console.error("Failed to fetch user skills:", err);
      // Default skills if not found
      setUserSkills(["Java", "Spring Boot", "React", "MySQL", "Git"]);
    }
  };

  /**
   * Fetch all platforms with their discovery links
   * @param {string} keyword - Search keyword (optional)
   * @param {string} location - Search location (optional)
   */
  const fetchPlatforms = async (keyword = "", location = "") => {
    try {
      const response = await jobService.getJobsWithPlatforms(keyword, location);
      if (response.data) {
        setPlatforms(response.data.platformInfo || []);
        setPlatformLinks(response.data.platformLinks || {});
        console.log("Platforms loaded with params:", {
          keyword,
          location,
          count: response.data.platformInfo?.length,
        });
      }
    } catch (err) {
      console.error("Failed to fetch platforms:", err);
      // Continue without platforms - don't break initialization
    }
  };

  /**
   * FIXED SEARCH FUNCTION - Properly sends API request and handles results
   * Also updates platform links with search parameters
   */
  const handleSearch = async (keyword, location, source) => {
    console.log("[DEBUG] handleSearch called with:", {
      keyword,
      location,
      source,
    });
    setIsSearching(true);
    setError("");
    try {
      // Make API call with proper parameters (send empty strings, not null)
      const response = await jobService.searchJobs(
        keyword || "",
        location || "",
        source || "",
      );

      console.log("[DEBUG] API call made with keyword:", keyword);
      console.log("[DEBUG] Full response:", response);

      // Extract results array from Spring Data paginated response
      const results = (response.data && response.data.content) || [];
      console.log("[DEBUG] Extracted results count:", results.length);
      if (results.length > 0) {
        console.log(
          "[DEBUG] First 3 jobs:",
          results.slice(0, 3).map((j) => j.title),
        );
      }

      // Set jobs to search results (don't apply local filters)
      setSearchResults(results);
      setJobs(results);

      // UPDATE PLATFORM LINKS WITH SEARCH PARAMETERS ✅
      await fetchPlatforms(keyword || "", location || "");

      // Note: Backend ALWAYS returns results due to fallback system
      // So empty results shouldn't show error - it's expected fallback behavior
      if (results.length === 0 && keyword && (location || source)) {
        // Only show message if specific filters were used
        setError("No exact match found. Showing latest opportunities.");
      } else {
        setError("");
      }
    } catch (err) {
      console.error("Search failed:", err);
      setError("Search failed. Please try again.");
      setJobs([]);
    } finally {
      setIsSearching(false);
    }
  };

  /**
   * Clear search and show all jobs again
   */
  const handleClearSearch = async () => {
    setIsSearching(false);
    setSearchResults([]);
    setJobs(allJobs);
    setError("");
    // Reset platform links to default (no search params)
    await fetchPlatforms("", "");
  };

  const handleSaveJob = async (jobId) => {
    try {
      await applicationService.saveJob(jobId);
      setSavedJobIds((prev) => new Set(prev).add(jobId));

      // Refresh applications
      await fetchUserApplications();
    } catch (err) {
      setError("Failed to save job.");
      console.error(err);
    }
  };

  const handleApply = (applyLink) => {
    if (!applyLink) {
      setError("This job does not have a valid apply link.");
      return;
    }
    window.open(applyLink, "_blank", "noopener,noreferrer");
  };

  const handleUpdateApplicationStatus = async (applicationId, status) => {
    try {
      await applicationService.updateStatus(applicationId, status);
      await fetchUserApplications();
    } catch (err) {
      setError("Failed to update application status.");
      console.error(err);
    }
  };

  /**
   * Handle skills updated from SkillsInput component
   */
  const handleSkillsUpdated = (newSkills) => {
    setUserSkills(newSkills);
    setShowSkillsInput(false);
  };

  return (
    <div className="dashboard-container">
      {/* Initialization Error */}
      {initError && (
        <div
          style={{
            background: "#fff5f5",
            color: "#d44f6f",
            padding: "2rem",
            textAlign: "center",
            fontSize: "1.1rem",
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            gap: "1rem",
          }}
        >
          <h2>Initialization Error</h2>
          <p>{initError}</p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "0.7rem 1.5rem",
              background: "#d44f6f",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "1rem",
            }}
          >
            Reload Page
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && !initError && (
        <div
          style={{
            background:
              "linear-gradient(135deg, #f5f7ff 0%, #eef3ff 45%, #f0f4ff 100%)",
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            gap: "1rem",
          }}
        >
          <div
            style={{
              width: "40px",
              height: "40px",
              border: "4px solid #4a63ff",
              borderTop: "4px solid transparent",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
            }}
          />
          <p style={{ color: "#4b5563", fontSize: "1.1rem" }}>
            Loading your dashboard...
          </p>
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}

      {/* Main Content (only show if not loading and no init error) */}
      {!loading && !initError && (
        <>
          {/* Error Alert */}
          {error && (
            <div className="dashboard-alert error">
              <span>{error}</span>
              <button onClick={() => setError("")}>&times;</button>
            </div>
          )}

          {/* Skills Input Modal/Section */}
          {showSkillsInput && (
            <div className="skills-modal-overlay">
              <div className="skills-modal">
                <SkillsInput
                  onSkillsUpdated={handleSkillsUpdated}
                  compact={true}
                />
              </div>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="dashboard-tabs">
            <nav className="tab-navigation">
              <button
                className={`tab-button ${activeTab === "jobs" ? "active" : ""}`}
                onClick={() => setActiveTab("jobs")}
              >
                <span className="tab-icon">💼</span>
                <span className="tab-label">Jobs</span>
              </button>

              <button
                className={`tab-button ${activeTab === "recommended" ? "active" : ""}`}
                onClick={() => setActiveTab("recommended")}
              >
                <span className="tab-icon">⭐</span>
                <span className="tab-label">Recommended</span>
              </button>

              <button
                className={`tab-button ${activeTab === "trending" ? "active" : ""}`}
                onClick={() => setActiveTab("trending")}
              >
                <span className="tab-icon">📈</span>
                <span className="tab-label">Trending Skills</span>
              </button>

              <button
                className={`tab-button ${activeTab === "applications" ? "active" : ""}`}
                onClick={() => setActiveTab("applications")}
              >
                <span className="tab-icon">📂</span>
                <span className="tab-label">Applications</span>
              </button>

              <button
                className={`tab-button ${activeTab === "insights" ? "active" : ""}`}
                onClick={() => setActiveTab("insights")}
              >
                <span className="tab-icon">🧠</span>
                <span className="tab-label">AI Insights</span>
              </button>

              {/* Skills Button */}
              <button
                className={`tab-button skills-button ${showSkillsInput ? "active" : ""}`}
                onClick={() => setShowSkillsInput(!showSkillsInput)}
                title="Edit your skills for better job matching"
              >
                <span className="tab-icon">⚙️</span>
                <span className="tab-label">Skills</span>
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="dashboard-content">
            {activeTab === "jobs" && (
              <JobsTab
                jobs={jobs}
                allJobs={allJobs}
                savedJobIds={savedJobIds}
                sources={sources}
                loading={loading}
                isSearching={isSearching}
                onSearch={handleSearch}
                onClearSearch={handleClearSearch}
                onSaveJob={handleSaveJob}
                onApply={handleApply}
                userSkills={userSkills}
              />
            )}

            {activeTab === "recommended" && (
              <RecommendedTab
                jobs={allJobs}
                savedJobIds={savedJobIds}
                onSaveJob={handleSaveJob}
                onApply={handleApply}
                userSkills={userSkills}
              />
            )}

            {activeTab === "trending" && (
              <TrendingSkillsTab jobs={jobs.length > 0 ? jobs : allJobs} />
            )}

            {activeTab === "applications" && (
              <ApplicationsTab
                applications={applications}
                onUpdateStatus={handleUpdateApplicationStatus}
              />
            )}

            {activeTab === "insights" && (
              <InsightsTab
                jobs={jobs}
                savedJobIds={savedJobIds}
                userSkills={userSkills}
              />
            )}
          </div>

          {/* Platform Grid - Show all available job platforms */}
          {activeTab === "jobs" && (
            <PlatformGrid platforms={platforms} platformLinks={platformLinks} />
          )}
        </>
      )}
    </div>
  );
};

export default Dashboard;
