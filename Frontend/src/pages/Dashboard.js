import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
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
import CareerIntelligenceTab from "../components/tabs/CareerIntelligenceTab";
import ProfileTab from "../components/tabs/ProfileTab";
import PlatformsTab from "../components/tabs/PlatformsTab";
import WorkplaceJobsTab from "../components/tabs/WorkplaceJobsTab";
import InternshipsTab from "../components/tabs/InternshipsTab";
import SkillsInput from "../components/SkillsInput";
import "../styles/dashboard-layout.css";

const Dashboard = () => {
  const locationHook = useLocation();
  const [activeTab, setActiveTab] = useState("jobs");
  const [jobs, setJobs] = useState([]);
  const [allJobs, setAllJobs] = useState([]);
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

  // Sync activeTab with URL query parameter ?tab=...
  useEffect(() => {
    const params = new URLSearchParams(locationHook.search);
    const tabParam = params.get("tab");
    const validTabs = [
      "jobs",
      "direct",
      "platforms",
      "wfh",
      "hybrid",
      "remote",
      "onsite",
      "internships",
      "recommended",
      "trending",
      "applications",
      "insights",
      "career",
      "profile",
    ];
    if (tabParam && validTabs.includes(tabParam)) {
      setActiveTab(tabParam);
    } else if (!tabParam) {
      setActiveTab("jobs");
    }
  }, [locationHook.search]);

  // Auto-refresh applications whenever user navigates to the Applications tab
  useEffect(() => {
    if (activeTab === "applications") {
      fetchUserApplications();
    }
  }, [activeTab]);

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
      const jobsList = (response.data && response.data.content) || [];

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

  const fetchUserSkills = async () => {
    try {
      const response = await userService.getSkills();
      const skills = response.data.skills || [];
      setUserSkills(skills);
    } catch (err) {
      console.error("Failed to fetch user skills:", err);
      setUserSkills([]);
    }
  };

  const fetchPlatforms = async (keyword = "", location = "") => {
    try {
      const response = await jobService.getJobsWithPlatforms(keyword, location);
      if (response.data) {
        setPlatforms(response.data.platformInfo || []);
        setPlatformLinks(response.data.platformLinks || {});
      }
    } catch (err) {
      console.error("Failed to fetch platforms:", err);
    }
  };

  const [searchMeta, setSearchMeta] = useState({
    totalElements: 0,
    externalSearchLinks: [],
    sourceStats: {},
    sourceStatuses: {},
    remoteJobsCount: 0,
  });

  const handleSearch = async (keyword, location, source) => {
    setIsSearching(true);
    setError("");
    try {
      const response = await jobService.searchJobs(
        keyword || "",
        location || "",
        source || "",
        0,
        1000,
      );

      const data = response.data || {};
      const results = data.jobs || (Array.isArray(data.content) ? data.content : []);
      const total = data.totalElements !== undefined ? data.totalElements : results.length;
      const externalLinks = data.externalSearchLinks || [];
      const stats = data.sourceStats || {};
      const statuses = data.sourceStatuses || {};
      const remoteCount = data.remoteJobsCount || 0;

      setJobs(results);
      setSearchMeta({
        totalElements: total,
        externalSearchLinks: externalLinks,
        sourceStats: stats,
        sourceStatuses: statuses,
        remoteJobsCount: remoteCount,
      });

      if (results.length === 0 && (!externalLinks || externalLinks.length === 0) && keyword) {
        setError("No matching opportunities found.");
      } else {
        setError("");
      }
    } catch (err) {
      console.error("Search failed:", err);
      setError("Search failed. Please try again.");
      setJobs([]);
      setSearchMeta({ totalElements: 0, externalSearchLinks: [], sourceStats: {} });
    } finally {
      setIsSearching(false);
    }
  };

  const handleClearSearch = async () => {
    setIsSearching(false);
    setJobs(allJobs);
    setError("");
    setSearchMeta({ totalElements: allJobs.length, externalSearchLinks: [], sourceStats: {} });
    await fetchPlatforms("", "");
  };

  const handleSaveJob = async (jobId) => {
    try {
      await applicationService.saveJob(jobId);
      setSavedJobIds((prev) => new Set([...prev, jobId]));
      await fetchUserApplications();
    } catch (err) {
      console.error("Failed to save job:", err);
      alert("Failed to save job. Please try again.");
    }
  };

  const handleUpdateApplicationStatus = async (applicationId, newStatus) => {
    try {
      await applicationService.updateStatus(applicationId, newStatus);
      await fetchUserApplications();
    } catch (err) {
      console.error("Failed to update status:", err);
      alert("Failed to update application status.");
    }
  };

  const handleApply = (applyLink) => {
    if (applyLink) {
      window.open(applyLink, "_blank", "noopener,noreferrer");
    }
  };

  const handleSkillsUpdated = (newSkills) => {
    setUserSkills(newSkills);
    setShowSkillsInput(false);
  };

  const handleNavigateToSearch = (kw, loc) => {
    setActiveTab("jobs");
    handleSearch(kw, loc, "");
  };

  return (
    <div className="dashboard-container">
      {/* Initialization Error Alert */}
      {initError && (
        <div
          style={{
            background: "#fee2e2",
            border: "1px solid #ef4444",
            color: "#991b1b",
            padding: "1rem",
            margin: "1rem auto",
            maxWidth: "800px",
            borderRadius: "8px",
            textAlign: "center",
          }}
        >
          <p>
            <strong>Connection Warning:</strong> {initError}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "0.7rem 1.5rem",
              background: "#2563eb",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "1rem",
              marginTop: "0.5rem",
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
            minHeight: "60vh",
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
              border: "4px solid #2563eb",
              borderTop: "4px solid transparent",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
            }}
          />
          <p style={{ color: "#64748b", fontSize: "1rem", fontWeight: 600 }}>
            Loading live job opportunities...
          </p>
        </div>
      )}

      {/* Main Content */}
      {!loading && !initError && (
        <>
          {/* Error Alert */}
          {error && (
            <div className="dashboard-alert error">
              <span>{error}</span>
              <button onClick={() => setError("")}>&times;</button>
            </div>
          )}

          {/* Skills Input Modal */}
          {showSkillsInput && (
            <div className="modal-overlay" onClick={() => setShowSkillsInput(false)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
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
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                <span className="tab-label">All Jobs</span>
              </button>

              <button
                className={`tab-button ${activeTab === "direct" ? "active" : ""}`}
                onClick={() => setActiveTab("direct")}
                style={activeTab === "direct" ? { borderColor: "#10b981", background: "#ecfdf5", color: "#047857", fontWeight: 700 } : {}}
              >
                <span style={{ fontSize: "1rem" }}>⚡</span>
                <span className="tab-label">Direct Apply (No Sign-in)</span>
              </button>

              <button
                className={`tab-button ${activeTab === "wfh" ? "active" : ""}`}
                onClick={() => setActiveTab("wfh")}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                <span className="tab-label">Work From Home</span>
              </button>

              <button
                className={`tab-button ${activeTab === "hybrid" ? "active" : ""}`}
                onClick={() => setActiveTab("hybrid")}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v1"/><path d="M18 8h4a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-4"/><circle cx="8" cy="12" r="2"/></svg>
                <span className="tab-label">Hybrid</span>
              </button>

              <button
                className={`tab-button ${activeTab === "remote" ? "active" : ""}`}
                onClick={() => setActiveTab("remote")}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
                <span className="tab-label">Remote</span>
              </button>

              <button
                className={`tab-button ${activeTab === "onsite" ? "active" : ""}`}
                onClick={() => setActiveTab("onsite")}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>
                <span className="tab-label">On-Site</span>
              </button>

              <button
                className={`tab-button ${activeTab === "internships" ? "active" : ""}`}
                onClick={() => setActiveTab("internships")}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
                <span className="tab-label">Internships</span>
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="dashboard-content">
            {(activeTab === "jobs" || activeTab === "direct") && (
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
                onApplicationUpdated={fetchUserApplications}
                userSkills={userSkills}
                searchMeta={searchMeta}
                initialDirectOnly={activeTab === "direct"}
              />
            )}

            {activeTab === "platforms" && (
              <PlatformsTab
                platforms={platforms}
                platformLinks={platformLinks}
              />
            )}

            {activeTab === "wfh" && (
              <WorkplaceJobsTab
                type="wfh"
                allJobs={allJobs}
                savedJobIds={savedJobIds}
                onSaveJob={handleSaveJob}
                onApply={handleApply}
                userSkills={userSkills}
                onNavigateToAllJobs={handleNavigateToSearch}
              />
            )}

            {activeTab === "hybrid" && (
              <WorkplaceJobsTab
                type="hybrid"
                allJobs={allJobs}
                savedJobIds={savedJobIds}
                onSaveJob={handleSaveJob}
                onApply={handleApply}
                userSkills={userSkills}
                onNavigateToAllJobs={handleNavigateToSearch}
              />
            )}

            {activeTab === "remote" && (
              <WorkplaceJobsTab
                type="remote"
                allJobs={allJobs}
                savedJobIds={savedJobIds}
                onSaveJob={handleSaveJob}
                onApply={handleApply}
                userSkills={userSkills}
                onNavigateToAllJobs={handleNavigateToSearch}
              />
            )}

            {activeTab === "onsite" && (
              <WorkplaceJobsTab
                type="onsite"
                allJobs={allJobs}
                savedJobIds={savedJobIds}
                onSaveJob={handleSaveJob}
                onApply={handleApply}
                userSkills={userSkills}
                onNavigateToAllJobs={handleNavigateToSearch}
              />
            )}

            {activeTab === "internships" && (
              <InternshipsTab
                allJobs={allJobs}
                savedJobIds={savedJobIds}
                onSaveJob={handleSaveJob}
                onApply={handleApply}
                userSkills={userSkills}
                onNavigateToAllJobs={handleNavigateToSearch}
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
                onRefresh={fetchUserApplications}
              />
            )}

            {activeTab === "insights" && (
              <InsightsTab
                jobs={jobs}
                savedJobIds={savedJobIds}
                userSkills={userSkills}
              />
            )}

            {activeTab === "career" && (
              <CareerIntelligenceTab
                jobs={jobs.length > 0 ? jobs : allJobs}
                userSkills={userSkills}
                onSkillsUpdated={handleSkillsUpdated}
              />
            )}

            {activeTab === "profile" && (
              <ProfileTab
                userSkills={userSkills}
                onSkillsUpdated={handleSkillsUpdated}
                onResumeSynced={(parsedResume) => {
                  if (parsedResume.allSkills) {
                    handleSkillsUpdated(parsedResume.allSkills);
                  }
                }}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
