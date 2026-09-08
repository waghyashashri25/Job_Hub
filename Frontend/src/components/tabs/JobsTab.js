import React, { useState, useMemo, useEffect, useTransition, useDeferredValue } from "react";
import JobCard from "../JobCard";
import Pagination from "../Pagination";
import FilterSidebar, { classifyJob } from "../FilterSidebar";
import { isDirectApply } from "../../utils/linkHelper";
import "../../styles/tabs.css";
import "../../styles/platform-grid.css";
import "../../styles/filter-sidebar.css";

const JobsTab = ({
  jobs = [],
  allJobs = [],
  savedJobIds,
  sources = [],
  loading,
  isSearching,
  onSearch,
  onClearSearch,
  onSaveJob,
  onApply,
  onApplicationUpdated,
  userSkills = [],
  searchMeta = { totalElements: 0, externalSearchLinks: [], sourceStats: {} },
  initialDirectOnly = false,
}) => {
  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("");
  const [selectedSource, setSelectedSource] = useState("");
  const [directOnlyFilter, setDirectOnlyFilter] = useState(initialDirectOnly);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Concurrent React 18 Transitions for 60fps UI
  const [, startTransition] = useTransition();

  // Faceted Filters State
  const [filters, setFilters] = useState({
    workModes: [],
    departments: [],
    salaryRanges: [],
    companyTypes: [],
    roleCategories: [],
    educations: [],
    postedBy: [],
    industries: [],
    companies: [],
    freshness: "any",
    locations: [],
    maxExperience: 10,
  });

  const deferredFilters = useDeferredValue(filters);
  const deferredJobs = useDeferredValue(jobs);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  useEffect(() => {
    setDirectOnlyFilter(initialDirectOnly);
  }, [initialDirectOnly]);

  const [lastSearch, setLastSearch] = useState({
    keyword: "",
    location: "",
  });

  const availableSources = useMemo(() => {
    const defaultSources = [
      "LinkedIn",
      "Naukri",
      "Indeed",
      "Himalayas",
      "RemoteOK",
      "Greenhouse ATS",
      "Jooble",
      "Remotive",
      "Arbeitnow",
      "Jobicy",
      "Glassdoor",
      "Foundit",
      "Shine",
      "Apna",
      "Wellfound",
      "USAJOBS",
    ];
    return Array.from(new Set([...(sources || []), ...defaultSources])).sort();
  }, [sources]);

  const handleSearchClick = () => {
    setCurrentPage(1);
    if (!keyword && !location && !selectedSource) {
      setLastSearch({ keyword: "", location: "" });
      onClearSearch();
      return;
    }
    setLastSearch({ keyword, location });
    onSearch(keyword, location, selectedSource);
  };

  const handleResetAllFilters = () => {
    setFilters({
      workModes: [],
      departments: [],
      salaryRanges: [],
      companyTypes: [],
      roleCategories: [],
      educations: [],
      postedBy: [],
      industries: [],
      companies: [],
      freshness: "any",
      locations: [],
      maxExperience: 10,
    });
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setKeyword("");
    setLocation("");
    setSelectedSource("");
    handleResetAllFilters();
    setLastSearch({ keyword: "", location: "" });
    onClearSearch();
  };

  const handleFilterChange = (key, value) => {
    startTransition(() => {
      setFilters((prev) => ({ ...prev, [key]: value }));
      setCurrentPage(1);
    });
  };

  // Multi-faceted filtering applied dynamically in real-time with React 18 Deferred Value
  const displayedJobs = useMemo(() => {
    let result = deferredJobs;

    if (directOnlyFilter) {
      result = result.filter(isDirectApply);
    }

    const hasWorkModes = deferredFilters.workModes?.length > 0;
    const hasDepartments = deferredFilters.departments?.length > 0;
    const hasSalaryRanges = deferredFilters.salaryRanges?.length > 0;
    const hasCompanyTypes = deferredFilters.companyTypes?.length > 0;
    const hasRoleCategories = deferredFilters.roleCategories?.length > 0;
    const hasEducations = deferredFilters.educations?.length > 0;
    const hasPostedBy = deferredFilters.postedBy?.length > 0;
    const hasIndustries = deferredFilters.industries?.length > 0;
    const hasCompanies = deferredFilters.companies?.length > 0;
    const hasFreshness = deferredFilters.freshness && deferredFilters.freshness !== "any";
    const hasLocations = deferredFilters.locations?.length > 0;
    const hasExperience = deferredFilters.maxExperience !== undefined && deferredFilters.maxExperience !== 10;

    const hasAnyFilter =
      hasWorkModes ||
      hasDepartments ||
      hasSalaryRanges ||
      hasCompanyTypes ||
      hasRoleCategories ||
      hasEducations ||
      hasPostedBy ||
      hasIndustries ||
      hasCompanies ||
      hasFreshness ||
      hasLocations ||
      hasExperience;

    if (!hasAnyFilter) {
      return result;
    }

    return result.filter((job) => {
      const c = classifyJob(job);

      if (hasWorkModes && !deferredFilters.workModes.includes(c.workMode)) return false;
      if (hasDepartments && !deferredFilters.departments.includes(c.department)) return false;
      if (hasSalaryRanges && !deferredFilters.salaryRanges.includes(c.salaryBucket)) return false;
      if (hasCompanyTypes && !deferredFilters.companyTypes.includes(c.companyType)) return false;
      if (hasRoleCategories && !deferredFilters.roleCategories.includes(c.roleCategory)) return false;
      if (hasEducations && !deferredFilters.educations.includes(c.education)) return false;
      if (hasPostedBy && !deferredFilters.postedBy.includes(c.postedBy)) return false;
      if (hasIndustries && !deferredFilters.industries.includes(c.industry)) return false;
      if (hasCompanies && !deferredFilters.companies.includes(c.company)) return false;
      if (hasLocations) {
        const jobLocs = c.locations || [];
        const matchesLocation = deferredFilters.locations.some((selectedLoc) =>
          jobLocs.includes(selectedLoc)
        );
        if (!matchesLocation) return false;
      }

      if (hasFreshness) {
        const daysLimit = Number(deferredFilters.freshness);
        if (c.freshnessDays > daysLimit) return false;
      }

      if (hasExperience) {
        if (c.minExp > deferredFilters.maxExperience) return false;
      }

      return true;
    });
  }, [deferredJobs, directOnlyFilter, deferredFilters]);

  // Active filter chips list
  const activeChips = useMemo(() => {
    const list = [];
    (filters.workModes || []).forEach((val) => list.push({ key: "workModes", label: val, val }));
    (filters.departments || []).forEach((val) => list.push({ key: "departments", label: val, val }));
    (filters.salaryRanges || []).forEach((val) => list.push({ key: "salaryRanges", label: val, val }));
    (filters.companyTypes || []).forEach((val) => list.push({ key: "companyTypes", label: val, val }));
    (filters.roleCategories || []).forEach((val) => list.push({ key: "roleCategories", label: val, val }));
    (filters.educations || []).forEach((val) => list.push({ key: "educations", label: val, val }));
    (filters.postedBy || []).forEach((val) => list.push({ key: "postedBy", label: val, val }));
    (filters.industries || []).forEach((val) => list.push({ key: "industries", label: val, val }));
    (filters.companies || []).forEach((val) => list.push({ key: "companies", label: val, val }));
    (filters.locations || []).forEach((val) => list.push({ key: "locations", label: val, val }));
    if (filters.freshness && filters.freshness !== "any") {
      const freshnessLabels = {
        "1": "Posted: Last 24 Hours",
        "3": "Posted: Last 3 Days",
        "7": "Posted: Last 7 Days",
        "15": "Posted: Last 15 Days",
        "30": "Posted: Last 30 Days",
      };
      list.push({
        key: "freshness",
        label: freshnessLabels[filters.freshness] || `Posted: Last ${filters.freshness} Days`,
        val: filters.freshness,
      });
    }
    if (filters.maxExperience !== undefined && filters.maxExperience !== 10) {
      list.push({ key: "maxExperience", label: `Exp: ≤ ${filters.maxExperience} Yrs`, val: filters.maxExperience });
    }
    return list;
  }, [filters]);

  const handleRemoveChip = (chip) => {
    if (chip.key === "freshness") {
      setFilters((prev) => ({ ...prev, freshness: "any" }));
    } else if (chip.key === "maxExperience") {
      setFilters((prev) => ({ ...prev, maxExperience: 10 }));
    } else {
      setFilters((prev) => ({
        ...prev,
        [chip.key]: (prev[chip.key] || []).filter((v) => v !== chip.val),
      }));
    }
    setCurrentPage(1);
  };

  // Paginated slice of current job results
  const paginatedJobs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return displayedJobs.slice(start, start + itemsPerPage);
  }, [displayedJobs, currentPage, itemsPerPage]);

  const activeKeyword = lastSearch.keyword || keyword || "";
  const totalResultsCount = (activeChips.length === 0 && searchMeta?.totalElements > displayedJobs.length) 
    ? searchMeta.totalElements 
    : displayedJobs.length;

  return (
    <div className="jobs-tab-container" style={{ display: "grid", gap: "2rem", width: "100%" }}>
      {/* Search Header */}
      <div className="tab-header" style={{ textAlign: "center", marginBottom: "0.5rem" }}>
        <h1 style={{ color: "#0f172a", fontSize: "2.1rem", fontWeight: 800 }}>Multi-Source Job Search Engine</h1>
        <p className="subtitle" style={{ color: "#64748b", fontSize: "1rem" }}>
          Search ANY role or industry across live APIs, local database, and 15+ connected global platforms.
        </p>
      </div>

      {/* Advanced Search Bar */}
      <div className="search-section">
        <div className="search-inputs">
          <div className="input-group">
            <label htmlFor="search-keyword">Job Title, Skill, or Role</label>
            <input
              id="search-keyword"
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearchClick()}
              placeholder="e.g., Java Developer, Accountant, Nurse, UI/UX Designer, Civil Engineer"
            />
          </div>

          <div className="input-group">
            <label htmlFor="search-location">Location / City</label>
            <input
              id="search-location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearchClick()}
              placeholder="e.g., Mumbai, Bengaluru, Pune, Delhi, Remote"
            />
          </div>

          <div className="input-group">
            <label htmlFor="search-platform">Platform Filter</label>
            <select
              id="search-platform"
              value={selectedSource}
              onChange={(e) => {
                setSelectedSource(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">All 22+ Platforms</option>
              {availableSources.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="search-actions" style={{ marginTop: "1rem" }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSearchClick}
            disabled={isSearching}
          >
            {isSearching ? (
              <span>Searching 18+ Platforms...</span>
            ) : (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8" /><line x1="21" x2="16.65" y1="21" y2="16.65" /></svg>
                <span>Search Pipeline</span>
              </>
            )}
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleClearFilters}
            disabled={!keyword && !location && !selectedSource && !lastSearch.keyword && !directOnlyFilter}
          >
            Clear Filters
          </button>

          <button
            type="button"
            onClick={() => {
              setDirectOnlyFilter(!directOnlyFilter);
              setCurrentPage(1);
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.45rem",
              padding: "0.55rem 1rem",
              borderRadius: "8px",
              fontSize: "0.85rem",
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.2s ease",
              border: directOnlyFilter ? "2px solid #10b981" : "1.5px solid #cbd5e1",
              background: directOnlyFilter ? "#ecfdf5" : "#ffffff",
              color: directOnlyFilter ? "#047857" : "#475569",
              boxShadow: directOnlyFilter ? "0 2px 8px rgba(16, 185, 129, 0.2)" : "none",
            }}
            title="Filter only jobs you can apply to directly without creating accounts on LinkedIn or Naukri"
          >
            <span>{directOnlyFilter ? "⚡ Direct Apply Active ✓" : "⚡ Direct Apply (No Sign-in)"}</span>
          </button>
        </div>
      </div>

      {/* 2-Column Layout: Left Filter Sidebar + Right Search Results */}
      <div className="jobs-main-layout">
        {/* Left Column: Naukri-Style Filter Sidebar */}
        <div
          className={`jobs-filter-sidebar-col ${mobileFilterOpen ? "mobile-open" : ""}`}
          onClick={() => setMobileFilterOpen(false)}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <FilterSidebar
              jobs={jobs}
              filters={filters}
              onFilterChange={handleFilterChange}
              onResetFilters={handleResetAllFilters}
            />
          </div>
        </div>

        {/* Right Column: Search Results */}
        <main className="jobs-results-col">
          {/* Mobile Filter Toggle Button */}
          <button
            type="button"
            className="mobile-filter-toggle-btn"
            onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
          >
            <span>⚡ Filters {activeChips.length > 0 ? `(${activeChips.length})` : ""}</span>
          </button>

          {/* Active Filter Chips Bar */}
          {activeChips.length > 0 && (
            <div className="active-filters-bar">
              <span className="active-filters-label">Active Filters:</span>
              {activeChips.map((chip, idx) => (
                <span key={idx} className="active-filter-chip">
                  {chip.label}
                  <button
                    type="button"
                    className="active-filter-chip-remove"
                    onClick={() => handleRemoveChip(chip)}
                    title="Remove filter"
                  >
                    &times;
                  </button>
                </span>
              ))}
              <button
                type="button"
                className="active-filters-clear-btn"
                onClick={handleResetAllFilters}
              >
                Clear all
              </button>
            </div>
          )}

          {/* Search Status & Source Stats Banner */}
          <div className="jobs-status" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
            <div>
              {loading ? (
                <span>Loading aggregated jobs catalog...</span>
              ) : isSearching ? (
                <span>Executing parallel multi-platform search...</span>
              ) : (
                <div>
                  <strong>{totalResultsCount}</strong> opportunities discovered
                  {lastSearch.keyword && (
                    <span style={{ color: "#2563eb", marginLeft: "0.4rem" }}>
                      for "{lastSearch.keyword}"
                    </span>
                  )}
                  {lastSearch.location && (
                    <span style={{ color: "#0f172a", marginLeft: "0.4rem" }}>
                      in "{lastSearch.location}"
                    </span>
                  )}
                </div>
              )}
            </div>

          </div>

          {/* SECTION 1: Real Aggregated Job Results */}
          {paginatedJobs.length > 0 ? (
            <section>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h2 style={{ fontSize: "1.3rem", fontWeight: 700, color: "#0f172a", margin: 0 }}>
                  Direct Aggregated Opportunities ({totalResultsCount})
                </h2>
                <span style={{ fontSize: "0.85rem", color: "#64748b" }}>
                  Showing {((currentPage - 1) * itemsPerPage) + 1}–{Math.min(currentPage * itemsPerPage, totalResultsCount)} of {totalResultsCount}
                </span>
              </div>

              <div className="jobs-grid">
                {paginatedJobs.map((job, idx) => {
                  const jobKey = job.id
                    ? `job-${job.id}`
                    : `ext-${job.source || "agg"}-${idx}-${(job.company || "").replace(/\W/g, "")}-${(job.title || "").replace(/\W/g, "")}`;
                  return (
                    <JobCard
                      key={jobKey}
                      job={job}
                      isSaved={job.id ? savedJobIds.has(job.id) : false}
                      onSave={onSaveJob}
                      onApply={onApply}
                      onApplicationUpdated={onApplicationUpdated}
                      userSkills={userSkills}
                      searchKeyword={activeKeyword}
                    />
                  );
                })}
              </div>

              {/* Pagination Controls */}
              <Pagination
                currentPage={currentPage}
                totalItems={displayedJobs.length}
                itemsPerPage={itemsPerPage}
                onPageChange={(page) => setCurrentPage(page)}
              />
            </section>
          ) : !loading && !isSearching && (lastSearch.keyword || activeChips.length > 0) ? (
            <div className="empty-state" style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "2rem", textAlign: "center", maxWidth: "850px", margin: "0 auto 1.5rem" }}>
              <span style={{ fontSize: "2.2rem", display: "block", marginBottom: "0.6rem" }}>🔍</span>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#0f172a", margin: "0 0 0.5rem" }}>
                0 listings match your current filters
              </h3>
              <p style={{ color: "#64748b", fontSize: "0.93rem", maxWidth: "680px", margin: "0 auto 1.25rem", lineHeight: 1.5 }}>
                Try removing some filters or search terms to broaden your results.
              </p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleResetAllFilters}
                style={{ padding: "0.55rem 1.2rem", fontSize: "0.88rem" }}
              >
                Reset All Filters
              </button>
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
};

export default JobsTab;
