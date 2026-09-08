import React, { useState, useMemo, useEffect } from "react";
import JobCard from "../JobCard";
import Pagination from "../Pagination";
import { jobService } from "../../services/apiService";
import { buildPlatformUrl } from "../../utils/linkHelper";
import "../../styles/tabs.css";

const QUICK_SKILLS = ["Java", "Spring Boot", "React", "Python", "Full Stack", "DevOps", "QA Automation", "Cloud / AWS", "Data Analysis"];
const QUICK_CITIES = ["Mumbai", "Bengaluru", "Pune", "Hyderabad", "Delhi-NCR", "Pan-India / Remote"];

const WorkplaceJobsTab = ({
  type = "wfh", // "wfh", "hybrid", "remote", "onsite"
  allJobs = [],
  savedJobIds = new Set(),
  onSaveJob,
  onApply,
  userSkills = [],
  onNavigateToAllJobs,
}) => {
  const [keyword, setKeyword] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [liveJobs, setLiveJobs] = useState([]);
  const [isSearchingLive, setIsSearchingLive] = useState(false);
  const itemsPerPage = 12;

  const config = {
    remote: {
      title: "100% Global Remote Opportunities",
      subtitle: "Verified worldwide and global remote positions with zero mandatory physical office requirements",
      badge: "100% Remote",
      filterFn: (job) => {
        const loc = (job.location || "").toLowerCase().trim();
        const title = (job.title || "").toLowerCase().trim();
        const desc = (job.description || "").toLowerCase();

        // Exclude purely in-office or hybrid
        if (loc.includes("hybrid") || title.includes("hybrid") || desc.includes("hybrid")) return false;
        if (loc.includes("on-site") || loc.includes("in-office") || loc.includes("corporate campus") || loc.includes("testing lab")) return false;

        return (
          loc.includes("remote") ||
          loc.includes("worldwide") ||
          loc.includes("global") ||
          loc.includes("anywhere") ||
          loc.includes("virtual") ||
          title.includes("remote") ||
          job.source === "Remotive" ||
          job.source === "Arbeitnow" ||
          job.source === "Wellfound"
        );
      },
    },
    wfh: {
      title: "Work From Home (WFH) Opportunities",
      subtitle: "Enterprise and tech positions explicitly designated for home-based workstations, telecommuting and remote flexibility",
      badge: "Work From Home",
      filterFn: (job) => {
        const loc = (job.location || "").toLowerCase().trim();
        const title = (job.title || "").toLowerCase().trim();
        const desc = (job.description || "").toLowerCase();

        // Must NOT be strictly hybrid or pure in-office lab
        if (loc.includes("hybrid") || title.includes("hybrid")) return false;
        if (loc.includes("in-office") || loc.includes("corporate campus") || loc.includes("testing lab")) return false;

        return (
          loc.includes("work from home") ||
          loc.includes("wfh") ||
          loc.includes("home-based") ||
          loc.includes("telecommute") ||
          loc.includes("remote") ||
          loc.includes("virtual") ||
          loc.includes("worldwide") ||
          loc.includes("global") ||
          title.includes("wfh") ||
          title.includes("work from home") ||
          title.includes("remote") ||
          desc.includes("work from home") ||
          desc.includes("work-from-home") ||
          desc.includes("telecommuting") ||
          desc.includes("home office") ||
          job.source === "Remotive" ||
          job.source === "Arbeitnow"
        );
      },
    },
    hybrid: {
      title: "Hybrid Workplace Opportunities",
      subtitle: "Verified opportunities combining flexible remote work with scheduled in-office collaboration",
      badge: "Hybrid Workplace",
      filterFn: (job) => {
        const loc = (job.location || "").toLowerCase().trim();
        const title = (job.title || "").toLowerCase().trim();
        const desc = (job.description || "").toLowerCase();

        return (
          loc.includes("hybrid") ||
          title.includes("hybrid") ||
          desc.includes("hybrid") ||
          desc.includes("2-3 days office") ||
          desc.includes("days in office") ||
          desc.includes("flexible office")
        );
      },
    },
    onsite: {
      title: "On-Site & In-Office Opportunities",
      subtitle: "Physical office, testing lab, and corporate campus positions across primary tech hubs",
      badge: "On-Site / In-Office",
      filterFn: (job) => {
        const loc = (job.location || "").toLowerCase().trim();
        const title = (job.title || "").toLowerCase().trim();

        // Must NOT be Remote, WFH, or Hybrid
        if (loc.includes("remote") || loc.includes("wfh") || loc.includes("work from home") || loc.includes("hybrid")) return false;
        if (title.includes("remote") || title.includes("wfh") || title.includes("hybrid")) return false;

        return (
          loc.includes("on-site") ||
          loc.includes("in-office") ||
          loc.includes("campus") ||
          loc.includes("mumbai") ||
          loc.includes("bengaluru") ||
          loc.includes("bangalore") ||
          loc.includes("pune") ||
          loc.includes("delhi") ||
          loc.includes("hyderabad") ||
          loc.includes("chennai") ||
          loc.includes("gurugram") ||
          loc.includes("noida") ||
          loc.includes("india")
        );
      },
    },
  };

  const currentConfig = config[type] || config.wfh;

  // On-demand real-time live search across APIs
  const handleSearchSubmit = async (kw = keyword, loc = selectedCity) => {
    setCurrentPage(1);
    if (!kw && !loc) return;
    setIsSearchingLive(true);
    try {
      const resp = await jobService.searchJobs(kw, loc, "", 0, 50);
      const data = resp.data?.jobs || (Array.isArray(resp.data?.content) ? resp.data.content : []);
      if (data && data.length > 0) {
        setLiveJobs((prev) => {
          const map = new Map();
          prev.forEach((j) => map.set(j.id || (j.title + j.company), j));
          data.forEach((j) => map.set(j.id || (j.title + j.company), j));
          return Array.from(map.values());
        });
      }
    } catch (e) {
      console.warn("Live search notice:", e);
    } finally {
      setIsSearchingLive(false);
    }
  };

  // Automatically trigger live multi-source search on input with a gentle debounce
  useEffect(() => {
    if (!keyword.trim() && !selectedCity.trim()) return;
    const timer = setTimeout(() => {
      handleSearchSubmit(keyword, selectedCity);
    }, 450);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword, selectedCity]);

  // Combine database catalog with live fetched opportunities
  const combinedJobs = useMemo(() => {
    const map = new Map();
    allJobs.forEach((j) => {
      const key = j.id ? `id-${j.id}` : `${j.title}|${j.company}`;
      map.set(key, j);
    });
    liveJobs.forEach((j) => {
      const key = j.id ? `id-${j.id}` : `${j.title}|${j.company}`;
      map.set(key, j);
    });
    return Array.from(map.values());
  }, [allJobs, liveJobs]);

  // Filter jobs based on workplace configuration, skill keyword, and location
  const filteredJobs = useMemo(() => {
    let result = combinedJobs.filter(currentConfig.filterFn);

    if (keyword.trim()) {
      const q = keyword.toLowerCase().trim();
      const tokens = q.split(/\s+/).filter(Boolean);

      result = result.filter((j) => {
        const title = (j.title || "").toLowerCase();
        const comp = (j.company || "").toLowerCase();
        const desc = (j.description || "").toLowerCase();

        return tokens.every((token) => {
          if (token === "developer" || token === "engineer") {
            return (
              title.includes("developer") ||
              title.includes("engineer") ||
              title.includes("architect") ||
              title.includes("lead") ||
              title.includes("sde") ||
              desc.includes("developer") ||
              desc.includes("engineer")
            );
          }
          return title.includes(token) || comp.includes(token) || desc.includes(token);
        });
      });
    }

    if (selectedCity.trim()) {
      const city = selectedCity.toLowerCase().trim().replace(/[^a-z0-9]/g, "");

      result = result.filter((j) => {
        const loc = (j.location || "").toLowerCase();

        // Direct city match in location string
        if (loc.includes(city)) return true;

        // In WFH and Remote modes, Pan-India, India, Global, or Remote jobs are flexible to candidates in any city
        if (type === "wfh" || type === "remote") {
          return (
            loc.includes("pan-india") ||
            loc.includes("india") ||
            loc.includes("remote") ||
            loc.includes("global") ||
            loc.includes("worldwide") ||
            j.source === "Remotive" ||
            j.source === "Arbeitnow"
          );
        }

        return false;
      });
    }

    return result;
  }, [combinedJobs, currentConfig.filterFn, keyword, selectedCity, type]);

  // All jobs matching this role and city regardless of workplace constraints
  const relaxedJobs = useMemo(() => {
    if (!keyword.trim() && !selectedCity.trim()) return [];
    const kw = keyword.toLowerCase().trim();
    const city = selectedCity.toLowerCase().trim();
    return combinedJobs.filter((j) => {
      const t = (j.title || "").toLowerCase();
      const c = (j.company || "").toLowerCase();
      const l = (j.location || "").toLowerCase();
      const kwMatch = !kw || t.includes(kw) || c.includes(kw);
      const locMatch = !city || l.includes(city);
      return kwMatch && locMatch;
    });
  }, [combinedJobs, keyword, selectedCity]);

  // Paginated slice
  const paginatedJobs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredJobs.slice(start, start + itemsPerPage);
  }, [filteredJobs, currentPage, itemsPerPage]);

  const onSkillClick = (sk) => {
    const nextKw = keyword.toLowerCase() === sk.toLowerCase() ? "" : sk;
    setKeyword(nextKw);
    setCurrentPage(1);
    if (nextKw) handleSearchSubmit(nextKw, selectedCity);
  };

  const onCityClick = (ct) => {
    const nextCity = selectedCity.toLowerCase() === ct.toLowerCase() ? "" : ct;
    setSelectedCity(nextCity);
    setCurrentPage(1);
    if (nextCity) handleSearchSubmit(keyword, nextCity);
  };

  return (
    <div className="workplace-jobs-tab" style={{ display: "grid", gap: "1.5rem", width: "100%", animation: "fadeIn 0.3s ease" }}>
      {/* Header */}
      <div className="tab-header" style={{ textAlign: "center", marginBottom: "0.25rem" }}>
        <h1 style={{ color: "#0f172a", fontSize: "2rem", fontWeight: 800 }}>{currentConfig.title}</h1>
        <p className="subtitle" style={{ color: "#64748b", fontSize: "1rem" }}>
          {currentConfig.subtitle}
        </p>
      </div>

      {/* Advanced Filter Card */}
      <div className="search-section" style={{ background: "#ffffff", borderRadius: "16px", border: "1px solid #e2e8f0", padding: "1.25rem 1.5rem", boxShadow: "0 4px 16px -2px rgba(15, 23, 42, 0.05)" }}>
        <div className="search-inputs" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem" }}>
          <div className="input-group" style={{ position: "relative" }}>
            <label htmlFor="wp-keyword" style={{ fontWeight: 600, fontSize: "0.85rem", color: "#334155" }}>Filter by Skill / Job Role</label>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <input
                id="wp-keyword"
                type="text"
                value={keyword}
                onChange={(e) => {
                  setKeyword(e.target.value);
                  setCurrentPage(1);
                }}
                onKeyDown={(e) => e.key === "Enter" && handleSearchSubmit()}
                placeholder="e.g., Data Analysis, React, Java, DevOps"
                style={{ width: "100%", padding: "0.75rem 2rem 0.75rem 1rem", borderRadius: "10px", border: "1px solid #cbd5e1", fontSize: "0.95rem" }}
              />
              {keyword && (
                <button
                  type="button"
                  onClick={() => setKeyword("")}
                  style={{ position: "absolute", right: "10px", background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "1rem" }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          <div className="input-group" style={{ position: "relative" }}>
            <label htmlFor="wp-city" style={{ fontWeight: 600, fontSize: "0.85rem", color: "#334155" }}>Location / City Filter</label>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <input
                id="wp-city"
                type="text"
                value={selectedCity}
                onChange={(e) => {
                  setSelectedCity(e.target.value);
                  setCurrentPage(1);
                }}
                onKeyDown={(e) => e.key === "Enter" && handleSearchSubmit()}
                placeholder="e.g., Mumbai, Bengaluru, Pune, Delhi"
                style={{ width: "100%", padding: "0.75rem 2rem 0.75rem 1rem", borderRadius: "10px", border: "1px solid #cbd5e1", fontSize: "0.95rem" }}
              />
              {selectedCity && (
                <button
                  type="button"
                  onClick={() => setSelectedCity("")}
                  style={{ position: "absolute", right: "10px", background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "1rem" }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Quick Filter Badges */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.85rem" }}>
          <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#64748b" }}>Quick Skills:</span>
            {QUICK_SKILLS.map((sk) => (
              <button
                key={sk}
                type="button"
                className={`btn ${keyword.toLowerCase() === sk.toLowerCase() ? "btn-primary" : "btn-outline"}`}
                onClick={() => onSkillClick(sk)}
                style={{ padding: "0.22rem 0.65rem", fontSize: "0.78rem", borderRadius: "6px" }}
              >
                {sk}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#64748b" }}>Quick Cities:</span>
            {QUICK_CITIES.map((ct) => {
              const isActive = selectedCity.toLowerCase() === ct.toLowerCase();
              return (
                <button
                  key={ct}
                  type="button"
                  className={`btn ${isActive ? "btn-primary" : "btn-outline"}`}
                  onClick={() => onCityClick(ct)}
                  style={{ padding: "0.22rem 0.65rem", fontSize: "0.78rem", borderRadius: "6px" }}
                >
                  📍 {ct}
                </button>
              );
            })}
          </div>
        </div>

        <div className="search-actions" style={{ marginTop: "0.75rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem", borderTop: "1px solid #f1f5f9", paddingTop: "0.75rem" }}>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => handleSearchSubmit()}
              disabled={isSearchingLive}
              style={{ padding: "0.55rem 1.2rem", fontSize: "0.88rem", fontWeight: 700, borderRadius: "8px" }}
            >
              {isSearchingLive ? "Searching Live APIs..." : "Search Live Openings"}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setKeyword("");
                setSelectedCity("");
                setCurrentPage(1);
              }}
              disabled={!keyword && !selectedCity}
              style={{ padding: "0.55rem 1rem", fontSize: "0.88rem", borderRadius: "8px" }}
            >
              Clear Filters
            </button>
          </div>

          {onNavigateToAllJobs && (
            <button
              type="button"
              onClick={() => onNavigateToAllJobs(keyword, selectedCity)}
              style={{
                background: "transparent",
                border: "none",
                color: "#2563eb",
                fontWeight: 700,
                fontSize: "0.85rem",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.3rem",
              }}
            >
              <span>Search Across All Categories ↗</span>
            </button>
          )}
        </div>
      </div>

      {/* Status Bar */}
      <div className="jobs-status" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
        <div>
          <span style={{ fontSize: "0.8rem", fontWeight: 700, padding: "0.25rem 0.65rem", borderRadius: "6px", background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe", marginRight: "0.75rem", textTransform: "uppercase" }}>
            {currentConfig.badge}
          </span>
          {filteredJobs.length > 0 ? (
            <>
              <strong>{filteredJobs.length}</strong> matching positions available
              {keyword && <span style={{ color: "#2563eb", marginLeft: "0.5rem" }}>for "{keyword}"</span>}
              {selectedCity && <span style={{ color: "#0f172a", marginLeft: "0.4rem" }}>in "{selectedCity}"</span>}
            </>
          ) : (
            <span>
              Searching live networks for <strong>{keyword || "positions"}</strong> {selectedCity ? `in ${selectedCity}` : ""}
            </span>
          )}
        </div>
      </div>

      {/* Grid of Jobs or Live Opportunity Discovery Hub */}
      {paginatedJobs.length > 0 ? (
        <>
          <div className="jobs-grid">
            {paginatedJobs.map((job, idx) => {
              const jobKey = job.id
                ? `job-${job.id}`
                : `wp-${type}-${idx}-${(job.company || "").replace(/\W/g, "")}-${(job.title || "").replace(/\W/g, "")}`;
              return (
                <JobCard
                  key={jobKey}
                  job={job}
                  isSaved={job.id ? savedJobIds.has(job.id) : false}
                  onSave={onSaveJob}
                  onApply={onApply}
                  userSkills={userSkills}
                  searchKeyword={keyword}
                />
              );
            })}
          </div>

          {/* Pagination Controls */}
          <Pagination
            currentPage={currentPage}
            totalItems={filteredJobs.length}
            itemsPerPage={itemsPerPage}
            onPageChange={(page) => setCurrentPage(page)}
          />
        </>
      ) : (
        /* Empowering Live Discovery Action Hub (Never a dead end) */
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "16px",
            padding: "2.5rem 2rem",
            textAlign: "center",
            boxShadow: "0 4px 20px -2px rgba(15, 23, 42, 0.06)",
            maxWidth: "850px",
            margin: "0 auto",
          }}
        >
          <div style={{ width: "54px", height: "54px", borderRadius: "14px", background: "#eff6ff", color: "#2563eb", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "1.6rem", marginBottom: "1rem" }}>
            🚀
          </div>
          <h3 style={{ fontSize: "1.3rem", fontWeight: 800, color: "#0f172a", margin: "0 0 0.5rem" }}>
            Explore Live Openings for {keyword ? `"${keyword}"` : "this role"} {selectedCity ? `in "${selectedCity}"` : ""}
          </h3>
          <p style={{ color: "#64748b", fontSize: "0.95rem", maxWidth: "620px", margin: "0 auto 1.5rem", lineHeight: 1.5 }}>
            Specific {currentConfig.badge.toLowerCase()} listings for this search term are being fetched live. You can instantly query all 18+ live connected networks or explore external platforms directly:
          </p>

          <div style={{ display: "flex", justifyContent: "center", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1.75rem" }}>
            {onNavigateToAllJobs && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => onNavigateToAllJobs(keyword, selectedCity)}
                style={{
                  padding: "0.7rem 1.4rem",
                  fontSize: "0.92rem",
                  fontWeight: 700,
                  borderRadius: "10px",
                  background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                  boxShadow: "0 4px 14px rgba(37, 99, 235, 0.35)",
                }}
              >
                🔍 Search All Platforms for "{keyword || "All Roles"}" {selectedCity ? `in ${selectedCity}` : ""}
              </button>
            )}

            {relaxedJobs.length > 0 && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => onNavigateToAllJobs && onNavigateToAllJobs(keyword, selectedCity)}
                style={{ padding: "0.7rem 1.2rem", fontSize: "0.92rem", borderRadius: "10px", background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0", fontWeight: 700 }}
              >
                ⚡ View {relaxedJobs.length} Openings in All Workplaces (WFH/Remote/Hybrid)
              </button>
            )}

            <button
              type="button"
              className="btn btn-outline"
              onClick={() => {
                setKeyword("");
                setSelectedCity("");
                setCurrentPage(1);
              }}
              style={{ padding: "0.7rem 1.2rem", fontSize: "0.92rem", borderRadius: "10px" }}
            >
              Reset Filters
            </button>
          </div>

          {/* Live External Search Links with Pre-filled Role and Location */}
          <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "1.25rem" }}>
            <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#64748b", display: "block", marginBottom: "0.75rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Direct Deep Search on Official Portals
            </span>
            <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "0.5rem" }}>
              {[
                { name: "LinkedIn", color: "#0077b5" },
                { name: "Naukri", color: "#2563eb" },
                { name: "Indeed", color: "#003a9b" },
                { name: "Foundit", color: "#6d28d9" },
                { name: "Glassdoor", color: "#0caa41" },
                { name: "Google Jobs", color: "#ea4335" },
              ].map((plat) => {
                const url = buildPlatformUrl(plat.name, keyword || "Software", selectedCity || "India");
                return (
                  <a
                    key={plat.name}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.35rem",
                      padding: "0.35rem 0.85rem",
                      borderRadius: "20px",
                      border: "1px solid #e2e8f0",
                      background: "#f8fafc",
                      color: "#334155",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      textDecoration: "none",
                      transition: "all 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = plat.color;
                      e.currentTarget.style.color = plat.color;
                      e.currentTarget.style.background = "#ffffff";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "#e2e8f0";
                      e.currentTarget.style.color = "#334155";
                      e.currentTarget.style.background = "#f8fafc";
                    }}
                  >
                    <span>{plat.name}</span>
                    <span style={{ fontSize: "0.72rem" }}>↗</span>
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkplaceJobsTab;
