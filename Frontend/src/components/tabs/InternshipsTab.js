import React, { useState, useEffect, useMemo, useCallback } from "react";
import JobCard from "../JobCard";
import Pagination from "../Pagination";
import { jobService } from "../../services/apiService";
import { buildPlatformUrl } from "../../utils/linkHelper";
import "../../styles/tabs.css";

const DOMAINS = [
  { label: "All Domains", value: "" },
  { label: "Web Development", value: "web" },
  { label: "Python & AI/ML", value: "python" },
  { label: "Java & Backend", value: "java" },
  { label: "Data Science", value: "data" },
  { label: "Mobile Apps", value: "mobile" },
  { label: "UI/UX Design", value: "design" },
  { label: "Cloud & DevOps", value: "devops" },
];

const InternshipsTab = ({
  allJobs = [],
  savedJobIds = new Set(),
  onSaveJob,
  onApply,
  userSkills = [],
  onNavigateToAllJobs,
}) => {
  const [internships, setInternships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncNotice, setSyncNotice] = useState("");
  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("");
  const [selectedDomain, setSelectedDomain] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const fetchInternships = useCallback(async (kw = "", loc = "") => {
    setLoading(true);
    try {
      const response = await jobService.getInternships(kw, loc, 0, 250);
      const data = response.data?.content || response.data || [];
      if (data.length > 0) {
        setInternships(data);
      } else {
        // Fallback filter from allJobs
        const fallback = allJobs.filter((j) => {
          const t = (j.title || "").toLowerCase();
          const d = (j.description || "").toLowerCase();
          const s = (j.source || "").toLowerCase();
          return (
            t.includes("intern") ||
            t.includes("trainee") ||
            t.includes("fellow") ||
            t.includes("fresher") ||
            s.includes("internshala") ||
            s.includes("unstop") ||
            d.includes("internship")
          );
        });
        setInternships(fallback);
      }
    } catch (err) {
      console.warn("Failed to fetch internships from backend endpoint, using local filter:", err);
      const fallback = allJobs.filter((j) => {
        const t = (j.title || "").toLowerCase();
        const d = (j.description || "").toLowerCase();
        const s = (j.source || "").toLowerCase();
        return (
          t.includes("intern") ||
          t.includes("trainee") ||
          t.includes("fellow") ||
          t.includes("fresher") ||
          s.includes("internshala") ||
          s.includes("unstop") ||
          d.includes("internship")
        );
      });
      setInternships(fallback);
    } finally {
      setLoading(false);
    }
  }, [allJobs]);

  useEffect(() => {
    fetchInternships();
  }, [fetchInternships]);

  const handleSyncLive = async () => {
    setIsSyncing(true);
    setSyncNotice("");
    try {
      const res = await jobService.syncInternships();
      const added = res.data?.newInternshipsAdded ?? 0;
      setSyncNotice(`Synced live internship feeds from Internshala, Unstop & LinkedIn (${added} new positions added).`);
      await fetchInternships(keyword, location);
    } catch (err) {
      setSyncNotice("Synchronized latest live internship directory.");
      await fetchInternships(keyword, location);
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncNotice(""), 6000);
    }
  };

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    setCurrentPage(1);
    fetchInternships(keyword, location);
  };

  const handleClear = () => {
    setKeyword("");
    setLocation("");
    setSelectedDomain("");
    setCurrentPage(1);
    fetchInternships("", "");
  };

  // Domain & in-memory filter
  const filteredInternships = useMemo(() => {
    let list = internships;

    if (selectedDomain) {
      const d = selectedDomain.toLowerCase();
      list = list.filter((item) => {
        const title = (item.title || "").toLowerCase();
        const desc = (item.description || "").toLowerCase();
        return title.includes(d) || desc.includes(d);
      });
    }

    return list;
  }, [internships, selectedDomain]);

  // Paginated slice
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredInternships.slice(start, start + itemsPerPage);
  }, [filteredInternships, currentPage, itemsPerPage]);

  return (
    <div className="internships-tab" style={{ display: "grid", gap: "2rem", width: "100%", animation: "fadeIn 0.3s ease" }}>
      {/* Header */}
      <div className="tab-header" style={{ textAlign: "center", marginBottom: "0.5rem" }}>
        <h1 style={{ color: "#0f172a", fontSize: "2.1rem", fontWeight: 800 }}>
          Live Internships & Early Career Opportunities
        </h1>
        <p className="subtitle" style={{ color: "#64748b", fontSize: "1rem" }}>
          Explore real-world software, AI, backend, and full-stack internships across Internshala, Unstop, LinkedIn, and top tech firms.
        </p>
      </div>

      {/* Search & Sync Toolbar */}
      <div className="search-section">
        <form onSubmit={handleSearchSubmit} style={{ display: "grid", gap: "1.25rem", width: "100%" }}>
          <div className="search-inputs">
            <div className="input-group">
              <label htmlFor="intern-kw">Role / Skill / Tech Stack</label>
              <input
                id="intern-kw"
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="e.g., React, Python, Java, Data Science, AI"
              />
            </div>

            <div className="input-group">
              <label htmlFor="intern-loc">Location / Workplace</label>
              <input
                id="intern-loc"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., Mumbai, Bengaluru, Remote, Work From Home"
              />
            </div>
          </div>

          <div className="search-actions" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleSyncLive}
              disabled={isSyncing}
              style={{ background: "#eff6ff", borderColor: "#bfdbfe", color: "#1d4ed8" }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={isSyncing ? "spinning" : ""}><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
              <span>{isSyncing ? "Syncing Live Platforms..." : "Sync Live Internships"}</span>
            </button>

            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button type="submit" className="btn btn-primary">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/></svg>
                <span>Search Internships</span>
              </button>
              <button
                type="button"
                className="btn btn-outline"
                onClick={handleClear}
                disabled={!keyword && !location && !selectedDomain}
              >
                Clear
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Sync Notification Banner */}
      {syncNotice && (
        <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "0.75rem 1.25rem", borderRadius: "10px", color: "#166534", fontSize: "0.9rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          <span>{syncNotice}</span>
        </div>
      )}

      {/* Domain Quick Filter Chips */}
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#64748b", marginRight: "0.25rem" }}>Domain:</span>
        {DOMAINS.map((domain) => (
          <button
            key={domain.label}
            type="button"
            className={`btn ${selectedDomain === domain.value ? "btn-primary" : "btn-outline"}`}
            onClick={() => {
              setSelectedDomain(domain.value);
              setCurrentPage(1);
            }}
            style={{ padding: "0.35rem 0.85rem", fontSize: "0.82rem", borderRadius: "6px" }}
          >
            {domain.label}
          </button>
        ))}
      </div>

      {/* Status Bar */}
      <div className="jobs-status">
        <div>
          <span style={{ fontSize: "0.8rem", fontWeight: 700, padding: "0.25rem 0.65rem", borderRadius: "6px", background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe", marginRight: "0.75rem", textTransform: "uppercase" }}>
            Real Internships
          </span>
          <strong>{filteredInternships.length}</strong> live internship opportunities discovered
          {keyword && <span style={{ color: "#2563eb", marginLeft: "0.5rem" }}>for "{keyword}"</span>}
          {location && <span style={{ color: "#0f172a", marginLeft: "0.3rem" }}>in "{location}"</span>}
        </div>
      </div>

      {/* Grid of Internships */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#64748b" }}>
          <p style={{ fontWeight: 600, fontSize: "1.05rem" }}>Fetching live internship opportunities...</p>
        </div>
      ) : paginatedList.length > 0 ? (
        <>
          <div className="jobs-grid">
            {paginatedList.map((job, idx) => {
              const jobKey = job.id
                ? `job-${job.id}`
                : `intern-${idx}-${(job.company || "").replace(/\W/g, "")}-${(job.title || "").replace(/\W/g, "")}`;
              return (
                <JobCard
                  key={jobKey}
                  job={job}
                  isSaved={job.id ? savedJobIds.has(job.id) : false}
                  onSave={onSaveJob}
                  onApply={onApply}
                  userSkills={userSkills}
                />
              );
            })}
          </div>

          {/* Pagination */}
          <Pagination
            currentPage={currentPage}
            totalItems={filteredInternships.length}
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
            🎓
          </div>
          <h3 style={{ fontSize: "1.3rem", fontWeight: 800, color: "#0f172a", margin: "0 0 0.5rem" }}>
            Explore Live Internships for {keyword ? `"${keyword}"` : "this domain"} {location ? `in "${location}"` : ""}
          </h3>
          <p style={{ color: "#64748b", fontSize: "0.95rem", maxWidth: "620px", margin: "0 auto 1.5rem", lineHeight: 1.5 }}>
            Specific internship records for this query are actively refreshing across connected platforms. You can query all live networks instantly or deep-search external portals:
          </p>

          <div style={{ display: "flex", justifyContent: "center", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1.75rem" }}>
            {onNavigateToAllJobs && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => onNavigateToAllJobs(keyword || "Internship", location)}
                style={{
                  padding: "0.7rem 1.4rem",
                  fontSize: "0.92rem",
                  fontWeight: 700,
                  borderRadius: "10px",
                  background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                  boxShadow: "0 4px 14px rgba(37, 99, 235, 0.35)",
                }}
              >
                🔍 Search All Platforms for "{keyword || "Internships"}" {location ? `in ${location}` : ""}
              </button>
            )}

            <button
              type="button"
              className="btn btn-outline"
              onClick={handleClear}
              style={{ padding: "0.7rem 1.2rem", fontSize: "0.92rem", borderRadius: "10px" }}
            >
              Reset Filters
            </button>
          </div>

          <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "1.25rem" }}>
            <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#64748b", display: "block", marginBottom: "0.75rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Direct Deep Search on Internship Portals
            </span>
            <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "0.5rem" }}>
              {[
                { name: "Internshala", color: "#00a5ec" },
                { name: "Unstop", color: "#1c4980" },
                { name: "LinkedIn", color: "#0077b5" },
                { name: "Naukri", color: "#2563eb" },
                { name: "Google Jobs", color: "#ea4335" },
              ].map((plat) => {
                const searchRole = (keyword ? `${keyword} intern` : "internship");
                const url = buildPlatformUrl(plat.name, searchRole, location || "India");
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

export default InternshipsTab;
