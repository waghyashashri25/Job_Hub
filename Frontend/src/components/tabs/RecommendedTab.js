import React, { useState, useMemo } from "react";
import JobCard from "../JobCard";
import Pagination from "../Pagination";
import { enrichJobWithAnalysis } from "../../services/jobMatchingService";
import "../../styles/tabs.css";

const RecommendedTab = ({
  jobs,
  savedJobIds,
  onSaveJob,
  onApply,
  userSkills = [],
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const recommendations = useMemo(() => {
    if (!jobs || jobs.length < 2) {
      return [];
    }

    const saved = Array.from(savedJobIds);

    if (saved.length === 0) {
      return jobs.slice(0, 36).map((job) => ({
        job: enrichJobWithAnalysis(job, userSkills),
        reason: `Trending on ${job.source || "platform"}`,
      }));
    }

    const recs = [];
    const recommendedIds = new Set();

    jobs.forEach((job) => {
      if (savedJobIds.has(job.id) || recommendedIds.has(job.id)) {
        return;
      }

      let matchScore = 0;
      let reason = "";

      const sameCompany = jobs.filter(
        (j) => j.company === job.company && savedJobIds.has(j.id)
      ).length;

      if (sameCompany > 0) {
        reason = `More openings at ${job.company}`;
        matchScore += 10;
      }

      const sameLocation = jobs.filter(
        (j) => j.location === job.location && savedJobIds.has(j.id)
      ).length;

      if (sameLocation > 0) {
        reason = `Popular in ${job.location}`;
        matchScore += 8;
      }

      if (matchScore === 0) {
        reason = "Matched with your skills profile";
      }

      recs.push({
        job: enrichJobWithAnalysis(job, userSkills),
        reason,
        matchScore,
      });
    });

    return recs.sort((a, b) => b.matchScore - a.matchScore);
  }, [jobs, savedJobIds, userSkills]);

  // Paginated slice
  const paginatedRecommendations = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return recommendations.slice(start, start + itemsPerPage);
  }, [recommendations, currentPage, itemsPerPage]);

  return (
    <div className="recommended-tab" style={{ display: "grid", gap: "2rem", width: "100%", animation: "fadeIn 0.3s ease" }}>
      {/* Header */}
      <div className="tab-header" style={{ textAlign: "center", marginBottom: "0.5rem" }}>
        <h1 style={{ color: "#0f172a", fontSize: "2rem", fontWeight: 800 }}>Recommended Opportunities For You</h1>
        <p className="subtitle" style={{ color: "#64748b", fontSize: "1rem" }}>
          AI-curated job recommendations personalized to your skill profile and saved career preferences.
        </p>
      </div>

      {recommendations.length > 0 ? (
        <>
          <div className="jobs-status">
            <div>
              <strong>{recommendations.length}</strong> personalized recommendations curated for your profile
            </div>
          </div>

          <div className="recommendations-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "1.5rem" }}>
            {paginatedRecommendations.map((rec, index) => {
              const recKey = rec.job?.id
                ? `job-${rec.job.id}`
                : `rec-${index}-${(rec.job?.company || "").replace(/\W/g, "")}-${(rec.job?.title || "").replace(/\W/g, "")}`;
              return (
                <div key={recKey} className="recommendation-wrapper">
                  <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", padding: "0.4rem 0.8rem", borderRadius: "8px", color: "#1d4ed8", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.5rem", display: "inline-flex" }}>
                    <span>{rec.reason}</span>
                  </div>
                  <JobCard
                    key={recKey}
                    job={rec.job}
                    isSaved={rec.job?.id ? savedJobIds.has(rec.job.id) : false}
                    onSave={onSaveJob}
                    onApply={onApply}
                    userSkills={userSkills}
                  />
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          <Pagination
            currentPage={currentPage}
            totalItems={recommendations.length}
            itemsPerPage={itemsPerPage}
            onPageChange={(page) => setCurrentPage(page)}
          />
        </>
      ) : (
        <div className="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" style={{ marginBottom: "1rem" }}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          <h3>No Recommendations Yet</h3>
          <p>Save jobs you are interested in or add skills in your profile to generate tailored recommendations.</p>
        </div>
      )}
    </div>
  );
};

export default RecommendedTab;
