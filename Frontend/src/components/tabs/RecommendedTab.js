import React, { useMemo } from "react";
import JobCard from "../JobCard";
import { enrichJobWithAnalysis } from "../../services/jobMatchingService";
import "../../styles/tabs.css";

const RecommendedTab = ({
  jobs,
  savedJobIds,
  onSaveJob,
  onApply,
  userSkills = [],
}) => {
  const recommendations = useMemo(() => {
    if (!jobs || jobs.length < 2) {
      return [];
    }

    const saved = Array.from(savedJobIds);

    if (saved.length === 0) {
      // If no saved jobs, show most recent/trending
      return jobs.slice(0, 6).map((job, idx) => ({
        job: enrichJobWithAnalysis(job, userSkills),
        reason: `Trending in ${job.source || "our platform"}`,
        icon: "🔥",
      }));
    }

    // Analyze saved jobs to find recommendations
    const recommendations = [];
    const recommendedIds = new Set();

    jobs.forEach((job) => {
      if (savedJobIds.has(job.id) || recommendedIds.has(job.id)) {
        return;
      }

      let matchScore = 0;
      let reason = "";
      let icon = "";

      // Check if same company as saved jobs
      const sameCompany = jobs.filter(
        (j) => j.company === job.company && savedJobIds.has(j.id),
      ).length;

      if (sameCompany > 0) {
        reason = `More openings at ${job.company}`;
        icon = "🏢";
        matchScore += 10;
      }

      // Check if same location as saved jobs
      const sameLocation = jobs.filter(
        (j) => j.location === job.location && savedJobIds.has(j.id),
      ).length;

      if (sameLocation > 0) {
        reason = `Popular in ${job.location}`;
        icon = "📍";
        matchScore += 8;
      }

      // Generic if no matches
      if (matchScore === 0) {
        reason = "We think you might like this";
        icon = "✨";
      }

      recommendations.push({
        job: enrichJobWithAnalysis(job, userSkills),
        reason,
        icon,
        matchScore,
      });
    });

    return recommendations
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 12);
  }, [jobs, savedJobIds, userSkills]);

  return (
    <div className="recommended-tab">
      {/* Header */}
      <div className="tab-header">
        <h1>Recommended For You</h1>
        <p className="subtitle">
          AI-powered suggestions based on your saved jobs and search history
        </p>
      </div>

      {recommendations.length > 0 ? (
        <>
          <div className="recommendations-info">
            <p>
              Based on your interests, we found{" "}
              <strong>{recommendations.length}</strong> jobs that might be a
              great fit
            </p>
          </div>

          <div className="recommendations-grid">
            {recommendations.map((rec, index) => (
              <div key={index} className="recommendation-wrapper">
                <div className="recommendation-badge">
                  <span className="badge-icon">{rec.icon}</span>
                  <span className="badge-text">{rec.reason}</span>
                </div>
                <JobCard
                  job={rec.job}
                  isSaved={savedJobIds.has(rec.job.id)}
                  onSave={onSaveJob}
                  onApply={onApply}
                  userSkills={userSkills}
                />
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="empty-state">
          <p className="empty-icon">💡</p>
          <h3>No Recommendations Yet</h3>
          <p>
            Save some jobs you're interested in to get personalized
            recommendations
          </p>
        </div>
      )}
    </div>
  );
};

export default RecommendedTab;
